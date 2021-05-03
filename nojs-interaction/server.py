import sys
import pickle
import time
import zlib
import os
import asyncio
from http_parse import HTTPParser, ParserExpectedException
import random

BACKUP = "data.pkl"

DEFAULT_PNG = open("static/default.png", "br").read()
DEBUG = "-v" in sys.argv

def gen_id():
    return str(random.randint(0, 1000000000000)).encode("utf-8")

def gen_cookie():
    return b"session-" + str(random.randint(0, 1000000000000)).encode("utf-8")

async def send_response(writer, data, content_type):
    writer.write(f"""\
HTTP/1.1 200 OK\r
Content-Type: {content_type}\r
Server: lol\r
Content-Length: {len(data)}\r
\r
""".encode("utf-8"))

    writer.write(data)
    await writer.drain()
    writer.close()

async def cookie_clicker(uc):
    while True:
        await asyncio.sleep(1)
        if len(uc.sess.current_connections) != [] and uc.sess.current_connections[0] == uc.id:
            uc.sess.step()

        asyncio.create_task(uc.update())

class CCSession:
    def __init__(self, n_cookies=0, cookies_per_second=0):
        self.n_cookies = n_cookies
        self.cookies_per_second = cookies_per_second

        self.current_connections = []

    def step(self):
        self.n_cookies += self.cookies_per_second

    def thing_cost(self):
        return 10 + 90 * self.cookies_per_second


    # Avoid pickling current_connections
    # https://stackoverflow.com/a/54139237/1753929
    def __getstate__(self):
        state = self.__dict__.copy()
        del state["current_connections"]
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self.current_connections = []

SESSIONS = {} # {cookie_str: CCSession}
if os.path.isfile(BACKUP):
    with open(BACKUP, "rb") as bf:
        SESSIONS = pickle.load(bf)

class UserConnection:
    def __init__(self, main_writer, id, sess):
        self.main_writer = main_writer
        self.id = id

        self.t = 0

        self.sess = sess
        self.sess.current_connections.append(self.id)

        self.task = asyncio.create_task(cookie_clicker(self))

        self.last_send = time.time()

    async def drain(self):
        try:
            await self.main_writer.drain()
        except BrokenPipeError as _:
            await self.kill()
        except ConnectionResetError as _:
            await self.kill()

    async def init(self, sess_cookie=None):
        self.main_writer.write(b"""\
HTTP/1.1 200 OK\r
Content-Type: text/html; charset=UTF-8\r
Server: lol\r
Transfer-Encoding: chunked\r
""")
        if sess_cookie != None:
            self.main_writer.write(b'Set-Cookie: session=' + sess_cookie + b'\r\n')
        self.main_writer.write(b'\r\n')
        await self.drain()
        self.buffer_send_line(self.fmt(open("static/main.html", "br").read()))
        await self.drain()

        await self.update()

    def end(self):
        self.buffer_send_line(b"")
        self.main_writer.write(b"\r\n")

    def buffer_send_line(self, line):
        self.main_writer.write(hex(len(line))[2:].encode("utf-8") + b"\r\n")
        self.main_writer.write(line + b"\r\n")

        self.last_send = time.time()

    async def handle_request(self, p, writer):
        if p.method == b"GET":
            if p.path == b"/" or b"./" in p.path:
                return

            path = os.path.join("static", p.path.decode("utf-8")[1:])
            if DEBUG:
                print("GETting", path, flush=True)

            if os.path.isfile(path):
                await send_response(writer, open(path, "br").read(), "image/png")
            else:
                await send_response(writer, DEFAULT_PNG, "image/png")

        if p.path == b"/press.png" and p.query == self.fmt(b"{id}&{t}"):
            self.t += 1
            self.sess.n_cookies += 1
            await self.update()

        if p.path == b"/purchase.png" and p.query == self.fmt(b"{id}&{t}"):
            if self.sess.n_cookies >= self.sess.thing_cost():
                print(self.id, "purchased", self.sess.thing_cost(), "has", self.sess.n_cookies, flush=True)
                self.t += 1
                self.sess.n_cookies -= self.sess.thing_cost()
                self.sess.cookies_per_second *= 1.5
                self.sess.cookies_per_second += 2
                await self.update()

    def fmt(self, data):
        return data.replace(b"{id}", self.id).replace(b"{t}", str(self.t).encode("utf-8"))

    async def update(self):
        self.buffer_send_line(f'''<style>
#n-cookies::before {{
    content: "{int(self.sess.n_cookies)}";
}}
#per-second::before {{
    content: "{self.sess.cookies_per_second}";
}}

.purchase-thing:after {{
    content: "{int(self.sess.thing_cost())}";
}}
'''.encode())
        if self.sess.n_cookies < self.sess.thing_cost():
            self.buffer_send_line(f'''
.purchase-thing {{
    background-color: gray;
}}
'''.encode())
        else:
            self.buffer_send_line(f'''
.purchase-thing {{
    background-color: green;
}}
'''.encode())
        if self.t % 2 == 0:
            self.buffer_send_line(self.fmt(b'''
#click-cookie-1 { visibility: visible; }
#click-cookie-2 { visibility: hidden; }

#click-cookie-1:active { background: url("press.png?{id}&{t}"); }


#purchase-thing-1 { visibility: visible; }
#purchase-thing-2 { visibility: hidden; }

#purchase-thing-1:active { background: url("purchase.png?{id}&{t}"); }

'''))
        else:
            self.buffer_send_line(self.fmt(b'''
#click-cookie-2 { visibility: visible; }
#click-cookie-1 { visibility: hidden; }

#click-cookie-2:active { background: url("press.png?{id}&{t}"); }

#purchase-thing-2 { visibility: visible; }
#purchase-thing-1 { visibility: hidden; }

#purchase-thing-2:active { background: url("purchase.png?{id}&{t}"); }

'''))
        self.buffer_send_line(self.fmt(b'''</style>'''))

        await self.drain()

    async def kill(self):
        print("Killing", self.id)
        self.task.cancel()
        self.main_writer.close()
        self.sess.current_connections = [id for id in self.sess.current_connections if id != self.id]

    def __repr__(self):
        return f"UserConnection(id={self.id!r})"


