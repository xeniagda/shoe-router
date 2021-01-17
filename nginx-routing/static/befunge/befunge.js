direction_names = ["up", "right", "down", "left"];
direction_arrows = {"^": 0, ">": 1, "v": 2, "<": 3};
direction_deltaxys = [[0, -1], [1, 0], [0, 1], [-1, 0]];

class Befunge {
    constructor() {
        this.ip = [0, 0]; // [x, y]
        this.direction = 1;
        this.grid = {}; // {"x,y": ch}.
        // I want to do ^ like {[x, y]: ch}, but objects don't support anything other than strings
        // as keys. Using a Map won't work either, as arrays are compared by reference, not by
        // content.
        this.in_string = false;
        this.is_running = true;
        this.stack = [];
        this.output = "";

        this.cursor = null; // [x, y, dir] or null. current editing cell
    }
    set_tile(x, y, tile) {
        if (tile == " ") {
            delete this.grid[""+[x,y]];
        } else {
            this.grid[""+[x, y]] = tile;
        }
    }
    get_tile(x, y) {
        let key = [""+[x, y]];
        if (this.grid[key] === undefined) {
            return " ";
        } else {
            return this.grid[""+[x, y]];
        }
    }
    get_bounds() {
        var xmin = Infinity;
        var ymin = Infinity;
        var xmax = -Infinity;
        var ymax = -Infinity;
        function reminmax(xy) {
            if (xy == null) { return; }
            xmin = Math.min(xmin, xy[0]);
            ymin = Math.min(ymin, xy[1]);
            xmax = Math.max(xmax, xy[0]);
            ymax = Math.max(ymax, xy[1]);
        }
        for (const sxy in this.grid) {
            let xy = JSON.parse(`[${sxy}]`);
            reminmax(xy);
        }
        reminmax(this.ip);
        reminmax(this.cursor);
        return [xmin - 1, ymin - 1, xmax + 2, ymax + 2];
    }

    pop() {
        if (this.stack.length == 0) {
            return 0;
        } else {
            return this.stack.pop();
        }
    }
    push(x) {
        this.stack.push(x);
    }

    run_command(ch) {
        if (!this.is_running) { return; }
        if (this.in_string) {
            if (ch == '"') {
                this.in_string = false;
            } else {
                this.stack.push(ch.charCodeAt(0));
            }
        } else {
            switch (ch) {
                case "+": this.push(this.pop() + this.pop()); break;
                case "-":
                    var a = this.pop();
                    var b = this.pop();
                    this.push(b - a);
                    break;
                case "*": this.push(this.pop() * this.pop()); break;
                case "/":
                    var a = this.pop();
                    var b = this.pop();
                    this.push(0 | b / a);
                    break;
                case "%":
                    var a = this.pop();
                    var b = this.pop();
                    this.push(b % a);
                    break;
                case "!": this.push(!this.pop()); break;
                case "`":
                    var a = this.pop();
                    var b = this.pop();
                    this.push(b > a);
                    break;
                case "<":
                case ">":
                case "^":
                case "v":
                    this.direction = direction_arrows[ch];
                    break;
                case "?": this.direction = 0 | 4 * Math.random(); break;
                case "_":
                    if (this.pop() == 0) { this.direction = 1 }
                    else { this.direction = 3 };
                    break;
                case "|":
                    if (this.pop() == 0) { this.direction = 2 }
                    else { this.direction = 0 };
                    break;
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                    this.push(JSON.parse(ch));
                    break;
                case '"': this.in_string = true; break;
                case ':':
                    var x = this.pop();
                    this.push(x); this.push(x);
                    break;
                case "\\":
                    var a = this.pop();
                    var b = this.pop();
                    this.push(a);
                    this.push(b);
                    break;
                case "$":
                    this.pop();
                    break;
                case ".":
                    this.output += this.pop();
                    break;
                case ",": this.output += String.fromCharCode(this.pop()); break;
                case "#":
                    let deltaxy = direction_deltaxys[this.direction];
                    this.ip[0] += deltaxy[0];
                    this.ip[1] += deltaxy[1];
                    break;
                case "g":
                case "p":
                    // TODO
                    break;

                case "@": this.is_running = false; return;
            }
        }
        let deltaxy = direction_deltaxys[this.direction];
        this.ip[0] += deltaxy[0];
        this.ip[1] += deltaxy[1];
    }

    step() {
        this.run_command(this.get_tile(this.ip[0], this.ip[1]));
    }

