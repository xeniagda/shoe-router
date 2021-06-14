import json
from html.parser import HTMLParser

class GeorgeStatus:
    def __init__(self, user, curr_link, prev_link, next_link):
        self.user = user
        self.curr_link = curr_link
        self.prev_link = prev_link
        self.next_link = next_link

    def __str__(self):
        return f"GeorgeStatus(user={self.user!r}, curr_link={self.curr_link!r}, prev_link={self.prev_link!r}, next_link={self.next_link!r})"

class GeorgeIFrameExtractor(HTMLParser):
    def __init__(self, *args, **kwargs):
        super(GeorgeIFrameExtractor, self).__init__(*args, **kwargs)
        self.frame_url = None
        # TODO: Track iframes without id="george" which point to george.gh0.pw for diagnostics

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "iframe":
            srcs = [val for key, val in attrs if key == "src"]

            if len(srcs) == 1:
                if srcs[0].split("?")[0] == "https://george.gh0.pw/embed.cgi":
                    self.frame_url = srcs[0]

class GeorgeIFrameAnalyzer(HTMLParser):
    def __init__(self, user, curr_link, *args, **kwargs):
        super(GeorgeIFrameAnalyzer, self).__init__(*args, **kwargs)

        self.george_status = GeorgeStatus(user=user, curr_link=curr_link, prev_link=None, next_link=None)

        self.last_link = None

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            hrefs = [val for key, val in attrs if key == "href"]

            if len(hrefs) == 1:
                self.last_link = hrefs[0]

    def handle_data(self, data):
        if data.strip() == "< PREV":
            self.george_status.prev_link = self.last_link
            self.last_link = None

        if data.strip() == "NEXT >":
            self.george_status.next_link = self.last_link
            self.last_link = None

async def george_status(sess, url):
    site_req = await sess.get(url)

    extractor = GeorgeIFrameExtractor()
    extractor.feed((await site_req.content.read()).decode())

    embed_req = await sess.get(extractor.frame_url)


    analyzer = GeorgeIFrameAnalyzer(extractor.frame_url.split("?")[1].split("&")[0], url)
    analyzer.feed((await embed_req.content.read()).decode())

    return analyzer.george_status

class GeorgeUser:
    def __init__(self, name, link, colour):
        self.name = name
        self.link = link
        self.colour = colour

    def __str__(self):
        return f"GeorgeUser(name={self.name!r}, link={self.link!r}, colour={self.colour!r})"

    __repr__ = __str__

async def read_users(sess):
    json_req = await sess.get("https://george.gh0.pw/data.cgi")

    data = json.loads((await json_req.content.read()).decode())

    users = []
    for field in data:
        user = GeorgeUser(name=field["name"], link=field["link"], colour=field["colour"])
        users.append(user)

    return users
