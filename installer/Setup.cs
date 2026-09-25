// Setup.exe: окно установщика модов в стиле Яндекс Музыки. Вся логика - во встроенном installer.ps1
// (статус, установка, удаление); окно запускает его и показывает прогресс.
//   Setup.exe                          - окно
//   Setup.exe -Action install -Silent  - без окна (аргументы уходят в installer.ps1), код выхода 0/1
// Шрифты YS Text / YS Music и иконка берутся из установленной Яндекс Музыки (в exe их нет),
// без неё окно рисуется шрифтом Segoe UI.
// Компилируется csc.exe из .NET Framework 4 (C# 5).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: AssemblyTitle("Yandex Music Mods Setup")]
[assembly: AssemblyProduct("Yandex Music Mods")]
[assembly: AssemblyDescription("Installer for Yandex Music desktop mods")]
[assembly: AssemblyCompany("ymmods")]
[assembly: AssemblyCopyright("ymmods")]
[assembly: AssemblyVersion("__VERSION4__")]
[assembly: AssemblyFileVersion("__VERSION4__")]
[assembly: AssemblyInformationalVersion("__VERSION__")]

static class Program
{
    public const string Version = "__VERSION__";
    public static string WorkDir;
    public static bool Ru;
    public static string AppDirArg = "";
    public static bool NoLaunch;          // -NoLaunch: не запускать Яндекс Музыку после установки // -AppDir <папка>: другая копия Яндекс Музыки (для проверки)

    public static string L(string ru, string en) { return Ru ? ru : en; }

