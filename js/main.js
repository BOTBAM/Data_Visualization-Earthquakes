/**
 * File: main.js
 * Purpose:
 *   - Dynamically loads and filters earthquake data by month.
 *   - Parses relevant fields and passes the data to the LeafletMap class.
 *   - Acts as the main entry point for bootstrapping the visualization.
 */
let fullData = []; // Store unfiltered full dataset
let leafletMap;
let isRangeMode = false;
let monthsArray = [];

// Load CSV earthquake data asynchronously using D3
d3.csv("data/4-10M_(1995-today).csv")
  .then((data) => {
    console.log("number of items: " + data.length); // Debugging: log count of records loaded

    // Parse and clean all entries in the dataset
    data.forEach((d) => {
      // Convert string-based fields to numbers
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.depth = +d.depth;
      d.mag = +d.mag;

      // Parse time string into a proper Date object
      d.time = new Date(d.time);

      // Extract useful date components (used later for filtering/bucketing)
      d.year = d.time.getFullYear();
      d.month = d.time.getMonth();     // 0-based (Jan = 0)
      d.day = d.time.getDate();        // 1–31
    });

    // Store the cleaned dataset in a global variable
    fullData = data;

    // --- Initialize time series chart with a default range for first load ---
    updateEarthquakeChart(new Date("2015-01-01"), new Date("2016-03-31"));

    // --- Build a Set of unique months across the dataset ---
    const uniqueMonthsSet = new Set();
    fullData.forEach((d) => {
      const monthKey = `${d.time.getFullYear()}-${String(d.time.getMonth()).padStart(2, "0")}`;
      uniqueMonthsSet.add(monthKey); // Format: "YYYY-MM"
    });

    // --- Convert month strings back into Date objects and sort them chronologically ---
    const uniqueMonthsSorted = Array.from(uniqueMonthsSet)
      .map((key) => {
        const [year, month] = key.split("-");
        return new Date(+year, +month); // Create Date for each month
      })
      .sort((a, b) => a - b); // Ascending order

    // Save globally to be used by both single and dual-slider controls
    monthsArray = uniqueMonthsSorted;

    // --- DOM references for the slider and label ---
    const monthSlider = document.getElementById("monthSlider");
    const monthLabel = document.getElementById("monthLabel");

    // Configure slider bounds
    monthSlider.min = 0;
    monthSlider.max = monthsArray.length - 1;
    monthSlider.value = monthsArray.length - 1; // Start with latest month

    // Get the latest month (most recent in dataset)
    const latestMonth = monthsArray[monthsArray.length - 1];
    monthLabel.textContent = formatMonthLabel(latestMonth); // Label it

    // --- Filter initial dataset to only entries from the latest month ---
    const initialData = fullData.filter(
      (d) =>
        d.time.getFullYear() === latestMonth.getFullYear() &&
        d.time.getMonth() === latestMonth.getMonth()
    );

    // --- Create the map using only this month's data ---
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, initialData);

    // --- Hook up event for dragging the slider (single-thumb mode) ---
    monthSlider.addEventListener("input", function () {
      if (!isRangeMode) {
        const index = +this.value;
        const selectedMonth = monthsArray[index];

        // Update label to show selected month
        monthLabel.textContent = formatMonthLabel(selectedMonth);

        // Filter data to match selected month
        const filteredData = fullData.filter(
          (d) =>
            d.time.getFullYear() === selectedMonth.getFullYear() &&
            d.time.getMonth() === selectedMonth.getMonth()
        );

        // Push filtered data to map and charts
        leafletMap.setData(filteredData);
        updateEarthquakeChart(selectedMonth, selectedMonth);
        updateAllCharts(filteredData);
      }
    });

    // --- Expand into dual-thumb range mode on click ---
    monthSlider.addEventListener("click", () => {
      if (!isRangeMode) expandToCustomRangeSlider();
    });

    // --- On initial load, also show corresponding magnitude/duration/depth charts ---
    updateAllCharts(initialData);
  })
  .catch((error) => console.error(error)); // Catch and log any CSV loading issues


// -------- Utility to format a Date into "Mon YYYY" (e.g., "Jan 2024") for slider labels --------
function formatMonthLabel(date) {
  return date.toLocaleString("default", {
    month: "short",
    year: "numeric",
  });
}

// -------- Filters all data entries that match the given month and year --------
function filterDataByMonth(date) {
  return fullData.filter(
    (d) =>
      d.time.getFullYear() === date.getFullYear() &&
      d.time.getMonth() === date.getMonth()
  );
}

