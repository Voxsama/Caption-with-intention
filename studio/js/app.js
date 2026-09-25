import {
  ENGINE_VERSION,
  MAIN_COLORS,
  SUPPORTING_COLORS,
  MINOR_COLORS,
  PRESETS,
  RULES,
  blankProject,
  closenessWarnings,
  contrastOnBlack,
  createSampleProject,
  defaultBaselinePercent,
  displayText,
  hueDistance,
  hexToHue,
  inferPunctuation,
  leadOf,
  oppositeMain,
  paletteForRole,
  parseSrt,
  readingStats,
  resolveProject,
  retokenizeCue,
  round1,
  scaleCueSpeech,
  shiftCue,
  suggestColor,
  toCsv,
  toSrt,
  uid,
  clamp,
} from "./system.js";
import { drawWheel, renderCaptions, renderLegacy } from "./preview.js";

const STORAGE_KEY = "intention-captions-v1";
const PX = 68;

const state = {
  project: null,
  resolved: null,
  inspect: "cue",
  selectedCueId: null,
  selectedWord: 0,
  selectedCharId: null,
  time: 0,
  playing: false,
  showLegacy: false,
  showSafe: false,
  showLegend: true,
  videoUrl: null,
  fontOk: false,
  history: [],
  future: [],
};

