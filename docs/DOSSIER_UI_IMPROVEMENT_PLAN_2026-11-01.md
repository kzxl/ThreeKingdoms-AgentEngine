# NPC Dossier UI Improvement Plan

Date: 2026-11-01
Scope: `public/js/npc-dossier-modal.js`, `public/styles.css` (`.dossier-*`),
`src/modules/social-kizuna/daily-interaction.engine.ts` (dossier DTO).
Status: proposal only; no code changed yet.

## 1. What the current screen gets wrong

Measured from the live dossier and the 860px screenshot:

1. **The same rank is printed twice per stat.** `dossier-stat-val` renders
   `displayVi`, and `dossier-stat-rank` renders `rankVi`. When fog hides the
   number, `displayVi` is itself the rank label, so a row reads
   “Khá Tốt (60-74)” twice and the numeric value disappears.
2. **The radar labels are clipped.** The SVG is 270×210 with long labels such as
   “Thống Soái Khá Tốt (60-74)” placed outside the plot. The left and bottom
   labels are cut by the container.
3. **The left column is half empty.** The radar card is 275px wide while the
   right column holds eight stat rows; the left column ends far above the tab
   content, leaving a large dead area.
4. **The right column is too tall.** Eight rows plus two group cards push the
   action deck below the fold. The player has to scroll to find the only actions
   in the dialog.
5. **The header is cramped.** Affinity and respect are five-pixel bars with
   labels squeezed above them; the relationship and mood chips compete for the
   same line.
6. **Too many accent colours.** Every stat has its own colour, the bars, rank
   text and radar labels all use different hues, so nothing reads as primary.
7. **Inline styles set the layout.** The file uses inline style objects for
   almost every block, making responsive rules and future theming difficult.
8. **The illustration slot reserves space even when empty.** The 16:6 frame
   creates an empty band instead of disappearing or becoming a useful portrait.
9. **No sticky context.** The tab bar scrolls with the content; the player loses
   which tab is active when reading the lower stats.

