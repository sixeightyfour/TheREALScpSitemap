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

// Used to load and display tile layers on the map
// Most tile servers require attribution, which you can set under `Layer`
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxNativeZoom: 19,
  maxZoom: 22
}).addTo(map);

const markers = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 16
});

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


fetch("./map (20).geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    const geoJsonLayer = L.geoJSON(data, {
      pointToLayer(feature, latlng) {
        return L.marker(latlng);
      },
      
      onEachFeature(feature, layer) {
        layer.bindTooltip(makeTooltipText(feature), {
          sticky: true,
          direction: "top",
          opacity: 0.95,
        });
        layer.bindPopup(makePopupHtml(feature));
      },
    });

    markers.addLayer(geoJsonLayer);
    map.addLayer(markers);

    if (markers.getLayers().length > 0) {
      map.fitBounds(markers.getBounds(), { padding: [20, 20] });
    }
  })
  .catch((error) => {
    console.error(error);
  });
