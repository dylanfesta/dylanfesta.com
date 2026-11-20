#[cfg(not(target_arch = "wasm32"))]
fn main() -> eframe::Result<()> {
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([760.0, 280.0])
            .with_min_inner_size([420.0, 220.0]),
        ..Default::default()
    };

    eframe::run_native(
        "Poisson Spike Train — Dylan Festa",
        native_options,
        Box::new(|cc| Ok(Box::new(poisson_spikes::PoissonApp::new(cc)))),
    )
}

#[cfg(target_arch = "wasm32")]
fn main() {}
