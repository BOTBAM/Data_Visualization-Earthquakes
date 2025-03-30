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
    }
    this.data = _data;
    this.initVis();
  }
  
  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;


    //ESRI
    vis.esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    vis.esriAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    //TOPO
    vis.topoUrl ='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    vis.topoAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

    //Thunderforest Outdoors- requires key... so meh... 
    vis.thOutUrl = 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}';
    vis.thOutAttr = '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    //Stamen Terrain
    vis.stUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}';
    vis.stAttr = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    //this is the base map layer, where we are showing the map background
    // (1) I left default to ESRI imagery, but you in screenshots you can see topoUrl, stUrl, etc.
    vis.base_layer = L.tileLayer(vis.esriUrl, {
      attribution: vis.esriAttr,
      ext: 'png'
    });

    vis.theMap = L.map('my-map', {
      center: [30, 0],
      zoom: 2,
      layers: [vis.base_layer]
    });
    // (2) CREATE SCALES FOR MAGNITUDE -> COLOR & RADIUS
    vis.colorScale = d3.scaleSequential()
      .domain(d3.extent(vis.data, d => d.mag))
      .interpolator(d3.interpolateReds); 

    // or really any other color scheme that I might change to later, e.g. interpolateViridis, interpolateBlues, etc.

    vis.rScale = d3.scaleLinear()
    .domain(d3.extent(vis.data, d => d.mag))
    .range([2, 10]); // Adjust as you like to highlight quake size
    

    

    //initialize svg for d3 to add to map
    L.svg({clickable:true}).addTo(vis.theMap)// we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane)
    vis.svg = vis.overlay.select('svg').attr("pointer-events", "auto")    

    //these are the city locations, displayed as a set of dots 
    vis.Dots = vis.svg.selectAll('circle')
                    .data(vis.data) 
                    .join('circle')
                        .attr("stroke", "black")
                        .attr("fill", d => vis.colorScale(d.mag))
                        .attr("r", d => vis.rScale(d.mag))
                        //Leaflet has to take control of projecting points. 
                        //Here we are feeding the latitude and longitude coordinates to
                        //leaflet so that it can project them on the coordinates of the view. 
                        //the returned conversion produces an x and y point. 
                        //We have to select the the desired one using .x or .y
                        .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
                        .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y) 
                        .on('mouseover', function(event,d) { //function to add mouseover event
                            d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                              .duration('150') //how long we are transitioning between the two states (works like keyframes)
                              .attr("fill", "red") //change the fill
                              .attr('r', d => vis.rScale(d.mag) * 1.6); //change radius to 1.6 times the original size (pops out kind of)

                            //create a tool tip
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
                            //position the tooltip
                            d3.select('#tooltip')
                             .style('left', (event.pageX + 10) + 'px')   
                              .style('top', (event.pageY + 10) + 'px');
                         })              
                        .on('mouseleave', function() { //function to add mouseover event
                            d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
                              .duration('150') //how long we are transitioning between the two states (works like keyframes)
                              .attr("fill", d => vis.colorScale(d.mag))
                              .attr("stroke", "black")
                              .attr("fill", d => vis.colorScale(d.mag))
                              .attr("r", d => vis.rScale(d.mag))

                            d3.select('#tooltip').style('opacity', 0);//turn off the tooltip

                          })
    
    //handler here for updating the map, as you zoom in and out           
    vis.theMap.on("zoomend", function(){
      vis.updateVis();
    });

  }

  setData(newData) {
    this.data = newData;
    this.updateVis(); // Re-render everything when switching years 
  }
  
  updateVis() {
    let vis = this;
  
    // Update scales in case magnitude range changed
    vis.colorScale.domain(d3.extent(vis.data, d => d.mag));
    vis.rScale.domain(d3.extent(vis.data, d => d.mag));
  
    // Re-bind circles to new data
    vis.Dots = vis.svg.selectAll('circle')
      .data(vis.data, d => d.id) // use a key if available to help D3 track elements
      .join(
        enter => enter.append('circle')
          .attr("stroke", "black")
          .attr("fill", d => vis.colorScale(d.mag))
          .attr("r", d => vis.rScale(d.mag))
          .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
          .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
          .on('mouseover', function(event,d) {
              d3.select(this).transition().duration(150).attr("fill", "red").attr('r', 4);
  
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
          .on('mouseleave', function() {
              d3.select(this).transition().duration(150)
                .attr("fill", d => vis.colorScale(d.mag))
                .attr('r', d => vis.rScale(d.mag));
  
              d3.select('#tooltip').style('opacity', 0);
          }),
        update => update
          .attr("fill", d => vis.colorScale(d.mag))
          .attr("r", d => vis.rScale(d.mag))
          .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
          .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y),
        exit => exit.remove()
      );
  }
  


  renderVis() {
    let vis = this;

    //not using right now... 
 
  }
}