const $ = (id) => document.getElementById(id);

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value);
    });
  }
  const list = Array.isArray(children) ? children : children == null ? [] : [children];
  list.forEach((child) => {
    if (child == null || child === false) return;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

function cueById(id) {
  return state.project.cues.find((c) => c.id === id) || null;
}
function charById(id) {
  return state.project.characters.find((c) => c.id === id) || null;
}
function selectedCue() {
  return cueById(state.selectedCueId);
}
function selectedChar() {
  return charById(state.selectedCharId);
}

function snapshot() {
  state.history.push(JSON.stringify(state.project));
  if (state.history.length > 80) state.history.shift();
  state.future = [];
}
function undo() {
  if (!state.history.length) return;
  state.future.push(JSON.stringify(state.project));
  state.project = JSON.parse(state.history.pop());
  refreshAll();
}
function redo() {
  if (!state.future.length) return;
  state.history.push(JSON.stringify(state.project));
  state.project = JSON.parse(state.future.pop());
  refreshAll();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
  } catch (e) {}
}

function ensureSelection() {
  if (!state.project.characters.length) state.selectedCharId = null;
  else if (!charById(state.selectedCharId)) state.selectedCharId = state.project.characters[0].id;
  if (!state.project.cues.length) state.selectedCueId = null;
  else if (!cueById(state.selectedCueId)) state.selectedCueId = state.project.cues[0].id;
  const cue = selectedCue();
  if (cue && state.selectedWord >= (cue.words || []).length) state.selectedWord = 0;
}

function refreshResolved() {
  state.resolved = resolveProject(state.project);
  const stage = $("stage");
  stage.style.setProperty("--ar", String(state.project.width / state.project.height));
}

function refreshAll() {
  ensureSelection();
  refreshResolved();
  $("title").value = state.project.title || "";
  renderChars();
  renderCues();
  renderInspector();
  renderTimeline();
  renderLegend();
  paintFrame();
  persist();
}

function applyVoice(cue, character) {
  if (!character) return;
  (cue.words || []).forEach((w) => {
    if (w.volume == null) w.volume = character.baseVolume;
    if (w.pitch == null) w.pitch = character.basePitch;
  });
}

function addCharacter(role) {
  snapshot();
  const useRole = role || "supporting";
  const swatch = suggestColor(state.project.characters, useRole);
  const character = {
    id: uid("p"),
    name: useRole === "main" ? "New lead" : "New voice",
    role: useRole,
    color: swatch.hex,
    baseVolume: 50,
    basePitch: 50,
    hero: false,
    villain: false,
  };
  state.project.characters.push(character);
  state.selectedCharId = character.id;
  state.inspect = "character";
  refreshAll();
}

function addCue() {
  snapshot();
  const speaker = selectedChar() || state.project.characters[0];
  const start = round1(state.time || 0);
  const cue = {
    id: uid("c"),
    type: "dialogue",
    speakerId: speaker ? speaker.id : null,
    text: "New line.",
    speechStart: start,
    speechEnd: round1(start + 1.6),
    position: "bottom",
    offscreen: false,
  };
  retokenizeCue(cue);
  applyVoice(cue, speaker);
  state.project.cues.push(cue);
  state.selectedCueId = cue.id;
  state.selectedWord = 0;
  state.inspect = "cue";
  refreshAll();
}

function renderChars() {
  const root = $("char-list");
  root.replaceChildren();
  if (!state.project.characters.length) {
    root.appendChild(el("p", { class: "empty" }, "Add a speaker. Main colors are the six published hues. Supporting colors sit between them. Minors are pastels."));
    return;
  }
  state.project.characters.forEach((character) => {
    const btn = el("button", {
      class: "char-card" + (state.inspect === "character" && character.id === state.selectedCharId ? " active" : ""),
      type: "button",
      onclick: () => {
        state.selectedCharId = character.id;
        state.inspect = "character";
        renderChars();
        renderInspector();
      },
    }, [
      el("i", { class: "dot", style: "background:" + character.color }),
      el("span", null, [
        el("strong", null, character.name),
        el("em", null, character.role + (character.hero ? " · hero" : "") + (character.villain ? " · villain" : "")),
      ]),
      el("span", { class: "role-tag" }, character.role),
    ]);
    root.appendChild(btn);
  });
  const notes = closenessWarnings(state.project.characters);
  notes.forEach((note) => root.appendChild(el("p", { class: "empty" }, note)));
}

function renderCues() {
  const root = $("cue-list");
  root.replaceChildren();
  const cues = state.project.cues.slice().sort((a, b) => a.speechStart - b.speechStart);
  if (!cues.length) {
    root.appendChild(el("p", { class: "empty" }, "Add a line, or load the sample. Each line is one read-ahead caption."));
    return;
  }
  cues.forEach((cue) => {
    const speaker = charById(cue.speakerId);
    const color = speaker ? speaker.color : cue.type === "music" ? state.project.musicColor : cue.type === "sound" ? state.project.soundColor : "#ddd";
    const who = speaker ? speaker.name : cue.type || "Line";
    root.appendChild(el("button", {
      class: "cue-row" + (cue.id === state.selectedCueId ? " active" : ""),
      type: "button",
      onclick: () => {
        state.selectedCueId = cue.id;
        state.selectedWord = 0;
        state.inspect = "cue";
        if (speaker) state.selectedCharId = speaker.id;
        seek(cue.speechStart);
        renderCues();
        renderChars();
        renderInspector();
      },
    }, [
      el("i", { class: "dot", style: "background:" + color }),
      el("span", null, [
        el("strong", null, who),
        el("em", null, displayText(cue)),
      ]),
      el("span", { class: "role-tag" }, formatShort(cue.speechStart)),
    ]));
  });
}

function field(label, control) {
  return el("div", { class: "field" }, [el("label", null, label), control]);
}

function slider(label, min, max, value, onInput, ends) {
  const output = el("output", null, String(Math.round(value)));
  const input = el("input", { type: "range", min: String(min), max: String(max), value: String(Math.round(value)) });
  input.addEventListener("pointerdown", () => snapshot());
  input.addEventListener("input", () => {
    output.textContent = input.value;
    onInput(Number(input.value));
    refreshResolved();
    renderTimeline();
    paintFrame();
    updateStats();
    persist();
  });
  return el("div", { class: "field" }, [
    el("span", { class: "label" }, label),
    el("div", { class: "slider-line" }, [input, output]),
    ends ? el("div", { class: "ends" }, [el("span", null, ends[0]), el("span", null, ends[1])]) : null,
  ]);
}

function renderInspector() {
  const root = $("inspector");
  root.replaceChildren();
  if (state.inspect === "character" && selectedChar()) renderCharacterInspector(root);
  else if (selectedCue()) renderCueInspector(root);
  else root.appendChild(el("p", { class: "empty" }, "Select a line or a speaker."));
  $("inspector-title").textContent = state.inspect === "character" ? "Speaker" : "Line";
}

function renderCharacterInspector(root) {
  const character = selectedChar();
  const name = el("input", { type: "text", value: character.name });
  name.addEventListener("focus", snapshot);
  name.addEventListener("input", () => {
    character.name = name.value;
    renderChars();
    persist();
  });
  const role = el("select", null, ["main", "supporting", "minor", "narrator"].map((r) => {
    const o = el("option", { value: r }, r);
    if (r === character.role) o.selected = true;
    return o;
  }));
  role.addEventListener("change", () => {
    snapshot();
    character.role = role.value;
    const swatch = suggestColor(state.project.characters.filter((c) => c.id !== character.id), character.role);
    character.color = swatch.hex;
    refreshAll();
  });
  root.appendChild(field("Name", name));
  root.appendChild(field("Role", role));

  const hero = el("input", { type: "checkbox" });
  hero.checked = !!character.hero;
  hero.addEventListener("change", () => {
    snapshot();
    character.hero = hero.checked;
    if (hero.checked) state.project.characters.forEach((c) => { if (c.id !== character.id) c.hero = false; });
    refreshAll();
  });
  const villain = el("input", { type: "checkbox" });
  villain.checked = !!character.villain;
  villain.addEventListener("change", () => {
    snapshot();
    character.villain = villain.checked;
    if (villain.checked) {
      state.project.characters.forEach((c) => { if (c.id !== character.id) c.villain = false; });
      const heroChar = state.project.characters.find((c) => c.hero);
      if (heroChar) character.color = oppositeMain(heroChar.color).hex;
    }
    refreshAll();
  });
  root.appendChild(el("div", { class: "row2" }, [
    el("label", { class: "check" }, [hero, " Hero"]),
    el("label", { class: "check" }, [villain, " Villain"]),
  ]));

  root.appendChild(slider("Resting volume", 0, 100, character.baseVolume, (v) => { character.baseVolume = v; }, ["whisper", "shout"]));
  root.appendChild(slider("Resting pitch", 0, 100, character.basePitch, (v) => { character.basePitch = v; }, ["low / heavy", "high / light"]));

  root.appendChild(el("p", { class: "label" }, "Color wheel"));
  root.appendChild(el("p", { class: "empty" }, "Outer ring: six main colors. Middle: supporting hues between them. Inner: pastel minors."));
  const wrap = el("div", { class: "wheel-wrap" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 200 200");
  svg.setAttribute("class", "wheel");
  svg.__palette = { main: MAIN_COLORS, supporting: SUPPORTING_COLORS, minor: MINOR_COLORS };
  drawWheel(svg, (swatch) => {
    snapshot();
    character.color = swatch.hex;
    if (swatch.role === "main" || swatch.role === "supporting" || swatch.role === "minor") character.role = swatch.role;
    refreshAll();
  });
  const list = el("div", { class: "swatch-list" });
  paletteForRole(character.role).forEach((swatch) => {
    const b = el("button", {
      type: "button",
      title: swatch.name + " " + swatch.hex,
      style: "background:" + swatch.hex,
      class: swatch.hex.toUpperCase() === String(character.color).toUpperCase() ? "on" : "",
    });
    b.addEventListener("click", () => {
      snapshot();
      character.color = swatch.hex;
      refreshAll();
    });
    list.appendChild(b);
  });
  wrap.appendChild(svg);
  wrap.appendChild(list);
  root.appendChild(wrap);

  const ratio = contrastOnBlack(character.color);
  root.appendChild(el("p", { class: "stat" + (ratio < 4.5 ? " warn" : "") }, character.color + " on black is " + ratio.toFixed(1) + ":1. " + (ratio < 4.5 ? "Under 4.5:1 for small text." : "Clears WCAG AA on the caption box.")));

  const actions = el("div", { class: "inline-actions" });
  actions.appendChild(el("button", { type: "button", class: "btn", onclick: () => {
    snapshot();
    const copy = JSON.parse(JSON.stringify(character));
    copy.id = uid("p");
    copy.name = character.name + " — other voice";
    copy.hero = false;
    copy.villain = false;
    copy.basePitch = clamp(character.basePitch + (character.basePitch < 50 ? 24 : -24), 0, 100);
    copy.color = suggestColor(state.project.characters, character.role).hex;
    state.project.characters.push(copy);
    state.selectedCharId = copy.id;
    refreshAll();
  } }, "Vocal twin"));
  actions.appendChild(el("button", { type: "button", class: "btn danger", onclick: () => {
    snapshot();
    state.project.characters = state.project.characters.filter((c) => c.id !== character.id);
    state.project.cues.forEach((cue) => {
      if (cue.speakerId === character.id) cue.speakerId = state.project.characters[0] ? state.project.characters[0].id : null;
    });
    state.inspect = "cue";
    refreshAll();
  } }, "Delete speaker"));
  root.appendChild(actions);
}

function renderCueInspector(root) {
  const cue = selectedCue();
  const speaker = charById(cue.speakerId);
  const type = el("select", null, [
    ["dialogue", "Dialogue"],
    ["sound", "Sound effect"],
    ["music", "Music"],
    ["lyric", "Sung lyric"],
  ].map(([value, label]) => {
    const o = el("option", { value }, label);
    if (value === (cue.type || "dialogue")) o.selected = true;
    return o;
  }));
  type.addEventListener("change", () => {
    snapshot();
    let text = String(cue.text || "").replace(/^♪\s*/, "").replace(/^\[/, "").replace(/\]$/, "").trim();
    cue.text = text;
    cue.type = type.value;
    if (cue.type === "sound" || cue.type === "music") {
      cue.speakerId = null;
      if (cue.position === "bottom") cue.position = cue.type === "music" ? "upper" : "top";
    } else if (!cue.speakerId && state.project.characters[0]) {
      cue.speakerId = state.project.characters[0].id;
    }
    retokenizeCue(cue);
    applyVoice(cue, charById(cue.speakerId));
    refreshAll();
  });

  const speakerSelect = el("select", null, [el("option", { value: "" }, "—")].concat(state.project.characters.map((c) => {
    const o = el("option", { value: c.id }, c.name);
    if (c.id === cue.speakerId) o.selected = true;
    return o;
  })));
  speakerSelect.addEventListener("change", () => {
    snapshot();
    cue.speakerId = speakerSelect.value || null;
    applyVoice(cue, charById(cue.speakerId));
    refreshAll();
  });
  root.appendChild(el("div", { class: "row2" }, [field("Kind", type), field("Speaker", speakerSelect)]));

  const text = el("textarea", null, cue.text || "");
  text.addEventListener("focus", snapshot);
  text.addEventListener("input", () => {
    cue.text = text.value;
    const keep = state.selectedWord;
    retokenizeCue(cue);
    applyVoice(cue, charById(cue.speakerId));
    state.selectedWord = Math.min(keep, Math.max(0, (cue.words || []).length - 1));
    refreshResolved();
    renderWordChips();
    renderCues();
    renderTimeline();
    paintFrame();
    updateStats();
    persist();
  });
  root.appendChild(field("Line", text));

  const start = el("input", { type: "number", step: "0.01", value: String(cue.speechStart) });
  const end = el("input", { type: "number", step: "0.01", value: String(cue.speechEnd) });
  const commitTimes = () => {
    snapshot();
    scaleCueSpeech(cue, Number(start.value) || 0, Number(end.value) || 0);
    refreshAll();
  };
  start.addEventListener("change", commitTimes);
  end.addEventListener("change", commitTimes);
  root.appendChild(el("div", { class: "row2" }, [field("Speech in", start), field("Speech out", end)]));

  const position = el("select", null, [
    ["bottom", "Bottom"],
    ["lower", "Lower third"],
    ["top", "Top"],
    ["upper", "Upper"],
  ].map(([value, label]) => {
    const o = el("option", { value }, label);
    if (value === (cue.position || "bottom")) o.selected = true;
    return o;
  }));
  position.addEventListener("change", () => {
    snapshot();
    cue.position = position.value;
    refreshAll();
  });
  const off = el("input", { type: "checkbox" });
  off.checked = !!cue.offscreen;
  off.addEventListener("change", () => {
    snapshot();
    cue.offscreen = off.checked;
    refreshAll();
  });
  root.appendChild(el("div", { class: "row2" }, [
    field("Position", position),
    el("label", { class: "check", style: "align-self:end;margin-bottom:12px" }, [off, " Off-screen italic"]),
  ]));

  root.appendChild(el("div", { class: "label" }, "Words"));
  root.appendChild(el("div", { class: "chips", id: "word-chips" }));
  renderWordChips();

  const word = (cue.words || [])[state.selectedWord];
  if (word) {
    root.appendChild(slider("Volume", 0, 100, word.volume != null ? word.volume : 50, (v) => { word.volume = v; }, ["whisper 70%", "shout 142%"]));
    root.appendChild(slider("Pitch", 0, 100, word.pitch != null ? word.pitch : 50, (v) => { word.pitch = v; }, ["heavy + wide", "light + condensed"]));
    const syl = el("input", { type: "text", value: word.syllables || "", placeholder: "north|bound" });
    syl.addEventListener("change", () => {
      snapshot();
      word.syllables = syl.value.trim();
      refreshAll();
    });
    root.appendChild(field("Syllable split", syl));
    const times = el("div", { class: "row2" }, [
      field("Word in", (() => {
        const input = el("input", { type: "number", step: "0.01", value: String(word.start) });
        input.addEventListener("change", () => { snapshot(); word.start = Number(input.value); refreshAll(); });
        return input;
      })()),
      field("Word out", (() => {
        const input = el("input", { type: "number", step: "0.01", value: String(word.end) });
        input.addEventListener("change", () => { snapshot(); word.end = Number(input.value); refreshAll(); });
        return input;
      })()),
    ]);
    root.appendChild(times);
  }

  const actions = el("div", { class: "inline-actions" });
  actions.appendChild(el("button", { type: "button", class: "btn", onclick: () => {
    snapshot();
    inferPunctuation(cue, charById(cue.speakerId));
    refreshAll();
  } }, "Infer from punctuation"));
  actions.appendChild(el("button", { type: "button", class: "btn", onclick: () => {
    snapshot();
    const voice = charById(cue.speakerId);
    (cue.words || []).forEach((w) => {
      w.volume = voice ? voice.baseVolume : 50;
      w.pitch = voice ? voice.basePitch : 50;
      w.syllables = "";
    });
    refreshAll();
  } }, "Reset to voice"));
  actions.appendChild(el("button", { type: "button", class: "btn", onclick: () => {
    snapshot();
    const copy = JSON.parse(JSON.stringify(cue));
    copy.id = uid("c");
    shiftCue(copy, 1.2);
    state.project.cues.push(copy);
    state.selectedCueId = copy.id;
    refreshAll();
  } }, "Duplicate"));
  actions.appendChild(el("button", { type: "button", class: "btn danger", onclick: () => {
    snapshot();
    state.project.cues = state.project.cues.filter((c) => c.id !== cue.id);
    state.selectedCueId = state.project.cues[0] ? state.project.cues[0].id : null;
    refreshAll();
  } }, "Delete line"));
  root.appendChild(actions);
  root.appendChild(el("p", { class: "stat", id: "cue-stats" }, ""));
  updateStats();
}

function renderWordChips() {
  const box = $("word-chips");
  if (!box) return;
  const cue = selectedCue();
  box.replaceChildren();
  if (!cue) return;
  (cue.words || []).forEach((word, index) => {
    box.appendChild(el("button", {
      type: "button",
      class: index === state.selectedWord ? "on" : "",
      onclick: () => {
        state.selectedWord = index;
        state.inspect = "cue";
        seek(word.start);
        renderInspector();
      },
    }, word.t));
  });
}

function updateStats() {
  const node = $("cue-stats");
  const cue = selectedCue();
  if (!node || !cue) return;
  const stats = readingStats(cue, state.project);
  const word = (cue.words || [])[state.selectedWord];
  let extra = "";
  if (word) {
    const resolvedCue = state.resolved.cues.find((c) => c.id === cue.id);
    const token = resolvedCue && resolvedCue.tokens.find((t) => t.source === word.t);
    if (token) {
      extra = " This word renders at " + token.style.fontSize + "px, weight " + token.style.weight + ", width " + token.style.width + ".";
    }
  }
  node.className = "stat" + (stats.fast ? " warn" : "");
  node.textContent = stats.chars + " characters over " + stats.displayDur.toFixed(1) + "s of read-ahead (" + stats.cps.toFixed(1) + " cps). " + (stats.fast ? "Faster than 17 cps — give it more lead or split the line. " : "Reading pace is inside the usual caption range. ") + extra;
}

function renderLegend() {
  const root = $("legend");
  root.replaceChildren();
  root.classList.toggle("hidden", !state.showLegend);
  state.project.characters.forEach((c) => {
    root.appendChild(el("i", null, [el("b", { style: "background:" + c.color }), c.name]));
  });
}

function renderTimeline() {
  const root = $("timeline");
  const dur = Math.max(8, state.resolved ? state.resolved.duration : 8);
  root.style.width = (dur * PX + 24) + "px";
  root.replaceChildren();
  root.appendChild(el("div", { class: "tl-grid" }));
  for (let t = 0; t <= dur; t += 1) {
    root.appendChild(el("span", { class: "tick", style: "left:" + (t * PX) + "px" }, formatShort(t)));
  }
  const lanes = {};
  state.resolved.cues.forEach((cue) => {
    const key = cue.edge + ":" + (cue.position || "");
    lanes[key] = (lanes[key] || 0) + 1;
  });
  state.resolved.cues.forEach((cue, index) => {
    const editorial = cueById(cue.id);
    const top = 22 + (index % 4) * 26;
    const bar = el("button", {
      type: "button",
      class: "cue-bar" + (cue.id === state.selectedCueId ? " active" : ""),
      style: "left:" + (cue.displayIn * PX) + "px;width:" + Math.max(8, (cue.displayOut - cue.displayIn) * PX) + "px;top:" + top + "px;background:" + cue.color,
    }, cue.speaker);
    const speechLeft = ((cue.speechStart - cue.displayIn) / Math.max(0.05, cue.displayOut - cue.displayIn)) * 100;
    const speechWidth = ((cue.speechEnd - cue.speechStart) / Math.max(0.05, cue.displayOut - cue.displayIn)) * 100;
    bar.appendChild(el("i", { class: "speech", style: "left:" + speechLeft + "%;width:" + speechWidth + "%" }));
    bar.addEventListener("pointerdown", (ev) => startCueDrag(ev, editorial, bar));
    bar.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      state.selectedCueId = cue.id;
      state.inspect = "cue";
      state.selectedWord = 0;
      seek(cue.speechStart);
      renderCues();
      renderInspector();
      renderTimeline();
      paintFrame();
    });
    root.appendChild(bar);
  });
  root.appendChild(el("div", { class: "playhead", id: "playhead" }));
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.addEventListener("pointerdown", onTimelineSeek);
  }
}

