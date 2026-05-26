# ANSWERS.md

## 1. How to Run

No dependencies or build tools required.

```bash
# Simplest — just open the file:
open index.html

# Or with a tiny local server:
npx serve .
# Visit http://localhost:3000
```

No Node, no npm install, no framework compile step. Works on any modern browser (Chrome, Firefox, Safari, Edge).

---

## 2. Stack & Design Choices

**Stack:** Vanilla HTML + CSS + JavaScript (no framework).

Chosen because the task is inherently a single-screen calculation widget with no routing, no server, no persistence. A framework would add build complexity for zero functional gain. Vanilla JS keeps the codebase auditable in one read — every event listener, validator, and DOM mutation is visible without abstraction.

**Visual/Interaction Decision 1 — Output panel is sticky (desktop) and reordered to top (mobile)**

On wide screens the result panel uses `position: sticky; top: 1.5rem` so it stays visible while the user scrolls or adjusts inputs. On mobile (`≤680px`) the output panel is reordered to the top of the stack via `order: -1`. This means the answer the user cares about is always in view without scrolling down, which mirrors how a physical receipt works — total at the top, breakdown below.

**Visual/Interaction Decision 2 — Preset tip buttons use a 5-column grid instead of a button group**

A conventional radio-button group or segmented control would overflow on narrow screens. A 5-column CSS grid (`grid-template-columns: repeat(5, 1fr)`) scales naturally: on phones below 400px it drops to 3 columns. Each button displays its pressed state with a full background fill (not just a border change) to make the active selection unambiguous at a glance — particularly helpful when the custom input is also in use.

---

## 3. Responsive & Accessibility

**Responsive behaviour:**

- **360px phone:** Single-column layout; output panel appears above inputs; preset buttons wrap to 3 columns; font sizes step down; panels use tighter padding. The viewport meta tag ensures no horizontal scroll.
- **1440px laptop:** Two-column grid (inputs left, results right); output panel sticky so it tracks while the user edits; generous padding; large hero number clearly legible.

**Accessibility — handled:**

Tab order follows the natural DOM order: Bill → Tip presets → Custom tip % → People stepper buttons → People input → Reset. Every interactive element has a `:focus-visible` ring using the accent colour. Preset buttons use `aria-pressed` (true/false) so screen readers announce their state. Error messages use `role="alert"` and `aria-live="polite"` so they're announced without interrupting the user. Input fields set `aria-invalid="true"` when in error state and `aria-describedby` pointing to their error paragraph. The output section has `aria-live="polite"` so screen reader users hear updated totals.

**Accessibility — knowingly skipped:**

A fully accessible custom number-stepper (the ±  buttons) would ideally also implement `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` on a single element, replacing the separate native input + two buttons. I skipped this because the native `<input type="number">` already provides spinbutton semantics to screen readers, and duplicating that with a custom ARIA pattern without thorough AT testing risks introducing bugs worse than the omission. The stepper buttons are supplementary; keyboard users can type directly into the input.

---

## 4. AI Usage

**Tool used:** Claude (this session)

| Where | What I asked | What it gave |
|---|---|---|
| Initial scaffold | Described the full spec | Full HTML/CSS/JS structure |
| Rounding logic | Asked to implement ceil-to-paisa | Used `Math.ceil(x * 100) / 100` — correct |
| Responsive CSS | Asked for mobile breakpoints | Gave 3 breakpoints at 680, 400, 370px |

**One specific change I made:**

The AI initially generated the preset tip buttons as `<input type="radio">` elements styled as buttons — a pattern that requires CSS `appearance: none` hacks and `label` coupling that breaks in some screen readers unless done very carefully. I changed them to plain `<button>` elements with `aria-pressed` toggled in JavaScript instead. This is both simpler to style (no hidden radio + label dance) and more robust accessibility-wise: `aria-pressed` on a `<button>` is a well-supported pattern, whereas custom-styled radio groups require more nuance to get right cross-browser. The visual result is identical; the underlying semantics are cleaner.

---

## 5. Honest Gap

**What isn't polished enough:** The mobile keyboard experience when the result panel is visible.

On a 360px phone, when the user taps the bill input and the soft keyboard opens, it pushes the viewport up. Depending on the browser, the sticky output panel may be partially obscured by the keyboard. I handled this by reordering the output to the top on mobile (so it's visible before scrolling), but I didn't implement `visualViewport` resize listeners that would scroll the results back into view dynamically as the keyboard opens/closes.

**What I'd do with another day:** Listen to `window.visualViewport.addEventListener('resize', ...)` and smoothly scroll the result panel into view whenever the viewport shrinks (keyboard opens). I'd also test on real Android Chrome and iOS Safari with physical devices, not just DevTools emulation, because keyboard-occlusion behaviour is notoriously inconsistent between them.