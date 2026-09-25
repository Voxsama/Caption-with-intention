import { speakProgress, popEnvelope, RULES } from "./system.js";

const SVGNS = "http://www.w3.org/2000/svg";

export function renderCaptions(root, resolved, time, options) {
  root.replaceChildren();
  if (!resolved) return;
  const scale = options.scale || 1;
  const syncStyle = resolved.syncStyle || "within-word";
  const active = resolved.cues.filter((c) => time >= c.displayIn && time <= c.displayOut);
  active.forEach((cue) => {
    const anchor = document.createElement("div");
    anchor.className = "cap-anchor" + (options.selectedCueId === cue.id ? " is-selected" : "");
    anchor.style.left = "50%";
    anchor.style.transform = "translateX(-50%)";
    if (cue.edge === "top") {
      anchor.style.top = cue.pct + "%";
      anchor.style.bottom = "auto";
    } else {
      anchor.style.bottom = cue.pct + "%";
      anchor.style.top = "auto";
    }
    const box = document.createElement("div");
    box.className = "cap-box";
    box.style.fontSize = (resolved.baselinePx * scale) + "px";
    box.style.background = "rgba(0,0,0," + (resolved.boxOpacity != null ? resolved.boxOpacity : 1) + ")";
    box.style.maxWidth = (RULES.safeWidth * 100) + "%";

    const groups = groupTokens(cue.tokens);
    groups.forEach((group) => {
      const wrap = document.createElement("span");
      wrap.className = group.length > 1 ? "syl-group" : "word-slot";
      const tokenOpts = Object.assign({}, options, {
        selectedWord: options.selectedCueId === cue.id ? options.selectedWord : null,
      });
      group.forEach((token) => {
        wrap.appendChild(renderToken(token, time, syncStyle, scale, tokenOpts));
      });
      box.appendChild(wrap);
    });
    anchor.appendChild(box);
    root.appendChild(anchor);
  });
}

function groupTokens(tokens) {
  const groups = [];
  (tokens || []).forEach((token) => {
    if (token.glue && groups.length) groups[groups.length - 1].push(token);
    else groups.push([token]);
  });
  return groups;
}

function renderToken(token, time, syncStyle, scale, options) {
  const style = token.style || {};
  const progress = speakProgress(time, token.start, token.end, syncStyle);
  const spoken = progress > 0;
  const env = options.pop === false || style.pop <= 1 ? 0 : popEnvelope(time, token.start, token.end);
  const pop = 1 + ((style.pop || 1.15) - 1) * env;
  const lift = (style.fontSize || 40) * scale * 0.12 * env;
  const el = document.createElement("span");
  el.className = "word" + (spoken ? " is-spoken" : "") + (options.selectedWord === token.source ? " is-current" : "");
  el.style.fontSize = ((style.fontSize || 40) * scale) + "px";
  el.style.opacity = spoken ? "1" : String(RULES.readAheadOpacity);
  el.style.transform = "translateY(" + (-lift) + "px) scale(" + pop + ")";
  const slant = style.slant || 0;
  if (options.flex) {
    el.style.fontFamily = "'Roboto Flex', 'Arial', sans-serif";
    el.style.fontVariationSettings = '"wght" ' + (style.weight || 460) + ', "wdth" ' + (style.width || 100) + ', "opsz" ' + (style.opsz || 48) + ', "slnt" ' + slant + ', "GRAD" 0';
  } else {
    el.style.fontFamily = "Arial, Helvetica, sans-serif";
    el.style.fontWeight = String(Math.max(200, Math.min(900, Math.round((style.weight || 400) / 100) * 100)));
    el.style.fontStyle = slant < -2 ? "italic" : "normal";
    el.style.transform += " scaleX(" + ((style.width || 100) / 100) + ")";
  }

  const chars = Array.from(token.text || "");
  const cut = Math.round(progress * chars.length);
  const a = document.createElement("span");
  a.className = "spoken";
  a.style.color = style.color || "#fff";
  a.textContent = chars.slice(0, cut).join("");
  const b = document.createElement("span");
  b.className = "unread";
  b.textContent = chars.slice(cut).join("");
  if (a.textContent) el.appendChild(a);
  if (b.textContent) el.appendChild(b);
  return el;
}

export function renderLegacy(root, resolved, time, options) {
  root.replaceChildren();
  if (!resolved) return;
  const scale = options.scale || 1;
  const active = resolved.cues.filter((c) => time >= c.displayIn && time <= c.displayOut);
  active.forEach((cue) => {
    const anchor = document.createElement("div");
    anchor.className = "cap-anchor";
    anchor.style.left = "50%";
    anchor.style.transform = "translateX(-50%)";
    anchor.style.bottom = "8%";
    const box = document.createElement("div");
    box.className = "cap-box legacy";
    box.style.fontSize = (resolved.baselinePx * scale) + "px";
    box.textContent = cue.text;
    anchor.appendChild(box);
    root.appendChild(anchor);
  });
}

export function drawWheel(svg, onPick) {
  svg.replaceChildren();
  const data = svg.__palette;
  if (!data) return;
  // Outer ring is the six published main colors. Middle ring is the twelve
  // supporting hues that sit between them. Inner ring is the pastel minors.
  [
    { spec: { r: 78, w: 24 }, colors: data.main },
    { spec: { r: 54, w: 20 }, colors: data.supporting },
    { spec: { r: 32, w: 16 }, colors: data.minor },
  ].forEach(({ spec, colors }) => {
    const circ = 2 * Math.PI * spec.r;
    const gap = colors.length > 8 ? 1.6 : 2.4;
    const seg = circ / colors.length - gap;
    colors.forEach((color, i) => {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", "100");
      c.setAttribute("cy", "100");
      c.setAttribute("r", String(spec.r));
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", color.hex);
      c.setAttribute("stroke-width", String(spec.w));
      c.setAttribute("stroke-dasharray", seg + " " + (circ - seg));
      c.setAttribute("stroke-dashoffset", String(-(i * circ) / colors.length + circ * 0.25));
      c.setAttribute("class", "swatch");
      c.dataset.hex = color.hex;
      c.dataset.role = color.role;
      c.dataset.name = color.name;
      c.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onPick(color);
      });
      svg.appendChild(c);
    });
  });
  const hole = document.createElementNS(SVGNS, "circle");
  hole.setAttribute("cx", "100");
  hole.setAttribute("cy", "100");
  hole.setAttribute("r", "18");
  hole.setAttribute("fill", "#0e0e0c");
  hole.setAttribute("stroke", "#3a342c");
  svg.appendChild(hole);
}
