function toggle() {
  const mapWidth = document.getElementById("map-container");
  const chartBoxes = document.getElementsByClassName("chart-box");

  // Toggle each chart box
  for (let box of chartBoxes) {
    box.style.display = box.style.display === "none" ? "block" : "none";
  }

  // Toggle map width
  mapWidth.style.width = mapWidth.style.width === "140%" ? "100%" : "140%";
}