// -------- Expands the single-thumb slider into a dual-thumb (range) slider --------
function expandToCustomRangeSlider() {
  isRangeMode = true;

  // Get current index from slider, default range is centered around it (±1 month)
  const currentIndex = +document.getElementById("monthSlider").value;
  let startIndex = Math.max(0, currentIndex - 1);
  let endIndex = Math.min(monthsArray.length - 1, currentIndex + 1);

  // Replace slider HTML with custom dual-thumb range controls
  const controls = document.getElementById("controls");
  controls.innerHTML = `
    <div id="range-labels">
      <span id="rangeStartLabel"></span> - <span id="rangeEndLabel"></span>
    </div>
    <div id="range-slider">
      <div id="range-track"></div>
      <div id="thumb-start" class="range-thumb"></div>
      <div id="thumb-end" class="range-thumb"></div>
    </div>
  `;

  // References to range slider DOM elements
  const track = document.getElementById("range-track");
  const thumbStart = document.getElementById("thumb-start");
  const thumbEnd = document.getElementById("thumb-end");
  const startLabel = document.getElementById("rangeStartLabel");
  const endLabel = document.getElementById("rangeEndLabel");

  // ---- Helper: Position a thumb on the slider based on index (0–100%) ----
  function positionThumb(thumb, index) {
    const pct = (index / (monthsArray.length - 1)) * 100;
    thumb.style.left = `${pct}%`;
  }

  // ---- Helper: Updates label text, filtered data, and chart contents ----
  function update() {
    const startDate = monthsArray[startIndex];
    const endDate = monthsArray[endIndex];

    // Update range labels
    startLabel.textContent = formatMonthLabel(startDate);
    endLabel.textContent = formatMonthLabel(endDate);

    // Filter and display data across full system
    const filtered = fullData.filter((d) => d.time >= startDate && d.time <= endDate);
    leafletMap.setData(filtered);
    updateEarthquakeChart(startDate, endDate);
    updateAllCharts(filtered);

    // If both thumbs touch, collapse back into single slider
    if (startIndex === endIndex) {
      collapseToSingleSlider(startIndex);
    }
  }

  // Initial rendering
  positionThumb(thumbStart, startIndex);
  positionThumb(thumbEnd, endIndex);
  update();

  // Track which thumb is being dragged
  let activeThumb = null;

  // Start tracking on mouse down
  thumbStart.addEventListener("mousedown", () => (activeThumb = "start"));
  thumbEnd.addEventListener("mousedown", () => (activeThumb = "end"));

  // Stop tracking when mouse is released
  document.addEventListener("mouseup", () => (activeThumb = null));

  // Move the appropriate thumb and update state
  document.addEventListener("mousemove", (e) => {
    if (!activeThumb) return;

    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(pct * (monthsArray.length - 1));

    if (activeThumb === "start") {
      startIndex = Math.min(idx, endIndex); // Prevent crossing
      positionThumb(thumbStart, startIndex);
    } else {
      endIndex = Math.max(idx, startIndex);
      positionThumb(thumbEnd, endIndex);
    }

    update();
  });
}

// -------- Collapse back to the original single-thumb slider view --------
function collapseToSingleSlider(index) {
  isRangeMode = false;

  // Replace the controls with a standard slider and label
  const controls = document.getElementById("controls");
  controls.innerHTML = `
    <label for="monthSlider">Month: <span id="monthLabel"></span></label><br>
    <input type="range" id="monthSlider">
  `;

  const monthSlider = document.getElementById("monthSlider");
  const monthLabel = document.getElementById("monthLabel");

  // Setup new slider state
  monthSlider.min = 0;
  monthSlider.max = monthsArray.length - 1;
  monthSlider.value = index;

  const selectedMonth = monthsArray[index];
  monthLabel.textContent = formatMonthLabel(selectedMonth);

  // Set filtered view for that month
  const filtered = filterDataByMonth(selectedMonth);
  leafletMap.setData(filtered);
  updateEarthquakeChart(selectedMonth, selectedMonth);
  updateAllCharts(filtered);

  // Hook up slider interaction
  monthSlider.addEventListener("input", function () {
    if (!isRangeMode) {
      const idx = +this.value;
      const m = monthsArray[idx];
      monthLabel.textContent = formatMonthLabel(m);
      const filtered = filterDataByMonth(m);
      leafletMap.setData(filtered);
      updateEarthquakeChart(m, m);
      updateAllCharts(filtered);
    }
  });

  // Enable expanding to range mode on double-click
  monthSlider.addEventListener("dblclick", () => {
    if (!isRangeMode) expandToCustomRangeSlider();
  });
}

