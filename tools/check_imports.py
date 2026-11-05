#!/usr/bin/env python3
"""Finn identifikatorer som brukes uten å være importert eller deklarert.

`node --check` ser bare syntaks, og render-harnessen treffer bare de grenene
testdataene utløser. En manglende import i en sjelden gren (f.eks. værkortet
når `ctx.weather` finnes) slipper derfor gjennom begge — og krasjer først i
nettleseren hos brukeren.

Dette er en grov, men effektiv sjekk: per fil samles importerte navn, lokalt
deklarerte navn og kjente globaler, og alt som brukes utover det rapporteres.

  python3 tools/check_imports.py          # alle *.js i src/
  python3 tools/check_imports.py start.js
"""
import os
import re
import sys

HERE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")

GLOBALS = {
    # språket
    "Array", "Object", "String", "Number", "Boolean", "Math", "JSON", "Date",
    "Map", "Set", "WeakMap", "WeakSet", "Promise", "RegExp", "Error", "Symbol",
    "Intl", "BigInt", "Proxy", "Reflect", "globalThis", "NaN", "Infinity",
    "undefined", "isFinite", "isNaN", "parseInt", "parseFloat", "encodeURIComponent",
    "decodeURIComponent", "structuredClone", "queueMicrotask",
    # nettleseren
    "window", "document", "console", "location", "navigator", "history",
    "localStorage", "sessionStorage", "fetch", "setTimeout", "clearTimeout",
    "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
    "customElements", "HTMLElement", "Element", "Node", "Event", "CustomEvent",
    "MutationObserver", "ResizeObserver", "IntersectionObserver", "AbortController",
    "URL", "URLSearchParams", "Image", "Audio", "CSS", "matchMedia", "getComputedStyle",
    "performance", "crypto", "screen", "innerWidth", "innerHeight", "devicePixelRatio",
    "scrollTo", "scrollBy", "alert", "confirm", "prompt", "Blob", "FileReader",
    "TextEncoder", "TextDecoder", "btoa", "atob", "DOMParser",
    # våre egne globale skrivemåter
    "this", "arguments", "super", "new",
}

KEYWORDS = {
    "const", "let", "var", "function", "class", "return", "if", "else", "for",
    "while", "do", "switch", "case", "default", "break", "continue", "try",
    "catch", "finally", "throw", "typeof", "instanceof", "in", "of", "new",
    "delete", "void", "yield", "await", "async", "export", "import", "from",
    "as", "extends", "static", "get", "set", "true", "false", "null", "this",
}



def _regex_position(out):
    """Står vi på et sted i koden der «/» starter en regex og ikke er deling?"""
    for ch in reversed(out):
        if ch in " \t\n\r":
            continue
        return ch in "(,=:[!&|?{};+-*%~^<>"
    return True            # helt i starten av fila


