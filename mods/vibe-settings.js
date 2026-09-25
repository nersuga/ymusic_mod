// Свечение для иконок в «Настроить Мою волну»: за каждой картинкой — её размытая копия.
// Стили свечения — в vibe-settings.css (класс .ym-glow).
(() => {
  if (window.__ymVibeGlow) return;
  window.__ymVibeGlow = true;

  const SELECTOR = '[class*="VibeSettingsModal_content"] img[class*="RestrictionButton_diversityButtonImage"],' +
    '[class*="VibeSettingsModal_content"] img[class*="RestrictionButton_moodEnergyButtonImage"]';

  const sync = () => {
    for (const img of document.querySelectorAll(SELECTOR)) {
      if (img.classList.contains("ym-glow")) continue;
      let glow = img.previousElementSibling;
      if (!glow || !glow.classList.contains("ym-glow")) {
        glow = document.createElement("img");
        glow.className = "ym-glow";
        glow.alt = "";
        glow.setAttribute("aria-hidden", "true");
        img.before(glow);
      }
      if (glow.src !== img.currentSrc && img.currentSrc) glow.src = img.currentSrc || img.src;
      // Копия ложится ровно под оригинал
      Object.assign(glow.style, {
        left: img.offsetLeft + "px",
        top: img.offsetTop + "px",
        width: img.offsetWidth + "px",
        height: img.offsetHeight + "px",
      });
    }
  };

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; sync(); });
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(sync, 1000);
  sync();
})();