let drag = null;
let suppressClick = false;
function startCueDrag(ev, cue, bar) {
  if (!cue || ev.button !== 0) return;
  ev.stopPropagation();
  drag = {
    id: cue.id,
    originX: ev.clientX,
    start: cue.speechStart,
    end: cue.speechEnd,
    moved: false,
    bar,
  };
  bar.setPointerCapture(ev.pointerId);
  bar.addEventListener("pointermove", onCueDrag);
  bar.addEventListener("pointerup", endCueDrag);
}
function onCueDrag(ev) {
  if (!drag) return;
  const cue = cueById(drag.id);
  if (!cue) return;
  const delta = (ev.clientX - drag.originX) / PX;
  if (!drag.moved) {
    if (Math.abs(delta) < 0.04) return;
    snapshot();
    drag.moved = true;
  }
  const nextStart = Math.max(0, drag.start + delta);
  scaleCueSpeech(cue, nextStart, nextStart + (drag.end - drag.start));
  refreshResolved();
  const resolved = state.resolved.cues.find((c) => c.id === cue.id);
  if (resolved && drag.bar) {
    drag.bar.style.left = (resolved.displayIn * PX) + "px";
    drag.bar.style.width = Math.max(8, (resolved.displayOut - resolved.displayIn) * PX) + "px";
  }
  paintFrame();
}
function endCueDrag(ev) {
  if (drag && drag.bar) {
    drag.bar.removeEventListener("pointermove", onCueDrag);
    drag.bar.removeEventListener("pointerup", endCueDrag);
  }
  const moved = drag && drag.moved;
  drag = null;
  suppressClick = !!moved;
  if (moved) refreshAll();
}
function onTimelineSeek(ev) {
  if (ev.target.closest(".cue-bar")) return;
  const rect = $("timeline").getBoundingClientRect();
  seek((ev.clientX - rect.left + $("tl-wrap").scrollLeft) / PX);
}