    [STAThread]
    static int Main(string[] args)
    {
        string lang = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
        Ru = lang == "ru" || lang == "kk" || lang == "uz" || lang == "be" || lang == "uk";

        // Запуск из «Установленных приложений» идёт из папки мода, которую удаление сотрёт:
        // работаем из временной копии
        string modHome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"YandexMusic\modloader");
        string self = Application.ExecutablePath;
        if (string.Equals(Path.GetDirectoryName(self).TrimEnd('\\'), modHome.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
        {
            string copy = Path.Combine(Path.GetTempPath(), "ymmods-setup-" + Guid.NewGuid().ToString("N") + ".exe");
            File.Copy(self, copy);
            Process.Start(new ProcessStartInfo(copy, JoinArgs(args)) { UseShellExecute = false });
            return 0;
        }

        WorkDir = Path.Combine(Path.GetTempPath(), "ymmods-setup-" + Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(WorkDir);
            Extract("installer.ps1");
            Extract("payload.zip");

            bool silent = false;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].Equals("-Silent", StringComparison.OrdinalIgnoreCase)) silent = true;
                if (args[i].Equals("-NoLaunch", StringComparison.OrdinalIgnoreCase)) NoLaunch = true;
                if (args[i].Equals("-AppDir", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) AppDirArg = args[i + 1];
            }
            if (silent)
            {
                Process p = StartInstaller(JoinArgs(args), false);
                p.WaitForExit();
                return p.ExitCode;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
            return 0;
        }
        catch (Exception e)
        {
            MessageBox.Show(L("Не удалось запустить установщик:\n\n", "Setup failed:\n\n") + e.Message,
                "Yandex Music Mods", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        finally
        {
            try { Directory.Delete(WorkDir, true); } catch { }
            if (self.StartsWith(Path.GetTempPath(), StringComparison.OrdinalIgnoreCase) && Path.GetFileName(self).StartsWith("ymmods-setup-"))
            {
                // Временная копия exe: удаляем её после выхода
                try
                {
                    Process.Start(new ProcessStartInfo("cmd.exe", "/c ping -n 3 127.0.0.1 >nul & del \"" + self + "\"")
                    { CreateNoWindow = true, UseShellExecute = false });
                }
                catch { }
            }
        }
    }

    static void Extract(string name)
    {
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (FileStream f = File.Create(Path.Combine(WorkDir, name)))
        {
            if (s == null) throw new Exception("missing resource " + name);
            s.CopyTo(f);
        }
    }

    public static Process StartInstaller(string args, bool redirect)
    {
        string ps = Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe");
        string cmd = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + Path.Combine(WorkDir, "installer.ps1") + "\" " + args;
        var psi = new ProcessStartInfo(ps, cmd) { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = WorkDir };
        if (redirect)
        {
            psi.RedirectStandardOutput = true;
            psi.StandardOutputEncoding = new UTF8Encoding(false);
        }
        return Process.Start(psi);
    }

    public static string Quote(string a)
    {
        if (a.Length > 0 && a.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return a;
        return "\"" + a.Replace("\"", "\\\"") + "\"";
    }

    static string JoinArgs(string[] args)
    {
        var sb = new StringBuilder();
        foreach (string a in args) sb.Append(' ').Append(Quote(a));
        return sb.ToString().Trim();
    }
}

// ── Ресурсы установленной Яндекс Музыки: шрифты и иконка из app.asar ────────
static class AppAssets
{
    public static FontFamily Headline, Text, TextMedium, TextBold;
    public static Image Logo;
    static readonly List<PrivateFontCollection> collections = new List<PrivateFontCollection>();

    public static void Load(string appDir)
    {
        try
        {
            string asar = Path.Combine(appDir, @"resources\app.asar");
            if (!File.Exists(asar)) return;
            using (FileStream fs = new FileStream(asar, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
            {
                byte[] head = ReadExact(fs, 16);
                int headerSize = BitConverter.ToInt32(head, 4);
                int jsonLen = BitConverter.ToInt32(head, 12);
                string json = Encoding.UTF8.GetString(ReadExact(fs, jsonLen));
                long dataOffset = 8 + headerSize;
                var ser = new JavaScriptSerializer { MaxJsonLength = int.MaxValue, RecursionLimit = 1000 };
                var root = (Dictionary<string, object>)ser.DeserializeObject(json);
                Headline = LoadFont(fs, root, dataOffset, "app/fonts/YSMusic-HeadlineBold.woff");
                Text = LoadFont(fs, root, dataOffset, "app/fonts/YSText-Regular.woff");
                TextMedium = LoadFont(fs, root, dataOffset, "app/fonts/YSText-Medium.woff");
                TextBold = LoadFont(fs, root, dataOffset, "app/fonts/YSText-Bold.woff");
                byte[] png = ReadEntry(fs, root, dataOffset, "app/apple-touch-icon.png");
                if (png != null) Logo = Image.FromStream(new MemoryStream(png));
            }
        }
        catch { }
    }

    static byte[] ReadExact(Stream s, int n)
    {
        byte[] b = new byte[n];
        int got = 0;
        while (got < n) { int r = s.Read(b, got, n - got); if (r <= 0) throw new EndOfStreamException(); got += r; }
        return b;
    }

    static byte[] ReadEntry(FileStream fs, Dictionary<string, object> root, long dataOffset, string rel)
    {
        object node = root;
        foreach (string part in rel.Split('/'))
        {
            var dict = node as Dictionary<string, object>;
            object files;
            if (dict == null || !dict.TryGetValue("files", out files)) return null;
            var fd = files as Dictionary<string, object>;
            if (fd == null || !fd.TryGetValue(part, out node)) return null;
        }
        var entry = (Dictionary<string, object>)node;
        if (entry.ContainsKey("unpacked")) return null;
        long offset = long.Parse(Convert.ToString(entry["offset"]));
        int size = Convert.ToInt32(entry["size"]);
        fs.Seek(dataOffset + offset, SeekOrigin.Begin);
        return ReadExact(fs, size);
    }

    static FontFamily LoadFont(FileStream fs, Dictionary<string, object> root, long dataOffset, string rel)
    {
        try
        {
            byte[] woff = ReadEntry(fs, root, dataOffset, rel);
            byte[] ttf = woff == null ? null : WoffToSfnt(woff);
            if (ttf == null) return null;
            // GDI+ читает шрифт из этой памяти всё время жизни процесса: не освобождаем
            IntPtr mem = Marshal.AllocCoTaskMem(ttf.Length);
            Marshal.Copy(ttf, 0, mem, ttf.Length);
            var pfc = new PrivateFontCollection();
            pfc.AddMemoryFont(mem, ttf.Length);
            collections.Add(pfc);
            return pfc.Families.Length > 0 ? pfc.Families[0] : null;
        }
        catch { return null; }
    }

    static uint BE32(byte[] b, int o) { return (uint)(b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]); }
    static int BE16(byte[] b, int o) { return b[o] << 8 | b[o + 1]; }
    static void PutBE32(byte[] b, int o, uint v) { b[o] = (byte)(v >> 24); b[o + 1] = (byte)(v >> 16); b[o + 2] = (byte)(v >> 8); b[o + 3] = (byte)v; }
    static void PutBE16(byte[] b, int o, int v) { b[o] = (byte)(v >> 8); b[o + 1] = (byte)v; }

    // WOFF 1.0 -> TTF: таблицы сжаты zlib, заголовок sfnt собираем заново
    static byte[] WoffToSfnt(byte[] w)
    {
        if (BE32(w, 0) != 0x774F4646) return null;
        uint flavor = BE32(w, 4);
        if (flavor != 0x00010000) return null; // CFF-шрифты GDI+ не читает
        int n = BE16(w, 12);
        var tags = new uint[n]; var checks = new uint[n]; var data = new byte[n][];
        for (int i = 0; i < n; i++)
        {
            int e = 44 + i * 20;
            tags[i] = BE32(w, e);
            int off = (int)BE32(w, e + 4), comp = (int)BE32(w, e + 8), orig = (int)BE32(w, e + 12);
            checks[i] = BE32(w, e + 16);
            if (comp < orig)
            {
                var outp = new byte[orig];
                using (var ds = new DeflateStream(new MemoryStream(w, off + 2, comp - 2), CompressionMode.Decompress))
                {
                    int got = 0;
                    while (got < orig) { int r = ds.Read(outp, got, orig - got); if (r <= 0) break; got += r; }
                }
                data[i] = outp;
            }
            else
            {
                data[i] = new byte[orig];
                Buffer.BlockCopy(w, off, data[i], 0, orig);
            }
        }
        int total = 12 + 16 * n;
        foreach (byte[] d in data) total += (d.Length + 3) & ~3;
        var t = new byte[total];
        int es = 0; while ((2 << es) <= n) es++;
        int sr = (1 << es) * 16;
        PutBE32(t, 0, flavor); PutBE16(t, 4, n); PutBE16(t, 6, sr); PutBE16(t, 8, es); PutBE16(t, 10, n * 16 - sr);
        int pos = 12 + 16 * n;
        for (int i = 0; i < n; i++)
        {
            int r = 12 + 16 * i;
            PutBE32(t, r, tags[i]); PutBE32(t, r + 4, checks[i]); PutBE32(t, r + 8, (uint)pos); PutBE32(t, r + 12, (uint)data[i].Length);
            Buffer.BlockCopy(data[i], 0, t, pos, data[i].Length);
            pos += (data[i].Length + 3) & ~3;
        }
        return t;
    }
}

// ── Окно ──────────────────────────────────────────────────────────────────
class SetupForm : Form
{
    const int W = 600, H = 720, HeroH = 212;
    static readonly Color Bg = Color.FromArgb(14, 14, 14);
    static readonly Color Fg = Color.FromArgb(245, 245, 245);
    static readonly Color Muted = Color.FromArgb(150, 150, 150);
    static readonly Color Accent = Color.FromArgb(255, 219, 77);
    static readonly Color Good = Color.FromArgb(61, 214, 140);
    static readonly Color Warn = Color.FromArgb(255, 164, 61);
    static readonly Color Bad = Color.FromArgb(255, 94, 87);

    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, IntPtr l);

    float k = 1f;
    Font fHead, fTitle, fText, fMedium, fSmall, fButton, fChip;
    readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
    readonly Stopwatch clock = Stopwatch.StartNew();
    Bitmap heroBuf;

    // Состояние
    bool statusLoaded, found, patched, modFiles;
    string appDir = "", appVersion = "", modVersion = "";
    bool busy, removeSettings, done, lastOk;
    string action = "";
    DateTime confirmUntil = DateTime.MinValue;
    string hover = "", pressed = "";
    class LogLine { public string Text; public Color Color; }
    readonly List<LogLine> log = new List<LogLine>();

    // Области (логические координаты)
    static readonly RectangleF RClose = new RectangleF(W - 52, 10, 40, 32);
    static readonly RectangleF RMin = new RectangleF(W - 96, 10, 40, 32);
    static readonly RectangleF RToggle = new RectangleF(24, 478, 300, 28);
    static readonly RectangleF RPrimary = new RectangleF(24, 522, 330, 52);
    static readonly RectangleF RSecondary = new RectangleF(366, 522, W - 366 - 24, 52);
    static readonly RectangleF RLog = new RectangleF(24, 594, W - 48, H - 594 - 24);

    readonly string[] features = Program.Ru
        ? new[] { "Мини-плеер", "Горячие клавиши", "Таймер сна", "Громкость в %", "Темы: AMOLED и стекло",
                  "Фильтр «Моей волны»", "Без рекламы и метрики", "Без автообновлений", "Выгрузка в трее", "Экспорт настроек" }
        : new[] { "Mini player", "Global hotkeys", "Sleep timer", "Volume in %", "AMOLED & glass themes",
                  "My Vibe filter", "No ads or metrics", "No auto-updates", "Tray unloading", "Settings export" };

    public SetupForm()
    {
        string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\YandexMusic");
        AppAssets.Load(Program.AppDirArg != "" ? Program.AppDirArg : defaultDir);

        using (Graphics g = CreateGraphics()) k = g.DpiX / 96f;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size((int)(W * k), (int)(H * k));
        BackColor = Bg;
        Text = Program.L("Моды для Яндекс Музыки", "Yandex Music Mods");
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        KeyPreview = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.ResizeRedraw, true);

        fHead = MakeFont(AppAssets.Headline, "Segoe UI", 44, FontStyle.Bold);
        fTitle = MakeFont(AppAssets.TextMedium, "Segoe UI Semibold", 16, FontStyle.Regular);
        fText = MakeFont(AppAssets.Text, "Segoe UI", 14, FontStyle.Regular);
        fMedium = MakeFont(AppAssets.TextMedium, "Segoe UI Semibold", 14, FontStyle.Regular);
        fSmall = MakeFont(AppAssets.Text, "Segoe UI", 12.5f, FontStyle.Regular);
        fButton = MakeFont(AppAssets.TextBold, "Segoe UI", 16, FontStyle.Bold);
        fChip = MakeFont(AppAssets.TextMedium, "Segoe UI Semibold", 13, FontStyle.Regular);

        timer.Interval = 33;
        timer.Tick += delegate
        {
            if (WindowState == FormWindowState.Minimized) return;
            Invalidate(Rect(new RectangleF(0, 0, W, HeroH)));
            if (busy) Invalidate(Rect(RPrimary));
            if (confirmUntil != DateTime.MinValue && DateTime.Now > confirmUntil) { confirmUntil = DateTime.MinValue; Invalidate(); }
        };
        timer.Start();
        RefreshStatus();
    }

    static Font MakeFont(FontFamily fam, string fallback, float px, FontStyle fallbackStyle)
    {
        if (fam != null)
        {
            foreach (FontStyle st in new[] { FontStyle.Regular, FontStyle.Bold, FontStyle.Italic, FontStyle.Bold | FontStyle.Italic })
                if (fam.IsStyleAvailable(st)) return new Font(fam, px, st, GraphicsUnit.Pixel);
        }
        return new Font(fallback, px, fallbackStyle, GraphicsUnit.Pixel);
    }

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams cp = base.CreateParams;
            cp.Style |= 0x20000;        // WS_MINIMIZEBOX: сворачивание и восстановление с панели задач
            cp.ClassStyle |= 0x20000;   // CS_DROPSHADOW
            return cp;
        }
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        try
        {
            int round = 2; DwmSetWindowAttribute(Handle, 33, ref round, 4);   // скруглённые углы Windows 11
            int dark = 1; DwmSetWindowAttribute(Handle, 20, ref dark, 4);
        }
        catch { }
    }

