/**
 * Intention Captions — design rules.
 *
 * Encodes the publicly described Caption with Intention rules so the studio
 * preview and the After Effects builder stay on the same numbers:
 *   attribution   six main colors, supporting hues between them, pastel minors
 *   synchronization  read-ahead white at 90%, color tracks speech, 15% pop
 *   intonation    volume → size, pitch → weight + width (Roboto Flex)
 *
 * This is an independent implementation, not the official template.
 */

export const ENGINE_VERSION = "1.0.0";

export const RULES = {
  readAheadOpacity: 0.9,
  popScale: 1.15,
  popDuration: 0.26,
  popMin: 0.12,
  // Volume 0..100 maps to a size multiplier around the baseline.
  // Kept inside a prescribed range so shouts stay legible and whispers stay readable.
  volumeScale: { low: 0.7, mid: 1, high: 1.42 },
  // Pitch 0 (low) → heavy + wide. Pitch 100 (high) → light + condensed.
  pitchWeight: { low: 780, high: 260 },
  pitchWidth: { low: 132, high: 78 },
  slantOffscreen: -8,
  maxCps: 17,
  safeWidth: 0.8,
  margin: 0.075,
  slotStep: 0.085,
};

/** Published main-character colors. High channel 229, low channel 23. */
export const MAIN_COLORS = [
  { id: "red", name: "Main Red", hex: "#E51717", hue: 0, role: "main" },
  { id: "orange", name: "Main Orange", hex: "#E57E17", hue: 30, role: "main" },
  { id: "yellow", name: "Main Yellow", hex: "#E5E517", hue: 60, role: "main" },
  { id: "green", name: "Main Green", hex: "#17E517", hue: 120, role: "main" },
  { id: "blue", name: "Main Blue", hex: "#17E5E5", hue: 180, role: "main" },
  { id: "purple", name: "Main Purple", hex: "#E517E5", hue: 300, role: "main" },
];

const SUPPORTING_HUES = [15, 45, 80, 100, 140, 160, 204, 228, 252, 276, 320, 340];
const SUPPORTING_NAMES = [
  "Amber", "Gold", "Lime", "Chartreuse", "Spring", "Teal",
  "Azure", "Cerulean", "Indigo", "Violet", "Orchid", "Rose",
];

export function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.min(1, Math.max(0, c)))
      .toString(16)
      .padStart(2, "0");
  };
  return ("#" + f(0) + f(8) + f(4)).toUpperCase();
}

function paletteFromHues(hues, names, role, s, l) {
  return hues.map((hue, i) => ({
    id: role + "-" + hue,
    name: (role === "supporting" ? "Supporting " : "Minor ") + names[i],
    hex: hslToHex(hue, s, l),
    hue,
    role,
  }));
}

/** Twelve supporting colors sitting in the gaps between the six mains. */
export const SUPPORTING_COLORS = paletteFromHues(SUPPORTING_HUES, SUPPORTING_NAMES, "supporting", 0.58, 0.6);

/** Pastels from the center of the wheel — minor and background voices. */
export const MINOR_COLORS = paletteFromHues(SUPPORTING_HUES, SUPPORTING_NAMES, "minor", 0.34, 0.8);

export const SOUND_COLOR = "#B7C6D4";
export const MUSIC_COLOR = "#E4C98A";
export const NARRATOR_COLOR = "#F3E6C4";