function paintFrame() {
  if (!state.resolved) return;
  const stage = $("stage");
  const scale = stage.clientWidth / state.project.width;
  const cue = selectedCue();
  const word = cue && cue.words ? cue.words[state.selectedWord] : null;
  const opts = {
    scale,
    flex: state.fontOk,
    selectedCueId: state.selectedCueId,
    selectedWord: word ? word.t : null,
    pop: state.project.popEnabled !== false,
  };
  $("captions").classList.toggle("hidden", state.showLegacy);
  $("legacy").classList.toggle("hidden", !state.showLegacy);
  if (state.showLegacy) renderLegacy($("legacy"), state.resolved, state.time, opts);
  else renderCaptions($("captions"), state.resolved, state.time, opts);
  const head = $("playhead");
  if (head) head.style.left = (state.time * PX) + "px";
  $("timecode").textContent = formatTC(state.time, state.project.fps);
  if (state.playing) {
    const wrap = $("tl-wrap");
    const x = state.time * PX;
    if (x < wrap.scrollLeft + 30 || x > wrap.scrollLeft + wrap.clientWidth - 40) {
      wrap.scrollLeft = Math.max(0, x - wrap.clientWidth * 0.35);
    }
  }
}

function seek(t) {
  const dur = state.resolved ? state.resolved.duration : 10;
  state.time = clamp(t, 0, dur);
  const video = $("video");
  if (state.videoUrl && Math.abs(video.currentTime - state.time) > 0.05) {
    video.currentTime = state.time;
  }
  paintFrame();
}

