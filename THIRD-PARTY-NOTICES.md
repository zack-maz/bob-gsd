# Third-party notices

gsd-bob is released under the MIT License (see [`LICENSE`](./LICENSE)). It redistributes
the following third-party software, each under its own license, reproduced here as those
licenses require.

## @opengsd/gsd-core (vendored under `gsd-core/`, sources under `commands/gsd/`)

The `gsd-core/` directory and the `commands/gsd/*.md` sources are a curated, patched copy of
the [`@opengsd/gsd-core`](https://github.com/open-gsd/gsd-core) npm package — the version
recorded in `gsd-core/VERSION`. The local modifications (nine replayable deltas) are
documented in `scripts/apply-bob-patches.cjs` and `MAINTAINING.md`. In addition, the installer
rewrites the redistributed markdown at install time — host paths re-pointed at the install, the
shim-resolver preamble replaced by a Bob-only one, and agent/vendor/model names in prose
neutralized (`ARCHITECTURE.md` Axis 3) — so a gsd-bob install is a **modified** copy of the
upstream doc tree, not a verbatim one. The upstream license:

```
MIT License

Copyright (c) 2026 Open GSD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## js-yaml (runtime dependency, not redistributed in this repository)

[`js-yaml`](https://github.com/nodeca/js-yaml) is installed from npm at install time and is
licensed under the MIT License, Copyright (C) 2011-2015 by Vitaly Puzrin. Its license text is
shipped inside the `js-yaml` package itself.

## IBM Bob

IBM Bob is a product of IBM. gsd-bob is an independent, community-maintained adapter and is
not affiliated with, endorsed by, or supported by IBM. "IBM" and "Bob" are used only to
identify the target runtime.
