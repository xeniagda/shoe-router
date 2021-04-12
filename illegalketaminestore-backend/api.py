import random
import sys
import asyncio, json, os, pickle
from aiohttp import web
import logging as lg

sys.setrecursionlimit(200000)

lg.basicConfig(
    format="[%(asctime)s — %(name)s — %(levelname)s] %(message)s",
    level=lg.INFO
)

async def fetch_png(req):
    files = os.listdir("sussy")
    choice = os.path.join("sussy", random.choice(files))
    lg.info("Chose " + choice)

    return web.Response(status=200, body=open(choice, "br").read(), content_type="image/png")

if __name__ == "__main__":

    app = web.Application()

    app.add_routes([
        web.get("/sus.png", fetch_png),
    ])
    # app.on_shutdown.append(on_shutdown)
    # app.on_startup.append(on_startup)

    web.run_app(app, port=12080)
