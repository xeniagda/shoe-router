const DIT = ".";
const DAH = "-";
const LETTER_SEPARATOR = "LET";
const WORD_SEPARATOR = "WORD";

const DITS_PER_WORD = 50; // paris

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

        this.typed_text = "";

        this.force_update = false;

        this.DIT_DURATION = 0;
        this.DAH_DURATION = 0;
        this.SYMBOL_SEP = 0;
        this.LETTER_SEP = 0;
        this.WORD_SEP = 0;

        this.set_speeds_ms(dit_speed_ms);

        let self = this;
        this.redraw_int = setInterval(() => self.redraw(), 10);

        this.last_displayed_events = null;
    }

    set_speeds_ms(dit_speed_ms) {
        this.DIT_DURATION = dit_speed_ms / 1000;
        this.DAH_DURATION = 3 * this.DIT_DURATION;
        this.SYMBOL_SEP = this.DIT_DURATION;
        this.LETTER_SEP = 3 * this.DIT_DURATION;
        this.WORD_SEP = 7 * this.DIT_DURATION;
    }

    set_speeds_wpm(wpm) {
        let s_per_dit = 1 / (wpm / 60 * DITS_PER_WORD);
        this.set_speeds_ms(1000 * s_per_dit);
    }

    get_dit_speed_ms() {
        return 0 | (this.DIT_DURATION * 1000);
    }

    get_dit_speed_wpm() {
        let wpm = (1 / this.DIT_DURATION) / DITS_PER_WORD * 60;

        return (0 | (10 * wpm)) / 10;
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

    submit_word() {
        let space = this.get_space();
        if (space != null)
            this.events.push(space);
        this.push_word();

        this.events = [];
        this.last_press_start = null;
        this.last_press_end = null;
    }

    release() {
        this.last_press_end = Date.now();

        let dot = this.get_dot();
        if (dot != null)
            this.events.push(dot);

        this.last_press_start = null;

        if (this.events.length == 0)
            this.last_press_end = null;

        this.redraw();
    }

    clear() {
        this.events = [];
        this.last_press_start = null;
        this.last_press_end = null;
        this.force_update = true;
    }

    clear_all() {
        this.typed_text = "";
        this.clear();
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

function bind_speed_input(morse, ms_inp, wpm_inp) {
    if (localStorage.getItem("speed-ms") != null) {
        morse.set_speeds_ms(+localStorage.getItem("speed-ms"));
    } else {
        morse.set_speeds_ms(+ms_inp.value);
    }

    ms_inp.value = morse.get_dit_speed_ms();
    wpm_inp.value = morse.get_dit_speed_wpm();

    ms_inp.addEventListener("change", e => {
        morse.set_speeds_ms(+ms_inp.value);
        wpm_inp.value = morse.get_dit_speed_wpm();

        localStorage.setItem("speed-ms", morse.get_dit_speed_ms());
    });

    wpm_inp.addEventListener("change", e => {
        morse.set_speeds_wpm(+wpm_inp.value);
        ms_inp.value = morse.get_dit_speed_ms();

        localStorage.setItem("speed-ms", morse.get_dit_speed_ms());
    });
}

function fill_morse_table(table, f) {
    let col_left = table.children[0];
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

        if (f != undefined)
            f(div, MORSE[i]);
    }
    col_left.replaceChildren(...children);

    let col_right = table.children[2];
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

        if (f != undefined)
            f(div, MORSE[i]);
    }
    col_right.replaceChildren(...children);
}


const AudioContext = window.AudioContext || window.webkitAudioContext;

const HOLD_TIME = 0.010;
const RAMP_TIME = 0.012;

class MorseAudio {
    // lamp = document element to be given and ungiven .light class
    // may be undefined

    // as some browsers (firefox...) requires AudioContexts to be created
    // as a result of a "user action", we initially set audio_ctx to undefined.
    // Whenever a user action occurs, the controlling code should call the
    // init_user() method, which sets up the audio_ctx

