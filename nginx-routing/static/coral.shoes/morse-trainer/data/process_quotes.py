import json

ALLOWED_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?"
SOFT_ALLOWED = "\"';:-%/" # will be stripped

data = []

with open("quotes.txt", "r") as quotes:
    for i, line in enumerate(quotes):
        line = line.strip()
        parts = line.split('"')

        if len(parts) != 3:
            print(i, "wrong parts")
            continue

        _, quote, author = parts

        author = author.strip()
        if not author.startswith("-"):
            print(i, "incorrect -")
            continue
        author = author[1:].strip() # remove -

        if "," in author:
            print(i, "sussy author:", author)

        quote = quote.strip().upper()
        quote = "".join(ch for ch in quote if ch not in SOFT_ALLOWED)
        if quote.endswith(".") and quote.count(".") == 1:
            quote = quote[:-1]

        if not all(ch in ALLOWED_SYMBOLS for ch in quote):
            print(i, "invalid char", "".join(ch for ch in quote if ch not in ALLOWED_SYMBOLS))
            continue

        data.append({"author": author, "quote": quote})

with open("quotes.json", "w") as quotes_json:
    json.dump(data, quotes_json)
