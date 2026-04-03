/* eslint-disable no-undef */
/**
 * Simple map
 */

// config map
const config = {
  minZoom: 2,
  maxZoom: 100,
};
// magnification with which the map will start
const zoom = 2;
// co-ordinates
const lat = 0;
const lng = 0;

// calling map
const map = L.map("map", config).setView([lat, lng], zoom);

// Used to load and display tile layers on the map
// Most tile servers require attribution, which you can set under `Layer`
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

function onEachFeature(feature, layer) {
  layer.bindPopup(feature.properties.nazwa);
}

// adding geojson by fetch
// of course you can use jquery, axios etc.
fetch("/map.geojson")
  .then((response) => response.json())
  .then((data) => {
    // use geoJSON
    L.geoJSON(data, {
      onEachFeature: onEachFeature,
    }).addTo(map);
  });
