/**
 * File: main.js
 * Purpose:
 *   - Dynamically loads and filters earthquake data by month.
 *   - Parses relevant fields and passes the data to the LeafletMap class.
 *   - Acts as the main entry point for bootstrapping the visualization.
 */
let fullData = []; // Store unfiltered full dataset
let leafletMap;

d3.csv("data/4-10M_(1995-today).csv")
  .then((data) => {
    console.log("number of items: " + data.length);

    data.forEach((d) => {
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.depth = +d.depth;
      d.mag = +d.mag;
      d.time = new Date(d.time);
    });
    
    fullData = data;

    // --- Generate *dynamically* available months from fullData, we can later expand to dive even deeper (weeks, days, etc.) ---
    const uniqueMonthsSet = new Set();
    fullData.forEach(d => {
      const monthKey = `${d.time.getFullYear()}-${String(d.time.getMonth()).padStart(2, '0')}`;
      uniqueMonthsSet.add(monthKey);
    });

    const uniqueMonthsSorted = Array.from(uniqueMonthsSet)
      .map(key => {
        const [year, month] = key.split('-');
        return new Date(+year, +month);
      })
      .sort((a, b) => a - b);
      
      updateEarthquakeChart(new Date("2015-01-01"), new Date("2016-01-31"));

    // Initialize with 2025 data

    const monthSlider = document.getElementById('monthSlider');
    const monthLabel = document.getElementById('monthLabel');

    monthSlider.min = 0;
    monthSlider.max = uniqueMonthsSorted.length - 1;
    monthSlider.value = uniqueMonthsSorted.length - 1;

    const latestMonth = uniqueMonthsSorted[uniqueMonthsSorted.length - 1];
    monthLabel.textContent = latestMonth.toLocaleString('default', { month: 'short', year: 'numeric' });

    const initialData = fullData.filter(d =>
      d.time.getFullYear() === latestMonth.getFullYear() &&
      d.time.getMonth() === latestMonth.getMonth()
    );
    
    // VERY importand for appropriate map initialization! Please do not move unless confirmed to not cause issues
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, initialData);

    // Hook up slider interaction (added months)
    monthSlider.addEventListener('input', function () {
      const index = +this.value;
      const selectedMonth = uniqueMonthsSorted[index];

      monthLabel.textContent = selectedMonth.toLocaleString('default', { month: 'short', year: 'numeric' });

      const filteredData = fullData.filter(d =>
        d.time.getFullYear() === selectedMonth.getFullYear() &&
        d.time.getMonth() === selectedMonth.getMonth()
      );

      leafletMap.setData(filteredData);
    });  

        const yearData = fullData.filter((d) => d.year === selectedYear);
        leafletMap.setData(yearData); // ← now dynamically updates the map!
      });

    // ---- Magnitude Buckets ----
    const magBuckets = {
      "3.0–3.9": 0,
      "4.0–4.9": 0,
      "5.0–5.9": 0,
      "6.0–6.9": 0,
      "7.0–7.9": 0,
      "8.0+": 0,
    };

    data.forEach((d) => {
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
      "120s+": 0,
    };

    data.forEach((d) => {
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
      "300km+": 0,
    };

    data.forEach((d) => {
      const depth = d.depth;
      if (depth >= 0 && depth < 10) depthBuckets["0–10km"]++;
      else if (depth >= 10 && depth < 30) depthBuckets["10–30km"]++;
      else if (depth >= 30 && depth < 70) depthBuckets["30–70km"]++;
      else if (depth >= 70 && depth < 300) depthBuckets["70–300km"]++;
      else if (depth >= 300) depthBuckets["300km+"]++;
    });

    drawDepthChart(depthBuckets);
  })
  .catch((error) => console.error(error));