    render_stack(stack) {
        let scrollLeft = stack.scrollLeft; // preserve
        stack.innerHTML = "";
        stack.id = "stack";
        for (var thing of this.stack.slice().reverse()) {
            var thingItem = document.createElement("div");
            thingItem.classList.add("stackitem");
            thingItem.innerText = thing;
            stack.appendChild(thingItem);
        }
        stack.scrollLeft = scrollLeft;
    }
    render_info(info) {
        info.innerHTML = "";
        var output = document.createElement("p");
        output.innerText = "Output: " + this.output;
        info.appendChild(output);
        var other_stuff = document.createElement("p");
        other_stuff.innerText = "Running? " + (this.is_running ? "yes" : "no");
        info.appendChild(other_stuff);
    }
    render_field(field) {
        field.innerHTML = "";
        const [xmin, ymin, xmax, ymax] = this.get_bounds();

        var head_row = document.createElement("tr");
        var topleft = document.createElement("td");
        topleft.innerText = "🍄";
        head_row.appendChild(topleft);
        for (var x = xmin; x < xmax; x++) {
            var idx = document.createElement("td");
            idx.classList.add("row");
            if (x == this.ip[0]) {
                idx.classList.add("ip-active");
            }
            idx.innerText = x + "";
            head_row.appendChild(idx);
        }
        field.appendChild(head_row);
        for (var y = ymin; y < ymax; y++) {
            var row = document.createElement("tr");
            var idx = document.createElement("td");
            idx.classList.add("line");
            if (y == this.ip[1]) {
                idx.classList.add("ip-active");
            }
            idx.innerText = y + "";
            row.appendChild(idx);

            for (var x = xmin; x < xmax; x++) {
                let ch = this.get_tile(x, y);
                var tile = document.createElement("td");
                tile.innerText = ch;
                var cursored = false;
                if (this.cursor !== null && (x == this.cursor[0] && y == this.cursor[1])) {
                    tile.classList.add("cursor");
                    tile.classList.add(direction_names[this.cursor[2]]);
                    cursored = true;
                }
                if (x == this.ip[0] && y == this.ip[1] && !cursored) {
                    tile.id = "ip";
                    tile.classList.add(direction_names[this.direction]);
                }
                let xy = [x, y];
                let self = this;
                tile.addEventListener("click", function(e) {
                    console.log(self);
                    self.cursor = [xy[0], xy[1], 1];
                    self.redraw();
                    e.stopPropagation();
                });
                row.appendChild(tile);
            }
            field.appendChild(row);
        }
        field.focus();
    }
    redraw() {
        this.render_field(document.getElementById("playfield"));
        this.render_stack(document.getElementById("stack"));
        this.render_info(document.getElementById("info"));

        window.localStorage.setItem("saved_grid", JSON.stringify(this.grid));
    }
    render_to_text() {
        var out = "";
        const [xmin, ymin, xmax, ymax] = this.get_bounds();
        for (var y = 0; y < ymax; y++) {
            for (var x = 0; x < xmax; x++) {
                let ch = this.get_tile(x, y);
                out += ch;
            }
            out += "\n";
        }
        return out;
    }
    keydownhandler(e) {
        if (this.cursor === null) {
            return;
        }
        if (e.keyCode == 8) { // backspace
            e.preventDefault();
            let deltaxy = direction_deltaxys[this.cursor[2]];
            this.cursor[0] -= deltaxy[0];
            this.cursor[1] -= deltaxy[1];
            this.set_tile(this.cursor[0], this.cursor[1], " ");
            this.redraw();
        }
        if (37 <= e.keyCode && e.keyCode < 41) { // arrow keys
            e.preventDefault();
            this.cursor[2] = (e.keyCode - 34) % 4;
            let deltaxy = direction_deltaxys[this.cursor[2]];
            if (!e.shiftKey) {
                this.cursor[0] += deltaxy[0];
                this.cursor[1] += deltaxy[1];
            }
            this.redraw();
        }
    }
    keypresshandler(e) {
        if (this.cursor === null) {
            return;
        }
        this.set_tile(this.cursor[0], this.cursor[1], e.key);
        if (direction_arrows[e.key] !== undefined) {
            this.cursor[2] = direction_arrows[e.key];
        }
        let deltaxy = direction_deltaxys[this.cursor[2]];
        this.cursor[0] += deltaxy[0];
        this.cursor[1] += deltaxy[1];
        this.redraw();
    }
}

b = new Befunge();
if (window.localStorage.getItem("saved_grid") !== null) {
    b.grid = JSON.parse(window.localStorage.getItem("saved_grid"));
}

document.body.onkeydown = e => b.keydownhandler(e);
document.body.onkeypress = e => b.keypresshandler(e);
document.body.onclick = e => { b.cursor = null; b.redraw(); };

b.redraw();

function pop_the_up() {
    var popup = document.getElementById("popup");
    popup.style = "";
    var code = document.getElementById("code-raw");
    code.value = b.render_to_text();
}
function unpop_the_up() {
    var popup = document.getElementById("popup");
    popup.style = "display: none;";
    var code = document.getElementById("code-raw");
    b.grid = {};
    var x = 0;
    var y = 0;
    for (ch of code.value) {
        if (ch == "\n") {
            x = 0;
            y++;
        } else {
            b.set_tile(x, y, ch);
            x++;
        }
    }
    b.redraw();
}
