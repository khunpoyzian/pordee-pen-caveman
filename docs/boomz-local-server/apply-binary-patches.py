#!/usr/bin/env python3
"""
Apply the binary patches the DDTank 3.0 (Boomz) server assemblies need to run
under Mono on Linux.

The .NET assemblies hard-code two things that break on a case-sensitive,
forward-slash filesystem:

  1. Game.Server.dll (Road) hard-codes the build "Edition" string used in the
     login handshake. The shipped binary carries "11000" while the Center DB /
     binaries expect "21000", so every login is rejected.

  2. Game.Logic.dll (Road + Fighting) builds map/bomb file paths with Windows
     backslashes ("map\\{0}\\fore.map"). File.Exists() then fails on Linux
     because the backslash is a literal filename character, so the server
     reports 'Map's file is not exist!' / "can't find bomb file".

All strings live in the assembly's #US (user-string) heap as UTF-16LE. We patch
in place; every replacement keeps the original byte length so no offsets shift.

Usage:
    python3 apply-binary-patches.py /path/to/ddtank-local/server

A .bak copy is written next to each file before it is modified. Re-running is
safe (already-patched files report "no change").
"""
import sys
import os
import shutil

# (search_utf16, replace_utf16, human-readable description)
PATCHES = {
    # Road only: build edition used in login handshake
    "road/Game.Server.dll": [
        ("11000", "21000", 'Edition "11000" -> "21000"'),
    ],
    # Road + Fighting: Windows path separators -> POSIX
    "road/Game.Logic.dll": [
        ("map\\{0}\\fore.map", "map/{0}/fore.map", "map fore.map path"),
        ("map\\{0}\\dead.map", "map/{0}/dead.map", "map dead.map path"),
        ("bomb\\{0}.bomb", "bomb/{0}.bomb", "bomb path"),
    ],
    "fighting/Game.Logic.dll": [
        ("map\\{0}\\fore.map", "map/{0}/fore.map", "map fore.map path"),
        ("map\\{0}\\dead.map", "map/{0}/dead.map", "map dead.map path"),
        ("bomb\\{0}.bomb", "bomb/{0}.bomb", "bomb path"),
    ],
}


def patch_file(path, edits):
    with open(path, "rb") as f:
        data = f.read()

    original = data
    applied, skipped = [], []
    for search, replace, desc in edits:
        s = search.encode("utf-16-le")
        r = replace.encode("utf-16-le")
        if len(s) != len(r):
            print(f"  !! length mismatch for {desc!r}; skipping (unsafe)")
            continue
        if s in data:
            data = data.replace(s, r)
            applied.append(desc)
        elif r in data:
            skipped.append(desc)  # already patched
        else:
            print(f"  ?? pattern not found for {desc!r}")

    if data != original:
        shutil.copy2(path, path + ".bak")
        with open(path, "wb") as f:
            f.write(data)
        print(f"  patched: {', '.join(applied)}")
    elif skipped:
        print(f"  no change (already patched): {', '.join(skipped)}")
    else:
        print("  no change")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    root = sys.argv[1]
    for rel, edits in PATCHES.items():
        path = os.path.join(root, rel)
        print(f"{rel}:")
        if not os.path.exists(path):
            print("  (missing - skipped)")
            continue
        patch_file(path, edits)


if __name__ == "__main__":
    main()
