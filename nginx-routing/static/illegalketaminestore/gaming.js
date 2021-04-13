sussy = document.getElementById("sussy");
marker = document.getElementById("marker");
over = document.getElementById("over");

sussy.addEventListener("load", () => {
    marker.width = sussy.width;
    marker.height = sussy.height;
    over.width = sussy.width;
    over.height = sussy.height;
});

size = 50;

ctx = marker.getContext("2d");
ctxm = over.getContext("2d");

var is_clicking = false;

marker.addEventListener("mousedown", e => {
    is_clicking = 'left';
    if (e.buttons == 2) {
        is_clicking = 'right';
    }
});
marker.addEventListener("mouseup", e => {
    is_clicking = false;
    lastxy = null;
});
marker.addEventListener("mouseleave", e => {
    is_clicking = false;
    lastxy = null;
});

marker.addEventListener("contextmenu", e => {
    e.preventDefault();
});

let lastxy = null;

marker.addEventListener("mousemove", e => {
    ctxm.clearRect(0, 0, over.width, over.height);
    ctxm.beginPath();
    ctxm.strokeStyle = "black";
    ctxm.arc(e.layerX, e.layerY, size, 0, 6.28);
    ctxm.stroke();

    if (!is_clicking) return;
    ctx.beginPath();
    if (is_clicking == "right") {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = "blue";

    ctx.arc(e.layerX, e.layerY, size, 0, 6.28);
    if (lastxy !== null) {
        let x = lastxy[0];
        let y = lastxy[1];
        let dx = e.layerX - x;
        let dy = e.layerY - y;

        let n = Math.max(Math.abs(dx), Math.abs(dy));

        for (let i = 0; i < n; i++) {
            let a = i / n;

            let xx = x + a * dx;
            let yy = y + a * dy;
            ctx.arc(xx, yy, size, 0, 6.28);
        }
    }
    lastxy = [e.layerX, e.layerY];

    ctx.fill();

});

