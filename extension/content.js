// Formwise content script: a small panel that fills the current page's form
// from a client profile. It reads the form's structure, asks the Formwise
// server what to put where, sets the values the way React expects, and
// highlights what the agent should check. It never submits anything.
(() => {
  if (window.__formwiseLoaded) return;
  window.__formwiseLoaded = true;

  const MIN_FIELDS = 3;
  const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file", "password"]);

  const state = {
    clients: [],
    clientId: null,
    busy: false,
    message: "",
    error: "",
    result: null, // last fill response
    labels: {}, // field key -> label, for the "to check" list
    autoFill: false, // after the first fill, new fields (wizard steps, claim rows) fill themselves
    filledKeys: new Set(),
    collapsed: false,
  };

  // ---------- Talking to the server (via the background worker) ----------

  function api(path, method = "GET", body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "api", path, method, body }, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve({ ok: false, data: { error: "Formwise extension was reloaded. Refresh this page." } });
        } else resolve(res);
      });
    });
  }

  // ---------- Reading the form ----------

  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  function isVisible(el) {
    return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  }

  function controls() {
    if (document.querySelector("[data-formwise-app]")) return [];
    return [...document.querySelectorAll("input, select, textarea")].filter((el) => {
      const type = (el.type || "").toLowerCase();
      return !SKIP_TYPES.has(type) && !el.disabled && !el.readOnly && (el.name || el.id) && isVisible(el);
    });
  }

  const keyOf = (el) => el.name || el.id;

  function labelFor(el) {
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return clean(label.textContent);
    }
    const wrapping = el.closest("label");
    if (wrapping) return clean(wrapping.textContent);
    if (el.getAttribute("aria-label")) return clean(el.getAttribute("aria-label"));
    const by = el.getAttribute("aria-labelledby");
    if (by) return clean(by.split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(" "));
    return "";
  }

  /** Section heading around a control (fieldset legend), to disambiguate "Address" etc. */
  function contextFor(el) {
    const legend = el.closest("fieldset")?.querySelector("legend");
    return legend ? clean(legend.textContent) : "";
  }

  function groupLabel(radios) {
    // Smallest element holding every radio in the group, then the text just before it.
    let box = radios[0].parentElement;
    while (box && !radios.every((r) => box.contains(r))) box = box.parentElement;
    const prev = box?.previousElementSibling;
    return prev ? clean(prev.textContent).slice(0, 80) : "";
  }

  function describe() {
    const fields = [];
    const elements = new Map(); // key -> element or radio[]
    for (const el of controls()) {
      const key = keyOf(el);
      if (elements.has(key)) continue;
      const type = el.tagName === "SELECT" ? "select" : el.tagName === "TEXTAREA" ? "textarea" : (el.type || "text").toLowerCase();
      const context = contextFor(el);
      const withContext = (label) => (context && label && !label.includes(context) ? `${context} › ${label}` : label || context);

      if (type === "radio") {
        const radios = controls().filter((r) => r.type === "radio" && r.name === el.name);
        elements.set(key, radios);
        fields.push({
          key,
          type: "radio",
          label: withContext(groupLabel(radios)),
          required: radios.some((r) => r.required),
          options: radios.map((r) => ({ value: r.value, label: labelFor(r) })),
        });
        continue;
      }

      elements.set(key, el);
      const field = { key, type, label: withContext(labelFor(el)), required: el.required };
      if (el.placeholder) field.placeholder = el.placeholder;
      if (type === "select") {
        field.options = [...el.options].filter((o) => o.value !== "").map((o) => ({ value: o.value, label: clean(o.textContent) }));
      }
      fields.push(field);
    }
    return { fields, elements };
  }

  // ---------- Writing values (React-safe) ----------

  function setNativeValue(el, value) {
    const proto =
      el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    // React tracks the last value it set; the prototype setter bypasses that so
    // the input event below is seen as a real change and React updates its state.
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function mark(el, status, note) {
    const target = el.type === "radio" || el.type === "checkbox" ? el.closest("label") || el : el;
    target.setAttribute("data-formwise", status);
    target.title = note ? `Formwise: ${note}` : "";
  }

  function apply(instruction, target) {
    const { value, status, note } = instruction;
    if (Array.isArray(target)) {
      // Radio group
      const radio = target.find((r) => r.value === value);
      if (radio && !radio.checked) radio.click();
      // Highlight the chosen option, or the whole group when nothing could be chosen.
      (radio ? [radio] : target).forEach((r) => mark(r, status, note));
      return;
    }
    if (value !== null) {
      if (target.type === "checkbox") {
        if (target.checked !== value) target.click();
      } else if (target.value !== value) {
        setNativeValue(target, value);
      }
    }
    mark(target, status, note);
  }

  // Once the agent touches a highlighted field, it counts as reviewed.
  document.addEventListener(
    "input",
    (e) => {
      if (!e.isTrusted) return;
      for (const el of [e.target, e.target.closest?.("label")]) {
        if (el?.getAttribute?.("data-formwise") === "check") el.setAttribute("data-formwise", "reviewed");
      }
    },
    true,
  );

  // ---------- Filling ----------

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function findAddRowButton(anchor) {
    for (let box = anchor.parentElement; box && box !== document.body; box = box.parentElement) {
      const button = [...box.querySelectorAll("button, [role=button], input[type=button]")].find(
        (b) => b.type !== "submit" && /\badd\b/i.test(b.textContent || b.value || ""),
      );
      if (button) return button;
    }
    return null;
  }

  async function fill({ onlyNew = false } = {}) {
    if (state.busy || !state.clientId) return;
    state.busy = true;
    state.error = "";
    state.message = "Reading the form…";
    render();

    // Tell the page a fill started (the demo portals' timer listens for this).
    window.dispatchEvent(new CustomEvent("formwise:fill", { detail: JSON.stringify({ clientId: state.clientId }) }));

    try {
      let { fields, elements } = describe();
      if (fields.length === 0) throw new Error("No form fields found on this page.");
      const page = { hostname: location.hostname, pathname: location.pathname, title: document.title };
      state.message = "Matching fields…";
      render();

      // A saved mapping answers in milliseconds; if it's taking longer, the AI is learning the form.
      const slow = setTimeout(() => {
        state.message = "Learning this form with AI (first visit only)…";
        render();
      }, 1200);
      let res = await api("/api/fill", "POST", { profileId: state.clientId, page, fields });

      // The client has more claims than the form has rows: add rows, then ask again.
      if (res.ok && res.data.extraRows) {
        const anchor = document.getElementsByName(res.data.extraRows.anchorKey)[0] || document.getElementById(res.data.extraRows.anchorKey);
        const button = anchor && findAddRowButton(anchor);
        if (button) {
          for (let i = 0; i < res.data.extraRows.count; i++) {
            button.click();
            await wait(60);
          }
          ({ fields, elements } = describe());
        }
        res = await api("/api/fill", "POST", { profileId: state.clientId, page, fields, ignoreExtraRows: !button });
      }
      clearTimeout(slow);
      if (!res.ok) throw new Error(res.data?.error || `Fill failed (${res.status})`);

      for (const instruction of res.data.instructions) {
        if (onlyNew && state.filledKeys.has(instruction.key)) continue;
        const target = elements.get(instruction.key);
        if (target) apply(instruction, target);
        state.filledKeys.add(instruction.key);
      }
      state.result = res.data;
      state.labels = Object.fromEntries(fields.map((f) => [f.key, f.label || f.placeholder || f.key]));
      state.autoFill = true;
      state.message = "";
    } catch (err) {
      state.error = err.message || String(err);
      state.message = "";
    } finally {
      state.busy = false;
      render();
    }
  }

  // Wizard steps and SPA navigation change the DOM; react to it.
  let mutationTimer = null;
  new MutationObserver(() => {
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(onDomChange, 350);
  }).observe(document.documentElement, { childList: true, subtree: true });

  function onDomChange() {
    const keys = controls().map(keyOf);
    if (keys.length === 0) {
      // Form gone (submitted, or navigated away): start fresh next time.
      state.filledKeys.clear();
      state.autoFill = false;
      state.result = null;
    } else if (state.autoFill && !state.busy && keys.some((k) => !state.filledKeys.has(k))) {
      fill({ onlyNew: true });
    }
    render();
  }

  // ---------- Panel UI ----------

  const host = document.createElement("div");
  host.id = "formwise-root";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  const pageStyle = document.createElement("style");
  pageStyle.textContent = `
    [data-formwise="filled"] { outline: 2px solid rgba(16,185,129,.85) !important; outline-offset: 1px; }
    [data-formwise="check"] { outline: 2px solid rgba(245,158,11,.95) !important; outline-offset: 1px; background-image: linear-gradient(rgba(245,158,11,.08), rgba(245,158,11,.08)) !important; }
    [data-formwise="unmapped"] { outline: 2px dashed rgba(161,161,170,.55) !important; outline-offset: 1px; }
  `;
  document.documentElement.appendChild(pageStyle);

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .panel { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 300px; background: #131316; color: #f4f4f5;
      border: 1px solid #27272d; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.5); font-size: 13px; overflow: hidden; }
    .head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #27272d; cursor: pointer; }
    .logo { width: 22px; height: 22px; border-radius: 6px; background: #6366f1; display: grid; place-items: center; font-weight: 700; font-size: 12px; }
    .title { font-weight: 600; flex: 1; }
    .body { padding: 12px; display: grid; gap: 10px; }
    select, button { width: 100%; font-size: 13px; border-radius: 8px; padding: 8px 10px; }
    select { background: #09090b; color: #f4f4f5; border: 1px solid #27272d; }
    button.primary { background: #6366f1; color: white; border: 0; font-weight: 600; cursor: pointer; }
    button.primary:disabled { opacity: .45; cursor: default; }
    .muted { color: #9b9ba6; font-size: 12px; }
    .warn { color: #fcd34d; font-size: 12px; }
    .err { color: #fca5a5; font-size: 12px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .stat { background: #1c1c21; border-radius: 8px; padding: 6px 8px; }
    .stat b { display: block; font-size: 16px; }
    .green b { color: #6ee7b7; } .amber b { color: #fcd34d; } .gray b { color: #a1a1aa; }
    ul { list-style: none; margin: 0; padding: 0; max-height: 140px; overflow: auto; display: grid; gap: 4px; }
    li { background: #1c1c21; border-left: 2px solid #f59e0b; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 12px; }
    li small { display: block; color: #9b9ba6; }
    .tag { font-size: 11px; padding: 1px 6px; border-radius: 99px; background: #1c1c21; color: #9b9ba6; }
    .tag.ai { background: rgba(99,102,241,.2); color: #c7d2fe; }
    .tag.cached { background: rgba(16,185,129,.15); color: #6ee7b7; }
  `;

  const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function render() {
    const fieldCount = controls().length;
    if (fieldCount < MIN_FIELDS && !state.result) {
      root.innerHTML = "";
      return;
    }
    const client = state.clients.find((c) => c.id === state.clientId);
    const r = state.result;
    const checks = r ? r.instructions.filter((i) => i.status === "check") : [];

    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="panel">
        <div class="head" data-action="toggle">
          <div class="logo">F</div>
          <div class="title">Formwise</div>
          ${r ? `<span class="tag ${r.source}">${r.source === "cached" ? "saved mapping" : "learned now"}</span>` : ""}
          <span class="muted">${state.collapsed ? "▴" : "▾"}</span>
        </div>
        ${
          state.collapsed
            ? ""
            : `<div class="body">
          <select data-action="client">
            <option value="">Choose a client…</option>
            ${state.clients
              .map((c) => `<option value="${escape(c.id)}" ${c.id === state.clientId ? "selected" : ""}>${escape(c.name)}${c.reviewed ? "" : " (not reviewed)"}</option>`)
              .join("")}
          </select>
          ${client && !client.reviewed ? `<div class="warn">This profile hasn't been reviewed yet. Check it in Formwise first.</div>` : ""}
          <button class="primary" data-action="fill" ${!state.clientId || state.busy ? "disabled" : ""}>
            ${state.busy ? escape(state.message || "Working…") : r ? "Fill again" : `Fill this page (${fieldCount} fields)`}
          </button>
          ${state.error ? `<div class="err">${escape(state.error)}</div>` : ""}
          ${
            r
              ? `<div class="stats">
                  <div class="stat green"><b>${r.summary.filled}</b>filled</div>
                  <div class="stat amber"><b>${r.summary.toCheck}</b>to check</div>
                  <div class="stat gray"><b>${r.summary.unmapped}</b>unmapped</div>
                </div>
                ${
                  checks.length
                    ? `<ul>${checks
                        .map((i) => `<li data-key="${escape(i.key)}">${escape(state.labels[i.key] || i.key)}<small>${escape(i.note)}</small></li>`)
                        .join("")}</ul>`
                    : ""
                }`
              : ""
          }
          <div class="muted">Review every highlighted field, then submit yourself. Formwise never submits.</div>
        </div>`
        }
      </div>`;
  }

  root.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "toggle") {
      state.collapsed = !state.collapsed;
      render();
    } else if (action === "fill") {
      fill();
    }
    const item = e.target.closest("li[data-key]");
    if (item) {
      const el = document.getElementsByName(item.dataset.key)[0] || document.getElementById(item.dataset.key);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.action !== "client") return;
    state.clientId = e.target.value || null;
    state.result = null;
    state.autoFill = false;
    state.filledKeys.clear();
    chrome.storage.local.set({ clientId: state.clientId });
    render();
  });

  async function loadClients() {
    const res = await api("/api/profiles");
    if (!res.ok) {
      state.error = res.data?.error || "Could not load clients.";
    } else {
      state.clients = res.data;
      state.error = "";
      if (state.clientId && !state.clients.some((c) => c.id === state.clientId)) state.clientId = null;
    }
    render();
  }

  chrome.storage.local.get("clientId").then(({ clientId }) => {
    state.clientId = clientId || null;
    loadClients();
  });
  // Pick up clients reviewed in another tab.
  window.addEventListener("focus", loadClients);
})();
