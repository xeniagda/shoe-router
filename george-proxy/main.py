import requests
import http.server
import socketserver
import sys

BASEPATH = "https://george.gh0.pw"
PORT = 10080
if len(sys.argv) == 2:
    PORT = int(sys.argv[1])

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args):
        super(Handler, self).__init__(*args)

    def do_GET(self):
        url = BASEPATH + self.path

        print(url)
        resp = requests.get(url)

        self.send_response(resp.status_code)
        for h, d in resp.headers.items():
            if h not in ["Connection", "Transfer-Encoding", "Content-Length", "Content-Encoding"]:
                self.send_header(h, d)

        self.end_headers()
        out = resp.content
        out = out.replace(
            b"canvas{",
            b"canvas{filter:brightness(50%);",
        )
        out = out.replace(
            b"https://george.gh0.pw",
            b"https://coral.shoes/embed",
        )
        if "embed.cgi" in url:
            out = out.replace(
                b"background-color: pink;",
                b"background-color: #dddddd;border-radius:1em;padding-left:1em; padding-right:1em;",
            )
            out = out.replace(
                b"color: cyan;",
                b"color: #5f5fec;",
            )
            out = out.replace(
                b"box-shadow: 5px 5px black;",
                b"",
            )
        self.wfile.write(out)
        self.send_response(200)

        return

print("starting")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
