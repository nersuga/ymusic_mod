// Пример JS-мода: показывает уведомление при запуске.
// Файлы с "_" в начале имени не загружаются — так можно отключать моды.
(() => {
  if (window.__ymModHello) return;
  window.__ymModHello = true;

  const TEXT = {
    ru: "Моды загружены ✓  (F12 — DevTools, F5 — перезагрузка)",
    en: "Mods loaded ✓  (F12 — DevTools, F5 — reload)",
    kk: "Модтар жүктелді ✓  (F12 — DevTools, F5 — қайта жүктеу)",
    uz: "Modlar yuklandi ✓  (F12 — DevTools, F5 — qayta yuklash)",
  };
  let lang = "";
  try { lang = JSON.parse(localStorage.getItem("funtech-lang") || "{}").value || ""; } catch {}
  lang = (lang || document.documentElement.lang || "en").slice(0, 2).toLowerCase();

  const toast = document.createElement("div");
  toast.textContent = TEXT[lang] || TEXT.en;
  Object.assign(toast.style, {
    position: "fixed", bottom: "100px", right: "24px", zIndex: 99999,
    padding: "10px 16px", borderRadius: "12px",
    background: "rgba(255, 204, 0, .95)", color: "#000",
    font: "500 14px/1.3 system-ui, sans-serif",
    boxShadow: "0 6px 24px rgba(0,0,0,.35)",
    transition: "opacity .4s", pointerEvents: "none",
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; }, 3500);
  setTimeout(() => toast.remove(), 4000);
})();
