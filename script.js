/* eslint-disable no-undef */

// Config Map
const config = {
  minZoom: 2,
  maxZoom: 20,
  worldCopyJump: true,
};

// Starting Zoom
const initialZoom = 2;
// Starting Coords
const initialLat = 0;
const initialLng = 0;

// Calling Map
const map = L.map("map", config).setView([initialLat, initialLng], initialZoom);

//Base Maps
const lightTiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxNativeZoom: 19,
  maxZoom: 22,
});

const darkTiles = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
);

// Start in Light Mode
lightTiles.addTo(map);

// Overlay Layers
const clustered = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 16,
});

const unclustered = L.layerGroup();
const searchEntries = [];
let geocodeMarker = null;
let lastGeocodeTime = 0;

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchOptions = document.getElementById("search-options");
const searchStatus = document.getElementById("search-status");

function normalizeValue(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function makeTooltipText(feature) {
  const props = feature.properties || {};
  return props["Item Number"] || "Unknown item";
}

function makePopupHtml(feature) {
  const props = feature.properties || {};
  const itemNumber = props["Item Number"] || "Unknown item";
  const slug = props["Slug"] || "";
  const url = slug ? `https://scp-wiki.wikidot.com${slug}` : "";

  return `
    <strong>${itemNumber}</strong>
    ${url ? `<br><a href="${url}" target="_blank" rel="noopener noreferrer">${slug}</a>` : ""}
  `;
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
    fillOpacity: 1,
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

function getSearchTerms(properties = {}) {
  const itemNumber = properties["Item Number"] || "";
  return [itemNumber].filter(Boolean);
}

// Search Box
function buildSearchIndex(geoJsonLayer) {
  const optionValues = new Set();

  geoJsonLayer.eachLayer((layer) => {
    const feature = layer.feature || {};
    const properties = feature.properties || {};
    const terms = getSearchTerms(properties);
    const label = properties["Item Number"] || "Unknown item";

    searchEntries.push({
      label,
      terms,
      layer,
    });

    terms.forEach((term) => optionValues.add(term));
  });

  [...optionValues]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      searchOptions.appendChild(option);
    });
}

function normalizeItemNumber(query) {
  const match = query.match(/\d+/);
  return match ? `scp-${match[0]}` : query.toLowerCase();
}

function findMarkerMatch(query) {
  const normalizedQuery = normalizeItemNumber(query);
  if (!normalizedQuery) return null;

  const exactMatch = searchEntries.find((entry) =>
    entry.terms.some((term) => normalizeValue(term) === normalizedQuery)
  );

  if (exactMatch) return exactMatch;

  return searchEntries.find((entry) =>
    entry.terms.some((term) => normalizeValue(term).includes(normalizedQuery))
  );
}

function zoomToSearchResult(result) {
  if (!result || !result.layer) return;

  clustered.zoomToShowLayer(result.layer, () => {
    const latLng = result.layer.getLatLng();
    map.flyTo(latLng, 8, { duration: 0.7 });
    result.layer.openPopup();
  });
}

function clearGeocodeMarker() {
  if (geocodeMarker) {
    map.removeLayer(geocodeMarker);
    geocodeMarker = null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodePlace(query) {
  const now = Date.now();
  const elapsed = now - lastGeocodeTime;

  if (elapsed < 1100) {
    await sleep(1100 - elapsed);
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  lastGeocodeTime = Date.now();

  if (!response.ok) {
    throw new Error(`Geocoder failed with status ${response.status}`);
  }

  const results = await response.json();
  return results[0] || null;
}

function showGeocodeResult(place) {
  clearGeocodeMarker();

  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);

  geocodeMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(`<strong>${place.display_name}</strong>`);

  map.flyTo([lat, lon], 8, { duration: 0.8 });
  geocodeMarker.openPopup();
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (!query) {
    searchStatus.textContent = "Enter an Article Number or Place.";
    return;
  }

  const markerMatch = findMarkerMatch(query);
  if (markerMatch) {
    clearGeocodeMarker();
    searchStatus.textContent = `Jumped to ${markerMatch.label}.`;
    zoomToSearchResult(markerMatch);
    return;
  }

  // Block Missing Articles from Querying Geocoder
  if (/scp/i.test(query)) {
    searchStatus.textContent = `No SCP found for "${query}".`;
  return;
  }

  searchStatus.textContent = `Searching for place: ${query}...`;

  try {
    const place = await geocodePlace(query);

    if (!place) {
      searchStatus.textContent = `No marker or place found for "${query}".`;
      return;
    }

    showGeocodeResult(place);
    searchStatus.textContent = `Jumped to ${place.display_name}.`;
  } catch (error) {
    console.error(error);
    searchStatus.textContent = "Place search failed.";
  }
});

fetch("./ColorMap3.geojson")
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
    // Start With Clustering On
    clustered.addTo(map);

    buildSearchIndex(geoJsonClustered);

    // Layering Controls
    L.control.layers(
      {
        Light: lightTiles,
        Dark: darkTiles,
      },
      {
        Clustered: clustered,
        Unclustered: unclustered,
      }
    ).addTo(map);

    if (clustered.getLayers().length > 0) {
      map.fitBounds(clustered.getBounds(), { padding: [20, 20] });
    }

    searchStatus.textContent =
      "Search by SCP Number (\'SCP-XXXX\') or location.";
  })
  .catch((error) => {
    console.error(error);
    searchStatus.textContent = "Could not load map data.";
  });
