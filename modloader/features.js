// Page-side features of the mod (injected into the app page by modloader/main.js):
//   window.__ymModsPlayer.cmd(name)  — like / dislike / shuffle / repeat / volume commands (play/pause/next/prev go through the app's own IPC)
//   window.__ymModsToast(text)       — a short notice at the top of the window
//   volume percentage (label under the slider), track state for the mini player / sleep timer / Discord / Last.fm,
//   cover URL for the glass theme, quality badge in the player bar, search in the "Add to playlist" menu
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

  // The app's own models, found once through the React tree (context provider values):
  // the root model (sonataState: current track, position, repeat…) and the playback controller
  let models = null;
  const findModels = () => {
    if (models && models.root && models.pc) return models;
    const start = document.querySelector('[data-test-id="VIBE_PLAYERBAR"], section[class*="PlayerBarDesktop"], [data-test-id="NEXT_TRACK_BUTTON"]');
    if (!start) return null;
    const key = Object.keys(start).find((k) => k.startsWith("__reactFiber"));
    const found = {};
    for (let f = key && start[key], i = 0; f && i < 400; f = f.return, i++) {
      const v = f.memoizedProps && f.memoizedProps.value;
      if (!v || typeof v !== "object") continue;
      if (v.isRootModel && v.sonataState) found.root = v;
      if (v.playbackController) found.pc = v.playbackController;
    }
    if (found.root) models = found;
    return models;
  };
  // MobX-style boxes ({ observableValue }) and signals (peek()) of the player core
  const unbox = (o) => {
    for (let i = 0; i < 4 && o; i++) {
      if (typeof o.peek === "function") o = o.peek();
      else if (o && typeof o === "object" && "observableValue" in o) o = o.observableValue;
      else break;
    }
    return o;
  };
  const playback = () => { const m = findModels(); return m && m.pc ? unbox(m.pc.activePlayback) : null; };
  const sonata = () => { const m = findModels(); return m ? m.root.sonataState : null; };
  const mediaSource = () => {
    try {
      const pb = playback();
      const current = pb && unbox(pb.state.queueState.currentEntity);
      const src = current && current.entity && unbox(current.entity.mediaSourceData);
      return src && src.data ? src.data : null;
    } catch { return null; }
  };

  const TEXT = {
    ru: { shuffleOn: "Перемешивание включено", shuffleOff: "Перемешивание выключено", repeat: { none: "Повтор выключен", context: "Повтор списка", one: "Повтор трека" }, noShuffle: "Здесь перемешивание недоступно", search: "Найти плейлист", nothing: "Ничего не найдено", repeatBtn: "Повтор трека", download: "Скачать", downloaded: "Скачано", downloading: "Скачиваю трек…", mini: "Мини-плеер" },
    en: { shuffleOn: "Shuffle on", shuffleOff: "Shuffle off", repeat: { none: "Repeat off", context: "Repeat all", one: "Repeat track" }, noShuffle: "Shuffle is not available here", search: "Find a playlist", nothing: "Nothing found", repeatBtn: "Repeat track", download: "Download", downloaded: "Downloaded", downloading: "Downloading the track…", mini: "Mini player" },
    kk: { shuffleOn: "Араластыру қосулы", shuffleOff: "Араластыру өшірулі", repeat: { none: "Қайталау өшірулі", context: "Тізімді қайталау", one: "Тректі қайталау" }, noShuffle: "Мұнда араластыру қолжетімсіз", search: "Плейлист табу", nothing: "Ештеңе табылмады", repeatBtn: "Тректі қайталау", download: "Жүктеп алу", downloaded: "Жүктелген", downloading: "Трек жүктелуде…", mini: "Шағын ойнатқыш" },
    uz: { shuffleOn: "Aralashtirish yoqildi", shuffleOff: "Aralashtirish o‘chirildi", repeat: { none: "Takrorlash o‘chiq", context: "Ro‘yxatni takrorlash", one: "Trekni takrorlash" }, noShuffle: "Bu yerda aralashtirish mavjud emas", search: "Pleylist topish", nothing: "Hech narsa topilmadi", repeatBtn: "Trekni takrorlash", download: "Yuklab olish", downloaded: "Yuklab olingan", downloading: "Trek yuklanmoqda…", mini: "Mini pleyer" },
  };
  const lang = () => { let l = ""; try { l = JSON.parse(localStorage.getItem("funtech-lang") || "{}").value || ""; } catch {} return (l || document.documentElement.lang || "ru").slice(0, 2); };
  const text = () => TEXT[lang()] || TEXT.en;

  window.__ymModsPlayer = {
    cmd(name) {
      if (name === "like") { const b = $("LIKE_BUTTON", playerBar()); if (b) b.click(); return !!b; }
      if (name === "dislike") { const b = $("DISLIKE_BUTTON", playerBar()) || $("DISLIKE_BUTTON"); if (b) b.click(); return !!b; }
      if (name === "shuffle") {
        const s = sonata(), pb = playback();
        if (!s || !pb || !s.canShuffle) { notify(text().noShuffle); return false; }
        pb.toggleShuffle();
        setTimeout(() => notify(sonata().shuffle ? text().shuffleOn : text().shuffleOff), 150);
        return true;
      }
      if (name === "repeat") {
        const s = sonata(), pb = playback();
        if (!s || !pb) return false;
        // My Vibe has no "repeat all": there it switches between off and the current track
        const order = s.contextType === "vibe" ? ["none", "one"] : ["none", "context", "one"];
        const next = order[(order.indexOf(s.repeatMode) + 1) % order.length];
        pb.setRepeatMode(next);
        notify(text().repeat[next]);
        return true;
      }
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
      opacity: 0; transition: opacity .2s; transform: translate(-50%, -100%); white-space: nowrap; }
    #ymmods-notice { position: fixed; z-index: 10000; top: 52px; left: 50%; transform: translateX(-50%); pointer-events: none;
      padding: 8px 16px; border-radius: 999px; background: var(--ym-background-color-primary-enabled-popover, #1a1a1a);
      color: var(--ym-controls-color-primary-text-enabled_variant, #e6e6e6); box-shadow: 0 6px 20px rgba(0,0,0,.35);
      font: 500 14px/18px "YS Text", sans-serif; font-variant-numeric: tabular-nums; opacity: 0; transition: opacity .2s; white-space: nowrap; }
    /* quality badge (codec · bitrate) next to the sound settings / in the My Vibe player bar */
    .ymmods-quality { flex: none; align-self: center; margin: 0 6px; padding: 3px 7px; border-radius: 7px; cursor: default;
      border: 1px solid rgba(255,255,255,.22); color: rgba(255,255,255,.72); font: 600 11px/14px "YS Text", sans-serif;
      letter-spacing: .02em; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .ymmods-quality[data-lossless] { border-color: var(--ym-controls-color-primary-default-enabled, #ff0); color: var(--ym-controls-color-primary-default-enabled, #ff0); }
    html[data-ym-no-quality] .ymmods-quality { display: none; }
    /* on the My Vibe page the badge sits above the app version, in the same pill style */
    [class*="MainPage_betaSlot"]:has(.ymmods-quality) { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .ymmods-quality.ymmods-in-slot { margin: 0; padding: 4px 8px; border: 0; border-radius: 16px; background: rgba(255,255,255,.08);
      color: rgba(255,255,255,.5); font: 500 13px/18px "YS Text", sans-serif; letter-spacing: 0; }
    .ymmods-quality.ymmods-in-slot[data-lossless] { color: var(--ym-controls-color-primary-default-enabled, #ff0); }
    /* repeat moved out of the My Vibe "…" menu into the player bar */
    [data-test-id="VIBE_CONTEXT_MENU_REPEAT_ITEM"] { display: none !important; }
    [data-ymmods="repeat"][aria-pressed="true"] { color: var(--ym-controls-color-primary-default-enabled, #ff0) !important; }
    /* search field in the "Add to playlist" menu */
    .ymmods-plsearch { display: flex; align-items: center; gap: 8px; margin: 4px 8px 6px; padding: 0 12px; height: 36px; border-radius: 10px;
      background: rgba(255,255,255,.08); border: 1px solid transparent; transition: border-color .15s; }
    .ymmods-plsearch:focus-within { border-color: rgba(255,255,255,.28); }
    .ymmods-plsearch svg { width: 16px; height: 16px; flex: none; opacity: .6; }
    .ymmods-plsearch input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #fff; font: 500 14px/18px "YS Text", sans-serif; }
    .ymmods-plsearch input::placeholder { color: rgba(255,255,255,.45); }
    .ymmods-plempty { padding: 10px 16px; color: rgba(255,255,255,.5); font: 500 13px/16px "YS Text", sans-serif; }`;
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
  // Generic notice at the top of the window (zoom level, repeat/shuffle from a hotkey…)
  const notice = document.createElement("div");
  notice.id = "ymmods-notice";
  let noticeTimer;
  function notify(message) {
    if (!notice.isConnected) document.body.appendChild(notice);
    notice.textContent = message;
    notice.style.opacity = "1";
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.style.opacity = "0"; }, 1400);
  }
  window.__ymModsToast = notify;

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
    const st = {
      title: md ? md.title : "",
      artist: md ? md.artist : "",
      album: md ? md.album || "" : "",
      cover: md && md.artwork && md.artwork.length ? bigArt(md.artwork[md.artwork.length - 1].src) : "",
      playing: ms ? ms.playbackState === "playing" : false,
      liked: like ? like.getAttribute("aria-pressed") === "true" : false,
      volume: vol ? +vol.value : null,
      lang,
    };
    try {
      const s = sonata();
      const meta = s && s.entityMeta;
      if (meta && meta.title === st.title) {
        st.trackId = String(meta.id || "");
        st.albumId = meta.albumId ? String(meta.albumId) : (meta.albums && meta.albums[0] ? String(meta.albums[0].id) : "");
        if (meta.artists && meta.artists[0]) st.scrobbleArtist = meta.artists[0].name;
        st.duration = Math.round(s.duration || (meta.durationMs || 0) / 1000);
        st.position = Math.round(s.position || 0);
      }
      const src = mediaSource();
      if (src && (!st.trackId || String(src.trackId) === st.trackId || String(src.realId) === st.trackId)) {
        st.codec = src.codec || "";
        st.bitrate = src.bitrate || 0;
        st.quality = src.quality || "";
      }
    } catch {}
    return st;
  };
  let lastJson = "";
  // ── Quality badge: codec and bitrate of the file that is playing ──
  const CODECS = { flac: "FLAC", "flac-mp4": "FLAC", aac: "AAC", "aac-mp4": "AAC", "he-aac": "HE-AAC", "he-aac-mp4": "HE-AAC", mp3: "MP3" };
  const QUALITY_NAMES = { lq: "LQ", nq: "NQ", hq: "HQ", lossless: "Lossless" };
  const badge = document.createElement("span");
  badge.className = "ymmods-quality";
  const updateBadge = (s) => {
    const codec = s.codec ? CODECS[s.codec] || s.codec.toUpperCase() : "";
    if (!codec) { badge.remove(); return; }
    const lossless = /flac/.test(s.codec);
    badge.textContent = lossless || !s.bitrate ? codec : `${codec} ${s.bitrate}`;
    badge.toggleAttribute("data-lossless", lossless);
    badge.title = [s.codec, s.bitrate ? s.bitrate + " kbps" : "", QUALITY_NAMES[s.quality] || s.quality].filter(Boolean).join(" · ");
    // My Vibe page: above the app version (bottom right); elsewhere: left of the sound settings button
    const version = $("RELEASE_NOTES_BUTTON");
    const anchor = version || $("SOUND_QUALITY_BUTTON");
    badge.classList.toggle("ymmods-in-slot", !!version);
    if (anchor && badge.nextElementSibling !== anchor) anchor.before(badge);
  };

  // ── My Vibe player bar: repeat button (the "…" menu item is hidden), a copy of the like button ──
  const iconHref = (id) => "/icons/sprite.svg#" + id;
  const setIcon = (btn, id) => { const use = btn.querySelector("use"); if (use && use.getAttribute("xlink:href") !== iconHref(id)) use.setAttribute("xlink:href", iconHref(id)); };
  const updateRepeatButton = () => {
    const bar = $("VIBE_PLAYERBAR");
    const more = bar && $("VIBE_CONTEXT_MENU_BUTTON", bar);
    const like = bar && $("LIKE_BUTTON", bar);
    const s = sonata();
    let btn = bar && bar.querySelector('[data-ymmods="repeat"]');
    if (!more || !like || !s || !s.canChangeRepeatMode) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = like.cloneNode(true);
      for (const a of ["data-test-id", "aria-live", "aria-busy"]) btn.removeAttribute(a);
      btn.setAttribute("data-ymmods", "repeat");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pb = playback(), st = sonata();
        if (!pb || !st) return;
        pb.setRepeatMode(st.repeatMode === "none" ? "one" : "none");
        setTimeout(updateRepeatButton, 50);
      });
    }
    // a direct child of the buttons row (like the like button), so the row's gap applies on both sides:
    // the "…" button sits in its own wrapper
    const slot = more.parentElement && more.parentElement !== like.parentElement && more.parentElement.parentElement === like.parentElement ? more.parentElement : more;
    if (btn.nextElementSibling !== slot) slot.before(btn);
    // same look as the like button (its classes change with its state: keep them in sync)
    if (btn.className !== like.className) btn.className = like.className;
    // the like button may be disabled while a track loads: the copy is never disabled
    if (btn.disabled) btn.disabled = false;
    btn.removeAttribute("data-disabled");
    const on = s.repeatMode !== "none";
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", text().repeatBtn);
    btn.title = text().repeatBtn;
    setIcon(btn, s.repeatMode === "one" ? "repeat_one_xs" : "repeat_xs");
  };

  // ── Extra items in the My Vibe "…" menu: download the current track (the app's own offline download)
  //    and the mini player ──
  let container = null; // the app's dependency container (React context), for its offline downloads service
  const slam = () => {
    if (!container) {
      const start = document.querySelector('[data-test-id="VIBE_PLAYERBAR"], section[class*="PlayerBarDesktop"]');
      const key = start && Object.keys(start).find((k) => k.startsWith("__reactFiber"));
      for (let f = key && start[key], i = 0; f && i < 400; f = f.return, i++) {
        const v = f.memoizedProps && f.memoizedProps.value;
        if (v && typeof v.get === "function" && "bindings" in v) { container = v; break; }
      }
    }
    try { return container ? container.get("Slam") : null; } catch { return null; }
  };
  const currentEntityId = () => {
    const meta = sonata() && sonata().entityMeta;
    if (!meta) return null;
    const album = meta.albums && meta.albums[0] ? meta.albums[0].id : meta.albumId;
    return album ? `${meta.id}:${album}` : String(meta.id);
  };
  const closeMenus = () => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  const menuItem = (template, id, icon, label, onClick) => {
    const item = template.cloneNode(true);
    item.removeAttribute("data-test-id");
    item.setAttribute("data-ymmods", id);
    item.disabled = false;
    item.removeAttribute("data-disabled");
    item.classList.remove(...[...item.classList].filter((c) => /active/i.test(c)));
    const span = item.querySelector("span");
    const svg = span && span.querySelector("svg");
    if (span) { span.textContent = ""; if (svg) span.appendChild(svg); span.appendChild(document.createTextNode(label)); }
    setIcon(item, icon);
    item.addEventListener("click", (e) => { e.stopPropagation(); onClick(item); });
    return item;
  };
  const addVibeMenuItems = (menu) => {
    if (menu.querySelector('[data-ymmods="download"]')) return;
    const template = $("VIBE_CONTEXT_MENU_PLAY_QUEUE_ITEM", menu) || $("VIBE_CONTEXT_MENU_SYNC_LYRICS_ITEM", menu);
    if (!template) return;
    const t = text();
    const mini = menuItem(template, "mini", "picture_xs", t.mini, () => { closeMenus(); window.ymMods && window.ymMods.toggleMiniPlayer(); });
    const download = menuItem(template, "download", "download_xxs", t.download, async () => {
      const service = slam(), id = currentEntityId();
      closeMenus();
      if (!service || !service.tracksController || !id) return;
      service.tracksController.download(id);
      notify(t.downloading);
    });
    template.after(download);
    download.after(mini);
    // already on the device: shown as done, like the app does in the track menu
    const id = currentEntityId(), service = slam();
    Promise.resolve(service && service.tracksController && id ? service.tracksController.getTrack(id) : null).then((track) => {
      if (!track) return;
      setIcon(download, "downloaded_xxs");
      download.querySelector("span").lastChild.textContent = t.downloaded;
      download.disabled = true;
      download.style.opacity = ".6";
    }).catch(() => {});
  };

  // ── Bottom player bar: mini player button next to the play queue button ──
  const updateMiniButton = () => {
    const queue = $("PLAYERBAR_DESKTOP_PLAY_QUEUE_BUTTON");
    if (!queue || queue.parentElement.querySelector('[data-ymmods="mini"]')) return;
    const btn = queue.cloneNode(true);
    for (const a of ["data-test-id", "aria-live", "aria-busy", "aria-pressed", "aria-expanded", "aria-haspopup"]) btn.removeAttribute(a);
    btn.setAttribute("data-ymmods", "mini");
    btn.disabled = false;
    btn.removeAttribute("data-disabled");
    btn.setAttribute("aria-label", text().mini);
    btn.title = text().mini;
    btn.classList.remove(...[...btn.classList].filter((c) => /active|selected/i.test(c)));
    setIcon(btn, "picture_xs");
    btn.addEventListener("click", (e) => { e.stopPropagation(); window.ymMods && window.ymMods.toggleMiniPlayer(); });
    queue.after(btn);
  };

  // ── Search in the "Add to playlist" submenu ──
  const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const norm = (v) => v.toLowerCase().replace(/ё/g, "е").trim();
  const addPlaylistSearch = (menu) => {
    if (document.documentElement.hasAttribute("data-ym-no-plsearch") || menu.querySelector(".ymmods-plsearch")) return;
    const items = () => [...menu.querySelectorAll('[data-test-id="TRACK_SUBMENU_ITEM"], [data-test-id="TRACK_SUBMENU_LIKE_PLAYLIST_BUTTON"]')];
    if (items().length < 6) return; // a short list does not need a search
    const box = document.createElement("div");
    box.className = "ymmods-plsearch";
    box.innerHTML = SEARCH_ICON;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = text().search;
    input.spellcheck = false;
    box.appendChild(input);
    const empty = document.createElement("div");
    empty.className = "ymmods-plempty";
    empty.textContent = text().nothing;
    empty.hidden = true;
    const create = $("TRACK_SUBMENU_ADD_PLAYLIST_BUTTON", menu);
    if (create) create.after(box); else menu.prepend(box);
    box.after(empty);
    input.addEventListener("input", () => {
      const q = norm(input.value);
      let shown = 0;
      for (const item of items()) {
        const hit = !q || norm(item.textContent).includes(q);
        item.style.display = hit ? "" : "none";
        if (hit) shown++;
      }
      empty.hidden = shown > 0;
    });
    // the menu handles arrows/letters itself (typeahead): keep the keys in the field
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return;
      e.stopPropagation();
      if (e.key === "Enter") {
        const first = items().find((i) => i.style.display !== "none");
        if (first) { e.preventDefault(); first.click(); }
      }
    });
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
  // Menus are portals: watch the whole document, at most one check per 60 ms (a timer, not a frame:
  // frames do not run while the window is hidden). The state tick below checks too, as a fallback.
  const checkMenus = () => {
    const menu = document.querySelector('[class*="ContextSubMenuAddToPlaylist_menu"]');
    if (menu) addPlaylistSearch(menu);
    const vibeMenu = $("VIBE_CONTEXT_MENU");
    if (vibeMenu) addVibeMenuItems(vibeMenu);
  };
  let menuTimer = null;
  new MutationObserver(() => {
    if (menuTimer) return;
    menuTimer = setTimeout(() => { menuTimer = null; checkMenus(); }, 60);
  }).observe(document.documentElement, { childList: true, subtree: true });

  const tick = () => {
    const s = readState();
    updateBadge(s);
    checkMenus();
    updateRepeatButton();
    updateMiniButton();
    if (s.volume !== null && lastVolume !== null && Math.abs(s.volume - lastVolume) > 0.001) showVolume(s.volume);
    lastVolume = s.volume;
    if (s.cover) setCover(s.cover);
    const json = JSON.stringify(s);
    if (json !== lastJson && window.ymMods && window.ymMods.reportState) { lastJson = json; window.ymMods.reportState(s); }
  };
  setInterval(tick, 700);
  tick();
})();
