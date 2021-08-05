import time
import asyncio
import aiohttp
import traceback

import george_status
import analysis

ANAL = None

async def query_page(sess, stati, user):
    start = time.time()
    stati[user.name] = george_status.STATUS_NOT_LOADED
    try:
        stati[user.name] = await george_status.george_status(sess, user.link)
        print(f"{user.name} = success in {time.time() - start:.3}s!")
    except george_status.GeorgeError as e:
        print(user.name, "=epic fail (", e, ")")
    except BaseException as e:
        print(user.name, "= oh no", type(e), e)

async def analyze():
    global ANAL

    try:
        async with aiohttp.ClientSession() as sess:
            users = await george_status.read_users(sess)

            stati = {}

            print("querying...")
            await asyncio.gather(*[query_page(sess, stati, user) for user in users])

            state = analysis.GeorgeState.from_data(users, stati)

            ANAL = state.analyze()
    except Exception as _:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(analyze())
    print(ANAL)
    print("===")
    print(ANAL.into_html())
    print("===")
    print(ANAL.into_json_obj())