// ---------- Drawing Wrappers ----------
function drawMagnitudeChart(dataObj) {
  drawBarChart(
    "#magnitude-chart",
    dataObj,
    "#ff6600",
    "#cc5200",
    "Earthquakes by Magnitude (2024–2025)",
    "Magnitude"
  );
}
function drawDurationChart(dataObj) {
  drawBarChart(
    "#duration-chart",
    dataObj,
    "#8e44ad",
    "#5e3370",
    "Estimated Duration of Earthquakes",
    "Duration (seconds)"
  );
}
function drawDepthChart(dataObj) {
  drawBarChart(
    "#depth-chart",
    dataObj,
    "#0077b6",
    "#023e8a",
    "Earthquakes by Depth",
    "Depth (km)"
  );
}

// ---------- Responsive Bar Chart Function ----------
function drawBarChart(container, dataObj, color, hoverColor, title, xLabel) {
  const data = Object.entries(dataObj).map(([label, value]) => ({
    label,
    value,
  }));

  const containerEl = document.querySelector(container);
  const width = containerEl.offsetWidth;
  const height = 450;
  const margin = { top: 30, right: 30, bottom: 60, left: 70 };

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(xLabel);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Number of Earthquakes");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .text(title);

  svg
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - margin.bottom - y(d.value))
    .attr("fill", color)
    .on('mouseover', function(event, d) {
      d3.select(this).transition()
        .duration(150)
        .attr("fill", "red")
        .attr("r", 4);
    
      d3.select('#tooltip')
        .style('opacity', 1)
        .style('z-index', 1000000)
        .html(`
          <div><strong>Location:</strong> ${d.place || 'Unknown'}</div>
          <div><strong>Magnitude:</strong> ${d.mag}</div>
          <div><strong>Depth:</strong> ${d.depth} km</div>
          <div><strong>Time:</strong> ${d.time.toLocaleString()}</div>
        `);
    })
    .on('mousemove', (event) => {
      d3.select('#tooltip')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).transition()
        .duration(150)
        .attr("fill", d => vis.colorScale(d.mag))
        .attr("r", d => vis.rScale(d.mag));
    
      d3.select('#tooltip')
        .style('opacity', 0);
    });
}

// ---------- Toggle + Layout ----------
document.querySelectorAll(".chart-toggle").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const selected = Array.from(
      document.querySelectorAll(".chart-toggle:checked")
    ).map((cb) => cb.value);

    const chartIds = {
      magnitude: "magnitude-chart",
      duration: "duration-chart",
      depth: "depth-chart",
    };

    Object.entries(chartIds).forEach(([key, id]) => {
      const el = document.getElementById(id);
      el.style.display = selected.includes(key) ? "block" : "none";
      el.classList.remove("chart-1", "chart-2", "chart-3");
    });

    const layoutClass = `chart-${selected.length}`;
    selected.forEach((key) => {
      const el = document.getElementById(chartIds[key]);
      el.classList.add(layoutClass);
    });
  });
});

function updateEarthquakeChart(startDate, endDate) {
  // Filter earthquakes within the selected date range
  const filteredData = fullData.filter(
    (d) => d.time >= startDate && d.time <= endDate
  );

  // Aggregate counts per month
  const earthquakeCounts = d3.rollup(
    filteredData,
    (v) => v.length,
    (d) => d3.timeFormat("%Y-%m")(d.time) // Format as YYYY-MM for monthly aggregation
  );

  // Convert to sorted array
  const data = Array.from(earthquakeCounts, ([date, count]) => ({
    date,
    count,
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  drawTimeSeriesChart(data);
}

function drawTimeSeriesChart(data) {
  const container = "#time-series-chart";
  d3.select(container).select("svg").remove(); // Clear previous chart

  const width = 800,
    height = 200,
    margin = { top: 30, right: 30, bottom: 60, left: 70 };

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.date))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat((d) => d));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.date))
    .attr("y", (d) => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - margin.bottom - y(d.count))
    .attr("fill", "#206373");
}

// updateEarthquakeChart(new Date("2015-01-01"), new Date("2016-03-31"));
