/* =====================================================================
   ASSETS.JS — loads every picture listed in config.js BEFORE the game
   starts (with a progress bar), so nothing ever pops in late.

   - Only your own files are used. There are no built-in drawings.
   - Every file is requested with "?v=<version>" (see index.html), so a
     hosting site or phone never shows an old cached copy after you
     upload new files. Change the version in index.html when you update.
   - Slow pictures are waited for (no time limit); a failed download is
     retried before giving up.
   - Icons, foods and minigame items are automatically CENTERED.
   ===================================================================== */

const Assets = (() => {
  const VERSION = window.GAME_VERSION || "";
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const src = {};   // config path -> what the game should use (versioned URL or centered copy)
  const keep = [];  // hold on to loaded pictures so the browser keeps them ready

  const url = (path) => path + (VERSION ? (path.includes("?") ? "&" : "?") + "v=" + VERSION : "");

  function loadOnce(u) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = u;
    });
  }

  async function load(path) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const img = await loadOnce(url(path) + (attempt ? "&retry=" + attempt : ""));
      if (img) {
        if (img.decode) { try { await img.decode(); } catch (e) {} }
        keep.push(img);
        return img;
      }
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
    console.warn("Could not load picture:", path);
    return null;
  }

  // Cut away the transparent border and put the drawing in the middle of a square,
  // balanced by eye (halfway between its outer box and its visual weight).
  function centerImage(img, size) {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1, sx = 0, sy = 0, sa = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const a = data[(y * w + x) * 4 + 3];
          if (a <= 10) continue;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
          sx += x * a; sy += y * a; sa += a;
        }
      if (x1 < 0) return null;
      x1++; y1++;
      const cx = ((x0 + x1) / 2 + sx / sa) / 2;
      const cy = ((y0 + y1) / 2 + sy / sa) / 2;
      const half = Math.max(cx - x0, x1 - cx, cy - y0, y1 - cy);
      const s = (size * 0.47) / half;
      const out = document.createElement("canvas");
      out.width = out.height = size;
      out.getContext("2d").drawImage(c, x0, y0, x1 - x0, y1 - y0,
        size / 2 - (cx - x0) * s, size / 2 - (cy - y0) * s, (x1 - x0) * s, (y1 - y0) * s);
      return out.toDataURL("image/png");
    } catch (e) {
      return null; // e.g. opened by double-clicking the file — use the picture as it is
    }
  }

  // Every picture + whether it should be centered (and at what size)
  function jobs() {
    const list = [];
    const walk = (o, center) => { for (const k in o) typeof o[k] === "string" ? list.push([o[k], center]) : walk(o[k], center); };
    walk(ASSETS.pet, 0);
    walk(ASSETS.rooms, 0);
    walk(ASSETS.ui, 128);
    for (const k in ASSETS.minigame) list.push([ASSETS.minigame[k], k === "background" ? 0 : 128]);
    FOODS.forEach((f) => list.push([f.image, 256]));
    return list;
  }

  async function init(onProgress) {
    const list = jobs();
    let done = 0;
    await Promise.all(list.map(async ([path, center]) => {
      const img = await load(path);
      if (img) src[path] = (center && centerImage(img, center)) || url(path);
      done++;
      if (onProgress) onProgress(done, list.length);
    }));
  }

  const get = (path) => src[path] || BLANK;

  return {
    init,
    pet(stage, expr) {
      const set = ASSETS.pet[stage] || {};
      return src[set[expr]] || src[set.idle] || BLANK;   // missing face -> that stage's idle
    },
    dirt: () => get(ASSETS.pet.dirt),
    room: (id) => get(ASSETS.rooms[id]),
    ui: (id) => get(ASSETS.ui[id]),
    minigame: (id) => get(ASSETS.minigame[id]),
    minigameBg: () => get(ASSETS.minigame.background),
    food: (f) => get(f.image)
  };
})();
