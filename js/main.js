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
let isAnimating = false;
let intervalId = null;

const selectedMagnitudes = new Set();
const selectedDepths = new Set();

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
      d.month = d.time.getMonth(); // 0-based (Jan = 0)
      d.day = d.time.getDate(); // 1–31
    });

    // Store the cleaned dataset in a global variable
    fullData = data;

    // --- Initialize time series chart with a default range for first load ---
    updateEarthquakeChart(new Date("2015-01-01"), new Date("2015-01-31"));

    // --- Build a Set of unique months across the dataset ---
    const uniqueMonthsSet = new Set();
    fullData.forEach((d) => {
      const monthKey = `${d.time.getFullYear()}-${String(
        d.time.getMonth()
      ).padStart(2, "0")}`;
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
            d.time.getMonth() === selectedMonth.getMonth() &&
            d.time.getDate() === selectedMonth.getDate()
        );

        // Push filtered data to map and charts
        leafletMap.setData(filteredData);
        updateEarthquakeChart(selectedMonth, selectedMonth);
        console.log("First " + selectedMonth);
        updateAllCharts(filteredData);
      }
    });

    // --- Expand into dual-thumb range mode on click ---
    monthSlider.addEventListener("click", () => {
      if (!isRangeMode) expandToCustomRangeSlider();
    });

    // --- On initial load, also show corresponding magnitude/depth charts ---
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
    <div id="range-slider">
      <div id="range-track"></div>
      <div id="thumb-start" class="range-thumb"></div>
      <div id="thumb-end" class="range-thumb"></div>
    </div>
    <div id="range-labels" style="margin-top: 6px; text-align: center;">
      <span id="rangeStartLabel" style="font-weight: bold;"></span> - 
      <span id="rangeEndLabel" style="font-weight: bold;"></span>
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
    const filtered = fullData.filter(
      (d) => d.time >= startDate && d.time <= endDate
    );
    leafletMap.setData(filtered);
    updateEarthquakeChart(startDate, endDate);
    console.log("Second, Start: " + startDate + " end: " + endDate);

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
    <input type="range" id="monthSlider">
    <label for="monthSlider">Month: <span id="monthLabel"></span></label><br>
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
      updateVisuals(index);
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
    "#01d1ff",
    "#f15969",
    "Earthquakes by Magnitude",
    "Magnitude"
  );
}
function drawDepthChart(dataObj) {
  drawBarChart(
    "#depth-chart",
    dataObj,
    "#e5c852",
    "#0ed354",
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
  const height = 350;
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
    .style("fill", "white")
    .text(xLabel);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "white")
    .text("Number of Earthquakes");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("fill", "white")
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
        .attr("y", (d) => y(d.value)) // Start at correct top
        .attr("height", (d) => height - margin.bottom - y(d.value))
        .attr("fill", (d) => {
          const selected =
            (xLabel === "Magnitude" && selectedMagnitudes.has(d.label)) ||
            (xLabel === "Depth (km)" && selectedDepths.has(d.label));
          return selected ? hoverColor : color;
        }),
        
    (update) =>
      update.call((update) =>
        update
          .transition()
          .delay((d, i) => i * 30) // Delay each bar by 30ms per index
          .ease(d3.easeCubicInOut)
          .attr("y", (d) => y(d.value)) // new top
          .attr("height", (d) => height - margin.bottom - y(d.value)) // new height from new top
          .attr("fill", (d) => {
            const selected =
              (xLabel === "Magnitude" && selectedMagnitudes.has(d.label)) ||
              (xLabel === "Depth (km)" && selectedDepths.has(d.label));
            return selected ? hoverColor : color;
          }),
          
    (exit) =>
      exit.call((exit) =>
        exit
          .transition()
          .attr("y", y(0))
          .attr("height", 0)
          .remove()
      ))
  );


  // Tooltip interaction
  bars
    .on("mouseover", function (event, d) {
      d3.select(this).transition().attr("fill", hoverColor);

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
      d3.select(this).transition().attr("fill", color);

      d3.select("#tooltip").style("opacity", 0);
    })
    .on("click", function (event, d) {
      const label = d.label;
      if (xLabel === "Magnitude") {
        if (selectedMagnitudes.has(label)) {
          selectedMagnitudes.delete(label);
        } else {
          selectedMagnitudes.add(label);
        }
      } else if (xLabel === "Depth (km)") {
        if (selectedDepths.has(label)) {
          selectedDepths.delete(label);
        } else {
          selectedDepths.add(label);
        }
      }
      applyFilters();
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
  // Filters the earthquakes within the selected date range

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  const filteredData = fullData.filter(
    (d) => d.time >= startDate && d.time <= endDate
  );

  // Determine the time difference
  const timeDiff = endDate - startDate;
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert to days

  // Determine aggregation level
  let timeFormat, groupBy;
  if (daysDiff <= 31) {
    // If range is within a month, group by day
    timeFormat = "%Y-%m-%d";
    groupBy = (d) => d3.timeFormat(timeFormat)(d.time);
  } else if (daysDiff <= 730) {
    // If range is within ~2 years, group by month
    timeFormat = "%Y-%m";
    groupBy = (d) => d3.timeFormat(timeFormat)(d.time);
  } else {
    // If range is longer, group by year or every few months
    timeFormat = "%Y";
    groupBy = (d) => d3.timeFormat(timeFormat)(d.time);
  }

  // Aggregate counts
  const earthquakeCounts = d3.rollup(filteredData, (v) => v.length, groupBy);

  // Convert to sorted array
  const data = Array.from(earthquakeCounts, ([date, count]) => ({
    date,
    count,
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  drawTimeSeriesChart(data, startDate, endDate);
}

function drawTimeSeriesChart(data, startDate, endDate) {
  const container = "#time-series-chart";
  d3.select(container).select("svg").remove(); // Clear previous chart

  const width = 1000,
    height = 200,
    margin = { top: 30, right: 30, bottom: 80, left: 70 };

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Calculate the range in days
  const timeDiff = endDate - startDate;
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24); // Convert to days

  let tickFormat, tickInterval;
  if (daysDiff <= 31) {
    tickFormat = "%d %b"; // Day and month (e.g., "01 Jan")
    tickInterval = Math.ceil(data.length / 7); // Show every 5-7 days
  } else if (daysDiff <= 730) {
    tickFormat = "%b %Y"; // Month and year (e.g., "Jan 2016")
    tickInterval = Math.ceil(data.length / 10); // Show every 2-3 months
  } else {
    tickFormat = "%Y"; // Year only
    tickInterval = Math.ceil(data.length / 10); // Show every 1-2 years
  }

  // Define scales
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

  // X-axis with dynamic tick selection
  const xAxis = d3
    .axisBottom(x)
    .tickValues(
      data
        .map((d, i) => (i % tickInterval === 0 ? d.date : null))
        .filter((d) => d)
    )
    .tickFormat((d) => d3.timeFormat(tickFormat)(new Date(d)));

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("fill", "white")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-25)")
    .style("font-size", "12px");

  // Y-axis with intermediate ticks
  const yAxis = d3
    .axisLeft(y)
    .ticks(5) // Only show 5 ticks for intermediate labels (adjust as needed)
    .tickFormat(d3.format(".0f")); // Format the ticks (e.g., no decimal places)

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis)
    .selectAll("text")
    .style("fill", "white")
    .style("font-size", "12px");

  svg
    .selectAll(".domain") // Select the axis line (the "domain" is the line of the axis)
    .style("stroke", "white") // Set the stroke (line) color to white
    .style("stroke-width", 1); // Optional: Adjust stroke width if necessary

  // Draw bars
  svg
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.date))
    .attr("y", (d) => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - margin.bottom - y(d.count))
    .attr("fill", "#01d1ff");
}

