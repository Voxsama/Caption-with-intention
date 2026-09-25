/*
  Intention Captions — After Effects builder
  ------------------------------------------
  Independent implementation of the published Caption with Intention rules:

    Attribution      one color per speaker. Main / supporting / minor
                     hues are chosen in the studio, then burned in here.
    Synchronization  the whole line is on screen in white at 90% so viewers
                     can read ahead. Each word shifts to the speaker color
                     as it is spoken, and pops 15% to mark the moment.
    Intonation       font size follows volume. Weight and width follow pitch
                     (heavy + wide = low voice, light + condensed = high).
                     Off-screen speech, sound, and music use slant / italics.

  Requires a project JSON exported from the studio (it carries resolvedCues).
  Roboto Flex ships in fonts/RobotoFlex.ttf. The project script installs it.
  You do not need the official After Effects file.
  Variable-font axis scripting needs After Effects 26. Older versions still
  build the comp: size, horizontal scale, and faux italic/bold stand in.

  This file defines functions only. Run IntentionCaptions.jsx, or a script
  exported from the studio.
*/

var CWI_ENGINE_VERSION = "1.0.0";

var CWI_FONT_CANDIDATES = [
  "RobotoFlex-Regular",
  "RobotoFlex",
  "Roboto Flex",
  "RobotoFlex-Variable",
  "Roboto-Regular",
  "ArialMT",
  "Arial"
];

function cwiParse(text) {
  var src = String(text || "").replace(/^\uFEFF/, "");
  if (typeof JSON !== "undefined" && JSON.parse) {
    return JSON.parse(src);
  }
  return eval("(" + src + ")");
}

function cwiClamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function cwiHexToRgb(hex) {
  var h = String(hex || "#FFFFFF").replace("#", "");
  if (h.length === 3) {
    h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  }
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  ];
}

function cwiSafe(s) {
  var str = String(s || "");
  var out = "";
  var i;
  for (i = 0; i < str.length && out.length < 28; i++) {
    var c = str.charAt(i);
    if (c === "\"" || c === "\\" || c === "/" || c === ":" || c === "*") c = " ";
    out += c;
  }
  return out || "line";
}

function cwiSnap(t, fps) {
  var f = fps || 24;
  return Math.round(t * f) / f;
}

function cwiHold(prop, t, value) {
  prop.setValueAtTime(t, value);
  try {
    var ix = prop.nearestKeyIndex(t);
    prop.setInterpolationTypeAtKey(ix, KeyframeInterpolationType.HOLD);
  } catch (e) {}
}

