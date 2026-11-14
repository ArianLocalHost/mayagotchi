/* =====================================================================
   GAME.JS — the pet, the rooms and everything you can do.
   To change words edit js/texts.js; art/balance: js/config.js.
   ===================================================================== */

(() => {
  const $ = (id) => document.getElementById(id);
  const ROOMS = ["kitchen", "bathroom", "bedroom", "game"];
  const STAGES = ["baby", "teen", "adult"];
  const HOUR = 3600000;
  const DEV = GAME.devMode || new URLSearchParams(location.search).has("dev");

  const el = {
    game: $("game"), roomBg: $("room-bg"), pet: $("pet"), petInner: $("pet-inner"),
    petImg: $("pet-img"), petDirt: $("pet-dirt"), bubbles: $("bubbles"), shadow: $("pet-shadow"),
    speech: $("speech"), zzz: $("zzz"), water: $("water"), actions: $("actions"),
    roomTitle: $("room-title"), nameBtn: $("name-btn"), stageLabel: $("stage-label"),
    soundBtn: $("sound-btn"), hint: $("hint")
  };

  let state;                       // the save data (see save.js)
  let scale = 1, H = 640;          // screen scaling
  let temp = { expr: null, until: 0 }; // short-lived expression (eating, happy...)
  let blinking = false;
  let pendingExpr = null;          // waits for the current hop/chew to finish (smooth)
  let foodIndex = 0;
  let lastPokeReward = 0, lastBubbleSound = 0;
  let speechTimer = 0, hintTimer = 0;
  let saveCounter = 0;
  let celebrating = false, showering = false, resetting = false;
  const hintsShown = {};
  const modalQueue = [];
  let modalOpen = false;

  /* =================================================================
     Helpers
     ================================================================= */
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Fill in {name}, {score}... in a text from texts.js
  const fmt = (s, vars = {}) => String(s == null ? "" : s).replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? vars[k] : k === "name" && state ? state.name : m);
  const foodName = (f) => (TEXT.foods && TEXT.foods[f.id]) || f.id;

  function save() { if (!resetting) Save.write(state); }

  function add(stat, amount) {
    if (!amount) return;
    state.stats[stat] = clamp(state.stats[stat] + amount);
    const s = document.querySelector(`.stat[data-stat="${stat}"]`);
    if (s && amount > 0) { restartAnim(s, "bump"); setTimeout(() => s.classList.remove("bump"), 350); }
    renderStats();
  }

  function restartAnim(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth; // force reflow so the animation plays again
    node.classList.add(cls);
  }
  // one-shot animations remove themselves when finished
  document.addEventListener("animationend", (e) => {
    if (e.target === el.pet) el.pet.classList.remove("poke", "evolve");
  });

  // Convert a pointer event to game coordinates (360 x H)
  function toLocal(e) {
    const r = el.game.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * 360) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  }
  function petRect() {
    const g = el.game.getBoundingClientRect(), p = el.pet.getBoundingClientRect(), f = 360 / g.width;
    return { x: (p.left - g.left) * f, y: (p.top - g.top) * f, w: p.width * f, h: p.height * f };
  }
  function overPet(p) {
    const r = petRect();
    return p.x > r.x + r.w * 0.12 && p.x < r.x + r.w * 0.88 && p.y > r.y + r.h * 0.2 && p.y < r.y + r.h;
  }
  function mouthPoint() {
    const r = petRect();
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.62 };
  }

  /* =================================================================
     Time, stats and growth
     ================================================================= */
  function stageIndex(now = Date.now()) {
    const hours = (now - state.createdAt) / HOUR;
    if (hours >= GAME.growth.adultAfterHours) return 2;
    if (hours >= GAME.growth.teenAfterHours) return 1;
    return 0;
  }
  // The stage we show = the last one celebrated (so the sprite changes during the celebration)
  const shownStage = () => STAGES[Math.min(state.seenStage, stageIndex())];

  function decay(stat, amount) {
    const v = state.stats[stat];
    state.stats[stat] = Math.max(Math.min(v, GAME.minStatFromTime), v - amount);
  }

  // Apply everything that happened since the last update (works after days offline too)
  function applyTime(now = Date.now()) {
    const dt = now - state.lastUpdate;
    state.lastUpdate = now;
    if (dt <= 0) return;
    const h = dt / HOUR, d = GAME.decayPerHour;
    const m = state.sleeping ? GAME.sleepDecayMultiplier : 1;
    decay("hunger", d.hunger * h * m);
    decay("happiness", d.happiness * h * m);
    decay("cleanliness", d.cleanliness * h * m);
    if (state.sleeping) state.stats.energy = clamp(state.stats.energy + GAME.sleepEnergyPerHour * h);
    else decay("energy", d.energy * h);
  }

  function tick() {
    applyTime();
    render();
    checkEvolution();
    if (++saveCounter >= 10) { saveCounter = 0; save(); }
  }

  /* =================================================================
     Drawing
     ================================================================= */
  function renderStats() {
    Save.STATS.forEach((k) => {
      const v = state.stats[k];
      const s = document.querySelector(`.stat[data-stat="${k}"]`);
      const fill = s.querySelector(".fill");
      fill.style.height = Math.round(v) + "%";
      fill.style.background = v > 50 ? "var(--good)" : v > GAME.lowStat ? "var(--mid)" : "var(--bad)";
      s.classList.toggle("low", v < GAME.lowStat);
    });
  }

  function setTemp(expr, ms) { temp = { expr, until: Date.now() + ms }; renderPet(); }

  function baseExpression() {
    if (state.sleeping) return "sleeping";
    if (temp.expr && Date.now() < temp.until) return temp.expr;
    const st = state.stats;
    if (Math.min(st.hunger, st.happiness, st.energy, st.cleanliness) < GAME.lowStat) return "sad";
    return "idle";
  }

  function renderPet() {
    if (!state) return;
    const stage = shownStage();
    const base = baseExpression();
    const sprite = blinking && (base === "idle" || base === "sad") ? "sleeping" : base;
    const src = Assets.pet(stage, sprite);
    if (el.petImg.getAttribute("src") !== src) el.petImg.setAttribute("src", src);
    // Change the body animation. If the pet is mid-hop/chew, let that loop finish
    // first so it doesn't snap (the face sprite above changes immediately).
    const current = el.petInner.dataset.expr;
    if (current === base) pendingExpr = null;
    else if ((current === "happy" || current === "eating") && base !== "sleeping") pendingExpr = base;
    else setBodyAnim(base);
    // a little bigger on tall phones, so the pet fills the room nicely
    const size = Math.round((270 + (H - 640) * 0.2) * (GAME.stageScale[stage] || 1));
    if (el.pet.dataset.size != size) {
      el.pet.dataset.size = size;
      el.pet.style.width = el.pet.style.height = size + "px";
      el.pet.style.marginLeft = -size / 2 + "px";
      el.shadow.style.width = size * 0.66 + "px";
      el.shadow.style.marginLeft = -size * 0.33 + "px";
      el.speech.style.bottom = size + 22 + "px";
      el.zzz.style.bottom = 128 + size * 0.75 + "px";
    }
    const c = state.stats.cleanliness;
    el.petDirt.style.opacity = c < GAME.dirtyBelow ? Math.min(1, 0.35 + ((GAME.dirtyBelow - c) / GAME.dirtyBelow) * 0.9) : 0;
  }

  function setBodyAnim(expr) {
    pendingExpr = null;
    el.petInner.className = expr;
    el.petInner.dataset.expr = expr;
  }

  function render() {
    renderStats();
    renderPet();
    el.game.classList.toggle("sleeping", state.sleeping);
    el.game.classList.toggle("lights-off", state.sleeping);
    el.nameBtn.textContent = state.name;
    el.stageLabel.textContent = TEXT.stages[shownStage()] || shownStage();
    const lamp = el.actions.querySelector('[data-act="lamp"]');
    if (lamp) lamp.classList.toggle("off", state.sleeping);
  }

  function say(text, ms = 1800) {
    el.speech.textContent = text;
    el.speech.classList.remove("hidden");
    restartAnim(el.speech, "pop");
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => el.speech.classList.add("hidden"), ms);
  }

  function showHint(room) {
    const key = "hint" + room[0].toUpperCase() + room.slice(1);
    if (!TEXT[key] || hintsShown[room] || state.sleeping) return;
    hintsShown[room] = true;
    el.hint.textContent = fmt(TEXT[key]);
    el.hint.classList.remove("hidden");
    restartAnim(el.hint, "pop");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => el.hint.classList.add("hidden"), 3500);
  }

  function confetti() {
    const box = $("confetti");
    const colors = ["#ff6fa5", "#ffd23f", "#4dabf7", "#7ed321", "#ff9b42", "#9b7bff"];
    for (let i = 0; i < 50; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 360 + "px";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2 + Math.random() * 1.5 + "s";
      c.style.animationDelay = Math.random() * 0.5 + "s";
      box.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }

  /* =================================================================
     Rooms
     ================================================================= */
  function goRoom(id) {
    if (state.sleeping && id !== "bedroom") wake();
    if (state.room === "bathroom" && id !== "bathroom") clearBubbles();
    el.hint.classList.add("hidden");   // a hint belongs to the room it was shown in
    state.room = id;
    el.roomBg.src = Assets.room(id);
    el.roomTitle.textContent = TEXT.rooms[id] || id;
    el.game.style.setProperty("--room-color", `var(--${id})`);
    el.game.dataset.room = id;
    buildActions(id);
    render();
    if (state.welcomeShown) showHint(id);
    save();
  }

  function nav(dir) {
    if (celebrating) return;
    Sound.play("click");
    goRoom(ROOMS[(ROOMS.indexOf(state.room) + dir + ROOMS.length) % ROOMS.length]);
  }

  function actButton(act, icon) {
    const b = document.createElement("button");
    b.className = "act";
    b.dataset.act = act;
    b.innerHTML = `<img alt="${act}" src="${Assets.ui(icon)}">`;
    el.actions.appendChild(b);
    return b;
  }

  function buildActions(room) {
    el.actions.innerHTML = "";
    if (room === "kitchen") {
      const picker = document.createElement("div");
      picker.className = "food-picker";
      picker.innerHTML = `
        <button class="food-arrow" data-dir="-1"><img alt="previous food" src="${Assets.ui("arrowLeft")}"></button>
        <div class="food-slot"><span class="food-name"></span><img alt="food"></div>
        <button class="food-arrow" data-dir="1"><img alt="next food" src="${Assets.ui("arrowRight")}"></button>`;
      el.actions.appendChild(picker);
      picker.querySelectorAll(".food-arrow").forEach((b) =>
        b.addEventListener("click", () => {
          Sound.play("click");
          foodIndex = (foodIndex + Number(b.dataset.dir) + FOODS.length) % FOODS.length;
          showFood();
        }));
      picker.querySelector(".food-slot").addEventListener("pointerdown", startFoodDrag);
      showFood();
    } else if (room === "bathroom") {
      actButton("soap", "soap").addEventListener("pointerdown", startSoapDrag);
      actButton("shower", "shower").addEventListener("click", shower);
    } else if (room === "bedroom") {
      actButton("lamp", "lamp").addEventListener("click", toggleLight);
    } else if (room === "game") {
      actButton("play", "play").addEventListener("click", openMinigame);
    }
  }

  /* =================================================================
     Dragging things (food, soap) with mouse or finger
     ================================================================= */
  function startDrag(e, src, size, handlers) {
    e.preventDefault();
    const ghost = document.createElement("img");
    ghost.src = src;
    ghost.className = "floating";
    ghost.style.width = ghost.style.height = size + "px";
    el.game.appendChild(ghost);
    const start = toLocal(e);
    let moved = false;
    const place = (p) => { ghost.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`; };
    place(start);
    const move = (ev) => {
      const p = toLocal(ev);
      if (Math.hypot(p.x - start.x, p.y - start.y) > 10) moved = true;
      place(p);
      if (handlers.move) handlers.move(p, overPet(p));
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const p = toLocal(ev);
      handlers.drop(p, overPet(p), moved, ghost);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /* =================================================================
     Kitchen — feeding
     ================================================================= */
  function showFood() {
    const f = FOODS[foodIndex];
    const slot = el.actions.querySelector(".food-slot");
    if (!slot || !f) return;
    slot.querySelector("img").src = Assets.food(f);
    slot.querySelector(".food-name").textContent = foodName(f);
  }

  function startFoodDrag(e) {
    const food = FOODS[foodIndex];
    if (!food) return;
    startDrag(e, Assets.food(food), 70, {
      move: (p, over) => { if (over) setTemp("eating", 250); },   // opens mouth when food is near
      drop: (p, over, moved, ghost) => {
        if (!moved || over) feed(food, ghost);
        else ghost.remove();
      }
    });
  }

  function feed(food, ghost) {
    if (state.stats.hunger >= 98) {
      ghost.remove();
      Sound.play("full");
      restartAnim(el.pet, "poke");
      say(fmt(TEXT.full));
      return;
    }
    const m = mouthPoint();
    ghost.classList.add("fly");
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${m.x - 35}px, ${m.y - 35}px) scale(0.4)`;
    });
    setTemp("eating", 1300);
    setTimeout(() => {
      ghost.remove();
      Sound.play("eat");
      crumbs(m);
      add("hunger", food.hunger);
      add("happiness", food.happiness || 0);
      save();
    }, 420);
    setTimeout(() => { if (temp.expr === "eating") setTemp("happy", 700); }, 1300);
  }

  function crumbs(p) {
    for (let i = 0; i < 7; i++) {
      const c = document.createElement("div");
      c.className = "crumb";
      c.style.transform = `translate(${p.x}px, ${p.y}px)`;
      c.style.background = ["#e0a85a", "#ff4d4d", "#ffd23f"][i % 3];
      el.game.appendChild(c);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        c.style.transform = `translate(${p.x + (Math.random() - 0.5) * 120}px, ${p.y + 40 + Math.random() * 60}px)`;
        c.style.opacity = 0;
      }));
      setTimeout(() => c.remove(), 700);
    }
  }

  /* =================================================================
     Bathroom — soap & shower
     ================================================================= */
  function startSoapDrag(e) {
    let lastBubble = null;
    const btn = e.currentTarget;
    btn.classList.add("pressed");
    startDrag(e, Assets.ui("soap"), 64, {
      move: (p, over) => {
        if (!over) return;
        if (lastBubble && Math.hypot(p.x - lastBubble.x, p.y - lastBubble.y) < 16) return;
        lastBubble = p;
        addBubble(p);
        add("cleanliness", GAME.soapPerBubble);
        setTemp("happy", 500);
        const now = Date.now();
        if (now - lastBubbleSound > 90) { lastBubbleSound = now; Sound.play("bubble"); }
      },
      drop: (p, over, moved, ghost) => {
        btn.classList.remove("pressed");
        ghost.remove();
        if (!moved) say(fmt(TEXT.hintBathroom));
        save();
      }
    });
  }

  function addBubble(p) {
    if (el.bubbles.children.length >= 45) return;
    const r = petRect();
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 14 + Math.random() * 16;
    b.style.width = b.style.height = size + "px";
    b.style.margin = -size / 2 + "px 0 0 " + -size / 2 + "px";
    b.style.left = ((p.x - r.x) / r.w) * 100 + "%";
    b.style.top = ((p.y - r.y) / r.h) * 100 + "%";
    el.bubbles.appendChild(b);
  }

  function clearBubbles() { el.bubbles.innerHTML = ""; }

  // Water falls from the very top of the screen onto the pet, with little splashes.
  function shower() {
    if (showering) return;
    showering = true;
    Sound.play("shower");
    const r = petRect();
    const hitY = r.y + r.h * 0.3;                  // roughly the top of the pet's head
    el.water.style.left = r.x + r.w * 0.12 + "px";
    el.water.style.width = r.w * 0.76 + "px";
    el.water.style.setProperty("--fall", hitY + 30 + "px");
    el.water.style.setProperty("--hit", hitY + "px");
    let html = "";
    for (let i = 0; i < 48; i++) {                  // spread evenly, with a natural-looking mix
      const x = (i * 61.8) % 100, speed = 0.36 + ((i * 7) % 5) * 0.03, delay = ((i * 13) % 48) / 48 * 0.4;
      html += `<i class="drop" style="left:${x}%;animation-duration:${speed}s;animation-delay:${delay}s"></i>`;
    }
    for (let i = 0; i < 10; i++) {
      html += `<i class="splash" style="left:${5 + i * 10}%;--dx:${i % 2 ? 20 : -20}px;animation-delay:${0.3 + (i % 5) * 0.1}s"></i>`;
    }
    el.water.innerHTML = html;
    el.water.classList.remove("hidden", "stop");
    setTemp("happy", 1900);
    setTimeout(() => {
      [...el.bubbles.children].forEach((b) => b.classList.add("rinse"));
      setTimeout(clearBubbles, 800);
      add("cleanliness", GAME.showerCleanliness);
      add("happiness", GAME.showerHappiness);
      save();
    }, 700);
    setTimeout(() => el.water.classList.add("stop"), 1500);   // fade out
    setTimeout(() => { el.water.classList.add("hidden"); el.water.innerHTML = ""; showering = false; }, 1900);
  }

  /* =================================================================
     Bedroom — lights & sleep
     ================================================================= */
  function sleep() {
    applyTime();             // count time so far as "awake"
    state.sleeping = true;
    temp = { expr: null, until: 0 };
    el.hint.classList.add("hidden");
    render();
    save();
  }
  function wake() {
    applyTime();             // count time so far as "asleep"
    state.sleeping = false;
    render();
    save();
  }
  function toggleLight() {
    Sound.play("light");
    state.sleeping ? wake() : sleep();
  }

  /* =================================================================
     Game room — minigame
     ================================================================= */
  function openMinigame() {
    Sound.play("click");
    const stage = shownStage();
    Minigame.open({
      height: H, scale, fmt, best: state.bestScore,
      petIdle: Assets.pet(stage, "idle"), petHappy: Assets.pet(stage, "happy"), petSad: Assets.pet(stage, "sad"),
      petScale: GAME.stageScale[stage] || 1,
      onFinish: (score) => {
        const gained = Math.min(GAME.gameHappinessMax, GAME.gameHappinessBase + score * GAME.gameHappinessPerPoint);
        add("happiness", gained);
        state.stats.energy = clamp(state.stats.energy - GAME.gameEnergyCost);
        state.bestScore = Math.max(state.bestScore, score);
        state.gamesPlayed++;
        save();
        return { best: state.bestScore, gained };
      },
      onClose: () => { render(); setTemp("happy", 1200); }
    });
  }

  /* =================================================================
     Poking the pet
     ================================================================= */
  function poke(e) {
    e.preventDefault();
    if (celebrating) return;
    if (state.sleeping) { say(fmt(TEXT.sleepingPoke)); return; }
    restartAnim(el.pet, "poke");
    Sound.play("poke");
    setTemp("happy", 700);
    const now = Date.now();
    if (now - lastPokeReward > 1500) { lastPokeReward = now; add("happiness", GAME.pokeHappiness); save(); }
    const st = state.stats, low = GAME.lowStat;
    if (st.hunger < low) say(fmt(TEXT.hungry));
    else if (st.energy < low) say(fmt(TEXT.sleepy));
    else if (st.cleanliness < low) say(fmt(TEXT.dirty));
    else if (st.happiness < low) say(fmt(TEXT.bored));
    else if (Math.random() < 0.35 && TEXT.petSays.length) say(fmt(TEXT.petSays[Math.floor(Math.random() * TEXT.petSays.length)]));
  }

  /* =================================================================
     Popups (welcome, rename, evolution, final message)
     ================================================================= */
  function showModal(opts) {
    return new Promise((resolve) => {
      modalQueue.push({ opts, resolve });
      if (!modalOpen) nextModal();
    });
  }

  function nextModal() {
    const item = modalQueue.shift();
    const box = $("modal");
    if (!item) { modalOpen = false; box.classList.add("hidden"); return; }
    modalOpen = true;
    const o = item.opts;
    const input = $("modal-input");
    $("modal-title").textContent = o.title || "";
    $("modal-text").textContent = o.text || "";
    $("modal-text").classList.toggle("hidden", !o.text);
    $("modal-label").textContent = o.label || "";
    $("modal-label").classList.toggle("hidden", !o.label);
    input.classList.toggle("hidden", !o.input);
    input.value = o.value || "";
    $("modal-ok").textContent = o.ok || TEXT.ok;
    $("modal-cancel").classList.toggle("hidden", !o.cancel);
    box.classList.remove("hidden");
    const done = (ok) => {
      Sound.play("click");
      $("modal-ok").onclick = $("modal-cancel").onclick = input.onkeydown = null;
      input.blur();
      item.resolve({ ok, value: input.value });
      nextModal();
    };
    $("modal-ok").onclick = () => done(true);
    $("modal-cancel").onclick = () => done(false);
    input.onkeydown = (e) => { if (e.key === "Enter") done(true); };
  }

  function cleanName(v) {
    const n = String(v || "").trim().slice(0, 16);
    return n || state.name;
  }

  async function welcome() {
    const r = await showModal({
      title: fmt(TEXT.welcomeTitle), text: fmt(TEXT.welcomeMessage),
      input: true, label: TEXT.welcomeNameLabel, value: state.name, ok: TEXT.welcomeButton
    });
    state.name = cleanName(r.value);
    state.welcomeShown = true;
    render();
    save();
    showHint(state.room);
  }

  async function rename() {
    if (celebrating) return;
    Sound.play("click");
    const r = await showModal({ title: fmt(TEXT.renameTitle), input: true, value: state.name, ok: TEXT.save, cancel: true });
    if (r.ok) { state.name = cleanName(r.value); render(); save(); }
  }

  function checkEvolution() {
    if (celebrating || modalOpen || Minigame.isOpen() || !state.welcomeShown) return;
    if (stageIndex() > state.seenStage) evolve();
    else if (state.seenStage === 2 && stageIndex() === 2 && !state.finalShown) finalMessage();
  }

  async function evolve() {
    celebrating = true;
    if (state.sleeping) wake();
    restartAnim(el.pet, "evolve");
    Sound.play("evolve");
    await wait(650);
    state.seenStage++;
    temp = { expr: "happy", until: Date.now() + 3000 };
    render();
    confetti();
    save();
    await wait(1000);
    const adult = state.seenStage === 2;
    await showModal({ title: fmt(TEXT.evolveTitle), text: fmt(adult ? TEXT.evolveAdult : TEXT.evolveTeen), ok: TEXT.evolveButton });
    celebrating = false;
    if (adult && !state.finalShown) await finalMessage();
  }

  async function finalMessage() {
    celebrating = true;
    confetti();
    setTemp("happy", 4000);
    await showModal({ title: fmt(TEXT.finalTitle), text: fmt(TEXT.finalMessage), ok: TEXT.finalButton });
    state.finalShown = true;
    save();
    celebrating = false;
  }

  /* =================================================================
     Screen fitting, dev tools, startup
     ================================================================= */
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / 360, vh / 640);
    H = Math.round(Math.min(Math.max(640, vh / scale), 820));
    el.game.style.height = H + "px";
    el.game.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* -----------------------------------------------------------------
     Developer test panel — open the game with ?dev=1 and tap 🛠
     ----------------------------------------------------------------- */
  function devTools() {
    const D = TEXT.dev, panel = $("dev"), btn = $("dev-btn");
    btn.textContent = D.open;
    btn.classList.remove("hidden");
    btn.addEventListener("click", () => { panel.classList.toggle("hidden"); devRefresh(); });

    const b = (label, fn) => `<button class="d" data-a="${fn}">${label}</button>`;
    const section = (title, inner) => `<div class="lbl">${title}</div><div class="row">${inner}</div>`;
    panel.innerHTML =
      `<h3>${D.title}</h3><div class="info" id="dev-info"></div>` +
      section(D.time, [1, 6, 12, 24].map((h) => b("+" + h + "h", "skip:" + h)).join("")) +
      section(D.stage, STAGES.map((st, i) => b(TEXT.stages[st] || st, "stage:" + i)).join("")) +
      section(D.stats, Save.STATS.map((k) =>
        `<label class="slider"><span>${TEXT.stats[k] || k}</span><input type="range" min="0" max="100" data-stat="${k}"><b></b></label>`).join("") +
        b(D.allLow, "all:10") + b(D.allFull, "all:100") + b(D.dirty, "dirty")) +
      section(D.faces, ["idle", "happy", "sad", "eating", "sleeping"].map((x) => b(x, "face:" + x)).join("")) +
      section(D.rooms, ROOMS.map((r) => b(TEXT.rooms[r] || r, "room:" + r)).join("") + b(D.sleep, "sleep")) +
      section(D.popups, b(D.welcome, "pop:welcome") + b(D.evolve, "pop:evolve") + b(D.final, "pop:final")) +
      section(D.minigame, b(D.minigame, "mg:open") + b(D.endRound, "mg:end")) +
      section(D.other, b(D.reset, "reset") + b(D.close, "close"));

    let armed = false;
    panel.addEventListener("input", (e) => {
      const k = e.target.dataset.stat;
      if (!k) return;
      state.stats[k] = Number(e.target.value);
      render(); save(); devRefresh();
    });
    panel.addEventListener("click", (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      const [cmd, arg] = a.split(":");
      if (cmd === "skip") {
        const ms = Number(arg) * HOUR;
        state.createdAt -= ms;
        state.lastUpdate -= ms;
        tick(); save();
        say(fmt(D.skipped, { hours: arg }));
      }
      if (cmd === "stage") {
        // set the pet's age to just past that stage (going up shows the celebration)
        const target = Number(arg);
        const hours = [0, GAME.growth.teenAfterHours, GAME.growth.adultAfterHours][target] + 0.01;
        state.createdAt = Date.now() - hours * HOUR;
        if (target < state.seenStage) { state.seenStage = target; state.finalShown = false; }
        panel.classList.add("hidden");
        tick(); save();
      }
      if (cmd === "all") { Save.STATS.forEach((k) => (state.stats[k] = Number(arg))); render(); save(); }
      if (cmd === "dirty") { state.stats.cleanliness = 10; render(); save(); }
      if (cmd === "face") { panel.classList.add("hidden"); if (state.sleeping) wake(); setTemp(arg, 3000); }
      if (cmd === "room") { panel.classList.add("hidden"); goRoom(arg); }
      if (cmd === "sleep") { panel.classList.add("hidden"); goRoom("bedroom"); toggleLight(); }
      if (cmd === "pop") {
        panel.classList.add("hidden");
        if (arg === "welcome") welcome();
        if (arg === "evolve") showModal({ title: fmt(TEXT.evolveTitle), text: fmt(TEXT.evolveTeen), ok: TEXT.evolveButton });
        if (arg === "final") { confetti(); showModal({ title: fmt(TEXT.finalTitle), text: fmt(TEXT.finalMessage), ok: TEXT.finalButton }); }
      }
      if (cmd === "mg") {
        panel.classList.add("hidden");
        if (arg === "open") { if (Minigame.isOpen()) return; goRoom("game"); openMinigame(); }
        if (arg === "end") Minigame.endNow();
      }
      if (cmd === "close") panel.classList.add("hidden");
      if (cmd === "reset") {
        if (!armed) { armed = true; e.target.textContent = D.resetSure; return; }
        resetting = true;
        Save.reset();
        location.href = location.pathname + "?dev=1";
      }
      devRefresh();
    });
    setInterval(devRefresh, 1000);
  }

  function devRefresh() {
    const panel = $("dev");
    if (!panel || panel.classList.contains("hidden")) return;
    const hours = ((Date.now() - state.createdAt) / HOUR).toFixed(1);
    $("dev-info").textContent = fmt(TEXT.dev.age, { hours }) + " · " + (TEXT.stages[STAGES[stageIndex()]] || "") +
      "\n" + Save.STATS.map((k) => (TEXT.stats[k] || k) + " " + Math.round(state.stats[k])).join(" · ");
    panel.querySelectorAll("input[data-stat]").forEach((inp) => {
      if (document.activeElement !== inp) inp.value = Math.round(state.stats[inp.dataset.stat]);
      inp.nextElementSibling.textContent = Math.round(state.stats[inp.dataset.stat]);
    });
  }

  function bindEvents() {
    el.game.addEventListener("pointerdown", () => Sound.unlock(), true);
    $("nav-left").addEventListener("click", () => nav(-1));
    $("nav-right").addEventListener("click", () => nav(1));
    el.pet.addEventListener("pointerdown", poke);
    el.petInner.addEventListener("animationiteration", () => { if (pendingExpr) setBodyAnim(pendingExpr); });
    el.nameBtn.addEventListener("click", rename);
    el.soundBtn.addEventListener("click", () => {
      state.muted = !state.muted;
      Sound.setMuted(state.muted);
      el.soundBtn.querySelector("img").src = Assets.ui(state.muted ? "soundOff" : "soundOn");
      Sound.play("click");
      save();
    });
    window.addEventListener("keydown", (e) => {
      if (modalOpen || Minigame.isOpen()) return;
      if (e.key === "ArrowLeft") nav(-1);
      if (e.key === "ArrowRight") nav(1);
    });
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { applyTime(); save(); } else tick();
    });
    window.addEventListener("pagehide", () => { applyTime(); save(); });
  }

  function scheduleBlink() {
    setTimeout(() => {
      blinking = true;
      renderPet();
      setTimeout(() => { blinking = false; renderPet(); scheduleBlink(); }, 140);
    }, 2000 + Math.random() * 3500);
  }

  async function init() {
    $("loading-text").textContent = TEXT.loading;
    document.title = TEXT.pageTitle || document.title;
    fit();
    await Assets.init((done, total) => { $("loading-fill").style.width = (done / total) * 100 + "%"; });
    state = Save.load(Date.now()).state;
    applyTime();
    // If growth times were changed to be longer, don't show a stage the pet hasn't reached.
    state.seenStage = Math.min(state.seenStage, stageIndex());
    Sound.setMuted(state.muted);

    // static images
    $("nav-left").querySelector("img").src = Assets.ui("arrowLeft");
    $("nav-right").querySelector("img").src = Assets.ui("arrowRight");
    Save.STATS.forEach((k) => (document.querySelector(`.stat[data-stat="${k}"] img`).src = Assets.ui(k)));
    el.soundBtn.querySelector("img").src = Assets.ui(state.muted ? "soundOff" : "soundOn");
    el.petDirt.src = Assets.dirt();

    bindEvents();
    if (DEV) devTools();
    $("loading").classList.add("hidden");
    $("modal-cancel").textContent = TEXT.cancel;
    document.querySelectorAll(".stat").forEach((s) => (s.title = TEXT.stats[s.dataset.stat] || ""));
    el.game.classList.remove("hidden");

    goRoom(state.sleeping ? "bedroom" : state.room);
    setInterval(tick, 1000);
    setInterval(renderPet, 150);
    scheduleBlink();
    // handy for testing in the browser console: PetGame.state
    window.PetGame = { get state() { return state; }, save, tick };

    if (!state.welcomeShown) await welcome();
    checkEvolution();
  }

  init();
})();
