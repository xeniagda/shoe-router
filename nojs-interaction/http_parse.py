from abc import ABC, abstractmethod

class ParserExpectedException(Exception):
    def __init__(self, chs):
        self.chs = chs

    def __repr__(self):
        return "ParserExpectedException(" + repr(self.chs) + ")"

    def __str__(self):
        return repr(self)

class ParsingStage(ABC):
    # Returns a tuple (ParsingStage, fn/none)
    # Consumes self
    @abstractmethod
    def pass_ch(self, ch):
        pass

    @abstractmethod
    def __repr__(self):
        pass

    def __str__(self):
        return repr(self)

class Skip(ParsingStage):
    def __init__(self, to_skip, next_stage):
        self.to_skip = to_skip
        self.next_stage = next_stage

    def pass_ch(self, ch):
        if self.to_skip == b"":
            return self.next_stage.pass_ch(ch)

        if ch == self.to_skip[0:1]:
            return (self.next_stage, None)

        raise ParserExpectedException(self.to_skip)

    def __repr__(self):
        return f"Skip(to_skip={self.to_skip!r}, next_stage={self.next_stage})"

class ParsingMethod(ParsingStage):
    def __init__(self):
        self.method = b""

    def pass_ch(self, ch):
        if ch == b" ":
            def done(parser): parser.method = self.method
            return (ParsingPath(), done)
        else:
            self.method += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingMethod(method={self.method!r})"

class ParsingPath(ParsingStage):
    def __init__(self):
        self.path = b""

    def pass_ch(self, ch):
        if ch == b" ":
            def done(parser): parser.path = self.path
            return (ParsingVersion(), done)
        elif ch == b"?":
            def done(parser): parser.path = self.path
            return (ParsingQuery(), done)
        else:
            self.path += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingPath(path={self.path!r})"

class ParsingQuery(ParsingStage):
    def __init__(self):
        self.query = b""

    def pass_ch(self, ch):
        if ch == b" ":
            def done(parser): parser.query = self.query
            return (ParsingVersion(), done)
        else:
            self.query += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingQuery(query={self.query!r})"

class ParsingVersion(ParsingStage):
    def __init__(self):
        self.version = b""

    def pass_ch(self, ch):
        if ch == b"\r":
            def done(parser): parser.version = self.version
            return (Skip(b"\n", ParsingHeaderStart()), done)
        else:
            self.version += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingVersion(version={self.version!r})"

class ParsingHeaderStart(ParsingStage):
    def pass_ch(self, ch):
        if ch == b"\r":
            def done(parser):
                parser.done = True
            return (self, done)
        else:
            return (ParsingHeaderName(ch), None)

    def __repr__(self):
        return f"ParsingHeaderStart()"

class ParsingHeaderName(ParsingStage):
    def __init__(self, name):
        self.header_name = name

    def pass_ch(self, ch):
        if ch == b":":
            return (Skip(b" ", ParsingHeaderValueFor(self.header_name)), None)
        else:
            self.header_name += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingHeaderName(header_name={self.header_name!r})"

class ParsingHeaderValueFor(ParsingStage):
    def __init__(self, header_name):
        self.header_name = header_name
        self.value = b""

    def pass_ch(self, ch):
        if ch == b"\r":
            def done(parser): parser.headers[self.header_name] = self.value
            return (Skip(b"\n", ParsingHeaderStart()), done)
        else:
            self.value += ch
            return (self, None)

    def __repr__(self):
        return f"ParsingHeaderValue(header_name={self.header_name!r}, value={self.header_name!r})"

class HTTPParser:
    def __init__(self):
        self.method = None
        self.path = None
        self.query = None
        self.version = None
        self.headers = {}

        self.currently_parsing = ParsingMethod()

        self.done = False

    def pass_ch(self, ch):
        next, fn = self.currently_parsing.pass_ch(ch)
        if fn != None:
            fn(self)

        self.currently_parsing = next

    def __str__(self):
        return f"HTTPParser(method={self.method!r}, path={self.path!r}, query={self.query!r}, version={self.version!r}, headers={self.headers}, done={self.done}, currently_parsing={self.currently_parsing})"

if __name__ == "__main__":
    test = b"GET /aaa?aaaaaaa HTTP/1.1\r\nHost: coral.shoes\r\nX-Baka-Status: Sussy\r\n\r\n"

    p = HTTPParser()

    for ch in test:
        ch = bytes([ch])
        print(ch, p)
        p.pass_ch(ch)

    print(p)
