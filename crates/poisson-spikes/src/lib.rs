use std::collections::VecDeque;

use egui::{Color32, Stroke, Vec2};
use egui_plot::{Line, Plot, PlotBounds};

/// Width of the scrolling time axis in seconds.
const WINDOW_SECONDS: f64 = 5.0;
const MIN_RATE_HZ: f64 = 0.1;
const MAX_RATE_HZ: f64 = 25.0;

/// Interactive real-time Poisson spike train simulation.
///
/// Spikes are generated sequentially via exponential interspike intervals:
///     dt = -ln(U) / r,   U ~ Uniform(0, 1)
pub struct PoissonApp {
    /// Firing rate r in Hz, controlled by a single slider in [0.1, 25.0].
    rate_hz: f64,
    /// Timestamps (in seconds) of spikes currently near or inside [t - 5, t].
    spikes: VecDeque<f64>,
    /// Scheduled timestamp of the next incoming spike.
    next_spike_time: f64,
    /// Whether the simulation clock has been initialized on the first frame.
    initialized: bool,
    /// Last applied light/dark state so we only update Visuals on change.
    last_dark_mode: Option<bool>,
}

impl Default for PoissonApp {
    fn default() -> Self {
        Self {
            rate_hz: 5.0,
            spikes: VecDeque::with_capacity(256),
            next_spike_time: 0.0,
            initialized: false,
            last_dark_mode: None,
        }
    }
}

impl PoissonApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Self::default()
    }

    /// Draw a single exponential interspike interval (in seconds) for rate `r` Hz.
    fn sample_isi(rate_hz: f64) -> f64 {
        let u = fastrand::f64().clamp(1e-12, 1.0 - f64::EPSILON);
        -u.ln() / rate_hz
    }

    /// Advance the Poisson process up to `now` and prune spikes older than the window.
    fn step_simulation(&mut self, now: f64) {
        if !self.initialized {
            // Seed the initial [now - 5, now] window so it starts already populated.
            let mut cursor = now - WINDOW_SECONDS + Self::sample_isi(self.rate_hz);
            while cursor <= now {
                self.spikes.push_back(cursor);
                cursor += Self::sample_isi(self.rate_hz);
            }
            self.next_spike_time = cursor;
            self.initialized = true;
            return;
        }

        while self.next_spike_time <= now {
            let t_spike = self.next_spike_time;
            if t_spike >= now - WINDOW_SECONDS - 0.25 {
                self.spikes.push_back(t_spike);
            }
            self.next_spike_time = t_spike + Self::sample_isi(self.rate_hz);
        }

        let cutoff = now - WINDOW_SECONDS - 0.25;
        while let Some(&oldest) = self.spikes.front() {
            if oldest < cutoff {
                self.spikes.pop_front();
            } else {
                break;
            }
        }
    }

    fn sync_theme(&mut self, ctx: &egui::Context) {
        if let Some(is_dark) = detect_page_dark_mode() {
            if self.last_dark_mode != Some(is_dark) {
                ctx.set_visuals(if is_dark {
                    egui::Visuals::dark()
                } else {
                    egui::Visuals::light()
                });
                self.last_dark_mode = Some(is_dark);
            }
        }
    }
}