// Added update function to pass currently selected data
function updateAllCharts(data) {
  d3.select("#magnitude-chart").select("svg").remove();
  d3.select("#depth-chart").select("svg").remove();

  drawMagnitudeChart(getMagnitudeBuckets(data));
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

function updateVisuals(index) {
  const selectedMonth = monthsArray[index];
  monthLabel.textContent = formatMonthLabel(selectedMonth);
  // Corrected filter: include all days in the month
  const filteredData = fullData.filter(
    (d) =>
      d.time.getFullYear() === selectedMonth.getFullYear() &&
      d.time.getMonth() === selectedMonth.getMonth()
  );
  leafletMap.setData(filteredData);
  updateEarthquakeChart(selectedMonth, selectedMonth);
  updateAllCharts(filteredData);
}

function startAnimation() {
  isAnimating = true;
  document.getElementById("animation-btn").textContent = "Stop";
  const slider = document.getElementById("monthSlider");
  slider.value = 0; // Start from the first month
  updateVisuals(0);
  intervalId = setInterval(() => {
    if (+slider.value >= +slider.max) {
      stopAnimation();
      return;
    }
    slider.value++;
    updateVisuals(slider.value);
  }, 500); // Adjust speed (milliseconds)
}

function stopAnimation() {
  isAnimating = false;
  document.getElementById("animation-btn").textContent = "Animate";
  clearInterval(intervalId);
  intervalId = null;
}

// Toggle animation on button click
document.getElementById("animation-btn").addEventListener("click", () => {
  isAnimating ? stopAnimation() : startAnimation();
});

function applyFilters() {
  let filtered = fullData;

  // Filter by selected magnitudes
  if (selectedMagnitudes.size > 0) {
    filtered = filtered.filter((d) =>
      selectedMagnitudes.has(getMagnitudeLabel(d.mag))
    );
  }

  // Filter by selected depths
  if (selectedDepths.size > 0) {
    filtered = filtered.filter((d) =>
      selectedDepths.has(getDepthLabel(d.depth))
    );
  }

  // Push filtered data to map and charts
  leafletMap.setData(filtered);

  const minDate = d3.min(filtered, (d) => d.time);
  const maxDate = d3.max(filtered, (d) => d.time);
  updateEarthquakeChart(minDate || new Date("1995-01-01"), maxDate || new Date());
  updateAllCharts(filtered);
}

function getMagnitudeLabel(mag) {
  if (mag >= 3 && mag < 4) return "3.0–3.9";
  if (mag >= 4 && mag < 5) return "4.0–4.9";
  if (mag >= 5 && mag < 6) return "5.0–5.9";
  if (mag >= 6 && mag < 7) return "6.0–6.9";
  if (mag >= 7 && mag < 8) return "7.0–7.9";
  if (mag >= 8) return "8.0+";
  return "Other";
}

function getDepthLabel(depth) {
  if (depth >= 0 && depth < 10) return "0–10km";
  if (depth >= 10 && depth < 30) return "10–30km";
  if (depth >= 30 && depth < 70) return "30–70km";
  if (depth >= 70 && depth < 300) return "70–300km";
  if (depth >= 300) return "300km+";
  return "Other";
}
