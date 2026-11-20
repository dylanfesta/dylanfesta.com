# AGENTS.md — Architecture & Conventions (`dylanfesta.com`)

## Overview

Personal research website for **Dylan Festa**, built as a multi-page static site with **Eleventy (11ty v3)**, **pure modern native CSS** (5 light/dark themes), **build-time KaTeX math**, and **Rust + WebAssembly (`egui`)** interactive demos.

## Key Commands

- `npm run dev` — Start the local Eleventy dev server (auto-reloads Markdown, YAML, and CSS).
- `npm run build` — Build Eleventy static output into `_site/` (fast; reuses existing `.wasm` builds).
- `npm run build:wasm` — Compile all Rust crates in `crates/*` into `src/assets/wasm/<crate>/` via `wasm-pack`.
- `npm run build:all` — Build both Rust/Wasm bundles and Eleventy (`_site/`).
- `cargo run -p poisson-spikes` — Run and debug a simulation crate natively on Linux desktop before compiling to Wasm.

## Project Structure & Rules

1. **Content & Data (`src/`)**
   - Keep pages crisp and separate (avoid single-page endless scrolling): Home (`/`), Research (`/research/`), Publications (`/publications/`), Code (`/code/`), Demos (`/demos/`), and Notes (`/notes/`).
   - Publications (`src/_data/publications.yaml`) and Code (`src/_data/code.yaml`) are **manually curated YAML** files.
   - Site-wide configuration (including `defaultTheme`, `showThemePicker`, and `pathPrefix`) lives in `src/_data/site.yaml`.
   - **Alpha preview vs. root launch:** `pathPrefix: /alpha-version/` builds the full site under `_site/alpha-version/` (with `noindex`) and writes a minimal *"under construction"* page at `_site/index.html`. Change `pathPrefix` to `/` in `src/_data/site.yaml` to publish at the root domain.

2. **Styling & Themes (`src/assets/css/`)**
   - **Pure modern native CSS only** (no Sass/Tailwind/preprocessors): use cascade layers (`@layer`), native CSS nesting, logical properties, and CSS Custom Properties (`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--border`).
   - Light/Dark mode uses `<meta name="color-scheme" content="light dark">` + `:root` `color-scheme` + `light-dark()` (with `@media (prefers-color-scheme: dark)` fallbacks). Do not hardcode `.dark` JS-only classes for colors.
   - To add or edit a theme, add a `:root[data-theme="<id>"]` block in `src/assets/css/themes.css` and list it under `themes:` in `src/_data/site.yaml`.

3. **LaTeX Math**
   - Rendered at build time via `katex` in `eleventy.config.js` (`$...$` inline and `$$...$$` display blocks). Zero client-side math JS is shipped.

4. **Rust + WebAssembly Demos (`crates/`)**
   - Each demo is a standalone crate inside `crates/<demo-name>/` exposing `#[wasm_bindgen] pub async fn start_demo(canvas_id: &str)` on `wasm32` (and optionally a `src/main.rs` desktop runner).
   - Compiled `.wasm` outputs in `src/assets/wasm/` are **gitignored**; GitHub Actions (`.github/workflows/deploy.yml`) compiles them with Rust caching and publishes the static `_site/` folder to the `deploy` branch.
   - `OldAttempts/` is local archival material only and must remain gitignored.
