const DIT = ".";
const DAH = "-";
const LETTER_SEPARATOR = "LET";
const WORD_SEPARATOR = "WORD";

function event_span(ev) {
    let el = document.createElement("span");
    if (ev == DIT) {
        el.innerText = "·";
        el.classList.add("dot");
    } else if (ev == DAH) {
        el.innerText = "–";
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

function span_with_class(text, ...clss) {
    let el = document.createElement("span");

    el.innerText = text;

    for (let cls of clss)
        el.classList.add(cls);
    return el;
}

function get_letter(ev) {
    for (var i = 0; i < MORSE.length; i++) {
        let l = MORSE[i];
        if (l.length == 0)
            continue;
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

// empty element = space in table
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

    [],

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

    [],

    [".", ".-.-.-"],
    [",", "--..--"],
    ["?", "..--.."],
    ["!", "-.-.--"],
];

class Morse {
    // draw_callback(typed, typing, morse_spans, current_word)
    constructor(dit_speed_ms, draw_callback) {
        this.draw_callback = draw_callback;

        this.last_press_start = null;
        this.last_press_end = null;
        this.events = [];

        this.typed_text = "CORAL DOT SHOES! ";

        this.force_update = false;

        this.DIT_DURATION = 0;
        this.DAH_DURATION = 0;
        this.SYMBOL_SEP = 0;
        this.LETTER_SEP = 0;
        this.WORD_SEP = 0;

        this.set_speeds(dit_speed_ms);

        let self = this;
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

        this.draw_callback(this.typed_text, get_word(current_events, false), content, current_word);
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

// fill morse table
let col_left = document.getElementById("col-left");
let children = [];
for (var i = 0; i < MORSE.length / 2; i++) {
    if (MORSE[i].length == 0) {
        children.push(document.createElement("br"));
        continue;
    }
    let div = document.createElement("div");

    div.classList.add("morse-element");
    for (var j = 0; j < MORSE[i][1].length; j++)
        div.appendChild(event_span(MORSE[i][1][j]));

    div.appendChild(span_with_class(" " + MORSE[i][0]));

    children.push(div);
}
col_left.replaceChildren(...children);

let col_right = document.getElementById("col-right");
children = [];
for (; i < MORSE.length; i++) {
    if (MORSE[i].length == 0) {
        children.push(document.createElement("br"));
        continue;
    }
    let div = document.createElement("div");
    div.classList.add("morse-element");

    div.appendChild(span_with_class(MORSE[i][0] + " "));
    for (var j = 0; j < MORSE[i][1].length; j++)
        div.appendChild(event_span(MORSE[i][1][j]));


    children.push(div);
}
col_right.replaceChildren(...children);


const AudioContext = window.AudioContext || window.webkitAudioContext;

const RAMP_TIME = 0.015;
class MorseAudio {
    constructor() {
        this.audio_ctx = new AudioContext();

        this.base_osc = this.audio_ctx.createOscillator();
        this.base_osc.frequency.setValueAtTime(641, this.audio_ctx.currentTime);

        this.gain = this.audio_ctx.createGain();
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime);

        this.volume = 1;

        this.base_osc.connect(this.gain);
        this.gain.connect(this.audio_ctx.destination);
        this.base_osc.start();

        this.is_on = false;

        this.events = [];
    }

    on() {
        if (this.is_on)
            return;
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(this.volume, this.audio_ctx.currentTime+RAMP_TIME);
        this.is_on = true;
    }

    off() {
        if (!this.is_on)
            return;
        this.gain.gain.setValueAtTime(this.volume, this.audio_ctx.currentTime);
        this.gain.gain.linearRampToValueAtTime(0, this.audio_ctx.currentTime+RAMP_TIME);
        this.is_on = false;
    }

    set_volume(volume) {
        this.volume = volume / 100;
        if (this.is_on)
            this.on();
    }
}

function bind_volume_input(audio, volume_inp) {
    if (localStorage.getItem("volume") != null) {
        audio.set_volume(+localStorage.getItem("volume"));
        volume_inp.value = localStorage.getItem("volume");
    } else {
        audio.set_volume(+volume_inp.value);
    }

    volume_inp.addEventListener("change", e => {
        audio.set_volume(+volume_inp.value);
        localStorage.setItem("volume", volume_inp.value);
    });
}

class SelectionHandler {
    // play_start(text, start, end)
    // on_play_end()
    // on_play_letter(idx)
    constructor(morse, audio, text_field, play_button, stop_button, on_play_start, on_play_end, on_play_letter) {
        this.morse = morse;
        this.audio = audio;

        this.text_field = text_field;
        this.play_button = play_button;
        this.stop_button = stop_button;

        this.on_play_start = on_play_start;
        this.on_play_end = on_play_end;
        this.on_play_letter = on_play_letter;

        let self = this;

        this.play_button.addEventListener("click", () => self.play());
        this.stop_button.addEventListener("click", () => self.stop());
        setInterval(() => self.check(), 10);

        this.last_selection = this.get_selection();

        this.playing = []; // [["on"|"off", "dit"|"dah"|"symb"|"let"|"word", idx]]
        this.next_at = Date.now();

        setInterval(() => self.tick(), 10);
    }

    tick() {
        if (this.next_at == null || Date.now() > this.next_at) {
            if (this.playing.length > 0) {
                let next = this.playing[0];
                this.playing = this.playing.slice(1);

                if (next[0] == "on")
                    this.audio.on();
                else
                    this.audio.off();

                let duration = null;
                if (next[1] == "dit")
                    duration = this.morse.DIT_DURATION;
                else if (next[1] == "dah")
                    duration = this.morse.DAH_DURATION;
                else if (next[1] == "symb")
                    duration = this.morse.SYMBOL_SEP;
                else if (next[1] == "let")
                    duration = this.morse.LETTER_SEP;
                else if (next[1] == "word")
                    duration = this.morse.WORD_SEP;

                if (duration == null) {
                    console.log(`Unknown duration for ${next}`);
                    return;
                }
                this.next_at = Date.now() + duration * 1000;
                this.on_play_letter(next[2]);
            } else {
                if (this.next_at != null) {
                    this.next_at = null;
                    this.stop_button.classList.remove("active");
                    this.audio.off();

                    this.on_play_end();
                }
            }
        }
    }

    stop() {
        this.next_at = null;
        this.playing = [];
        this.stop_button.classList.remove("active");
        this.audio.off();

        this.on_play_end();
    }

    get_selection() {
        let sel = window.getSelection();

        let selected = true;
        if ((sel.focusNode == null) || (sel.anchorNode == null)) {
            selected = false;
        } else if (!sel.focusNode.parentElement.isEqualNode(this.text_field)) {
            selected = false;
        } else if (!sel.anchorNode.parentElement.isEqualNode(this.text_field))
            selected = false;
        else if (sel.toString().length == 0) {
            selected = false;
        }

        if (!selected)
            return null;

        let start = Math.min(sel.anchorOffset, sel.focusOffset);
        let end = Math.max(sel.anchorOffset, sel.focusOffset);

        return {"start": start, "end": end, "text": sel.toString()};
    }

    check() {
        let selection = this.get_selection();
        if (selection == null) {
            this.play_button.classList.remove("active");
            if (!this.play_button.contains(window.getSelection().focusNode)) {
                this.last_selection = null;
            }
        } else {
            this.play_button.classList.add("active");
            this.last_selection = selection;
        }
    }

    play() {
        if (this.last_selection == null)
            return;

        // TODO: This should be factored out probably
        this.playing = [];
        let last_let = false;
        for (var i = 0; i < this.last_selection["text"].length; i++) {
            let char_here = this.last_selection["text"][i];
            let total_idx = i + this.last_selection["start"];

            if (char_here == " " || char_here == "\n") {
                if (last_let)
                    this.playing = this.playing.slice(0, this.playing.length-1);
                this.playing.push(["off", "word", total_idx]);
                last_let = false;
            } else {
                let code = null;
                for (let m of MORSE) {
                    if (m.length == 0)
                        continue;
                    if (m[0] == char_here)
                        code = m[1];
                }
                if (code == null) {
                    console.warn(`unknown char ${char_here}`);
                    continue;
                }
                for (let ch of code) {
                    if (ch == DIT) {
                        this.playing.push(["on", "dit", total_idx]);
                        this.playing.push(["off", "symb", total_idx]);
                    } else {
                        this.playing.push(["on", "dah", total_idx]);
                        this.playing.push(["off", "symb", total_idx]);
                    }
                }
                // Remove last letter symbol separator
                this.playing = this.playing.slice(0, this.playing.length-1);
                this.playing.push(["off", "let", total_idx]);
                last_let = true;
            }
        }
        this.on_play_start(this.last_selection["text"], this.last_selection["start"], this.last_selection["end"]);

        this.last_selection = null;

        this.stop_button.classList.add("active");
    }
}
