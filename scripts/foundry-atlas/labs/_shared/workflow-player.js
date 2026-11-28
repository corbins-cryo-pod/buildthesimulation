/* Foundry playback: a clock for existing model stages, never a second process model. */
window.installFoundryPlayback = function installFoundryPlayback(spec) {
  "use strict";
  const panel = spec.button.closest("[data-foundry-playback]");
  const progress = panel.querySelector("progress");
  const current = panel.querySelector("[data-foundry-current]");
  const notice = panel.querySelector("[data-foundry-notice]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let running = false;
  let timer = 0;
  let reason = "";
  let motion = [];
  const interaction = [
    "button", "select", "input", "textarea", "summary", "a", "canvas", "[role=button]",
    "[data-foundry-inspect]"
  ].join(",");
  function sync() {
    const p = spec.read();
    const label = running ? "Pause workflow" : p.done ? "Replay workflow" : "Play workflow";
    spec.button.textContent = label;
    spec.button.setAttribute("aria-label", label);
    progress.max = p.total;
    progress.value = p.completed;
    current.textContent = p.text;
    panel.dataset.playState = running ? "playing" : p.done ? "complete" : "idle";
    panel.dataset.playPosition = String(p.completed);
    if (reason) panel.title = reason;
    else panel.removeAttribute("title");
  }
  function cancelMotion() {
    for (const a of motion) a.cancel();
    motion = [];
  }
  function notify(message) {
    reason = message;
    notice.textContent = message;
    sync();
  }
  function pause(detail = "Playback paused. Press Play workflow to continue.") {
    if (!running) return;
    running = false;
    clearTimeout(timer);
    timer = 0;
    cancelMotion();
    notify(detail);
  }
  function flash() {
    cancelMotion();
    if (reduced.matches) return;
    for (const frame of spec.frames || []) {
      if (typeof frame.animate === "function") {
        motion.push(frame.animate([{opacity:0.86},{opacity:1}],{duration:150,easing:"ease-out"}));
      }
    }
  }
  function schedule() {
    timer = setTimeout(advance, spec.delay || 1300);
  }
  function advance() {
    if (!running) return;
    if (document.hidden) {
      pause("Playback paused while the page is hidden.");
      return;
    }
    const old = spec.read();
    try {
      spec.advance();
      const next = spec.read();
      flash();
      if (next.done) {
        running = false;
        timer = 0;
        notify("Workflow finished. Press Replay workflow to review from the beginning.");
      } else if (next.completed <= old.completed) {
        pause("Playback stopped at the current stage; you can continue manually.");
      } else {
        sync();
        schedule();
      }
    } catch (e) {
      pause("Playback stopped at the current stage; you can continue manually.");
      console.error(e);
    }
  }
  spec.button.addEventListener("click", () => {
    if (running) return pause();
    if (spec.read().done) spec.replay();
    const next = spec.read();
    if (next.done) return sync();
    running = true;
    notify("Playback started. Press Pause workflow or use a manual control to take over.");
    // Compact screens should show the changing workpiece, not only its Play button.
    const frame = (spec.frames || [])[0];
    if (frame) {
      const b = frame.getBoundingClientRect();
      const visible = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
      if (visible < Math.min(b.height * 0.65, innerHeight * 0.36)) {
        panel.scrollIntoView({block:"start", behavior:"instant"});
      }
    }
    schedule();
  });
  function manual(ev) {
    if (!running) return;
    if (ev.type === "keydown" && ev.key === "Escape") { pause(); return; }
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target || target.closest("[data-foundry-playback]") ||
        !target.closest(interaction)) return;
    if (ev.type === "keydown" && ["Tab", "Shift", "Control", "Alt", "Meta"].includes(ev.key)) return;
    pause("Playback paused for manual inspection. Press Play workflow to resume.");
  }
  for (const name of ["pointerdown", "click", "input", "change", "keydown"]) {
    document.addEventListener(name, manual, true);
  }
  document.addEventListener("wheel", (ev) => {
    if (ev.target instanceof Element && ev.target.closest("canvas,[data-foundry-inspect]")) manual(ev);
  }, {capture:true, passive:true});
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause("Playback paused while the page is hidden.");
  });
  window.addEventListener("pagehide", () => pause("Playback paused while the page is hidden."));
  if (typeof reduced.addEventListener === "function") {
    reduced.addEventListener("change", () => { if (reduced.matches) cancelMotion(); });
  }
  sync();
  return {sync, pause};
};
