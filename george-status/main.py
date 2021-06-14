import time
import asyncio
import aiohttp

import george_status
import analysis

async def query_page(sess, stati, user):
    start = time.time()
    try:
        stati[user.name] = await george_status.george_status(sess, user.link)
        print(f"{user.name} = success in {time.time() - start:.3}s!")
    except:
        print(user.name, "=epic fail")

async def main():
    async with aiohttp.ClientSession() as sess:
        users = await george_status.read_users(sess)

        stati = {}

        print("querying...")
        await asyncio.gather(*[query_page(sess, stati, user) for user in users])

        state = analysis.GeorgeState.from_data(users, stati)

        anal = state.analyze()
        print(anal)
        print(anal.into_html())


if __name__ == "__main__":
    asyncio.run(main())