CONNECTIONS = []
def get_session_for(id):
    for c in CONNECTIONS:
        if c.id == id:
            return c

    return None

async def handle(reader, writer):
    global CONNECTIONS, SESSIONS

    p = HTTPParser()
    try:
        while not p.done:
            dat = await reader.read(1)
            p.pass_ch(dat)
    except ParserExpectedException as e:
        print("Got invalid http request :(", flush=True)
        writer.close()

    addr = writer.get_extra_info('peername')

    if DEBUG:
        print(f"Received {p} from {addr!r}", flush=True)

    if p.query == None:
        print("New user joined!", flush=True)

        sess = None
        if b"Cookie" in p.headers:
            parts = p.headers[b"Cookie"].split(b";")
            for part in parts:
                kv = part.split(b"=")
                if len(kv) != 2:
                    continue
                k, v = kv

                if k == b"session" and v in SESSIONS:
                    sess = SESSIONS[v]
                    sess_cookie = v

        if sess == None:
            sess = CCSession()
            sess_cookie = gen_cookie()

            SESSIONS[sess_cookie] = sess

        print_stats()
        id = gen_id()

        c = UserConnection(writer, id, sess)
        CONNECTIONS.append(c)
        await c.init(sess_cookie)
    else:
        c = get_session_for(p.query.split(b"&")[0])

    if c is not None:
        await c.handle_request(p, writer)

async def cleaner():
    while True:
        for i in range(len(CONNECTIONS)):
            if time.time() - CONNECTIONS[i].last_send > 10:
                await CONNECTIONS[i].kill()
                del CONNECTIONS[i]
                print_stats()
                break
        await asyncio.sleep(1)

def print_stats():
    print("Currenty", len(CONNECTIONS), "active connetions", flush=True)
    if CONNECTIONS != []:
        print("Best session:", max(c.sess.n_cookies for c in CONNECTIONS), flush=True)

async def backup_loop():
    global SESSIONS
    while True:
        await asyncio.sleep(6)
        if DEBUG:
            print("Saving...")
        with open(BACKUP, "wb") as bf:
            pickle.dump(SESSIONS, bf)


async def main():
    if len(sys.argv) == 2:
        port = int(sys.argv[1])
    else:
        port = 13080
    server = await asyncio.start_server(
        handle, '0.0.0.0', port)

    addr = server.sockets[0].getsockname()
    print(f'Serving on {addr}', flush=True)

    asyncio.create_task(cleaner())
    asyncio.create_task(backup_loop())

    async with server:
        await server.serve_forever()

print("Starting", flush=True)

asyncio.run(main())
