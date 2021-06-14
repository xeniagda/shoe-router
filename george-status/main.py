import asyncio
import aiohttp

import george_status
import analysis

async def main():
    async with aiohttp.ClientSession() as sess:
        users = await george_status.read_users(sess)

        stati = {}
        for user in users:
            print("querying", user.name, "...", end="", flush=True)
            try:
                stati[user.name] = await george_status.george_status(sess, user.link)
                print("success!")
            except:
                print("epic fail")

        print(stati)

        state = analysis.GeorgeState.from_data(users, stati)
        print(state.proper_order, state.links)

        anal = state.analyze()
        print(anal)
        print(anal.into_html())


if __name__ == "__main__":
    asyncio.run(main())
