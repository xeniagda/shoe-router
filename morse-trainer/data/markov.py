import os
import numpy as np
import sys
import json
import matplotlib.pyplot as plt
import random

print("[ loading quote list ]")
with open("quotes.json", "r") as f:
    data = json.load(f)

texts = [entry["quote"] for entry in data]

symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?"
symbols = sorted(list(symbols))

print("[ loading other files ]")
for (dir, subdirs, files) in os.walk(".."):
    for filename in files:
        if filename.startswith(".") or filename == "quotes.txt" or filename.endswith(".json"):
            continue
        print(f"[ loading {dir}/{filename} ]")
        with open(os.path.join(dir, filename)) as f:
            try:
                content = f.read().upper().replace("\n", " ")
                content = "".join(ch for ch in content if ch in symbols)
                while True:
                    new = content.replace("  ", " ")
                    if content != new:
                        content = new
                    else:
                        break
                texts.append(content)
            except UnicodeDecodeError:
                print("  [ failed to decode, skipping ]")

print(f"[ we have {len(texts)} texts, {sum(map(len, texts))/1e3:4.4} kb in total ]")

raw_table = np.zeros((len(symbols), len(symbols))) # indexed by [current, last]

for quote in texts:
    for l1, l2 in zip(quote[:-1], quote[1:]):
        if l1 != l2:
            raw_table[symbols.index(l2)][symbols.index(l1)] += 1

raw_table += np.random.exponential(scale=0.1, size=raw_table.shape)

def normalized(tab):
    tab = np.array(tab)
    for i in range(tab.shape[1]):
        if tab[:,i].sum() != 0:
            tab[:,i] /= tab[:,i].sum()

    return tab

table = normalized(raw_table)
rev = normalized(raw_table.T)
stationary = np.linalg.matrix_power(table, 1000)

with open("markov.json", "w") as f:
    data = {
        "symbols": symbols,
        "forward": table.T.tolist(),
        "backward": rev.T.tolist(),
        "initial": stationary[:, 0].tolist(),
    }
    json.dump(data, f)
