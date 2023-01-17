let BLOCKS = Array.from(document.getElementById("blocks").children);

class Blocklet {
    constructor(
        shape, borders
    ) {
        this.shape = shape;
        this.borders = borders;
    }

    set_blocklet(blocklet) {
        blocklet.dataset["shape"] = this.shape;
        for (let border of ["l", "t", "r", "b"]) {
            if (this.borders.indexOf(border) !== -1)
                blocklet.classList.add(border);
            else
                blocklet.classList.remove(border);
        }
    }
}

function bl(spec) {
    let shape = spec.substring(0, spec.indexOf(" "));
    let borders = Array.from(spec.substring(1+spec.indexOf(" ")));
    return new Blocklet(shape, borders);
}

class Block {
    constructor(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }
    set_block(block) {
        let [ca, cb, cc, cd] = block.children;
        let [ba, bb, bc, bd] = [ca.children[0], cb.children[0], cc.children[0], cd.children[0]];
        this.a.set_blocklet(ba);
        this.b.set_blocklet(bb);
        this.c.set_blocklet(bc);
        this.d.set_blocklet(bd);
    }
}

function block(spec) {
    let sa = spec.substring(0, spec.indexOf("/"));
    spec = spec.substring(1+spec.indexOf("/"));
    let sb = spec.substring(0, spec.indexOf("/"));
    spec = spec.substring(1+spec.indexOf("/"));
    let sc = spec.substring(0, spec.indexOf("/"));
    spec = spec.substring(1+spec.indexOf("/"));
    let sd = spec;
    return new Block(bl(sa), bl(sb), bl(sc), bl(sd));
}

const C = block("cnw lt/cse trb/csw lb/cne trb");
const O = block("cnw lt/cne tr/csw lb/cse br");
const R = block("square lt/cse trb/csw lbr/none ");
const A = block("cnw lt/cne tr/csw lb/square br");
const L = block("square ltr/none /csw lbr/none ");
const S = block("cnw blt/cse trb/cnw blt/cse trb");
const H = block("cnw ltr/none /square lb/cne trb");
const E = block("cnw lt/cse trb/csw lb/cse trb");
const G = block("cnw lt/cne trb/csw lb/cne trb");
const LAMBDA = block("cne trl/none /cse blr/csw trlb");
const T = block("square lt/square trb/csw lbr/none ");
const K = block("square lt/cse trb/square lb/cne trb");
const I = block("dot trlb/none /square trlb/none ");
const EXCL = block("square trlb/none /dot trlb/none ");
const P = block("square lt/cne trb/square lbr/none ");
const N = block("none /none /square tlb/cne trb");
const F = block("cnw lt/cne trb/square lbr/none ");
const U = block("none /none /csw tlb/cse trb");

const B = block("square lt/cne trb/square lb/cne trb");
const D = block("square lt/cne tr/square lb/cse rb");
const M = block("none /none /cnw blt/cne brt");
const J = block("none /square ltr/csw tlb/cse rb");
const Q = block("cnw lt/cne tr/csw lbr/csw lbr");
const V = block("none /none /cne rbtl/cnw rbtl");
const X = block("cne ltr/cnw ltr/cse lbr/csw lbr");
const Y = block("cne ltrb/cnw ltr/none /square lbr");
const Z = block("csw ltb/cne btr/csw lbt/cne btr");
const DOT = block("none /none /dot trlb/none ");
const DASH = block("none /none /square trlb/none ");
const DOTDASH = block("none /none /dot trlb/ square trlb");

const EMPTY = block("none /none /none /none ");

const ALPHABET = [
    A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, X, Y, Z
];

const PARTS = {
    "coral": {
        "letters": [C, O, R, A, L],
        "palette": [
            "#F5E065",
            "#FCCB65",
            "#E6A267",
            "#FC8665",
            "#F26173",
        ],
    },
    "shoes": {
        "letters": [S, H, O, E, S],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "lcalc": {
        "letters": [LAMBDA, C, A, L, C],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "toki": {
        "letters": [T, O, K, I, EMPTY],
        "palette": [
            "#F5E065",
            "#FCCB65",
            "#E6A267",
            "#FC8665",
            "#F26173",
        ],
    },
    "pona": {
        "letters": [P, O, N, A, EMPTY],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "funge": {
        "letters": [F, U, N, G, E],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "bread": {
        "letters": [B, R, E, A, D],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "quest": {
        "letters": [Q, U, E, S, T],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "cookie": {
        "letters": [C, O, O, K, I],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "clicker": {
        "letters": [C, L, I, K, R],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "morse": {
        "letters": [M, O, R, S, E],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
    "morsecode": {
        "letters": [EMPTY, DOT, DASH, DOTDASH, EMPTY],
        "palette": [
            "#E86CF5",
            "#AB6DFC",
            "#6F72E6",
            "#6DB3FC",
            "#68EAF2",
        ],
    },
};

function v2h(c) {
    return (c < 16 == 1 ? "0" : "") + c.toString(16);
}

function rgbToHex(r, g, b) {
    return "#" + v2h(0|r) + v2h(0|g) + v2h(0|b);
}

function set_color(block, col) {
    block.style.setProperty("--color", col);

    let n = parseInt(col.substring(1), 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;

    let rr = 255 - (255 - r) * 0.3;
    let gg = 255 - (255 - g) * 0.3;
    let bb = 255 - (255 - b) * 0.3;

    block.style.setProperty("--border-color", rgbToHex(rr, gg, bb));
}

async function sleep(t) {
    return new Promise(r => setTimeout(r, t*1000));
}

async function set_part(part) {
    for (let i = 0; i < BLOCKS.length; i++) {
        set_color(BLOCKS[i], part.palette[i]);
        part.letters[i].set_block(BLOCKS[i]);
        await sleep(0.1);
    }
}

// (async function() {
//     for (let i = 0; true; ) {
//         let lets = [];
//         let cols = [];
//         for (let j = 0; j < 5; j++) {
//             let theta = i * 0.24;
//             cols.push(rgbToHex(255 * (Math.sin(theta) + 1) / 2, 255 * (Math.sin(theta + Math.PI * 2 / 3) + 1) / 2, 255 * (Math.sin(theta + Math.PI * 4 / 3) + 1) / 2));
//             lets.push(ALPHABET[i++ % ALPHABET.length]);
//         }

//         console.log(cols);

//         let part = {
//             "letters": lets,
//             "palette": cols,
//         };
//         await set_part(part);
//         await sleep(2);
//     }
// })();


let parts = ["coral", "shoes"];
(async function() {
    while (true) {
        let partname = parts[0];
        parts = parts.slice(1);
        parts.push(partname);

        let part = PARTS[partname];
        set_part(part);
        await sleep(2);
    }
})();
