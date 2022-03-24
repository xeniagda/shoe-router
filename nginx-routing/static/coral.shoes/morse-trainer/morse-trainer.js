const DIT = "DIT";
const DAH = "DAH";
const LETTER_SEPARATOR = "LET";
const WORD_SEPARATOR = "WORD";

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

class Morse {
    // draw_callback(typed, typing, event_spans)
    constructor(dit_speed_ms, draw_callback) {
        this.draw_callback = draw_callback;

        this.last_press_start = null;
        this.last_press_end = null;
        this.events = [];

        this.typed_text = "";

        this.force_update = false;

        this.DIT_DURATION = 0;
        this.DAH_DURATION = 0;
        this.SYMBOL_SEP = 0;
        this.LETTER_SEP = 0;
        this.WORD_SEP = 0;

        this.set_speeds(dit_speed_ms);

        self = this;
        this.redraw_int = setInterval(() => self.redraw(), 10);

        this.last_displayed_events = null;
    }

    set_speeds(dit_speed_ms) {
        this.DIT_DURATION = dit_speed_ms / 1000;
        this.DAH_DURATION = 3 * this.DIT_DURATION;
        this.SYMBOL_SEP = this.DIT_DURATION;
        this.LETTER_SEP = 3 * this.DIT_DURATION;
        this.WORD_SEP = 7 * this.DIT_DURATION;
    }

    get_space() {
        if (this.last_press_end == null) {
            return null;
        }
        let delta = (Date.now() - this.last_press_end) / 1000;
        if (delta > (this.WORD_SEP + this.LETTER_SEP) / 2) {
            return WORD_SEPARATOR;
        } else if (delta > (this.LETTER_SEP + this.SYMBOL_SEP) / 2) {
            return LETTER_SEPARATOR;
        }
        return null;
    }

    get_dot() {
        if (this.last_press_start == null) {
            return null;
        }
        let delta = (Date.now() - this.last_press_start) / 1000;
        if (delta > (this.DAH_DURATION + this.DIT_DURATION) / 2) {
            return DAH;
        } else {
            return DIT;
        }
    }

    push_word() {
        let word = get_word(this.events, true);
        this.typed_text += word;
        this.events = [];
    }

    press() {
        this.last_press_start = Date.now();

        let space = this.get_space();
        if (space != null)
            this.events.push(space);

        this.last_press_end = null;

        if (space == WORD_SEPARATOR) {
            this.push_word();
        }

        this.redraw();
    }

    release() {
        this.last_press_end = Date.now();

        let dot = this.get_dot();
        if (dot != null)
            this.events.push(dot);

        this.last_press_start = null;

        this.redraw();
    }

    clear() {
        if (this.events.length == 0 && this.typed_text.length != 0) {
            this.typed_text = this.typed_text.slice(0, this.typed_text.length-2) + " ";
            this.force_update = true;
        } else {
            this.events = [];
            this.last_press_start = null;
            this.last_press_end = null;
        }
    }

    redraw() {
        let current_events = this.events.slice();

        let dot = this.get_dot();
        if (dot != null)
            current_events.push(dot);

        let space = this.get_space();
        if (space != null)
            current_events.push(space);

        if (!this.force_update && this.last_displayed_events != null && current_events.join(" ") == this.last_displayed_events.join(" "))
            return;
        this.force_update = false;
        this.last_displayed_events = current_events;


        let content = [];
        for (var i = 0; i < current_events.length; i++) {
            let thing = current_events[i];
            content.push(event_span(thing));
        }
        let current_word = get_word(current_events, false);
        content.push(document.createElement("br"));
        content.push(document.createTextNode(current_word));

        self.draw_callback(this.typed_text, get_word(current_events, false), content);
    }
}

function bind_speed_input(morse, speed_inp) {
    if (localStorage.getItem("speed") != null) {
        morse.set_speeds(+localStorage.getItem("speed"));
        speed_inp.value = localStorage.getItem("speed");
    } else {
        morse.set_speeds(+speed_inp.value);
    }

    speed_inp.addEventListener("change", e => {
        morse.set_speeds(+speed_inp.value);
        localStorage.setItem("speed", speed_inp.value);
    });
}
