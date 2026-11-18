let summitDemo;
function prepareSummitDemo(event) {
  event?.preventDefault();
  summitDemo?.destroy();
  const prize = document.getElementById("demoPrize").value.trim() || "Premio de ejemplo";
  const config = { floors: Number(document.getElementById("demoFloors").value), summit_difficulty: document.getElementById("demoDifficulty").value, duration_seconds: 90, lives: 3 };
  document.getElementById("demoResult").textContent = "";
  summitDemo = QoriSummit.mount(document.getElementById("summitHost"), { prize, config, seed: "qori-demo-v1", onFinish(result) {
    const checked = QoriSummitCore.replay(config, "qori-demo-v1", result.trace);
    document.getElementById("demoResult").textContent = checked.won ? `¡Cima alcanzada! Premio de ejemplo: ${prize}. Demo sin emisión de QR.` : `Llegaste al piso ${checked.floor}. Puedes preparar otra partida.`;
    document.querySelector(".cumbre-status").textContent = "Demo terminada. Prepara otra partida para volver a jugar.";
  }});
}
document.getElementById("demoConfig").addEventListener("submit", prepareSummitDemo);
prepareSummitDemo();
