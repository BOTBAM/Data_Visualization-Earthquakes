/**
 * File: main.js
 * Purpose:
 *   - Loads the CSV data (2024-2025.csv) using D3.
 *   - Parses relevant fields and passes the data to the LeafletMap class.
 *   - Acts as the main entry point for bootstrapping the visualization.
 */

d3.csv('data/2024-2025.csv')
  .then(data => {
    console.log("number of items: " + data.length);

    data.forEach(d => {
      // I converted strings to numeric to avoid type-mismatch errors
      d.latitude = +d.latitude;
      d.longitude = +d.longitude;
      d.depth = +d.depth;
      d.mag = +d.mag;

      // Tried converting time to play around with a Date object (couldn't figure out some nuances so commented out for now)
      // d.time = new Date(d.time);

    });

    // Initialize LeafletMap with the quake data
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, data);
  })
  .catch(error => console.error(error));
