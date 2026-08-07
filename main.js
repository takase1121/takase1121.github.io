window.onload = function () {
    var love = document.getElementById("heart");
    if (!love) return;

    // Physics State
    var x = window.innerWidth / 2;
    var y = window.innerHeight / 2;
    var vx = -5; // Initial horizontal velocity (px/frame)
    var vy = -5; // Initial vertical velocity (px/frame)
    
    // Physics Parameters
    var friction = 0.946;  // Velocity multiplier per frame (0.985 = air resistance)
    var bounce = 0.6;      // Coefficient of restitution (energy retained on bounce)
    var minVelocity = 0.05; // Stop threshold to prevent infinite micro-movements
    
    // Interaction Tracking
    var drag = false;
    var fingerId = null;
    var lastX = 0, lastY = 0;
    var lastTime = 0;
    var moveVx = 0, moveVy = 0;


    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function getTouch(e, id) {
        for (var i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === id) return e.touches[i];
        }
        return null;
    }

    function getChangedTouch(e, id) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === id) return e.changedTouches[i];
        }
        return null;
    }

    function onPointerDown(e) {
        if (drag) return;

        var point = e;
        if (window.TouchEvent && e instanceof TouchEvent) {
            point = e.targetTouches[0];
            fingerId = point.identifier;
        }

        drag = true;
        vx = vy = 0;
        lastX = point.clientX;
        lastY = point.clientY;
        lastTime = performance.now();
        moveVx = moveVy = 0;

        document.body.style.userSelect = "none";
    }

    function onPointerMove(e) {
        if (!drag) return;

        var point = e;
        if (window.TouchEvent && e instanceof TouchEvent) {
            e.preventDefault(); // Prevent page scrolling during drag
            point = getTouch(e, fingerId);
            if (!point) return;
        }

        var now = performance.now();
        var dt = (now - lastTime) / 1000; // Convert to seconds

        if (dt > 0) {
            // Calculate real-time throwing velocity (px/s converted to px/frame equivalent)
            moveVx = (point.clientX - lastX) / (dt * 60);
            moveVy = (point.clientY - lastY) / (dt * 60);
        }

        lastX = point.clientX;
        lastY = point.clientY;
        lastTime = now;

        var rect = love.getBoundingClientRect();
        x = clamp(point.clientX - rect.width / 2, 0, window.innerWidth - rect.width);
        y = clamp(point.clientY - rect.height / 2, 0, window.innerHeight - rect.height);

        love.style.left = Math.round(x) + "px";
        love.style.top = Math.round(y) + "px";
    }

    function onPointerUp(e) {
        if (!drag) return;

        if (window.TouchEvent && e instanceof TouchEvent) {
            var point = getChangedTouch(e, fingerId);
            if (!point) return;
        }

        drag = false;
        fingerId = null;

        // Commit throw velocity
        vx = moveVx;
        vy = moveVy;

        document.body.style.userSelect = "auto";
    }

    // Toggle Animation Interval
    var shellUrl = document.getElementById('shell');
    var urlNew = document.getElementById('new');
    if (shellUrl && urlNew) {
        setInterval(function () {
            shellUrl.classList.toggle('pseudohover');
            urlNew.classList.toggle('show');
        }, 3500);
    }

    // Event Listeners
    love.addEventListener('mousedown', onPointerDown);
    love.addEventListener('touchstart', onPointerDown, { passive: false });
    
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);
    document.addEventListener('mouseleave', onPointerUp);

    // Main Physics Loop
    function physicsLoop() {
        if (!drag) {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var rect = love.getBoundingClientRect();
            var w = rect.width;
            var h = rect.height;

            // Apply position movement
            x += vx;
            y += vy;

            // Apply friction
            vx *= friction;
            vy *= friction;

            if (Math.abs(vx) < minVelocity) vx = 0;
            if (Math.abs(vy) < minVelocity) vy = 0;

            // Wall Collisions (Left / Right)
            if (x <= 0) {
                x = 0;
                vx = -vx * bounce;
            } else if (x + w >= vw) {
                x = vw - w;
                vx = -vx * bounce;
            }

            // Wall Collisions (Top / Bottom)
            if (y <= 0) {
                y = 0;
                vy = -vy * bounce;
            } else if (y + h >= vh) {
                y = vh - h;
                vy = -vy * bounce;
            }

            love.style.left = Math.round(x) + "px";
            love.style.top = Math.round(y) + "px";
        }

        requestAnimationFrame(physicsLoop);
    }

    // Start physics after 3 seconds delay
    setTimeout(function () {
        love.style.position = "fixed";
        var rect = love.getBoundingClientRect();
        x = rect.left;
        y = rect.top;
        requestAnimationFrame(physicsLoop);
    }, 3000);
};