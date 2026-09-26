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
      hotkeyNames: { playPause: "Пауза / воспроизведение", next: "Следующий трек", prev: "Предыдущий трек", like: "Нравится", volumeUp: "Громче", volumeDown: "Тише", miniPlayer: "Мини-плеер", shuffle: "Перемешать", repeat: "Повтор", dislike: "Не нравится" },
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
      groupModUpdate: "Обновления мода",
      modVersion: "Версия мода",
      modInstalled: (v) => `Установлена ${v}`,
      modLatest: (v) => `доступна ${v}`,
      modUpToDate: "это последняя версия",
      modChecking: "Проверяю…",
      modCheck: "Проверить",
      modUpdate: (v) => `Обновить до ${v}`,
      modDownloading: "Скачиваю и проверяю установщик…",
      modInstalling: "Устанавливаю — Яндекс Музыка перезапустится",
      modNoRelease: "На GitHub ещё нет релизов",
      modAutoUpdate: ["Обновлять автоматически", "Новая версия скачивается в фоне и ставится, когда вы закрываете приложение — музыка не прерывается"],
      miniPlayerOnTop: ["Мини-плеер поверх окон", "Также переключается булавкой в самом мини-плеере"],
      miniPlayerLarge: ["Крупный мини-плеер", "Карточка с большой обложкой и прогрессом трека вместо компактной полоски"],
      thumbarButtons: ["Кнопки в панели задач", "Назад, пауза и вперёд под превью окна при наведении на значок в панели задач"],
      showQuality: ["Качество трека", "Кодек и битрейт играющего файла в панели плеера"],
      playlistSearch: ["Поиск в «Добавить в плейлист»", "Поле поиска в меню выбора плейлиста, если плейлистов много"],
      zoom: ["Масштаб интерфейса", "Также Ctrl + = / Ctrl + − / Ctrl + 0"],
      groupStorage: "Хранилище",
      downloads: ["Скачанные треки", (n, size, dir) => `${n} файл(ов) · ${size} · ${dir}`],
      downloadsMove: "Перенести…",
      downloadsMoveHint: "Переносит скачанные треки, кеш и данные входа в другую папку (например, на другой диск)",
      downloadsReset: "Вернуть на место",
      downloadsPending: (dir) => `Перенос в «${dir}» выполнится при следующем запуске`,
      downloadsPendingReset: "Возврат в папку приложения выполнится при следующем запуске",
      downloadsCancel: "Отменить",
      downloadsNotEmpty: "Эта папка не пустая — выберите пустую",
      downloadsInside: "Нельзя переносить внутрь папки приложения",
      downloadsFailed: (e) => `Прошлый перенос не удался: ${e}`,
      relaunch: "Перезапустить сейчас",
      cache: ["Кеш", (size) => `${size} — картинки, страницы и код. Скачанные треки и вход не затрагиваются`],
      cacheClear: "Очистить",
      cacheCleared: "Кеш очищен",
      groupIntegrations: "Интеграции",
      discordRpc: ["Статус в Discord", "Показывать в профиле Discord, что вы слушаете. Discord должен быть запущен"],
      discordClientId: ["Application ID", "Создайте приложение на discord.com/developers/applications — его имя (например, «Яндекс Музыка») будет в статусе. Скопируйте Application ID со страницы General Information"],
      discordShowPaused: ["Статус на паузе", "Не убирать статус, когда музыка на паузе"],
      discordStatus: { off: "", connecting: "Подключение к Discord…", connected: "Подключено к Discord", "no-discord": "Discord не запущен — подключусь, когда он откроется", error: "Проверьте Application ID" },
      lastfmEnabled: ["Скробблинг в Last.fm", "Трек засчитывается после половины или 4 минут прослушивания"],
      lastfmApiKey: ["API key", "Создайте ключ на last.fm/api/account/create (Callback URL можно не заполнять) и вставьте API key и Shared secret"],
      lastfmApiSecret: ["Shared secret", ""],
      lastfmLogin: "Войти",
      lastfmLogout: "Выйти",
      lastfmWaiting: "Разрешите доступ в открывшемся браузере…",
      lastfmUser: (u) => `Вы вошли как ${u}`,
      lastfmNeedKeys: "Сначала вставьте API key и Shared secret",
      lastfmAccount: ["Аккаунт Last.fm", "Не выполнен вход"],
      secretSet: "сохранён",
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
      hotkeyNames: { playPause: "Play / pause", next: "Next track", prev: "Previous track", like: "Like", volumeUp: "Volume up", volumeDown: "Volume down", miniPlayer: "Mini player", shuffle: "Shuffle", repeat: "Repeat", dislike: "Dislike" },
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
      groupModUpdate: "Mod updates",
      modVersion: "Mod version",
      modInstalled: (v) => `Installed ${v}`,
      modLatest: (v) => `${v} is available`,
      modUpToDate: "this is the latest version",
      modChecking: "Checking…",
      modCheck: "Check",
      modUpdate: (v) => `Update to ${v}`,
      modDownloading: "Downloading and verifying the installer…",
      modInstalling: "Installing — Yandex Music will restart",
      modNoRelease: "No releases on GitHub yet",
      modAutoUpdate: ["Update automatically", "A new version is downloaded in the background and installed when you close the app — music is not interrupted"],
      miniPlayerOnTop: ["Mini player on top", "Also toggled by the pin in the mini player itself"],
      miniPlayerLarge: ["Large mini player", "A card with a big cover and track progress instead of the compact bar"],
      thumbarButtons: ["Taskbar buttons", "Previous, pause and next under the window preview of the taskbar icon"],
      showQuality: ["Track quality", "Codec and bitrate of the playing file in the player bar"],
      playlistSearch: ["Search in “Add to playlist”", "A search field in the playlist menu when there are many playlists"],
      zoom: ["Interface zoom", "Also Ctrl + = / Ctrl + − / Ctrl + 0"],
      groupStorage: "Storage",
      downloads: ["Downloaded tracks", (n, size, dir) => `${n} file(s) · ${size} · ${dir}`],
      downloadsMove: "Move…",
      downloadsMoveHint: "Moves downloaded tracks, caches and login data to another folder (e.g. another drive)",
      downloadsReset: "Move back",
      downloadsPending: (dir) => `The move to “${dir}” happens at the next start`,
      downloadsPendingReset: "The move back to the app folder happens at the next start",
      downloadsCancel: "Cancel",
      downloadsNotEmpty: "This folder is not empty — pick an empty one",
      downloadsInside: "Cannot move into the app's own folder",
      downloadsFailed: (e) => `The last move failed: ${e}`,
      relaunch: "Restart now",
      cache: ["Cache", (size) => `${size} — images, pages and code. Downloaded tracks and the login stay`],
      cacheClear: "Clear",
      cacheCleared: "Cache cleared",
      groupIntegrations: "Integrations",
      discordRpc: ["Discord status", "Show what you are listening to in your Discord profile. Discord must be running"],
      discordClientId: ["Application ID", "Create an application at discord.com/developers/applications — its name (e.g. “Yandex Music”) is shown in the status. Copy the Application ID from General Information"],
      discordShowPaused: ["Status while paused", "Keep the status when music is paused"],
      discordStatus: { off: "", connecting: "Connecting to Discord…", connected: "Connected to Discord", "no-discord": "Discord is not running — will connect when it opens", error: "Check the Application ID" },
      lastfmEnabled: ["Last.fm scrobbling", "A track counts after half of it or 4 minutes have played"],
      lastfmApiKey: ["API key", "Create a key at last.fm/api/account/create (Callback URL may stay empty) and paste the API key and Shared secret"],
      lastfmApiSecret: ["Shared secret", ""],
      lastfmLogin: "Sign in",
      lastfmLogout: "Sign out",
      lastfmWaiting: "Allow access in the browser that opened…",
      lastfmUser: (u) => `Signed in as ${u}`,
      lastfmNeedKeys: "Paste the API key and Shared secret first",
      lastfmAccount: ["Last.fm account", "Not signed in"],
      secretSet: "saved",
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
      hotkeyNames: { playPause: "Кідірту / ойнату", next: "Келесі трек", prev: "Алдыңғы трек", like: "Ұнайды", volumeUp: "Қаттырақ", volumeDown: "Ақырынырақ", miniPlayer: "Шағын ойнатқыш", shuffle: "Араластыру", repeat: "Қайталау", dislike: "Ұнамайды" },
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
      groupModUpdate: "Мод жаңартулары",
      modVersion: "Мод нұсқасы",
      modInstalled: (v) => `Орнатылған ${v}`,
      modLatest: (v) => `${v} қолжетімді`,
      modUpToDate: "бұл соңғы нұсқа",
      modChecking: "Тексерудемін…",
      modCheck: "Тексеру",
      modUpdate: (v) => `${v} нұсқасына жаңарту`,
      modDownloading: "Орнатқышты жүктеп, тексерудемін…",
      modInstalling: "Орнатылуда — Яндекс Музыка қайта іске қосылады",
      modNoRelease: "GitHub-та әлі шығарылымдар жоқ",
      modAutoUpdate: ["Автоматты түрде жаңарту", "Жаңа нұсқа фонда жүктеліп, қолданбаны жапқанда орнатылады — музыка үзілмейді"],
      miniPlayerOnTop: ["Шағын ойнатқыш терезелердің үстінде", "Шағын ойнатқыштағы түйреуішпен де ауыстырылады"],
      miniPlayerLarge: ["Үлкен шағын ойнатқыш", "Шағын жолақтың орнына үлкен мұқабасы мен трек барысы бар карта"],
      thumbarButtons: ["Тапсырмалар тақтасындағы түймелер", "Тапсырмалар тақтасындағы белгішенің алдын ала көрінісінде: артқа, кідірту, алға"],
      showQuality: ["Трек сапасы", "Ойнатқыш тақтасында ойнап тұрған файлдың кодегі мен битрейті"],
      playlistSearch: ["«Плейлистке қосу» ішінде іздеу", "Плейлистер көп болса, таңдау мәзірінде іздеу өрісі"],
      zoom: ["Интерфейс масштабы", "Сондай-ақ Ctrl + = / Ctrl + − / Ctrl + 0"],
      groupStorage: "Жад",
      downloads: ["Жүктелген тректер", (n, size, dir) => `${n} файл · ${size} · ${dir}`],
      downloadsMove: "Көшіру…",
      downloadsMoveHint: "Жүктелген тректерді, кэшті және кіру деректерін басқа қалтаға (мысалы, басқа дискке) көшіреді",
      downloadsReset: "Орнына қайтару",
      downloadsPending: (dir) => `«${dir}» қалтасына көшіру келесі іске қосқанда орындалады`,
      downloadsPendingReset: "Қолданба қалтасына қайтару келесі іске қосқанда орындалады",
      downloadsCancel: "Болдырмау",
      downloadsNotEmpty: "Бұл қалта бос емес — бос қалтаны таңдаңыз",
      downloadsInside: "Қолданбаның өз қалтасына көшіруге болмайды",
      downloadsFailed: (e) => `Алдыңғы көшіру сәтсіз аяқталды: ${e}`,
      relaunch: "Қазір қайта іске қосу",
      cache: ["Кэш", (size) => `${size} — суреттер, беттер және код. Жүктелген тректер мен кіру сақталады`],
      cacheClear: "Тазалау",
      cacheCleared: "Кэш тазаланды",
      groupIntegrations: "Интеграциялар",
      discordRpc: ["Discord мәртебесі", "Discord профиліңізде не тыңдап жатқаныңызды көрсету. Discord іске қосулы болуы керек"],
      discordClientId: ["Application ID", "discord.com/developers/applications сайтында қолданба жасаңыз — оның атауы (мысалы, «Яндекс Музыка») мәртебеде көрсетіледі. General Information бетінен Application ID көшіріңіз"],
      discordShowPaused: ["Кідірістегі мәртебе", "Музыка кідіртілгенде мәртебені алып тастамау"],
      discordStatus: { off: "", connecting: "Discord-қа қосылуда…", connected: "Discord-қа қосылды", "no-discord": "Discord іске қосылмаған — ашылғанда қосыламын", error: "Application ID тексеріңіз" },
      lastfmEnabled: ["Last.fm скробблингі", "Трек жартысы немесе 4 минуты тыңдалғаннан кейін есептеледі"],
      lastfmApiKey: ["API key", "last.fm/api/account/create сайтында кілт жасап (Callback URL бос қалуы мүмкін), API key мен Shared secret қойыңыз"],
      lastfmApiSecret: ["Shared secret", ""],
      lastfmLogin: "Кіру",
      lastfmLogout: "Шығу",
      lastfmWaiting: "Ашылған браузерде рұқсат беріңіз…",
      lastfmUser: (u) => `${u} ретінде кірдіңіз`,
      lastfmNeedKeys: "Алдымен API key мен Shared secret қойыңыз",
      lastfmAccount: ["Last.fm аккаунты", "Кіру орындалмаған"],
      secretSet: "сақталды",
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
      hotkeyNames: { playPause: "Pauza / ijro", next: "Keyingi trek", prev: "Oldingi trek", like: "Yoqdi", volumeUp: "Balandroq", volumeDown: "Pastroq", miniPlayer: "Mini pleyer", shuffle: "Aralashtirish", repeat: "Takrorlash", dislike: "Yoqmadi" },
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
      groupModUpdate: "Mod yangilanishlari",
      modVersion: "Mod versiyasi",
      modInstalled: (v) => `O‘rnatilgan ${v}`,
      modLatest: (v) => `${v} mavjud`,
      modUpToDate: "bu oxirgi versiya",
      modChecking: "Tekshirilmoqda…",
      modCheck: "Tekshirish",
      modUpdate: (v) => `${v} ga yangilash`,
      modDownloading: "O‘rnatuvchi yuklanmoqda va tekshirilmoqda…",
      modInstalling: "O‘rnatilmoqda — Yandex Musiqa qayta ishga tushadi",
      modNoRelease: "GitHub’da hali relizlar yo‘q",
      modAutoUpdate: ["Avtomatik yangilash", "Yangi versiya fonda yuklanadi va ilovani yopganingizda o‘rnatiladi — musiqa to‘xtamaydi"],
      miniPlayerOnTop: ["Mini pleyer oynalar ustida", "Mini pleyerdagi to‘g‘nog‘ich bilan ham almashtiriladi"],
      miniPlayerLarge: ["Katta mini pleyer", "Ixcham chiziq o‘rniga katta muqova va trek jarayoni bilan karta"],
      thumbarButtons: ["Vazifalar panelidagi tugmalar", "Vazifalar panelidagi belgi oldindan ko‘rinishi ostida: orqaga, pauza, oldinga"],
      showQuality: ["Trek sifati", "Pleyer panelida ijro etilayotgan faylning kodeki va bitreyti"],
      playlistSearch: ["«Pleylistga qo‘shish»da qidiruv", "Pleylistlar ko‘p bo‘lsa, tanlash menyusida qidiruv maydoni"],
      zoom: ["Interfeys masshtabi", "Shuningdek Ctrl + = / Ctrl + − / Ctrl + 0"],
      groupStorage: "Xotira",
      downloads: ["Yuklab olingan treklar", (n, size, dir) => `${n} ta fayl · ${size} · ${dir}`],
      downloadsMove: "Ko‘chirish…",
      downloadsMoveHint: "Yuklab olingan treklar, kesh va kirish maʼlumotlarini boshqa papkaga (masalan, boshqa diskka) ko‘chiradi",
      downloadsReset: "Joyiga qaytarish",
      downloadsPending: (dir) => `«${dir}» ga ko‘chirish keyingi ishga tushirishda bajariladi`,
      downloadsPendingReset: "Ilova papkasiga qaytarish keyingi ishga tushirishda bajariladi",
      downloadsCancel: "Bekor qilish",
      downloadsNotEmpty: "Bu papka bo‘sh emas — bo‘sh papkani tanlang",
      downloadsInside: "Ilovaning o‘z papkasiga ko‘chirib bo‘lmaydi",
      downloadsFailed: (e) => `Oldingi ko‘chirish amalga oshmadi: ${e}`,
      relaunch: "Hozir qayta ishga tushirish",
      cache: ["Kesh", (size) => `${size} — rasmlar, sahifalar va kod. Yuklab olingan treklar va kirish saqlanadi`],
      cacheClear: "Tozalash",
      cacheCleared: "Kesh tozalandi",
      groupIntegrations: "Integratsiyalar",
      discordRpc: ["Discord holati", "Discord profilingizda nima tinglayotganingizni ko‘rsatish. Discord ishga tushirilgan bo‘lishi kerak"],
      discordClientId: ["Application ID", "discord.com/developers/applications saytida ilova yarating — uning nomi (masalan, «Yandex Musiqa») holatda ko‘rinadi. General Information sahifasidan Application ID ni nusxalang"],
      discordShowPaused: ["Pauzadagi holat", "Musiqa pauzada bo‘lganda holatni olib tashlamaslik"],
      discordStatus: { off: "", connecting: "Discord ga ulanmoqda…", connected: "Discord ga ulandi", "no-discord": "Discord ishga tushirilmagan — ochilganda ulanaman", error: "Application ID ni tekshiring" },
      lastfmEnabled: ["Last.fm skrobbling", "Trek yarmi yoki 4 daqiqasi tinglangandan keyin hisoblanadi"],
      lastfmApiKey: ["API key", "last.fm/api/account/create saytida kalit yarating (Callback URL bo‘sh qolishi mumkin) va API key hamda Shared secret ni qo‘ying"],
      lastfmApiSecret: ["Shared secret", ""],
      lastfmLogin: "Kirish",
      lastfmLogout: "Chiqish",
      lastfmWaiting: "Ochilgan brauzerda ruxsat bering…",
      lastfmUser: (u) => `${u} sifatida kirdingiz`,
      lastfmNeedKeys: "Avval API key va Shared secret ni qo‘ying",
      lastfmAccount: ["Last.fm hisobi", "Kirilmagan"],
      secretSet: "saqlangan",
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
    .ymmods-input{width:260px;max-width:100%;height:36px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);
      color:#fff;font:500 13px/34px "YS Text",sans-serif;outline:none;flex-shrink:0;box-sizing:border-box;transition:border-color .15s}
    .ymmods-input:focus{border-color:var(--ym-controls-color-primary-default-enabled,#ff0)}
    .ymmods-input::placeholder{color:rgba(255,255,255,.4)}
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
    // Text field saved on change (Enter or leaving the field). Secrets are never sent back to the page:
    // an empty field with the "saved" placeholder keeps the stored value
    const makeInput = (value, placeholder, onSave, secret) => {
      const input = document.createElement("input");
      input.className = "ymmods-input";
      input.type = secret ? "password" : "text";
      input.spellcheck = false;
      input.autocomplete = "off";
      input.value = secret ? "" : value || "";
      input.placeholder = secret && value ? t.secretSet : placeholder || "";
      let saved = input.value;
      const save = async () => {
        const v = input.value.trim();
        if (v === saved || (secret && !v)) return;
        saved = v;
        await onSave(v);
        if (secret) { input.value = ""; input.placeholder = v ? t.secretSet : placeholder || ""; saved = ""; }
      };
      input.addEventListener("change", save);
      input.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") input.blur(); });
      return input;
    };
    const formatSize = (bytes) => {
      const units = lang === "ru" || lang === "kk" ? ["Б", "КБ", "МБ", "ГБ"] : lang === "uz" ? ["B", "KB", "MB", "GB"] : ["B", "KB", "MB", "GB"];
      let i = 0, v = bytes || 0;
      while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
      return (i ? v.toFixed(v < 10 ? 1 : 0) : v) + " " + units[i];
    };
    const chipButton = (label, onClick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ymmods-chip";
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    };
    const chipGroup = (...buttons) => {
      const box = document.createElement("div");
      box.className = "ymmods-chips";
      buttons.filter(Boolean).forEach((b) => box.appendChild(b));
      return box;
    };
    const note = (row, textValue, bad) => { row.ymDesc.textContent = textValue; row.ymDesc.classList.toggle("ymmods-note", !!bad); row.ymDesc.classList.remove("ymmods-ok"); };
    const setToggle = (key) => (v) => window.ymMods.setConfig({ [key]: v });
    const addToggles = (keys) => { for (const key of keys) ul.appendChild(makeToggle(...t[key], !!cfg[key], setToggle(key))); };

    // ── General ──
    ul.appendChild(makeHeader(t.mods));
    addToggles(["disableUpdates", "trayUnloadWhenPaused", "trayTrimWhenPlaying"]);

    // ── Mod updates (GitHub releases) ──
    ul.appendChild(makeHeader(t.groupModUpdate, 24));
    const updateBox = chipGroup();
    const { li: updateRow } = makeRow(t.modVersion, t.modChecking, updateBox);
    ul.appendChild(updateRow);
    const renderUpdate = (st, busyText) => {
      updateBox.textContent = "";
      if (!st) return;
      let desc = t.modInstalled(st.installed === "0.0.0" ? "—" : st.installed);
      let bad = false;
      if (busyText) desc = busyText;
      else if (st.error && /no releases/.test(st.error)) desc += " · " + t.modNoRelease;
      else if (st.error) { desc += " · " + t.failed + ": " + st.error; bad = true; }
      else if (st.available) desc += " · " + t.modLatest(st.latest);
      else if (st.latest) desc += " · " + t.modUpToDate;
      note(updateRow, desc, bad);
      if (st.available && !st.error) updateRow.ymDesc.classList.add("ymmods-ok");
      if (busyText) return;
      updateBox.append(chipButton(t.modCheck, async () => { renderUpdate(st, t.modChecking); renderUpdate(await window.ymMods.modUpdate("check")); }));
      if (st.available) {
        const b = chipButton(t.modUpdate(st.latest), async () => {
          renderUpdate(st, t.modDownloading);
          const res = await window.ymMods.modUpdate("install");
          renderUpdate(res, res && res.installing ? t.modInstalling : null);
        });
        b.setAttribute("aria-pressed", "true"); // highlighted like a selected chip
        updateBox.append(b);
      }
    };
    window.ymMods.modUpdate("status").then((st) => (st && !st.checkedAt ? window.ymMods.modUpdate("check") : st)).then((st) => renderUpdate(st));
    ul.appendChild(makeToggle(...t.modAutoUpdate, !!cfg.modAutoUpdate, setToggle("modAutoUpdate")));

    // ── Player ──
    ul.appendChild(makeHeader(t.groupPlayer, 24));
    addToggles(["showVolumePercent"]);
    const miniButton = document.createElement("button");
    miniButton.type = "button";
    miniButton.className = "ymmods-chip";
    miniButton.textContent = t.miniPlayerShow;
    miniButton.addEventListener("click", () => window.ymMods.toggleMiniPlayer());
    ul.appendChild(makeRow(t.miniPlayer[0], t.miniPlayer[1], miniButton).li);
    addToggles(["miniPlayerOnTop", "miniPlayerLarge", "thumbarButtons", "showQuality", "playlistSearch"]);

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
    const zoomValues = [0.9, 1, 1.1, 1.25, 1.5];
    const zoomNow = zoomValues.find((z) => Math.abs(z - (cfg.zoomFactor || 1)) < 0.001);
    const zoomChips = makeChips(zoomValues.map((z) => [String(z), Math.round(z * 100) + "%"]), zoomNow ? String(zoomNow) : null,
      (value) => window.ymMods.setConfig({ zoomFactor: Number(value) }));
    ul.appendChild(makeRow(t.zoom[0], t.zoom[1], zoomChips).li);
    addToggles(["hideWordsCard", "hideConcerts", "hideNonMusic", "hidePlusPromo"]);

    // ── Performance ──
    ul.appendChild(makeHeader(t.groupPerf, 24));
    const animChips = makeChips(Object.entries(t.vibeAnimModes), cfg.vibeAnimation || "on", (value) => window.ymMods.setConfig({ vibeAnimation: value }));
    ul.appendChild(makeRow(t.vibeAnimation[0], t.vibeAnimation[1], animChips).li);

    // ── Storage ──
    ul.appendChild(makeHeader(t.groupStorage, 24));
    const downloadsBox = chipGroup();
    const { li: downloadsRow } = makeRow(t.downloads[0], "…", downloadsBox);
    ul.appendChild(downloadsRow);
    const cacheBox = chipGroup();
    const { li: cacheRow } = makeRow(t.cache[0], "…", cacheBox);
    ul.appendChild(cacheRow);
    const renderStorage = async () => {
      const info = await window.ymMods.storageInfo();
      if (!info) return;
      downloadsBox.textContent = "";
      cacheBox.textContent = "";
      let desc = t.downloads[1](info.downloadsFiles, formatSize(info.downloadsBytes), info.downloadsDir);
      let bad = false;
      if (info.pending) {
        desc = info.pending.target ? t.downloadsPending(info.pending.target) : t.downloadsPendingReset;
        downloadsBox.append(chipButton(t.relaunch, () => window.ymMods.relaunch()), chipButton(t.downloadsCancel, async () => { await window.ymMods.cancelDownloadsMove(); renderStorage(); }));
      } else {
        if (info.lastMove && !info.lastMove.ok && Date.now() - info.lastMove.at < 86400000) { desc = t.downloadsFailed(info.lastMove.error); bad = true; }
        const moveButton = chipButton(t.downloadsMove, async () => {
          const res = await window.ymMods.moveDownloads(false);
          if (res && res.error) note(downloadsRow, res.error === "not-empty" ? t.downloadsNotEmpty : t.downloadsInside, true);
          else if (res && res.scheduled) renderStorage();
        });
        moveButton.title = t.downloadsMoveHint;
        downloadsBox.append(moveButton);
        if (info.downloadsCustom) downloadsBox.append(chipButton(t.downloadsReset, async () => { await window.ymMods.moveDownloads(true); renderStorage(); }));
      }
      note(downloadsRow, desc, bad);
      note(cacheRow, t.cache[1](formatSize(info.cacheBytes)));
      cacheBox.append(chipButton(t.cacheClear, async () => {
        await window.ymMods.clearCache();
        await renderStorage();
        cacheRow.ymDesc.textContent = t.cacheCleared + " · " + cacheRow.ymDesc.textContent;
        cacheRow.ymDesc.classList.add("ymmods-ok");
      }));
    };
    renderStorage();

    // ── Integrations ──
    ul.appendChild(makeHeader(t.groupIntegrations, 24));
    const discordToggle = makeToggle(...t.discordRpc, !!cfg.discordRpc, async (v) => { const r = await window.ymMods.setConfig({ discordRpc: v }); showDiscord(r && r.discord); });
    ul.appendChild(discordToggle);
    const showDiscord = (status) => {
      const msg = t.discordStatus[status] || "";
      discordToggle.ymDesc.textContent = msg || t.discordRpc[1];
      discordToggle.ymDesc.classList.toggle("ymmods-ok", status === "connected");
      discordToggle.ymDesc.classList.toggle("ymmods-note", status === "error");
    };
    if (cfg.discordRpc) showDiscord(state.discord);
    // the connection is made in the background: refresh the status for a while
    let discordPolls = 0;
    const discordTimer = setInterval(async () => {
      if (!discordToggle.isConnected || ++discordPolls > 40) return clearInterval(discordTimer);
      const st = await window.ymMods.getState();
      if (st && st.config.discordRpc) showDiscord(st.discord);
    }, 3000);
    ul.appendChild(makeRow(t.discordClientId[0], t.discordClientId[1],
      makeInput(cfg.discordClientId, "123456789012345678", async (v) => { const r = await window.ymMods.setConfig({ discordClientId: v }); showDiscord(r && r.discord); })).li);
    addToggles(["discordShowPaused"]);

    ul.appendChild(makeToggle(...t.lastfmEnabled, !!cfg.lastfmEnabled, setToggle("lastfmEnabled")));
    ul.appendChild(makeRow(t.lastfmApiKey[0], t.lastfmApiKey[1], makeInput(cfg.lastfmApiKey, "API key", (v) => window.ymMods.setConfig({ lastfmApiKey: v }))).li);
    ul.appendChild(makeRow(t.lastfmApiSecret[0], t.lastfmApiSecret[1], makeInput(cfg.lastfmApiSecret, "Shared secret", (v) => window.ymMods.setConfig({ lastfmApiSecret: v }), true)).li);
    const accountBox = chipGroup();
    const { li: accountRow } = makeRow(t.lastfmAccount[0], cfg.lastfmUser ? t.lastfmUser(cfg.lastfmUser) : t.lastfmAccount[1], accountBox);
    ul.appendChild(accountRow);
    const renderAccount = (user) => {
      accountBox.textContent = "";
      note(accountRow, user ? t.lastfmUser(user) : t.lastfmAccount[1]);
      if (user) accountRow.ymDesc.classList.add("ymmods-ok");
      accountBox.append(user
        ? chipButton(t.lastfmLogout, async () => { await window.ymMods.lastfmLogout(); renderAccount(""); })
        : chipButton(t.lastfmLogin, async () => {
          note(accountRow, t.lastfmWaiting);
          const res = await window.ymMods.lastfmLogin();
          if (res && res.ok) renderAccount(res.user);
          else note(accountRow, res && res.error === "no-keys" ? t.lastfmNeedKeys : t.failed + (res && res.error ? ": " + res.error : ""), true);
        }));
    };
    renderAccount(cfg.lastfmUser);

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