export function paletteForRole(role) {
  if (role === "main") return MAIN_COLORS;
  if (role === "supporting") return SUPPORTING_COLORS;
  if (role === "narrator") return [{ id: "narrator", name: "Narrator", hex: NARRATOR_COLOR, hue: 45, role: "narrator" }].concat(MINOR_COLORS);
  return MINOR_COLORS;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

export function hexToRgb(hex) {
  const h = String(hex || "#FFFFFF").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

export function relLuminance(hex) {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Contrast of a caption color against the black caption box. */
export function contrastOnBlack(hex) {
  return (relLuminance(hex) + 0.05) / 0.05;
}

export function hexToHue(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.001) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function volumeToScale(volume) {
  const t = clamp(Number(volume) || 0, 0, 100) / 100;
  if (t <= 0.5) return lerp(RULES.volumeScale.low, RULES.volumeScale.mid, t / 0.5);
  return lerp(RULES.volumeScale.mid, RULES.volumeScale.high, (t - 0.5) / 0.5);
}

export function pitchToAxes(pitch) {
  const t = clamp(Number(pitch) || 0, 0, 100) / 100;
  return {
    weight: lerp(RULES.pitchWeight.low, RULES.pitchWeight.high, t),
    width: lerp(RULES.pitchWidth.low, RULES.pitchWidth.high, t),
  };
}

export function defaultBaselinePercent(width, height) {
  const ar = width / Math.max(1, height);
  if (ar >= 2.2) return 5.1;
  if (ar >= 1.7) return 4.05;
  if (ar >= 1.2) return 4.3;
  if (ar >= 0.9) return 4.5;
  return 3.15;
}

export function baselinePx(project) {
  const pct = project.baselinePercent || defaultBaselinePercent(project.width, project.height);
  return (project.height * pct) / 100;
}

export function speakProgress(time, start, end, syncStyle) {
  if (syncStyle === "word-snap") return time + 0.0001 >= start ? 1 : 0;
  if (time <= start) return 0;
  if (time >= end) return 1;
  const d = end - start;
  if (d <= 0.001) return 1;
  return (time - start) / d;
}

export function popEnvelope(time, start, end) {
  const dur = Math.min(RULES.popDuration, Math.max(RULES.popMin, (end - start) || RULES.popMin));
  if (time < start || time > start + dur) return 0;
  return Math.sin(((time - start) / dur) * Math.PI);
}

export function anchorOf(position) {
  if (position === "top" || position === "upper") return "top";
  return "bottom";
}

export function placementFor(cue) {
  const slot = cue.slot || 0;
  const step = RULES.slotStep * 100;
  const margin = RULES.margin * 100;
  if (cue.position === "top") return { edge: "top", pct: margin + slot * step };
  if (cue.position === "upper") return { edge: "top", pct: 20 + slot * step };
  if (cue.position === "lower") return { edge: "bottom", pct: 18 + slot * step };
  if (cue.position === "custom") return { edge: "top", pct: clamp(cue.yPercent || 50, 4, 92) };
  return { edge: "bottom", pct: margin + slot * step };
}

export function displayText(cue) {
  let t = String(cue.text || "").trim();
  if (!t) return "";
  if (cue.type === "sound") {
    t = t.replace(/^♪\s*/, "");
    if (t.charAt(0) !== "[") t = "[" + t.replace(/^\[|\]$/g, "") + "]";
  } else if (cue.type === "music") {
    t = t.replace(/^♪\s*/, "").replace(/^\[|\]$/g, "");
    t = "♪ [" + t + "]";
  } else if (cue.type === "lyric") {
    t = t.replace(/^♪\s*/, "");
    t = "♪ " + t;
  }
  return t;
}

export function tokenize(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function wordWeight(text) {
  const bare = String(text).replace(/[^\p{L}\p{N}]/gu, "");
  return Math.max(1, bare.length || String(text).length || 1);
}

export function distributeWords(tokens, start, end, previous) {
  const list = tokens.map((t) => ({ t }));
  const weights = list.map((w) => wordWeight(w.t));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const dur = Math.max(0.08 * list.length, end - start);
  let cursor = start;
  return list.map((w, i) => {
    const prev = previous && previous.find((p) => p.t === w.t);
    const slice = dur * (weights[i] / total);
    const next = {
      t: w.t,
      start: round1(cursor),
      end: round1(cursor + slice),
      volume: prev && prev.volume != null ? prev.volume : undefined,
      pitch: prev && prev.pitch != null ? prev.pitch : undefined,
      syllables: prev && prev.syllables ? prev.syllables : undefined,
    };
    cursor += slice;
    return next;
  });
}

export function retokenizeCue(cue) {
  const text = displayText(cue);
  const tokens = tokenize(text);
  const start = Number(cue.speechStart) || 0;
  const end = Math.max(start + 0.2, Number(cue.speechEnd) || start + 1);
  cue.words = distributeWords(tokens, start, end, cue.words || []);
  return cue;
}

function characterById(project, id) {
  return (project.characters || []).find((c) => c.id === id) || null;
}

export function styleFor(word, cue, character, project) {
  const base = baselinePx(project);
  const vol = word.volume != null ? word.volume : character && character.baseVolume != null ? character.baseVolume : 50;
  const pitch = word.pitch != null ? word.pitch : character && character.basePitch != null ? character.basePitch : 50;
  const axes = pitchToAxes(pitch);
  const fontSize = round1(base * volumeToScale(vol));
  let color = "#FFFFFF";
  let slant = 0;
  if (cue.type === "sound") {
    color = project.soundColor || SOUND_COLOR;
    slant = RULES.slantOffscreen;
  } else if (cue.type === "music") {
    color = project.musicColor || MUSIC_COLOR;
    slant = RULES.slantOffscreen;
  } else if (cue.type === "lyric") {
    color = (character && character.color) || project.musicColor || MUSIC_COLOR;
    slant = RULES.slantOffscreen;
  } else {
    color = (character && character.color) || NARRATOR_COLOR;
  }
  if (cue.offscreen) slant = RULES.slantOffscreen;
  return {
    fontSize,
    weight: Math.round(axes.weight),
    width: Math.round(axes.width),
    slant,
    opsz: Math.round(clamp(fontSize, 8, 144)),
    color,
    pop: project.popEnabled === false ? 1 : RULES.popScale,
    volume: vol,
    pitch,
  };
}

function expandTokens(word, style) {
  const raw = word.syllables && String(word.syllables).trim();
  if (!raw || raw.indexOf("|") === -1) {
    return [{ text: word.t, start: word.start, end: word.end, glue: false, style, source: word.t }];
  }
  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) {
    return [{ text: word.t, start: word.start, end: word.end, glue: false, style, source: word.t }];
  }
  const weights = parts.map(wordWeight);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const dur = Math.max(0.04 * parts.length, word.end - word.start);
  let cursor = word.start;
  return parts.map((text, i) => {
    const slice = dur * (weights[i] / total);
    const token = {
      text,
      start: cursor,
      end: cursor + slice,
      glue: i > 0,
      style,
      source: word.t,
    };
    cursor += slice;
    return token;
  });
}

function assignSlots(cues) {
  const groups = {};
  cues.forEach((cue) => {
    const key = (cue.position || "bottom") + ":" + anchorOf(cue.position);
    if (!groups[key]) groups[key] = [];
    groups[key].push(cue);
  });
  Object.keys(groups).forEach((key) => {
    const list = groups[key].slice().sort((a, b) => a.displayIn - b.displayIn || a.speechStart - b.speechStart);
    const slots = [];
    list.forEach((cue) => {
      let placed = false;
      for (let s = 0; s < slots.length; s++) {
        const hit = slots[s].some((o) => o.displayIn < cue.displayOut - 0.02 && cue.displayIn < o.displayOut - 0.02);
        if (!hit) {
          slots[s].push(cue);
          cue.slot = s;
          placed = true;
          break;
        }
      }
      if (!placed) {
        cue.slot = slots.length;
        slots.push([cue]);
      }
    });
  });
}

export function leadOf(cue, project) {
  return cue.leadIn != null ? Number(cue.leadIn) : project.leadIn != null ? Number(project.leadIn) : 0.7;
}

export function holdOf(cue, project) {
  return cue.hold != null ? Number(cue.hold) : project.hold != null ? Number(project.hold) : 0.4;
}

export function resolveProject(project) {
  const cues = (project.cues || []).map((cue) => {
    const character = characterById(project, cue.speakerId);
    const speechStart = Number(cue.speechStart) || 0;
    const speechEnd = Math.max(speechStart + 0.12, Number(cue.speechEnd) || speechStart + 1);
    const displayIn = Math.max(0, speechStart - leadOf(cue, project));
    const displayOut = speechEnd + holdOf(cue, project);
    const wordsIn = cue.words && cue.words.length ? cue.words : distributeWords(tokenize(displayText(cue)), speechStart, speechEnd);
    const tokens = [];
    wordsIn.forEach((word) => {
      const style = styleFor(word, cue, character, project);
      expandTokens(word, style).forEach((token) => tokens.push(token));
    });
    return {
      id: cue.id,
      label: cueLabel(cue, character),
      type: cue.type || "dialogue",
      speakerId: cue.speakerId || null,
      speaker: character ? character.name : cue.type || "Caption",
      color: character ? character.color : cue.type === "music" ? project.musicColor || MUSIC_COLOR : cue.type === "sound" ? project.soundColor || SOUND_COLOR : NARRATOR_COLOR,
      text: displayText(cue),
      speechStart,
      speechEnd,
      displayIn,
      displayOut,
      position: cue.position || "bottom",
      offscreen: !!cue.offscreen,
      yPercent: cue.yPercent,
      tokens,
    };
  });
  assignSlots(cues);
  cues.forEach((cue) => {
    const place = placementFor(cue);
    cue.edge = place.edge;
    cue.pct = round1(place.pct);
  });
  const duration = Math.max(
    8,
    project.duration || 0,
    ...cues.map((c) => c.displayOut + 0.4)
  );
  return {
    version: 1,
    engine: ENGINE_VERSION,
    title: project.title || "Untitled",
    width: project.width,
    height: project.height,
    fps: project.fps,
    duration: round1(duration),
    baselinePx: round1(baselinePx(project)),
    syncStyle: project.syncStyle || "within-word",
    popEnabled: project.popEnabled !== false,
    boxOpacity: project.boxOpacity != null ? project.boxOpacity : 1,
    fontPostScript: project.fontPostScript || "RobotoFlex-Regular",
    cues,
    legend: (project.characters || []).map((c) => ({
      name: c.name,
      role: c.role,
      color: c.color,
    })),
  };
}

export function cueLabel(cue, character) {
  const who = character ? character.name : cue.type === "sound" ? "Sound" : cue.type === "music" ? "Music" : cue.type === "lyric" ? "Lyric" : "Caption";
  const bit = String(cue.text || "").trim().slice(0, 28);
  return who + " — " + (bit || "line");
}

export function readingStats(cue, project) {
  const text = displayText(cue);
  const chars = text.replace(/\s/g, "").length;
  const speechStart = Number(cue.speechStart) || 0;
  const lead = leadOf(cue, project);
  const hold = holdOf(cue, project);
  const speechEnd = Math.max(speechStart + 0.12, Number(cue.speechEnd) || speechStart + 1);
  const displayDur = Math.max(0.05, speechEnd + hold - Math.max(0, speechStart - lead));
  return {
    chars,
    cps: chars / displayDur,
    displayDur,
    fast: chars / displayDur > RULES.maxCps,
  };
}

export function suggestColor(characters, role) {
  const palette = paletteForRole(role);
  const used = (characters || []).map((c) => c.color).filter(Boolean);
  if (!used.length) {
    if (role === "main") return MAIN_COLORS.find((c) => c.id === "yellow");
    return palette[0];
  }
  let best = palette[0];
  let bestScore = -1;
  palette.forEach((swatch) => {
    const hue = swatch.hue != null ? swatch.hue : hexToHue(swatch.hex);
    const nearest = Math.min(...used.map((hex) => hueDistance(hue, hexToHue(hex))));
    const taken = used.some((hex) => hex.toUpperCase() === swatch.hex.toUpperCase());
    const score = taken ? -1 : nearest;
    if (score > bestScore) {
      bestScore = score;
      best = swatch;
    }
  });
  return best;
}

export function oppositeMain(hex) {
  const h = hexToHue(hex);
  let best = MAIN_COLORS[0];
  let bestGap = 999;
  MAIN_COLORS.forEach((c) => {
    const gap = Math.abs(180 - hueDistance(h, c.hue));
    if (gap < bestGap - 0.1) {
      bestGap = gap;
      best = c;
    }
  });
  return best;
}

export function closenessWarnings(characters) {
  const mains = (characters || []).filter((c) => c.role === "main");
  const notes = [];
  for (let i = 0; i < mains.length; i++) {
    for (let j = i + 1; j < mains.length; j++) {
      const d = hueDistance(hexToHue(mains[i].color), hexToHue(mains[j].color));
      if (d < 42) {
        notes.push(mains[i].name + " and " + mains[j].name + " are only " + Math.round(d) + "° apart. Main colors should sit as far apart on the wheel as the cast allows.");
      }
    }
  }
  (characters || []).forEach((c) => {
    const ratio = contrastOnBlack(c.color);
    if (ratio < 4.5) {
      notes.push(c.name + " (" + c.color + ") is " + ratio.toFixed(1) + ":1 on the black box, under WCAG AA for small text. The published Main Red is in this range — use it knowingly.");
    }
  });
  return notes;
}

export function blankProject() {
  return {
    version: 1,
    title: "Untitled picture",
    width: 1920,
    height: 1080,
    fps: 24,
    baselinePercent: 4.05,
    leadIn: 0.7,
    hold: 0.4,
    syncStyle: "within-word",
    popEnabled: true,
    boxOpacity: 1,
    soundColor: SOUND_COLOR,
    musicColor: MUSIC_COLOR,
    fontPostScript: "RobotoFlex-Regular",
    characters: [],
    cues: [],
  };
}

export function createSampleProject() {
  const project = blankProject();
  project.title = "Northbound";
  project.leadIn = 0.55;
  project.hold = 0.32;
  const supportOrange = SUPPORTING_COLORS.find((c) => c.hue === 45);
  const minorAzure = MINOR_COLORS.find((c) => c.hue === 204);
  project.characters = [
    { id: "mara", name: "Mara Ellison", role: "main", color: "#E5E517", baseVolume: 48, basePitch: 54, hero: true, villain: false },
    { id: "jonah", name: "Jonah Pike", role: "main", color: "#17E5E5", baseVolume: 55, basePitch: 26, hero: false, villain: true },
    { id: "inez", name: "Inez", role: "supporting", color: supportOrange.hex, baseVolume: 50, basePitch: 70, hero: false, villain: false },
    { id: "pa", name: "Station", role: "minor", color: minorAzure.hex, baseVolume: 36, basePitch: 78, hero: false, villain: false },
  ];

  const L = (id, speakerId, text, start, end, extra, patches) => {
    const cue = Object.assign({
      id,
      type: "dialogue",
      speakerId,
      text,
      speechStart: start,
      speechEnd: end,
      position: "bottom",
      offscreen: false,
    }, extra || {});
    retokenizeCue(cue);
    const speaker = project.characters.find((c) => c.id === speakerId);
    cue.words.forEach((w) => {
      w.volume = speaker.baseVolume;
      w.pitch = speaker.basePitch;
      const key = w.t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (patches && patches[key]) Object.assign(w, patches[key]);
    });
    return cue;
  };

  project.cues = [
    L("c1", "mara", "You said the last train already left.", 0.7, 3.15, null, {
      last: { volume: 64, pitch: 50 },
      left: { volume: 60, pitch: 48 },
    }),
    L("c2", "jonah", "I said it was leaving. Not that we were on it.", 3.35, 6.35, null, {
      leaving: { volume: 48, pitch: 38 },
      not: { volume: 74, pitch: 24 },
      on: { volume: 40, pitch: 22 },
      it: { volume: 36, pitch: 20 },
    }),
    L("c3", "mara", "Then why is the platform still this loud?", 6.55, 9.15, null, {
      then: { volume: 22, pitch: 60 },
      why: { volume: 24, pitch: 62 },
      is: { volume: 22, pitch: 60 },
      the: { volume: 20, pitch: 58 },
      platform: { volume: 26, pitch: 56 },
      still: { volume: 28, pitch: 54 },
      this: { volume: 30, pitch: 52 },
      loud: { volume: 78, pitch: 46 },
    }),
    L("c4", "jonah", "Because everyone else made the train.", 9.4, 12.05, null, {
      because: { volume: 46, pitch: 28 },
      everyone: { volume: 54, pitch: 28 },
      else: { volume: 62, pitch: 26 },
      made: { volume: 70, pitch: 24 },
      the: { volume: 74, pitch: 24 },
      train: { volume: 82, pitch: 22 },
    }),
    L("c5", "inez", "Two tickets. If you still want them.", 12.3, 14.55, null, {
      two: { volume: 56, pitch: 72 },
      tickets: { volume: 52, pitch: 68 },
    }),
    L("c6", "pa", "Final call for the northbound express.", 14.8, 17.55, { offscreen: true, position: "top" }, {
      final: { volume: 40, pitch: 80 },
      call: { volume: 38, pitch: 78 },
      northbound: { volume: 42, pitch: 74, syllables: "north|bound" },
      express: { volume: 34, pitch: 82 },
    }),
    L("c7", "mara", "We are getting on that train.", 17.8, 19.85, null, {
      that: { volume: 70, pitch: 48 },
      train: { volume: 84, pitch: 44 },
    }),
    L("c8", "jonah", "Not if I say we stay.", 20.05, 22.15, null, {
      not: { volume: 30, pitch: 20 },
      if: { volume: 26, pitch: 22 },
      i: { volume: 24, pitch: 20 },
      say: { volume: 28, pitch: 18 },
      we: { volume: 26, pitch: 20 },
      stay: { volume: 34, pitch: 16 },
    }),
    L("c9", "mara", "brakes hiss, long and low", 22.4, 24.15, { type: "sound", speakerId: null, position: "top" }, {
      brakes: { volume: 76, pitch: 30 },
      hiss: { volume: 58, pitch: 46 },
      long: { volume: 48, pitch: 28 },
      and: { volume: 40, pitch: 32 },
      low: { volume: 70, pitch: 14 },
    }),
    L("c10", "mara", "low strings, uneasy", 24.3, 27.6, { type: "music", speakerId: null, position: "upper" }, {
      low: { volume: 44, pitch: 12 },
      strings: { volume: 48, pitch: 16 },
      uneasy: { volume: 36, pitch: 34 },
    }),
    L("c11", "mara", "Jonah.", 27.85, 28.55, null, { jonah: { volume: 92, pitch: 42 } }),
    L("c12", "jonah", "Mara.", 28.7, 29.35, null, { mara: { volume: 40, pitch: 24 } }),
    L("c13", "mara", "Don't.", 29.5, 30.15, null, { dont: { volume: 86, pitch: 40 } }),
    L("c14", "mara", "hold on, hold on", 30.5, 33.1, { type: "lyric", position: "lower" }, {
      hold: { volume: 34, pitch: 64 },
      on: { volume: 30, pitch: 66 },
    }),
  ];
  // Lyric words share one patch key; second "hold"/"on" need their own pass.
  const lyric = project.cues.find((c) => c.id === "c14");
  lyric.words.forEach((w, i) => {
    w.volume = i % 2 === 0 ? 34 : 30;
    w.pitch = i % 2 === 0 ? 64 : 68;
  });
  return project;
}

export function shiftCue(cue, delta) {
  cue.speechStart = round1((Number(cue.speechStart) || 0) + delta);
  cue.speechEnd = round1((Number(cue.speechEnd) || 0) + delta);
  (cue.words || []).forEach((w) => {
    w.start = round1(w.start + delta);
    w.end = round1(w.end + delta);
  });
}

export function scaleCueSpeech(cue, newStart, newEnd) {
  const oldStart = Number(cue.speechStart) || 0;
  const oldEnd = Number(cue.speechEnd) || oldStart + 1;
  const oldDur = Math.max(0.08, oldEnd - oldStart);
  const dur = Math.max(0.12, newEnd - newStart);
  (cue.words || []).forEach((w) => {
    const a = (w.start - oldStart) / oldDur;
    const b = (w.end - oldStart) / oldDur;
    w.start = round1(newStart + a * dur);
    w.end = round1(newStart + Math.max(a + 0.04, b) * dur);
  });
  cue.speechStart = round1(newStart);
  cue.speechEnd = round1(newEnd);
}

export function parseSrt(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "").replace(/\r/g, "");
  const blocks = text.split(/\n{2,}/);
  const cues = [];
  blocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l && l !== "WEBVTT" && l.indexOf("NOTE") !== 0);
    const timeLine = lines.find((l) => l.indexOf("-->") !== -1);
    if (!timeLine) return;
    const m = timeLine.match(/(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{1,3})/);
    if (!m) return;
    const toSec = (h, mm, ss, ms) => {
      const hours = h ? parseInt(h, 10) : 0;
      const frac = (ms + "000").slice(0, 3);
      return hours * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10) + parseInt(frac, 10) / 1000;
    };
    const start = toSec(m[1], m[2], m[3], m[4]);
    const end = toSec(m[5], m[6], m[7], m[8]);
    const idx = lines.indexOf(timeLine);
    const body = lines.slice(idx + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (!body) return;
    cues.push({ start, end, text: body });
  });
  return cues;
}