    Rectangle Rect(RectangleF r)
    {
        return Rectangle.FromLTRB((int)Math.Floor(r.Left * k) - 2, (int)Math.Floor(r.Top * k) - 2, (int)Math.Ceiling(r.Right * k) + 2, (int)Math.Ceiling(r.Bottom * k) + 2);
    }

    // ── Статус и действия (installer.ps1) ──
    void RefreshStatus()
    {
        var t = new Thread(delegate ()
        {
            string json = "";
            try
            {
                Process p = Program.StartInstaller("-Action status" + (Program.AppDirArg != "" ? " -AppDir " + Program.Quote(Program.AppDirArg) : ""), true);
                json = p.StandardOutput.ReadToEnd();
                p.WaitForExit();
            }
            catch { }
            BeginInvoke((MethodInvoker)delegate { ApplyStatus(json); });
        });
        t.IsBackground = true;
        t.Start();
    }

    void ApplyStatus(string json)
    {
        try
        {
            var s = (Dictionary<string, object>)new JavaScriptSerializer().DeserializeObject(json.Trim());
            found = (bool)s["found"];
            appDir = Convert.ToString(s["dir"]);
            appVersion = Convert.ToString(s["appVersion"]);
            if (appVersion.Split('.').Length == 4 && appVersion.EndsWith(".0")) appVersion = appVersion.Substring(0, appVersion.Length - 2);
            patched = (bool)s["patched"];
            modFiles = (bool)s["modFiles"];
            modVersion = Convert.ToString(s["modVersion"]);
        }
        catch { found = false; }
        if (found && AppAssets.Logo == null) AppAssets.Load(appDir);
        statusLoaded = true;
        Invalidate();
    }

