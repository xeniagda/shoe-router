from typing import List, Dict, NewType

import traceback
import time
import random
from dataclasses import dataclass, asdict
import sys
import asyncio
from aiohttp import web, WSMessage
import log
import logging
import data
import json
import dacite

server_log = logging.getLogger("server")
@dataclass
class ServerState:
    state: data.State
    connections: Dict[data.ID, web.WebSocketResponse]

    next_id_lock: asyncio.Lock = asyncio.Lock()
    async def add_connection(self, ws: web.WebSocketResponse) -> data.ID:
        async with self.next_id_lock:
            while True:
                id = data.ID(str(random.randrange(0, 1_000_000)))
                if id not in self.connections:
                    self.connections[id] = ws
                    return id
                else:
                    continue

    async def kill_client(self, id: data.ID):
        server_log.info(f"Removing client {id}")
        if id in self.state.members:
            del self.state.members[id]
        if id in self.state.tones:
            self.state.tones.remove(id)
        if id in self.connections:
            del self.connections[id]

    async def send_to(self, id: data.ID, resp: data.Response):
        if resp.server_timestamp is None:
            resp.server_timestamp = time.time()

        if id not in self.connections:
            server_log.warning(f"Trying to send {resp} to unknown ID {id}. Aborting.")
            return

        con = self.connections[id]
        if con.closed:
            server_log.warning(f"Trying to send {resp} to closed connection {id}")
            del self.connections[id]
            return

        await con.send_json(resp.to_json())

    async def broadcast(self, resp: data.Response):
        if resp.server_timestamp is None:
            resp.server_timestamp = time.time()

        tasks = []

        for id, con in self.connections.items():
            if con.closed:
                server_log.warning(f"Trying to send {resp} to closed connection {id}")
                tasks.append(self.kill_client(id))
                continue
            tasks.append(con.send_json(resp.to_json()))

        await asyncio.gather(*tasks)

    async def broadcast_state(self):
        await self.broadcast(data.SetState(state=self.state))

    async def handle_connection(self, ws: web.WebSocketResponse):
        id = await self.add_connection(ws)
        conn_log = logging.getLogger(f"conn-{id}")

        conn_log.info("User joined")

        await self.send_to(id, data.YouAre(id=id))

        try:
            async for msg in ws:
                if not isinstance(msg.data, str):
                    await ws.send_json({"error": "invalid data type"})
                    continue
                try:
                    if len(msg.data) > 10000: raise ValueError("data too long")
                    req = data.Request.from_json(json.loads(msg.data))
                    conn_log.debug(f"Got request {req}")

                    await self.handle_request(id, req, conn_log)
                except (ValueError, dacite.MissingValueError) as e:
                    traceback.print_exc()
                    await ws.send_json({"error": str(e)})
                except Exception as e:
                    traceback.print_exc()
                    await ws.send_json({"error": str(e) + " (unknown error)"})
        finally:
            await self.kill_client(id)


    async def handle_request(self, id: data.ID, req: data.Request, conn_log: logging.Logger):
        if isinstance(req, data.Hello):
            if id not in self.state.members:
                conn_log.info(f"User joined: {req}")
                self.state.members[id] = data.Member(name=req.my_name, freq=req.my_freq, join_timestamp=time.time())
            else:
                conn_log.info(f"User changed details: {req}")
                self.state.members[id].name = req.my_name
                self.state.members[id].freq = req.my_freq
            await self.broadcast_state()
        elif isinstance(req, data.Press):
            if id not in self.state.tones:
                self.state.tones.append(id)
            await self.broadcast_state()
        elif isinstance(req, data.Release):
            if id in self.state.tones:
                self.state.tones.remove(id)
            await self.broadcast_state()
        else:
            raise ValueError(f"Don't know how to handle request of type {req.__class__.__name__}")



server = web.Application(logger=logging.getLogger("server"))
routes = web.RouteTableDef()

server["SERVER_STATE"] = ServerState(state = data.State(members={}, tones=[]), connections={})
def get_server(req: web.Request) -> ServerState:
    return req.app["SERVER_STATE"]

@routes.get("/state")
async def hello(req: web.Request) -> web.Response:
    return web.json_response(
        asdict(get_server(req).state),
    )

connect_log = logging.getLogger("connect")
@routes.get("/ws-connect")
async def ws_connect(req: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(req)

    connect_log.info("Got connection")

    await get_server(req).handle_connection(ws)
    return ws


server.add_routes(routes)

port = 8080
if len(sys.argv) == 2:
    port = int(sys.argv[1])

web.run_app(server, port=port)