function cwiEase(prop, t) {
  try {
    var ix = prop.nearestKeyIndex(t);
    var dim = 1;
    try {
      dim = prop.keyValue(ix).length || 1;
    } catch (e0) {
      dim = 1;
    }
    var inn = [];
    var out = [];
    var i;
    for (i = 0; i < dim; i++) {
      inn.push(new KeyframeEase(0, 40));
      out.push(new KeyframeEase(0, 70));
    }
    prop.setInterpolationTypeAtKey(ix, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(ix, inn, out);
  } catch (e) {}
}

function cwiTransform(layer, match) {
  return layer.property("ADBE Transform Group").property(match);
}

function cwiTryFont(textProp, name) {
  if (!name) return "";
  try {
    var doc = textProp.value;
    doc.font = name;
    textProp.setValue(doc);
    var got = String(textProp.value.font || "");
    if (got === name) return got;
    if (name.indexOf("Roboto") !== -1 && got.indexOf("Roboto") !== -1) {
      if (name.indexOf("Flex") === -1 || got.indexOf("Flex") !== -1) return got;
    }
  } catch (e) {}
  return "";
}

function cwiStaticWeightName(weight) {
  if (weight < 220) return "Roboto-Thin";
  if (weight < 350) return "Roboto-Light";
  if (weight < 480) return "Roboto-Regular";
  if (weight < 620) return "Roboto-Medium";
  if (weight < 800) return "Roboto-Bold";
  return "Roboto-Black";
}

function cwiApplyAxes(layer, weight, width, slant, opsz) {
  try {
    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
    var anim = animators.addProperty("ADBE Text Animator");
    anim.name = "Pitch axes";
    var props = anim.property("ADBE Text Animator Properties");
    if (!props || typeof props.addVariableFontAxis !== "function") return false;
    var tags = [
      ["wght", weight],
      ["wdth", width],
      ["slnt", slant],
      ["opsz", opsz]
    ];
    var any = false;
    var i;
    for (i = 0; i < tags.length; i++) {
      try {
        var axis = props.addVariableFontAxis(tags[i][0]);
        axis.setValue(tags[i][1]);
        any = true;
      } catch (axisErr) {}
    }
    return any;
  } catch (e) {
    return false;
  }
}

function cwiAddColorWipe(layer, rgb, start, end, syncStyle) {
  try {
    var anim = layer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
    anim.name = "Spoken color";
    var props = anim.property("ADBE Text Animator Properties");
    var fill = props.addProperty("ADBE Text Fill Color");
    fill.setValue(rgb);
    var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    try {
      sel.property("ADBE Text Percent Start").setValue(0);
    } catch (e1) {}
    try {
      var advanced = sel.property("ADBE Text Range Advanced");
      advanced.property("ADBE Text Selector Smoothness").setValue(0);
    } catch (e2) {}
    var endProp = sel.property("ADBE Text Percent End");
    if (syncStyle === "word-snap") {
      cwiHold(endProp, Math.max(0, start - 0.02), 0);
      cwiHold(endProp, start, 100);
    } else {
      endProp.setValueAtTime(start, 0);
      endProp.setValueAtTime(Math.max(start + 1 / 24, end), 100);
    }
    return true;
  } catch (e) {
    return false;
  }
}

function cwiMeasure(layer, sampleTime) {
  var rect = null;
  try {
    rect = layer.sourceRectAtTime(sampleTime, false);
  } catch (e) {}
  if (!rect || !rect.width) {
    var guess = 40;
    try {
      guess = layer.property("ADBE Text Properties").property("ADBE Text Document").value.fontSize || 40;
    } catch (e2) {}
    var text = "";
    try {
      text = layer.property("ADBE Text Properties").property("ADBE Text Document").value.text || "";
    } catch (e3) {}
    return { left: 0, top: -guess * 0.8, width: Math.max(8, text.length * guess * 0.52), height: guess };
  }
  return rect;
}

function cwiLabelIndex(hex) {
  var rgb = cwiHexToRgb(hex || "#FFFFFF");
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  if (r > 0.7 && g > 0.7 && b < 0.4) return 2;
  if (b > 0.7 && g > 0.7 && r < 0.4) return 14;
  if (r > 0.7 && g < 0.4 && b < 0.4) return 1;
  if (g > 0.7 && r < 0.4 && b < 0.4) return 9;
  if (r > 0.7 && b > 0.7) return 10;
  if (r > 0.7 && g > 0.4) return 11;
  return 8;
}

function cwiAddBox(comp, name, wordNames, padX, padY, opacity, inT, outT) {
  var layer = comp.layers.addShape();
  layer.name = name;
  layer.inPoint = inT;
  layer.outPoint = outT;
  layer.moveToEnd();
  var contents = layer.property("Contents");
  var group = contents.addProperty("ADBE Vector Group");
  group.name = "Plate";
  var rect = group.property("Contents").addProperty("ADBE Vector Shape - Rect");
  var fill = group.property("Contents").addProperty("ADBE Vector Graphic - Fill");
  fill.property("ADBE Vector Fill Color").setValue([0, 0, 0]);
  try {
    fill.property("ADBE Vector Fill Opacity").setValue(Math.round(cwiClamp(opacity, 0, 1) * 100));
  } catch (eOp) {}
  rect.property("ADBE Vector Rect Size").setValue([40, 20]);

  var list = [];
  var i;
  for (i = 0; i < wordNames.length; i++) {
    list.push('"' + wordNames[i] + '"');
  }
  var namesExpr = "[" + list.join(",") + "]";
  var sizeExpr = ""
    + "var ids = " + namesExpr + ";\n"
    + "var padX = " + padX + ";\n"
    + "var padY = " + padY + ";\n"
    + "var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;\n"
    + "for (var i = 0; i < ids.length; i++) {\n"
    + "  var L = thisComp.layer(ids[i]);\n"
    + "  if (time < L.inPoint - 0.01 || time > L.outPoint + 0.01) continue;\n"
    + "  var r = L.sourceRectAtTime(time, false);\n"
    + "  var tl = L.toComp([r.left, r.top]);\n"
    + "  var br = L.toComp([r.left + r.width, r.top + r.height]);\n"
    + "  minX = Math.min(minX, tl[0], br[0]);\n"
    + "  minY = Math.min(minY, tl[1], br[1]);\n"
    + "  maxX = Math.max(maxX, tl[0], br[0]);\n"
    + "  maxY = Math.max(maxY, tl[1], br[1]);\n"
    + "  any = true;\n"
    + "}\n"
    + "any ? [Math.max(4, maxX - minX + padX * 2), Math.max(4, maxY - minY + padY * 2)] : [4, 4];";
  var posExpr = ""
    + "var ids = " + namesExpr + ";\n"
    + "var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;\n"
    + "for (var i = 0; i < ids.length; i++) {\n"
    + "  var L = thisComp.layer(ids[i]);\n"
    + "  if (time < L.inPoint - 0.01 || time > L.outPoint + 0.01) continue;\n"
    + "  var r = L.sourceRectAtTime(time, false);\n"
    + "  var tl = L.toComp([r.left, r.top]);\n"
    + "  var br = L.toComp([r.left + r.width, r.top + r.height]);\n"
    + "  minX = Math.min(minX, tl[0], br[0]);\n"
    + "  minY = Math.min(minY, tl[1], br[1]);\n"
    + "  maxX = Math.max(maxX, tl[0], br[0]);\n"
    + "  maxY = Math.max(maxY, tl[1], br[1]);\n"
    + "  any = true;\n"
    + "}\n"
    + "var center = any ? [(minX + maxX) / 2, (minY + maxY) / 2] : [thisComp.width / 2, thisComp.height / 2];\n"
    + "thisLayer.parent ? thisLayer.parent.fromComp(center) : center;";
  rect.property("ADBE Vector Rect Size").expression = sizeExpr;
  cwiTransform(layer, "ADBE Position").expression = posExpr;
  return layer;
}

function cwiAddSafe(comp) {
  var layer = comp.layers.addShape();
  layer.name = "SAFE margins (guide)";
  layer.guideLayer = true;
  layer.shy = true;
  var group = layer.property("Contents").addProperty("ADBE Vector Group");
  var rect = group.property("Contents").addProperty("ADBE Vector Shape - Rect");
  rect.property("ADBE Vector Rect Size").setValue([comp.width * 0.8, comp.height * 0.84]);
  var stroke = group.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
  stroke.property("ADBE Vector Stroke Color").setValue([0.91, 0.76, 0.45]);
  stroke.property("ADBE Vector Stroke Width").setValue(2);
  try {
    group.property("Contents").property("ADBE Vector Graphic - Fill").remove();
  } catch (e) {}
  cwiTransform(layer, "ADBE Position").setValue([comp.width / 2, comp.height / 2]);
  return layer;
}

function cwiAddLegend(comp, legend) {
  if (!legend || !legend.length) return null;
  var lines = ["SPEAKER KEY  (guide — does not render)"];
  var i;
  for (i = 0; i < legend.length; i++) {
    lines.push(legend[i].name + "   " + legend[i].role + "   " + legend[i].color);
  }
  var layer = comp.layers.addText(lines.join("\n"));
  layer.name = "SPEAKER KEY";
  layer.guideLayer = true;
  layer.shy = true;
  var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
  var doc = textProp.value;
  doc.fontSize = Math.max(18, Math.round(comp.height * 0.018));
  doc.fillColor = [0.93, 0.9, 0.82];
  doc.applyFill = true;
  doc.justification = ParagraphJustification.LEFT_JUSTIFY;
  textProp.setValue(doc);
  cwiTransform(layer, "ADBE Position").setValue([comp.width * 0.06, comp.height * 0.08]);
  return layer;
}

function cwiBuildCue(comp, cue, index, project, fontName, useAxes, report) {
  var tokens = cue.tokens || [];
  if (!tokens.length) return;
  var fps = project.fps || 24;
  var prefix = "C" + ("0" + (index + 1)).slice(-2);
  var nullLayer = comp.layers.addNull();
  nullLayer.name = prefix + " " + cwiSafe(cue.label);
  nullLayer.label = cwiLabelIndex(cue.color);
  cwiTransform(nullLayer, "ADBE Position").setValue([0, 0]);
  cwiTransform(nullLayer, "ADBE Anchor Point").setValue([0, 0]);
  nullLayer.inPoint = cue.displayIn;
  nullLayer.outPoint = Math.max(cue.displayIn + 0.1, cue.displayOut);

  var built = [];
  var i;
  for (i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var style = token.style || {};
    var text = token.text || "";
    var layer = comp.layers.addText(text);
    layer.name = prefix + " W" + ("0" + i).slice(-2);
    layer.label = nullLayer.label;
    layer.parent = nullLayer;
    layer.inPoint = cue.displayIn;
    layer.outPoint = nullLayer.outPoint;
    layer.motionBlur = false;

    var textProp = layer.property("ADBE Text Properties").property("ADBE Text Document");
    var doc = textProp.value;
    doc.text = text;
    doc.fontSize = style.fontSize || project.baselinePx || 42;
    doc.fillColor = [1, 1, 1];
    doc.applyFill = true;
    doc.applyStroke = false;
    doc.tracking = 0;
    doc.justification = ParagraphJustification.LEFT_JUSTIFY;
    textProp.setValue(doc);

    var applied = "";
    if (fontName) applied = cwiTryFont(textProp, fontName);
    if (!applied) {
      var f;
      for (f = 0; f < CWI_FONT_CANDIDATES.length; f++) {
        applied = cwiTryFont(textProp, CWI_FONT_CANDIDATES[f]);
        if (applied) break;
      }
    }
    if (!report.font) report.font = applied || "default";
    var isFlex = applied.indexOf("Flex") !== -1 || applied.indexOf("flex") !== -1;

    var axesOn = false;
    if (useAxes && isFlex) {
      axesOn = cwiApplyAxes(layer, style.weight || 460, style.width || 100, style.slant || 0, style.opsz || style.fontSize || 48);
    }
    if (!isFlex) {
      var staticApplied = cwiTryFont(textProp, cwiStaticWeightName(style.weight || 400));
      doc = textProp.value;
      doc.fauxBold = !staticApplied && (style.weight || 400) >= 640;
      doc.fauxItalic = (style.slant || 0) < -2;
      textProp.setValue(doc);
      report.fallback = true;
    } else if (!axesOn) {
      // Flex is installed, but this AE can't drive axes. Keep the font and
      // fake width with scale. Faux bold only marks the low-pitch end.
      doc = textProp.value;
      doc.fauxBold = (style.weight || 400) >= 640;
      doc.fauxItalic = (style.slant || 0) < -2;
      textProp.setValue(doc);
      report.fallback = true;
    }

    var sample = cwiSnap(Math.max(cue.displayIn, (token.start + token.end) / 2), fps);
    var rect = cwiMeasure(layer, sample);
    var restX = axesOn ? 100 : (style.width || 100);
    var restY = 100;
    var visualW = rect.width * (restX / 100);
    built.push({
      layer: layer,
      token: token,
      style: style,
      rect: rect,
      restX: restX,
      restY: restY,
      visualW: visualW,
      name: layer.name
    });
  }

  var maxW = comp.width * 0.8;
  var lines = [];
  var line = [];
  var lineW = 0;
  for (i = 0; i < built.length; i++) {
    var item = built[i];
    var gap = 0;
    if (line.length) {
      gap = item.token.glue ? (item.style.fontSize || 40) * 0.035 : (item.style.fontSize || 40) * 0.24;
    }
    if (line.length && lineW + gap + item.visualW > maxW) {
      lines.push(line);
      line = [];
      lineW = 0;
      gap = 0;
    }
    item.gap = gap;
    line.push(item);
    lineW += gap + item.visualW;
  }
  if (line.length) lines.push(line);

  var maxFont = project.baselinePx || 42;
  for (i = 0; i < built.length; i++) {
    maxFont = Math.max(maxFont, built[i].style.fontSize || 0);
  }
  var step = maxFont * 1.38;
  var li;
  for (li = 0; li < lines.length; li++) {
    var row = lines[li];
    var total = 0;
    var k;
    for (k = 0; k < row.length; k++) total += row[k].gap + row[k].visualW;
    var x = (comp.width - total) / 2;
    var baselineY;
    if (cue.edge === "top") {
      baselineY = comp.height * ((cue.pct || 8) / 100) + maxFont * 0.82 + li * step;
    } else {
      baselineY = comp.height * (1 - (cue.pct || 8) / 100) - maxFont * 0.22 - (lines.length - 1 - li) * step;
    }
    var names = [];
    for (k = 0; k < row.length; k++) {
      var word = row[k];
      x += word.gap;
      var anchorX = word.rect.left + word.rect.width / 2;
      cwiTransform(word.layer, "ADBE Anchor Point").setValue([anchorX, 0]);
      var pos = cwiTransform(word.layer, "ADBE Position");
      var px = x + word.visualW / 2;
      var py = baselineY;
      pos.setValue([px, py]);

      var start = cwiSnap(word.token.start, fps);
      var end = cwiSnap(Math.max(start + 0.04, word.token.end), fps);
      var pop = project.popEnabled === false ? 1 : (word.style.pop || 1.15);
      var op = cwiTransform(word.layer, "ADBE Opacity");
      if (start > cue.displayIn + 0.015) {
        cwiHold(op, cwiSnap(cue.displayIn, fps), 90);
        cwiHold(op, start, 100);
      } else {
        op.setValue(100);
      }

      var rgb = cwiHexToRgb(word.style.color || cue.color || "#FFFFFF");
      var wiped = cwiAddColorWipe(word.layer, rgb, start, end, project.syncStyle || "within-word");
      if (!wiped) {
        var tp = word.layer.property("ADBE Text Properties").property("ADBE Text Document");
        var whiteDoc = tp.value;
        whiteDoc.fillColor = [1, 1, 1];
        tp.setValueAtTime(cwiSnap(cue.displayIn, fps), whiteDoc);
        var colorDoc = tp.value;
        colorDoc.fillColor = rgb;
        tp.setValueAtTime(start, colorDoc);
        report.wipeFallback = true;
      }

      if (pop > 1.001) {
        var dur = Math.min(0.26, Math.max(0.12, end - start));
        var mid = start + dur * 0.5;
        var done = start + dur;
        var sc = cwiTransform(word.layer, "ADBE Scale");
        sc.setValueAtTime(start, [word.restX, word.restY]);
        sc.setValueAtTime(mid, [word.restX * pop, word.restY * pop]);
        sc.setValueAtTime(done, [word.restX, word.restY]);
        cwiEase(sc, start);
        cwiEase(sc, mid);
        cwiEase(sc, done);
        var lift = (word.style.fontSize || maxFont) * 0.12;
        pos.setValueAtTime(start, [px, py]);
        pos.setValueAtTime(mid, [px, py - lift]);
        pos.setValueAtTime(done, [px, py]);
        cwiEase(pos, start);
        cwiEase(pos, mid);
        cwiEase(pos, done);
      } else {
        cwiTransform(word.layer, "ADBE Scale").setValue([word.restX, word.restY]);
      }
      names.push(word.name);
      x += word.visualW;
    }
    var box = cwiAddBox(
      comp,
      prefix + " BOX " + (li + 1),
      names,
      Math.round(maxFont * 0.42),
      Math.round(maxFont * 0.16),
      project.boxOpacity != null ? project.boxOpacity : 1,
      cue.displayIn,
      nullLayer.outPoint
    );
    box.parent = nullLayer;
    box.label = nullLayer.label;
  }

  try {
    var marker = new MarkerValue(cue.label);
    comp.markerProperty.setValueAtTime(cue.displayIn, marker);
  } catch (mErr) {}
}

function cwiLabel(comp, text, size, x, y, rgb) {
  var layer = comp.layers.addText(text);
  var prop = layer.property("ADBE Text Properties").property("ADBE Text Document");
  var doc = prop.value;
  doc.fontSize = size;
  doc.fillColor = rgb || [1, 1, 1];
  try { doc.justification = ParagraphJustification.LEFT_JUSTIFY; } catch (eJ) {}
  try { doc.font = "ArialMT"; } catch (eF) {}
  try {
    prop.setValue(doc);
  } catch (eSet) {
    try { doc.font = "Arial"; prop.setValue(doc); } catch (eSet2) {}
  }
  cwiTransform(layer, "ADBE Position").setValue([x, y]);
  return layer;
}

function cwiChipRow(comp, items, x, y, cw, ch, gap) {
  var i;
  for (i = 0; i < items.length; i++) {
    var left = x + i * (cw + gap);
    var solid = comp.layers.addSolid(cwiHexToRgb(items[i][1]), items[i][0], cw, ch, 1, comp.duration);
    cwiTransform(solid, "ADBE Position").setValue([left + cw / 2, y + ch / 2]);
    cwiLabel(comp, items[i][0], 14, left, y + ch + 18, [0.9, 0.9, 0.9]);
  }
}

function cwiAddDesignBoard(folder, fps) {
  var comp = app.project.items.addComp("Intention — Design system", 1920, 1080, 1, 8, fps || 24);
  comp.parentFolder = folder;
  comp.bgColor = [0.07, 0.07, 0.07];
  comp.layers.addSolid([0.07, 0.07, 0.07], "Background", 1920, 1080, 1, 8);
  cwiLabel(comp, "Intention Captions", 48, 72, 78, [0.96, 0.91, 0.78]);
  cwiLabel(comp, "One color per speaker. White is read-ahead. Bigger is louder. Heavy and wide is a lower voice.", 22, 72, 122, [0.82, 0.82, 0.82]);

  cwiLabel(comp, "Main", 18, 72, 178, [0.7, 0.7, 0.7]);
  cwiChipRow(comp, [
    ["Yellow", "E5E517"], ["Blue", "17E5E5"], ["Red", "E51717"],
    ["Orange", "E57E17"], ["Green", "17E517"], ["Purple", "E517E5"]
  ], 72, 196, 250, 80, 20);

  cwiLabel(comp, "Supporting", 18, 72, 348, [0.7, 0.7, 0.7]);
  cwiChipRow(comp, [
    ["Amber", "D47B5E"], ["Gold", "D4B75E"], ["Lime", "ADD45E"], ["Chartreuse", "85D45E"],
    ["Spring", "5ED485"], ["Teal", "5ED4AD"], ["Azure", "5EA5D4"], ["Cerulean", "5E76D4"],
    ["Indigo", "765ED4"], ["Violet", "A55ED4"], ["Orchid", "D45EAD"], ["Rose", "D45E85"]
  ], 72, 372, 136, 58, 10);

  cwiLabel(comp, "Minor", 18, 72, 500, [0.7, 0.7, 0.7]);
  cwiChipRow(comp, [
    ["Amber", "DDC3BB"], ["Gold", "DDD5BB"], ["Lime", "D2DDBB"], ["Chartreuse", "C6DDBB"],
    ["Spring", "BBDDC6"], ["Teal", "BBDDD2"], ["Azure", "BBCFDD"], ["Cerulean", "BBC2DD"],
    ["Indigo", "C2BBDD"], ["Violet", "CFBBDD"], ["Orchid", "DDBBD2"], ["Rose", "DDBBC6"]
  ], 72, 524, 136, 58, 10);

  cwiLabel(comp, "Sound and music — not a speaker", 18, 72, 652, [0.7, 0.7, 0.7]);
  cwiChipRow(comp, [["Sound", "B7C6D4"], ["Music", "E4C98A"], ["Narrator", "F3E6C4"]], 72, 676, 220, 64, 20);

  cwiLabel(comp, "whisper", 31, 72, 860, [1, 1, 1]);
  cwiLabel(comp, "conversation", 44, 280, 872, [1, 1, 1]);
  cwiLabel(comp, "shout", 62, 680, 888, [1, 1, 1]);
  cwiLabel(comp, "Pitch: low is heavy and wide. High is light and condensed. Off-screen is italic.", 20, 72, 980, [0.75, 0.75, 0.75]);
  return comp;
}

function cwiDecodeBase64(input) {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var map = {};
  var i;
  for (i = 0; i < 64; i++) map[chars.charAt(i)] = i;
  var clean = String(input || "").replace(/\s/g, "");
  var out = "";
  for (i = 0; i < clean.length; i += 4) {
    var a = map[clean.charAt(i)];
    var b = map[clean.charAt(i + 1)];
    var cChar = clean.charAt(i + 2);
    var dChar = clean.charAt(i + 3);
    var c = (!cChar || cChar === "=") ? 0 : map[cChar];
    var d = (!dChar || dChar === "=") ? 0 : map[dChar];
    var n = (a << 18) | (b << 12) | (c << 6) | d;
    out += String.fromCharCode((n >> 16) & 255);
    if (cChar && cChar !== "=") out += String.fromCharCode((n >> 8) & 255);
    if (dChar && dChar !== "=") out += String.fromCharCode(n & 255);
  }
  return out;
}

function cwiInstallFontBytes(bytes) {
  var report = { ok: false, message: "", path: "", installed: false };
  if (!bytes || bytes.length < 1000) {
    report.message = "No font was bundled. Pitch still builds; install fonts/RobotoFlex.ttf for weight and width.";
    return report;
  }
  var folder;
  try {
    if ($.os.indexOf("Windows") !== -1) {
      folder = new Folder(Folder.userData.parent.fsName + "/Local/Microsoft/Windows/Fonts");
    } else {
      folder = new Folder("~/Library/Fonts");
    }
    if (!folder.exists) folder.create();
  } catch (eFolder) {
    report.message = "Could not open the user fonts folder. Double-click fonts/RobotoFlex.ttf to install it, then run this again.";
    return report;
  }
  var dest = new File(folder.fsName + "/RobotoFlex.ttf");
  var already = dest.exists && dest.length > 1000;
  if (!already) {
    dest.encoding = "BINARY";
    if (!dest.open("w")) {
      report.message = "Could not write " + dest.fsName + ". Double-click fonts/RobotoFlex.ttf to install it.";
      return report;
    }
    dest.write(bytes);
    dest.close();
  }
  if ($.os.indexOf("Windows") !== -1) {
    try {
      system.callSystem('cmd.exe /c reg add "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "Roboto Flex (TrueType)" /t REG_SZ /d "' + dest.fsName + '" /f');
    } catch (eReg) {}
  }
  report.ok = dest.exists && dest.length > 1000;
  report.path = dest.fsName;
  report.installed = !already;
  if (!report.ok) {
    report.message = "The font file was not written.";
  } else if (already) {
    report.message = "Roboto Flex is already installed at " + dest.fsName + ".";
  } else {
    report.message = "Installed Roboto Flex at " + dest.fsName + ". If pitch is not weight and width, quit After Effects and run this script again so the font loads.";
  }
  return report;
}

function cwiInstallBundledFont(b64) {
  if (!b64) {
    return { ok: false, message: "This script did not include the font. The comps still build.", path: "" };
  }
  return cwiInstallFontBytes(cwiDecodeBase64(b64));
}

function cwiFontAvailable(name) {
  var comp = null;
  try {
    comp = app.project.items.addComp("__cwi_probe", 64, 64, 1, 1, 24);
    var layer = comp.layers.addText("Ag");
    var prop = layer.property("ADBE Text Properties").property("ADBE Text Document");
    var doc = prop.value;
    doc.font = name;
    prop.setValue(doc);
    var got = String(prop.value.font || "");
    comp.remove();
    return got === name || got.indexOf("RobotoFlex") !== -1 || got.indexOf("Roboto Flex") !== -1;
  } catch (e) {
    try { if (comp) comp.remove(); } catch (e2) {}
    return false;
  }
}

function cwiSaveProject(name) {
  var suggested = new File(Folder.desktop.fsName + "/" + (name || "Intention-Captions.aep"));
  var picked = null;
  try {
    picked = suggested.saveDlg("Save the Intention Captions project", "After Effects Project:*.aep");
  } catch (e1) {
    picked = File.saveDialog("Save the Intention Captions project", "After Effects Project:*.aep");
  }
  if (!picked) return null;
  var path = picked.fsName;
  if (!/\.aep$/i.test(path)) path += ".aep";
  var file = new File(path);
  app.project.save(file);
  return file;
}

function cwiFinishBuild(result, fontReport, saveName) {
  var saved = null;
  var msg = result && result.message ? result.message : "Done.";
  if (fontReport && fontReport.message) msg += "\r\r" + fontReport.message;
  if (result && result.ok) {
    try {
      saved = cwiSaveProject(saveName || "Intention-Captions.aep");
    } catch (eSave) {
      msg += "\r\rCould not save: " + eSave.toString();
    }
    if (saved) msg += "\r\rSaved " + saved.fsName;
    else msg += "\r\rNot saved. If the comps are in the project, File > Save As still works.";
  }
  alert(msg);
  return saved;
}

function cwiBuild(project, options) {
  options = options || {};
  var report = { ok: false, message: "", font: "", fallback: false, wipeFallback: false, compName: "" };
  if (!project) {
    report.message = "No project data.";
    return report;
  }
  var cues = project.resolvedCues || project.cues;
  if (!cues || !cues.length || !cues[0].tokens) {
    report.message = "This file has no resolved cues. Export it again from Intention Captions — the After Effects script needs the resolvedCues block.";
    return report;
  }
  var w = Math.round(project.width || 1920);
  var h = Math.round(project.height || 1080);
  var fps = project.fps || 24;
  var dur = project.duration || 10;
  var i;
  for (i = 0; i < cues.length; i++) {
    dur = Math.max(dur, (cues[i].displayOut || 0) + 0.5);
  }
  dur = Math.max(1, dur);
  var title = project.title || "Untitled";
  var compName = "Intention — " + cwiSafe(title);

  app.beginUndoGroup("Build Intention Captions");
  var suppressed = false;
  try {
    if (app.beginSuppressDialogs) {
      app.beginSuppressDialogs();
      suppressed = true;
    }
    var folder = app.project.items.addFolder("Intention — " + cwiSafe(title));
    var comp = app.project.items.addComp(compName, w, h, 1, dur, fps);
    comp.parentFolder = folder;
    comp.bgColor = [0, 0, 0];
    report.compName = compName;

    for (i = 0; i < cues.length; i++) {
      cwiBuildCue(comp, cues[i], i, project, options.fontName || project.fontPostScript || "", options.useAxes !== false, report);
    }
    try { cwiAddLegend(comp, project.legend); } catch (legendErr) {}
    try { cwiAddSafe(comp); } catch (safeErr) {}

    var preview = app.project.items.addComp(compName + " PREVIEW", w, h, 1, dur, fps);
    preview.parentFolder = folder;
    var solid = preview.layers.addSolid([0, 0, 0], "Black", w, h, 1, dur);
    solid.name = "Preview black";
    var nested = preview.layers.add(comp);
    nested.name = "Captions";

    if (options.designBoard) {
      try { cwiAddDesignBoard(folder, fps); } catch (boardErr) {}
    }

    if (options.placeOnActive && app.project.activeItem && app.project.activeItem instanceof CompItem) {
      var active = app.project.activeItem;
      if (active !== comp && active !== preview) {
        var overlay = active.layers.add(comp);
        overlay.name = "Intention Captions";
        if (active.width !== w || active.height !== h) {
          var sx = (active.width / w) * 100;
          var sy = (active.height / h) * 100;
          var fit = Math.min(sx, sy);
          cwiTransform(overlay, "ADBE Scale").setValue([fit, fit]);
        }
        cwiTransform(overlay, "ADBE Position").setValue([active.width / 2, active.height / 2]);
        report.placed = active.name;
      }
    }

    preview.openInViewer();
    comp.openInViewer();
    report.ok = true;
    var msg = "Built \"" + compName + "\" — a transparent caption comp. \"" + compName + " PREVIEW\" has a black solid so you can RAM-preview immediately. Drop the caption comp above picture and render RGB + Alpha.";
    msg += " Font used: " + (report.font || "default") + ".";
    if (report.fallback) {
      msg += " Pitch weight/width used a fallback (scale and faux styles). Install Roboto Flex and use After Effects 26+ for real variable-font axes, then rebuild.";
    }
    if (report.wipeFallback) {
      msg += " Word color is a hard switch (text-animator wipe was unavailable).";
    }
    if (report.placed) msg += " Placed on \"" + report.placed + "\".";
    report.message = msg;
  } catch (err) {
    report.ok = false;
    report.message = "Build failed: " + err.toString();
  } finally {
    if (suppressed && app.endSuppressDialogs) app.endSuppressDialogs(false);
    app.endUndoGroup();
  }
  return report;
}

function cwiBuildFromJSON(text, options) {
  var project;
  try {
    project = cwiParse(text);
  } catch (e) {
    return { ok: false, message: "Could not read the project JSON. " + e.toString() };
  }
  return cwiBuild(project, options);
}
