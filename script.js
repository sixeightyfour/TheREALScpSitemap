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
  const props = feature.properties || {};

  const itemNumber = props["Item Number"] || "Unknown item";
  const slug = props["Slug"] || "";
  const url = slug ? `https://scp-wiki.wikidot.com${slug}` : null;

  const tooltipHtml = url
    ? `<strong><a href="${url}" target="_blank" rel="noopener noreferrer">${itemNumber}</a></strong>`
    : `<strong>${itemNumber}</strong>`;

  layer.bindTooltip(tooltipHtml, {
    sticky: true,
    direction: "top",
    opacity: 0.95,
  });

  // Optional: keep click popup too
  if (url) {
    layer.bindPopup(
      `<strong>${itemNumber}</strong><br><a href="${url}" target="_blank" rel="noopener noreferrer">${slug}</a>`
    );
  }
}


fetch("./map (11).geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const geoJsonLayer = L.geoJSON(data, {
      onEachFeature,
    }).addTo(map);

    map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
  })
  .catch((error) => {
    console.error(error);
  });
