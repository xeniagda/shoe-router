import flask
import threading

import time
import asyncio
import aiohttp

import george_status
import analysis

ANAL = None

async def query_page(sess, stati, user):
    start = time.time()
    try:
        stati[user.name] = await george_status.george_status(sess, user.link)
        print(f"{user.name} = success in {time.time() - start:.3}s!")
    except george_status.GeorgeError as e:
        print(user.name, "=epic fail (", e, ")")
    except BaseException as e:
        print(user.name, "= oh no", type(e), e)

async def analyze():
    global ANAL

    async with aiohttp.ClientSession() as sess:
        users = await george_status.read_users(sess)

        stati = {}

        print("querying...")
        await asyncio.gather(*[query_page(sess, stati, user) for user in users])

        state = analysis.GeorgeState.from_data(users, stati)

        ANAL = state.analyze()

# https://stackoverflow.com/a/59645689/1753929
def run_analyze():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    while True:
        loop.run_until_complete(analyze())
        loop.run_until_complete(asyncio.sleep(60 * 60))

threading.Thread(target=run_analyze, daemon=True).start()

app = flask.Flask("apioform nest")

@app.route("/george-status-html")
def status_html():
    if ANAL == None:
        data = "a webring"
    else:
        data = ANAL.into_html()

    return flask.Response(
        response=data,
        status=200,
        content_type="text/html",
        headers={
            "Cache-Control": "max-age=0",
        }
    )


# TODO: Use a good server instead of flask dev server lmao
app.run(host="0.0.0.0", port=8080)
# asyncio.get_event_loop().run_forever()
