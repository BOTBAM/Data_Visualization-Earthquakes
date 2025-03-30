/**
 * File: main.js
 * Purpose:
 *   - Loads the CSV data (2024-2025.csv) using D3.
 *   - Parses relevant fields and passes the data to the LeafletMap class.
 *   - Acts as the main entry point for bootstrapping the visualization.
 */
let fullData = [];  // Store unfiltered full dataset
let leafletMap;


d3.csv('data/4-10M_(1995-today).csv')
  .then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {
      // I converted strings to numeric to avoid type-mismatch errors
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.depth = +d.depth;
      d.mag = +d.mag;
      d.time = new Date(d.time);  // Parse date
      d.year = d.time.getFullYear(); // Extract year for filtering
    });

    fullData = data;

    // Initialize with 2025 data
    const initialData = fullData.filter(d => d.year === 2025);
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, initialData);

    // Hook up slider interaction
    document.getElementById('yearSlider').addEventListener('input', function() {
      const selectedYear = +this.value;
      document.getElementById('yearLabel').textContent = selectedYear;
    
      const yearData = fullData.filter(d => d.year === selectedYear);
      leafletMap.setData(yearData);  // ← now dynamically updates the map!
    });
  })
.catch(error => console.error(error));
