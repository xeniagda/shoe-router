morse = new Morse(100, update_display);
audio = new MorseAudio();
select = new SelectionHandler(
    morse,
    audio,
    document.getElementById("totype"),
    document.getElementById("button-play-outer"),
    document.getElementById("button-stop-outer"),
    (tx, st, en) => {},
    () => { morse.force_update = true; },
    highlight_letter,
);

bind_speed_input(morse, document.getElementById("speed"));
bind_volume_input(audio, document.getElementById("volume"));

let current_sentence = null;
let author = null;
let quotes = [];

fetch("data/quotes.json", {
    mode: "no-cors",
    headers: {
        "Content-Type": "application/json"
    },
}).then(data =>
    data.json()
).then(data => {
    console.log(data);
    quotes = data;
    select_new_sentence();
    morse.force_update = true;
});

// shamelessly stolen from https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript#comment111181647_8831937
function strhash(st) {
    return Array.from(st).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0);
}

function get_available_quotes() {
    let available_quotes = [];

    let hashes = localStorage.getItem("completed-hashes") || "";
    for (let quote of quotes) {
        let hash = strhash(quote["quote"]);
        if (!hashes.includes("/" + hash.toString() + "/")) {
            available_quotes.push(quote);
        }
    }

    return available_quotes;
}

function sentence_completed() {
    if (current_sentence != null) {
        let current_hashes = localStorage.getItem("completed-hashes") || "/";
        let new_hashes = current_hashes + strhash(current_sentence["quote"]).toString() + "/";
        localStorage.setItem("completed-hashes", new_hashes);
    }
}

function select_new_sentence() {
    let available = get_available_quotes();
    if (available.length == 0) {
        // TODO: Alert user!
        localStorage.removeItem("completed-hashes");
        available = quotes;
    }

    let quote = available[0|Math.random()*available.length];
    current_sentence = quote["quote"];
    author = quote["author"];

    morse.clear_all();
    morse.force_update = true;
}

function win() {
    let fw = make_fireworks();
    select_new_sentence();
}

document.body.addEventListener("keydown", e => {
    if (e.key == " ") {
        e.preventDefault();
        if (!e.repeat) {
            morse.press();
            audio.on();
        }
    }
    if (e.key == "Enter") {
        morse.submit_word();
        e.preventDefault();
    }
    if (e.key == "Backspace") {
        morse.clear();
        e.preventDefault();
    }
    if (e.key == "Tab") {
        select_new_sentence();
        e.preventDefault();
    }
});

document.body.addEventListener("keyup", e => {
    if (e.key == " ") {
        morse.release();
        audio.off();
    }
});

const button = document.getElementById("button");

const typed_len = 0;

function update_display(typed, typing, morse_spans, text) {
    if (current_sentence != null) {
        morse.typed_text += " ";
        for (let i = 0; i < morse.typed_text.length; i++) {
            if (morse.typed_text[i] != current_sentence[i]) {
                morse.typed_text = morse.typed_text.slice(0, i);
                typed = morse.typed_text;
                break;
            }
            if (i == current_sentence.length - 1) {
                // TODO: Win screen?
                win();
            }
        }
    }

    document.getElementById("key-morse").replaceChildren(...morse_spans);
    document.getElementById("key-text").innerText = text;

    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;
    if (current_sentence != null)
        document.getElementById("totype").innerText = current_sentence.slice(typed.length + text.length);

    document.getElementById("author").innerText = "- " + author;
}

function highlight_letter(idx) {
    let text = document.getElementById("totype").innerText;

    let before_highlight = document.createTextNode(text.slice(0, idx));
    let highlighted = span_with_class(text[idx], "type-highlight");
    let after_highlight = document.createTextNode(text.slice(idx + 1));

    document.getElementById("totype").replaceChildren(before_highlight, highlighted, after_highlight);
}

