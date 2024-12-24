window.onload = function () {
    var commitDy, commitDx, lastX, lastY;
    var love = document.getElementById("heart");
    var friction = 0.005,
        dx = 0,
        dy = 0,
        drag = false;
    var finger = null;

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function foreach(query, fn) {
        var elements = document.querySelectorAll(query);
        for (var i = 0; i < elements.length; i++) {
            fn(elements[i], i);
        }
    }

    function findFinger(touchList, id) {
        for (var i = 0; i < touchList.length; i++) {
            if (touchList[i].identifier === id) return touchList[i];
        }
        return null;
    }

    function onMouseDown(e) {
        if (drag) return;
        drag = true;
        dx = dy = commitDx = commitDy = 0;
        love.style.position = "fixed";
        // disable text selection when dragging since its distracting
        foreach("*", function (el) {
            el.style.userSelect = "none";
        });

        if (e instanceof TouchEvent)
            finger = e.targetTouches[0].identifier;
    }

    function onMouseMove(e) {
        if (!drag) return;
        if (e instanceof TouchEvent) {
            e.preventDefault();
            e = findFinger(e.touches, finger);
            if (!e) return;
        }
        var loveBox = love.getBoundingClientRect();
        // center the heart around the cursor
        love.style.left = clamp(Math.round(e.clientX - loveBox.width / 2), 0, window.innerWidth - loveBox.width) + "px";
        love.style.top = clamp(Math.round(e.clientY - loveBox.height / 2), 0, window.innerHeight - loveBox.height) + "px";
        // calculate velocity
        commitDx = (e.clientX - lastX) / window.innerWidth;
        commitDy = (e.clientY - lastY) / window.innerHeight;
        lastX = e.clientX;
        lastY = e.clientY;
    }

    function onMouseUp(e) {
        if (!drag) return;
        if (e instanceof TouchEvent) {
            e = findFinger(e.changedTouches, finger);
            if (!e) return;
        }
        drag = false;
        dx = commitDx;
        dy = commitDy;
        foreach("*", function (el) {
            el.style.userSelect = "auto";
        });
    }

    var shellUrl = document.getElementById('shell');
    var urlNew = document.getElementById('new');
    setInterval(() => {
        shellUrl.classList.toggle('pseudohover');
        urlNew.classList.toggle('show');
    }, 3500);

    love.addEventListener('mousedown', onMouseDown);
    love.addEventListener('touchstart', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('mouseleave', onMouseUp);

    setTimeout(function () {
        dx = dy = -0.09; // initial speed
        love.style.position = "fixed";
        setInterval(function () {
            if (drag) return;
            var vw = window.innerWidth,
                vh = window.innerHeight;
            var loveBox = love.getBoundingClientRect();
            var realDy = vh * dy,
                realDx = vw * dx;
            loveBox.x += realDx;
            loveBox.right += realDx;
            loveBox.y += realDy;
            loveBox.bottom += realDy;
            dx = Math.trunc((dx - (dx > 0 ? Math.min : Math.max)(dx, dx * friction)) * 1000) / 1000;
            dy = Math.trunc((dy - (dy > 0 ? Math.min : Math.max)(dy, dy * friction)) * 1000) / 1000;
            if (loveBox.right >= vw || loveBox.x <= 0) {
                dx = -dx;
                loveBox.x = clamp(loveBox.x, 0, vw - loveBox.width);
            }
            if (loveBox.bottom >= vh || loveBox.y <= 0) {
                dy = -dy;
                loveBox.y = clamp(loveBox.y, 0, vh - loveBox.height);
            }
            love.style.left = Math.round(loveBox.x) + "px";
            love.style.top = Math.round(loveBox.y) + "px";
        }, 1 / 60 * 1000);
    }, 5000);
}
