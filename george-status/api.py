import json
import flask
import threading

import time
import asyncio
import aiohttp

import george_status
import analysis

import query

# https://stackoverflow.com/a/59645689/1753929
def run_analyze():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    while True:
        loop.run_until_complete(query.analyze())
        loop.run_until_complete(asyncio.sleep(60 * 60))

threading.Thread(target=run_analyze, daemon=True).start()

app = flask.Flask("apioform nest")

@app.route("/george-status-html")
def status_html():
    if query.ANAL == None:
        data = "a webring"
    else:
        data = query.ANAL.into_html(show_floc=False)

    return flask.Response(
        response=data,
        status=200,
        content_type="text/html; charset=utf-8",
        headers={
            "Cache-Control": "max-age=0",
        }
    )

@app.route("/george-status-html-but-epic")
def status_html_floc():
    if query.ANAL == None:
        data = "a webring"
    else:
        data = query.ANAL.into_html(show_floc=True)

    return flask.Response(
        response=data,
        status=200,
        content_type="text/html; charset=utf-8",
        headers={
            "Cache-Control": "max-age=0",
        }
    )

@app.route("/george-status-json")
def status_json():
    if query.ANAL == None:
        data = None
    else:
        data = query.ANAL.into_json_obj()

    return flask.Response(
        response=json.dumps(data),
        status=200,
        content_type="application/json",
        headers={
            "Cache-Control": "max-age=0",
        }
    )


# TODO: Use a good server instead of flask dev server lmao
app.run(host="0.0.0.0", port=9080)
# asyncio.get_event_loop().run_forever()
