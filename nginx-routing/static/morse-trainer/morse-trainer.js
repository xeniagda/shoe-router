const DIT = "DIT";
const DAH = "DAH";

const LETTER_SEPARATOR = "LET";
const WORD_SEPARATOR = "WORD";

var DIT_DURATION = 0;
var DAH_DURATION = 0;
var SYMBOL_SEP = 0;
var LETTER_SEP = 0;
var WORD_SEP = 0;



const MORSE = [
    ["A", ".-"],
    ["B", "-..."],
    ["C", "-.-."],
    ["D", "-.."],
    ["E", "."],
    ["F", "..-."],
    ["G", "--."],
    ["H", "...."],
    ["I", ".."],
    ["J", ".---"],
    ["K", "-.-"],
    ["L", ".-.."],
    ["M", "--"],
    ["N", "-."],
    ["O", "---"],
    ["P", ".--."],
    ["Q", "--.-"],
    ["R", ".-."],
    ["S", "..."],
    ["T", "-"],
    ["U", "..-"],
    ["V", "...-"],
    ["W", ".--"],
    ["X", "-..-"],
    ["Y", "-.--"],
    ["Z", "--.."],

    ["1", ".----"],
    ["2", "..---"],
    ["3", "...--"],
    ["4", "....-"],
    ["5", "....."],
    ["6", "-...."],
    ["7", "--..."],
    ["8", "---.."],
    ["9", "----."],
    ["0", "-----"],

    [".", ".-.-.-"],
    [",", "--..--"],
    ["?", "..--.."],
    ["!", "-.-.--"],
];

var last_press_start = null;
var last_press_end = null;
events = [];

function get_space() {
    if (last_press_end == null) {
        return null;
    }
    let delta = (Date.now() - last_press_end) / 1000;
    if (delta > (WORD_SEP + LETTER_SEP) / 2) {
        return WORD_SEPARATOR;
    } else if (delta > (LETTER_SEP + SYMBOL_SEP) / 2) {
        return LETTER_SEPARATOR;
    }
    return null;
}

function get_dot() {
    if (last_press_start == null) {
        return null;
    }
    let delta = (Date.now() - last_press_start) / 1000;
    if (delta > (DAH_DURATION + DIT_DURATION) / 2) {
        return DAH;
    } else {
        return DIT;
    }
}


function event_span(ev) {
    let el = document.createElement("span");
    if (ev == DIT) {
        el.innerText = "•";
        el.classList.add("dot");
    } else if (ev == DAH) {
        el.innerText = "-";
        el.classList.add("dot");
    } else if (ev == LETTER_SEPARATOR) {
        el.innerText = "-";
        el.classList.add("space");
    } else if (ev == WORD_SEPARATOR) {
        el.innerText = "␣";
        el.classList.add("space");
    }
    return el;
}

function span_with_class(text, cls) {
    let el = document.createElement("span");

    el.innerText = text;
    el.classList.add(cls);
    return el;
}

function get_letter(ev) {
    for (var i = 0; i < MORSE.length; i++) {
        let l = MORSE[i];
        let sequence = l[1];
        if (sequence.length != ev.length)
            continue;

        let bad = false;
        for (var j = 0; j < sequence.length; j++) {
            if ((sequence[j] == ".") != (ev[j] == DIT))
                bad = true;
        }
        if (!bad)
            return l[0];
    }
    return "?";
}

function get_word(events, use_real_spaces) {
    let letters = [];
    let current_letter = [];
    for (var i = 0; i < events.length; i++) {
        let current_ev = events[i];
        if (current_ev == DIT || current_ev == DAH) {
            current_letter.push(current_ev);
        } else if (current_ev == LETTER_SEPARATOR || current_ev == WORD_SEPARATOR) {
            letters.push(get_letter(current_letter));
            if (current_ev == WORD_SEPARATOR)
                letters.push(use_real_spaces ? " " : "␣");
            current_letter = [];
        }
    }
    return letters.join("");
}

let typed_text = "Hello world! ";

let force_update = false;

let main = document.getElementById("main");

let speed_inp = document.getElementById("speed");

function set_speeds(dit_speed_ms) {
    DIT_DURATION = dit_speed_ms / 1000;
    DAH_DURATION = 3 * DIT_DURATION;
    SYMBOL_SEP = DIT_DURATION;
    LETTER_SEP = 3 * DIT_DURATION;
    WORD_SEP = 7 * DIT_DURATION;

    speed_inp.value = dit_speed_ms;
    localStorage.setItem("speed", dit_speed_ms);
}

if (localStorage.getItem("speed") != null) {
    set_speeds(+localStorage.getItem("speed"));
} else {
    set_speeds(+speed_inp.value);
}

speed_inp.addEventListener("change", e => {
    set_speeds(+e.target.value);
});

document.body.addEventListener("keydown", e => {
    if (e.key == " " && !event.repeat) {
        last_press_start = Date.now();

        let space = get_space();
        if (space != null)
            events.push(space);

        last_press_end = null;
    }
    if (e.key == "Backspace") {
        if (events.length == 0 && typed_text.length != 0) {
            typed_text = typed_text.slice(0, typed_text.length-2) + " ";
            force_update = true;
        } else {
            events = [];
            last_press_start = null;
            last_press_end = null;
        }
    }
});

document.body.addEventListener("keyup", e => {
    if (e.key == " ") {
        last_press_end = Date.now();

        let dot = get_dot();
        if (dot != null)
            events.push(dot);

        last_press_start = null;
    }
});

let last_displayed_events = null;
function update_display() {
    let button = document.getElementById("button");

    let current_events = events.slice();

    let dot = get_dot();
    if (dot != null)
        current_events.push(dot);

    let space = get_space();
    if (space != null)
        current_events.push(space);

    if (!force_update && last_displayed_events != null && current_events.join(" ") == last_displayed_events.join(" "))
        return;
    force_update = false;

    last_displayed_events = current_events;

    let content = [];
    for (var i = 0; i < current_events.length; i++) {
        let thing = current_events[i];
        content.push(event_span(thing));
    }
    let current_word = get_word(current_events, false);
    content.push(document.createElement("br"));
    content.push(document.createTextNode(current_word));
    button.replaceChildren(...content);

    let displayed_text = typed_text + get_word(current_events, false);
    document.getElementById("text").replaceChildren(span_with_class(typed_text, "typed"), span_with_class(get_word(current_events, false), "typing"));

    if (events.length == 0) {
        return;
    }

    let last = events[events.length-1];
    if (last == WORD_SEPARATOR) {
        let word = get_word(events, true);
        typed_text += word;
        events = [];
    }

}
update_display();
setInterval(update_display, 0.010);