impl eframe::App for PoissonApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.sync_theme(ctx);

        // `i.time` advances monotonically at 1.0 second per wall-clock second.
        let now = ctx.input(|i| i.time);
        self.step_simulation(now);

        egui::TopBottomPanel::top("controls_panel")
            .frame(egui::Frame::side_top_panel(&ctx.style()).inner_margin(egui::Margin::same(10)))
            .show(ctx, |ui| {
                ui.horizontal_wrapped(|ui| {
                    ui.spacing_mut().slider_width = (ui.available_width() * 0.45).clamp(140.0, 280.0);
                    let slider = egui::Slider::new(&mut self.rate_hz, MIN_RATE_HZ..=MAX_RATE_HZ)
                        .text("Rate")
                        .suffix(" Hz")
                        .fixed_decimals(1);

                    if ui.add(slider).changed() {
                        // Memoryless property of the Poisson process: resampling the
                        // forward waiting time from `now` is exact and avoids waiting
                        // out a stale long interval when jumping from 0.1 Hz -> 25 Hz.
                        self.next_spike_time = now + Self::sample_isi(self.rate_hz);
                    }

                    let visible_count = self
                        .spikes
                        .iter()
                        .filter(|&&t| t >= now - WINDOW_SECONDS && t <= now)
                        .count();

                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.weak(format!(
                            "Spikes in 5 s window: {:>3} ({:.1} Hz)",
                            visible_count,
                            visible_count as f64 / WINDOW_SECONDS
                        ));
                    });
                });
            });

        egui::CentralPanel::default()
            .frame(egui::Frame::central_panel(&ctx.style()).inner_margin(egui::Margin::same(10)))
            .show(ctx, |ui| {
                let is_dark = ctx.style().visuals.dark_mode;
                let spike_color = if is_dark {
                    Color32::from_rgb(110, 200, 255)
                } else {
                    Color32::from_rgb(24, 92, 170)
                };
                let baseline_color = if is_dark {
                    Color32::from_gray(75)
                } else {
                    Color32::from_gray(195)
                };

                Plot::new("poisson_spike_train")
                    .allow_drag(false)
                    .allow_zoom(false)
                    .allow_scroll(false)
                    .allow_boxed_zoom(false)
                    .show_axes([true, false])
                    .show_y(false)
                    .x_axis_label("Time (s)")
                    .set_margin_fraction(Vec2::ZERO)
                    .show(ui, |plot_ui| {
                        plot_ui.set_plot_bounds(PlotBounds::from_min_max(
                            [now - WINDOW_SECONDS, 0.0],
                            [now, 1.0],
                        ));

                        plot_ui.line(
                            Line::new(vec![[now - WINDOW_SECONDS, 0.15], [now, 0.15]])
                                .color(baseline_color)
                                .width(1.0_f32),
                        );

                        for &t_spike in &self.spikes {
                            if t_spike >= now - WINDOW_SECONDS && t_spike <= now {
                                plot_ui.line(
                                    Line::new(vec![[t_spike, 0.15], [t_spike, 0.85]])
                                        .stroke(Stroke::new(2.0_f32, spike_color)),
                                );
                            }
                        }
                    });
            });

        // Continuous real-time scrolling (1 s per s).
        ctx.request_repaint();
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn detect_page_dark_mode() -> Option<bool> {
    None
}

/// On the web, inspect `<meta name="color-scheme">` and `prefers-color-scheme`
/// so toggling Light/Dark mode in the site header updates the canvas live.
#[cfg(target_arch = "wasm32")]
fn detect_page_dark_mode() -> Option<bool> {
    let window = web_sys::window()?;
    let document = window.document()?;

    if let Ok(Some(meta)) = document.query_selector("meta[name=\"color-scheme\"]") {
        if let Some(content) = meta.get_attribute("content") {
            let trimmed = content.trim();
            if trimmed == "dark" {
                return Some(true);
            }
            if trimmed == "light" {
                return Some(false);
            }
        }
    }

    let mql = window
        .match_media("(prefers-color-scheme: dark)")
        .ok()
        .flatten()?;
    Some(mql.matches())
}

#[cfg(target_arch = "wasm32")]
mod web {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsCast;

    use super::PoissonApp;

    /// Launch the simulation inside the `<canvas>` with the given DOM id.
    #[wasm_bindgen]
    pub async fn start_demo(canvas_id: &str) -> Result<(), JsValue> {
        let document = web_sys::window()
            .ok_or_else(|| JsValue::from_str("No browser window found"))?
            .document()
            .ok_or_else(|| JsValue::from_str("No HTML document found"))?;

        let canvas = document
            .get_element_by_id(canvas_id)
            .ok_or_else(|| JsValue::from_str(&format!("Canvas #{canvas_id} not found")))?
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .map_err(|_| JsValue::from_str("Target element is not an HtmlCanvasElement"))?;

        let web_options = eframe::WebOptions::default();
        eframe::WebRunner::new()
            .start(
                canvas,
                web_options,
                Box::new(|cc| Ok(Box::new(PoissonApp::new(cc)))),
            )
            .await
    }
}