function togglePlay() {
  state.playing = !state.playing;
  $("play").textContent = state.playing ? "Pause" : "Play";
  const video = $("video");
  if (state.videoUrl) {
    if (state.playing) video.play().catch(() => {});
    else video.pause();
  }
}

function formatTC(t, fps) {
  const rate = fps || 24;
  const frames = Math.max(0, Math.round(t * rate));
  const ff = frames % Math.round(rate);
  const total = Math.floor(frames / Math.round(rate));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return pad(h) + ":" + pad(m) + ":" + pad(s) + ":" + pad(ff);
}
function formatShort(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ":" + String(s).padStart(2, "0");
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
}
function download(filename, text, type) {
  const blob = new Blob([text], { type: type || "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function slug(s) {
  return String(s || "captions").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "captions";
}
function payload() {
  const resolved = resolveProject(state.project);
  return Object.assign({}, state.project, {
    duration: resolved.duration,
    baselinePx: resolved.baselinePx,
    resolvedCues: resolved.cues,
    legend: resolved.legend,
    engine: ENGINE_VERSION,
  });
}

async function exportJsx() {
  const data = payload();
  let engine = "";
  let fontB64 = "";
  try {
    const res = await fetch("../after-effects/cwi-engine.jsx", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    engine = await res.text();
  } catch (e) {
    download(slug(state.project.title) + ".cwi.json", JSON.stringify(data, null, 2), "application/json");
    alert("Could not load the After Effects builder from this page. The project JSON was downloaded instead. Run after-effects/Build-Intention-Project.jsx in After Effects for the included sample, or open the panel and import this JSON.");
    return;
  }
  try {
    const fontRes = await fetch("../fonts/RobotoFlex.ttf", { cache: "no-store" });
    if (fontRes.ok) fontB64 = bytesToBase64(await fontRes.arrayBuffer());
  } catch (e2) {}
  const embedded = JSON.stringify(data)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const chunks = [];
  for (let i = 0; i < fontB64.length; i += 40000) chunks.push(fontB64.slice(i, i + 40000));
  const fontBlock = chunks.length
    ? "var CWI_FONT_B64 = [\r\n" + chunks.map((c) => "\"" + c + "\"").join(",\r\n") + "\r\n].join(\"\");"
    : "var CWI_FONT_B64 = \"\";";
  const script = [
    "#target aftereffects",
    "/*",
    "  Intention Captions project.",
    "  File > Scripts > Run Script File.",
    "  Builds the comps in the open project, installs the bundled Roboto Flex, and saves an .aep.",
    "  You do not need the official Caption with Intention project.",
    "  Preferences > Scripting & Expressions > Allow Scripts to Write Files and Access Network.",
    "*/",
    "var CWI_JSON = \"" + embedded + "\";",
    fontBlock,
    engine,
    "var __cwiFont = cwiInstallBundledFont(CWI_FONT_B64);",
    "var __cwiResult = cwiBuildFromJSON(CWI_JSON, { placeOnActive: true, useAxes: true, fontName: \"RobotoFlex-Regular\", designBoard: false });",
    "cwiFinishBuild(__cwiResult, __cwiFont, \"Intention-Captions.aep\");",
    "",
  ].join("\r\n");
  download(slug(state.project.title) + ".jsx", "\uFEFF" + script, "text/plain");
  $("note").textContent = "Project script downloaded. In After Effects choose File → Scripts → Run Script File. It builds the comps and saves the .aep. You do not need their official file.";
}

function loadProject(project) {
  state.project = project;
  if (!state.project.characters) state.project.characters = [];
  if (!state.project.cues) state.project.cues = [];
  state.project.cues.forEach((cue) => {
    if (!cue.words || !cue.words.length) {
      retokenizeCue(cue);
      applyVoice(cue, charById(cue.speakerId));
    }
  });
  state.history = [];
  state.future = [];
  state.time = 0;
  state.inspect = "cue";
  state.selectedCueId = state.project.cues[0] ? state.project.cues[0].id : null;
  state.selectedCharId = state.project.characters[0] ? state.project.characters[0].id : null;
  refreshAll();
  if ($("set-w")) fillSettings();
}

function loadMedia(file) {
  const url = URL.createObjectURL(file);
  const video = $("video");
  const plate = $("plate");
  if (file.type.indexOf("image/") === 0) {
    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = url;
    plate.src = url;
    plate.classList.remove("hidden");
    video.pause();
    video.classList.add("hidden");
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = null;
    $("drop-hint").classList.add("hidden");
    return;
  }
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = url;
  video.src = url;
  video.classList.remove("hidden");
  plate.classList.add("hidden");
  $("drop-hint").classList.add("hidden");
  video.addEventListener("loadedmetadata", () => {
    if (!state.project.duration || state.project.duration < video.duration) {
      state.project.duration = video.duration;
      refreshResolved();
      renderTimeline();
    }
  }, { once: true });
}

function importSrtText(text) {
  const parsed = parseSrt(text);
  if (!parsed.length) {
    alert("No cues found in that subtitle file.");
    return;
  }
  snapshot();
  if (!state.project.characters.length) {
    const swatch = suggestColor([], "main");
    state.project.characters.push({
      id: uid("p"), name: "Speaker", role: "main", color: swatch.hex,
      baseVolume: 50, basePitch: 50, hero: false, villain: false,
    });
  }
  const speakerId = state.selectedCharId || state.project.characters[0].id;
  const speaker = charById(speakerId);
  parsed.forEach((item) => {
    const cue = {
      id: uid("c"),
      type: "dialogue",
      speakerId,
      text: item.text,
      speechStart: round1(item.start),
      speechEnd: round1(item.end),
      position: "bottom",
      offscreen: false,
    };
    retokenizeCue(cue);
    applyVoice(cue, speaker);
    state.project.cues.push(cue);
  });
  refreshAll();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim()));
}

function importCsvText(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return;
  const head = rows[0].map((h) => h.trim());
  const idx = (name) => head.indexOf(name);
  snapshot();
  const byCue = new Map();
  rows.slice(1).forEach((cols) => {
    const id = cols[idx("cue")] || uid("c");
    if (!byCue.has(id)) {
      byCue.set(id, {
        id,
        type: cols[idx("type")] || "dialogue",
        speakerName: cols[idx("speaker")] || "",
        textParts: [],
        speechStart: Number(cols[idx("speechStart")]) || 0,
        speechEnd: Number(cols[idx("speechEnd")]) || 1,
        position: cols[idx("position")] || "bottom",
        offscreen: cols[idx("offscreen")] === "yes",
        words: [],
      });
    }
    const cue = byCue.get(id);
    const word = cols[idx("word")] || "";
    cue.textParts.push(word);
    cue.words.push({
      t: word,
      start: Number(cols[idx("wordStart")]) || cue.speechStart,
      end: Number(cols[idx("wordEnd")]) || cue.speechEnd,
      volume: cols[idx("volume")] === "" ? undefined : Number(cols[idx("volume")]),
      pitch: cols[idx("pitch")] === "" ? undefined : Number(cols[idx("pitch")]),
      syllables: cols[idx("syllables")] || undefined,
    });
  });
  const nameToId = {};
  state.project.characters.forEach((c) => { nameToId[c.name] = c.id; });
  const cues = [];
  byCue.forEach((cue) => {
    if (cue.speakerName && !nameToId[cue.speakerName]) {
      const swatch = suggestColor(state.project.characters, "supporting");
      const id = uid("p");
      state.project.characters.push({
        id, name: cue.speakerName, role: "supporting", color: swatch.hex,
        baseVolume: 50, basePitch: 50, hero: false, villain: false,
      });
      nameToId[cue.speakerName] = id;
    }
    cue.speakerId = nameToId[cue.speakerName] || null;
    cue.text = cue.textParts.join(" ").replace(/^♪\s*/, "").replace(/^\[|\]$/g, "");
    delete cue.textParts;
    delete cue.speakerName;
    cues.push(cue);
  });
  state.project.cues = cues;
  refreshAll();
}

function fillSettings() {
  const p = state.project;
  $("set-w").value = p.width;
  $("set-h").value = p.height;
  $("set-fps").value = String(p.fps);
  $("set-base").value = p.baselinePercent;
  $("set-box").value = p.boxOpacity;
  $("set-lead").value = p.leadIn;
  $("set-hold").value = p.hold;
  $("set-sync").value = p.syncStyle;
  $("set-pop").checked = p.popEnabled !== false;
  $("set-sound").value = p.soundColor;
  $("set-music").value = p.musicColor;
  $("set-font").value = p.fontPostScript || "RobotoFlex-Regular";
  const preset = $("set-preset");
  const match = PRESETS.find((item) => item.width === p.width && item.height === p.height);
  preset.value = match ? match.id : "";
}

function bindSettings() {
  const preset = $("set-preset");
  PRESETS.forEach((item) => preset.appendChild(el("option", { value: item.id }, item.label)));
  preset.appendChild(el("option", { value: "" }, "Custom"));
  const apply = () => {
    snapshot();
    const p = state.project;
    p.width = Number($("set-w").value) || 1920;
    p.height = Number($("set-h").value) || 1080;
    p.fps = Number($("set-fps").value) || 24;
    p.baselinePercent = Number($("set-base").value) || defaultBaselinePercent(p.width, p.height);
    p.boxOpacity = Number($("set-box").value);
    p.leadIn = Number($("set-lead").value);
    p.hold = Number($("set-hold").value);
    p.syncStyle = $("set-sync").value;
    p.popEnabled = $("set-pop").checked;
    p.soundColor = $("set-sound").value;
    p.musicColor = $("set-music").value;
    p.fontPostScript = $("set-font").value.trim() || "RobotoFlex-Regular";
    refreshAll();
  };
  ["set-w", "set-h", "set-fps", "set-base", "set-box", "set-lead", "set-hold", "set-sync", "set-pop", "set-sound", "set-music", "set-font"].forEach((id) => {
    $(id).addEventListener("change", apply);
  });
  preset.addEventListener("change", () => {
    const item = PRESETS.find((p) => p.id === preset.value);
    if (!item) return;
    $("set-w").value = item.width;
    $("set-h").value = item.height;
    $("set-fps").value = String(item.fps);
    $("set-base").value = defaultBaselinePercent(item.width, item.height);
    apply();
  });
}

function bindMenus() {
  document.querySelectorAll(".menu").forEach((menu) => {
    const toggle = menu.querySelector("button");
    toggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const open = menu.classList.contains("open");
      document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
      if (!open) menu.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open"));
  });
}

function bindFiles() {
  const pick = (id, handler) => {
    const input = $(id);
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (file) handler(file);
    });
  };
  pick("file-json", (file) => file.text().then((text) => {
    const data = JSON.parse(text);
    delete data.resolvedCues;
    loadProject(data);
  }).catch(() => alert("That JSON could not be read.")));
  pick("file-srt", (file) => file.text().then(importSrtText));
  pick("file-csv", (file) => file.text().then(importCsvText));
  pick("file-media", loadMedia);
  $("import-json").addEventListener("click", () => $("file-json").click());
  $("import-srt").addEventListener("click", () => $("file-srt").click());
  $("import-csv").addEventListener("click", () => $("file-csv").click());
  $("import-media").addEventListener("click", () => $("file-media").click());
  $("export-json").addEventListener("click", () => download(slug(state.project.title) + ".cwi.json", JSON.stringify(payload(), null, 2), "application/json"));
  $("export-srt").addEventListener("click", () => download(slug(state.project.title) + ".srt", toSrt(state.project), "application/x-subrip"));
  $("export-csv").addEventListener("click", () => download(slug(state.project.title) + ".csv", toCsv(state.project), "text/csv"));
  $("export-jsx").addEventListener("click", exportJsx);
}

