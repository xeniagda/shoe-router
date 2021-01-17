direction_names = ["up", "right", "down", "left"];
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
    }
    set_tile(x, y, tile) {
        this.grid[""+[x, y]] = tile;
    }
    get_tile(x, y) {
        return this.grid[""+[x, y]];
    }
    get_bounds() {
        var xmin = Infinity;
        var ymin = Infinity;
        var xmax = -Infinity;
        var ymax = -Infinity;
        for (const sxy in this.grid) {
            let xy = JSON.parse(`[${sxy}]`);
            xmin = Math.min(xmin, xy[0]);
            ymin = Math.min(ymin, xy[1]);
            xmax = Math.max(xmax, xy[0]);
            ymax = Math.max(ymax, xy[1]);
        }
        return [xmin, ymin, xmax+1, ymax+1];
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
                    this.direction = "^>v<".indexOf(ch);
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
                if (x == this.ip[0] && y == this.ip[1]) {
                    tile.id = "ip";
                    tile.classList.add(direction_names[this.direction]);
                }
                row.appendChild(tile);
            }
            field.appendChild(row);
        }
    }
}

b = new Befunge();

b.set_tile(0, 0, 'v');
b.set_tile(1, 0, '>');
b.set_tile(2, 0, '1');
b.set_tile(3, 0, 'v');
b.set_tile(4, 0, ' ');
b.set_tile(5, 0, ' ');
b.set_tile(6, 0, ' ');
b.set_tile(7, 0, ' ');

b.set_tile(0, 1, '>');
b.set_tile(1, 1, '?');
b.set_tile(2, 1, '<');
b.set_tile(3, 1, '>');
b.set_tile(4, 1, ':');
b.set_tile(5, 1, '|');
b.set_tile(6, 1, ' ');
b.set_tile(7, 1, ' ');

b.set_tile(0, 2, ' ');
b.set_tile(1, 2, '>');
b.set_tile(2, 2, '0');
b.set_tile(3, 2, '^');
b.set_tile(4, 2, ' ');
b.set_tile(5, 2, ' ');
b.set_tile(6, 2, ' ');
b.set_tile(7, 2, ' ');

function render() {
    b.render_field(document.getElementById("playfield"));
    b.render_stack(document.getElementById("stack"));
    b.render_info(document.getElementById("info"));
}
render();