    bool Installed { get { return patched && modFiles; } }
    bool CanRemove { get { return statusLoaded && found && (patched || modFiles) && !busy && !done; } }
    bool CanInstall { get { return statusLoaded && found && !busy; } }

    void Run(string what)
    {
        busy = true; done = false; action = what;
        log.Clear();
        AddLog(what == "install"
            ? Program.L("Яндекс Музыка будет закрыта и запущена снова", "Yandex Music will be closed and restarted")
            : Program.L("Возвращаю оригинальную Яндекс Музыку", "Restoring the original Yandex Music"), Muted);
        string args = "-Action " + what + " -AppDir " + Program.Quote(appDir) + " -SetupExe " + Program.Quote(Application.ExecutablePath);
        if (what == "uninstall" && removeSettings) args += " -RemoveSettings";
        if (Program.NoLaunch) args += " -NoLaunch";
        var t = new Thread(delegate ()
        {
            int code = 1;
            try
            {
                Process p = Program.StartInstaller(args, true);
                string line;
                while ((line = p.StandardOutput.ReadLine()) != null)
                {
                    string l = line;
                    if (l.Trim().Length > 0) BeginInvoke((MethodInvoker)delegate { AddLog(l, null); });
                }
                p.WaitForExit();
                code = p.ExitCode;
            }
            catch (Exception ex) { string m = ex.Message; BeginInvoke((MethodInvoker)delegate { AddLog(m, Bad); }); }
            BeginInvoke((MethodInvoker)delegate { Finish(code == 0); });
        });
        t.IsBackground = true;
        t.Start();
        Invalidate();
    }

