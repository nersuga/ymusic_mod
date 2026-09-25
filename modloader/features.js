// Page-side features of the mod (injected into the app page by modloader/main.js):
//   window.__ymModsPlayer.cmd(name)  — like / volume commands (play/pause/next/prev go through the app's own IPC)
//   volume percentage (label under the slider), track state for the mini player / sleep timer, cover URL for the glass theme
(() => {
  if (window.__ymModsFeatures) return;
  window.__ymModsFeatures = true;

  const $ = (id, root = document) => root.querySelector(`[data-test-id="${id}"]`);
  // The player bar: smallest ancestor of the "next" button that also holds the like button
  const playerBar = () => {
    let el = $("NEXT_TRACK_BUTTON");
    while (el && !$("LIKE_BUTTON", el)) el = el.parentElement;
    return el || document;
  };
  const volumeSlider = () => $("CHANGE_VOLUME_SLIDER");
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const setVolume = (v) => {
    const el = volumeSlider();
    if (!el) return null;
    const value = Math.min(1, Math.max(0, Math.round(v * 100) / 100));
    valueSetter.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    showVolume(value);
    return value;
  };

  window.__ymModsPlayer = {
    cmd(name) {
      if (name === "like") { const b = $("LIKE_BUTTON", playerBar()); if (b) b.click(); return !!b; }
      if (name === "volumeUp" || name === "volumeDown") {
        const el = volumeSlider();
        return el ? setVolume(+el.value + (name === "volumeUp" ? 0.05 : -0.05)) : null;
      }
      if (name === "playPause") { const b = $("PAUSE_BUTTON", playerBar()) || $("PLAY_BUTTON", playerBar()); if (b) b.click(); return !!b; }
      return false;
    },
  };

  // ── Volume percentage: a label inside the slider popup, under the track ──
  // (when the popup is closed — e.g. a hotkey changed the volume — a short toast above the volume button)
  const style = document.createElement("style");
  style.textContent = `
    /* the popup grows by one line (1.5rem) for the label instead of squeezing the track */
    html:not([data-ym-no-volume-percent]) [class*="ChangeVolume_root"][class*="ChangeVolume_root"] { --position-slider-container-block: -15rem !important; }
    html:not([data-ym-no-volume-percent]) [class*="ChangeVolume_sliderContainer"][class*="ChangeVolume_sliderContainer"] { --height-slider-container: 15rem !important; }
    html:not([data-ym-no-volume-percent]) [class*="ChangeVolume_wrapperSlider"][class*="ChangeVolume_wrapperSlider"] { --height-slider: 15rem !important; position: relative; padding-bottom: calc(8px + 1.5rem) !important; box-sizing: border-box; }
    .ymmods-volume-label { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; pointer-events: none;
      font: 500 11px/14px "YS Text", sans-serif; font-variant-numeric: tabular-nums; color: rgba(255,255,255,.72); }
    html[data-ym-no-volume-percent] .ymmods-volume-label { display: none; }
    #ymmods-volume-toast { position: fixed; z-index: 10000; pointer-events: none; padding: 6px 10px; border-radius: 10px;
      background: var(--ym-background-color-primary-enabled-popover, #1a1a1a); color: var(--ym-controls-color-primary-text-enabled_variant, #e6e6e6);
      box-shadow: 0 4px 16px rgba(0,0,0,.35); font: 500 13px/16px "YS Text", sans-serif; font-variant-numeric: tabular-nums;
      opacity: 0; transition: opacity .2s; transform: translate(-50%, -100%); white-space: nowrap; }`;
  document.head.appendChild(style);
  const toast = document.createElement("div");
  toast.id = "ymmods-volume-toast";
  let toastTimer;
  const percent = (v) => Math.round(v * 100) + "%";
  const sliderPopupOpen = () => {
    const el = volumeSlider();
    const wrap = el && el.closest('[class*="ChangeVolume_wrapperSlider"]');
    if (!wrap) return false;
    const r = wrap.getBoundingClientRect();
    const cs = getComputedStyle(wrap);
    return r.height > 40 && r.width > 0 && cs.visibility !== "hidden" && +cs.opacity > 0.1;
  };
  // Every volume control on the page gets its own label (the vibe page and the bottom bar each have one)
  const updateLabel = () => {
    for (const el of document.querySelectorAll('[data-test-id="CHANGE_VOLUME_SLIDER"]')) {
      const wrap = el.closest('[class*="ChangeVolume_wrapperSlider"]');
      if (!wrap) continue;
      let label = wrap.querySelector(".ymmods-volume-label");
      if (!label) {
        label = document.createElement("span");
        label.className = "ymmods-volume-label";
        wrap.appendChild(label);
      }
      label.textContent = percent(+el.value);
    }
  };
  function showVolume(value) {
    updateLabel();
    if (document.documentElement.hasAttribute("data-ym-no-volume-percent") || sliderPopupOpen()) return;
    const btn = $("CHANGE_VOLUME_BUTTON");
    if (!btn) return;
    if (!toast.isConnected) document.body.appendChild(toast);
    const r = btn.getBoundingClientRect();
    toast.textContent = percent(value);
    toast.style.left = r.left + r.width / 2 + "px";
    toast.style.top = r.top - 8 + "px";
    toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = "0"; }, 1200);
  }
  let lastVolume = null;
  document.addEventListener("input", (e) => {
    if (e.target && e.target.getAttribute && e.target.getAttribute("data-test-id") === "CHANGE_VOLUME_SLIDER") updateLabel();
  }, true);
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest && e.target.closest('[class*="ChangeVolume_root"]')) updateLabel();
  });

  // ── Blurred cover behind the app (glass theme): two layers cross-fade, the new cover is preloaded first,
  //    so a track change never swaps the background abruptly. The theme CSS shows the layers. ──
  // The cover is shrunk to 48×48 and blurred once on a canvas; the stretched tiny image is already soft,
  // so no per-frame CSS blur is needed (a CSS filter here is re-applied on every frame the vibe animation draws)
  const coverStyle = document.createElement("style");
  coverStyle.textContent = `
    .ymmods-cover-layer { display: none; position: fixed; inset: -40px; z-index: -1; pointer-events: none;
      background: center / cover no-repeat; opacity: 0; transition: opacity 1.2s ease; }
    .ymmods-cover-layer.ymmods-raw { filter: blur(70px) saturate(1.5) brightness(.55); }
    html[data-ym-anim="off"] [data-test-id="VIBE_ANIMATION"],
    html[data-ym-anim="focus"][data-ym-unfocused] [data-test-id="VIBE_ANIMATION"] { display: none !important; }`;
  document.head.appendChild(coverStyle);
  const coverLayers = [0, 1].map(() => {
    const layer = document.createElement("div");
    layer.className = "ymmods-cover-layer";
    return layer;
  });
  let activeLayer = 0;
  let currentCover = "";
  const blurredCover = (img) => {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.filter = "blur(3px) saturate(1.5) brightness(.55)";
    ctx.drawImage(img, -6, -6, size + 12, size + 12); // overscan so the blurred edges stay filled
    return canvas.toDataURL("image/png");
  };
  function setCover(url) {
    if (!url || url === currentCover) return;
    currentCover = url;
    const small = url.replace(/\/\d+x\d+$/, "/50x50");
    const img = new Image();
    img.crossOrigin = "anonymous";
    const show = (background, raw) => {
      if (currentCover !== url) return; // a newer track arrived meanwhile
      for (const layer of coverLayers) if (!layer.isConnected) document.body.prepend(layer);
      const next = coverLayers[1 - activeLayer];
      next.style.backgroundImage = background;
      next.classList.toggle("ymmods-raw", raw);
      next.style.opacity = "1";
      coverLayers[activeLayer].style.opacity = "0";
      activeLayer = 1 - activeLayer;
    };
    img.onload = () => {
      try { show(`url("${blurredCover(img)}")`, false); } catch { show(`url("${url}")`, true); } // no CORS: CSS blur fallback
    };
    img.onerror = () => show(`url("${url}")`, true);
    img.src = small;
  }
  // Window focus drives the "only while focused" vibe animation mode
  const markFocus = () => document.documentElement.toggleAttribute("data-ym-unfocused", !document.hasFocus());
  window.addEventListener("focus", markFocus);
  window.addEventListener("blur", markFocus);
  markFocus();

  // ── Track state for the mini player and the sleep timer; cover URL for themes ──
  const bigArt = (url) => (url || "").replace(/\/\d+x\d+$/, "/400x400");
  const readState = () => {
    const ms = navigator.mediaSession;
    const md = ms && ms.metadata;
    const bar = playerBar();
    const like = $("LIKE_BUTTON", bar);
    const vol = volumeSlider();
    let lang = "";
    try { lang = JSON.parse(localStorage.getItem("funtech-lang") || "{}").value || ""; } catch {}
    return {
      title: md ? md.title : "",
      artist: md ? md.artist : "",
      cover: md && md.artwork && md.artwork.length ? bigArt(md.artwork[md.artwork.length - 1].src) : "",
      playing: ms ? ms.playbackState === "playing" : false,
      liked: like ? like.getAttribute("aria-pressed") === "true" : false,
      volume: vol ? +vol.value : null,
      lang,
    };
  };
  let lastJson = "";
  const tick = () => {
    const s = readState();
    if (s.volume !== null && lastVolume !== null && Math.abs(s.volume - lastVolume) > 0.001) showVolume(s.volume);
    lastVolume = s.volume;
    if (s.cover) setCover(s.cover);
    const json = JSON.stringify(s);
    if (json !== lastJson && window.ymMods && window.ymMods.reportState) { lastJson = json; window.ymMods.reportState(s); }
  };
  setInterval(tick, 700);
  tick();
})();
