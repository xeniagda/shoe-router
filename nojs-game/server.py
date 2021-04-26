import zlib
import os
import asyncio
from http_parse import HTTPParser
import random

def gen_id():
    return str(random.randint(0, 1000000000000)).encode("utf-8")

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

class UserSession:
    def __init__(self, main_writer, id):
        self.main_writer = main_writer
        self.id = id

    async def init(self):
        self.main_writer.write(b"""\
HTTP/1.1 200 OK\r
Content-Type: text/html; charset=UTF-8\r
Server: lol\r
Transfer-Encoding: chunked\r
\r
""")
        await self.main_writer.drain()
        self.buffer_send_line(open("static/main.html", "br").read().replace(b"{id}", self.id))
        await self.main_writer.drain()

    def end(self):
        self.buffer_send_line(b"")
        self.main_writer.write(b"\r\n")

    def buffer_send_line(self, line):
        self.main_writer.write(hex(len(line))[2:].encode("utf-8") + b"\r\n")
        self.main_writer.write(line)

    async def handle_request(self, p, writer):
        if p.method == b"GET":
            if p.path == b"/":
                return

            path = os.path.join("static", p.path.decode("utf-8")[1:])
            print("GETting", path)
            if os.path.isfile(path):
                await send_response(writer, open(path, "br").read(), "image/png")

        if p.path == b"/track-1.png":
            print("the")
            self.buffer_send_line(b'<style> #s3 { color: white; background: black !important; } #s3 > h2::before { content: "you have been lazy image loaded ";} </style> ')
            await self.main_writer.drain()

        if p.path == b"/track-2.png":
            print("the")
            self.buffer_send_line(b'<style> #s1 { color: white; background: black !important; } #s1 > h2::before { content: "hover  ";} </style> ')
            await self.main_writer.drain()

        if p.path == b"/track-3.png":
            print("the")
            self.buffer_send_line(b'<style> #s2 { color: white; background: black !important; } #s2 > h2::before { content: ":active ";} </style> ')
            await self.main_writer.drain()

    def __repr__(self):
        return f"UserSession(id={self.id!r})"

SESSIONS = []
def get_session_for(id):
    for s in SESSIONS:
        if s.id == id:
            return s

    return None

async def handle(reader, writer):
    global SESSION
    p = HTTPParser()
    while not p.done:
        dat = await reader.read(1)
        p.pass_ch(dat)

    addr = writer.get_extra_info('peername')

    print(f"Received {p} from {addr!r}")

    if p.query == None:
        id = gen_id()
        s = UserSession(writer, id)
        SESSIONS.append(s)
        await s.init()
    else:
        s = get_session_for(p.query)

    if s is not None:
        print(f"Handling {p!r} for session {s!r}")
        await s.handle_request(p, writer)

async def main():
    server = await asyncio.start_server(
        handle, '127.0.0.1', 8888)

    addr = server.sockets[0].getsockname()
    print(f'Serving on {addr}')

    async with server:
        await server.serve_forever()

asyncio.run(main())
