/* =====================================================================
   SAVE.JS — saves and loads progress with localStorage.
   Bad or missing data is repaired automatically.
   ===================================================================== */

const Save = (() => {
  const STATS = ["hunger", "happiness", "energy", "cleanliness"];
  const ROOMS = ["kitchen", "bathroom", "bedroom", "game"];

  const clamp = (v) => Math.max(0, Math.min(100, v));
  const num = (v, def) => (typeof v === "number" && isFinite(v) ? v : def);

  function fresh(now) {
    return {
      version: 1,
      name: TEXT.defaultPetName,
      createdAt: now,
      lastUpdate: now,
      stats: { ...GAME.startStats },
      sleeping: false,
      seenStage: 0,        // 0 baby, 1 teen, 2 adult (last stage celebrated)
      bestScore: 0,
      gamesPlayed: 0,
      welcomeShown: false,
      finalShown: false,
      room: "kitchen",
      muted: !GAME.sound
    };
  }

  // Turn anything (even garbage) into a valid save object.
  function sanitize(d, now) {
    const s = fresh(now);
    if (!d || typeof d !== "object") return s;
    if (typeof d.name === "string" && d.name.trim()) s.name = d.name.trim().slice(0, 16);
    s.createdAt = Math.min(num(d.createdAt, now), now);       // never in the future
    s.lastUpdate = Math.min(Math.max(num(d.lastUpdate, now), s.createdAt), now);
    const st = d.stats && typeof d.stats === "object" ? d.stats : {};
    STATS.forEach((k) => (s.stats[k] = clamp(num(st[k], GAME.startStats[k]))));
    s.sleeping = d.sleeping === true;
    s.seenStage = Math.max(0, Math.min(2, Math.floor(num(d.seenStage, 0))));
    s.bestScore = Math.max(0, Math.floor(num(d.bestScore, 0)));
    s.gamesPlayed = Math.max(0, Math.floor(num(d.gamesPlayed, 0)));
    s.welcomeShown = d.welcomeShown === true;
    s.finalShown = d.finalShown === true;
    s.room = ROOMS.includes(d.room) ? d.room : "kitchen";
    s.muted = d.muted === true;
    return s;
  }

  function load(now) {
    let raw = null;
    try { raw = localStorage.getItem(GAME.saveKey); } catch (e) { /* storage blocked */ }
    if (!raw) return { state: fresh(now), isNew: true };
    try {
      return { state: sanitize(JSON.parse(raw), now), isNew: false };
    } catch (e) {
      // Corrupted save: keep a copy just in case, then start over.
      try { localStorage.setItem(GAME.saveKey + "_broken", raw); } catch (_) {}
      return { state: fresh(now), isNew: true };
    }
  }

  function write(state) {
    try {
      const copy = { ...state, stats: {} };
      STATS.forEach((k) => (copy.stats[k] = Math.round(clamp(state.stats[k]) * 100) / 100));
      localStorage.setItem(GAME.saveKey, JSON.stringify(copy));
    } catch (e) { /* private mode / full storage: game keeps running */ }
  }

  function reset() {
    try { localStorage.removeItem(GAME.saveKey); } catch (e) {}
  }

  return { load, write, reset, fresh, sanitize, clamp, STATS };
})();