    void Finish(bool ok)
    {
        busy = false; lastOk = ok; done = ok;
        if (ok) AddLog(action == "install"
            ? Program.L("Готово. Настройки мода: Настройки → Моды", "Done. Mod settings: Settings → Mods")
            : Program.L("Готово. Мод удалён", "Done. The mod is removed"), Good);
        else AddLog(Program.L("Не получилось. Журнал: %APPDATA%\\YandexMusic\\modloader\\watch.log", "Failed. Log: %APPDATA%\\YandexMusic\\modloader\\watch.log"), Bad);
        RefreshStatus();
        Invalidate();
    }

    void AddLog(string text, Color? color)
    {
        Color c = Fg;
        if (color.HasValue) c = color.Value;
        else if (text.StartsWith("Ошибка") || text.StartsWith("Error") || text.StartsWith("Откат") || text.StartsWith("Rolling")) c = Bad;
        else if (text.StartsWith("Мод установлен") || text.StartsWith("Mod installed") || text.StartsWith("Оригинальное") || text.StartsWith("Original") || text.StartsWith("Файлы")) c = Good;
        log.Add(new LogLine { Text = text, Color = c });
        Invalidate(Rect(RLog));
    }

    // ── Мышь и клавиатура ──
    string HitTest(Point p)
    {
        var q = new PointF(p.X / k, p.Y / k);
        if (RClose.Contains(q)) return "close";
        if (RMin.Contains(q)) return "min";
        if (RPrimary.Contains(q)) return "primary";
        if (RSecondary.Contains(q)) return "secondary";
        if (RToggle.Contains(q)) return "toggle";
        if (q.Y < HeroH - 40) return "drag";
        return "";
    }

    bool IsOn(string id)
    {
        switch (id)
        {
            case "close": return !busy;
            case "min": return true;
            case "primary": return done || CanInstall;
            case "secondary": return CanRemove;
            case "toggle": return !busy;
        }
        return false;
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        string h = HitTest(e.Location);
        if (h == "drag") h = "";
        if (h != hover) { hover = h; Cursor = h != "" && IsOn(h) ? Cursors.Hand : Cursors.Default; Invalidate(); }
    }