export function toSrt(project) {
  const cues = (project.cues || []).slice().sort((a, b) => a.speechStart - b.speechStart);
  return cues.map((cue, i) => {
    const inn = Math.max(0, (Number(cue.speechStart) || 0) - leadOf(cue, project));
    const out = (Number(cue.speechEnd) || 0) + holdOf(cue, project);
    return (i + 1) + "\n" + fmtSrt(inn) + " --> " + fmtSrt(out) + "\n" + displayText(cue) + "\n";
  }).join("\n");
}

function fmtSrt(t) {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = ms % 1000;
  const pad = (n, w) => String(n).padStart(w, "0");
  return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + "," + pad(f, 3);
}

export function toCsv(project) {
  const rows = [["cue", "speaker", "type", "speechStart", "speechEnd", "position", "offscreen", "word", "wordStart", "wordEnd", "volume", "pitch", "syllables"]];
  (project.cues || []).forEach((cue) => {
    const speaker = (project.characters || []).find((c) => c.id === cue.speakerId);
    (cue.words || [{ t: cue.text, start: cue.speechStart, end: cue.speechEnd }]).forEach((w) => {
      rows.push([
        cue.id,
        speaker ? speaker.name : "",
        cue.type || "dialogue",
        cue.speechStart,
        cue.speechEnd,
        cue.position || "bottom",
        cue.offscreen ? "yes" : "no",
        w.t,
        w.start,
        w.end,
        w.volume != null ? w.volume : "",
        w.pitch != null ? w.pitch : "",
        w.syllables || "",
      ]);
    });
  });
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function inferPunctuation(cue, character) {
  const baseV = character && character.baseVolume != null ? character.baseVolume : 50;
  const baseP = character && character.basePitch != null ? character.basePitch : 50;
  (cue.words || []).forEach((w) => {
    const t = w.t;
    let vol = baseV;
    let pitch = baseP;
    if (/!/.test(t)) vol = clamp(baseV + 28, 0, 100);
    else if (/\?/.test(t)) {
      vol = clamp(baseV + 6, 0, 100);
      pitch = clamp(baseP + 10, 0, 100);
    } else if (/(\.\.\.|…)/.test(t)) vol = clamp(baseV - 16, 0, 100);
    else if (/[.]/.test(t)) vol = clamp(baseV + 4, 0, 100);
    w.volume = Math.round(vol);
    w.pitch = Math.round(pitch);
  });
}

export const PRESETS = [
  { id: "hd", label: "HD 16:9", width: 1920, height: 1080, fps: 24 },
  { id: "uhd", label: "UHD 16:9", width: 3840, height: 2160, fps: 24 },
  { id: "scope", label: "Scope 2.39", width: 2048, height: 858, fps: 24 },
  { id: "scope4k", label: "4K scope", width: 4096, height: 1716, fps: 24 },
  { id: "vertical", label: "Vertical 9:16", width: 1080, height: 1920, fps: 30 },
  { id: "square", label: "Square", width: 1080, height: 1080, fps: 30 },
];
