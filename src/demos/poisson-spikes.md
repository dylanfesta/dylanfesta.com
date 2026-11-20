---
layout: layouts/demo.njk
title: Poisson Spike Train
heading: Poisson Spike Train
intro: "Starter template demo in Rust + egui: real-time 5-second scrolling window with exponential interspike intervals."
summary: "Homogeneous Poisson process generated via exponential interspike intervals in a scrolling 5 s window, with firing rate adjustable between 0.1 Hz and 25 Hz."
badge: "Rust + egui"
wasmCrate: poisson-spikes
wasmModule: poisson_spikes
canvasId: demo-canvas
---
## Model Notes (Template)

Spikes are generated sequentially by drawing independent interspike intervals $\Delta t$ from an exponential distribution with rate $r \in [0.1, 25.0]\text{ Hz}$:

$$
p(\Delta t) = r e^{-r \Delta t}, \qquad \Delta t = -\frac{\ln U}{r}, \quad U \sim \mathcal{U}(0, 1).
$$

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Edit the simulation in `crates/poisson-spikes/src/lib.rs` (testable natively on Linux with `cargo run -p poisson-spikes`) and rebuild for the browser with `npm run build:wasm`.
