mapboxgl.accessToken = '';

//Retrieve HTML elements for functionalities 
const mapDiv = document.getElementById('map');
const sliderContainer = document.getElementById('sliderContainer');
const heatmapButton = document.getElementById('heatmapButton');
const co2button = document.getElementById('co2button');
const homepageButton = document.querySelector('.homepage-button');
let currentProjection = 'geoAugust';

//Function that handles backgorund image across multiple views
function toggleBackgroundImage(showImage) {
    if (showImage) {
        document.body.classList.remove('no-background-image');
    } else {
        document.body.classList.add('no-background-image');
    }
}

//Listener that switches the map layout for the choropleth map
choroplethButton.addEventListener('click', function () {
    if (currentProjection === 'geoAugust') {
        d3.select("svg").remove();
        initializeChoropleth('geoAitoff'); 
    } else if (currentProjection === 'geoAitoff') {
        d3.select("svg").remove();
        initializeChoropleth('geoAugust'); 
    }
});

//Change the view to the mapbox heatmap
heatmapButton.addEventListener('click', function () {
    mapDiv.style.display = 'block';
    sliderContainer.style.display = 'block';
    document.querySelector('.legend').style.display = 'none';
    document.querySelector('.note-text').style.display = 'block';
    homepageButton.style.display = 'block';
    document.querySelector('.available-views-text').style.display = 'none';
    document.querySelector('.dashboard-title').style.display = 'none';
    toggleBackgroundImage(false); 
    initializeHeatmap();
    
});

//Change the view to the chroropleth heatmap
co2button.addEventListener('click', function () {
    initializeChoropleth(currentProjection);
    document.querySelector('.button-container').style.display = 'none';
    document.querySelector('.legend').style.display = 'block';
    document.querySelector('.available-views-text').style.display = 'none';
    document.querySelector('.dashboard-title').style.display = 'none';
    homepageButton.style.display = 'block';
    choroplethButton.style.display = 'block';
    toggleBackgroundImage(false); 
});

//Change the view back to the dashboard
homepageButton.addEventListener('click', function () {
    mapDiv.style.display = 'none';
    sliderContainer.style.display = 'none';
    document.querySelector('.button-container').style.display = 'block';
    document.querySelector('.legend').style.display = 'none';
    homepageButton.style.display = 'none';
    document.querySelector('.available-views-text').style.display = 'block';
    document.querySelector('.dashboard-title').style.display = 'block';
    document.querySelector('.note-text').style.display = 'none';
    toggleBackgroundImage(true); 
    choroplethButton.style.display = 'none';
    d3.select("svg").remove();
});

//Create the choropleth map with the correct map layout
function initializeChoropleth(projectionType) {
    var w = 875;
    var h = 520;
    
    switch (projectionType) {
        case 'geoAugust':
            currentProjection = 'geoAugust';
            break;
        case 'geoAitoff':
            currentProjection = 'geoAitoff';
            break;
        default:
            break;
    }

    var projection = d3[currentProjection]();

    var path = d3.geoPath().projection(projection);

    var svg = d3.select("svg");

    //Handle svgs between map views
    if (!svg.empty()) {
        svg.selectAll("path").remove();
    } else {
        svg = d3.select("body")
            .append("svg")
            .attr("width", w)
            .attr("height", h);
    }
    
    //Create the choropleth map from the country shapes and the emissions data
    d3.queue()
        .defer(d3.json, "world-countries.json")
        .defer(d3.csv, 'emissions.csv')
        .await(function (error, json, data) {
            if (error) throw error;
            
            colorScale = d3.scaleQuantize().nice()
                .range(["rgb(237,248,233)", "rgb(186,228,179)", "rgb(116,196,118)", "rgb(49,163,84)", "rgb(0,109,44)", "rgb(0,68,27)"]);

            colorScale.domain([
                d3.min(data, function (d) { return d.Total;}),
                d3.max(data, function (d) { return d.Total; })
            ]);
            
            //Map the data to the country shapes in the json file
            for (var i = 0; i < data.length; i++) {
                var dataState = data[i].Country;
                var dataValue = parseFloat(data[i].Total);

                for (var j = 0; j < json.features.length; j++) {
                    var jsonState = json.features[j].properties.name;

                    if (dataState == jsonState) {
                        json.features[j].properties.value = dataValue;
                        break;
                    }
                }
            }

            svg.selectAll("path").remove();

            //Fill the map with the color scale, country name, and data
            svg.selectAll("path")
                .data(json.features)
                .enter()
                .append("path")
                .attr("d", path)
                .style("fill", function (d) {
                    var value = d.properties.value;
                    if (value || value === 0) {
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
                })
                .append("title") // Add a title (tooltip) for each state
                .text(function (d) {
                    // Show the state name and value in the tooltip
                    return d.properties.name + ": " + (d.properties.value || "No data");
                });
        });
}

//Create the mapbox heatmap layer
function initializeHeatmap() {
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [-95, 40],
        zoom: 3
    });

    map.on('load', function () {
        let currentSource = null;

        // Function to add or update the heatmap layer
        function addHeatmapLayer(dataURL) {
            if (currentSource) {
                map.removeLayer('heatmapLayer');
                map.removeSource('heatmapSource');
            }

            map.addSource('heatmapSource', {
                type: 'geojson',
                data: dataURL
            });

            map.addLayer({
                id: 'heatmapLayer',
                type: 'heatmap',
                source: 'heatmapSource',
                paint: {
                // Increase the heatmap weight based on frequency and temperature value
                'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['get', 'temperature'],
                    0, 0,
                    100, 1 
                ],
                // Increase the heatmap color intensity based on zoom level
                'heatmap-intensity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 1,
                    9, 1
                ],
                // Adjust the heatmap radius by zoom level
                'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 2,
                    9, 60
                ],
                // Color ramp for the heatmap
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                ],
                // Adjust the heatmap opacity
                'heatmap-opacity': 0.8
            }
            
        });
        currentSource = dataURL;
    }
    addHeatmapLayer('https://storage.googleapis.com/geojson360/output2018.geojson');
    
    //Event listener that updates data based on selection of year
    document.getElementById('yearSlider').addEventListener('input', function (e) {
    const selectedYear = e.target.value;
    const newDatasetURL = `https://storage.googleapis.com/geojson360/output${selectedYear}.geojson`;
    addHeatmapLayer(newDatasetURL);
    });
    });
}
