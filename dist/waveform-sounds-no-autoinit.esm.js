// node_modules/@arraypress/text/src/index.js
var HTML_ESCAPES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
});
function escapeHtml(input) {
  if (input === null || input === void 0) return "";
  return String(input).replace(/[&<>"']/g, (c) => HTML_ESCAPES[
    /** @type {keyof typeof HTML_ESCAPES} */
    c
  ]);
}
var NOT_A_WORD = /[^\p{L}\p{N}\p{M}]+/u;
var COMBINING_MARK = /\p{Mn}/gu;
var ACCENTS = Object.freeze([
  [768, 879],
  [1425, 1479],
  [1552, 1562],
  [1611, 1631],
  [1648, 1648],
  [6832, 6911],
  [7616, 7679],
  [8400, 8447],
  [65056, 65071]
]);
function isAccent(mark) {
  const point = mark.codePointAt(0) ?? 0;
  return ACCENTS.some(([from, to]) => point >= from && point <= to);
}
function fold(text2) {
  if (!text2 || typeof text2 !== "string") return "";
  return text2.toLowerCase().normalize("NFD").replace(COMBINING_MARK, (mark) => isAccent(mark) ? "" : mark).normalize("NFC");
}
function words(text2) {
  return fold(text2).split(NOT_A_WORD).filter((word) => word !== "");
}
function editDistance(a, b) {
  const s = Array.from(a ?? "");
  const t = Array.from(b ?? "");
  let before = [];
  let previous = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const current = [i];
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        current[j] = Math.min(current[j], before[j - 2] + 1);
      }
    }
    before = previous;
    previous = current;
  }
  return previous[t.length];
}
function matchesAll(name, query, options = {}) {
  const fuzzyFrom = options.fuzzyFrom ?? 4;
  const folded = fold(name);
  const nameWords = words(name);
  return words(query).every((term) => {
    if (folded.includes(term)) return true;
    const length = Array.from(term).length;
    if (length < fuzzyFrom) return false;
    return nameWords.some(
      (word) => editDistance(term, word) <= 1 || editDistance(term, Array.from(word).slice(0, length).join("")) <= 1
    );
  });
}