function bindStageDrop() {
  const stage = $("stage");
  stage.addEventListener("dragover", (ev) => ev.preventDefault());
  stage.addEventListener("drop", (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!file) return;
    if (file.type.indexOf("video/") === 0 || file.type.indexOf("image/") === 0) loadMedia(file);
    else if (/\.json$/i.test(file.name)) file.text().then((text) => { const data = JSON.parse(text); delete data.resolvedCues; loadProject(data); });
    else if (/\.(srt|vtt)$/i.test(file.name)) file.text().then(importSrtText);
  });
}

function bindKeys() {
  document.addEventListener("keydown", (ev) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
      return;
    }
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      download(slug(state.project.title) + ".cwi.json", JSON.stringify(payload(), null, 2), "application/json");
      return;
    }
    if (typing) return;
    if (ev.code === "Space") { ev.preventDefault(); togglePlay(); }
    if (ev.key === "ArrowLeft") seek(state.time - (ev.shiftKey ? 1 : 1 / state.project.fps));
    if (ev.key === "ArrowRight") seek(state.time + (ev.shiftKey ? 1 : 1 / state.project.fps));
    const cue = selectedCue();
    const word = cue && cue.words && cue.words[state.selectedWord];
    if (word && ev.key === "ArrowUp") {
      ev.preventDefault();
      snapshot();
      if (ev.shiftKey) word.pitch = clamp((word.pitch || 50) + 2, 0, 100);
      else word.volume = clamp((word.volume || 50) + 2, 0, 100);
      refreshAll();
    }
    if (word && ev.key === "ArrowDown") {
      ev.preventDefault();
      snapshot();
      if (ev.shiftKey) word.pitch = clamp((word.pitch || 50) - 2, 0, 100);
      else word.volume = clamp((word.volume || 50) - 2, 0, 100);
      refreshAll();
    }
    if (ev.key === "[") {
      const words = cue && cue.words;
      if (words && state.selectedWord > 0) {
        state.selectedWord -= 1;
        seek(words[state.selectedWord].start);
        renderInspector();
      }
    }
    if (ev.key === "]") {
      const words = cue && cue.words;
      if (words && state.selectedWord < words.length - 1) {
        state.selectedWord += 1;
        seek(words[state.selectedWord].start);
        renderInspector();
      }
    }
  });
}