// ---------- Drawing Wrappers ----------
function drawMagnitudeChart(dataObj) {
  drawBarChart(
    "#magnitude-chart",
    dataObj,
    "#ff6600",
    "#cc5200",
    "Earthquakes by Magnitude",
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
  // Remove previous chart only if it's not already part of the update (improves latency)
  d3.select(container).select("svg").remove();

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

  // Axes
  svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y));

  // Labels
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

  // Bars (with transitions and join pattern)
  const bars = svg
    .selectAll("rect")
    .data(data, (d) => d.label)
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("x", (d) => x(d.label))
          .attr("width", x.bandwidth())
          .attr("y", (d) => y(d.value)) // initial height in place (for smoother transitions)
          .attr("height", 1) // Start collapsed
          .attr("fill", color)
          .call((enter) =>
            enter
              .transition()
              .duration(500)
              .attr("y", (d) => y(d.value))
              .attr("height", (d) => height - margin.bottom - y(d.value))
          ),
      (update) =>
        update.call((update) =>
          update
            .transition()
            .duration(500)
            .attr("x", (d) => x(d.label))
            .attr("y", (d) => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", (d) => height - margin.bottom - y(d.value))
            .attr("fill", color)
        ),
      (exit) =>
        exit.call((exit) =>
          exit
            .transition()
            .duration(300)
            .attr("y", y(0))
            .attr("height", 0)
            .remove()
        )
    );

  // Tooltip interaction
  bars
    .on("mouseover", function (event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr("fill", hoverColor);

      d3.select("#tooltip")
        .style("opacity", 1)
        .style("z-index", 1000000)
        .html(`<strong>${d.label}</strong>: ${d.value}`);
    })
    .on("mousemove", (event) => {
      d3.select("#tooltip")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseleave", function () {
      d3.select(this)
        .transition()
        .duration(150)
        .attr("fill", color);

      d3.select("#tooltip").style("opacity", 0);
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
    .attr("fill", "#ff6600");
}



// Added update function to pass currently selected data
function updateAllCharts(data) {
  d3.select("#magnitude-chart").select("svg").remove();
  d3.select("#duration-chart").select("svg").remove();
  d3.select("#depth-chart").select("svg").remove();

  drawMagnitudeChart(getMagnitudeBuckets(data));
  drawDurationChart(getDurationBuckets(data));
  drawDepthChart(getDepthBuckets(data));
}


function getMagnitudeBuckets(data) {
  const buckets = {
    "3.0–3.9": 0,
    "4.0–4.9": 0,
    "5.0–5.9": 0,
    "6.0–6.9": 0,
    "7.0–7.9": 0,
    "8.0+": 0,
  };

  data.forEach((d) => {
    const mag = d.mag;
    if (mag >= 3 && mag < 4) buckets["3.0–3.9"]++;
    else if (mag >= 4 && mag < 5) buckets["4.0–4.9"]++;
    else if (mag >= 5 && mag < 6) buckets["5.0–5.9"]++;
    else if (mag >= 6 && mag < 7) buckets["6.0–6.9"]++;
    else if (mag >= 7 && mag < 8) buckets["7.0–7.9"]++;
    else if (mag >= 8) buckets["8.0+"]++;
  });

  return buckets;
}

function getDurationBuckets(data) {
  const buckets = {
    "<10s": 0,
    "10–30s": 0,
    "30–60s": 0,
    "60–120s": 0,
    "120s+": 0,
  };

  data.forEach((d) => {
    const duration = Math.pow(10, 0.5 * d.mag);
    if (duration < 10) buckets["<10s"]++;
    else if (duration < 30) buckets["10–30s"]++;
    else if (duration < 60) buckets["30–60s"]++;
    else if (duration < 120) buckets["60–120s"]++;
    else buckets["120s+"]++;
  });

  return buckets;
}

function getDepthBuckets(data) {
  const buckets = {
    "0–10km": 0,
    "10–30km": 0,
    "30–70km": 0,
    "70–300km": 0,
    "300km+": 0,
  };

  data.forEach((d) => {
    const depth = d.depth;
    if (depth >= 0 && depth < 10) buckets["0–10km"]++;
    else if (depth >= 10 && depth < 30) buckets["10–30km"]++;
    else if (depth >= 30 && depth < 70) buckets["30–70km"]++;
    else if (depth >= 70 && depth < 300) buckets["70–300km"]++;
    else if (depth >= 300) buckets["300km+"]++;
  });

  return buckets;
}
