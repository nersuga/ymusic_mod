// "Mods" section on the Settings page. Injected by the mod (modloader/main.js), talks to main via window.ymMods.
(() => {
  if (window.__ymModsSettings || !window.ymMods) return;
  window.__ymModsSettings = true;

  // Same languages as the app itself: ru, en, kk, uz. [title, description] pairs for rows.
  const I18N = {
    ru: {
      mods: "Моды",
      groupPlayer: "Плеер",
      groupLook: "Внешний вид",
      groupPrivacy: "Приватность",
      groupBackup: "Настройки мода",
      disableUpdates: ["Отключить автообновление", "Не проверять, не скачивать и не показывать плашку новой версии"],
      trayUnloadWhenPaused: ["Выгружать интерфейс в трее", "Когда окно в трее и музыка на паузе — освобождает память"],
      trayTrimWhenPlaying: ["Сжимать память в трее", "Когда окно в трее и музыка играет — отдаёт неиспользуемую память Windows"],
      blockMetrics: ["Вырезать метрику", "Блокирует Яндекс Метрику, счётчики кликов и ошибок, телеметрию плеера. История и рекомендации не затрагиваются"],
      blockAds: ["Блокировать рекламу", "Рекламный SDK, Рекламная сеть Яндекса, AdFox и рекламные модули партнёров"],
      hideWordsCard: ["Скрыть AI-факты о треке", "Карточка с фактами под плеером на странице «Моя волна»"],
      hideConcerts: ["Скрыть «Концерты»", "Пункт в боковом меню"],
      hideNonMusic: ["Скрыть «Книги и подкасты»", "Пункт в боковом меню"],
      hidePlusPromo: ["Скрыть промо Плюса", "Значок и ссылка Плюса в профиле, рекламные баннеры подписки"],
      showVolumePercent: ["Громкость в процентах", "Показывать значение при изменении и при наведении на регулятор"],
      theme: ["Тема", "Оформление поверх стандартного"],
      themes: { default: "Стандартная", amoled: "AMOLED", glass: "Стекло", contrast: "Контраст" },
      groupPerf: "Производительность",
      vibeAnimation: ["Анимация «Моей волны»", "Главная нагрузка на видеокарту. «В фокусе» — анимация замирает, когда вы в другом окне"],
      vibeAnimModes: { on: "Вкл", focus: "В фокусе", off: "Выкл" },
      miniPlayer: ["Мини-плеер", "Маленькое окно поверх остальных: обложка, трек и кнопки. Двойной щелчок по обложке — открыть приложение"],
      miniPlayerShow: "Показать / скрыть",
      sleep: ["Таймер сна", "Поставить на паузу через время или после текущего трека. Также есть в меню трея"],
      sleepMin: (n) => `${n} мин`,
      sleepTrack: "После трека",
      sleepOff: "Выкл",
      sleepActiveMin: (n) => `Пауза через ${n} мин`,
      sleepActiveTrack: "Пауза после текущего трека",
      hotkeysEnabled: ["Глобальные горячие клавиши", "Работают, даже когда окно свёрнуто или в трее. Нажмите на сочетание, чтобы изменить; Backspace — убрать, Esc — отмена"],
      hotkeyNames: { playPause: "Пауза / воспроизведение", next: "Следующий трек", prev: "Предыдущий трек", like: "Нравится", volumeUp: "Громче", volumeDown: "Тише", miniPlayer: "Мини-плеер" },
      hotkeyPress: "Нажмите сочетание…",
      hotkeyNone: "Не задано",
      hotkeyBusy: "занято другой программой",
      hotkeyInvalid: "недопустимое сочетание",
      exportSettings: ["Экспорт настроек", "Сохранить настройки мода и файлы из папки mods в один файл"],
      importSettings: ["Импорт настроек", "Загрузить настройки из файла. Страница перезагрузится"],
      exported: (n) => `Сохранено (модов: ${n})`,
      imported: (n) => `Загружено (модов: ${n})`,
      failed: "Не удалось",
      modCss: "CSS — применяется сразу",
      modJs: "JS — применится после перезагрузки (F5)",
      openDir: ["Открыть папку модов", "%APPDATA%\\YandexMusic\\mods — сюда кладите .css и .js"],
      wheel: "Колесо «Моя волна»",
      wheelNoLoop: ["Колесо без повторов", "Каждая плитка один раз, прокрутка до первой и последней. Применяется после F5"],
      wheelShowSettingsTile: ["Плитка «Настроить Мою волну»", "Показывать в колесе кнопку настроек волны. Применяется после F5"],
      wheelFilter: ["Оставлять только выбранные плитки", "Отмеченные ниже остаются в колесе, остальные вырезаются. Применяется после F5"],
      wheelEmpty: "Откройте главную страницу — плитки колеса появятся здесь",
      artists: ["Волны по артистам", "Все плитки «My Vibe by artist»"],
      promo: "Промо",
      album: "Альбом",
      playlist: "Плейлист",
      artistTile: "Артист",
    },
    en: {
      mods: "Mods",
      groupPlayer: "Player",
      groupLook: "Appearance",
      groupPrivacy: "Privacy",
      groupBackup: "Mod settings",
      disableUpdates: ["Disable auto-update", "Don't check for, download or announce new versions"],
      trayUnloadWhenPaused: ["Unload the interface in the tray", "When the window is in the tray and music is paused, frees memory"],
      trayTrimWhenPlaying: ["Trim memory in the tray", "When the window is in the tray and music is playing, returns unused memory to Windows"],
      blockMetrics: ["Block metrics", "Blocks Yandex Metrica, click and error counters, player telemetry. History and recommendations are not affected"],
      blockAds: ["Block ads", "Ad SDK, Yandex Advertising Network, AdFox and partner ad modules"],
      hideWordsCard: ["Hide AI track facts", "The facts card under the player on the My Vibe page"],
      hideConcerts: ["Hide Concerts", "Item in the side menu"],
      hideNonMusic: ["Hide Books & Podcasts", "Item in the side menu"],
      hidePlusPromo: ["Hide Plus promo", "Plus badge and link in the profile, subscription banners"],
      showVolumePercent: ["Volume in percent", "Show the value on change and when hovering the volume control"],
      theme: ["Theme", "Styling on top of the standard look"],
      themes: { default: "Standard", amoled: "AMOLED", glass: "Glass", contrast: "Contrast" },
      groupPerf: "Performance",
      vibeAnimation: ["My Vibe animation", "The main GPU load. \"When focused\" stops it while you are in another window"],
      vibeAnimModes: { on: "On", focus: "When focused", off: "Off" },
      miniPlayer: ["Mini player", "Small always-on-top window: cover, track and buttons. Double-click the cover to open the app"],
      miniPlayerShow: "Show / hide",
      sleep: ["Sleep timer", "Pause after a while or after the current track. Also in the tray menu"],
      sleepMin: (n) => `${n} min`,
      sleepTrack: "After track",
      sleepOff: "Off",
      sleepActiveMin: (n) => `Pausing in ${n} min`,
      sleepActiveTrack: "Pausing after the current track",
      hotkeysEnabled: ["Global hotkeys", "Work even when the window is minimized or in the tray. Click a shortcut to change it; Backspace clears, Esc cancels"],
      hotkeyNames: { playPause: "Play / pause", next: "Next track", prev: "Previous track", like: "Like", volumeUp: "Volume up", volumeDown: "Volume down", miniPlayer: "Mini player" },
      hotkeyPress: "Press keys…",
      hotkeyNone: "Not set",
      hotkeyBusy: "taken by another program",
      hotkeyInvalid: "invalid shortcut",
      exportSettings: ["Export settings", "Save mod settings and the files from the mods folder into one file"],
      importSettings: ["Import settings", "Load settings from a file. The page will reload"],
      exported: (n) => `Saved (mods: ${n})`,
      imported: (n) => `Loaded (mods: ${n})`,
      failed: "Failed",
      modCss: "CSS — applied instantly",
      modJs: "JS — applied after reload (F5)",
      openDir: ["Open mods folder", "%APPDATA%\\YandexMusic\\mods — put your .css and .js files here"],
      wheel: "My Vibe wheel",
      wheelNoLoop: ["Wheel without repeats", "Each tile appears once, scrolling stops at the first and last. Applied after F5"],
      wheelShowSettingsTile: ["Customize My Vibe tile", "Show the vibe settings button in the wheel. Applied after F5"],
      wheelFilter: ["Keep only selected tiles", "Tiles checked below stay in the wheel, the rest are removed. Applied after F5"],
      wheelEmpty: "Open the home page — the wheel tiles will appear here",
      artists: ["Artist vibes", "All \"My Vibe by artist\" tiles"],
      promo: "Promo",
      album: "Album",
      playlist: "Playlist",
      artistTile: "Artist",
    },
    kk: {
      mods: "Модтар",
      groupPlayer: "Ойнатқыш",
      groupLook: "Сыртқы түрі",
      groupPrivacy: "Құпиялылық",
      groupBackup: "Мод баптаулары",
      disableUpdates: ["Автожаңартуды өшіру", "Жаңа нұсқаны тексермеу, жүктемеу және ол туралы хабарламаны көрсетпеу"],
      trayUnloadWhenPaused: ["Науада интерфейсті босату", "Терезе науада және музыка кідіртілгенде — жадты босатады"],
      trayTrimWhenPlaying: ["Науада жадты қысу", "Терезе науада және музыка ойнап тұрғанда — пайдаланылмайтын жадты Windows-қа қайтарады"],
      blockMetrics: ["Метриканы бұғаттау", "Яндекс Метриканы, басу мен қате есептегіштерін, ойнатқыш телеметриясын бұғаттайды. Тарих пен ұсыныстарға әсер етпейді"],
      blockAds: ["Жарнаманы бұғаттау", "Жарнама SDK, Яндекс жарнама желісі, AdFox және серіктестердің жарнама модульдері"],
      hideWordsCard: ["Трек туралы AI-фактілерді жасыру", "«Менің толқыным» бетіндегі ойнатқыш астындағы фактілер карточкасы"],
      hideConcerts: ["«Концерттерді» жасыру", "Бүйірлік мәзірдегі тармақ"],
      hideNonMusic: ["«Кітаптар мен подкасттарды» жасыру", "Бүйірлік мәзірдегі тармақ"],
      hidePlusPromo: ["Плюс промосын жасыру", "Профильдегі Плюс белгісі мен сілтемесі, жазылым баннерлері"],
      showVolumePercent: ["Дыбыс деңгейі пайызбен", "Өзгергенде және реттегішке меңзегенде мәнін көрсету"],
      theme: ["Тақырып", "Стандартты безендіру үстінен"],
      themes: { default: "Стандартты", amoled: "AMOLED", glass: "Шыны", contrast: "Контраст" },
      groupPerf: "Өнімділік",
      vibeAnimation: ["«Менің толқыным» анимациясы", "Бейнекартаға негізгі жүктеме. «Фокуста» — басқа терезеде болғанда анимация тоқтайды"],
      vibeAnimModes: { on: "Қосу", focus: "Фокуста", off: "Өшіру" },
      miniPlayer: ["Шағын ойнатқыш", "Басқалардың үстіндегі шағын терезе: мұқаба, трек және батырмалар. Қолданбаны ашу үшін мұқабаны екі рет басыңыз"],
      miniPlayerShow: "Көрсету / жасыру",
      sleep: ["Ұйқы таймері", "Біраз уақыттан кейін немесе ағымдағы тректен кейін кідірту. Науа мәзірінде де бар"],
      sleepMin: (n) => `${n} мин`,
      sleepTrack: "Тректен кейін",
      sleepOff: "Өшіру",
      sleepActiveMin: (n) => `${n} минуттан кейін кідіреді`,
      sleepActiveTrack: "Ағымдағы тректен кейін кідіреді",
      hotkeysEnabled: ["Жаһандық жылдам пернелер", "Терезе кішірейтілгенде немесе науада болғанда да жұмыс істейді. Өзгерту үшін тіркесімді басыңыз; Backspace — алып тастау, Esc — болдырмау"],
      hotkeyNames: { playPause: "Кідірту / ойнату", next: "Келесі трек", prev: "Алдыңғы трек", like: "Ұнайды", volumeUp: "Қаттырақ", volumeDown: "Ақырынырақ", miniPlayer: "Шағын ойнатқыш" },
      hotkeyPress: "Тіркесімді басыңыз…",
      hotkeyNone: "Орнатылмаған",
      hotkeyBusy: "басқа бағдарлама пайдалануда",
      hotkeyInvalid: "жарамсыз тіркесім",
      exportSettings: ["Баптауларды экспорттау", "Мод баптаулары мен mods қалтасындағы файлдарды бір файлға сақтау"],
      importSettings: ["Баптауларды импорттау", "Баптауларды файлдан жүктеу. Бет қайта жүктеледі"],
      exported: (n) => `Сақталды (модтар: ${n})`,
      imported: (n) => `Жүктелді (модтар: ${n})`,
      failed: "Сәтсіз",
      modCss: "CSS — бірден қолданылады",
      modJs: "JS — қайта жүктегеннен кейін қолданылады (F5)",
      openDir: ["Модтар қалтасын ашу", "%APPDATA%\\YandexMusic\\mods — .css және .js файлдарын осында салыңыз"],
      wheel: "«Менің толқыным» дөңгелегі",
      wheelNoLoop: ["Қайталаусыз дөңгелек", "Әр плитка бір рет, айналдыру бірінші және соңғысында тоқтайды. F5-тен кейін қолданылады"],
      wheelShowSettingsTile: ["«Менің толқынымды баптау» плиткасы", "Дөңгелекте толқын баптаулары батырмасын көрсету. F5-тен кейін қолданылады"],
      wheelFilter: ["Тек таңдалған плиткаларды қалдыру", "Төменде белгіленгендер дөңгелекте қалады, қалғандары алынып тасталады. F5-тен кейін қолданылады"],
      wheelEmpty: "Басты бетті ашыңыз — дөңгелек плиткалары осында пайда болады",
      artists: ["Әртістер бойынша толқындар", "Барлық «My Vibe by artist» плиткалары"],
      promo: "Промо",
      album: "Альбом",
      playlist: "Плейлист",
      artistTile: "Әртіс",
    },
    uz: {
      mods: "Modlar",
      groupPlayer: "Pleyer",
      groupLook: "Ko‘rinish",
      groupPrivacy: "Maxfiylik",
      groupBackup: "Mod sozlamalari",
      disableUpdates: ["Avtoyangilanishni o‘chirish", "Yangi versiyani tekshirmaslik, yuklab olmaslik va u haqida xabar ko‘rsatmaslik"],
      trayUnloadWhenPaused: ["Treyda interfeysni bo‘shatish", "Oyna treyda va musiqa pauzada bo‘lsa — xotirani bo‘shatadi"],
      trayTrimWhenPlaying: ["Treyda xotirani siqish", "Oyna treyda va musiqa ijro etilayotganda — foydalanilmayotgan xotirani Windowsga qaytaradi"],
      blockMetrics: ["Metrikani bloklash", "Yandex Metrika, bosish va xatolik hisoblagichlari, pleyer telemetriyasini bloklaydi. Tarix va tavsiyalarga ta’sir qilmaydi"],
      blockAds: ["Reklamani bloklash", "Reklama SDK, Yandex reklama tarmog‘i, AdFox va hamkorlarning reklama modullari"],
      hideWordsCard: ["Trek haqidagi AI-faktlarni yashirish", "«Mening to‘lqinim» sahifasida pleyer ostidagi faktlar kartochkasi"],
      hideConcerts: ["«Konsertlar»ni yashirish", "Yon menyudagi band"],
      hideNonMusic: ["«Kitoblar va podkastlar»ni yashirish", "Yon menyudagi band"],
      hidePlusPromo: ["Plus promosini yashirish", "Profildagi Plus belgisi va havolasi, obuna bannerlari"],
      showVolumePercent: ["Ovoz balandligi foizda", "O‘zgarganda va boshqaruvchi ustiga kursor olib kelinganda qiymatni ko‘rsatish"],
      theme: ["Mavzu", "Standart ko‘rinish ustidan bezak"],
      themes: { default: "Standart", amoled: "AMOLED", glass: "Shisha", contrast: "Kontrast" },
      groupPerf: "Unumdorlik",
      vibeAnimation: ["«Mening to‘lqinim» animatsiyasi", "Videokartaga asosiy yuklama. «Fokusda» — boshqa oynada bo‘lganingizda animatsiya to‘xtaydi"],
      vibeAnimModes: { on: "Yoqiq", focus: "Fokusda", off: "O‘chiq" },
      miniPlayer: ["Mini pleyer", "Boshqa oynalar ustidagi kichik oyna: muqova, trek va tugmalar. Ilovani ochish uchun muqovani ikki marta bosing"],
      miniPlayerShow: "Ko‘rsatish / yashirish",
      sleep: ["Uyqu taymeri", "Ma’lum vaqtdan yoki joriy trekdan keyin pauza qilish. Trey menyusida ham bor"],
      sleepMin: (n) => `${n} daq`,
      sleepTrack: "Trekdan keyin",
      sleepOff: "O‘chiq",
      sleepActiveMin: (n) => `${n} daqiqadan keyin pauza`,
      sleepActiveTrack: "Joriy trekdan keyin pauza",
      hotkeysEnabled: ["Global tezkor tugmalar", "Oyna yig‘ilgan yoki treyda bo‘lsa ham ishlaydi. O‘zgartirish uchun birikmani bosing; Backspace — olib tashlash, Esc — bekor qilish"],
      hotkeyNames: { playPause: "Pauza / ijro", next: "Keyingi trek", prev: "Oldingi trek", like: "Yoqdi", volumeUp: "Balandroq", volumeDown: "Pastroq", miniPlayer: "Mini pleyer" },
      hotkeyPress: "Tugmalarni bosing…",
      hotkeyNone: "Belgilanmagan",
      hotkeyBusy: "boshqa dastur band qilgan",
      hotkeyInvalid: "noto‘g‘ri birikma",
      exportSettings: ["Sozlamalarni eksport qilish", "Mod sozlamalari va mods papkasidagi fayllarni bitta faylga saqlash"],
      importSettings: ["Sozlamalarni import qilish", "Sozlamalarni fayldan yuklash. Sahifa qayta yuklanadi"],
      exported: (n) => `Saqlandi (modlar: ${n})`,
      imported: (n) => `Yuklandi (modlar: ${n})`,
      failed: "Muvaffaqiyatsiz",
      modCss: "CSS — darhol qo‘llanadi",
      modJs: "JS — qayta yuklangandan keyin qo‘llanadi (F5)",
      openDir: ["Modlar papkasini ochish", "%APPDATA%\\YandexMusic\\mods — .css va .js fayllarni shu yerga joylang"],
      wheel: "«Mening to‘lqinim» g‘ildiragi",
      wheelNoLoop: ["Takrorlarsiz g‘ildirak", "Har bir plitka bir marta, aylantirish birinchi va oxirgisida to‘xtaydi. F5 dan keyin qo‘llanadi"],
      wheelShowSettingsTile: ["«Mening to‘lqinimni sozlash» plitkasi", "G‘ildirakda to‘lqin sozlamalari tugmasini ko‘rsatish. F5 dan keyin qo‘llanadi"],
      wheelFilter: ["Faqat tanlangan plitkalarni qoldirish", "Quyida belgilanganlar g‘ildirakda qoladi, qolganlari olib tashlanadi. F5 dan keyin qo‘llanadi"],
      wheelEmpty: "Bosh sahifani oching — g‘ildirak plitkalari shu yerda paydo bo‘ladi",
      artists: ["Ijrochilar bo‘yicha to‘lqinlar", "Barcha «My Vibe by artist» plitkalari"],
      promo: "Promo",
      album: "Albom",
      playlist: "Pleylist",
      artistTile: "Ijrochi",
    },
  };
  const currentLang = () => {
    // The app keeps its UI language in localStorage ("funtech-lang"); <html lang> follows the OS instead
    let lang = "";
    try { lang = JSON.parse(localStorage.getItem("funtech-lang") || "{}").value || ""; } catch {}
    lang = (lang || document.documentElement.lang || navigator.language || "en").slice(0, 2).toLowerCase();
    return I18N[lang] ? lang : "en";
  };

  // Own controls (chips, hotkey fields) — styled after the app's pill buttons
  const STYLE = `
    .ymmods-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;flex-shrink:0;max-width:72%}
    .ymmods-chip{height:32px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;
      color:rgba(255,255,255,.88);font:500 13px/30px "YS Text",sans-serif;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
    .ymmods-chip:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.32)}
    .ymmods-chip[aria-pressed="true"]{background:var(--ym-controls-color-primary-default-enabled,#ff0);border-color:var(--ym-controls-color-primary-default-enabled,#ff0);color:#000;font-weight:600}
    .ymmods-key{min-width:150px;text-align:center;font-family:"YS Text",sans-serif}
    .ymmods-key[data-recording="true"]{border-color:var(--ym-controls-color-primary-default-enabled,#ff0);color:var(--ym-controls-color-primary-default-enabled,#ff0)}
    .ymmods-note{color:#ff6b5e!important}
    .ymmods-ok{color:#8fd694!important}`;
  const ensureStyle = () => {
    if (document.getElementById("ymmods-settings-style")) return;
    const s = document.createElement("style");
    s.id = "ymmods-settings-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  };

  // Learn the on/off classes of the native switch from switches already on the page
  const switchClasses = () => {
    const all = [...document.querySelectorAll('[data-test-id="SETTINGS_LIST"] button[role="switch"]')];
    const on = all.find((b) => b.getAttribute("aria-checked") === "true");
    const off = all.find((b) => b.getAttribute("aria-checked") === "false");
    if (!on || !off) return null;
    const diff = (a, b) => [...a.classList].filter((c) => !b.classList.contains(c));
    const knob = (b) => b.querySelector("span > div") || b;
    return {
      btnOn: diff(on, off), btnOff: diff(off, on),
      knobOn: diff(knob(on), knob(off)), knobOff: diff(knob(off), knob(on)),
    };
  };

  const setSwitch = (btn, value, cls) => {
    btn.setAttribute("aria-checked", String(value));
    const knob = btn.querySelector("span > div") || btn;
    if (cls) {
      btn.classList.remove(...cls.btnOn, ...cls.btnOff);
      btn.classList.add(...(value ? cls.btnOn : cls.btnOff));
      knob.classList.remove(...cls.knobOn, ...cls.knobOff);
      knob.classList.add(...(value ? cls.knobOn : cls.knobOff));
    } else {
      btn.style.opacity = value ? "1" : ".5";
    }
  };

  // Electron accelerator from a keydown event
  const KEY_NAMES = { " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right", "+": "Plus", Escape: "Esc" };
  const acceleratorOf = (e) => {
    if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return null;
    let key = KEY_NAMES[e.key] || e.key;
    if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
    else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
    else if (key.length === 1) key = key.toUpperCase();
    const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Super"].filter(Boolean);
    const isFn = /^F\d{1,2}$/.test(key) || /^Media/.test(key) || /^Audio/.test(key);
    if (!mods.length && !isFn) return null; // plain letters would break typing everywhere
    return [...mods, key].join("+");
  };

  const build = async (list) => {
    const toggleTpl = [...list.children].find((li) => li.querySelector('button[role="switch"]'));
    const buttonTpl = [...list.children].find((li) => li.querySelector(":scope > button") && li.querySelector("svg"));
    if (!toggleTpl) return;
    ensureStyle();
    const lang = currentLang();
    const t = I18N[lang];
    const cls = switchClasses();
    const state = await window.ymMods.getState();
    const cfg = state.config;

    const ul = list.cloneNode(false);
    ul.id = "ymmods-settings";
    ul.dataset.lang = lang;
    ul.removeAttribute("data-test-id");
    ul.style.marginTop = "32px";

    const titleSrc = document.querySelector("header h2");
    const makeHeader = (text, marginTop = 0) => {
      const li = document.createElement("li");
      li.className = toggleTpl.className;
      const h = document.createElement("h3");
      h.className = titleSrc ? titleSrc.className : "";
      h.style.cssText = `font-size:24px;margin:${marginTop}px 0 4px`;
      h.textContent = text;
      li.appendChild(h);
      return li;
    };
    // A native-looking row: title + description on the left, `control` on the right
    const makeRow = (title, desc, control) => {
      const li = toggleTpl.cloneNode(true);
      const texts = li.querySelectorAll("[class*='textContainer'] > div");
      const titleEl = texts[0];
      titleEl.textContent = title;
      let descEl = texts[1];
      if (!descEl) {
        const ref = list.querySelector("[class*='textContainer'] > div:nth-child(2)");
        descEl = ref ? ref.cloneNode(false) : document.createElement("div");
        titleEl.after(descEl);
      }
      descEl.textContent = desc || "";
      const textBox = li.querySelector("[class*='textContainer']");
      if (textBox) textBox.style.minWidth = "0";
      const btn = li.querySelector('button[role="switch"]');
      btn.removeAttribute("data-test-id");
      if (control) btn.replaceWith(control);
      li.ymDesc = descEl;
      return { li, btn: control ? null : btn };
    };
    const makeToggle = (title, desc, value, onChange) => {
      const { li, btn } = makeRow(title, desc);
      // Long descriptions must not squeeze the switch
      btn.style.flexShrink = "0";
      let current = value;
      setSwitch(btn, current, cls);
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        current = !current;
        setSwitch(btn, current, cls);
        await onChange(current);
      });
      return li;
    };
    const makeChips = (options, active, onPick) => {
      const box = document.createElement("div");
      box.className = "ymmods-chips";
      for (const [value, label] of options) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "ymmods-chip";
        chip.textContent = label;
        chip.setAttribute("aria-pressed", String(value === active));
        chip.addEventListener("click", async () => {
          box.querySelectorAll(".ymmods-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
          await onPick(value, chip);
        });
        box.appendChild(chip);
      }
      return box;
    };
    const makeAction = (title, desc, onClick) => {
      if (!buttonTpl) {
        const chip = document.createElement("button");
        chip.type = "button"; chip.className = "ymmods-chip"; chip.textContent = "›";
        const { li } = makeRow(title, desc, chip);
        chip.addEventListener("click", () => onClick(li));
        return li;
      }
      const li = buttonTpl.cloneNode(true);
      const texts = li.querySelectorAll("[class*='content'] > div");
      texts[0].textContent = title;
      if (texts[1]) texts[1].textContent = desc; else if (desc) { const d = texts[0].cloneNode(false); d.textContent = desc; d.style.opacity = ".6"; d.style.fontSize = "13px"; texts[0].after(d); }
      li.ymDesc = li.querySelectorAll("[class*='content'] > div")[1];
      li.querySelector("button").addEventListener("click", () => onClick(li));
      return li;
    };
    const setToggle = (key) => (v) => window.ymMods.setConfig({ [key]: v });
    const addToggles = (keys) => { for (const key of keys) ul.appendChild(makeToggle(...t[key], !!cfg[key], setToggle(key))); };

    // ── General ──
    ul.appendChild(makeHeader(t.mods));
    addToggles(["disableUpdates", "trayUnloadWhenPaused", "trayTrimWhenPlaying"]);

    // ── Player ──
    ul.appendChild(makeHeader(t.groupPlayer, 24));
    addToggles(["showVolumePercent"]);
    const miniButton = document.createElement("button");
    miniButton.type = "button";
    miniButton.className = "ymmods-chip";
    miniButton.textContent = t.miniPlayerShow;
    miniButton.addEventListener("click", () => window.ymMods.toggleMiniPlayer());
    ul.appendChild(makeRow(t.miniPlayer[0], t.miniPlayer[1], miniButton).li);

    const sleepDesc = (info) => (info && info.mode === "minutes" ? t.sleepActiveMin(info.minutesLeft) : info && info.mode === "track" ? t.sleepActiveTrack : t.sleep[1]);
    const sleepValue = (info) => (!info || info.mode === "off" ? "off" : info.mode === "track" ? "track" : "active");
    const sleepChips = makeChips(
      [["15", t.sleepMin(15)], ["30", t.sleepMin(30)], ["60", t.sleepMin(60)], ["track", t.sleepTrack], ["off", t.sleepOff]],
      sleepValue(state.sleep) === "track" ? "track" : sleepValue(state.sleep) === "off" ? "off" : null,
      async (value) => {
        const info = value === "off" ? await window.ymMods.setSleepTimer("off")
          : value === "track" ? await window.ymMods.setSleepTimer("track")
          : await window.ymMods.setSleepTimer("minutes", Number(value));
        sleepRow.ymDesc.textContent = sleepDesc(info);
      });
    const { li: sleepRow } = makeRow(t.sleep[0], sleepDesc(state.sleep), sleepChips);
    ul.appendChild(sleepRow);
    // keep the countdown fresh while the page is open
    const sleepTimer = setInterval(async () => {
      if (!sleepRow.isConnected) return clearInterval(sleepTimer);
      const info = await window.ymMods.getSleepTimer();
      sleepRow.ymDesc.textContent = sleepDesc(info);
      if (info && info.mode === "off") sleepChips.querySelectorAll(".ymmods-chip").forEach((c, i, all) => c.setAttribute("aria-pressed", String(i === all.length - 1)));
    }, 15000);

    ul.appendChild(makeToggle(...t.hotkeysEnabled, !!cfg.hotkeysEnabled, setToggle("hotkeysEnabled")));
    let hotkeyStatus = state.hotkeyStatus || {};
    const hotkeys = { ...cfg.hotkeys };
    const keyRows = {};
    const renderKeyStatus = () => {
      for (const [action, row] of Object.entries(keyRows)) {
        const st = hotkeyStatus[action];
        row.ymDesc.textContent = st === "busy" ? t.hotkeyBusy : st === "invalid" ? t.hotkeyInvalid : "";
        row.ymDesc.classList.toggle("ymmods-note", st === "busy" || st === "invalid");
      }
    };
    for (const action of Object.keys(t.hotkeyNames)) {
      const field = document.createElement("button");
      field.type = "button";
      field.className = "ymmods-chip ymmods-key";
      field.textContent = hotkeys[action] || t.hotkeyNone;
      field.addEventListener("click", () => {
        field.dataset.recording = "true";
        field.textContent = t.hotkeyPress;
        const onKey = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.key === "Escape") return finish(hotkeys[action]);
          if (e.key === "Backspace" || e.key === "Delete") return finish("", true);
          const acc = acceleratorOf(e);
          if (acc) finish(acc, true);
        };
        const finish = async (value, save) => {
          document.removeEventListener("keydown", onKey, true);
          field.dataset.recording = "false";
          field.textContent = value || t.hotkeyNone;
          if (!save) return;
          hotkeys[action] = value;
          const res = await window.ymMods.setConfig({ hotkeys: { [action]: value } });
          if (res && res.hotkeyStatus) { hotkeyStatus = res.hotkeyStatus; renderKeyStatus(); }
        };
        document.addEventListener("keydown", onKey, true);
      });
      const { li } = makeRow(t.hotkeyNames[action], "", field);
      keyRows[action] = li;
      ul.appendChild(li);
    }
    renderKeyStatus();

    // ── Appearance ──
    ul.appendChild(makeHeader(t.groupLook, 24));
    const themeChips = makeChips(Object.entries(t.themes), cfg.theme || "default", (value) => window.ymMods.setConfig({ theme: value }));
    ul.appendChild(makeRow(t.theme[0], t.theme[1], themeChips).li);
    addToggles(["hideWordsCard", "hideConcerts", "hideNonMusic", "hidePlusPromo"]);

    // ── Performance ──
    ul.appendChild(makeHeader(t.groupPerf, 24));
    const animChips = makeChips(Object.entries(t.vibeAnimModes), cfg.vibeAnimation || "on", (value) => window.ymMods.setConfig({ vibeAnimation: value }));
    ul.appendChild(makeRow(t.vibeAnimation[0], t.vibeAnimation[1], animChips).li);

    // ── Privacy ──
    ul.appendChild(makeHeader(t.groupPrivacy, 24));
    addToggles(["blockMetrics", "blockAds"]);

    // ── Mod files ──
    for (const mod of state.mods) {
      const kind = mod.name.endsWith(".css") ? t.modCss : t.modJs;
      ul.appendChild(makeToggle(mod.name.replace(/^_/, ""), kind, mod.enabled, async (v) => {
        const res = await window.ymMods.toggleMod(mod.name, v);
        if (res && res.name) mod.name = res.name;
      }));
    }
    ul.appendChild(makeAction(t.openDir[0], t.openDir[1], () => window.ymMods.openDir()));

    // ── Backup ──
    ul.appendChild(makeHeader(t.groupBackup, 24));
    const report = (li, text, ok) => { if (!li.ymDesc) return; li.ymDesc.textContent = text; li.ymDesc.classList.toggle("ymmods-ok", ok); li.ymDesc.classList.toggle("ymmods-note", !ok); };
    ul.appendChild(makeAction(t.exportSettings[0], t.exportSettings[1], async (li) => {
      const res = await window.ymMods.exportSettings();
      if (res && res.ok) report(li, t.exported(res.mods), true); else if (res && !res.canceled) report(li, t.failed, false);
    }));
    ul.appendChild(makeAction(t.importSettings[0], t.importSettings[1], async (li) => {
      const res = await window.ymMods.importSettings();
      if (res && res.ok) report(li, t.imported(res.mods), true); else if (res && !res.canceled) report(li, t.failed + (res.error ? ": " + res.error : ""), false);
    }));

    // ── My Vibe wheel filter ──
    ul.appendChild(makeHeader(t.wheel, 24));
    // Service entries are stored language-neutral ("@artist", "@promo"); older configs may hold Russian text
    const label = (key, item) => {
      if (key === "artist:*") return t.artists;
      const tokens = { "@promo": t.promo, "Промо": t.promo, "@album": t.album, ALBUM: t.album, "@playlist": t.playlist, PLAYLIST: t.playlist, "@artistTile": t.artistTile, WAVE: "" };
      const desc = item.desc in tokens ? tokens[item.desc] : item.desc;
      return [item.name, desc];
    };
    const known = Object.entries(cfg.wheelKnown || {})
      .map(([key, item]) => [key, label(key, item)])
      .sort(([ak, a], [bk, b]) => (ak === "artist:*" ? -1 : bk === "artist:*" ? 1 : (a[1] || "").localeCompare(b[1] || "") || a[0].localeCompare(b[0])));
    const keep = new Set(cfg.wheelKeep || []);
    const saveKeep = () => window.ymMods.setConfig({ wheelKeep: [...keep] });
    ul.appendChild(makeToggle(...t.wheelNoLoop, !!cfg.wheelNoLoop, setToggle("wheelNoLoop")));
    ul.appendChild(makeToggle(...t.wheelShowSettingsTile, cfg.wheelShowSettingsTile !== false, setToggle("wheelShowSettingsTile")));
    ul.appendChild(makeToggle(...t.wheelFilter, !!cfg.wheelFilter, async (v) => {
      if (v && !keep.size) {
        known.forEach(([key]) => keep.add(key));
        await saveKeep();
        ul.querySelectorAll("[data-wheel-key] [role=switch]").forEach((b) => setSwitch(b, true, cls));
      }
      await window.ymMods.setConfig({ wheelFilter: v });
    }));
    if (!known.length) {
      const li = document.createElement("li");
      li.className = toggleTpl.className;
      li.style.cssText = "opacity:.6;padding:8px 0";
      li.textContent = t.wheelEmpty;
      ul.appendChild(li);
    }
    for (const [key, [name, desc]] of known) {
      const li = makeToggle(name, desc ? `${desc} · ${key}` : key, keep.has(key), async (v) => {
        if (v) keep.add(key); else keep.delete(key);
        await saveKeep();
      });
      li.dataset.wheelKey = key;
      ul.appendChild(li);
    }

    // React may have re-rendered the list while we awaited getState()
    const current = document.querySelector('[data-test-id="SETTINGS_LIST"]');
    if (current && !document.getElementById("ymmods-settings")) current.after(ul);
  };

  let busy = false;
  const check = async () => {
    const list = document.querySelector('[data-test-id="SETTINGS_LIST"]');
    if (!list || busy) return;
    const existing = document.getElementById("ymmods-settings");
    // Rebuild when the app language changes
    if (existing && existing.dataset.lang === currentLang()) return;
    if (existing) existing.remove();
    busy = true;
    try { await build(list); } catch (e) { console.error("[ymmods] settings", e); }
    busy = false;
  };
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; check(); });
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(check, 1000);
  check();
})();
