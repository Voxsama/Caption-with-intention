# Design rules encoded in this studio

These are the Caption with Intention rules as published on the project site and its design boards, written here as the numbers this tool actually uses. They are a working spec for our pipeline, not a reproduction of the official PDF.

The official system is a design system, applied by a person. It is not an automatic captioner. This studio keeps that: speech-to-text can arrive as an SRT, and every color, size, and pitch decision stays editable.

## Attribution — who is speaking

Current captions make it easy to mis-hear a line as the wrong person. The published fix is color.

Six main colors, taken from the published swatches (high channel 229, low channel 23):

| Name | Hex | Use |
| --- | --- | --- |
| Main Yellow | `#E5E517` | Lead |
| Main Orange | `#E57E17` | Lead |
| Main Red | `#E51717` | Lead |
| Main Purple | `#E517E5` | Lead |
| Main Blue | `#17E5E5` | Lead |
| Main Green | `#17E517` | Lead |

Rules from the boards:

- The only hard requirement is that each speaker is distinct.
- If a film has only a few leads, put their colors as far apart on the wheel as you can.
- If the story has a hero and a villain, put those two opposite each other. Red sits opposite blue. Green sits opposite purple.
- Supporting roles take hues that fall *between* the leads, not the same saturated swatches. This tool uses twelve: amber, gold, lime, chartreuse, spring, teal, azure, cerulean, indigo, violet, orchid, rose. They are the same family, at lower chroma, so a lead still reads louder than a supporting voice.
- Minor characters take colors from the center of the wheel: the same hues, pushed toward white. That keeps the attribution rule and adds a hierarchy.
- Off-screen voices follow the same colors. They are set in italic (Roboto Flex slant −8), which is the published treatment for a speaker who is not on camera.

Main Red on a black box is about 4.5:1. The published palette includes it. The studio warns, and does not silently replace it.

Name labels are off by default. Color is the attribution. A speaker key exists as an After Effects guide layer for the editor, and it does not render.

## Synchronization — when the word is spoken

The boards are specific.

- The whole line appears first, in white, at **90% opacity**, as a complete sentence. That is the read-ahead. Viewers are not waiting on the spoken word to know what the line says.
- Color then tracks speech. A word changes as it is spoken, from the start of the word, not from its last syllable. The close-up on the sync board shows the playhead cutting through a word: the spoken part is the speaker color, the rest is still white. That is the default here (`within-word`). `word-snap` colors the whole word at its onset, which is the coarser reading of the same rule.
- Each word **grows 15%** as it changes color, then returns to its size. The board calls this a pop, and labels it a 15% elevation. This tool scales to 115% and lifts the word by 12% of its size, then settles. The pop is short (at most 0.26s) so it marks the moment without covering the next word.
- Most words animate whole. When a performance breaks a word into syllables, the line can too: type `north|bound` on that word. Each piece gets its own color and pop, with almost no gap, so it still reads as one word.

Lead-in defaults to 0.55–0.70s and is editable per picture and per line. Hold after the last word defaults to about 0.3–0.4s. The line’s display window is what the read-ahead lives in. The speech window is what the color follows.

A line faster than 17 characters per second of display time is flagged. The read-ahead is there so people can finish the line. It does not help if the line is gone before they can.

## Intonation — how it is said

One variable face, Roboto Flex, carries volume and pitch. The boards are explicit about which axis does which job.

**Volume is size.** Louder is larger and taller. Quieter is smaller and shorter. Both are relative to a baseline size, inside a prescribed range, so a shout cannot become a title card and a whisper cannot disappear.

| Volume | Size |
| --- | --- |
| 0 whisper | 70% of baseline |
| 50 conversation | 100% |
| 100 shout | 142% |

The mapping is linear on each side of conversation, so the middle of the slider is a normal voice. The 15% pop is applied on top of that size, then removed. It is a timing mark, not a volume mark.

**Pitch is weight and width.**

- A lower voice, with stronger low harmonics, is heavier and wider.
- A higher voice is lighter and more condensed.
- Published wording: the higher the pitch, the lighter the face. The fewer the low harmonics, the tighter the face.

| Pitch | Weight | Width |
| --- | --- | --- |
| 0 low | 780 | 132 |
| 50 mid | 520 | 105 |
| 100 high | 260 | 78 |

Extremes of the Roboto Flex axes (weight 100, width 25) are avoided. The community testing described in the project’s own interviews found that over-expressive captions become a distraction. These ranges are meant to be readable at a glance and still obvious if you look.

Optical size follows the rendered size, clamped to Roboto Flex’s 8–144 axis, so a whisper does not use a display cut.

Baseline size is a percentage of frame height, because the boards size type per aspect ratio:

| Frame | Baseline |
| --- | --- |
| Scope, 2.2:1 and wider | 5.1% of height |
| 16:9 | 4.05% |
| 4:3 class | 4.3% |
| Square | 4.5% |
| Vertical | 3.15% |

At 1920×1080 that is about 44px. A shout is about 62px. A whisper is about 30px. Change it in Picture setup if a delivery spec asks for a different base. The volume range stays proportional.

## Sound and music

The published system calls for different display options for non-speech and music, and for pitch and volume to apply to those sounds too. The boards show music with a note mark and brackets. This tool uses:

| Kind | Look | Color |
| --- | --- | --- |
| Dialogue | Roman, speaker color when spoken | Speaker |
| Off-screen | Italic, speaker color | Speaker |
| Sound | Italic, `[brackets]` | Cool gray `#B7C6D4`, editable |
| Music description | Italic, `♪ [description]` | Warm `#E4C98A`, editable |
| Sung lyric | Italic, `♪` plus the line | Singer’s color |

Sound and music still take volume as size and pitch as weight and width. A brake hiss can be large and low. A high whistle can be light and condensed. Their colors are deliberately not one of the six speaker colors, so a sound is not mistaken for a person. Both colors are project settings.

## The caption box

Spoken color sits on a solid black plate, the way the published examples do. That is the contrast device. Opacity defaults to 100% and can be lowered. Padding is about 0.42em horizontal and 0.16em vertical, from the baseline size. Plates are per visual line. If a line exceeds 80% of the frame width it wraps, and each wrapped line gets its own plate.

Position is bottom, lower third, top, or upper. Overlapping lines on the same anchor stack instead of drawing on top of each other.

Safe margins (10% horizontal, 8% vertical) are a preview guide and an After Effects guide layer. They do not render.

## What is intentionally not automatic

The published project says the system should be applied by hand, and that automation can come later. This tool automates the tedious part — building the layers, the plates, the keyframes — and leaves the judgments (who, how loud, how low, where the laugh lands) with the editor.

Punctuation can seed a first pass: `!` raises volume, `?` lifts pitch slightly, an ellipsis drops volume. It is a start, not a performance.
