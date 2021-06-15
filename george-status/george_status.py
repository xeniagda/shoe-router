import aiohttp.web
import json
from html.parser import HTMLParser
from enum import Enum

class GeorgeError(BaseException, Enum):
    HTTP_ERROR = 0
    NO_IFRAME = 1
    UNICODE_ERROR = 1

class GeorgeStatus:
    def __init__(self, user, curr_link, prev_link, next_link, disabled_floc):
        self.user = user
        self.curr_link = curr_link
        self.prev_link = prev_link
        self.next_link = next_link
        self.disabled_floc = disabled_floc

    def __str__(self):
        return f"GeorgeStatus(user={self.user!r}, curr_link={self.curr_link!r}, prev_link={self.prev_link!r}, next_link={self.next_link!r}, disabled_floc={self.disabled_floc})"

class GeorgeIFrameExtractor(HTMLParser):
    def __init__(self, *args, **kwargs):
        super(GeorgeIFrameExtractor, self).__init__(*args, **kwargs)
        self.frame_url = None
        self.floc_meta = False
        # TODO: Track iframes without id="george" which point to george.gh0.pw for diagnostics

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "iframe":
            srcs = [val for key, val in attrs if key == "src"]

            if len(srcs) == 1:
                if srcs[0].split("?")[0] == "https://george.gh0.pw/embed.cgi":
                    self.frame_url = srcs[0]

        if tag.lower() == "meta":
            http_equivs = [val.strip().lower() for key, val in attrs if key.strip() == "http-equiv"]
            contents_equivs = [val.strip().lower() for key, val in attrs if key.strip() == "content"]

            if http_equivs == ["permissions-policy"] and contents_equivs == ["interest-cohort=()"]:
                self.floc_meta = True

class GeorgeIFrameAnalyzer(HTMLParser):
    def __init__(self, user, curr_link, *args, **kwargs):
        super(GeorgeIFrameAnalyzer, self).__init__(*args, **kwargs)

        self.george_status = GeorgeStatus(user=user, curr_link=curr_link, prev_link=None, next_link=None, disabled_floc=False)

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
    try:
        site_req = await sess.get(url)
    except aiohttp.ClientError as _:
        raise GeorgeError.HTTP_ERROR

    extractor = GeorgeIFrameExtractor()
    try:
        extractor.feed((await site_req.content.read()).decode())
    except aiohttp.ClientError as _:
        raise GeorgeError.HTTP_ERROR
    except UnicodeDecodeError as _:
        raise GeorgeError.UNICODE_ERROR

    if extractor.frame_url == None:
        raise GeorgeError.NO_IFRAME

    try:
        embed_req = await sess.get(extractor.frame_url)
    except aiohttp.ClientError as _:
        raise GeorgeError.HTTP_ERROR

    analyzer = GeorgeIFrameAnalyzer(extractor.frame_url.split("?")[1].split("&")[0], url)
    try:
        analyzer.feed((await embed_req.content.read()).decode())
    except aiohttp.ClientError as _:
        raise GeorgeError.HTTP_ERROR
    except UnicodeDecodeError as _:
        raise GeorgeError.UNICODE_ERROR

    if "Permissions-Policy" in site_req.headers and \
        site_req.headers["Permissions-Policy"] == "interest-cohort=()":
        analyzer.george_status.disabled_floc = True

    if extractor.floc_meta:
        analyzer.george_status.disabled_floc = True

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
