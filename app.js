
/**
 * TipSplit — app.js
 *
 * Rounding Policy:
 *   Per-person amounts are rounded UP to the nearest paisa (0.01)
 *   using Math.ceil(x * 100) / 100.
 *   This ensures the group never collectively underpays.
 *   The rounding note in the output panel shows when rounding
 *   has been applied and how much extra is collected.
 */

(function () {
  "use strict";

  /* ── DOM References ── */
  const billInput      = document.getElementById("bill");
  const tipCustomInput = document.getElementById("tip-custom");
  const peopleInput    = document.getElementById("people");
  const presetBtns     = document.querySelectorAll(".preset-btn");
  const peopleDecBtn   = document.getElementById("people-dec");
  const peopleIncBtn   = document.getElementById("people-inc");
  const resetBtn       = document.getElementById("reset");

  const valTipPer      = document.getElementById("val-tip-per");
  const valTipTotal    = document.getElementById("val-tip-total");
  const valGrandTotal  = document.getElementById("val-grand-total");
  const valPerPerson   = document.getElementById("val-per-person");
  const roundingNote   = document.getElementById("rounding-note");

  const billError      = document.getElementById("bill-error");
  const tipError       = document.getElementById("tip-error");
  const peopleError    = document.getElementById("people-error");

  /* ── State ── */
  let activePreset = null; // percentage value (number) or null

  /* ── Constants ── */
  const MAX_TIP    = 100;   // upper bound for tip %
  const MAX_BILL   = 1_000_000; // upper bound for bill
  const MAX_PEOPLE = 999;

  /* ─────────────────────────────────────────
     VALIDATION
  ───────────────────────────────────────── */

  function validateBill(raw) {
    if (raw === "" || raw === null) return { ok: false, msg: "Enter a bill amount." };
    const n = parseFloat(raw);
    if (isNaN(n))           return { ok: false, msg: "Must be a valid number." };
    if (n <= 0)             return { ok: false, msg: "Bill must be greater than 0." };
    if (n > MAX_BILL)       return { ok: false, msg: `Bill seems too large (max Rs ${MAX_BILL.toLocaleString()}).` };
    return { ok: true, value: n };
  }

  function validateTip(raw) {
    if (raw === "" || raw === null) return { ok: false, msg: "Enter a tip % or choose a preset." };
    const n = parseFloat(raw);
    if (isNaN(n))      return { ok: false, msg: "Must be a valid number." };
    if (n < 0)         return { ok: false, msg: "Tip % can't be negative." };
    if (n > MAX_TIP)   return { ok: false, msg: `Tip % can't exceed ${MAX_TIP}%.` };
    return { ok: true, value: n };
  }

  function validatePeople(raw) {
    if (raw === "" || raw === null) return { ok: false, msg: "Enter number of people." };
    const n = parseInt(raw, 10);
    if (isNaN(n) || !Number.isInteger(n)) return { ok: false, msg: "Must be a whole number." };
    if (n < 1)           return { ok: false, msg: "At least 1 person required." };
    if (n > MAX_PEOPLE)  return { ok: false, msg: `Max ${MAX_PEOPLE} people supported.` };
    return { ok: true, value: n };
  }

  /* ─────────────────────────────────────────
     ERROR DISPLAY
  ───────────────────────────────────────── */

  function setError(inputEl, errorEl, msg) {
    if (msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      inputEl.classList.add("is-error");
      inputEl.setAttribute("aria-invalid", "true");
    } else {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
      inputEl.classList.remove("is-error");
      inputEl.setAttribute("aria-invalid", "false");
    }
  }

  /* ─────────────────────────────────────────
     ROUNDING POLICY
     Round UP per-person to nearest paisa (0.01)
  ───────────────────────────────────────── */

  function ceilToPaisa(amount) {
    return Math.ceil(amount * 100) / 100;
  }

  function fmt(amount) {
    return amount.toFixed(2);
  }

  /* ─────────────────────────────────────────
     FLASH ANIMATION ON VALUE CHANGE
  ───────────────────────────────────────── */

  function flashValue(el, newVal) {
    const formatted = fmt(newVal);
    if (el.textContent === formatted) return;
    el.textContent = formatted;
    el.classList.remove("updated");
    // Force reflow
    void el.offsetWidth;
    el.classList.add("updated");
  }

  /* ─────────────────────────────────────────
     CORE CALCULATION
  ───────────────────────────────────────── */

  function calculate() {
    const billRaw   = billInput.value.trim();
    const tipRaw    = tipCustomInput.value.trim();
    const peopleRaw = peopleInput.value.trim();

    const billResult   = validateBill(billRaw);
    const tipResult    = validateTip(tipRaw);
    const peopleResult = validatePeople(peopleRaw);

    setError(billInput,      billError,   billResult.ok   ? "" : billResult.msg);
    setError(tipCustomInput, tipError,    tipResult.ok    ? "" : tipResult.msg);
    setError(peopleInput,    peopleError, peopleResult.ok ? "" : peopleResult.msg);

    if (!billResult.ok || !tipResult.ok || !peopleResult.ok) {
      // Still show zeros in outputs rather than stale values
      flashValue(valTipPer,     0);
      flashValue(valTipTotal,   0);
      flashValue(valGrandTotal, 0);
      flashValue(valPerPerson,  0);
      roundingNote.textContent = "";
      return;
    }

    const bill   = billResult.value;
    const tipPct = tipResult.value;
    const people = peopleResult.value;

    const tipTotal   = bill * (tipPct / 100);
    const grandTotal = bill + tipTotal;

    // Exact per-person (may have many decimal places)
    const exactPerPerson = grandTotal / people;
    // Rounded UP to nearest paisa
    const roundedPerPerson = ceilToPaisa(exactPerPerson);

    // Tip per person (rounded up too)
    const exactTipPerPerson    = tipTotal / people;
    const roundedTipPerPerson  = ceilToPaisa(exactTipPerPerson);

    flashValue(valTipPer,     roundedTipPerPerson);
    flashValue(valTipTotal,   tipTotal);
    flashValue(valGrandTotal, grandTotal);
    flashValue(valPerPerson,  roundedPerPerson);

    // Show rounding note if rounding made a difference
    const diff = (roundedPerPerson * people) - grandTotal;
    if (diff > 0.001) {
      roundingNote.textContent =
        `↑ Rounded up by Rs ${fmt(diff)} total across ${people} ${people === 1 ? "person" : "people"} to avoid underpaying.`;
    } else {
      roundingNote.textContent = "";
    }
  }

  /* ─────────────────────────────────────────
     PRESET BUTTONS
  ───────────────────────────────────────── */

  function setActivePreset(btn) {
    presetBtns.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    if (btn) {
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      activePreset = parseFloat(btn.dataset.tip);
      tipCustomInput.value = activePreset;
      // Clear tip error when a preset is chosen
      setError(tipCustomInput, tipError, "");
    } else {
      activePreset = null;
    }
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActivePreset(btn);
      calculate();
    });
  });

  /* ─────────────────────────────────────────
     CUSTOM TIP INPUT — deactivates preset
  ───────────────────────────────────────── */

  tipCustomInput.addEventListener("input", () => {
    // Deselect all presets when user types a custom value
    presetBtns.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    activePreset = null;
    calculate();
  });

  /* ─────────────────────────────────────────
     BILL & PEOPLE INPUTS
  ───────────────────────────────────────── */

  billInput.addEventListener("input", calculate);
  peopleInput.addEventListener("input", calculate);

  /* ─────────────────────────────────────────
     STEPPER BUTTONS
  ───────────────────────────────────────── */

  peopleDecBtn.addEventListener("click", () => {
    const cur = parseInt(peopleInput.value, 10) || 1;
    if (cur > 1) {
      peopleInput.value = cur - 1;
      calculate();
    }
  });

  peopleIncBtn.addEventListener("click", () => {
    const cur = parseInt(peopleInput.value, 10) || 1;
    if (cur < MAX_PEOPLE) {
      peopleInput.value = cur + 1;
      calculate();
    }
  });

  /* Keyboard: allow arrow keys to increment/decrement */
  peopleInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const cur = parseInt(peopleInput.value, 10) || 1;
      if (cur < MAX_PEOPLE) { peopleInput.value = cur + 1; calculate(); }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const cur = parseInt(peopleInput.value, 10) || 1;
      if (cur > 1) { peopleInput.value = cur - 1; calculate(); }
    }
  });

  /* ─────────────────────────────────────────
     RESET
  ───────────────────────────────────────── */

  function reset() {
    billInput.value      = "";
    tipCustomInput.value = "";
    peopleInput.value    = "1";

    setActivePreset(null);

    setError(billInput,      billError,   "");
    setError(tipCustomInput, tipError,    "");
    setError(peopleInput,    peopleError, "");

    flashValue(valTipPer,     0);
    flashValue(valTipTotal,   0);
    flashValue(valGrandTotal, 0);
    flashValue(valPerPerson,  0);
    roundingNote.textContent = "";

    billInput.focus();
  }

  resetBtn.addEventListener("click", reset);

  /* ─────────────────────────────────────────
     KEYBOARD: Enter moves focus forward
  ───────────────────────────────────────── */

  [billInput, tipCustomInput, peopleInput].forEach((el, i, arr) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const next = arr[i + 1];
        if (next) next.focus();
        else resetBtn.focus();
      }
    });
  });

  /* ─────────────────────────────────────────
     PASTE SANITIZATION
     Strip any non-numeric garbage pasted in
  ───────────────────────────────────────── */

  [billInput, tipCustomInput].forEach((el) => {
    el.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData("text");
      // Keep only digits and a single decimal point
      const sanitized = pasted.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
      el.value = sanitized;
      calculate();
    });
  });

  peopleInput.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const sanitized = pasted.replace(/[^0-9]/g, "");
    peopleInput.value = sanitized;
    calculate();
  });

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */

  calculate();
  billInput.focus();

})();