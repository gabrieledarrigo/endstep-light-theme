# Board walkthrough, 6 November 2026

Two guest games against the bot, played by `docs/research/tools/board-walkthrough.mjs` with the extension loaded.
The theme had the revised tokens and the board rules from `docs/research/drafts/` applied to `src/theme/light.css`.

- Game 1: on the play. Victory on turn 9. 78 frames.
- Game 2: on the draw. Defeat on turn 13. 87 frames.

Open `index.html` in this folder to see the frames. The full-size frames are on the design page.

## What works

- The phase tracker reads as a column of tiles in every state: past, current, future, with stops set, on both turns.
- The auto-pass buttons and the "skip ahead" label are readable.
- Combat is clear: the attack arrows, the attacking and blocking frames, the damage.
- The stack panel, the target prompt, the mana payment prompt, and the reveals panel keep their structure.
- The victory and defeat screens look designed for the light theme.
- axe found no contrast failure in the opening hand, the payment prompts, the attack prompt, the game log, and the end screens.

## What to fix

1. Accent used as text. The chips "PRIORITY" and "REVEALS", and the labels "CLICK TO SELECT" and "ALPHA STRIKE", use the pale amber as text: 1.4:1 to 1.8:1. Rule: `.text-accent` gets the deeper amber in the light theme.
2. The active-turn wash on your half of the battlefield. The gold glow of the dark theme becomes a heavy tan fade. Rule: lighter alphas for `[data-turn="mine"][data-half="self"]`.
3. The "1st" phase label on a blue stop blade: 4.03:1. The label sits on the unset opponent blade, so past-phase labels use `--color-text-secondary` (5.66:1 on the blade). Past and future labels share a colour; the flat tile marks "done".
4. The blue "Confirm" button and the blue info chips keep dark ink: 3.3:1 to 4.2:1. Rule: white ink on `.bg-info`.
5. The owner tag under a stack item. The site paints it with inline colours from its stack palette: text `#e8d9ac`, backing `#0e0c07`, border `#c9973a`. Decision: the tag sits on the black card frame, so it stays a dark pill with cream text. The fixer leaves the whole stack item alone: `[data-stack-item-kind]` goes into `CARD_ART_SELECTORS` in `src/theme/theme.ts`. The target strip, the X chip and the cast marker sit on the card frame too.
6. The "TRIGGERED ABILITY" band on stack items, 9 px in `--color-info`: 4.21:1. The token moves from `#1a73d5` to `#1362b7` (5.43:1).

Rules 1 to 4 are written in `docs/research/drafts/light-board.css`, the token of item 6 in `docs/research/drafts/light.css`. Item 5 is one selector added to `CARD_ART_SELECTORS`.

Verified on 6 November by the implementation session: a third game showed items 1, 2 and 4 passing; after items 3, 5 and 6 were applied, a fourth game had 0 axe contrast violations in 43 states. All six are in `src/theme/`.

## How to repeat

```
npm run build
node docs/research/tools/board-walkthrough.mjs <path to chrome-mv3> <output folder> play 160
node docs/research/tools/board-walkthrough.mjs <path to chrome-mv3> <output folder 2> draw 160
node docs/research/tools/board-contact-sheet.mjs <sheet folder> <output folder> <output folder 2>
```

The first argument of the walkthrough is the built extension. "play" asks to play first, "draw" to draw first; the bot can win the toss.
The last argument is the maximum number of steps. A game takes 5 to 9 minutes.
Set `KEEP_FULL=0` on the contact sheet to store thumbnails only.
