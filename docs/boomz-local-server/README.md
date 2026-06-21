# Boomz / DDTank 3.0 — Local Test Server

Reproducible notes for standing up the **Boomz** game server (the SEA/Thai
build of 7Road's **DDTank 3.0**, C# / .NET Framework 4.0) on a single Linux box
using **Mono** + **SQL Server 2019 in Docker**, with no Windows host.

> These notes were produced while bringing the three servers up from the
> publicly circulated server dump + source. They capture every change needed to
> get a clean boot on Linux; the large binaries / DB dumps themselves are **not**
> committed here (they are multi-hundred-MB and not ours to redistribute).

## Architecture

DDTank 3.0 runs as three cooperating processes that must start in order:

| Order | Server   | Exe                    | Ports                | Role |
|-------|----------|------------------------|----------------------|------|
| 1     | Center   | `Center.Service.exe`   | 9202, 2008, **2009** | Login + WCF host (`net.tcp:2009`) |
| 2     | Fighting | `Fighting.Service.exe` | 9208                 | Battle/combat backend |
| 3     | Road     | `Road.Service.exe`     | 9210                 | Game world; WCF-calls Center, registers Fighting |

Start order matters: **Road makes a WCF call to Center (2009) and opens a TCP
connection to Fighting (9208) during startup**. If either is down, Road blocks.
`start-all.sh` enforces the order and waits for each port before continuing.

## Prerequisites

```bash
# Mono (runs the .NET 4.0 EXEs)
apt-get install -y mono-complete            # tested with Mono 6.8.0

# SQL Server 2019 in Docker
docker run -d --name ddt3-mssql \
  -e ACCEPT_EULA=Y -e 'SA_PASSWORD=DDTank@2024' \
  -p 1433:1433 mcr.microsoft.com/mssql/server:2019-latest
```

Restore the four databases from the dump (names as they appear in the dump):
`Db_Tank`, `Db_Count`, `Db_User`, `Db_Tank_Record`.

## Setup steps

### 1. Database fixes
Run [`sql/01-fixes.sql`](sql/01-fixes.sql): sets `Edition = 21000`, registers
the Road server in `Server_List` (ID = 2), and documents how to skip maps whose
files are missing.

### 2. Mono: stub the Windows console API
The Road console loop P/Invokes `SetConsoleCtrlHandler` (kernel32). Build a
no-op stub and map it in:

```bash
gcc -shared -fPIC -o /usr/lib/libkernel32.so docs/boomz-local-server/mono/libkernel32.c
# append docs/boomz-local-server/mono/dllmap.config into /etc/mono/config
```

### 3. Binary patches
Apply with the helper (writes `.bak` files, idempotent):

```bash
python3 docs/boomz-local-server/apply-binary-patches.py /path/to/server
```

It patches, in the assemblies' UTF-16LE `#US` string heap (same-length, in
place — no offsets move):

- `road/Game.Server.dll` — login Edition `"11000"` → `"21000"`.
- `road/Game.Logic.dll` + `fighting/Game.Logic.dll` — map/bomb paths from
  `map\{0}\fore.map` style (backslash) to `map/{0}/fore.map` (forward slash),
  because `File.Exists()` treats `\` as a literal filename char on Linux.
  `MONO_IOMAP=all` does **not** fix this — it only handles case, not separators.

### 4. Config files
The three [`configs/`](configs/) files are the working versions. Key edits vs.
the shipped configs:

- **DB connection strings** → `Data Source=localhost,1433; User ID=sa; Password=DDTank@2024`.
- **WCF addresses (Center)** → `localhost` instead of `0.0.0.0`. Mono's
  `NetTcpBinding` throws `ArgumentException: 0.0.0.0 ... is an unspecified
  address` if you bind a wildcard. (`http://localhost:2008`, `net.tcp://localhost:2009`.)
- **`LoginServerIp` / `FightServerIp` (Road)** → `127.0.0.1`.
- **Language / path keys** → forward slashes (`Languages/Language-zh_cn.txt`).
- **log4net** `ColoredConsoleAppender` → plain `ConsoleAppender` in each
  `logconfig.xml` (the colored appender needs the Win32 console API).

### 5. Game data files
Road/Fighting load `map/<id>/{fore,dead}.map` and `bomb/<id>.bomb` relative to
the working dir. Copy the full set from the source `bin/Debug/` tree. Any IDs
referenced by the DB but absent on disk are logged and skipped (non-fatal); the
dump references more content than it ships (e.g. `bomb/6.bomb`, `bomb/10001..`),
which simply makes those specific weapons/maps unavailable.

## Running

```bash
./start-all.sh         # or docs/boomz-local-server/start-all.sh
```

Each server is launched under `script -q -c "mono X.exe" <log>` to give it a
pseudo-TTY. Without a TTY, `Console.ReadLine()` returns null on EOF and the
console REPL crash-loops on `null.Split(' ')`.

Expected: all of `9202, 2008, 2009, 9208, 9210` LISTENing, and Road holding an
ESTABLISHED connection to Fighting on 9208 (proves BattleMgr linked up).

## Gotchas reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Edition:xxxx: False` | DB `Edition` ≠ binary `21000` | SQL update + `Game.Server.dll` patch |
| WCF `ArgumentException 0.0.0.0` | Mono can't bind wildcard | `localhost` in Center config |
| Console NRE crash-loop | `ReadLine()`→null on EOF | run under `script` (PTY) |
| `EntryPointNotFoundException SetConsoleCtrlHandler` | no kernel32 on Linux | `libkernel32.so` stub + dllmap |
| `Map's file is not exist!` / `can't find bomb file` | backslash paths + case-sensitive FS | `Game.Logic.dll` path patch + copy data |
| `WorldMgr Init: False` | no `Server_List` row for Road (ID 2) | insert row (SQL) |
| Center/Fighting die on a bare TCP probe | unhandled `SocketException` in Mono async accept on abrupt client close | don't half-open connections; use a real client |
| Road hangs mid-init | started before Center(2009)/Fighting(9208) were up | use `start-all.sh` ordering |

## Files in this directory

```
README.md                  – this guide
start-all.sh               – ordered launcher with per-port health checks
apply-binary-patches.py    – idempotent UTF-16LE patcher (.bak backups)
configs/                   – working Center / Fighting / Road .exe.config files
sql/01-fixes.sql           – DB edition + Server_List + map-skip fixes
mono/libkernel32.c         – SetConsoleCtrlHandler no-op stub
mono/dllmap.config         – /etc/mono/config dllmap snippet
```
