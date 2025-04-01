function toggle() {
  const mapWidth = document.getElementById("map-container");
  const chartBoxes = document.getElementsByClassName("chart-box");
  const slider = document.getElementById("controls");
  const timeChart = document.getElementById("time-series-chart");
  const anibtn = document.getElementById("anibtn");

  // Toggle chart visibility
  for (let box of chartBoxes) {
    box.style.display = box.style.display === "none" ? "block" : "none";
  }

  // Toggle widths
  const newWidth = mapWidth.style.width === "140%" ? "100%" : "140%";
  mapWidth.style.width = newWidth;
  slider.style.width = newWidth;
  timeChart.style.width = newWidth;
  anibtn.style.width = newWidth;

  // Set expanded state attribute
  timeChart.setAttribute("data-expanded", newWidth === "140%");

  // Redraw the time series chart
  if (typeof redrawTimeSeries !== "undefined") {
    redrawTimeSeries();
  }
}
