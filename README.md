# Intention Captions

An independent caption studio and After Effects builder for the design rules published as [Caption with Intention](https://www.captionwithintention.org/): speaker color, word-level sync, and variable type for volume and pitch.

It is not the official Academy / FCB / Rakish template, and it does not use their logo. You do not need to request their After Effects project. The project is created here.

Roboto Flex is included at `fonts/RobotoFlex.ttf` under the SIL Open Font License (`fonts/OFL.txt`). The After Effects script installs that file for your user account. You do not download it from them.

## What it covers

**Attribution.** Six published main colors (Yellow `#E5E517`, Blue `#17E5E5`, Red `#E51717`, Orange `#E57E17`, Green `#17E517`, Purple `#E517E5`). Supporting speakers use the twelve hues that sit between those mains. Minor and background voices use pastels closer to white. A hero and a villain can be placed opposite each other. Off-screen speech stays in the speaker’s color and turns italic.

**Synchronization.** The full line appears first in white at 90% opacity, so viewers can read ahead. Each word shifts to the speaker color as it is spoken, through the word rather than only at the end. The spoken word grows 15% and lifts, then returns. A word can be split into syllables (`north|bound`) when the performance breaks it that way.

**Intonation.** Volume changes size inside a fixed range: whisper 70% of the baseline, conversation 100%, shout 142%. Pitch changes weight and width: a low voice is heavier and wider, a high voice is lighter and more condensed. Sound effects are italic in brackets. Music descriptions are italic with a note mark. Sung lines keep the singer’s color.

The exact numbers and how they were taken from the published boards are in [docs/DESIGN-RULES.md](docs/DESIGN-RULES.md).

## Studio

Open `studio/index.html` through a local server (modules and the After Effects export need it):

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080/studio/`.

The Northbound sample plays on first open. It is original dialogue, not a film clip, and it walks through every rule: two leads on opposite colors, a supporting voice, an off-screen pastel announcement, a whisper that breaks into a shout, a rising line, a sound effect, a music cue, a sung line, and a fast exchange.

Drop a picture or video on the frame to preview against your own shot. The file stays in the browser. It is not uploaded.

### Authoring

- Add speakers and pick a color from the wheel. **Space** pushes main colors apart.
- **Vocal twin** copies a speaker and shifts their pitch, for the case where one actor plays two voices.
- Add a line, set the speaker, and tune each word’s volume and pitch.
- Drag a line on the timeline to move it. Arrow keys step one frame. Shift-arrows jump one second. Up/down nudge the selected word’s volume. Shift-up/down nudge pitch. `[` and `]` move between words.
- **Legacy captions** shows the same line as plain white text, so you can see what the three rules add.
- Import SRT/VTT when you already have timing, then assign speakers and intention. Import or export a word CSV if the pass happens in a spreadsheet.
- Undo is Ctrl/Cmd-Z. Save is Ctrl/Cmd-S, which downloads the project JSON.

Reading speed is checked against 17 characters per second of on-screen time, including the read-ahead lead. A warning appears when a line is too fast to read.

### Picture setup

**Picture** sets the frame (HD, UHD, scope, vertical), frame rate, baseline size as a percent of frame height, lead, hold, box opacity, and whether color tracks through the word or snaps the whole word at its onset.

## After Effects

After Effects will not open a project file that was not written by After Effects. The full project is the script in this repo. Running it installs the font, builds the comps, and saves a real `.aep` on your machine. That is the file. You do not ask anyone for it.

In **Preferences → Scripting & Expressions**, allow scripts to write files and access the network. Otherwise After Effects blocks the save and the font install.

### The included project

1. In After Effects: **File → Scripts → Run Script File**.
2. Choose `after-effects/Build-Intention-Project.jsx`.
3. Confirm. The script installs Roboto Flex, builds the Northbound captions, a black preview comp, and a design-system board, then asks where to save `Intention-Captions.aep`.
4. If it says the font is not loaded yet, quit After Effects and run the same script again. After Effects only sees a newly installed font at launch.

`Intention — Northbound` is the transparent caption comp. Drop it above picture, or render RGB + Alpha. `Intention — Northbound PREVIEW` has a black solid so you can RAM-preview immediately. Guide layers do not render.

### Your own picture

In the studio, choose **Export → After Effects project**. Run that downloaded script the same way. It builds into the project you already have open, places the captions on the active comp, and saves an `.aep`.

### Panel, for repeat imports

Copy both files into the ScriptUI Panels folder:

- macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`

Files:

- `after-effects/IntentionCaptions.jsx`
- `after-effects/cwi-engine.jsx`

Restart After Effects. Open **Window → Intention Captions**. In **Preferences → Scripting & Expressions**, allow scripts to write files and access the network, or the file dialog may be blocked.

Export **Project JSON** from the studio and import it from the panel. `examples/northbound.cwi.json` is the sample, already resolved, if you want to test the builder before authoring.

### What the comp contains

Each line is a null. Under it, one text layer per word (or per syllable) and a black plate whose size follows the words. Unpublished text stays white at 90% opacity. At the spoken moment it eases to the speaker color. Size is the volume. A 15% scale-and-lift marks the onset.

After Effects 26 can set Roboto Flex axes (`wght`, `wdth`, `slnt`, `opsz`) from the script. Older versions still build the comp: they use font size, horizontal scale for width, a static Roboto weight if one is installed, and faux italic for off-screen lines. The script says which path it took.

The font field in the panel is the PostScript name After Effects sees. If `RobotoFlex-Regular` does not stick, set the name shown in the Character panel and rebuild.

## Project file

`.cwi.json` is the editorial project plus a `resolvedCues` block. The studio recomputes that block on every export, so the After Effects comp matches the preview. SRT export is a plain-text reference only. It cannot carry color, size, or pitch.

## Rights

Use this on pictures you have the right to caption. The design rules summarized here are a description of a published accessibility system, not a copy of its PDF or project file.