// src/js/data/keys.ts
var KEY_PITCH = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11
};
var CONVENTIONAL_MAJOR = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
var CONVENTIONAL_MINOR = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
var SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
function parseKey(key) {
  const m = /^([A-G][#b]?)(m?)$/.exec(String(key ?? ""));
  if (!m || KEY_PITCH[m[1]] === void 0) return null;
  return { root: m[1], pitch: KEY_PITCH[m[1]], minor: m[2] === "m" };
}
function keyClass(key) {
  const k = parseKey(key);
  return k ? `${k.pitch}${k.minor ? "m" : ""}` : key;
}
function sameKey(a, b, merge = true) {
  return a === b || merge && !!a && keyClass(a) === keyClass(b);
}
function keyRank(key) {
  if (!key) return Infinity;
  const k = parseKey(key);
  return k ? k.pitch * 2 + (k.minor ? 1 : 0) : 1e3;
}
function enharmonics(key) {
  const k = parseKey(key);
  if (!k) return key ? [key] : [];
  const mode = k.minor ? "m" : "";
  return [.../* @__PURE__ */ new Set([key, SHARPS[k.pitch] + mode, FLATS[k.pitch] + mode])];
}
function canonicalSpelling(counts) {
  let best = 0;
  for (const n of counts.values()) if (n > best) best = n;
  const tied = [...counts].filter(([, n]) => n === best).map(([k2]) => k2).sort();
  if (tied.length === 1) return tied[0];
  const k = parseKey(tied[0]);
  const conventional = k ? (k.minor ? CONVENTIONAL_MINOR : CONVENTIONAL_MAJOR)[k.pitch] : "";
  return tied.includes(conventional) ? conventional : tied[0];
}
function keyEntries(keys, merge = true) {
  const groups = /* @__PURE__ */ new Map();
  for (const key of keys) {
    if (!key) continue;
    const cls = merge ? keyClass(key) : key;
    const g = groups.get(cls) ?? /* @__PURE__ */ new Map();
    groups.set(cls, g);
    g.set(key, (g.get(key) || 0) + 1);
  }
  const out = [];
  const aliases = {};
  for (const g of groups.values()) {
    const entry = canonicalSpelling(g);
    out.push(entry);
    const others = [...g.keys()].filter((k) => k !== entry).sort();
    if (others.length) aliases[entry] = others;
  }
  out.sort((a, b) => keyRank(a) - keyRank(b) || a.localeCompare(b));
  return { keys: out, aliases };
}
function keyEntry(key, entries, merge = true) {
  if (!key) return "";
  if (entries.includes(key)) return key;
  if (!merge) return "";
  const cls = keyClass(key);
  return entries.find((e) => keyClass(e) === cls) ?? "";
}

// src/js/data/sounds.ts
function encodePeaks(peaks) {
  if (!Array.isArray(peaks)) return "";
  let out = "";
  for (const p of peaks) {
    const v = Math.round(Math.min(Math.max(Number(p) || 0, 0), 1) * 255);
    out += (v < 16 ? "0" : "") + v.toString(16);
  }
  return out;
}
var COMPACT_PREFIX = "wp1:";
function decodeCompact(body) {
  if (!body || !/^[\w-]+$/.test(body) || body.length % 4 === 1) return null;
  try {
    const bytes = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i) / 255;
    return out;
  } catch {
    return null;
  }
}
function decodePeaks(value, scale = 1) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    if (value.startsWith(COMPACT_PREFIX)) return decodeCompact(value.slice(COMPACT_PREFIX.length));
    if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) return null;
    const out2 = new Array(value.length / 2);
    for (let i = 0; i < out2.length; i++) out2[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16) / 255;
    return out2;
  }
  if (!Array.isArray(value)) return null;
  const s = Number(scale) > 0 ? Number(scale) : 1;
  const out = value.map((v) => Math.min(Math.max((Number(v) || 0) / s, 0), 1));
  return out.length ? out : null;
}
function normalizeKey(key) {
  if (key == null) return "";
  const raw = String(key).trim();
  const m = raw.match(/^([A-Ga-g])[\s_-]*([#♯b♭]?)[\s_-]*(m|min|minor|maj|major)?$/i);
  if (!m) return raw;
  const root = m[1].toUpperCase();
  const acc = m[2] === "\u266F" ? "#" : m[2] === "\u266D" ? "b" : m[2];
  const minor = m[3] && /^m(in(or)?)?$/i.test(m[3]) && m[3] !== "M";
  return root + acc + (minor ? "m" : "");
}
function formatDuration(seconds) {
  if (seconds == null || seconds === "") return "";
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return "";
  if (s > 0 && s < 0.95) return `${Math.max(0.1, Math.round(s * 10) / 10).toFixed(1)}s`;
  const total = s < 1 ? Math.ceil(s) : Math.floor(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function formatClock(seconds) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h2 = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), sec = String(total % 60).padStart(2, "0");
  return h2 ? `${h2}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
function parseDuration(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const str = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
  if (!/^\d+(\.\d+)?(:\d+(\.\d+)?)+$/.test(str)) return null;
  const parts = str.split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
function titleFromUrl(url) {
  const file = String(url || "").split(/[?#]/)[0].split("/").pop() || "";
  let name = file.replace(/\.[a-z0-9]+$/i, "");
  try {
    name = decodeURIComponent(name);
  } catch {
  }
  return name.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeSound(input, index, peakScale = 1) {
  if (!input || typeof input !== "object" || !input.url) return null;
  const bpm = Number(input.bpm);
  const tags = Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean) : typeof input.tags === "string" ? input.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  return {
    id: input.id != null && input.id !== "" ? String(input.id) : `sound-${index + 1}`,
    url: String(input.url),
    title: input.title ? String(input.title) : titleFromUrl(input.url),
    type: input.type ? String(input.type) : "",
    bpm: Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm * 100) / 100 : null,
    key: normalizeKey(input.key),
    duration: parseDuration(input.duration),
    tags,
    peaks: decodePeaks(input.peaks, peakScale),
    waveform: input.waveform ? String(input.waveform) : null,
    download: input.download ? String(input.download) : null,
    loop: isLoop(input.loop)
  };
}
var LOOP_FILTERS = ["loop", "one-shot"];
function isLoop(value) {
  return value === true || value === 1 || value === "true" || value === "1";
}
function parseManifest(manifest) {
  const list = Array.isArray(manifest) ? manifest : Array.isArray(manifest?.sounds) ? manifest.sounds : [];
  const scale = Array.isArray(manifest) ? 1 : Number(manifest?.peakScale) || 1;
  return normalizeSounds(list, scale);
}
function normalizeSounds(list, peakScale = 1) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item, i) => {
    const s = normalizeSound(item, i, peakScale);
    if (!s) return;
    let id = s.id, n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    s.id = id;
    seen.add(id);
    out.push(s);
  });
  return out;
}
function facets(sounds, options = {}) {
  const types = /* @__PURE__ */ new Map();
  const keys = [];
  let min = Infinity, max = -Infinity, hasDuration = false, loops = 0;
  for (const s of sounds) {
    if (s.type) types.set(s.type, (types.get(s.type) || 0) + 1);
    if (s.key) keys.push(s.key);
    if (s.bpm != null) {
      min = Math.min(min, s.bpm);
      max = Math.max(max, s.bpm);
    }
    if (s.duration != null) hasDuration = true;
    if (s.loop) loops++;
  }
  const entries = keyEntries(keys, options.mergeEnharmonicKeys !== false);
  return {
    types: [...types].map(([name, count]) => ({ name, count })),
    keys: entries.keys,
    keyAliases: entries.aliases,
    bpm: min === Infinity ? null : { min, max },
    hasDuration,
    loops,
    oneShots: sounds.length - loops
  };
}
function matches(sound, filter = {}, options = {}) {
  const merge = options.mergeEnharmonicKeys !== false;
  if (filter.type && sound.type !== filter.type) return false;
  if (filter.key && !sameKey(sound.key, normalizeKey(filter.key), merge)) return false;
  if (filter.loop === "loop" && !sound.loop) return false;
  if (filter.loop === "one-shot" && sound.loop) return false;
  const lo = Number(filter.bpmMin), hi = Number(filter.bpmMax);
  if (filter.bpmMin != null && filter.bpmMin !== "" && Number.isFinite(lo) || filter.bpmMax != null && filter.bpmMax !== "" && Number.isFinite(hi)) {
    if (sound.bpm == null) return false;
    if (filter.bpmMin != null && filter.bpmMin !== "" && sound.bpm < lo) return false;
    if (filter.bpmMax != null && filter.bpmMax !== "" && sound.bpm > hi) return false;
  }
  const terms = words(filter.query || "");
  if (terms.length) {
    const hay = [sound.title, sound.type, ...merge ? enharmonics(sound.key) : [sound.key], ...sound.tags || []].join(" ");
    const folded = fold(hay);
    const rest = terms.filter((w) => !(/^\d+$/.test(w) && !folded.includes(w) && sound.bpm != null && Math.round(sound.bpm) === Number(w)));
    if (rest.length && !matchesAll(hay, rest.join(" "))) return false;
  }
  return true;
}
var SORTS = ["default", "title", "bpm", "key", "duration"];
var SORT_NEEDS = {
  default: () => true,
  title: () => true,
  bpm: (f) => f.bpm !== null,
  key: (f) => f.keys.length > 0,
  duration: (f) => f.hasDuration
};
function availableSorts(sorts, f) {
  return sorts.filter((sort) => SORT_NEEDS[sort]?.(f));
}
function sortSounds(sounds, by = "default") {
  const list = sounds.map((s, i) => ({ s, i }));
  const last = (v) => v == null ? Infinity : v;
  const cmp = {
    title: (a, b) => a.s.title.localeCompare(b.s.title, void 0, { numeric: true, sensitivity: "base" }),
    bpm: (a, b) => last(a.s.bpm) - last(b.s.bpm),
    key: (a, b) => keyRank(a.s.key) - keyRank(b.s.key),
    duration: (a, b) => last(a.s.duration) - last(b.s.duration)
  }[by];
  if (cmp) list.sort((a, b) => cmp(a, b) || a.i - b.i);
  return list.map((x) => x.s);
}

// src/js/dom/draw.ts
function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.round(rect.width * dpr), h2 = Math.round(rect.height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h2) canvas.height = h2;
  return { width: rect.width, height: rect.height, dpr };
}
function resample(peaks, count) {
  if (!peaks?.length || count <= 0) return [];
  if (peaks.length === count) return peaks;
  const out = new Array(count);
  if (count > peaks.length) {
    const last = peaks.length - 1;
    const ratio = peaks.length / count;
    for (let i = 0; i < count; i++) {
      const x = Math.min(Math.max((i + 0.5) * ratio - 0.5, 0), last);
      const j = Math.floor(x), t = x - j;
      out[i] = j >= last ? peaks[last] : peaks[j] + (peaks[j + 1] - peaks[j]) * t;
    }
    return out;
  }
  const step = peaks.length / count;
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = Math.max(start + 1, Math.floor((i + 1) * step));
    let m = 0;
    for (let j = start; j < end && j < peaks.length; j++) if (peaks[j] > m) m = peaks[j];
    out[i] = m;
  }
  return out;
}
function barRects(peaks, width, height, o) {
  const step = o.barWidth + o.barGap;
  const bars = resample(peaks, Math.max(1, Math.floor((width + o.barGap) / step)));
  const max = bars.reduce((m, b) => b > m ? b : m, 0);
  const scale = max > 0 ? 1 / max : 1;
  return bars.map((b, i) => {
    const v = Math.max(b * scale, 0.04);
    if (o.style === "bars") {
      const h3 = Math.max(1, v * height);
      return { x: i * step, y: height - h3, w: o.barWidth, h: h3 };
    }
    const h2 = Math.max(1, v * (height - 2));
    return { x: i * step, y: height / 2 - h2 / 2, w: o.barWidth, h: h2 };
  });
}
function drawRowWaveform(canvas, peaks, progress, o) {
  const size = fitCanvas(canvas);
  const ctx = size && canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;
  const { width, height, dpr } = size;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!peaks?.length) {
    ctx.fillStyle = o.color;
    ctx.fillRect(0, Math.floor(height / 2), width, 1);
    return;
  }
  const path = new Path2D();
  for (const r of barRects(peaks, width, height, o)) path.rect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = o.color;
  ctx.fill(path);
  const split = Math.min(Math.max(progress, 0), 1) * width;
  if (split > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, split, height);
    ctx.clip();
    ctx.fillStyle = o.progressColor;
    ctx.fill(path);
    ctx.restore();
  }
}

// src/js/core/engine.ts
var CALLBACKS = ["onLoad", "onPlay", "onPause", "onEnd", "onTimeUpdate", "onError"];
var PER_TRACK = ["duration", "downloadUrl", "downloadName"];
function engineOptions(user, layout, handlers) {
  const site = user || {};
  const strip = layout === "strip";
  const options = {
    height: strip ? 48 : 32,
    waveformStyle: strip ? "mirror" : "bars",
    preload: "metadata",
    singlePlay: true,
    ...site,
    audioMode: "self",
    loop: false,
    showLoop: false
  };
  for (const name of PER_TRACK) delete options[name];
  for (const name of CALLBACKS) {
    options[name] = (...args) => {
      handlers[name]?.(...args);
      if (typeof site[name] === "function") site[name](...args);
    };
  }
  return options;
}
function enginePeaks(sound, layout) {
  return layout === "strip" && sound.waveform || sound.peaks || null;
}
function engineTrack(sound, layout, autoplay, preload) {
  const track = { waveform: enginePeaks(sound, layout), autoplay };
  if (preload) track.preload = preload;
  if (sound.duration != null && sound.duration > 0) track.duration = sound.duration;
  if (sound.download) track.downloadUrl = sound.download;
  return track;
}

// src/js/dom/menus.ts
function optionMatches(label, query) {
  const q = fold(String(query ?? "")).trim();
  return !q || fold(String(label ?? "")).includes(q);
}
function stepIndex(current, delta, length) {
  return Math.max(0, Math.min(length - 1, current + delta));
}
function partsOf(menu) {
  return {
    button: menu.querySelector("[data-ws-menu-btn]"),
    pop: menu.querySelector("[data-ws-menu-pop]"),
    search: menu.querySelector("[data-ws-menu-search]"),
    list: menu.querySelector("[data-ws-menu-list]"),
    none: menu.querySelector("[data-ws-menu-none]"),
    value: menu.querySelector("[data-ws-menu-value]")
  };
}
var focusOwner = (p) => p.search || p.list || p.pop.querySelector("input") || p.pop.querySelector("button");
var optionsOf = (p, visibleOnly = false) => [...p.list.querySelectorAll('[role="option"]')].filter((o) => !visibleOnly || !o.hidden);
var Menus = class {
  /**
   * @param {HTMLElement} container - The list's root element.
   * @param {Object} opts
   * @param {(name: string, value: string) => void} opts.onPick - A value was chosen.
   * @param {AbortSignal} opts.signal - Removes every listener on abort.
   */
  constructor(container, { onPick, signal }) {
    this.container = container;
    this.onPick = onPick;
    this.menus = Object.fromEntries([...container.querySelectorAll("[data-ws-menu]")].map((m) => [m.dataset.wsMenu, m]));
    this.openMenu = null;
    this._bind(signal);
  }
  /**
   * Wire every menu, plus closing on an outside press or focus leaving.
   * @param signal
   * @internal
   */
  _bind(signal) {
    const sig = { signal };
    for (const [name, menu] of Object.entries(this.menus)) {
      const p = partsOf(menu);
      p.button.addEventListener("click", () => this.openMenu === menu ? this.close(true) : this.open(menu), sig);
      p.button.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          this.open(menu);
        }
      }, sig);
      if (!p.list) {
        p.pop.addEventListener("keydown", (e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          this.close(true);
        }, sig);
        continue;
      }
      p.list.addEventListener("click", (e) => {
        const opt = e.target.closest('[role="option"]');
        if (opt) this._pick(name, opt.dataset.value);
      }, sig);
      p.list.addEventListener("mousedown", (e) => e.preventDefault(), sig);
      p.search?.addEventListener("input", () => this._filter(menu, p.search.value), sig);
      focusOwner(p).addEventListener("keydown", (e) => this._onKey(e, name, menu), sig);
    }
    document.addEventListener("pointerdown", (e) => {
      if (this.openMenu && !this.openMenu.contains(e.target)) this.close(false);
    }, sig);
    this.container.addEventListener("focusout", (e) => {
      if (this.openMenu && !this.openMenu.contains(e.relatedTarget)) this.close(false);
    }, sig);
  }
  /**
   * Open a menu (closing any other), with the selected option active and
   * focus in its search field or list. Flips to open over the end edge
   * when it would overflow the list.
   *
   * @param menu
   */
  open(menu) {
    if (this.openMenu && this.openMenu !== menu) this.close(false);
    const p = partsOf(menu);
    p.button.setAttribute("aria-expanded", "true");
    p.pop.hidden = false;
    this.openMenu = menu;
    if (p.search) {
      p.search.value = "";
      this._filter(menu, "");
    }
    menu.classList.remove("ws-menu--end");
    if (p.pop.getBoundingClientRect().right > this.container.getBoundingClientRect().right + 1) menu.classList.add("ws-menu--end");
    if (p.list) this._activate(menu, p.list.querySelector('[role="option"][aria-selected="true"]'));
    focusOwner(p)?.focus();
  }
  /**
   * Close the open menu, if any.
   *
   * @param focusButton - Return focus to its button (after a
   *   pick or Esc; not after a click elsewhere).
   */
  close(focusButton) {
    const menu = this.openMenu;
    if (!menu) return;
    this.openMenu = null;
    const p = partsOf(menu);
    p.pop.hidden = true;
    p.button.setAttribute("aria-expanded", "false");
    if (focusButton) p.button.focus();
  }
  /**
   * Show `value` as a menu's choice (button text + `aria-selected`). Used
   * after a pick and when the filter is changed from code.
   *
   * @param name - 'type' | 'key' | 'sort'.
   * @param value
   */
  setValue(name, value) {
    const menu = this.menus[name];
    if (!menu) return;
    const p = partsOf(menu);
    if (!p.list) return;
    let label = null;
    for (const opt of optionsOf(p)) {
      const on = opt.dataset.value === String(value ?? "");
      opt.setAttribute("aria-selected", String(on));
      if (on) label = opt.querySelector(".ws-menu-text")?.textContent ?? "";
    }
    if (label !== null) p.value.textContent = label;
  }
  /**
   * Narrow a menu to the options matching the search, and make the first
   * match active.
   * @internal
   */
  _filter(menu, query) {
    const p = partsOf(menu);
    let first = null;
    for (const opt of optionsOf(p)) {
      opt.hidden = !optionMatches(`${opt.textContent} ${opt.dataset.alt ?? ""}`, query);
      if (!opt.hidden) first ??= opt;
    }
    p.none.hidden = first !== null;
    this._activate(menu, first);
  }
  /**
   * Mark one option active (`aria-activedescendant`) and scroll it into
   * the list's view.
   * @internal
   */
  _activate(menu, opt) {
    const p = partsOf(menu);
    for (const o of p.list.querySelectorAll(".is-active")) o.classList.remove("is-active");
    const owner = focusOwner(p);
    if (!opt || opt.hidden) {
      owner.removeAttribute("aria-activedescendant");
      return;
    }
    opt.classList.add("is-active");
    owner.setAttribute("aria-activedescendant", opt.id);
    opt.scrollIntoView?.({ block: "nearest" });
  }
  /**
   * Keys inside an open menu.
   * @internal
   */
  _onKey(e, name, menu) {
    const p = partsOf(menu);
    const opts = optionsOf(p, true);
    const at = opts.indexOf(p.list.querySelector(".is-active"));
    const moveTo = (i) => {
      e.preventDefault();
      this._activate(menu, opts[i]);
    };
    const inField = e.target.matches("input");
    switch (e.key) {
      case "ArrowDown":
        return moveTo(stepIndex(at, 1, opts.length));
      case "ArrowUp":
        return moveTo(stepIndex(at, -1, opts.length));
      case "Home":
        return inField ? void 0 : moveTo(0);
      case "End":
        return inField ? void 0 : moveTo(opts.length - 1);
      case "Enter":
        e.preventDefault();
        if (at >= 0) this._pick(name, opts[at].dataset.value);
        return void 0;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        return this.close(true);
      case "Tab":
        return this.close(false);
      default:
        return void 0;
    }
  }
  /**
   * A value was chosen: close, then report it.
   * @internal
   */
  _pick(name, value) {
    this.close(true);
    this.onPick(name, value);
  }
};

// src/js/shared/utils.ts
var LOG = "[WaveformSounds]";
function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}
function pointerFraction(clientX, rect) {
  return rect && rect.width ? clamp((clientX - rect.left) / rect.width) : 0;
}
function isTyping(el) {
  return !!el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
}
function emit(target, name, detail) {
  const event = new CustomEvent(`waveformsounds:${name}`, { bubbles: true, composed: true, detail });
  target.dispatchEvent(event);
  return event;
}
function hashString(str) {
  let hash = 5381;
  for (const char of str) hash = hash * 33 + char.codePointAt(0) >>> 0;
  return hash;
}

// src/js/data/navigation.ts
var SEEK_STEP = 0.1;
function rowTarget(key, at, count) {
  if (!count) return null;
  switch (key) {
    case "ArrowDown":
      return at + 1 < count ? at + 1 : null;
    case "ArrowUp":
      return at > 0 ? at - 1 : "search";
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
function seekTarget(progress, key) {
  if (key !== "ArrowRight" && key !== "ArrowLeft") return null;
  return clamp(progress + (key === "ArrowRight" ? SEEK_STEP : -SEEK_STEP), 0, SEEK_END);
}
var SEEK_END = 0.999;
function sliderEdgeTarget(key) {
  return key === "Home" ? 0 : key === "End" ? SEEK_END : null;
}
var RENDER_CHUNK = 50;
function renderedCount(matching, limit, budget) {
  return Math.min(matching, limit === Infinity ? budget : limit);
}
function firstRender(pageSize) {
  return pageSize > 0 ? pageSize : RENDER_CHUNK;
}
function budgetToReveal(budget, pos) {
  return pos < budget ? budget : Math.ceil((pos + 1) / RENDER_CHUNK) * RENDER_CHUNK;
}
function limitToReveal(limit, pos) {
  return pos >= limit ? pos + 1 : limit;
}

// src/js/data/bpm.ts
function bpmExtent(range) {
  return range ? { min: Math.floor(range.min), max: Math.ceil(range.max) } : null;
}
function bpmFilterFromRange(lo, hi, extent) {
  const a = Math.min(lo, hi), b = Math.max(lo, hi);
  return {
    bpmMin: a > extent.min ? String(a) : "",
    bpmMax: b < extent.max ? String(b) : ""
  };
}
function bpmRangeFromFilter(filter, extent) {
  const read = (v, fallback) => {
    const n = Number(v);
    return v === "" || v == null || !Number.isFinite(n) ? fallback : Math.min(Math.max(n, extent.min), extent.max);
  };
  const lo = read(filter.bpmMin, extent.min);
  const hi = read(filter.bpmMax, extent.max);
  return lo <= hi ? { lo, hi } : { lo: hi, hi: lo };
}
function bpmFraction(value, extent) {
  const span = extent.max - extent.min;
  return span > 0 ? Math.min(Math.max((value - extent.min) / span, 0), 1) : 0;
}
function hasBpmFilter(filter) {
  return filter.bpmMin != null && filter.bpmMin !== "" || filter.bpmMax != null && filter.bpmMax !== "";
}

// src/js/render/strings.ts
var DEFAULT_STRINGS = {
  search: "Search sounds",
  searchPlaceholder: "Search sounds\u2026",
  all: "All",
  types: "Type",
  key: "Key",
  anyKey: "Any key",
  allTypes: "All types",
  findType: "Find a type\u2026",
  findKey: "Find a key\u2026",
  noMatches: "No matches",
  bpm: "BPM",
  bpmMin: "Min BPM",
  bpmMax: "Max BPM",
  anyBpm: "Any BPM",
  bpmRange: "{min}\u2013{max} BPM",
  sort: "Sort",
  sortBy: "Sort by",
  sortDefault: "Default",
  sortTitle: "Name",
  sortBpm: "BPM",
  sortKey: "Key",
  sortDuration: "Length",
  loop: "Loop",
  loopFilter: "Loops or one-shots",
  loops: "Loops",
  oneShots: "One-shots",
  isLoop: "Loop",
  play: "Play {title}",
  pause: "Pause {title}",
  seek: "Seek {title}",
  seekValue: "{time} of {duration}",
  download: "Download {title}",
  count: "{count} sounds",
  countOne: "1 sound",
  countFiltered: "{count} of {total} sounds",
  showMore: "Show {count} more",
  empty: "No sounds match.",
  clear: "Clear filters",
  nowPlaying: "Playing {title}",
  playError: "Could not play {title}",
  loadError: "Could not load the sounds.",
  noSounds: "No sounds.",
  rowBpm: "{bpm} BPM",
  rowKey: "key {key}",
  rowDuration: "{duration}",
  keyMajor: "{note} major",
  keyMinor: "{note} minor",
  noteSharp: "{note} sharp",
  noteFlat: "{note} flat",
  listSeparator: ", "
};
var SORT_LABEL_KEYS = {
  default: "sortDefault",
  title: "sortTitle",
  bpm: "sortBpm",
  key: "sortKey",
  duration: "sortDuration"
};
function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => name in vars ? String(vars[name]) : match);
}
function bpmLabel(filter, extent, strings = DEFAULT_STRINGS) {
  if (!hasBpmFilter(filter)) return strings.anyBpm;
  const { lo, hi } = bpmRangeFromFilter(filter, extent);
  return fill(strings.bpmRange, { min: lo, max: hi });
}
function countText(shown, total, strings = DEFAULT_STRINGS) {
  if (shown !== total) return fill(strings.countFiltered, { count: shown, total });
  return total === 1 ? strings.countOne : fill(strings.count, { count: total });
}
function spokenKey(key, strings = DEFAULT_STRINGS) {
  const k = parseKey(key);
  if (!k) return key;
  const letter = k.root[0], acc = k.root.slice(1);
  const note = acc === "#" ? fill(strings.noteSharp, { note: letter }) : acc === "b" ? fill(strings.noteFlat, { note: letter }) : letter;
  return fill(k.minor ? strings.keyMinor : strings.keyMajor, { note });
}
function rowSummary(sound, columns, strings = DEFAULT_STRINGS) {
  const parts = [];
  for (const c of columns) {
    if (c === "type" && sound.type) parts.push(sound.type);
    else if (c === "bpm" && sound.bpm != null) parts.push(fill(strings.rowBpm, { bpm: sound.bpm }));
    else if (c === "key" && sound.key) parts.push(fill(strings.rowKey, { key: spokenKey(sound.key, strings) }));
    else if (c === "duration") {
      const d = formatDuration(sound.duration);
      if (d) parts.push(fill(strings.rowDuration, { duration: d }));
    }
  }
  if (sound.loop) parts.push(strings.isLoop);
  return parts.join(strings.listSeparator);
}

// src/js/render/options.ts
var FILTERS = ["type", "key", "bpm", "loop"];
var COLUMNS = ["type", "bpm", "key", "duration"];
var RENDER_DEFAULTS = {
  player: "inline",
  search: true,
  filters: [...FILTERS],
  sorts: [...SORTS],
  loopToggle: true,
  showCount: true,
  menuSearch: 8,
  pageSize: 50,
  columns: [...COLUMNS],
  maxTypeChips: 10,
  mergeEnharmonicKeys: true
};
var RENDER_OPTION_KEYS = [...Object.keys(RENDER_DEFAULTS), "idPrefix", "loop", "strings"];
function pickRenderOptions(options) {
  const out = {};
  for (const key of RENDER_OPTION_KEYS) {
    const value = options?.[key];
    if (value != null) out[key] = value;
  }
  return out;
}
function defined(obj) {
  const out = {};
  for (const k in obj ?? {}) if (obj[k] !== void 0) out[k] = obj[k];
  return out;
}
function allowedList(values, allowed, fallback) {
  return Array.isArray(values) ? values.filter((v) => allowed.includes(v)) : fallback;
}
function wholeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
function resolveRenderOptions(options = {}) {
  const o = { ...RENDER_DEFAULTS, ...defined(options) };
  return {
    ...o,
    player: o.player === "strip" ? "strip" : "inline",
    filters: allowedList(o.filters, FILTERS, RENDER_DEFAULTS.filters),
    sorts: allowedList(o.sorts, SORTS, RENDER_DEFAULTS.sorts),
    columns: allowedList(o.columns, COLUMNS, RENDER_DEFAULTS.columns),
    menuSearch: wholeNumber(o.menuSearch, RENDER_DEFAULTS.menuSearch),
    maxTypeChips: wholeNumber(o.maxTypeChips, RENDER_DEFAULTS.maxTypeChips),
    pageSize: wholeNumber(o.pageSize, RENDER_DEFAULTS.pageSize),
    mergeEnharmonicKeys: o.mergeEnharmonicKeys !== false,
    strings: { ...DEFAULT_STRINGS, ...defined(options.strings) }
  };
}

// src/js/core/options.ts
var DEFAULT_OPTIONS = {
  ...RENDER_DEFAULTS,
  sounds: null,
  manifest: null,
  waveformStyle: "mirror",
  waveformColor: null,
  progressColor: null,
  barWidth: 2,
  barGap: 1,
  loop: null,
  autoAdvance: false,
  arrowAudition: true,
  // null is "unset" (the container's id, else a hash); the public type,
  // unchanged from 0.3.1, has no null, hence the cast (it emits nothing).
  idPrefix: null,
  urlState: false,
  playerOptions: null,
  playerClass: null,
  strings: null,
  onReady: null,
  onPlay: null,
  onPause: null,
  onEnd: null,
  onFilter: null,
  onError: null
};
function parseBool(value) {
  if (value === "" || value === "true") return true;
  if (value === "false") return false;
  return void 0;
}
function parseList(value) {
  if (value == null) return void 0;
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}
function parseNumber(value) {
  return value === void 0 || value === "" ? void 0 : Number(value);
}
function parseUrlState(value) {
  if (value === void 0) return void 0;
  const b = parseBool(value);
  return b === void 0 ? value : b;
}
function parseJson(value, name) {
  if (!value) return void 0;
  try {
    return JSON.parse(value);
  } catch {
    console.warn(`${LOG} Ignoring invalid JSON in data-${name}`);
    return void 0;
  }
}
function readDataOptions(el) {
  const d = el.dataset || {};
  const out = {
    player: d.player || void 0,
    manifest: d.manifest || void 0,
    search: parseBool(d.search),
    filters: parseList(d.filters),
    sorts: parseList(d.sorts),
    showCount: parseBool(d.showCount),
    menuSearch: parseNumber(d.menuSearch),
    idPrefix: d.idPrefix || void 0,
    urlState: parseUrlState(d.urlState),
    loopToggle: parseBool(d.loopToggle),
    pageSize: parseNumber(d.pageSize),
    maxTypeChips: parseNumber(d.maxTypeChips),
    columns: parseList(d.columns),
    mergeEnharmonicKeys: parseBool(d.mergeEnharmonicKeys),
    waveformStyle: d.waveformStyle || void 0,
    waveformColor: d.waveformColor || void 0,
    progressColor: d.progressColor || void 0,
    barWidth: parseNumber(d.barWidth),
    barGap: parseNumber(d.barGap),
    loop: parseBool(d.loop),
    autoAdvance: parseBool(d.autoAdvance),
    arrowAudition: parseBool(d.arrowAudition),
    strings: parseJson(d.strings, "strings"),
    playerOptions: parseJson(d.playerOptions, "player-options")
  };
  for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
  return out;
}
function mergeOptions(...sources) {
  const out = {};
  for (const src of sources) {
    if (!src) continue;
    for (const k in src) if (src[k] !== null && src[k] !== void 0) out[k] = src[k];
  }
  return out;
}

// src/js/render/html.ts
var VOID = /* @__PURE__ */ new Set(["input", "br", "img"]);
function text(value) {
  return escapeHtml(value ?? "");
}
function attrs(map = {}) {
  let out = "";
  for (const [name, value] of Object.entries(map)) {
    if (value === true) out += ` ${name}`;
    else if (value !== false && value != null) out += ` ${name}="${escapeHtml(value)}"`;
  }
  return out;
}
function h(tag, attributes = {}, ...children) {
  const open = `<${tag}${attrs(attributes)}>`;
  if (VOID.has(tag)) return open;
  return open + children.flat(Infinity).filter((c) => c != null && c !== false && c !== "").join("") + `</${tag}>`;
}

// src/js/render/icons.ts
var ICON_PATHS = {
  play: "M8 5.5v13l11-6.5z",
  pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
  search: "M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z",
  chevron: "M6.4 8.6 12 14.2l5.6-5.6L19 10l-7 7-7-7z",
  check: "M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z",
  download: "M11 4h2v8.6l3.3-3.3 1.4 1.4L12 16.4l-5.7-5.7 1.4-1.4 3.3 3.3zM5 18h14v2H5z",
  loop: "M17 4l3 3-3 3V8H8a3 3 0 0 0-3 3v1H3v-1a5 5 0 0 1 5-5h9V4zM7 20l-3-3 3-3v2h9a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5H7v2z"
};
var ICON_NAMES = Object.keys(ICON_PATHS);
function iconId(id, name) {
  return `${id}-i-${name}`;
}
function iconSprite(id, names) {
  const symbols = ICON_NAMES.filter((n) => names.includes(n)).map((n) => `<symbol id="${escapeHtml(iconId(id, n))}" viewBox="0 0 24 24"><path d="${ICON_PATHS[n]}"/></symbol>`).join("");
  return `<svg class="ws-sprite" data-ws-sprite="${escapeHtml(id)}" width="0" height="0" aria-hidden="true" focusable="false">${symbols}</svg>`;
}
function icon(id, name, extraClass = "") {
  const cls = extraClass ? `ws-icon ${extraClass}` : "ws-icon";
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#${escapeHtml(iconId(id, name))}"/></svg>`;
}

// src/js/render/markup.ts
function idBase(sounds) {
  const signature = [sounds.length, ...sounds.map((s) => s.url)].join("|");
  return `ws${hashString(signature).toString(36)}`;
}
function toolbarPlan(f, o) {
  const typed = o.filters.includes("type") && f.types.length > 1;
  const sorts = availableSorts(o.sorts, f);
  return {
    types: !typed ? null : f.types.length > o.maxTypeChips ? "menu" : "chips",
    key: o.filters.includes("key") && f.keys.length > 1,
    bpm: o.filters.includes("bpm") && f.bpm !== null && f.bpm.max > f.bpm.min,
    loops: o.filters.includes("loop") && f.loops > 0 && f.oneShots > 0,
    sorts: sorts.length > 1 ? sorts : [],
    search: !!o.search,
    loop: !!o.loopToggle,
    count: !!o.showCount
  };
}
function loopsByDefault(loop, f) {
  return loop == null ? f.loops > 0 : !!loop;
}
function renderSearch(s, id) {
  return h(
    "label",
    { class: "ws-search" },
    icon(id, "search"),
    h("span", { class: "ws-sr" }, text(s.search)),
    h("input", { type: "search", class: "ws-search-input", "data-ws-search": true, placeholder: s.searchPlaceholder, autocomplete: "off", spellcheck: "false" })
  );
}
function renderMenu(name, m) {
  const listId = `${m.id}-${name}-list`;
  const current = m.options.find((o) => o.value === m.value) ?? m.options[0];
  const searchable = m.placeholder && m.options.length > m.searchFrom;
  const button = h(
    "button",
    { type: "button", class: "ws-menu-btn", "data-ws-menu-btn": true, "aria-haspopup": "listbox", "aria-expanded": "false", "aria-controls": listId },
    m.prefix ? h("span", { class: "ws-menu-prefix" }, text(m.prefix)) : h("span", { class: "ws-sr" }, text(`${m.label}: `)),
    h("span", { class: "ws-menu-value", "data-ws-menu-value": true }, text(current.label)),
    icon(m.id, "chevron", "ws-menu-chevron")
  );
  const search = searchable && h("input", {
    type: "search",
    class: "ws-menu-search",
    "data-ws-menu-search": true,
    role: "combobox",
    "aria-expanded": "true",
    "aria-controls": listId,
    "aria-autocomplete": "list",
    "aria-label": m.placeholder,
    placeholder: m.placeholder,
    autocomplete: "off",
    spellcheck: "false"
  });
  const options = m.options.map((o, i) => h(
    "li",
    { role: "option", id: `${m.id}-${name}-${i}`, class: "ws-menu-option", "data-value": o.value, "data-alt": o.alt, "aria-selected": String(o === current) },
    icon(m.id, "check", "ws-menu-check"),
    h("span", { class: "ws-menu-text" }, text(o.label)),
    o.count != null && h("span", { class: "ws-menu-count" }, text(o.count))
  ));
  return h(
    "div",
    { class: "ws-menu", "data-ws-menu": name },
    button,
    h(
      "div",
      { class: "ws-menu-pop", "data-ws-menu-pop": true, hidden: true },
      search,
      h("ul", { class: "ws-menu-list", role: "listbox", id: listId, "aria-label": m.label, tabindex: "-1", "data-ws-menu-list": true }, options),
      h("p", { class: "ws-menu-none", "data-ws-menu-none": true, hidden: true }, text(m.noMatches))
    )
  );
}
function renderBpmMenu({ id, s, range }) {
  const popId = `${id}-bpm-pop`;
  const handle = (attr, label, value) => h("input", {
    type: "range",
    class: "ws-range-input",
    [attr]: true,
    "aria-label": label,
    min: range.min,
    max: range.max,
    step: "1",
    value
  });
  return h(
    "div",
    { class: "ws-menu ws-menu--bpm", "data-ws-menu": "bpm" },
    h(
      "button",
      { type: "button", class: "ws-menu-btn", "data-ws-menu-btn": true, "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": popId },
      h("span", { class: "ws-sr" }, text(`${s.bpm}: `)),
      h("span", { class: "ws-menu-value", "data-ws-menu-value": true }, text(bpmLabel({}, range, s))),
      icon(id, "chevron", "ws-menu-chevron")
    ),
    h(
      "div",
      { class: "ws-menu-pop ws-bpm-pop", id: popId, role: "dialog", "aria-label": s.bpm, "data-ws-menu-pop": true, hidden: true },
      h(
        "div",
        { class: "ws-bpm-head" },
        h("span", { class: "ws-bpm-readout", "data-ws-bpm-readout": true, "aria-live": "polite" }, text(fill(s.bpmRange, range))),
        h("button", { type: "button", class: "ws-bpm-clear", "data-ws-bpm-clear": true }, text(s.anyBpm))
      ),
      h(
        "div",
        { class: "ws-range", "data-ws-bpm-range": true },
        handle("data-ws-bpm-min", s.bpmMin, range.min),
        handle("data-ws-bpm-max", s.bpmMax, range.max)
      ),
      h("div", { class: "ws-range-ends", "aria-hidden": "true" }, h("span", {}, text(range.min)), h("span", {}, text(range.max)))
    )
  );
}
function renderLoopFilter(s) {
  const button = (value, label) => h(
    "button",
    { type: "button", class: "ws-seg-btn", "data-ws-loop-filter": value, "aria-pressed": String(value === "") },
    h("span", {}, text(label))
  );
  return h(
    "div",
    { class: "ws-seg", role: "group", "aria-label": s.loopFilter },
    button("", s.all),
    button("loop", s.loops),
    button("one-shot", s.oneShots)
  );
}
function renderLoopToggle(s, pressed, id) {
  return h("button", { type: "button", class: "ws-loop", "data-ws-loop": true, "aria-pressed": String(pressed) }, icon(id, "loop"), h("span", {}, text(s.loop)));
}
function renderChip(value, label, count, pressed) {
  return h(
    "button",
    { type: "button", class: "ws-chip", "data-ws-type": value, "aria-pressed": String(pressed) },
    h("span", { class: "ws-chip-label" }, text(label)),
    " ",
    h("span", { class: "ws-chip-count" }, text(count))
  );
}
function renderToolbar(plan, { o, s, f, total, id }) {
  const menu = (name, m) => renderMenu(name, { id, searchFrom: o.menuSearch, noMatches: s.noMatches, ...m });
  const controls = [
    plan.types === "menu" && menu("type", {
      label: s.types,
      value: "",
      placeholder: s.findType,
      options: [{ value: "", label: s.allTypes, count: total }, ...f.types.map((t) => ({ value: t.name, label: t.name, count: t.count }))]
    }),
    plan.key && menu("key", {
      label: s.key,
      value: "",
      placeholder: s.findKey,
      options: [{ value: "", label: s.anyKey }, ...f.keys.map((k) => ({ value: k, label: k, alt: f.keyAliases[k]?.join(" ") }))]
    }),
    plan.bpm && renderBpmMenu({ id, s, range: bpmExtent(f.bpm) }),
    plan.loops && renderLoopFilter(s),
    plan.sorts.length > 0 && menu("sort", {
      label: s.sort,
      prefix: s.sortBy,
      value: plan.sorts[0],
      options: plan.sorts.map((k) => ({ value: k, label: s[SORT_LABEL_KEYS[k]] }))
    }),
    plan.loop && renderLoopToggle(s, loopsByDefault(o.loop, f), id)
  ].filter(Boolean);
  const chips = plan.types === "chips" && h(
    "div",
    { class: "ws-types", role: "group", "aria-label": s.types },
    renderChip("", s.all, total, true),
    f.types.map((t) => renderChip(t.name, t.name, t.count, false))
  );
  const count = plan.count && h("p", { class: "ws-count", "data-ws-count": true, "aria-live": "polite" }, text(countText(total, total, s)));
  return h(
    "div",
    { class: "ws-toolbar" },
    plan.search && renderSearch(s, id),
    controls.length > 0 && h("div", { class: "ws-controls" }, controls),
    // The chips and the count share a row (the count alone without chips).
    (chips || count) && h("div", { class: "ws-meta" }, chips, count)
  );
}
var CELLS = {
  type: (sound) => text(sound.type),
  bpm: (sound) => text(sound.bpm ?? ""),
  key: (sound) => text(sound.key),
  duration: (sound) => text(formatDuration(sound.duration))
};
function renderRow(sound, index, o, id) {
  const s = o.strings;
  const vars = { title: sound.title };
  const cells = o.columns.map((c) => h("span", { class: `ws-cell ws-${c}` }, CELLS[c](sound)));
  const summary = rowSummary(sound, o.columns, s);
  const described = summary ? `${id}-d${index}` : null;
  return h(
    "li",
    { class: "ws-row", "data-ws-index": index },
    h(
      "button",
      { type: "button", class: "ws-play", "aria-pressed": "false", "aria-label": fill(s.play, vars), "aria-describedby": described },
      icon(id, "play", "ws-icon-play"),
      icon(id, "pause", "ws-icon-pause")
    ),
    h(
      "span",
      { class: "ws-cell ws-title" },
      h("span", { class: "ws-title-text" }, text(sound.title)),
      // A loop says so beside its name (and in the read-out); a one-shot carries nothing.
      sound.loop && h("span", { class: "ws-loop-mark", title: s.isLoop, "aria-hidden": "true" }, icon(id, "loop"))
    ),
    // Wide rows: `display: contents` makes each cell a column. Narrow
    // rows: one line under the title.
    cells.length > 0 && h("span", { class: "ws-cells", "aria-hidden": "true" }, cells),
    summary && h("span", { class: "ws-sr", id: described }, text(summary)),
    o.player === "inline" && h("span", { class: "ws-wave", "aria-hidden": "true" }, h("canvas", { class: "ws-canvas" })),
    // Optional, per sound: a plain link. Rows without one carry nothing.
    sound.download && h("a", { class: "ws-download", href: sound.download, download: true, "aria-label": fill(s.download, vars) }, icon(id, "download"))
  );
}
function renderSoundsData(list) {
  const data = list.map((s, i) => {
    const d = {};
    if (s.id !== `sound-${i + 1}`) d.id = s.id;
    d.url = s.url;
    d.title = s.title;
    if (s.type) d.type = s.type;
    if (s.bpm != null) d.bpm = s.bpm;
    if (s.key) d.key = s.key;
    if (s.duration != null) d.duration = s.duration;
    if (s.tags.length) d.tags = s.tags;
    if (s.peaks) d.peaks = encodePeaks(s.peaks);
    if (s.waveform) d.waveform = s.waveform;
    if (s.download) d.download = s.download;
    if (s.loop) d.loop = true;
    return d;
  });
  return `<script type="application/json" data-ws-sounds>${JSON.stringify(data).replace(/</g, "\\u003c")}<\/script>`;
}
function iconsUsed(plan, list) {
  const names = [];
  if (list.length) names.push("play", "pause");
  if (plan.search) names.push("search");
  if (plan.types === "menu" || plan.key || plan.sorts.length) names.push("chevron", "check");
  else if (plan.bpm) names.push("chevron");
  if (plan.loop || list.some((s) => s.loop)) names.push("loop");
  if (list.some((s) => s.download)) names.push("download");
  return names;
}
function renderFooter({ o, s, total }) {
  const page = o.pageSize > 0 ? o.pageSize : total;
  const more = Math.max(0, total - page);
  const strip = o.player === "strip";
  return [
    h(
      "p",
      { class: "ws-empty", "data-ws-empty": true, hidden: true },
      text(s.empty),
      " ",
      h("button", { type: "button", class: "ws-clear", "data-ws-clear": true }, text(s.clear))
    ),
    h("button", { type: "button", class: "ws-more", "data-ws-more": true, hidden: more === 0 }, text(fill(s.showMore, { count: Math.min(more, page) }))),
    h("div", { class: strip ? "ws-engine ws-engine--strip" : "ws-engine", "data-ws-engine": true, hidden: !strip }),
    h("p", { class: "ws-sr", "data-ws-status": true, "aria-live": "polite" })
  ].join("");
}
function renderSounds(sounds, options = {}) {
  return renderList(normalizeSounds(sounds), options, true);
}
function renderList(list, options, withData) {
  const o = resolveRenderOptions(options);
  const ctx = { o, s: o.strings, f: facets(list, o), total: list.length, id: o.idPrefix || idBase(list) };
  const plan = toolbarPlan(ctx.f, o);
  const index = new Map(list.map((sound, i) => [sound, i]));
  const first = sortSounds(list, availableSorts(o.sorts, ctx.f)[0] || "default").slice(0, firstRender(o.pageSize));
  return iconSprite(ctx.id, iconsUsed(plan, list)) + renderToolbar(plan, ctx) + h(
    "ul",
    { class: `ws-list ws-list--${o.player}`, role: "list", "data-ws-list": true },
    first.map((sound) => renderRow(sound, index.get(sound), o, ctx.id))
  ) + renderFooter(ctx) + (withData ? renderSoundsData(list) : "");
}
function renderOptionAttributes(options = {}) {
  const set = pickRenderOptions(options);
  const o = resolveRenderOptions(options);
  const out = {};
  for (const key of RENDER_OPTION_KEYS) {
    if (key === "player" || !(key in set)) continue;
    const name = `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    if (key === "strings") {
      const strings = defined(set.strings);
      if (Object.keys(strings).length) out[name] = JSON.stringify(strings);
    } else if (key === "loop" || key === "idPrefix") {
      out[name] = String(set[key]);
    } else {
      const value = o[key];
      out[name] = Array.isArray(value) ? value.join(",") : String(value);
    }
  }
  return out;
}
function renderSoundsElement(sounds, options = {}, className = "") {
  const o = resolveRenderOptions(options);
  const cls = ["waveform-sounds", `waveform-sounds--${o.player}`, className].filter(Boolean).join(" ");
  return h("div", { class: cls, "data-waveform-sounds": true, "data-player": o.player, ...renderOptionAttributes(options) }, renderSounds(sounds, options));
}

// src/js/dom/rows.ts
var ROW = ":scope > [data-ws-index]";
function readSoundsData(root) {
  const script = root.querySelector(":scope > script[data-ws-sounds]");
  if (!script) return null;
  try {
    const list = JSON.parse(script.textContent || "");
    if (Array.isArray(list)) return normalizeSounds(list);
  } catch {
  }
  console.warn(`${LOG} Ignoring unreadable sounds JSON (data-ws-sounds)`);
  return null;
}
function readRows(list) {
  const rows = [...list.querySelectorAll(ROW)].sort((a, b) => Number(a.dataset.wsIndex) - Number(b.dataset.wsIndex));
  const sounds = [];
  for (const row of rows) {
    const d = row.dataset;
    const sound = normalizeSound({
      id: d.wsId,
      url: d.url,
      title: d.title,
      type: d.type,
      bpm: d.bpm,
      key: d.key,
      duration: d.duration,
      tags: d.tags,
      peaks: d.peaks,
      waveform: d.waveform,
      download: d.download,
      loop: d.loop
    }, sounds.length);
    if (!sound) {
      row.remove();
      continue;
    }
    row.dataset.wsIndex = String(sounds.length);
    sounds.push(sound);
  }
  return sounds;
}
function indexRows(list) {
  const rows = [];
  list.querySelectorAll(ROW).forEach((row) => {
    rows[Number(row.dataset.wsIndex)] = row;
  });
  return rows;
}
function visibleRows(list) {
  return [...list.querySelectorAll(ROW)].filter((r) => !r.hidden);
}
function layoutRows(list, rows) {
  const keep = new Set(rows);
  for (const el of [...list.children]) if (!keep.has(el)) el.remove();
  let cursor = list.firstElementChild;
  for (const row of rows) {
    if (row === cursor) cursor = cursor.nextElementSibling;
    else list.insertBefore(row, cursor);
  }
}

// src/js/dom/colors.ts
function parseAlpha(color) {
  const c = String(color ?? "").trim();
  if (!c || c === "transparent") return 0;
  const slash = c.match(/\/\s*([\d.]+)(%?)\s*\)$/);
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1);
  const rgba = c.match(/^rgba\(\s*[^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/);
  if (rgba) return Number(rgba[1]);
  return 1;
}
function pageSurface(el, minAlpha = 0.95) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement || node.getRootNode?.().host) {
    const bg = getComputedStyle(node).backgroundColor;
    if (parseAlpha(bg) > minAlpha) return bg;
  }
  return "#fff";
}
function forcedColors() {
  try {
    return typeof matchMedia === "function" && matchMedia("(forced-colors: active)").matches;
  } catch {
    return false;
  }
}
function ancestorsOf(el) {
  const out = [];
  for (let node = el.parentElement || el.getRootNode?.()?.host; node; node = node.parentElement || node.getRootNode?.()?.host) out.push(node);
  return out;
}
function resolveCssColor(container, value) {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;forced-color-adjust:none";
  probe.style.color = value;
  container.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

// src/js/data/url-state.ts
function urlKeys(urlState) {
  if (!urlState) return null;
  const p = typeof urlState === "string" ? `${urlState}-` : "";
  return { q: `${p}q`, type: `${p}type`, key: `${p}key`, bpm: `${p}bpm`, loop: `${p}loop`, sort: `${p}sort` };
}
function parseBpmRange(value) {
  const m = String(value ?? "").match(/^(\d+(?:\.\d+)?)?-(\d+(?:\.\d+)?)?$/);
  if (!m || !(m[1] || m[2])) return null;
  const lo = m[1] ?? "", hi = m[2] ?? "";
  return lo && hi && Number(lo) > Number(hi) ? { bpmMin: hi, bpmMax: lo } : { bpmMin: lo, bpmMax: hi };
}
function bpmRangeWithin(range, extent) {
  if (!extent) return null;
  const inside = (v) => v !== "" && Number(v) >= extent.min && Number(v) <= extent.max ? v : "";
  const out = { bpmMin: inside(range.bpmMin), bpmMax: inside(range.bpmMax) };
  return out.bpmMin || out.bpmMax ? out : null;
}
function formatBpmRange(min, max) {
  const lo = min ?? "", hi = max ?? "";
  return lo !== "" || hi !== "" ? `${lo}-${hi}` : "";
}
function readUrlState(search, keys, available, sorts, options = {}) {
  const out = { filter: {}, sort: null };
  if (!keys) return out;
  const sp = new URLSearchParams(search);
  const q = sp.get(keys.q);
  if (q) out.filter.query = q;
  const type = sp.get(keys.type);
  if (type && available.types.some((t) => t.name === type)) out.filter.type = type;
  const key = keyEntry(normalizeKey(sp.get(keys.key)), available.keys, options.mergeEnharmonicKeys !== false);
  if (key) out.filter.key = key;
  const parsed = parseBpmRange(sp.get(keys.bpm));
  const bpm = parsed && available.bpm !== void 0 ? bpmRangeWithin(parsed, available.bpm) : parsed;
  if (bpm) Object.assign(out.filter, bpm);
  const loop = sp.get(keys.loop);
  if (LOOP_FILTERS.includes(loop) && available.loops > 0 && available.oneShots > 0) out.filter.loop = loop;
  const sort = sp.get(keys.sort);
  if (sort && sorts.includes(sort)) out.sort = sort;
  return out;
}
function writeUrlState(href, keys, filter, sort, defaultSort) {
  if (!keys) return href;
  const url = new URL(href);
  const set = (name, v) => v ? url.searchParams.set(name, v) : url.searchParams.delete(name);
  set(keys.q, String(filter.query ?? "").trim());
  set(keys.type, filter.type);
  set(keys.key, filter.key);
  set(keys.bpm, formatBpmRange(filter.bpmMin, filter.bpmMax));
  set(keys.loop, filter.loop);
  set(keys.sort, sort !== defaultSort ? sort : "");
  return url.href;
}

// src/js/core/WaveformSounds.ts
var NO_FILTER = Object.freeze({ query: "", type: "", key: "", bpmMin: "", bpmMax: "", loop: "" });
var SEARCH_DELAY = 120;
var BPM_DELAY = 200;
var URL_DELAY = 250;
var WaveformSounds = class _WaveformSounds extends EventTarget {
  /** Every live instance, by its element. */
  static instances = /* @__PURE__ */ new Map();
  /**
   * @param {HTMLElement|string} container - The element (or a selector).
   * @param {WaveformSoundsOptions} [options]
   */
  constructor(container, options = {}) {
    super();
    const el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) throw new Error(`${LOG} Container not found: ${container}`);
    this.container = el;
    const data = el._wsOptions?.() ?? readDataOptions(el);
    this.options = mergeOptions(DEFAULT_OPTIONS, options, data);
    this.options.waveformStyle = this.options.waveformStyle === "bars" ? "bars" : "mirror";
    this.strings = { ...DEFAULT_STRINGS, ...this.options.strings || {} };
    this.render = { ...resolveRenderOptions(this.options), strings: this.strings };
    this.sounds = [];
    this.rows = [];
    this.filter = { ...NO_FILTER };
    this.sortBy = "default";
    this.limit = this._pageSize();
    this._budget = this._firstBudget();
    this._index = /* @__PURE__ */ new Map();
    this._failed = /* @__PURE__ */ new Set();
    this.currentIndex = null;
    this.playing = false;
    this.progress = 0;
    this.loop = !!this.options.loop;
    this.engine = null;
    this.menus = null;
    this.destroyed = false;
    this._ctl = new AbortController();
    this._originalHTML = null;
    this._pendingSeek = null;
    this._raf = 0;
    _WaveformSounds.instances.set(el, this);
    el.dataset.wsInitialized = "true";
    this.ready = Promise.resolve().then(() => this._init()).catch((err) => {
      if (this.destroyed) return;
      console.error(`${LOG} Failed to initialise:`, err);
      this._showLoadError();
      this._emit("error", { error: err });
      this.options.onError?.(err, this);
    });
  }
  /* ── Setup ─────────────────────────────────────────────────────────── */
  /**
   * Adopt server-rendered markup or render it (from `sounds` or a fetched
   * manifest), then wire everything up.
   * @internal
   */
  async _init() {
    const el = this.container;
    const adopted = el.querySelector("[data-ws-list]");
    if (adopted) {
      this._adoptedHTML = el.innerHTML;
      this.sounds = readSoundsData(el) ?? readRows(adopted);
    } else {
      this._originalHTML = el.innerHTML;
      this.sounds = await this._loadSounds();
      if (this.destroyed) return;
      el.innerHTML = renderList(this.sounds, { ...this.render, idPrefix: this.options.idPrefix || el.id || void 0 }, false);
    }
    if (this.destroyed) return;
    this._index = new Map(this.sounds.map((sound, i) => [sound, i]));
    this._addedClasses = ["waveform-sounds", `waveform-sounds--${this.render.player}`].filter((c) => !el.classList.contains(c));
    el.classList.add(...this._addedClasses);
    this._facets = facets(this.sounds, this.render);
    this._cacheRefs();
    this._bind();
    this._observe();
    this._resolveColors();
    if (!this._loopSet) this.loop = loopsByDefault(this.options.loop, this._facets);
    this._setLoop(this.loop);
    this._bpmExtent = bpmExtent(this._facets.bpm);
    this._sorts = availableSorts(this.render.sorts, this._facets);
    if (!this._sortSet) this.sortBy = this._sorts[0] || "default";
    this._readUrl();
    this.filter = { ...this.filter, key: this._keyEntry(this.filter.key) };
    this._syncControls();
    this._apply();
    if (this._playerClass()) this._ensureEngine();
    if (this.render.player === "strip" && this.engine && this.currentIndex == null) this._cueFirst();
    this._emit("ready", { sounds: this.sounds.length });
    this.options.onReady?.(this);
  }
  /**
   * The sounds from the `sounds` option, else the `manifest` URL.
   * @internal
   */
  async _loadSounds() {
    if (this.options.sounds || !this.options.manifest) return normalizeSounds(this.options.sounds || []);
    const url = this.options.manifest;
    const res = await fetch(url, { signal: this._ctl.signal });
    if (!res.ok) throw new Error(`${LOG} Manifest ${url}: HTTP ${res.status}`);
    const manifest = await res.json();
    if (!Array.isArray(manifest) && !Array.isArray(manifest?.sounds)) throw new Error(`${LOG} Manifest ${url}: no "sounds" list`);
    return parseManifest(manifest);
  }
  /**
   * A build that failed (the manifest 404s, isn't JSON, isn't a manifest)
   * says so where the list would be — unless the container holds the
   * site's own fallback, which stays. destroy() restores what was there.
   * @internal
   */
  _showLoadError() {
    const el = this.container;
    if (this.$ || el.querySelector("*")) return;
    this._originalHTML ??= el.innerHTML;
    el.innerHTML = h("p", { class: "ws-empty ws-load-error", role: "alert", "data-ws-load-error": true }, text(this.strings.loadError));
  }
  /**
   * Look up the elements the runtime drives.
   * @internal
   */
  _cacheRefs() {
    const q = (sel) => this.container.querySelector(sel);
    this.$ = {
      list: q("[data-ws-list]"),
      search: q("[data-ws-search]"),
      bpmMin: q("[data-ws-bpm-min]"),
      bpmMax: q("[data-ws-bpm-max]"),
      bpmRange: q("[data-ws-bpm-range]"),
      bpmReadout: q("[data-ws-bpm-readout]"),
      bpmClear: q("[data-ws-bpm-clear]"),
      bpmLabel: q('[data-ws-menu="bpm"] [data-ws-menu-value]'),
      loop: q("[data-ws-loop]"),
      count: q("[data-ws-count]"),
      empty: q("[data-ws-empty]"),
      more: q("[data-ws-more]"),
      engine: q("[data-ws-engine]"),
      status: q("[data-ws-status]"),
      chips: [...this.container.querySelectorAll("[data-ws-type]")],
      loopFilter: [...this.container.querySelectorAll("[data-ws-loop-filter]")]
    };
    const sprite = q("[data-ws-sprite]");
    this._iconId = sprite?.dataset.wsSprite ?? (this.options.idPrefix || this.container.id || idBase(this.sounds));
    if (!sprite) this.$.list.insertAdjacentHTML("beforebegin", iconSprite(this._iconId, ICON_NAMES));
    this.rows = [];
    this._active = null;
    for (const row of indexRows(this.$.list)) if (row) this._adoptRow(row);
  }
  /**
   * Take a row (server-rendered, or just rendered) into the list's
   * keeping: its index, its Tab stops off, the state of its sound (current,
   * failed), and the observer that draws it.
   * @internal
   */
  _adoptRow(row) {
    const i = Number(row.dataset.wsIndex);
    this.rows[i] = row;
    this._rowStops(row, false);
    const wave = row.querySelector(".ws-wave");
    if (i === this.currentIndex || this._failed.has(i) || wave?.hasAttribute("role")) this._paintRow(i);
    if (i === this.currentIndex) this._paintSlider();
    if (this._io) this._io.observe(row);
    else this._drawn?.add(i);
  }
  /**
   * Rows for these sounds, rendered (in one pass) where they have none.
   * @returns The rows, in the order given.
   * @internal
   */
  _rowsFor(indices) {
    const missing = indices.filter((i) => !this.rows[i]);
    if (missing.length) {
      const tpl = document.createElement("template");
      tpl.innerHTML = missing.map((i) => renderRow(this.sounds[i], i, this.render, this._iconId)).join("");
      for (const row of [...tpl.content.children]) this._adoptRow(row);
    }
    return indices.map((i) => this.rows[i]);
  }
  /**
   * Make a row's own controls (play, download, and the seek slider when it
   * is the current sound) Tab stops, or not.
   * @internal
   */
  _rowStops(row, on) {
    const play = row.querySelector(".ws-play");
    if (play) play.tabIndex = on ? 0 : -1;
    const dl = row.querySelector(".ws-download");
    if (dl) dl.tabIndex = on ? 0 : -1;
    const wave = row.querySelector(".ws-wave");
    if (wave && Number(row.dataset.wsIndex) === this.currentIndex) wave.tabIndex = on ? 0 : -1;
  }
  /**
   * Move the list's Tab stop to `row` (roving tabindex).
   * @internal
   */
  _rove(row) {
    if (!row || row === this._active) return;
    if (this._active) this._rowStops(this._active, false);
    this._active = row;
    this._rowStops(row, true);
  }
  /**
   * Every listener. All are removed by `destroy()` through one
   * AbortController.
   * @internal
   */
  _bind() {
    const sig = { signal: this._ctl.signal };
    const $ = this.$;
    const root = this.container;
    root.addEventListener("click", (e) => this._onClick(e), sig);
    root.addEventListener("pointerdown", (e) => this._onPointerDown(e), sig);
    root.addEventListener("keydown", (e) => this._onKey(e), sig);
    $.list.addEventListener("focusin", (e) => this._rove(e.target.closest("[data-ws-index]")), sig);
    let searchTimer = 0, bpmTimer = 0;
    $.search?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.setFilter({ query: $.search.value }), SEARCH_DELAY);
    }, sig);
    $.search?.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._focusRow(visibleRows($.list)[0]);
      }
      if (e.key === "Escape" && $.search.value) {
        e.preventDefault();
        $.search.value = "";
        this.setFilter({ query: "" });
      }
    }, sig);
    const onBpm = (moved) => {
      const lo = Number($.bpmMin.value), hi = Number($.bpmMax.value);
      if (lo > hi) moved.value = String(moved === $.bpmMin ? hi : lo);
      const f = bpmFilterFromRange(Number($.bpmMin.value), Number($.bpmMax.value), this._bpmExtent);
      this._showBpm(f);
      clearTimeout(bpmTimer);
      bpmTimer = setTimeout(() => this.setFilter(f), BPM_DELAY);
    };
    $.bpmMin?.addEventListener("input", () => onBpm($.bpmMin), sig);
    $.bpmMax?.addEventListener("input", () => onBpm($.bpmMax), sig);
    $.bpmClear?.addEventListener("click", () => {
      clearTimeout(bpmTimer);
      this.setFilter({ bpmMin: "", bpmMax: "" });
    }, sig);
    this.menus = new Menus(root, {
      signal: this._ctl.signal,
      onPick: (name, value) => name === "sort" ? this.setSort(value) : this.setFilter({ [name]: value })
    });
    document.addEventListener("waveformplayer:play", (e) => {
      const player = e.detail?.player;
      if (player && player !== this.engine && this.playing) this.pause();
    }, sig);
  }
  /* ── Input ────────────────────────────────────────────────────────── */
  /**
   * Clicks: type chips, loops or one-shots, Show more, Clear, Loop, a touch tap on a waveform
   * (seek), and anywhere else on a row (play/pause).
   * @internal
   */
  _onClick(e) {
    const t = e.target;
    const chip = t.closest("[data-ws-type]");
    if (chip) {
      this.setFilter({ type: chip.dataset.wsType });
      return;
    }
    const seg = t.closest("[data-ws-loop-filter]");
    if (seg) {
      this.setFilter({ loop: seg.dataset.wsLoopFilter });
      return;
    }
    if (t.closest("[data-ws-more]")) {
      this._showMoreFromButton();
      return;
    }
    if (t.closest("[data-ws-clear]")) {
      this.clearFilters();
      if (this.$.search) this.$.search.focus();
      else this._focusRow(visibleRows(this.$.list)[0]);
      return;
    }
    if (t.closest("[data-ws-loop]")) {
      this.setLoop(!this.loop);
      return;
    }
    const wave = t.closest(".ws-wave");
    if (wave) {
      if (this._lastPointer === "touch") this._seekAt(wave, e.clientX);
      return;
    }
    const row = t.closest("[data-ws-index]");
    if (!row || t.closest(".ws-download")) return;
    this.toggle(Number(row.dataset.wsIndex));
    this._focusRowQuietly(row);
  }
  /**
   * "Show more", pressed: reveal the next page. When that was the last page
   * the button hides, so focus moves to the first row it revealed rather
   * than falling to <body>.
   * @internal
   */
  _showMoreFromButton() {
    const before = new Set(visibleRows(this.$.list));
    this.showMore();
    if (this.$.more?.hidden) this._focusRow(visibleRows(this.$.list).find((r) => !before.has(r)));
  }
  /**
   * Mouse and pen seek on PRESS, like every scrubber. Remembers the
   * pointer type for the click that follows.
   * @internal
   */
  _onPointerDown(e) {
    this._lastPointer = e.pointerType;
    const wave = e.target.closest(".ws-wave");
    if (!wave || e.button !== 0 || e.pointerType === "touch") return;
    e.preventDefault();
    this._seekAt(wave, e.clientX);
  }
  /**
   * Seek (or start) a row's sound where its waveform was pressed.
   * @internal
   */
  _seekAt(wave, clientX) {
    const row = wave.closest("[data-ws-index]");
    this._seekRow(Number(row.dataset.wsIndex), pointerFraction(clientX, wave.getBoundingClientRect()));
    this._focusRowQuietly(row);
  }
  /**
   * Keys on the list: `/` focuses search; ↑/↓/Home/End move between rows
   * (auditioning while something plays); ←/→ seek the playing row, and on
   * its seek slider Home/End seek to the start/end.
   * @internal
   */
  _onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "/" && !isTyping(e.target) && this.$.search) {
      e.preventDefault();
      this.$.search.focus();
      return;
    }
    const row = e.target.closest?.("[data-ws-index]");
    if (!row) return;
    const index = Number(row.dataset.wsIndex);
    const edge = e.target.closest(".ws-wave") ? sliderEdgeTarget(e.key) : null;
    const seek = edge ?? seekTarget(this.progress, e.key);
    if (seek !== null) {
      if (index !== this.currentIndex || !this.engine) return;
      e.preventDefault();
      this._seekRow(index, seek);
      return;
    }
    const shown = this._shown ?? [];
    const target = rowTarget(e.key, shown.indexOf(this.sounds[index]), Math.min(shown.length, this.limit));
    if (target === null) return;
    e.preventDefault();
    if (target === "search") {
      this.$.search?.focus();
      return;
    }
    this._focusRow(this._reveal(target));
    if (this.options.arrowAudition && this.playing) this.play(this._index.get(shown[target]));
  }
  /**
   * The row at position `pos` of the matching sounds, revealing it first:
   * past the page, the page grows to it (as `next()` always did); with
   * paging off, rows are rendered up to it.
   * @internal
   */
  _reveal(pos) {
    const sound = this._shown?.[pos];
    if (!sound) return void 0;
    const limit = limitToReveal(this.limit, pos);
    if (limit !== this.limit) {
      this.limit = limit;
      this._apply();
    } else if (this.limit === Infinity && pos >= this._budget) {
      this._budget = budgetToReveal(this._budget, pos);
      this._layout();
    }
    return this.rows[this._index.get(sound)];
  }
  /**
   * Focus a row's play button.
   * @internal
   */
  _focusRow(row) {
    row?.querySelector(".ws-play")?.focus();
  }
  /**
   * After a mouse or touch play, put focus on that row's play button so
   * the arrow keys drive the list instead of scrolling the page (a click
   * on the title or waveform left focus on <body>, and Safari never
   * focuses a clicked button). No scroll jump, and no focus ring: the
   * browser shows none for a focus that follows a pointer.
   * @internal
   */
  _focusRowQuietly(row) {
    const btn = row?.querySelector(".ws-play");
    if (btn && document.activeElement !== btn) btn.focus({ preventScroll: true });
  }
  /* ── Drawing & colours ────────────────────────────────────────────── */
  /**
   * Draw row canvases as they scroll into view; redraw on resize and on
   * theme flips (the canvas can't follow CSS by itself).
   * @internal
   */
  _observe() {
    if (this.render.player !== "inline" || typeof window === "undefined") return;
    this._drawn = /* @__PURE__ */ new Set();
    this._dirty = /* @__PURE__ */ new Set();
    if ("IntersectionObserver" in window) {
      this._onScreen = /* @__PURE__ */ new Set();
      this._io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const i = Number(entry.target.dataset.wsIndex);
          if (!entry.isIntersecting) {
            this._onScreen.delete(i);
            continue;
          }
          this._onScreen.add(i);
          if (this._drawn.has(i) && !this._dirty.has(i)) continue;
          this._drawn.add(i);
          this._drawRow(i);
        }
      }, { rootMargin: "200px 0px" });
      this.rows.forEach((r) => r && this._io.observe(r));
    } else {
      this.rows.forEach((r, i) => r && this._drawn.add(i));
    }
    if ("ResizeObserver" in window) {
      let width = 0;
      this._ro = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        if (w === width) return;
        width = w;
        this._redrawAll();
      });
      this._ro.observe(this.$.list);
    }
    let queued = 0;
    const refresh = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        if (this._resolveColors()) this._redrawAll();
      });
    };
    this._mo = new MutationObserver(refresh);
    this._mo.observe(this.container, { attributes: true, attributeFilter: ["class", "data-theme", "data-color-scheme"] });
    for (const node of ancestorsOf(this.container)) {
      this._mo.observe(node, { attributes: true, attributeFilter: ["class", "data-theme", "data-color-scheme", "style"] });
    }
    for (const query of ["(prefers-color-scheme: dark)", "(forced-colors: active)"]) {
      try {
        window.matchMedia(query).addEventListener("change", refresh, { signal: this._ctl.signal });
      } catch {
      }
    }
  }
  /**
   * Resolve the canvas colours (options, else the CSS custom properties;
   * system colours under forced colours) and keep `--ws-surface` current
   * unless the site set it.
   * @returns Whether the canvas colours changed.
   * @internal
   */
  _resolveColors() {
    const before = this.colors;
    if (this._autoSurface || !getComputedStyle(this.container).getPropertyValue("--ws-surface").trim()) {
      this._autoSurface = true;
      this.container.style.removeProperty("--ws-surface");
      this.container.style.setProperty("--ws-surface", pageSurface(this.container));
    }
    const forced = forcedColors();
    this.colors = {
      wave: (forced ? resolveCssColor(this.container, "CanvasText") : this.options.waveformColor || resolveCssColor(this.container, "var(--ws-wave-color)")) || "rgba(128,128,128,.5)",
      progress: (forced ? resolveCssColor(this.container, "Highlight") : this.options.progressColor || resolveCssColor(this.container, "var(--ws-progress-color)")) || "currentColor"
    };
    return !before || before.wave !== this.colors.wave || before.progress !== this.colors.progress;
  }
  /**
   * Draw one row's waveform (only once it has been on screen).
   * @internal
   */
  _drawRow(index) {
    if (this.render.player !== "inline" || index == null || !this._drawn?.has(index)) return;
    const row = this.rows[index];
    const canvas = row?.querySelector("canvas");
    if (!canvas) return;
    if (!row.isConnected) {
      this._dirty?.add(index);
      return;
    }
    this._dirty?.delete(index);
    const gap = Number(this.options.barGap);
    drawRowWaveform(canvas, this.sounds[index].peaks, index === this.currentIndex ? this.progress : 0, {
      style: this.options.waveformStyle,
      color: this.colors?.wave || "rgba(128,128,128,.5)",
      progressColor: this.colors?.progress || "currentColor",
      barWidth: Math.max(1, Number(this.options.barWidth) || 2),
      barGap: Number.isFinite(gap) ? Math.max(0, gap) : 1
    });
  }
  /**
   * After a resize or a theme flip: redraw the rows on screen now, and
   * mark the rest stale — each is redrawn when it scrolls back in. (With
   * 1000 rows drawn, redrawing them all took ~0.4s in Chrome and ~1.9s in
   * WebKit per resize step.)
   * @internal
   */
  _redrawAll() {
    this._drawn?.forEach((i) => {
      if (this._onScreen && !this._onScreen.has(i)) this._dirty.add(i);
      else this._drawRow(i);
    });
  }
  /* ── Filters in the address ───────────────────────────────────────── */
  /**
   * Apply the filter and sort from the address (`urlState`).
   * @internal
   */
  _readUrl() {
    const keys = urlKeys(this.options.urlState);
    if (!keys || typeof location === "undefined") return;
    const f = this._facets;
    const { filter, sort } = readUrlState(location.search, keys, { ...f, bpm: bpmExtent(f.bpm) }, this._sorts, this.render);
    this.filter = { ...this.filter, ...filter };
    if (sort) {
      this.sortBy = sort;
      this._sortSet = true;
    }
  }
  /**
   * Rewrite the address shortly after a change (replaceState: no history
   * entries).
   * @internal
   */
  _queueUrl() {
    const keys = urlKeys(this.options.urlState);
    if (!keys || typeof location === "undefined") return;
    clearTimeout(this._urlTimer);
    this._urlTimer = setTimeout(() => {
      if (this.destroyed) return;
      const next = writeUrlState(location.href, keys, this.filter, this.sortBy, this._sorts?.[0] || "default");
      if (next !== location.href) history.replaceState(history.state, "", next);
    }, URL_DELAY);
  }
  /* ── Filtering, sorting, paging ───────────────────────────────────── */
  /** The sounds that pass the filter, in the current sort order. */
  get visible() {
    return [...this._shown ?? this._match()];
  }
  /**
   * Filter and sort the sounds now.
   * @internal
   */
  _match() {
    return sortSounds(this.sounds.filter((s) => matches(s, this.filter, this.render)), this.sortBy);
  }
  /**
   * A key filter in the list's own spelling: with enharmonic keys merged,
   * `A#m` on a list whose entry is `Bbm` becomes `Bbm` (so the menu and
   * the address show the entry). A key the list doesn't have stays as
   * given (it matches nothing, as before).
   * @internal
   */
  _keyEntry(key) {
    const k = normalizeKey(key);
    return this._facets && keyEntry(k, this._facets.keys, this.render.mergeEnharmonicKeys) || k;
  }
  setFilter(patch = {}) {
    this.filter = { ...this.filter, ...patch };
    if (patch.key) this.filter.key = this._keyEntry(patch.key);
    this.limit = this._pageSize();
    this._budget = this._firstBudget();
    this._syncControls();
    this._apply();
  }
  /** Reset every filter (the sort stays). */
  clearFilters() {
    this.setFilter(NO_FILTER);
  }
  /** @param by */
  setSort(by) {
    this._sortSet = true;
    this.sortBy = SORTS.includes(by) ? by : "default";
    this.menus?.setValue("sort", this.sortBy);
    this._apply();
  }
  /** Reveal the next page of results. */
  showMore() {
    if (this.limit === Infinity) return;
    this.limit += this.render.pageSize;
    this._apply();
  }
  /**
   * Rows per page (Infinity when paging is off).
   * @internal
   */
  _pageSize() {
    return this.render.pageSize > 0 ? this.render.pageSize : Infinity;
  }
  /**
   * Paging off: the rows a list (or a new filter) starts with — a chunk,
   * more as the list scrolls (see `_watchEnd`); all of them where nothing
   * can tell it scrolled (no IntersectionObserver).
   * @internal
   */
  _firstBudget() {
    return typeof IntersectionObserver === "undefined" ? Infinity : RENDER_CHUNK;
  }
  /**
   * Show the current filter and sort in the controls (they can be set from
   * code or the address, not only by the controls themselves).
   * @internal
   */
  _syncControls() {
    const $ = this.$, f = this.filter;
    if (!$) return;
    if ($.search && $.search.value !== f.query) $.search.value = f.query;
    this.menus?.setValue("type", f.type || "");
    this.menus?.setValue("key", f.key || "");
    this.menus?.setValue("sort", this.sortBy);
    if ($.bpmMin && $.bpmMax && this._bpmExtent) {
      const { lo, hi } = bpmRangeFromFilter(f, this._bpmExtent);
      $.bpmMin.value = String(lo);
      $.bpmMax.value = String(hi);
      this._showBpm(f);
    }
    $.chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.wsType === (f.type || ""))));
    $.loopFilter.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wsLoopFilter === (f.loop || ""))));
  }
  /**
   * Show a BPM filter in its menu: the button label, the panel's readout,
   * the filled part of the track, and which handle sits on top (the one
   * that can still move, when they meet).
   * @internal
   */
  _showBpm(f) {
    const $ = this.$, extent = this._bpmExtent;
    if (!$?.bpmRange || !extent) return;
    const { lo, hi } = bpmRangeFromFilter(f, extent);
    if ($.bpmLabel) $.bpmLabel.textContent = bpmLabel(f, extent, this.strings);
    if ($.bpmReadout) $.bpmReadout.textContent = fill(this.strings.bpmRange, { min: lo, max: hi });
    $.bpmRange.style.setProperty("--ws-lo", String(bpmFraction(lo, extent)));
    $.bpmRange.style.setProperty("--ws-hi", String(bpmFraction(hi, extent)));
    $.bpmRange.classList.toggle("is-min-top", lo >= hi && lo > extent.min);
    $.bpmRange.classList.toggle("is-active", lo > extent.min || hi < extent.max);
  }
  /**
   * Lay the list out for the current filter, sort and page: its rows,
   * "Show more", the empty state and the count. Then report it.
   * @internal
   */
  _apply() {
    const $ = this.$;
    if (!$) return;
    const shown = this._match();
    this._shown = shown;
    this._layout();
    const remaining = shown.length - Math.min(shown.length, this.limit);
    if ($.more) {
      $.more.hidden = remaining <= 0;
      $.more.textContent = fill(this.strings.showMore, { count: Math.min(remaining, this.render.pageSize || remaining) });
    }
    if ($.empty) {
      $.empty.hidden = shown.length > 0;
      if (!this.sounds.length && $.empty.textContent !== this.strings.noSounds) $.empty.textContent = this.strings.noSounds;
    }
    if ($.count) $.count.textContent = countText(shown.length, this.sounds.length, this.strings);
    if (this._cued && !this.playing) this._cueFirst();
    this._queueUrl();
    this._emit("filter", { visible: shown.length, total: this.sounds.length, filter: { ...this.filter }, sort: this.sortBy });
    this.options.onFilter?.(shown, this);
  }
  /**
   * Put exactly the rows shown in the list, in order: the page (or with
   * paging off the rows rendered so far) of the matching sounds. Rows are
   * rendered the first time they are shown; rows that stop being shown
   * leave the DOM (kept, with their drawing, for when they come back).
   * @internal
   */
  _layout() {
    const $ = this.$, shown = this._shown;
    const count = renderedCount(shown.length, this.limit, this._budget);
    const focused = $.list.contains(document.activeElement) ? document.activeElement : null;
    const rows = this._rowsFor(shown.slice(0, count).map((sound) => this._index.get(sound)));
    layoutRows($.list, rows);
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    if (!this._io && this._drawn) for (const row of rows) this._drawRow(Number(row.dataset.wsIndex));
    if (!this._active || !this._active.isConnected) {
      const first = rows[0];
      if (first) {
        this._rove(first);
        if (focused && !focused.isConnected) this._focusRowQuietly(first);
      } else if (this._active) {
        this._rowStops(this._active, false);
        this._active = null;
      }
    }
    this._watchEnd(count < Math.min(shown.length, this.limit) ? rows[rows.length - 1] : null);
  }
  /**
   * Render the next chunk of rows once `row` (the last one rendered) comes
   * within ~1200px of the viewport; nothing to watch for `null`.
   * @internal
   */
  _watchEnd(row) {
    this._endIo?.disconnect();
    if (!row || typeof IntersectionObserver === "undefined") return;
    this._endIo ??= new IntersectionObserver((entries) => {
      if (this.destroyed || !entries.some((entry) => entry.isIntersecting)) return;
      this._budget += RENDER_CHUNK;
      this._layout();
    }, { rootMargin: "0px 0px 1200px 0px" });
    this._endIo.observe(row);
  }
  /* ── Playback ─────────────────────────────────────────────────────── */
  /**
   * Resolve an index, id or sound to an index in `this.sounds`. No
   * target means the current sound, else the first visible one.
   *
   * @param target
   * @internal
   */
  _indexOf(target) {
    if (target == null) {
      if (this.currentIndex != null) return this.currentIndex;
      const first = (this._shown ?? this._match())[0];
      return first ? this.sounds.indexOf(first) : null;
    }
    if (typeof target === "number") return this.sounds[target] ? target : null;
    const i = typeof target === "object" ? this._index.get(target) ?? this.sounds.indexOf(target) : this.sounds.findIndex((s) => s.id === String(target));
    return i >= 0 ? i : null;
  }
  /**
   * The WaveformPlayer class: `playerClass`, else the page's global.
   * @internal
   */
  _playerClass() {
    return this.options.playerClass || (typeof window !== "undefined" ? window.WaveformPlayer : null) || null;
  }
  /**
   * The engine as the list drives it (fields the core keeps internal).
   * @internal
   */
  _eng() {
    return this.engine;
  }
  /**
   * The element the engine mounts into: a child of the engine slot, never
   * the slot itself. WaveformPlayer resets its container's `className`,
   * which would strip `ws-engine--strip` (and with it the docked styling).
   * Made here rather than in the markup so server-rendered HTML from any
   * version works.
   * @internal
   */
  _engineMount() {
    const slot = this.$.engine;
    let mount = slot.querySelector(":scope > [data-ws-engine-mount]");
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-ws-engine-mount", "");
      slot.appendChild(mount);
    }
    return mount;
  }
  /**
   * Build the engine once (it holds no audio until a play).
   * @returns The engine, or null without a player class.
   * @internal
   */
  _ensureEngine() {
    if (this.engine) return this._eng();
    const Player = this._playerClass();
    if (!Player) {
      console.error(`${LOG} @arraypress/waveform-player is required: load it before playing (or pass playerClass).`);
      return null;
    }
    const options = engineOptions(this.options.playerOptions, this.render.player, {
      onLoad: () => this._onEngineLoad(),
      onPlay: () => this._setPlaying(true),
      onPause: () => this._setPlaying(false),
      onEnd: () => this._onEnd(),
      onTimeUpdate: (time, duration) => this._onTime(time, duration),
      onError: (err) => this._onEngineError(err)
    });
    this._preload = options.preload;
    this.engine = new Player(this._engineMount(), options);
    return this._eng();
  }
  /**
   * Play a sound (by index, id or sound object), or resume the current
   * one. Before the list is built the call waits for it.
   *
   * @param target
   * @param opts - `at`: start position 0..1.
   */
  play(target, opts = {}) {
    if (!this.$) {
      this.ready.then(() => {
        if (!this.destroyed) this.play(target, opts);
      });
      return;
    }
    const index = this._indexOf(target);
    if (index == null) return;
    this._cued = false;
    const engine = this._ensureEngine();
    if (!engine) return;
    if (index === this.currentIndex && engine.audio?.src) {
      if (opts.at != null) this._seekRow(index, opts.at);
      if (!this.playing) engine.play();
      return;
    }
    const previous = this.currentIndex;
    this.currentIndex = index;
    this.progress = 0;
    this._pendingSeek = opts.at ?? null;
    if (previous != null) this._paintRow(previous);
    this._paintRow(index);
    const sound = this.sounds[index];
    engine.loadTrack(sound.url, sound.title, sound.type || null, engineTrack(sound, this.render.player, true, this._preload));
  }
  /**
   * Strip layout: load the first sound the list shows into the docked
   * player WITHOUT playing it, so the player shows a title and waveform
   * (and its play button plays that sound) instead of an empty frame.
   * Nothing is fetched (`preload: 'none'`): the player shows the title,
   * length and peaks from the data, and the audio loads on play — a filter
   * change re-cues, and each cue used to fetch a file's metadata.
   * The row isn't marked current until it plays.
   * @internal
   */
  _cueFirst() {
    const engine = this._eng();
    const first = (this._shown ?? this._match())[0];
    if (!engine || !first) return;
    const index = this.sounds.indexOf(first);
    if (index === this.currentIndex) return;
    this.currentIndex = index;
    this.progress = 0;
    this._cued = true;
    const audio = engine.audio;
    const shim = audio && typeof audio.load === "function";
    if (shim) audio.load = () => {
    };
    try {
      engine.loadTrack(first.url, first.title, first.type || null, engineTrack(first, "strip", false, "none"));
    } finally {
      if (shim) delete audio.load;
    }
  }
  /** Pause the current sound. */
  pause() {
    if (this.engine && this.playing) this._eng().pause();
  }
  /**
   * The current sound plays/pauses; another sound starts.
   * @param target
   */
  toggle(target) {
    const index = this._indexOf(target);
    if (index == null) return;
    if (index === this.currentIndex && this.playing) this.pause();
    else this.play(index);
  }
  /** Play the next visible sound (no wrap at the end). */
  next() {
    this._step(1);
  }
  /** Play the previous visible sound. */
  previous() {
    this._step(-1);
  }
  /**
   * Play the visible sound `dir` places away, revealing it if it's past
   * the current page.
   *
   * @param dir
   * @returns Whether there was one.
   * @internal
   */
  _step(dir) {
    const shown = this._shown ?? this._match();
    const at = this.currentIndex == null || this._cued ? -1 : shown.indexOf(this.sounds[this.currentIndex]);
    const target = shown[at + dir];
    if (!target) return false;
    if (this.$) this._reveal(at + dir);
    this.play(this.sounds.indexOf(target));
    return true;
  }
  /**
   * Loop the current sound (auditioning a loop is the common case). When
   * the list marks its loops (`loop: true` on any sound), only those
   * repeat: a one-shot always plays once.
   * @param on
   */
  setLoop(on) {
    this._loopSet = true;
    this.loop = !!on;
    this._setLoop(this.loop);
  }
  /**
   * Apply the loop state to the toggle and the engine.
   * @internal
   */
  _setLoop(on) {
    this.$?.loop?.setAttribute("aria-pressed", String(on));
    if (this._eng()?.audio) this._eng().audio.loop = this._repeats();
  }
  /**
   * Should the current sound repeat? The Loop toggle is on, and either
   * the list doesn't say which sounds are loops or this one is.
   * @internal
   */
  _repeats() {
    if (!this.loop) return false;
    const marksLoops = this.sounds.some((s) => s.loop);
    return !marksLoops || !!this.sounds[this.currentIndex]?.loop;
  }
  /**
   * Seek a row's sound to `fraction`; a row that isn't current starts
   * there. Before the duration is known the seek waits for it.
   * @internal
   */
  _seekRow(index, fraction) {
    if (index !== this.currentIndex || !this.engine) {
      this.play(index, { at: fraction });
      return;
    }
    const duration = this._eng().audio?.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      this._pendingSeek = fraction;
      return;
    }
    this._eng().seekTo(fraction * duration);
    this.progress = fraction;
    this._paintRow(index);
    this._paintSlider();
    if (!this.playing) this._eng().play();
  }
  /**
   * The engine loaded a sound: clear an earlier failure, apply the loop, borrow decoded peaks for a
   * row that had none, and land a pending seek.
   * @internal
   */
  _onEngineLoad() {
    if (this.currentIndex != null) this._markFailed(this.currentIndex, false);
    if (this._eng()?.audio) this._eng().audio.loop = this._repeats();
    const sound = this.sounds[this.currentIndex];
    if (sound && !sound.peaks && this._eng()?.waveformData?.length) {
      sound.peaks = resample(this._eng().waveformData, 96);
      this._drawRow(this.currentIndex);
    }
    const duration = this._eng()?.audio?.duration;
    if (this._pendingSeek != null && Number.isFinite(duration) && duration > 0) {
      this._eng().seekTo(this._pendingSeek * duration);
      this.progress = this._pendingSeek;
      this._pendingSeek = null;
    }
  }
  /**
   * Playback progress: repaint the current row, once per frame.
   * @internal
   */
  _onTime(time, duration) {
    if (this.currentIndex == null || !duration) return;
    if (this._pendingSeek != null) {
      const fraction = this._pendingSeek;
      this._pendingSeek = null;
      this._eng().seekTo(fraction * duration);
      return;
    }
    this.progress = Math.min(Math.max(time / duration, 0), 1);
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._drawRow(this.currentIndex);
      this._paintSlider();
    });
  }
  /**
   * A sound finished: report it, then auto-advance or settle.
   * @internal
   */
  _onEnd() {
    const sound = this.sounds[this.currentIndex];
    this._emit("end", { sound, index: this.currentIndex });
    this.options.onEnd?.(sound, this);
    if (this.options.autoAdvance && this._step(1)) return;
    this.progress = 0;
    this._setPlaying(false);
  }
  /**
   * A sound failed to load or play: it isn't playing (no stale "Pause"),
   * its row is marked until it plays, and the live region says so.
   * @internal
   */
  _onEngineError(err) {
    const index = this.currentIndex;
    const sound = index == null ? void 0 : this.sounds[index];
    if (index != null) this._markFailed(index, true);
    this._setPlaying(false);
    if (sound && !this._cued && this.$?.status) this.$.status.textContent = fill(this.strings.playError, { title: sound.title });
    this._emit("error", { error: err, sound, index });
    this.options.onError?.(err, this);
  }
  /**
   * Record play/pause and repaint, and report what the listener hears.
   * Events follow the SOUND, not the flag: switching sounds while one plays
   * (↓ audition, `play(i)`, `next()`, auto-advance) never flips `playing`
   * in some engines (the media element swaps source without a `pause`),
   * so the last sound announced is tracked — a different one starting
   * reports `pause` for the outgoing sound, then `play` for the new one.
   * At a natural end the browser fires `pause` then `ended`, and `_onEnd()`
   * settles the state again: one pause event, not two.
   * @internal
   */
  _setPlaying(on) {
    this.playing = on;
    if (on) this._cued = false;
    const index = this.currentIndex;
    if (index == null) return;
    if (on) this._markFailed(index, false);
    this._paintRow(index);
    const was = this._announced ?? null;
    if (on) {
      if (was === index) return;
      if (was != null) this._announce("pause", was);
      this._announced = index;
      this._announce("play", index);
    } else if (was != null) {
      this._announced = null;
      this._announce("pause", was);
    }
  }
  /**
   * Report a sound starting or stopping: the live region (on play), the
   * `waveformsounds:play|pause` event and the `onPlay` / `onPause` callback.
   * @internal
   */
  _announce(type, index) {
    const sound = this.sounds[index];
    if (!sound) return;
    if (type === "play" && this.$?.status) this.$.status.textContent = fill(this.strings.nowPlaying, { title: sound.title });
    this._emit(type, { sound, index });
    (type === "play" ? this.options.onPlay : this.options.onPause)?.(sound, this);
  }
  /* ── Row painting ─────────────────────────────────────────────────── */
  /**
   * A row's state classes, play-button label and waveform.
   * @internal
   */
  _paintRow(index) {
    const row = this.rows[index];
    if (!row) return;
    const current = index === this.currentIndex;
    const on = current && this.playing;
    row.classList.toggle("is-current", current);
    row.classList.toggle("is-playing", on);
    const btn = row.querySelector(".ws-play");
    if (btn) {
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", fill(on ? this.strings.pause : this.strings.play, { title: this.sounds[index].title }));
    }
    row.classList.toggle("is-error", this._failed.has(index));
    const wave = row.querySelector(".ws-wave");
    if (wave) this._paintWave(wave, current, row === this._active, this.sounds[index].title);
    this._drawRow(index);
  }
  /**
   * A row's waveform: the current sound's is THE seek slider (focusable,
   * labelled, with a value); every other one is a picture, hidden from
   * assistive tech and out of the Tab order (a pointer still seeks on it).
   * So a screen reader meets one slider, not one per row. Since 2.2.0.
   * @internal
   */
  _paintWave(wave, current, active, title) {
    if (!current) {
      if (wave.getAttribute("aria-hidden") === "true" && !wave.hasAttribute("role")) return;
      for (const name of ["role", "aria-label", "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext", "tabindex"]) wave.removeAttribute(name);
      wave.setAttribute("aria-hidden", "true");
      return;
    }
    wave.removeAttribute("aria-hidden");
    wave.setAttribute("role", "slider");
    wave.setAttribute("aria-label", fill(this.strings.seek, { title }));
    wave.setAttribute("aria-valuemin", "0");
    wave.setAttribute("aria-valuemax", "100");
    if (!wave.hasAttribute("aria-valuenow")) wave.setAttribute("aria-valuenow", String(Math.round(this.progress * 100)));
    wave.tabIndex = active ? 0 : -1;
  }
  /**
   * Record that a sound failed (or played after all), on its row if it
   * has one; a row rendered later picks it up from `_failed`.
   * @internal
   */
  _markFailed(index, failed) {
    if (failed) this._failed.add(index);
    else this._failed.delete(index);
    this.rows[index]?.classList.toggle("is-error", failed);
  }
  /**
   * The current row's seek slider: its position (0–100) and, for a screen
   * reader, the time ("0:12 of 0:30").
   * @internal
   */
  _paintSlider() {
    const index = this.currentIndex;
    const wave = index == null ? null : this.rows[index]?.querySelector(".ws-wave");
    if (!wave) return;
    wave.setAttribute("aria-valuenow", String(Math.round(this.progress * 100)));
    const audio = this._eng()?.audio;
    const duration = Number.isFinite(audio?.duration) && audio.duration > 0 ? audio.duration : this.sounds[index].duration;
    if (duration) wave.setAttribute("aria-valuetext", fill(this.strings.seekValue, { time: formatClock(this.progress * duration), duration: formatDuration(duration) }));
  }
  /* ── Events & lifecycle ──────────────────────────────────────────── */
  /**
   * Announce a moment both ways: a `waveformsounds:<name>` event on the
   * container carrying the details and this instance, then a plain `<name>`
   * event on the instance.
   * @internal
   */
  _emit(name, detail = {}) {
    emit(this.container, name, { ...detail, instance: this });
    this.dispatchEvent(new Event(name));
  }
  /** The sound playing (or paused) now, or null. */
  get current() {
    return this.currentIndex == null || this._cued ? null : this.sounds[this.currentIndex];
  }
  /**
   * Tear down: listeners, observers, timers and the engine. Markup this
   * instance rendered is restored to what the container held before.
   * ADOPTED (server-rendered) markup is left as it is now — rows may be
   * re-sorted, hidden or marked current — unless `restore` is set: then it
   * is put back exactly as the server sent it, ready for a new instance
   * (what a framework re-mounting the same markup wants).
   *
   * @param options
   * @param options.restore - Put adopted server markup back as it was.
   *   Default false. Since 2.1.0.
   */
  destroy(options = {}) {
    if (this.destroyed) return;
    this.destroyed = true;
    this._ctl.abort();
    this._io?.disconnect();
    this._endIo?.disconnect();
    this._ro?.disconnect();
    this._mo?.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
    clearTimeout(this._urlTimer);
    try {
      this._eng()?.destroy();
    } catch {
    }
    this.engine = null;
    this.$?.engine?.querySelector(":scope > [data-ws-engine-mount]")?.remove();
    if (this._originalHTML != null) this.container.innerHTML = this._originalHTML;
    else if (options.restore && this._adoptedHTML != null) this.container.innerHTML = this._adoptedHTML;
    if (this._addedClasses?.length) this.container.classList.remove(...this._addedClasses);
    if (this._autoSurface) this.container.style.removeProperty("--ws-surface");
    delete this.container.dataset.wsInitialized;
    _WaveformSounds.instances.delete(this.container);
  }
  /**
   * Initialise every `[data-waveform-sounds]` under `root` that isn't yet.
   *
   * @param root
   * @returns The new instances.
   */
  static init(root = document) {
    if (typeof document === "undefined") return [];
    const scope = root || document;
    const els = [...scope.matches?.("[data-waveform-sounds]") ? [scope] : [], ...scope.querySelectorAll("[data-waveform-sounds]")];
    const created = [];
    for (const el of els) {
      if (el.dataset.wsInitialized === "true" || _WaveformSounds.instances.has(el)) continue;
      try {
        created.push(new _WaveformSounds(el));
      } catch (err) {
        console.error(`${LOG} Failed to initialise:`, err, el);
      }
    }
    return created;
  }
  /**
   * The instance on an element (or selector), if any.
   * @param el
   */
  static getInstance(el) {
    const node = typeof el === "string" ? document.querySelector(el) : el;
    return node ? _WaveformSounds.instances.get(node) || null : null;
  }
  /** Destroy instances whose element has left the document (after a
   *  client-side navigation). */
  static prune() {
    for (const [el, inst] of _WaveformSounds.instances) if (!el.isConnected) inst.destroy();
  }
};

