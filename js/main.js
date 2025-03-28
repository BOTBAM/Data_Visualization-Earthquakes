d3.csv('data/2024-2025.csv')
  .then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.depth = +d.depth;
      d.mag = +d.mag;
    });

    const leafletMap = new LeafletMap({ parentElement: '#my-map' }, data);

    // ---- Magnitude Buckets ----
    const magBuckets = {
      "3.0–3.9": 0,
      "4.0–4.9": 0,
      "5.0–5.9": 0,
      "6.0–6.9": 0,
      "7.0–7.9": 0,
      "8.0+": 0
    };

    data.forEach(d => {
      const mag = d.mag;
      if (mag >= 3 && mag < 4) magBuckets["3.0–3.9"]++;
      else if (mag >= 4 && mag < 5) magBuckets["4.0–4.9"]++;
      else if (mag >= 5 && mag < 6) magBuckets["5.0–5.9"]++;
      else if (mag >= 6 && mag < 7) magBuckets["6.0–6.9"]++;
      else if (mag >= 7 && mag < 8) magBuckets["7.0–7.9"]++;
      else if (mag >= 8) magBuckets["8.0+"]++;
    });

    drawMagnitudeChart(magBuckets);

    // ---- Duration Buckets ----
    const durationBuckets = {
      "<10s": 0,
      "10–30s": 0,
      "30–60s": 0,
      "60–120s": 0,
      "120s+": 0
    };

    data.forEach(d => {
      const duration = Math.pow(10, 0.5 * d.mag);
      if (duration < 10) durationBuckets["<10s"]++;
      else if (duration < 30) durationBuckets["10–30s"]++;
      else if (duration < 60) durationBuckets["30–60s"]++;
      else if (duration < 120) durationBuckets["60–120s"]++;
      else durationBuckets["120s+"]++;
    });

    drawDurationChart(durationBuckets);

    // ---- Depth Buckets ----
    const depthBuckets = {
      "0–10km": 0,
      "10–30km": 0,
      "30–70km": 0,
      "70–300km": 0,
      "300km+": 0
    };

    data.forEach(d => {
      const depth = d.depth;
      if (depth >= 0 && depth < 10) depthBuckets["0–10km"]++;
      else if (depth >= 10 && depth < 30) depthBuckets["10–30km"]++;
      else if (depth >= 30 && depth < 70) depthBuckets["30–70km"]++;
      else if (depth >= 70 && depth < 300) depthBuckets["70–300km"]++;
      else if (depth >= 300) depthBuckets["300km+"]++;
    });

    drawDepthChart(depthBuckets);
  })
  .catch(error => console.error(error));

// ---------- Drawing Wrappers ----------
function drawMagnitudeChart(dataObj) {
  drawBarChart("#magnitude-chart", dataObj, "#ff6600", "#cc5200", "Earthquakes by Magnitude (2024–2025)", "Magnitude");
}
function drawDurationChart(dataObj) {
  drawBarChart("#duration-chart", dataObj, "#8e44ad", "#5e3370", "Estimated Duration of Earthquakes", "Duration (seconds)");
}
function drawDepthChart(dataObj) {
  drawBarChart("#depth-chart", dataObj, "#0077b6", "#023e8a", "Earthquakes by Depth", "Depth (km)");
}

// ---------- Responsive Bar Chart Function ----------
function drawBarChart(container, dataObj, color, hoverColor, title, xLabel) {
  const data = Object.entries(dataObj).map(([label, value]) => ({ label, value }));

  const containerEl = document.querySelector(container);
  const width = containerEl.offsetWidth;
  const height = 450;
  const margin = { top: 30, right: 30, bottom: 60, left: 70 };

  const svg = d3.select(container).append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(xLabel);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Number of Earthquakes");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text(title);

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.label))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.value))
    .attr("fill", color)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", hoverColor);
      const tooltip = document.getElementById("tooltip");
      tooltip.innerHTML = `<strong>${d.label}</strong>: ${d.value} quakes`;
      tooltip.style.display = "block";
      tooltip.style.left = event.pageX + 10 + "px";
      tooltip.style.top = event.pageY - 20 + "px";
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", color);
      document.getElementById("tooltip").style.display = "none";
    });
}

// ---------- Toggle + Layout ----------
document.querySelectorAll(".chart-toggle").forEach(toggle => {
  toggle.addEventListener("change", () => {
    const selected = Array.from(document.querySelectorAll(".chart-toggle:checked")).map(cb => cb.value);

    const chartIds = {
      magnitude: "magnitude-chart",
      duration: "duration-chart",
      depth: "depth-chart"
    };

    Object.entries(chartIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      el.style.display = selected.includes(key) ? "block" : "none";
      el.classList.remove("chart-1", "chart-2", "chart-3");
    });

    const layoutClass = `chart-${selected.length}`;
    selected.forEach(key => {
      const el = document.getElementById(chartIds[key]);
      el.classList.add(layoutClass);
    });
  });
});