def strip_noise(src):
    """Fjern kommentarer, strenger og regex-literaler, men behold ${...}."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                i += 1
        elif c == "/" and i + 1 < n and src[i + 1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                i += 1
            i += 2
        elif c == "/" and _regex_position(out):
            # Regex-literal. MÅ hoppes over: `/"/g` i h() inneholder et
            # dobbelt-anførselstegn, og uten denne grenen starter scanneren
            # en «streng» der og mister takten for resten av fila — da lekker
            # strenginnhold inn i koden og sjekken rapporterer tull.
            i += 1
            in_class = False
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "[":
                    in_class = True
                elif src[i] == "]":
                    in_class = False
                elif src[i] == "/" and not in_class:
                    i += 1
                    break
                elif src[i] == "\n":
                    break
                i += 1
            out.append(" ")
        elif c in "\"'":
            q = c
            i += 1
            while i < n and src[i] != q:
                i += 2 if src[i] == "\\" else 1
            i += 1
        elif c == "`":
            i += 1
            depth = 0
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "$" and i + 1 < n and src[i + 1] == "{":
                    depth += 1
                    out.append(" ")
                    i += 2
                    start = i
                    br = 1
                    while i < n and br:
                        if src[i] == "{":
                            br += 1
                        elif src[i] == "}":
                            br -= 1
                        i += 1
                    out.append(strip_noise(src[start:i - 1]))
                    out.append(" ")
                    continue
                if src[i] == "`":
                    i += 1
                    break
                i += 1
        else:
            out.append(c)
            i += 1
    return "".join(out)


def declared_names(code):
    names = set()
    for pat in (
        r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)",
        r"\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)",
        r"\bclass\s+([A-Za-z_$][\w$]*)",
        r"\bcatch\s*\(\s*([A-Za-z_$][\w$]*)",
    ):
        names |= set(re.findall(pat, code))
    # destrukturering: const { a, b: c } = ..., const [x, y] = ...
    for m in re.finditer(r"\b(?:const|let|var)\s*([{\[])", code):
        start = m.end() - 1
        close = {"{": "}", "[": "]"}[m.group(1)]
        depth, i = 0, start
        while i < len(code):
            if code[i] in "{[":
                depth += 1
            elif code[i] in "}]":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        inner = code[start + 1:i]
        for part in re.split(r"[,\n]", inner):
            part = part.strip()
            if ":" in part:
                part = part.split(":", 1)[1]
            part = part.strip().lstrip(".").split("=")[0].strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", part):
                names.add(part)
    # funksjonsparametre
    for m in re.finditer(r"(?:function\s*\*?\s*[\w$]*\s*|\b)\(([^()]{0,400}?)\)\s*(?:=>|\{)", code):
        for part in m.group(1).split(","):
            part = part.strip().split("=")[0].strip().lstrip("...").strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", part):
                names.add(part)
    # enkle pilparametre: x => ...
    names |= set(re.findall(r"\b([A-Za-z_$][\w$]*)\s*=>", code))
    # klassemetoder og objektnøkler teller ikke som bruk
    return names


def imported_names(src):
    names = set()
    for m in re.finditer(r"import\s+(.+?)\s+from\s+[\"'][^\"']+[\"']", src, re.S):
        clause = m.group(1)
        for inner in re.findall(r"\{([^}]*)\}", clause):
            for part in inner.split(","):
                part = part.strip()
                if not part:
                    continue
                if " as " in part:
                    part = part.split(" as ")[1]
                names.add(part.strip())
        bare = re.sub(r"\{[^}]*\}", "", clause).replace(",", " ").strip()
        for part in bare.split():
            if re.fullmatch(r"[A-Za-z_$][\w$]*", part) and part != "as":
                names.add(part)
    return names


def check(path):
    src = open(path, encoding="utf-8").read()
    code = strip_noise(src)
    known = imported_names(src) | declared_names(code) | GLOBALS | KEYWORDS

    # kandidater: identifikator som kalles eller leses, ikke etter punktum
    used = {}
    # ASCII-bundet: uten re.ASCII slipper \w gjennom norske bokstaver, og
    # sammenslåtte strengetiketter («...infovindurunKjør(») blir rapportert
    # som manglende importer. Identifikatorer i denne koden er ASCII.
    for m in re.finditer(r"(?<![.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(", code, re.ASCII):
        used.setdefault(m.group(1), code[:m.start()].count("\n") + 1)
    bad = []
    for name, line in sorted(used.items(), key=lambda x: x[1]):
        if name in known or name in KEYWORDS:
            continue
        # objektmetoder: `foo: () => ...` eller `foo(` som klassemetode
        if re.search(r"(?:^|[{,;}\s])" + re.escape(name) + r"\s*\([^)]*\)\s*\{", code, re.M):
            continue
        bad.append((line, name))
    return bad


def main():
    targets = sys.argv[1:] or sorted(
        f for f in os.listdir(HERE) if f.endswith(".js") and not f.startswith("."))
    total = 0
    for f in targets:
        p = f if os.path.isabs(f) else os.path.join(HERE, f)
        bad = check(p)
        if bad:
            print(f"\n{os.path.basename(p)}")
            for line, name in bad:
                print(f"  linje {line:>5}: '{name}' er verken importert eller deklarert")
            total += len(bad)
    if total:
        print(f"\n{total} mulige manglende importer")
        return 1
    print(f"{len(targets)} filer sjekket — ingen manglende importer")
    return 0


def _metodesjekk():
    """Fanger this._foo(...) som ikke finnes som metode — f.eks. this._call()
    som ikke eksisterte og gjorde at hver Apple TV-kommando kastet stille."""
    import re
    src = open(os.path.join(HERE, "deckify.js"), encoding="utf-8").read()
    methods = set(re.findall(
        r"^\s{2}(?:async\s+|\*\s*)?(_?[a-zA-Z][a-zA-Z0-9_]*)\s*\(", src, re.M))
    methods |= {"constructor", "connectedCallback", "disconnectedCallback",
                "setConfig", "getCardSize", "shadowRoot",
                "addEventListener", "removeEventListener"}
    missing = sorted(set(re.findall(r"this\.(_[a-zA-Z][a-zA-Z0-9_]*)\s*\(", src)) - methods)
    if missing:
        print("METODE MANGLER i deckify.js: " + ", ".join(missing))
        raise SystemExit(1)
    print("metodesjekk: alle this._*()-kall finnes")


def _awaitsjekk():
    """Fang `await` i en metode som ikke er `async`.

    `node --check` godtar dette så snart fila inneholder `import`: da parses
    den som ESM der top-level await er lovlig, og Node slipper gjennom await
    inne i en vanlig metode også. NETTLESEREN gjør det ikke — der dør hele
    modulen med «await is only valid in async functions», og kortet
    forsvinner uten at noe annet ser galt ut. Kostet én runde i denne koden.
    """
    STMT = {"if", "for", "while", "switch", "catch", "return", "do", "else",
            "try", "function", "class", "constructor"}
    bad = []
    for fn in sorted(f for f in os.listdir(HERE) if f.endswith(".js")):
        lines = open(os.path.join(HERE, fn), encoding="utf-8").read().split("\n")
        cur_async = True          # utenfor en metode: ikke bry oss
        cur_name = "(topp)"
        cur_line = 0
        for i, ln in enumerate(lines, 1):
            m = re.match(r"^  (async\s+)?(?:\*\s*)?([A-Za-z_$][\w$]*)\s*\(", ln)
            if m and "=>" not in ln and m.group(2) not in STMT:
                cur_async = bool(m.group(1))
                cur_name = m.group(2)
                cur_line = i
                continue
            if re.match(r"^  \}", ln):
                cur_async = True
                continue
            if cur_async:
                continue
            # En `async () => {`-tilbakekalling inne i metoden gjør await
            # lovlig derfra og ut; da kan vi ikke si noe sikkert mer.
            if re.search(r"\basync\b", ln):
                cur_async = True
                continue
            if re.search(r"(?<![.\w$])await\s", ln):
                bad.append(f"{fn}:{i}: await i ikke-async metode {cur_name}() "
                           f"(definert linje {cur_line})")
    if bad:
        print("AWAIT-FEIL (nettleseren vil avvise modulen):", *bad, sep="\n  ")
        raise SystemExit(1)
    print("awaitsjekk: ingen await i ikke-async metoder")


if __name__ == "__main__":
    _metodesjekk()
    _awaitsjekk()
    sys.exit(main())