    constructor(morse, lamp) {
        this.morse = morse;
        this.lamp = lamp;

        this.audio_ctx = undefined;

        this._freq = 512;
        this.needs_freq_update = false;
        this._volume = 1;
        this.needs_volume_update = false;

        this.is_on = false;

        // Lists of functions
        this.on_play_ends = [];
        this.on_play_letters = [];

        this.playing = []; // [["on"|"off", "dit"|"dah"|"symb"|"let"|"word", idx]]
        this.next_at = Date.now();

        let self = this;
        setInterval(() => self.tick(), 10);
    }

    init_user() {
        if (this.audio_ctx !== undefined)
            return;

        this.audio_ctx = new AudioContext();

        this.base_osc = this.audio_ctx.createOscillator();
        this.base_osc.frequency.setValueAtTime(512, this.audio_ctx.currentTime);

        this.gain = this.audio_ctx.createGain();
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime);

        this.base_osc.connect(this.gain);
        this.gain.connect(this.audio_ctx.destination);
        this.base_osc.start();

        console.info("Audio initialized");

        if (this.is_on) {
            this.is_on = false;
            this.on();
        }
    }

    set_freq(freq_hz) {
        if (freq_hz === this._freq)
            return;
        this._freq = freq_hz;
        this.needs_freq_update = true;
    }

    set_volume(volume) {
        this._volume = volume / 100;
        if (this.is_on)
            this.on();
    }

    set_light_enabled(status) {
        if (status) {
            this.lamp_enabled = true;
        } else {
            this.lamp_enabled = false;
            if (this.lamp !== undefined)
                this.lamp.classList.remove("light");
        }
    }

    tick() {
        if (this.needs_freq_update && this.audio_ctx !== undefined) {
            this.base_osc.frequency.setValueAtTime(this._freq, this.audio_ctx.currentTime);
            this.needs_freq_update = false;
        }
        if (this.next_at == null || Date.now() > this.next_at) {
            if (this.playing.length > 0) {
                let next = this.playing[0];
                this.playing = this.playing.slice(1);

                if (next[0] == "on")
                    this.on();
                else
                    this.off();

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
                for (let on_play_letter of this.on_play_letters)
                    on_play_letter(next[2]);
            } else {
                if (this.next_at != null) {
                    this.next_at = null;
                    this.off();

                    for (let on_play_end of this.on_play_ends)
                        on_play_end();
                }
            }
        }
    }

    play(text) {
        this.playing = [];
        let last_letter = false;
        for (var i = 0; i < text.length; i++) {
            let char_here = text[i];

            if (char_here == " " || char_here == "\n") {
                if (last_letter)
                    this.playing = this.playing.slice(0, this.playing.length-1); // remove last symbol separator
                this.playing.push(["off", "word", i]);
                last_letter = false;
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
                        this.playing.push(["on", "dit", i]);
                        this.playing.push(["off", "symb", i]);
                    } else {
                        this.playing.push(["on", "dah", i]);
                        this.playing.push(["off", "symb", i]);
                    }
                }
                // Remove last letter symbol separator
                this.playing = this.playing.slice(0, this.playing.length-1);
                this.playing.push(["off", "let", i]);
                last_letter = true;
            }
        }
    }

    stop() {
        this.next_at = null;
        this.playing = [];
        this.off();

        for (let on_play_end of this.on_play_ends)
            on_play_end();
    }

    on() {
        if (this.is_on)
            return;
        if (this.audio_ctx === undefined)
            return;
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime+HOLD_TIME);
        this.gain.gain.linearRampToValueAtTime(this._volume, this.audio_ctx.currentTime+HOLD_TIME+RAMP_TIME);
        if (this.lamp !== undefined && this.lamp_enabled)
            this.lamp.classList.add("light");

        this.is_on = true;
    }

    off() {
        if (!this.is_on)
            return;
        if (this.audio_ctx === undefined)
            return;
        this.gain.gain.setValueAtTime(this._volume, this.audio_ctx.currentTime+HOLD_TIME);
        this.gain.gain.linearRampToValueAtTime(0, this.audio_ctx.currentTime+HOLD_TIME+RAMP_TIME);
        if (this.lamp !== undefined)
            this.lamp.classList.remove("light");

        this.is_on = false;
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

function bind_enable_light(audio, enable_light_checkbox) {
    if (localStorage.getItem("enable_light") != null) {
        audio.set_light_enabled(+localStorage.getItem("enable_light"));
        enable_light_checkbox.checked = localStorage.getItem("enable_light");
    } else {
        audio.set_light_enabled(0);
    }

    enable_light_checkbox.addEventListener("change", e => {
        audio.set_light_enabled(+enable_light_checkbox.checked);
        localStorage.setItem("enable_light", +enable_light_checkbox.checked);
    });
}

function bind_frequency_input(audio, freq_inp) {
    if (localStorage.getItem("freq") != null) {
        audio.set_freq(+localStorage.getItem("freq"));
        freq_inp.value = localStorage.getItem("freq");
    } else {
        audio.set_freq(+freq_inp.value);
    }

    freq_inp.addEventListener("change", e => {
        audio.set_freq(+freq_inp.value);
        localStorage.setItem("freq", freq_inp.value);
    });
}

class SelectionHandler {
    // play_start(text, start, end)
    // on_play_end()
    // on_play_letter(idx)
    constructor(audio, text_field, play_button, stop_button, on_play_start, on_play_end, on_play_letter) {
        this.audio = audio;

        this.text_field = text_field;
        this.play_button = play_button;
        this.stop_button = stop_button;


        this.on_play_start = on_play_start;
        this.on_play_end = on_play_end;
        this.on_play_letter = on_play_letter;

        this.selection_offset = null;

        let self = this;

        audio.on_play_ends.push(() => self.on_play_end());
        audio.on_play_letters.push((idx) => {
            self.on_play_letter(idx + self.selection_offset)
        });

        this.play_button.addEventListener("click", () => self.play());
        this.stop_button.addEventListener("click", () => self.stop());
        setInterval(() => self.check(), 10);

        this.last_selection = this.get_selection();
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

        this.selection_offset = this.last_selection["start"];

        this.audio.play(this.last_selection["text"]);

        this.on_play_start(this.last_selection["text"], this.last_selection["start"], this.last_selection["end"]);

        this.last_selection = null;
        this.stop_button.classList.add("active");
    }

    stop() {
        this.audio.stop();
        this.stop_button.classList.remove("active");
    }
}

function hue2rgb(hue) {
    let theta = 2 * Math.PI * hue;
    let r = Math.cos(theta);
    let g = Math.cos(theta + 2 * Math.PI / 3);
    let b = Math.cos(theta + 2 * 2 * Math.PI / 3);
    return [(r + 1) / 2, (g + 1) / 2, (b + 1) / 2];
}

class Fireworks {
    constructor(canvas_element) {
        this.canvas_element = canvas_element;
        this.ctx = this.canvas_element.getContext("2d");

        let self = this;

        this.particles = [];
        for (let i = 0; i < 10; i++) {
            let x = Math.random() * this.canvas_element.offsetWidth;
            let y = Math.random() * this.canvas_element.offsetHeight;

            this.particles.push([x, y, (Math.random() - 0.5) * 50, -50, Math.random(), 2, 0.2 + 0.5 * Math.random()]);
        }
        this.gravity = 40;
        this.dt = 0.01;
        this.render_internal = setInterval(() => self.render(), this.dt * 1000);
    }

    render() {
        this.canvas_element.width = this.canvas_element.offsetWidth;
        this.canvas_element.height = this.canvas_element.offsetHeight;

        this.ctx.clearRect(0, 0, this.canvas_element.width, this.canvas_element.height);

        let new_particles = [];
        for (let particle of this.particles) {
            let x = particle[0];
            let y = particle[1];
            let vx = particle[2];
            let vy = particle[3];
            let hue = particle[4];
            let count = particle[5];
            let timeLeft = particle[6];

            x += vx * this.dt;
            y += vy * this.dt;
            vy += this.gravity * this.dt;

            timeLeft -= this.dt;

            this.ctx.lineWidth = 2;

            let [r, g, b] = hue2rgb(particle[4]);
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgb(${256*r}, ${256*g}, ${256*b})`;
            this.ctx.lineWidth = count + 1;
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + vx * 0.1 * (count + 1), y + vy * 0.1 * (count + 1));
            this.ctx.stroke();

            particle[0] = x;
            particle[1] = y;
            particle[2] = vx;
            particle[3] = vy;
            particle[4] = hue;
            particle[5] = count;
            particle[6] = timeLeft;
            if (timeLeft > 0) {
                if (x > 0 && x < this.canvas_element.width && y > 0 && y < this.canvas_element.height)
                    new_particles.push(particle);
            } else if (count > 0) {
                for (let i = 0; i < 20;  i++) {
                    let u = Math.random();
                    let v = Math.random();

                    let z1 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                    let z2 = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);

                    let child_hue = hue + Math.random() / 5;

                    this.particles.push([x, y, z1 * 40, z2 * 40, child_hue, count - 1, Math.random()]);
                }
            }
        }
        this.particles = new_particles;

        if (this.particles.length == 0) {
            this.destroy();
        }
    }

    destroy() {
        this.canvas_element.remove();
        clearInterval(this.render_internal);
    }
}

function make_fireworks() {
    let fireworks_element = document.createElement("canvas");
    fireworks_element.classList.add("fireworks");

    document.getElementById("main-split").append(fireworks_element);

    return new Fireworks(fireworks_element);
}

// shamelessly stolen from https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript#comment111181647_8831937
function strhash(st) {
    return Array.from(st).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0);
}

function normalized(arr) {
    let total = 0;
    for (let item of arr)
        total += item;
    return arr.map(x => x / total);
}

function weighted_pick(arr) {
    arr = normalized(arr);
    let x = Math.random();
    for (let i = 0; i < arr.length; i++) {
        x -= arr[i];
        if (x < 0)
            return i;
    }
    console.log("OH NO");
    return arr.length - 1;
}


const MINIMUM_MARKOV_LENGTH = 20;
class MarkovGenerator {
    constructor() {
        this.symbols = [];
        this.forward = [];
        this.backward = [];
        this.initial = [];

        // Invariant: must always contain space
        this.subset = []; // contains numbers indexing this.symbols
    }

    get_subset(arr) {
        return this.subset.map(i => arr[i]);
    }

    async load() {
        let self = this;

        await fetch("data/markov.json", {
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(data =>
            data.json()
        ).then(data => {
            self.symbols = data["symbols"];
            self.forward = data["forward"];
            self.backward = data["backward"];
            self.initial = data["initial"];

            self.subset = [self.symbols.indexOf(" ")];
        });
    }

    toggle(letter) {
        if (!this.symbols.includes(letter))
            return;

        let idx = this.symbols.indexOf(letter);
        if (this.subset.includes(idx)) {
            this.subset = this.subset.filter(a => a != idx);
        } else {
            this.subset.push(idx);
        }
    }

    has_letter(l) {
        return this.get_subset(this.symbols).includes(l);
    }

    is_on() {
        return this.subset.length > 1;
    }

    _terminates(i) {
        return this.symbols[this.subset[i]] == " ";
    }

    _generate_letter() {
        for (let i = 0; i < 10; i++) {
            let init = this.get_subset(this.initial);
            let letter = weighted_pick(init);
            if (this._terminates(letter))
                continue;
            return letter;
        }
        return 0;
    }

    _generate_word(containing_letter) {
        let after = [];
        let last_ch = containing_letter;
        for (let i = 0; i < 10; i++) {
            let weights = this.get_subset(this.get_subset(this.forward)[last_ch]);
            let pick = weighted_pick(weights);
            if (this._terminates(pick))
                break;

            after.push(pick);
            last_ch = pick;
        }

        let before = [];
        last_ch = containing_letter;
        for (let i = 0; i < 10; i++) {
            let weights = this.get_subset(this.get_subset(this.backward)[last_ch]);
            let pick = weighted_pick(weights);
            if (this._terminates(pick))
                break;

            before.push(pick);
            last_ch = pick;
        }
        return before.reverse().concat([containing_letter]).concat(after);
    }

    _generate_text() {
        let self = this;

        let text = [];

        let letters_left = [...Array(this.subset.length).keys()];

        letters_left = letters_left.filter(l => !self._terminates(l));

        while (letters_left.length > 0) {
            let idx = 0 | (Math.random() * letters_left.length);
            let letter = letters_left[idx];
            let w = this._generate_word(letter);

            letters_left = letters_left.filter(l => !w.includes(l));
            text.push(...w);
            text.push(this.get_subset(this.symbols).indexOf(" "));
        }

        while (text.length < MINIMUM_MARKOV_LENGTH) {
            let idx = 0 | (Math.random() * this.subset.length);
            let w = this._generate_word(idx);

            text.push(...w);
            text.push(this.get_subset(this.symbols).indexOf(" "));
        }

        return text.slice(0, text.length - 1);
    }

    symbolize(seq) {
        let self = this;
        return seq.map(a => this.symbols[this.subset[a]]).join("");
    }

    matches(subset) {
        let subset_sorted = new Array(...subset).sort();
        let me = this.get_subset(this.symbols).filter(x => x != " ").slice().sort();
        return subset_sorted.join("") == me.join("");
    }
}

const PRESETS = [
    {"id": "quotes", "name": "Quotes", "subset": ""},
    null,
    {"id": "k10",  "name":  "Koch 10%", "subset": "KMRS"},
    {"id": "k20",  "name":  "Koch 20%", "subset": "KMRSAUPT"},
    {"id": "k30",  "name":  "Koch 30%", "subset": "KMRSAUPTLOWI"},
    {"id": "k40",  "name":  "Koch 40%", "subset": "KMRSAUPTLOWI.NJE"},
    {"id": "k50",  "name":  "Koch 50%", "subset": "KMRSAUPTLOWI.NJEF0YV"},
    {"id": "k60",  "name":  "Koch 60%", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q"},
    {"id": "k70",  "name":  "Koch 70%", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH3"},
    {"id": "k80",  "name":  "Koch 80%", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B42"},
    {"id": "k90",  "name":  "Koch 90%", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B427C1D"},
    {"id": "k100", "name": "Koch 100%", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B427C1D6X?!"},
    null,
    {"id": "vow", "name": "Vowels", "subset": "AOEUIY"},
    {"id": "cons", "name": "Consonants", "subset": "PFGCRLDHTNSQJKXBMWVZ"},
    {"id": "nums", "name": "Numbers", "subset": "0123456789"},
    {"id": "punct", "name": "Punctuation", "subset": ",.!?"},
    null,
    {"id": "a", "name": "A's (·–)", "subset": "AJLPRW"},
    {"id": "i", "name": "I's (··)", "subset": "FHISUV"},
    {"id": "i", "name": "N's (–·)", "subset": "BCDKNXY"},
    {"id": "i", "name": "M's (––)", "subset": "MOGQZ"},
];

class SentenceLoader {
    constructor(on_new_sentence) {
        this.current_sentence = null;
        this.author = null;
        this.quotes = [];

        this.markov = new MarkovGenerator();

        this.table_elems = [];

        this.on_new_sentence = on_new_sentence;
    }

    load_markov_subset() {
        let subset = localStorage.getItem("subset");
        if (subset == null)
            return;

        this.markov.subset = subset.split("|").map(x => +x);

        if (this.markov.is_on()) {
            this.select_new();
        }
        this.redraw_table();
    }

    store_markov_subset() {
        localStorage.setItem("subset", this.markov.subset.map(x => "" + x).join("|"));
    }

    async load() {
        let self = this;

        await fetch("data/quotes.json", {
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(data =>
            data.json()
        ).then(data => {
            self.quotes = data;
            self.select_new();

        });

        await this.markov.load();
        this.load_markov_subset();
    }

    get_available_quotes() {
        let available_quotes = [];

        let hashes = localStorage.getItem("completed-hashes") || "";
        for (let quote of this.quotes) {
            let hash = strhash(quote["quote"]);
            if (!hashes.includes("/" + hash.toString() + "/")) {
                available_quotes.push(quote);
            }
        }

        return available_quotes;
    }

    completed() {
        if (this.current_sentence != null && this.author != null) {
            let current_hashes = localStorage.getItem("completed-hashes") || "/";
            let new_hashes = current_hashes + strhash(this.current_sentence).toString() + "/";
            localStorage.setItem("completed-hashes", new_hashes);
        }
    }

    select_new() {
        if (this.markov.is_on()) {
            this.current_sentence = this.markov.symbolize(this.markov._generate_text());
            this.author = null;
        } else {
            let available = this.get_available_quotes();
            if (available.length == 0) {
                // TODO: Alert user!
                localStorage.removeItem("completed-hashes");
                available = this.quotes;
            }

            let quote = available[0|Math.random()*available.length];
            this.current_sentence = quote["quote"];
            this.author = quote["author"];
        }

        this.on_new_sentence();
    }

    register_table_click(el, morse_data) {
        this.table_elems.push([el, morse_data[0]]);

        let self = this;
        el.addEventListener("click", e => {
            self.markov.toggle(morse_data[0]);
            self.redraw_table();
            self.store_markov_subset();
        });
    }

    redraw_table() {
        if (this.markov.is_on()) {
            for (let [el, letter] of this.table_elems) {
                if (this.markov.has_letter(letter)) {
                    el.classList.remove("morse-inactive");
                } else {
                    el.classList.add("morse-inactive");
                }
            }
        } else {
            for (let [el, letter] of this.table_elems) {
                el.classList.remove("morse-inactive");
            }
        }
    }

    load_presets(el) {
        let children = [];

        let found_match = false;
        for (let preset of PRESETS) {
            if (preset == null) {
                let brk = document.createElement("option");
                brk.disabled = true;
                brk.innerText = "—";
                children.push(brk);
                continue;
            }

            let option = document.createElement("option");
            option.value = preset["id"];
            option.innerText = preset["name"];

            if (this.markov.matches(preset["subset"])) {
                found_match = true;
                option.selected = true;
            }

            children.push(option);
        }
        if (!found_match) {
            let brk = document.createElement("option");
            brk.disabled = true;
            brk.innerText = "Custom";
            brk.selected = true;
            children.push(brk);
        }
        el.replaceChildren(...children);

        let self = this;
        el.addEventListener("change", e => {
            let chosen = el.value;
            for (let preset of PRESETS) {
                if (preset == null)
                    continue;
                if (preset["id"] == chosen) {
                    self.markov.subset = new Array(...preset["subset"]).map(x => self.markov.symbols.indexOf(x));
                    self.markov.subset.push(self.markov.symbols.indexOf(" "));

                    self.store_markov_subset();
                    self.redraw_table();

                    self.select_new();

                    return;
                }
            }
            console.log("unknown value??");
            console.log(chosen);
        });
    }
}
