window.onload = function () {
    var love = document.getElementById("heart");
    var friction = 0.0005, dx = 0, dy = 0, drag = false;
    var commitDy, commitDx, lastX, lastY;
    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
    setTimeout(function () {
        dx = dy = -0.09; // initial speed
        love.style.position = "fixed";
        setInterval(function () {
            if (drag) return;
            var vw = window.innerWidth, vh = window.innerHeight;
            var loveBox = love.getBoundingClientRect();
            var realDy = vh * dy, realDx = vw * dx;
            loveBox.x += realDx; loveBox.right += realDx;
            loveBox.y += realDy; loveBox.bottom += realDy;
            dx = Math.trunc((dx - (dx > 0 ? Math.min : Math.max)(dx, dx * friction)) * 1000) / 1000;
            dy = Math.trunc((dy - (dy > 0 ? Math.min : Math.max)(dy, dy * friction)) * 1000) / 1000;
            if (loveBox.right >= vw || loveBox.x <= 0) { dx = -dx; loveBox.x = clamp(loveBox.x, 0, vw - loveBox.width); }
            if (loveBox.bottom >= vh || loveBox.y <= 0) { dy = -dy; loveBox.y = clamp(loveBox.y, 0, vh - loveBox.height); }
            love.style.left = Math.round(loveBox.x) + "px";
            love.style.top = Math.round(loveBox.y) + "px";
        }, 1 / 60 * 1000);
    }, 5000);
    function forAllElements(query, fn) {
        var elements = document.querySelectorAll(query);
        for (var i = 0; i < elements.length; i++) { fn(elements[i], i); }
    }
    love.onmousedown = function (e) {
        drag = true;
        dx = dy = commitDx = commitDy = 0;
        love.style.position = "fixed";
        forAllElements("*", function (el) { el.style.userSelect = "none"; });
    }
    window.onmousemove = function (e) {
        if (!drag) return;
        var loveBox = love.getBoundingClientRect();
        love.style.left = clamp(Math.round(e.clientX - loveBox.width / 2), 0, window.innerWidth - loveBox.width) + "px";
        love.style.top = clamp(Math.round(e.clientY - loveBox.height / 2), 0, window.innerHeight - loveBox.height) + "px";
        commitDx = (e.clientX - lastX) / window.innerWidth;
        commitDy = (e.clientY - lastY) / window.innerHeight;
        lastX = e.clientX; lastY = e.clientY;
    }
    window.onmouseup = function (e) {
        if (!drag) return;
        drag = false;
        dx = commitDx; dy = commitDy;
        forAllElements("*", function (el) { el.style.userSelect = "auto"; });
    }
}