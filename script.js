/* eslint-disable no-undef */
/**
 * Simple map
 */

// config map
const config = {
  minZoom: 2,
  maxZoom: 20,
};

// magnification with which the map will start
const zoom = 2;
// co-ordinates
const lat = 0;
const lng = 0;

// calling map
const map = L.map("map", config).setView([lat, lng], zoom);

// Base Maps
const lightTiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxNativeZoom: 19,
  maxZoom: 22
});

const darkTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20
});

// Start in Light Mode
lightTiles.addTo(map);

// Overlay Layers
const clustered = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 16
});

const unclustered = L.layerGroup();

function makeTooltipText(feature) {
  const props = feature.properties || {};
  return props["Item Number"] || "Unknown item";
}

function makePopupHtml(feature) {
  const props = feature.properties || {};
  const itemNumber = props["Item Number"] || "Unknown item";
  const slug = props["Slug"] || "";
  const url = slug ? `https://scp-wiki.wikidot.com${slug}` : "";

  if (url) {
    return `
      <strong>${itemNumber}</strong><br>
      <a href="${url}" target="_blank" rel="noopener noreferrer">${slug}</a>
    `;
  }

  return `<strong>${itemNumber}</strong>`;
}

function pointStyle(feature, latlng) {
  const props = feature.properties || {};
  const color = props["marker-color"] || "rgba(0,0,0,1)";

  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: color,
    color: color,
    weight: 1,
    opacity: 1,
    fillOpacity: 1
  });
}

function attachFeatureEvents(feature, layer) {
  layer.bindTooltip(makeTooltipText(feature), {
    sticky: true,
    direction: "top",
    opacity: 0.95,
  });
  layer.bindPopup(makePopupHtml(feature));
}

fetch("./ColorMap.geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const geoJsonClustered = L.geoJSON(data, {
      pointToLayer: pointStyle,
      onEachFeature: attachFeatureEvents,
    });

    const geoJsonPlain = L.geoJSON(data, {
      pointToLayer: pointStyle,
      onEachFeature: attachFeatureEvents,
    });

    clustered.addLayer(geoJsonClustered);
    unclustered.addLayer(geoJsonPlain);

    // Start with Clustering On
    clustered.addTo(map);

    // Layer Controls
    L.control.layers(
      {
        "Light": lightTiles,
        "Dark": darkTiles
      },
      {
        "Clustered": clustered,
        "Unclustered": unclustered
      }
    ).addTo(map);

    if (clustered.getLayers().length > 0) {
      map.fitBounds(clustered.getBounds(), { padding: [20, 20] });
    }
  })
  .catch((error) => {
    console.error(error);
  });
