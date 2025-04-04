/**
 * File: leafletMap.js
 * Purpose:
 *   - Defines the LeafletMap class, which integrates Leaflet (for map)
 *     and D3 (for visual overlays).
 *   - Creates a tile layer for the map background, sets up an SVG overlay
 *     for quake circles, and handles zoom/pan repositioning of elements.
 */

class LeafletMap {
  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
    };
    this.data = _data;
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;

    vis.currentViewData = vis.data; // Save visible data before brushing
    vis.defaultCenter = [20, 150];  // Default center
    vis.defaultZoom = 2.4;          // Default zoom


    //ESRI
    vis.esriUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    vis.esriAttr =
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

    //TOPO
    vis.topoUrl = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
    vis.topoAttr =
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

    //satelite Terrain
    vis.stadiaUrl = 'https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg';
    vis.stadiaAttr = '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    
      vis.baseLayers = {
        "Satellite (ESRI)": L.tileLayer(vis.esriUrl, {
          attribution: vis.esriAttr,
        }),
        "Topographic (OpenTopoMap)": L.tileLayer(vis.topoUrl, {
          attribution: vis.topoAttr,
        }),
        "Satellite (Stadia)": L.tileLayer(vis.stadiaUrl, {
          attribution: vis.stadiaAttr,
          ext: 'jpg',
          detectRetina: true
        }),
      };
      
    //this is the base map layer, where we are showing the map background
    // (1) I left default to ESRI imagery, but you in screenshots you can see topoUrl, stUrl, etc.
    // vis.base_layer = L.tileLayer(vis.esriUrl, {
    //   attribution: vis.esriAttr,
    //   ext: "png",
    // });

    vis.theMap = L.map("my-map", {
      center: [20, 150],
      zoom: 2.4,
      layers: [vis.baseLayers["Satellite (ESRI)"]],
      maxBounds: [
        [-185, -310], // Southwest corner of bounds
        [185, 370], // Northeast corner of bounds
      ],
      maxBoundsViscosity: 0.2, // How strongly bounds are enforced (1 = strict)
      minZoom: 2, // Prevent zooming out too far
      maxZoom: 8, // Optional: prevent zooming in too far
    });
    
    // Remove default top-right control (if you want)
    // L.control.layers(vis.baseLayers, null).addTo(vis.theMap);

    const layerSelect = document.getElementById("base-layer-select");
    layerSelect.addEventListener("change", function () {
      const selectedLayer = vis.baseLayers[this.value];
      if (selectedLayer) {
        // Remove existing base layer(s)
        Object.values(vis.baseLayers).forEach((layer) => {
          if (vis.theMap.hasLayer(layer)) vis.theMap.removeLayer(layer);
        });

        vis.theMap.addLayer(selectedLayer);
      }
    });

    // (2) CREATE SCALES FOR MAGNITUDE -> COLOR & RADIUS
    vis.colorScale = d3
      .scaleSequential()
      .domain(d3.extent(vis.data, (d) => d.mag))
      .interpolator(d3.interpolateReds);

    // or really any other color scheme that I might change to later, e.g. interpolateViridis, interpolateBlues, etc.

    vis.rScale = d3
      .scaleLinear()
      .domain(d3.extent(vis.data, (d) => d.mag))
      .range([2, 10]); // Adjust as you like to highlight quake size

    //initialize svg for d3 to add to map
    L.svg({ clickable: true }).addTo(vis.theMap); // we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
    vis.svg = vis.overlay.select("svg").attr("pointer-events", "auto");

    //these are the city locations, displayed as a set of dots
    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data)
      .join("circle")
      .attr("stroke", "black")
      .attr("fill", (d) => vis.colorScale(d.mag))
      .attr("r", (d) => vis.rScale(d.mag))
      //Leaflet has to take control of projecting points.
      //Here we are feeding the latitude and longitude coordinates to
      //leaflet so that it can project them on the coordinates of the view.
      //the returned conversion produces an x and y point.
      //We have to select the the desired one using .x or .y
      .attr(
        "cx",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
      )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
      )
      .on("mouseover", function (event, d) {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .attr("fill", "red") //change the fill
          .attr("r", (d) => vis.rScale(d.mag) * 1.6); //change radius to 1.6 times the original size (pops out kind of)

        //create a tool tip
        d3
          .select("#tooltip")
          .style("opacity", 1)
          .style("z-index", 1000000).html(`
                                <div><strong>Location:</strong> ${
                                  d.place || "Unknown"
                                }</div>
                                <div><strong>Magnitude:</strong> ${d.mag}</div>
                                <div><strong>Depth:</strong> ${d.depth} km</div>
                                <div><strong>Time:</strong> ${d.time.toLocaleString()}</div>
                            `);
      })
      .on("mousemove", (event) => {
        //position the tooltip
        d3.select("#tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseleave", function () {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .attr("fill", (d) => vis.colorScale(d.mag))
          .attr("stroke", "black")
          .attr("fill", (d) => vis.colorScale(d.mag))
          .attr("r", (d) => vis.rScale(d.mag));

        d3.select("#tooltip").style("opacity", 0); //turn off the tooltip
      })

      .on("click", function (event, d) {
        // If this quake is already selected, deselect it
        const isAlreadySelected = d3.select(this).classed("selected");
      
        // Reset all circles
        vis.Dots
          .classed("selected", false)
          .attr("r", (d) => vis.rScale(d.mag))
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      
        if (!isAlreadySelected) {
          // Highlight the clicked one
          d3.select(this)
            .classed("selected", true)
            .raise()
            .transition()
            .duration(200)
            .attr("r", vis.rScale(d.mag) * 2)
            .attr("stroke", "white")
            .attr("stroke-width", 2);
      
          if (typeof highlightLinkedCharts === "function") {
            highlightLinkedCharts(d); // highlight in timeline + bar chart
          }
        } else {
          // Deselect and remove any highlighting in charts
          if (typeof clearChartHighlights === "function") {
            clearChartHighlights(); // optional: write this to reset highlights
          }
        }
      });
      
           
    
    //handler here for updating the map, as you zoom in and out
    vis.theMap.on("zoomend", function () {
      vis.updateVis();
    });

    vis.brushRect = null;

    let isBrushMode = false;

    const toggleButton = document.getElementById("toggle-mode-btn");
    const resetButton = document.getElementById("reset-map-btn");

    toggleButton.addEventListener("click", () => {
      isBrushMode = !isBrushMode;
      if (isBrushMode) {
        vis.currentViewData = vis.data;
        vis.currentCenter = vis.theMap.getCenter();
        vis.currentZoom = vis.theMap.getZoom();
      }    
      
      toggleButton.textContent = isBrushMode ? "Pan Mode" : "Brush Mode";
      vis.theMap.dragging[isBrushMode ? "disable" : "enable"]();
    });

    resetButton.addEventListener("click", () => {
      if (vis.brushRect) {
        vis.theMap.removeLayer(vis.brushRect);
        vis.brushRect = null;
      }
      vis.setData(vis.currentViewData);
      updateAllCharts(vis.currentViewData);
      updateEarthquakeChart(
        d3.min(vis.currentViewData, (d) => d.time),
        d3.max(vis.currentViewData, (d) => d.time)
      );
      vis.theMap.setView(vis.currentCenter || vis.defaultCenter, vis.currentZoom || vis.defaultZoom);
      
    });


    vis.theMap.on("mousedown", function (e) {
      if (!isBrushMode) return;
    
      if (vis.brushRect) {
        vis.theMap.removeLayer(vis.brushRect);
        vis.brushRect = null;
      }
    
      const startLatLng = e.latlng;
    
      function onMouseMove(ev) {
        const endLatLng = ev.latlng;
        if (vis.brushRect) vis.theMap.removeLayer(vis.brushRect);
    
        vis.brushRect = L.rectangle(L.latLngBounds(startLatLng, endLatLng), {
          color: "#fb5c6a",
          weight: 2,
          fillOpacity: 0.1,
        }).addTo(vis.theMap);
      }
    
      function onMouseUp(ev) {
        vis.theMap.off("mousemove", onMouseMove);
        vis.theMap.off("mouseup", onMouseUp);
    
        if (!vis.brushRect) return;
    
        const bounds = vis.brushRect.getBounds();
        const filtered = vis.currentViewData.filter((d) =>
          bounds.contains(L.latLng(d.latitude, d.longitude))
        );
    
        vis.setData(filtered);
        updateAllCharts(filtered);
        updateEarthquakeChart(
          d3.min(filtered, (d) => d.time),
          d3.max(filtered, (d) => d.time)
        );
      }
    
      vis.theMap.on("mousemove", onMouseMove);
      vis.theMap.on("mouseup", onMouseUp);
    });
    

  }

  setData(newData) {
    this.data = newData;
    this.updateVis(); // Re-render everything when switching years
  }

  updateVis() {
    let vis = this;

    // Update scales in case magnitude range changed
    vis.colorScale.domain(d3.extent(vis.data, (d) => d.mag));
    vis.rScale.domain(d3.extent(vis.data, (d) => d.mag));

    // Re-bind circles to new data
    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data, (d) => d.id) // use a key if available to help D3 track elements
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("stroke", "black")
            .attr("fill", (d) => vis.colorScale(d.mag))
            .attr("r", (d) => vis.rScale(d.mag))
            .attr(
              "cx",
              (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
            )
            .attr(
              "cy",
              (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
            )
            .on("mouseover", function (event, d) {
              d3.select(this)
                .transition()
                .attr("fill", "red")
                .attr("r", 4);

              d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("z-index", 1000000).html(`
                  <div><strong>Location:</strong> ${d.place || "Unknown"}</div>
                  <div><strong>Magnitude:</strong> ${d.mag}</div>
                  <div><strong>Depth:</strong> ${d.depth} km</div>
                  <div><strong>Time:</strong> ${d.time.toLocaleString()}</div>
                `);
            })
            .on("mousemove", (event) => {
              d3.select("#tooltip")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px");
            })
            .on("mouseleave", function () {
              d3.select(this)
                .transition()
                .attr("fill", (d) => vis.colorScale(d.mag))
                .attr("r", (d) => vis.rScale(d.mag));

              d3.select("#tooltip").style("opacity", 0);
            }),
        (update) =>
          update
            .attr("fill", (d) => vis.colorScale(d.mag))
            .attr("r", (d) => vis.rScale(d.mag))
            .attr(
              "cx",
              (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x
            )
            .attr(
              "cy",
              (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y
            ),
        (exit) => exit.remove()
      );
  }

  renderVis() {
    let vis = this;

    //not using right now...
  }
}