// src/js/core/element.ts
var ELEMENT_OPTION_KEYS = [
  "player",
  "manifest",
  "search",
  "filters",
  "sorts",
  "showCount",
  "menuSearch",
  "idPrefix",
  "urlState",
  "loopToggle",
  "pageSize",
  "maxTypeChips",
  "columns",
  "waveformStyle",
  "waveformColor",
  "progressColor",
  "barWidth",
  "barGap",
  "loop",
  "autoAdvance",
  "arrowAudition",
  "strings",
  "playerOptions",
  "mergeEnharmonicKeys"
];
var kebab = (key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
function readElementOptions(el) {
  const dataset = {};
  for (const key of ELEMENT_OPTION_KEYS) {
    const name = kebab(key);
    const value = el.getAttribute(name) ?? el.getAttribute(`data-${name}`);
    if (value != null) dataset[key] = value;
  }
  return readDataOptions({ dataset });
}
var Base = typeof HTMLElement === "undefined" ? class {
} : HTMLElement;
var WaveformSoundsElement = class extends Base {
  /** Every option attribute, plain and `data-` prefixed. */
  static get observedAttributes() {
    return ELEMENT_OPTION_KEYS.flatMap((key) => [kebab(key), `data-${kebab(key)}`]);
  }
  /** Build the list (or keep it, after a move). */
  connectedCallback() {
    if (this._leaving !== void 0) {
      clearTimeout(this._leaving);
      this._leaving = void 0;
      return;
    }
    if (!this.sounds) this._build();
  }
  /** Destroy the list, unless the element comes straight back (a move). */
  disconnectedCallback() {
    clearTimeout(this._leaving);
    this._leaving = setTimeout(() => {
      this._leaving = void 0;
      if (!this.isConnected) this._teardown();
    }, 0);
  }
  /**
   * An option attribute changed: rebuild once the task's changes are in.
   *
   * @param name
   * @param previous
   * @param value
   */
  attributeChangedCallback(name, previous, value) {
    if (!this.sounds || previous === value) return;
    const kind = name.replace(/^data-/, "") === "manifest" ? "manifest" : "rebuild";
    if (this._pending) {
      if (kind === "manifest") this._pending = kind;
      return;
    }
    this._pending = kind;
    queueMicrotask(() => {
      const pending = this._pending;
      this._pending = void 0;
      if (this.sounds) this._rebuild(pending === "manifest");
    });
  }
  /**
   * The options the list reads off this element (`WaveformSounds` calls it
   * in place of reading `data-*` alone).
   * @internal
   */
  _wsOptions() {
    return readElementOptions(this);
  }
  /**
   * Build the list into the element.
   * @internal
   */
  _build(options = {}) {
    WaveformSounds.getInstance(this)?.destroy({ restore: true });
    try {
      this.sounds = new WaveformSounds(this, options);
    } catch (error) {
      this.sounds = null;
      console.error(`${LOG} Failed to initialise:`, error, this);
    }
  }
  /**
   * Destroy the list, putting server-rendered markup back as it came.
   * @internal
   */
  _teardown() {
    this.sounds?.destroy({ restore: true });
    this.sounds = null;
  }
  /**
   * Rebuild for new options: re-rendered from the sounds the list holds
   * (the markup must follow the new options), or fetched afresh when the
   * manifest changed.
   * @internal
   */
  _rebuild(refetch) {
    const sounds = refetch || !this.sounds.$ ? void 0 : this.sounds.sounds.slice();
    this._teardown();
    this.innerHTML = "";
    this._build(sounds ? { sounds } : {});
  }
};
function defineWaveformSoundsElement(name = "waveform-sounds") {
  if (typeof customElements === "undefined") return void 0;
  const existing = customElements.get(name);
  if (existing) return existing;
  const element = class extends WaveformSoundsElement {
  };
  customElements.define(name, element);
  return element;
}

// src/js/entry.ts
WaveformSounds.utils = { encodePeaks, decodePeaks, normalizeKey, normalizeSounds, parseManifest, facets, matches, sortSounds, formatDuration, renderSounds };
WaveformSounds.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
WaveformSounds.DEFAULT_STRINGS = DEFAULT_STRINGS;
WaveformSounds.defineElement = defineWaveformSoundsElement;
if (typeof window !== "undefined") window.WaveformSounds = WaveformSounds;
var entry_default = WaveformSounds;
export {
  DEFAULT_OPTIONS,
  DEFAULT_STRINGS,
  RENDER_OPTION_KEYS,
  WaveformSounds,
  WaveformSoundsElement,
  decodePeaks,
  entry_default as default,
  defineWaveformSoundsElement,
  encodePeaks,
  facets,
  formatDuration,
  matches,
  normalizeKey,
  normalizeSounds,
  parseManifest,
  pickRenderOptions,
  renderSounds,
  renderSoundsElement,
  sortSounds
};
