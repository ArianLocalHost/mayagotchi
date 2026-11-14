/* =====================================================================
   MINIGAME.JS — "Food Drop": move the pet left/right to catch falling
   food and stars. Rocks take away points. Touch, mouse or arrow keys.
   ===================================================================== */

const Minigame = (() => {
  const W = 360;
  let H = 640, k = 1;
  let canvas, ctx, raf = 0, last = 0, running = false;
  let opts = null;
  let pet, items, fx, score, timeLeft, elapsed, spawnIn, keys = { l: false, r: false }, hurt = 0;
  let imgs = null;
  const $ = (id) => document.getElementById(id);

  function loadImg(src) { const i = new Image(); i.src = src; return i; }

  function loadImages() {
    imgs = {
      good: FOODS.map((f) => loadImg(Assets.food(f))),
      bg: loadImg(Assets.minigameBg()),
      star: loadImg(Assets.minigame("star")),
      rock: loadImg(Assets.minigame("rock"))
    };
  }

  /* ---------- open / close ---------- */
  // o = { height, scale, petHappy, petIdle, petSad, petScale, best, fmt, onFinish(score) -> {best, gained}, onClose() }
  // All words come from TEXT.minigame in js/texts.js
  const T = () => TEXT.minigame;
  function open(o) {
    opts = o;
    if (!imgs) loadImages();
    canvas = $("mg-canvas");
    ctx = canvas.getContext("2d");
    H = o.height;
    k = Math.min(3, o.scale * (window.devicePixelRatio || 1));
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    pet = { x: W / 2, target: W / 2, size: 135 * (0.75 + 0.25 * o.petScale),
            idle: loadImg(o.petIdle), happy: loadImg(o.petHappy), sad: loadImg(o.petSad), joy: 0 };
    items = []; fx = [];
    score = 0; timeLeft = GAME.minigameSeconds;
    $("minigame").classList.remove("hidden");
    $("mg-hud").classList.add("hidden");
    panel(T().title, o.fmt(T().intro) + "\n\n" + o.fmt(T().best, { best: o.best }), T().play);
    drawFrame();
    // redraw once the pictures have finished loading (first time only)
    [imgs.bg, pet.idle].forEach((im) => { if (!im.complete) im.onload = () => { if (!running) drawFrame(); }; });
  }

  function close() {
    stop();
    $("minigame").classList.add("hidden");
    if (opts && opts.onClose) opts.onClose();
  }

  function panel(title, text, startLabel) {
    $("mg-title").textContent = title;
    $("mg-text").textContent = text;
    $("mg-start").textContent = startLabel;
    $("mg-back").textContent = T().back;
    $("mg-panel").classList.remove("hidden");
  }

  /* ---------- game loop ---------- */
  function start() {
    Sound.play("click");
    $("mg-panel").classList.add("hidden");
    $("mg-hud").classList.remove("hidden");
    items = []; fx = []; score = 0; elapsed = 0; spawnIn = 0.3; hurt = 0;
    timeLeft = GAME.minigameSeconds;
    pet.x = pet.target = W / 2;
    updateHud();
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function finish() {
    stop();
    $("mg-hud").classList.add("hidden");
    Sound.play("end");
    const r = opts.onFinish(score);
    opts.best = r.best;
    panel(T().timeUp, opts.fmt(T().result, { score, best: r.best, gained: r.gained }), T().playAgain);
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt);
    drawFrame();
    if (timeLeft <= 0) return finish();
    raf = requestAnimationFrame(loop);
  }

  function groundY() { return H - GAME.minigameFloor; }

  function update(dt) {
    elapsed += dt;
    timeLeft -= dt;
    hurt = Math.max(0, hurt - dt);
    pet.joy = Math.max(0, pet.joy - dt);

    // movement: follow finger/mouse, or arrow keys
    if (keys.l) pet.target -= 380 * dt;
    if (keys.r) pet.target += 380 * dt;
    const half = pet.size * 0.4;
    pet.target = Math.max(half, Math.min(W - half, pet.target));
    pet.x += (pet.target - pet.x) * Math.min(1, dt * 14);

    // spawn
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = Math.max(0.38, 0.8 - elapsed * 0.013);
      const r = Math.random();
      const type = r < 0.22 ? "rock" : r < 0.37 ? "star" : "good";
      items.push({
        type, x: 24 + Math.random() * (W - 48), y: -30,
        vy: 160 + elapsed * 6 + Math.random() * 50, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 4,
        img: type === "good" ? imgs.good[Math.floor(Math.random() * imgs.good.length)] : imgs[type]
      });
    }

    // fall + catch
    const catchY = groundY() - pet.size * 0.55;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt;
      it.rot += it.spin * dt;
      if (it.y > catchY && it.y < catchY + 40 && Math.abs(it.x - pet.x) < pet.size * 0.45) {
        items.splice(i, 1);
        if (it.type === "rock") {
          score = Math.max(0, score - 2);
          hurt = 0.5;
          addFx(it.x, it.y, "-2", "#ff4d4d");
          Sound.play("bad");
        } else {
          const pts = it.type === "star" ? 2 : 1;
          score += pts;
          pet.joy = 0.35;
          addFx(it.x, it.y, "+" + pts, "#fff");
          Sound.play("catch");
        }
        updateHud();
      } else if (it.y > H + 40) {
        items.splice(i, 1);
      }
    }

    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].y -= 50 * dt;
      fx[i].life -= dt;
      if (fx[i].life <= 0) fx.splice(i, 1);
    }
    updateHud();
  }

  function addFx(x, y, text, color) { fx.push({ x, y, text, color, life: 0.8 }); }

  function updateHud() {
    $("mg-score").textContent = score;
    $("mg-time").textContent = Math.max(0, Math.ceil(timeLeft));
  }

  /* ---------- drawing ---------- */
  function drawImg(img, x, y, w, h) {
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h);
  }

  function drawFrame() {
    if (!ctx) return;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // background image, stretched to cover the screen and sitting on the bottom edge
    ctx.fillStyle = "#bdf0ff";
    ctx.fillRect(0, 0, W, H);
    const bg = imgs.bg;
    if (bg && bg.complete && bg.naturalWidth) {
      const sc = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
      const dw = bg.naturalWidth * sc, dh = bg.naturalHeight * sc;
      ctx.drawImage(bg, (W - dw) / 2, H - dh, dw, dh);
    }

    // items
    items.forEach((it) => {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      drawImg(it.img, -22, -22, 44, 44);
      ctx.restore();
    });

    // pet shadow + pet
    const s = pet.size;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(pet.x, groundY() + 2, s * 0.35, 8, 0, 0, Math.PI * 2); ctx.fill();
    const img = hurt > 0 ? pet.sad : pet.joy > 0 ? pet.happy : pet.idle;
    const squash = pet.joy > 0 ? 1.08 : 1;
    drawImg(img, pet.x - (s * squash) / 2, groundY() - s / squash + 4, s * squash, s / squash);

    // floating score text
    ctx.font = "800 28px Fredoka, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    fx.forEach((f) => {
      ctx.globalAlpha = Math.max(0, f.life / 0.8);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;

    if (hurt > 0) {
      ctx.fillStyle = `rgba(255,77,77,${hurt * 0.4})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- input ---------- */
  function pointer(e) {
    if (!running) return;
    const r = canvas.getBoundingClientRect();
    pet.target = ((e.clientX - r.left) / r.width) * W;
  }

  function bind() {
    const c = $("mg-canvas");
    c.addEventListener("pointerdown", (e) => { e.preventDefault(); pointer(e); });
    c.addEventListener("pointermove", pointer);
    $("mg-start").addEventListener("click", start);
    $("mg-back").addEventListener("click", () => { Sound.play("click"); close(); });
    $("mg-quit").addEventListener("click", () => {
      stop();
      $("mg-hud").classList.add("hidden");
      panel(T().title, T().stopped + "\n\n" + opts.fmt(T().best, { best: opts.best }), T().play);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") keys.l = true;
      if (e.key === "ArrowRight") keys.r = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft") keys.l = false;
      if (e.key === "ArrowRight") keys.r = false;
    });
  }

  document.addEventListener("DOMContentLoaded", bind);

  // dev panel: finish the current round right now
  function endNow() { if (running) timeLeft = 0; }

  return { open, close, endNow, isOpen: () => !$("minigame").classList.contains("hidden") };
})();