    protected override void OnMouseLeave(EventArgs e) { hover = ""; Invalidate(); }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        string h = HitTest(e.Location);
        if (h == "drag") { ReleaseCapture(); SendMessage(Handle, 0xA1, (IntPtr)2, IntPtr.Zero); return; }
        pressed = h;
        Invalidate();
    }

    protected override void OnMouseUp(MouseEventArgs e)
    {
        string h = HitTest(e.Location);
        string was = pressed;
        pressed = "";
        Invalidate();
        if (h != was || h == "" || !IsOn(h)) return;
        DoClick(h);
    }

    void DoClick(string id)
    {
        switch (id)
        {
            case "close": Close(); break;
            case "min": WindowState = FormWindowState.Minimized; break;
            case "toggle": removeSettings = !removeSettings; break;
            case "primary":
                if (done) Close(); else Run("install");
                break;
            case "secondary":
                if (DateTime.Now < confirmUntil) { confirmUntil = DateTime.MinValue; Run("uninstall"); }
                else confirmUntil = DateTime.Now.AddSeconds(4);
                break;
        }
        Invalidate();
    }

    // Enter и Esc - «диалоговые» клавиши, до OnKeyDown они не доходят
    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == Keys.Escape) { if (!busy) Close(); return true; }
        if (keyData == Keys.Enter) { if (IsOn("primary")) DoClick("primary"); return true; }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (busy) e.Cancel = true;
        base.OnFormClosing(e);
    }

    // ── Рисование ──
    static GraphicsPath Round(RectangleF r, float radius)
    {
        float d = Math.Min(radius * 2, Math.Min(r.Width, r.Height));
        var p = new GraphicsPath();
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    static void Fill(Graphics g, RectangleF r, float radius, Color c)
    {
        using (var p = Round(r, radius)) using (var b = new SolidBrush(c)) g.FillPath(b, p);
    }

    static Color A(Color c, int alpha) { return Color.FromArgb(alpha, c); }

    protected override void OnPaint(PaintEventArgs e)
    {
        Graphics g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.AntiAlias;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.Clear(Bg);
        g.ScaleTransform(k, k);

        DrawHero(g);
        DrawWindowButtons(g);
        DrawAppCard(g);
        DrawFeatures(g);
        DrawToggle(g);
        DrawButtons(g);
        DrawLog(g);
    }

    // Переливающийся фон как у «Моей волны»: цветные пятна рисуются в маленький буфер и растягиваются (мягкое размытие)
    void DrawHero(Graphics g)
    {
        const int bw = 120, bh = 44;
        if (heroBuf == null) heroBuf = new Bitmap(bw, bh, PixelFormat.Format32bppPArgb);
        double t = clock.Elapsed.TotalSeconds;
        using (Graphics hg = Graphics.FromImage(heroBuf))
        {
            hg.SmoothingMode = SmoothingMode.AntiAlias;
            hg.Clear(Color.FromArgb(22, 18, 30));
            var blobs = new[]
            {
                new { c = Color.FromArgb(255, 96, 56),  x = 0.18, y = 0.30, r = 0.55, s = 0.21, p = 0.0 },
                new { c = Color.FromArgb(255, 60, 150), x = 0.45, y = 0.65, r = 0.50, s = 0.17, p = 1.7 },
                new { c = Color.FromArgb(140, 80, 255), x = 0.75, y = 0.35, r = 0.60, s = 0.13, p = 3.1 },
                new { c = Color.FromArgb(255, 200, 40), x = 0.92, y = 0.80, r = 0.40, s = 0.19, p = 4.4 },
                new { c = Color.FromArgb(50, 130, 255), x = 0.60, y = 0.05, r = 0.45, s = 0.11, p = 5.3 },
            };
            foreach (var b in blobs)
            {
                float cx = (float)((b.x + 0.12 * Math.Sin(t * b.s * 2.3 + b.p)) * bw);
                float cy = (float)((b.y + 0.25 * Math.Cos(t * b.s * 1.9 + b.p * 1.3)) * bh);
                float r = (float)(b.r * bw * (0.9 + 0.1 * Math.Sin(t * b.s * 3 + b.p)));
                using (var path = new GraphicsPath())
                {
                    path.AddEllipse(cx - r, cy - r * 0.62f, r * 2, r * 1.24f);
                    using (var br = new PathGradientBrush(path))
                    {
                        br.CenterColor = A(b.c, 190);
                        br.SurroundColors = new[] { A(b.c, 0) };
                        hg.FillPath(br, path);
                    }
                }
            }
        }
        var old = g.InterpolationMode;
        g.InterpolationMode = InterpolationMode.HighQualityBilinear;
        g.DrawImage(heroBuf, new RectangleF(-6, -6, W + 12, HeroH + 12), new RectangleF(0.5f, 0.5f, bw - 1, bh - 1), GraphicsUnit.Pixel);
        g.InterpolationMode = old;
        // Затемнение к низу, чтобы шапка перетекала в фон
        using (var fade = new LinearGradientBrush(new RectangleF(0, 0, W, HeroH + 1), A(Bg, 40), Bg, 90f))
        {
            var blend = new ColorBlend(3);
            blend.Colors = new[] { A(Bg, 30), A(Bg, 120), Bg };
            blend.Positions = new[] { 0f, 0.55f, 1f };
            fade.InterpolationColors = blend;
            g.FillRectangle(fade, 0, 0, W, HeroH + 1);
        }
        using (var b = new SolidBrush(Bg)) g.FillRectangle(b, 0, HeroH, W, 20);

        // Логотип, заголовок, версия
        var logo = new RectangleF(28, 70, 72, 72);
        if (AppAssets.Logo != null)
        {
            using (var clip = Round(logo, 18))
            {
                var st = g.Save();
                g.SetClip(clip);
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.DrawImage(AppAssets.Logo, logo);
                g.Restore(st);
            }
        }
        else
        {
            Fill(g, logo, 18, Accent);
            using (var b = new SolidBrush(Color.Black)) using (var f = new Font("Segoe UI Symbol", 34, GraphicsUnit.Pixel))
                g.DrawString("♫", f, b, logo, new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center });
        }
        using (var b = new SolidBrush(A(Fg, 190))) g.DrawString(Program.L("Яндекс Музыка", "Yandex Music"), fMedium, b, 114, 76);
        string head = Program.L("Моды", "Mods");
        using (var b = new SolidBrush(Fg)) g.DrawString(head, fHead, b, 110, 92);
        SizeF hs = g.MeasureString(head, fHead);
        string ver = "v" + Program.Version;
        SizeF vs = g.MeasureString(ver, fChip);
        var vr = new RectangleF(110 + hs.Width + 6, 112, vs.Width + 16, 26);
        Fill(g, vr, 13, A(Color.White, 34));
        using (var b = new SolidBrush(Fg)) g.DrawString(ver, fChip, b, vr.X + 8, vr.Y + (vr.Height - vs.Height) / 2);
    }

    void DrawWindowButtons(Graphics g)
    {
        foreach (string id in new[] { "min", "close" })
        {
            RectangleF r = id == "min" ? RMin : RClose;
            bool en = IsOn(id);
            if (hover == id && en) Fill(g, r, 8, A(Color.White, pressed == id ? 40 : 24));
            using (var pen = new Pen(A(Fg, en ? 230 : 90), 1.4f))
            {
                pen.StartCap = pen.EndCap = LineCap.Round;
                float cx = r.X + r.Width / 2, cy = r.Y + r.Height / 2;
                if (id == "min") g.DrawLine(pen, cx - 6, cy, cx + 6, cy);
                else { g.DrawLine(pen, cx - 5.5f, cy - 5.5f, cx + 5.5f, cy + 5.5f); g.DrawLine(pen, cx + 5.5f, cy - 5.5f, cx - 5.5f, cy + 5.5f); }
            }
        }
    }

    void DrawAppCard(Graphics g)
    {
        var r = new RectangleF(24, 176, W - 48, 80);
        Fill(g, r, 18, A(Color.White, 14));
        string title, sub, status;
        Color sc;
        if (!statusLoaded) { title = Program.L("Ищу Яндекс Музыку…", "Looking for Yandex Music…"); sub = ""; status = ""; sc = Muted; }
        else if (!found)
        {
            title = Program.L("Яндекс Музыка не найдена", "Yandex Music not found");
            sub = Program.L("Установите приложение с music.yandex.ru", "Install the app from music.yandex.ru");
            status = Program.L("Нет приложения", "No app"); sc = Bad;
        }
        else
        {
            title = Program.L("Яндекс Музыка ", "Yandex Music ") + appVersion;
            sub = appDir;
            if (Installed) { status = Program.L("Мод установлен", "Mod installed") + (modVersion != "" ? " · v" + modVersion : ""); sc = Good; }
            else if (modFiles) { status = Program.L("Нужна переустановка", "Needs reinstall"); sc = Warn; }
            else { status = Program.L("Мод не установлен", "Not installed"); sc = Muted; }
        }
        float pillW = 0;
        if (status != "")
        {
            SizeF ss = g.MeasureString(status, fChip);
            pillW = ss.Width + 34;
            var pr = new RectangleF(r.Right - 18 - pillW, r.Y + (r.Height - 30) / 2, pillW, 30);
            Fill(g, pr, 15, A(sc, 38));
            using (var b = new SolidBrush(sc)) g.FillEllipse(b, pr.X + 12, pr.Y + 11, 8, 8);
            using (var b = new SolidBrush(sc)) g.DrawString(status, fChip, b, pr.X + 25, pr.Y + (pr.Height - ss.Height) / 2);
        }
        var textW = r.Width - 40 - pillW - 12;
        var sfEll = new StringFormat(StringFormatFlags.NoWrap) { Trimming = StringTrimming.EllipsisPath };
        using (var b = new SolidBrush(Fg)) g.DrawString(title, fTitle, b, new RectangleF(r.X + 20, r.Y + (sub == "" ? 28 : 17), textW, 24), sfEll);
        if (sub != "") using (var b = new SolidBrush(Muted)) g.DrawString(sub, fSmall, b, new RectangleF(r.X + 20, r.Y + 44, textW, 20), sfEll);
    }

    void DrawFeatures(Graphics g)
    {
        using (var b = new SolidBrush(Muted)) g.DrawString(Program.L("Что внутри", "What's inside"), fMedium, b, 24, 274);
        float x = 24, y = 302;
        foreach (string f in features)
        {
            SizeF s = g.MeasureString(f, fChip);
            float w = s.Width + 26;
            if (x + w > W - 24) { x = 24; y += 42; }
            var r = new RectangleF(x, y, w, 34);
            Fill(g, r, 17, A(Color.White, 16));
            using (var b = new SolidBrush(A(Fg, 225))) g.DrawString(f, fChip, b, r.X + 13, r.Y + (r.Height - s.Height) / 2);
            x += w + 8;
        }
    }

    // Переключатель как в настройках Яндекс Музыки
    void DrawToggle(Graphics g)
    {
        bool en = IsOn("toggle");
        var sw = new RectangleF(RToggle.X, RToggle.Y + 3, 40, 22);
        Fill(g, sw, 11, removeSettings ? A(Accent, en ? 255 : 120) : A(Color.White, hover == "toggle" ? 60 : 40));
        float knobX = removeSettings ? sw.Right - 19 : sw.X + 3;
        using (var b = new SolidBrush(removeSettings ? Color.Black : A(Color.White, en ? 235 : 140))) g.FillEllipse(b, knobX, sw.Y + 3, 16, 16);
        using (var b = new SolidBrush(en ? A(Fg, 210) : Muted))
            g.DrawString(Program.L("Удалять вместе с настройками", "Remove settings too"), fText, b, sw.Right + 12, RToggle.Y + 4);
    }

    void DrawButtons(Graphics g)
    {
        // Основная кнопка
        bool en = IsOn("primary");
        string label;
        if (busy) label = action == "install" ? Program.L("Устанавливаю…", "Installing…") : Program.L("Удаляю…", "Removing…");
        else if (done) label = Program.L("Готово", "Done");
        else if (!statusLoaded) label = Program.L("Проверяю…", "Checking…");
        else if (!found) label = Program.L("Нет приложения", "No app");
        else if (Installed && modVersion == Program.Version) label = Program.L("Переустановить", "Reinstall");
        else if (Installed || modFiles) label = Program.L("Обновить мод", "Update mod");
        else label = Program.L("Установить", "Install");
        Color bg = Accent;
        if (en && hover == "primary") bg = pressed == "primary" ? Color.FromArgb(240, 200, 50) : Color.FromArgb(255, 228, 110);
        Fill(g, RPrimary, RPrimary.Height / 2, en || busy ? bg : A(Accent, 90));
        SizeF ls = g.MeasureString(label, fButton);
        float tx = RPrimary.X + (RPrimary.Width - ls.Width) / 2;
        if (busy)
        {
            tx += 14;
            float a = (float)(clock.Elapsed.TotalSeconds * 360 % 360);
            using (var pen = new Pen(Color.FromArgb(30, 30, 30), 2.6f))
            {
                pen.StartCap = pen.EndCap = LineCap.Round;
                g.DrawArc(pen, tx - 30, RPrimary.Y + RPrimary.Height / 2 - 9, 18, 18, a, 270);
            }
        }
        using (var b = new SolidBrush(Color.FromArgb(en || busy ? 255 : 150, 20, 20, 20)))
            g.DrawString(label, fButton, b, tx, RPrimary.Y + (RPrimary.Height - ls.Height) / 2);

        // Удаление: второй клик в течение 4 секунд подтверждает
        bool confirm = DateTime.Now < confirmUntil;
        bool en2 = IsOn("secondary");
        string label2 = confirm ? Program.L("Точно удалить?", "Sure?") : Program.L("Удалить", "Remove");
        Color bg2 = confirm ? Bad : A(Color.White, en2 && hover == "secondary" ? (pressed == "secondary" ? 50 : 36) : 22);
        Fill(g, RSecondary, RSecondary.Height / 2, bg2);
        SizeF ls2 = g.MeasureString(label2, fButton);
        Color fg2 = confirm ? Color.White : (en2 ? Fg : A(Fg, 80));
        using (var b = new SolidBrush(fg2))
            g.DrawString(label2, fButton, b, RSecondary.X + (RSecondary.Width - ls2.Width) / 2, RSecondary.Y + (RSecondary.Height - ls2.Height) / 2);
    }

    void DrawLog(Graphics g)
    {
        Fill(g, RLog, 16, A(Color.White, 9));
        var lines = new List<LogLine>(log);
        if (lines.Count == 0)
        {
            string hint = !statusLoaded || found
                ? Program.L("Во время установки Яндекс Музыка будет закрыта и запущена снова. Все файлы мода — в %APPDATA%\\YandexMusic, права администратора не нужны.",
                            "Yandex Music is closed and restarted during setup. The mod lives in %APPDATA%\\YandexMusic, no admin rights needed.")
                : Program.L("Сначала установите Яндекс Музыку, затем запустите установщик снова.", "Install Yandex Music first, then run this setup again.");
            using (var b = new SolidBrush(Muted)) g.DrawString(hint, fSmall, b, new RectangleF(RLog.X + 18, RLog.Y + 16, RLog.Width - 36, RLog.Height - 24));
            return;
        }
        // Последние строки снизу вверх, сколько поместится
        float bottom = RLog.Bottom - 14, textX = RLog.X + 34, textW = RLog.Width - 34 - 18;
        var st = g.Save();
        g.SetClip(new RectangleF(RLog.X, RLog.Y + 10, RLog.Width, RLog.Height - 20));
        for (int i = lines.Count - 1; i >= 0 && bottom > RLog.Y + 10; i--)
        {
            LogLine l = lines[i];
            Font f = i == lines.Count - 1 ? fMedium : fSmall;
            SizeF s = g.MeasureString(l.Text, f, (int)textW);
            float top = bottom - s.Height;
            using (var b = new SolidBrush(l.Color)) g.FillEllipse(b, RLog.X + 18, top + s.Height / Math.Max(1, (float)Math.Round(s.Height / f.GetHeight(g))) / 2 - 3, 6, 6);
            using (var b = new SolidBrush(i == lines.Count - 1 ? l.Color : A(l.Color, 170))) g.DrawString(l.Text, f, b, new RectangleF(textX, top, textW, s.Height + 2));
            bottom = top - 6;
        }
        g.Restore(st);
    }
}
