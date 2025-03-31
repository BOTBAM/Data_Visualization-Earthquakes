function toggle() {
  const mapWidth = document.getElementById("map-container");
  const chartBoxes = document.getElementsByClassName("chart-box");
  const slider = document.getElementById("controls");
  const timeChart = document.getElementById("time-series-chart");

  // Toggle each chart box
  for (let box of chartBoxes) {
    box.style.display = box.style.display === "none" ? "block" : "none";
  }

  // Toggle map width
  mapWidth.style.width = mapWidth.style.width === "140%" ? "100%" : "140%";
  slider.style.width = slider.style.width === "140%" ? "100%" : "140%";
  timeChart.style.width = timeChart.style.width === "140%" ? "100%" : "140%";
}