## 2. Target layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [seal/portrait]  Trương Phi • Tự: Dực Đức • 30 tuổi      [× close] │
│                  Vũ Nông • Lâm Công Điền Trang                       │
│                  [Trác Huyện] [Đồng hiện] [Khí sắc: Bình Thản]       │
│  Thiện cảm 25/100 ▓▓░░░░░░   Kính trọng 31/100 ▓▓▓░░░░░             │
├──────────────────────────────────────────────────────────────────────┤
│ [Bát Vị Quân Lược] [Tâm Tính & Hảo Cảm] [Liệt Truyện]  ← sticky     │
├──────────────────────────────────────────────────────────────────────┤
│  ┌ Radar 320×260 (short axes) ┐   ┌ 2×4 stat grid ──────────────┐  │
│  │ LDR 62  WAR 47  CRA 68     │   │ LDR 62 ▓▓▓▓░ Khá Tốt       │  │
│  │ INT 66  POL 65  DIP 47     │   │ WAR 47 ▓▓▓░░ Bình Thường   │  │
│  │ COM 59  LOG 58             │   │ ...                         │  │
│  └────────────────────────────┘   └─────────────────────────────┘  │
│  ┌ Điểm mạnh / Điểm yếu / Nhiệm vụ hiện tại ┐                       │
├──────────────────────────────────────────────────────────────────────┤
│ [Phi Thư] [Quà Biếu] [Luận Võ]                         [Đóng] ← sticky│
└──────────────────────────────────────────────────────────────────────┘
```

The radar answers “shape”, the 2×4 grid answers “exact value and rank”, and the
footer answers “what can I do now”. None of them repeats the same information.

## 3. Component rules

### 3.1 Header

- Three zones: portrait/identity, relationship meters, disposition chips.
- Portrait: use `portrait_url`; fall back to the Han seal. Do not render the
  16:6 illustration frame when `illustration_url` is empty.
- Identity: name (17px/700), style and age (12px), position (12px muted),
  location + proximity + mood as chips.
- Affinity/respect: two compact rows with `label | value | 4px bar`; no separate
  label line above each bar.
- Move “Quan hệ” and “Khí sắc” into the chip row, not a second line.

### 3.2 Tabs

- Sticky under the header (`position: sticky; top: 0` inside the body scroll).
- 12px labels, 36px height, amber underline for the active tab.
- Keep the three existing tabs; do not add more.

### 3.3 Radar

- Size 320×260, eight short labels: `LDR`, `WAR`, `CRA`, `INT`, `POL`, `DIP`,
  `COM`, `LOG`; full names live in the stat grid.
- Values as small numbers next to the dots, or only in the grid. No long
  “Khá Tốt (60-74)” strings on the axes.
- One neutral grid, one amber polygon, one accent dot per axis; no per-axis
  rainbow colours.
- Add 25/50/75/100 ring labels on the vertical axis only.
- On fog: hide the polygon for undiscovered values and show a dashed outer ring.

### 3.4 Stat grid

- Two columns × four rows; each row is 28px high:
  `Tên (72px) | số (28px, mono) | track (flex) | rank (72px, 11px)`.
- Show the numeric `s.value`; show the rank **once** on the right. When the
  value is fogged, render `???` in the value slot and “Sương mù” in the rank
  slot — never the same rank twice.
- Bar: 4px track, amber fill; red only for `<45`, gold only for `>=75`.
- Group labels (“Quân Lược & Võ Nghệ”, “Trí Mưu & Văn Trị”) become one-line
  section headers above each row pair, not separate cards.

### 3.5 Footer

- Sticky footer with the two or three context actions and a ghost Close button.
- Actions depend on proximity: face-to-face (Luận Võ, Yến Tiệc, Trò Chuyện) vs
  remote (Phi Thư, Quà Biếu, Đi tới).
- The feedback box opens above the footer, not at the bottom of a long scroll.

### 3.6 Typography and colour

- Body 12px, labels 11px, headings 12–13px, name 17px; nothing below 11px.
- One primary accent (amber); neutral slate for tracks and ranks; semantic
  red/green only for danger/success.
- Remove per-stat rainbow colours. Rank text is muted; the bar carries the
  colour.

### 3.7 Responsive

- `>= 900px`: radar left, stat grid right.
- `< 900px`: single column, radar first, stat grid second, sticky footer.
- Modal width `min(960px, 96vw)`; height `min(86vh, 900px)`.

### 3.8 Accessibility

- Each bar is `role="progressbar"` with `aria-valuenow/min/max` and a label.
- Tabs use `role="tablist"` / `role="tab"` / `aria-selected`.
- Focus ring is visible on tabs, stats and footer actions.
- Do not rely on colour alone for rank; the rank text is always present.

## 4. Data fix

`daily-interaction.engine.ts` already returns `value` and `rankVi/rankEn`.
The UI should:

```text
value = s.value (number) or null when fogged
rank  = s.rankVi/rankEn
display = value ?? '???'
```

Do not use `displayVi` as the numeric slot. The current duplicate comes from
`displayVi === rankVi` when the value is hidden.

## 5. Implementation order

| Phase | Work | Risk | Value |
| :--- | :--- | :--- | :--- |
| 1 | Fix duplicate rank + radar labels + numeric value (`displayVi` bug) | Low | Removes the most visible defects |
| 2 | Move layout to CSS classes; 2×4 stat grid; 320×260 radar; remove empty illustration band | Medium | Fixes dead space and scroll |
| 3 | Sticky tabs + sticky action footer; proximity action set | Medium | Actions always reachable |
| 4 | Header chips, typography floor, neutral colour system | Low | Consistent with the rest of the UI |
| 5 | ARIA roles and keyboard tab navigation | Low | Accessibility |

## 6. Acceptance criteria

- No stat row shows the same rank twice; a fogged value shows `???` and
  “Sương mù”.
- Radar labels are fully visible at 320×260 and do not overlap.
- The action deck is visible without scrolling at 1440×900 and 1366×768.
- A missing portrait/illustration never leaves an empty 16:6 band.
- Body text is at least 11px; no inline layout styles remain in the dossier
  block.
- `npm run lint:client`, `npm run lint:ui` and `npm run lint:slop` stay green.
