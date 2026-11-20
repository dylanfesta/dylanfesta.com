# dylanfesta.com

Personal website for **Dylan Festa** — built with [Eleventy (11ty)](https://www.11ty.dev/), modern native CSS (5 switchable themes with Light/Dark mode), build-time $\text{KaTeX}$ math, and **Rust + WebAssembly (`egui`)** interactive demos.

## Quick Start

```bash
# 1. Build the Rust -> WebAssembly demo bundle(s) (needed once, or after editing crates/*)
npm run build:wasm

# 2. Start the local Eleventy live-reload server
npm run dev
```

When `pathPrefix` in `src/_data/site.yaml` is set to `/alpha-version/`, open `http://localhost:8080/alpha-version/` locally.

### Native Rust Simulation Development

Every simulation crate in `crates/` can also run as a native Linux desktop window for fast iteration before compiling to WebAssembly:

```bash
cargo run -p poisson-spikes
```

## Common Updates

| Task | File to Edit |
| :--- | :--- |
| Edit Home bio & links | `src/index.md` and `src/_data/site.yaml` |
| Edit Research overview (with LaTeX) | `src/research.md` |
| Add or edit Publications | `src/_data/publications.yaml` |
| Add or edit Code / Packages | `src/_data/code.yaml` |
| Write a new Note | Add `src/notes/my-note.md` |
| Change default theme or launch from `/alpha-version/` to `/` | `src/_data/site.yaml` |
| Customize or add CSS themes | `src/assets/css/themes.css` |
| Add a new Rust + Wasm demo | Copy `crates/poisson-spikes` to `crates/<new-demo>`, run `npm run build:wasm`, and add `src/demos/<new-demo>.md` |

## Deploying on Cloudflare Pages

On every push to `main`, `.github/workflows/deploy.yml` compiles both the Rust WebAssembly crates (with Cargo caching) and Eleventy, publishing the ready-to-serve static files to the **`deploy`** branch.

In **Cloudflare Pages**:
1. Connect your GitHub repository `dylanfesta/dylanfesta.com`.
2. Set **Production branch** to `deploy`.
3. Leave **Build command** **empty** (already built by GitHub Actions).
4. Set **Build output directory** to `/`.
5. Attach custom domain `dylanfesta.com` — your preview will live at `https://dylanfesta.com/alpha-version/` while `https://dylanfesta.com/` displays the minimal construction stub until you switch `pathPrefix: /` in `src/_data/site.yaml`.

## Acknowledgements

This work was supported in part by complimentary access to Google Antigravity and Gemini 4 Carbon to accelerate scientific workflows.