function spaceMains() {
  snapshot();
  const pool = MAIN_COLORS.slice();
  const mains = state.project.characters.filter((c) => c.role === "main");
  const hero = mains.find((c) => c.hero) || mains[0];
  mains.forEach((character) => {
    if (character === hero) {
      const yellow = pool.findIndex((c) => c.id === "yellow");
      character.color = pool.splice(yellow >= 0 ? yellow : 0, 1)[0].hex;
      return;
    }
    if (character.villain && hero) {
      const opp = oppositeMain(hero.color);
      character.color = opp.hex;
      const at = pool.findIndex((c) => c.hex === opp.hex);
      if (at >= 0) pool.splice(at, 1);
      return;
    }
    let best = 0;
    let bestScore = -1;
    pool.forEach((swatch, index) => {
      const others = state.project.characters.filter((c) => c !== character);
      const score = others.length ? Math.min(...others.map((c) => hueDistance(swatch.hue, hexToHue(c.color)))) : 180;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (pool[best]) character.color = pool.splice(best, 1)[0].hex;
  });
  refreshAll();
}

let lastTick = 0;
function loop(now) {
  if (!lastTick) lastTick = now;
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  if (state.playing) {
    const video = $("video");
    if (state.videoUrl && video.readyState >= 2 && !video.paused) state.time = video.currentTime;
    else state.time += dt;
    const dur = state.resolved ? state.resolved.duration : 10;
    if (state.time >= dur) {
      state.time = 0;
      if (state.videoUrl) video.currentTime = 0;
    }
    paintFrame();
  }
  requestAnimationFrame(loop);
}

async function detectFont() {
  const banner = $("font-banner");
  try {
    await document.fonts.load("400 64px 'Roboto Flex'");
    state.fontOk = document.fonts.check("64px 'Roboto Flex'");
  } catch (e) {
    state.fontOk = false;
  }
  banner.classList.toggle("hidden", state.fontOk);
  if (!state.fontOk) {
    banner.textContent = "Roboto Flex did not load, so this preview is approximating pitch. The After Effects export still writes real weight and width. Install Roboto Flex (free, SIL Open Font License) before you build.";
  }
  paintFrame();
}

function init() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) {}
  loadProject(stored && stored.cues ? stored : createSampleProject());
  bindSettings();
  bindMenus();
  bindFiles();
  bindStageDrop();
  bindKeys();
  fillSettings();
  $("title").addEventListener("input", () => { state.project.title = $("title").value; persist(); });
  $("title").addEventListener("change", () => snapshot());
  $("add-char").addEventListener("click", () => addCharacter(state.project.characters.length < 2 ? "main" : "supporting"));
  $("add-cue").addEventListener("click", addCue);
  $("space-colors").addEventListener("click", spaceMains);
  $("play").addEventListener("click", togglePlay);
  $("back").addEventListener("click", () => seek(state.time - 1));
  $("fwd").addEventListener("click", () => seek(state.time + 1));
  $("toggle-legacy").addEventListener("click", () => {
    state.showLegacy = !state.showLegacy;
    $("toggle-legacy").setAttribute("aria-pressed", String(state.showLegacy));
    $("note").textContent = state.showLegacy
      ? "Legacy captions: one white line, no speaker, no timing inside the line, no voice."
      : "White is read-ahead. Color names the speaker as the word is spoken. Bigger is louder. Heavy and wide is a lower voice.";
    paintFrame();
  });
  $("toggle-safe").addEventListener("click", () => {
    state.showSafe = !state.showSafe;
    $("stage").classList.toggle("show-safe", state.showSafe);
    $("toggle-safe").setAttribute("aria-pressed", String(state.showSafe));
  });
  $("toggle-legend").addEventListener("click", () => {
    state.showLegend = !state.showLegend;
    $("toggle-legend").setAttribute("aria-pressed", String(state.showLegend));
    renderLegend();
  });
  $("load-sample").addEventListener("click", () => {
    if (state.project.cues.length && !confirm("Replace the current project with the Northbound sample?")) return;
    localStorage.removeItem(STORAGE_KEY);
    loadProject(createSampleProject());
  });
  $("btn-rules").addEventListener("click", () => $("rules").showModal());
  $("btn-settings").addEventListener("click", () => { fillSettings(); $("settings").showModal(); });
  document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", () => btn.closest("dialog").close()));
  detectFont();
  window.addEventListener("resize", () => paintFrame());
  const first = state.resolved && state.resolved.cues[0];
  if (first) seek(first.displayIn + 0.04);
  requestAnimationFrame(loop);
  state.playing = true;
  $("play").textContent = "Pause";
}

init();
