/* =====================================================================
   SOUND.JS — tiny retro sound effects made with code (no audio files).
   ===================================================================== */

const Sound = (() => {
  let ctx = null;
  let muted = false;

  // Browsers only allow audio after the first tap/click.
  function unlock() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, opts = {}) {
    if (muted || !ctx) return;
    const t = ctx.currentTime + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    gain.gain.setValueAtTime(opts.vol || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.05) {
    if (muted || !ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  const fx = {
    click:  () => tone(660, 0.05, { vol: 0.05 }),
    poke:   () => tone(300, 0.18, { to: 700, type: "triangle", vol: 0.15 }),
    eat:    () => { tone(180, 0.08, { vol: 0.1 }); tone(140, 0.08, { vol: 0.1, delay: 0.14 }); tone(180, 0.08, { vol: 0.1, delay: 0.28 }); },
    full:   () => tone(220, 0.25, { to: 160, type: "triangle", vol: 0.12 }),
    bubble: () => tone(900 + Math.random() * 500, 0.06, { type: "sine", vol: 0.08, to: 1600 }),
    shower: () => noise(1.2, 0.04),
    light:  () => tone(520, 0.06, { vol: 0.06 }),
    catch:  () => tone(700, 0.1, { to: 1200, type: "square", vol: 0.06 }),
    bad:    () => tone(140, 0.25, { to: 70, type: "sawtooth", vol: 0.08 }),
    evolve: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { delay: i * 0.12, vol: 0.08 })),
    end:    () => [784, 659, 523].forEach((f, i) => tone(f, 0.15, { delay: i * 0.12, vol: 0.07 }))
  };

  return {
    unlock,
    play: (name) => { try { fx[name] && fx[name](); } catch (e) {} },
    setMuted: (m) => { muted = m; },
    isMuted: () => muted
  };
})();
