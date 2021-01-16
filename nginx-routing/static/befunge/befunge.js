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
        this.stack = [];
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
            console.log(sxy)
            let xy = JSON.parse(`[${sxy}]`);
            xmin = Math.min(xmin, xy[0]);
            ymin = Math.min(ymin, xy[1]);
            xmax = Math.max(xmax, xy[0]);
            ymax = Math.max(ymax, xy[1]);
        }
        return [xmin, ymin, xmax+1, ymax+1];
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
        stack.scrollLeft= scrollLeft;
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

b.set_tile(0, 0, '"');
b.set_tile(1, 0, 'o');
b.set_tile(2, 0, 'l');
b.set_tile(3, 0, 'l');
b.set_tile(4, 0, 'e');
b.set_tile(5, 0, 'H');
b.set_tile(6, 0, '"');
b.set_tile(7, 0, 'v');

b.set_tile(0, 1, '@');
b.set_tile(1, 1, ',');
b.set_tile(2, 1, ',');
b.set_tile(3, 1, ',');
b.set_tile(4, 1, ',');
b.set_tile(5, 1, ',');
b.set_tile(6, 1, ',');
b.set_tile(7, 1, '<');

for (var i = 0; i < 100; i++) {
    b.stack.push(i);
}
b.render_field(document.getElementById("playfield"));
b.render_stack(document.getElementById("stack"));
