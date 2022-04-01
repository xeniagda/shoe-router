import numpy as np
import sys
import json
import matplotlib.pyplot as plt
import random

with open("quotes.json", "r") as f:
    data = json.load(f)

symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?"
symbols = sorted(list(symbols))

raw_table = np.zeros((len(symbols), len(symbols))) # indexed by [current, last]

for quote in data:
    for l1, l2 in zip(quote["quote"][:-1], quote["quote"][1:]):
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
