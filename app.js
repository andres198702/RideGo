/* =========================================================
   app.js — Lógica principal de RideGo
   Conecta las 6 APIs mockeadas con la UI y el mapa Leaflet.
   ========================================================= */

// ---------- Estado global de la app ----------
const state = {
  origin: null,       // { place_id, name, address, lat, lng }
  destination: null,
  route: null,        // Respuesta de Google Directions
  priceEstimates: [],
  timeEstimates: [],
  selectedProduct: null,
  markers: { origin: null, destination: null, live: null },
  routePolyline: null,
  watchId: null,      // ID del watchPosition activo
  accuracyCircle: null,
  driverMarkers: [],  // Marcadores de conductores simulados
  drivers: [],        // Datos de conductores cercanos
  driverRoutePolyline: null,
  driverRoutePath: null,
  selectedDriverId: null,
  routePath: null,    // Cachea el path actual origen→destino
  placeCache: {},     // place_id → { name, address, lat, lng } para lugares externos
};

// ---------- Inicialización del mapa ----------
const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
}).setView([6.2442, -75.5812], 12); // Centro en Medellín

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19,
}).addTo(map);

// ---------- Referencias al DOM ----------
const $ = (id) => document.getElementById(id);
const originInput = $("originInput");
const destinationInput = $("destinationInput");
const originSuggestions = $("originSuggestions");
const destinationSuggestions = $("destinationSuggestions");
const searchBtn = $("searchBtn");
const resultsSection = $("resultsSection");
const rideOptions = $("rideOptions");
const requestBtn = $("requestBtn");
const rideStatus = $("rideStatus");
const apiStatus = $("apiStatus");

// ---------- Sistema de logging de APIs ----------
function logAPI(method, endpoint, status = "200 OK") {
  const logList = $("logList");
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString("es-CO", { hour12: false });
  li.innerHTML = `
    <span><span class="log-method">${method}</span> ${time}</span>
    <span class="log-endpoint">${endpoint}</span>
    <span class="log-status">→ ${status}</span>
  `;
  logList.prepend(li);

  // Indicador de estado
  apiStatus.textContent = `${method} ${endpoint.split("?")[0].split("/").pop()}`;
  setTimeout(() => {
    apiStatus.textContent = "Listo";
  }, 1500);
}

// Toggle del panel de logs
$("toggleLog").addEventListener("click", () => {
  $("apiLog").classList.toggle("collapsed");
  $("toggleLog").textContent = $("apiLog").classList.contains("collapsed")
    ? "+"
    : "—";
});

// ---------- Estado del botón de búsqueda ----------
function updateSearchBtnState() {
  const hasOrigin = !!state.origin || originInput.value.trim().length >= 2;
  const hasDest = !!state.destination || destinationInput.value.trim().length >= 2;
  searchBtn.disabled = !(hasOrigin && hasDest);
}

// ---------- Debounce para autocompletado ----------
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// =========================================================
// AUTOCOMPLETADO (API 1: Google Places Autocomplete)
// =========================================================
function setupAutocomplete(inputEl, suggestionsEl, field) {
  // Invalida selección previa si el texto cambia y ya no coincide;
  // habilita el botón con solo tener texto en ambos campos.
  inputEl.addEventListener("input", () => {
    if (state[field] && inputEl.value.trim() !== state[field].name) {
      state[field] = null;
    }
    updateSearchBtnState();
  });

  const handleInput = debounce(async () => {
    const value = inputEl.value.trim();
    if (value.length < 2) {
      suggestionsEl.classList.remove("visible");
      return;
    }

    logAPI("GET", `/maps/api/place/autocomplete/json?input=${encodeURIComponent(value)}`);
    const local = (await MockAPI.autocomplete(value)).predictions;

    // Muestra locales al instante, luego enriquece con Nominatim
    renderSuggestions(local, suggestionsEl, field);

    try {
      const remote = await nominatimSearch(value);
      // Evita duplicados por nombre + dirección
      const seen = new Set(local.map((p) => p.description.toLowerCase()));
      const extra = remote.filter(
        (r) => !seen.has(r.description.toLowerCase())
      );
      const merged = [...local, ...extra];
      inputEl.dataset.lastPredictions = JSON.stringify(merged);
      renderSuggestions(merged, suggestionsEl, field);
    } catch (err) {
      console.warn("Nominatim falló, usando solo locales:", err.message);
      inputEl.dataset.lastPredictions = JSON.stringify(local);
    }
  }, 350);

  inputEl.addEventListener("input", handleInput);

  // Enter: selecciona la primera sugerencia
  inputEl.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const first = suggestionsEl.querySelector("li[data-place-id]");
    if (first) {
      await selectPlace(first.dataset.placeId, field);
    } else {
      // No hay lista visible; intenta resolver por el texto actual
      await resolveFromText(inputEl, field);
    }
  });

  // Ocultar sugerencias al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!inputEl.contains(e.target) && !suggestionsEl.contains(e.target)) {
      suggestionsEl.classList.remove("visible");
    }
  });
}

async function resolveFromText(inputEl, field) {
  const value = inputEl.value.trim();
  if (value.length < 2) return false;
  const response = await MockAPI.autocomplete(value);
  const first = response.predictions[0];
  if (!first) return false;
  await selectPlace(first.place_id, field);
  return true;
}

function renderSuggestions(predictions, suggestionsEl, field) {
  if (predictions.length === 0) {
    suggestionsEl.classList.remove("visible");
    return;
  }

  suggestionsEl.innerHTML = predictions
    .map(
      (p) => `
      <li data-place-id="${p.place_id}">
        <div class="place-icon">📍</div>
        <div class="place-info">
          <span class="place-name">${p.structured_formatting.main_text}</span>
          <span class="place-address">${p.structured_formatting.secondary_text}</span>
        </div>
      </li>
    `
    )
    .join("");

  suggestionsEl.classList.add("visible");

  // Listener para cada sugerencia
  suggestionsEl.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", async () => {
      const placeId = li.dataset.placeId;
      await selectPlace(placeId, field);
    });
  });
}

// =========================================================
// SELECCIÓN DE LUGAR (API 2: Google Place Details)
// =========================================================
async function selectPlace(placeId, field) {
  let place;

  // Lugares externos (Nominatim) vienen cacheados
  if (placeId.startsWith("osm_") && state.placeCache[placeId]) {
    logAPI("GET", `/nominatim/lookup?place_id=${placeId}`);
    place = { ...state.placeCache[placeId] };
  } else {
    logAPI("GET", `/maps/api/place/details/json?place_id=${placeId}`);
    const response = await MockAPI.placeDetails(placeId);
    if (response.status !== "OK") {
      alert("No pudimos obtener el detalle del lugar.");
      return;
    }
    place = {
      place_id: response.result.place_id,
      name: response.result.name,
      address: response.result.formatted_address,
      lat: response.result.geometry.location.lat,
      lng: response.result.geometry.location.lng,
    };
  }

  state[field] = place;

  // Actualiza el input y oculta sugerencias
  if (field === "origin") {
    originInput.value = place.name;
    originSuggestions.classList.remove("visible");
  } else {
    destinationInput.value = place.name;
    destinationSuggestions.classList.remove("visible");
  }

  // Añade marcador en el mapa
  addMarker(field, place);

  // Si se fijó el origen, refresca los conductores cercanos
  if (field === "origin") {
    loadNearbyDrivers(place);
  }

  // Habilita botón de búsqueda si ambos están listos
  updateSearchBtnState();

  // Ajusta vista del mapa
  if (state.origin && state.destination) {
    const bounds = L.latLngBounds([
      [state.origin.lat, state.origin.lng],
      [state.destination.lat, state.destination.lng],
    ]);
    map.fitBounds(bounds, { padding: [60, 60] });
    autoCalcRoute();
  } else {
    map.setView([place.lat, place.lng], 14);
  }
}

function addMarker(field, place) {
  // Elimina marcador anterior si existe
  if (state.markers[field]) {
    map.removeLayer(state.markers[field]);
  }

  const icon = L.divIcon({
    className: "custom-marker-wrapper",
    html: `<div class="custom-marker marker-${field}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  state.markers[field] = L.marker([place.lat, place.lng], { icon })
    .addTo(map)
    .bindPopup(`<strong>${place.name}</strong><br>${place.address}`);
}

// =========================================================
// BÚSQUEDA DE RUTA (APIs 3, 4, 5)
// =========================================================
let routeCalcInFlight = false;

async function calculateRoute() {
  if (!state.origin || !state.destination) return;
  if (routeCalcInFlight) return;
  routeCalcInFlight = true;

  searchBtn.disabled = true;
  searchBtn.textContent = "Calculando...";

  try {
    // API 3: Directions reales vía OSRM (fallback a mock)
    const route = await getRoute(state.origin, state.destination);
    state.route = {
      summary: "Ruta por calles",
      legs: [{
        distance: route.distance,
        duration: route.duration,
        start_address: `${state.origin.lat},${state.origin.lng}`,
        end_address: `${state.destination.lat},${state.destination.lng}`,
      }],
      overview_path: route.path,
    };
    drawRoute(route.path);

    // API 4: Uber Price Estimates
    logAPI(
      "GET",
      `/v1.2/estimates/price?start_latitude=${state.origin.lat}&start_longitude=${state.origin.lng}&end_latitude=${state.destination.lat}&end_longitude=${state.destination.lng}`
    );
    const priceResponse = await MockAPI.priceEstimates(state.origin, state.destination);
    state.priceEstimates = priceResponse.prices;

    // API 5: Uber Time Estimates
    logAPI(
      "GET",
      `/v1.2/estimates/time?start_latitude=${state.origin.lat}&start_longitude=${state.origin.lng}`
    );
    const timeResponse = await MockAPI.timeEstimates(state.origin);
    state.timeEstimates = timeResponse.times;

    // Renderiza los resultados
    renderResults();
  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al calcular la ruta.");
  } finally {
    routeCalcInFlight = false;
    updateSearchBtnState();
    searchBtn.textContent = "Recalcular ruta";
  }
}

searchBtn.addEventListener("click", async () => {
  // Si hay texto pero el lugar no fue seleccionado, lo resolvemos aquí
  if (!state.origin && originInput.value.trim().length >= 2) {
    await resolveFromText(originInput, "origin");
  }
  if (!state.destination && destinationInput.value.trim().length >= 2) {
    await resolveFromText(destinationInput, "destination");
  }
  if (!state.origin || !state.destination) {
    alert("Selecciona un origen y un destino de la lista de sugerencias.");
    return;
  }
  calculateRoute();
});

// Auto-cálculo cuando origen + destino están listos (debounced)
const autoCalcRoute = debounce(() => {
  if (state.origin && state.destination) calculateRoute();
}, 400);

function drawRoute(path) {
  state.routePath = path;
  applyRouteHierarchy();

  // Si no hay conductor seleccionado, centramos en esta ruta; si sí, mantenemos el encuadre global.
  if (!state.selectedDriverId && state.routePolyline) {
    map.fitBounds(state.routePolyline.getBounds(), { padding: [60, 60] });
  } else {
    fitAllRoutes();
  }
}

// =========================================================
// RENDER DE RESULTADOS
// =========================================================
function formatCOP(value) {
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function renderResults() {
  // Summary de ruta
  const leg = state.route.legs[0];
  $("routeDistance").textContent = leg.distance.text;
  $("routeDuration").textContent = leg.duration.text;

  // ETA del primer conductor disponible (mínimo)
  const minEta = Math.min(...state.timeEstimates.map((t) => t.estimate));
  $("driverEta").textContent = `${Math.round(minEta / 60)} min`;

  // Distancia en km (ya viene calculada por la API)
  const distanceKm = leg.distance.value / 1000;

  // Tarifa por km basada en el producto más económico (UberX)
  const cheapest = [...state.priceEstimates].sort(
    (a, b) => a.low_estimate - b.low_estimate
  )[0];
  const basePerKm = cheapest && distanceKm > 0 ? cheapest.low_estimate / distanceKm : 0;
  $("routePerKm").textContent = distanceKm > 0 ? `${formatCOP(basePerKm)}/km` : "—";

  // Lista de opciones de viaje con tarifa por km
  rideOptions.innerHTML = state.priceEstimates
    .map((p) => {
      const timeEst = state.timeEstimates.find(
        (t) => t.product_id === p.product_id
      );
      const eta = timeEst ? Math.round(timeEst.estimate / 60) : "--";
      const perKm = distanceKm > 0 ? p.low_estimate / distanceKm : 0;
      return `
        <li class="ride-option" data-product-id="${p.product_id}">
          <div class="ride-icon">${p.icon}</div>
          <div class="ride-info">
            <span class="ride-name">${p.display_name}</span>
            <span class="ride-desc">Llega en ${eta} min · ${p.capacity} personas</span>
          </div>
          <span class="ride-price">
            <span class="ride-price-main">${p.estimate.split(" - ")[0]}</span>
            <span class="ride-price-perkm">${formatCOP(perKm)}/km</span>
          </span>
        </li>
      `;
    })
    .join("");

  // Listener para seleccionar producto
  rideOptions.querySelectorAll(".ride-option").forEach((el) => {
    el.addEventListener("click", () => {
      rideOptions
        .querySelectorAll(".ride-option")
        .forEach((x) => x.classList.remove("selected"));
      el.classList.add("selected");
      state.selectedProduct = el.dataset.productId;
      initOfferForSelected();
      requestBtn.disabled = false;
    });
  });

  // Selecciona UberX por defecto
  const defaultOption = rideOptions.querySelector(".ride-option");
  if (defaultOption) {
    defaultOption.click();
  }

  // Carga las ofertas de conductores (3 pujas competidoras)
  loadDriverOffers();

  resultsSection.hidden = false;
}

// =========================================================
// OFERTAS DE CONDUCTORES (bidding)
// =========================================================
async function loadDriverOffers() {
  if (!state.origin || !state.destination || !state.selectedProduct) return;

  logAPI(
    "GET",
    `/v1.2/drivers/offers?pickup=${state.origin.lat},${state.origin.lng}&destination=${state.destination.lat},${state.destination.lng}&product_id=${state.selectedProduct}`
  );
  const response = await MockAPI.driverOffers(
    state.origin,
    state.destination,
    state.selectedProduct
  );

  const list = $("driverOffersList");
  const title = $("offersTitle");

  if (!response.offers?.length) {
    list.innerHTML = "";
    title.hidden = true;
    return;
  }

  title.hidden = false;
  title.textContent = `${response.offers.length} conductores te ofrecieron llevarte`;

  list.innerHTML = response.offers
    .map((o) => {
      const p = selectedPriceEstimate();
      const base = p ? p.low_estimate : o.base_low;
      const diff = o.offered_price - base;
      const diffPct = base > 0 ? Math.round((diff / base) * 100) : 0;
      const badge =
        diff < 0
          ? `<span class="offer-badge offer-badge-low">${diffPct}%</span>`
          : diff > 0
          ? `<span class="offer-badge offer-badge-high">+${diffPct}%</span>`
          : `<span class="offer-badge">=</span>`;
      return `
        <li class="driver-offer" data-driver-id="${o.driver_id}" data-price="${o.offered_price}">
          <div class="offer-avatar">🚗</div>
          <div class="offer-body">
            <div class="offer-top">
              <strong>${o.name}</strong>
              <span class="offer-rating">⭐ ${o.rating}</span>
            </div>
            <div class="offer-vehicle">
              ${o.vehicle.color} ${o.vehicle.make} ${o.vehicle.model} · ${o.vehicle.license_plate}
            </div>
            <div class="offer-meta">
              ${o.distance_km} km · llega en ${o.eta_min} min · <em>${o.zone}</em>
            </div>
            <div class="offer-msg">"${o.message}"</div>
          </div>
          <div class="offer-action">
            <div class="offer-price-row">
              <span class="offer-price">${formatCOP(o.offered_price)}</span>
              ${badge}
            </div>
            <button class="offer-accept-btn" data-driver-id="${o.driver_id}" data-price="${o.offered_price}">
              Aceptar
            </button>
          </div>
        </li>
      `;
    })
    .join("");
}

// Delegación: botón "Aceptar" de cada oferta
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".offer-accept-btn");
  if (!btn) return;
  const driverId = btn.dataset.driverId;
  const amount = Number(btn.dataset.price);
  const driver = state.drivers.find((d) => d.driver_id === driverId);
  if (offerInput) offerInput.value = amount;

  // Marca la ruta específica de ESE conductor antes de solicitar
  if (driver) {
    await showDriverRoute(driver);
  }

  submitRide({
    offerAmount: amount,
    preferredDriverId: driverId,
    statusText: `Aceptaste la oferta de ${driver?.name || "conductor"} por ${formatCOP(amount)}...`,
  });
});

// Click en una tarjeta de oferta (sin tocar "Aceptar") → solo marca la ruta
document.addEventListener("click", async (e) => {
  const card = e.target.closest(".driver-offer");
  if (!card) return;
  if (e.target.closest(".offer-accept-btn")) return; // ya lo maneja el otro handler
  const driverId = card.dataset.driverId;
  const driver = state.drivers.find((d) => d.driver_id === driverId);
  if (driver) await showDriverRoute(driver);
});

// =========================================================
// OFERTA DEL CLIENTE
// =========================================================
const offerInput = $("offerInput");
const offerHint = $("offerHint");
const offerFeedback = $("offerFeedback");

function selectedPriceEstimate() {
  return state.priceEstimates.find((p) => p.product_id === state.selectedProduct);
}

function initOfferForSelected() {
  const p = selectedPriceEstimate();
  if (!p) return;

  const distanceKm = state.route ? state.route.legs[0].distance.value / 1000 : 0;
  const perKm = distanceKm > 0 ? p.low_estimate / distanceKm : 0;
  const suggested = Math.round((p.low_estimate + p.high_estimate) / 2);

  offerHint.innerHTML = `
    Tarifa estimada para <strong>${p.display_name}</strong>:
    <strong>${formatCOP(p.low_estimate)}</strong> – <strong>${formatCOP(p.high_estimate)}</strong>
    (${formatCOP(perKm)}/km · ${distanceKm.toFixed(1)} km).
    Sugerido: <strong>${formatCOP(suggested)}</strong>.
  `;

  offerInput.min = Math.round(p.low_estimate * 0.7);
  offerInput.value = suggested;
  validateOffer();
}

function validateOffer() {
  const p = selectedPriceEstimate();
  if (!p) return;

  const value = Number(offerInput.value);
  const minAccept = Math.round(p.low_estimate * 0.7);

  offerFeedback.classList.remove("ok", "warn", "bad");

  if (!Number.isFinite(value) || value <= 0) {
    offerFeedback.textContent = "Ingresa un valor válido.";
    offerFeedback.classList.add("bad");
    requestBtn.disabled = true;
    return;
  }

  if (value < minAccept) {
    offerFeedback.textContent = `Muy bajo: un conductor difícilmente aceptará menos de ${formatCOP(minAccept)}.`;
    offerFeedback.classList.add("bad");
    requestBtn.disabled = true;
    return;
  }

  if (value < p.low_estimate) {
    offerFeedback.textContent = "Por debajo de la tarifa: podría tomar más tiempo encontrar conductor.";
    offerFeedback.classList.add("warn");
  } else if (value > p.high_estimate) {
    offerFeedback.textContent = "Por encima de la tarifa: alta probabilidad de aceptación.";
    offerFeedback.classList.add("ok");
  } else {
    offerFeedback.textContent = "Oferta dentro del rango estimado.";
    offerFeedback.classList.add("ok");
  }
  requestBtn.disabled = !state.selectedProduct;
}

offerInput.addEventListener("input", validateOffer);

// =========================================================
// SOLICITUD DE VIAJE (API 6: Uber Ride Request)
// =========================================================
async function submitRide({ offerAmount, preferredDriverId, statusText }) {
  if (!state.selectedProduct || !state.origin || !state.destination) {
    alert("Asegúrate de tener origen, destino y opción de viaje seleccionados.");
    return;
  }

  // Oculta resultados y muestra estado
  resultsSection.hidden = true;
  rideStatus.hidden = false;
  rideStatus.classList.remove("success");
  $("statusTitle").textContent = "Buscando conductor...";
  $("statusMessage").textContent =
    statusText || "Estamos conectándote con el conductor más cercano.";

  logAPI("POST", `/v1.2/requests`, "Authorization: Bearer <oauth2_token>");

  const response = await MockAPI.requestRide({
    product_id: state.selectedProduct,
    pickup: { lat: state.origin.lat, lng: state.origin.lng },
    destination: { lat: state.destination.lat, lng: state.destination.lng },
    offer_amount: offerAmount || null,
    offer_currency: "COP",
    preferred_driver_id: preferredDriverId || null,
  });

  setTimeout(() => {
    rideStatus.classList.add("success");
    $("statusTitle").textContent = preferredDriverId
      ? "¡Conductor asegurado!"
      : "¡Conductor encontrado!";
    const offerLine = offerAmount
      ? `Oferta aceptada: <strong>${formatCOP(offerAmount)}</strong><br>`
      : "";
    $("statusMessage").innerHTML = `
      ${offerLine}
      <strong>${response.driver.name}</strong> va en camino en ${response.eta} min<br>
      ${response.driver.vehicle.color} ${response.driver.vehicle.make} ${response.driver.vehicle.model}<br>
      Placa: <strong>${response.driver.vehicle.license_plate}</strong> · ⭐ ${response.driver.rating}
    `;
  }, 1800);
}

requestBtn.addEventListener("click", () => {
  submitRide({
    offerAmount: Number(offerInput.value) || null,
    preferredDriverId: null,
  });
});

// Delegación: botón "Ofrecer y asegurar servicio" dentro del popup del conductor
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".driver-offer-btn");
  if (!btn) return;

  const driverId = btn.dataset.driverId;
  const input = document.querySelector(
    `.driver-offer-input[data-driver-id="${driverId}"]`
  );
  const amount = input ? Number(input.value) : null;
  const driver = state.drivers.find((d) => d.driver_id === driverId);

  if (!amount || amount <= 0) {
    alert("Ingresa un monto válido para tu oferta.");
    return;
  }

  const p = selectedPriceEstimate();
  if (p && amount < Math.round(p.low_estimate * 0.7)) {
    if (!confirm(`Tu oferta es muy baja (mínimo sugerido ${formatCOP(Math.round(p.low_estimate * 0.7))}). ¿Enviar igual?`)) {
      return;
    }
  }

  // Sincroniza el input global de oferta
  if (offerInput) offerInput.value = amount;

  // Cierra popup y lanza la solicitud con conductor preferido
  map.closePopup();
  submitRide({
    offerAmount: amount,
    preferredDriverId: driverId,
    statusText: `Ofreciendo ${formatCOP(amount)} a ${driver?.name || "conductor seleccionado"}...`,
  });
});

// Cancelar viaje
$("cancelBtn").addEventListener("click", () => {
  rideStatus.hidden = true;
  rideStatus.classList.remove("success");
  resultsSection.hidden = false;
});

// =========================================================
// BÚSQUEDA ABIERTA EN MEDELLÍN (Nominatim / OpenStreetMap)
// =========================================================
// Viewbox bias: área metropolitana de Medellín
// (left, top, right, bottom) = (lng_min, lat_max, lng_max, lat_min)
const MEDELLIN_VIEWBOX = "-75.75,6.40,-75.35,6.10";

async function nominatimSearch(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `format=jsonv2&limit=5&addressdetails=1&countrycodes=co&` +
    `viewbox=${MEDELLIN_VIEWBOX}&bounded=1&` +
    `q=${encodeURIComponent(query)}`;
  logAPI("GET", `/nominatim/search?q=${encodeURIComponent(query)}`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data.map((r) => {
    const placeId = `osm_${r.osm_type}_${r.osm_id}`;
    const addr = r.address || {};
    const main = r.name || addr.amenity || addr.shop || addr.road || r.display_name.split(",")[0];
    const secondary = [addr.suburb, addr.city || addr.town || addr.municipality, addr.state]
      .filter(Boolean)
      .join(", ");
    // Guardamos en cache para el placeDetails posterior
    state.placeCache[placeId] = {
      place_id: placeId,
      name: main,
      address: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    };
    return {
      place_id: placeId,
      description: r.display_name,
      structured_formatting: {
        main_text: main,
        secondary_text: secondary || r.display_name,
      },
    };
  });
}

// =========================================================
// RUTEO REAL (OSRM público sobre OpenStreetMap)
// =========================================================
async function fetchOSRMRoute(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  logAPI("GET", `/osrm/route/v1/driving/${from.lat.toFixed(4)},${from.lng.toFixed(4)};${to.lat.toFixed(4)},${to.lng.toFixed(4)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("OSRM no route");
  const r = data.routes[0];
  // GeoJSON entrega [lng, lat] → Leaflet usa [lat, lng]
  const path = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const distanceKm = r.distance / 1000;
  const durationMin = Math.round(r.duration / 60);
  return {
    path,
    distance: { text: `${distanceKm.toFixed(1)} km`, value: Math.round(r.distance) },
    duration: { text: `${durationMin} min`, value: Math.round(r.duration) },
  };
}

// Intenta OSRM; si falla, cae al mock (línea recta con jitter)
async function getRoute(from, to) {
  try {
    return await fetchOSRMRoute(from, to);
  } catch (err) {
    console.warn("OSRM falló, usando mock:", err.message);
    const mock = await MockAPI.directions(from, to);
    const leg = mock.routes[0].legs[0];
    return {
      path: mock.routes[0].overview_path,
      distance: leg.distance,
      duration: leg.duration,
    };
  }
}

// =========================================================
// CONDUCTORES CERCANOS
// =========================================================
function driverIcon() {
  return L.divIcon({
    className: "driver-marker-wrapper",
    html: `<div class="driver-marker">🚗</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Estilos para las dos rutas. La "principal" es negra sólida, la "secundaria" azul claro punteada.
const ROUTE_STYLE_PRIMARY = {
  color: "#000000", weight: 5, opacity: 0.9,
  lineCap: "round", lineJoin: "round",
};
const ROUTE_STYLE_SECONDARY = {
  color: "#60a5fa", weight: 5, opacity: 0.9,
  dashArray: "2 10", lineCap: "round", lineJoin: "round",
};

// Recrea una polilínea con un estilo dado; elimina la anterior si existía.
function rebuildPolyline(existing, path, style) {
  if (existing) map.removeLayer(existing);
  if (!path || !path.length) return null;
  return L.polyline(path, style).addTo(map);
}

function applyRouteHierarchy() {
  const driverSelected = !!state.selectedDriverId;

  // Ruta del conductor (si existe): siempre principal
  if (state.driverRoutePath) {
    state.driverRoutePolyline = rebuildPolyline(
      state.driverRoutePolyline,
      state.driverRoutePath,
      ROUTE_STYLE_PRIMARY
    );
  }

  // Ruta origen→destino: secundaria si hay conductor, principal si no
  if (state.routePath) {
    state.routePolyline = rebuildPolyline(
      state.routePolyline,
      state.routePath,
      driverSelected ? ROUTE_STYLE_SECONDARY : ROUTE_STYLE_PRIMARY
    );
    // Asegura que la ruta principal (driver) quede ENCIMA si aplica
    if (driverSelected && state.driverRoutePolyline) {
      state.driverRoutePolyline.bringToFront();
    }
  }
}

function fitAllRoutes() {
  const layers = [state.driverRoutePolyline, state.routePolyline].filter(Boolean);
  if (!layers.length) return;
  let bounds = layers[0].getBounds();
  for (let i = 1; i < layers.length; i++) bounds = bounds.extend(layers[i].getBounds());
  map.fitBounds(bounds, { padding: [70, 70] });
}

function clearDriverRoute() {
  if (state.driverRoutePolyline) {
    map.removeLayer(state.driverRoutePolyline);
    state.driverRoutePolyline = null;
  }
  state.driverRoutePath = null;
  state.selectedDriverId = null;
  state.driverMarkers.forEach((m) => {
    const el = m.getElement();
    if (el) el.classList.remove("selected");
  });
  applyRouteHierarchy();
}

async function showDriverRoute(driver) {
  const target = state.origin;
  if (!target) {
    alert("Primero fija tu ubicación de origen (usa el botón de GPS o escribe una dirección).");
    return;
  }

  // Limpia ruta anterior del conductor
  if (state.driverRoutePolyline) {
    map.removeLayer(state.driverRoutePolyline);
    state.driverRoutePolyline = null;
  }

  state.selectedDriverId = driver.driver_id;

  // Marca visualmente el conductor seleccionado
  state.driverMarkers.forEach((m) => {
    const el = m.getElement();
    if (!el) return;
    const isSel = m.options.driverId === driver.driver_id;
    el.classList.toggle("selected", isSel);
  });

  const route = await getRoute(
    { lat: driver.location.lat, lng: driver.location.lng },
    { lat: target.lat, lng: target.lng }
  );

  state.driverRoutePath = route.path;
  applyRouteHierarchy();

  // Si ya hay ruta y precios calculados, agregamos campo de oferta para asegurar el servicio
  let offerBlock = `<small class="popup-hint">Define un destino para hacer una oferta directa.</small>`;
  const p = selectedPriceEstimate();
  if (p && state.route) {
    const secured = Math.round(p.high_estimate * 1.1 / 500) * 500; // redondea a 500
    const minAmount = Math.round(p.low_estimate * 0.9);
    offerBlock = `
      <div class="popup-offer">
        <label>Asegura con este conductor:</label>
        <div class="popup-offer-input">
          <span>$</span>
          <input
            type="number"
            class="driver-offer-input"
            value="${secured}"
            min="${minAmount}"
            step="500"
            data-driver-id="${driver.driver_id}"
          />
          <span class="popup-offer-cop">COP</span>
        </div>
        <small class="popup-offer-hint">
          Tarifa ${p.display_name}: ${formatCOP(p.low_estimate)}–${formatCOP(p.high_estimate)} ·
          sugerido para asegurar: <strong>${formatCOP(secured)}</strong>
        </small>
        <button class="driver-offer-btn" data-driver-id="${driver.driver_id}">
          Ofrecer y asegurar servicio
        </button>
      </div>
    `;
  }

  // Popup con info y botón para confirmar
  const popupHtml = `
    <div class="driver-popup">
      <strong>${driver.name}</strong> · ⭐ ${driver.rating}<br>
      ${driver.vehicle.color} ${driver.vehicle.make} ${driver.vehicle.model}<br>
      Placa: <strong>${driver.vehicle.license_plate}</strong><br>
      <em>${driver.zone}</em><br>
      <hr class="popup-sep">
      📍 <strong>${route.distance.text}</strong> hasta ti · llega en <strong>${route.duration.text}</strong>
      <hr class="popup-sep">
      ${offerBlock}
    </div>
  `;
  const marker = state.driverMarkers.find(
    (m) => m.options.driverId === driver.driver_id
  );
  if (marker) {
    marker.getPopup()?.setContent(popupHtml);
    marker.openPopup();
  }

  // Ajusta el mapa: incluye conductor, origen y destino (si existe)
  fitAllRoutes();
}

async function loadNearbyDrivers(origin) {
  logAPI("GET", `/v1.2/drivers?lat=${origin.lat}&lng=${origin.lng}`);
  const response = await MockAPI.nearbyDrivers(origin);
  state.drivers = response.drivers;

  // Limpia marcadores y ruta anteriores
  state.driverMarkers.forEach((m) => map.removeLayer(m));
  state.driverMarkers = [];
  clearDriverRoute();

  response.drivers.forEach((d) => {
    const marker = L.marker([d.location.lat, d.location.lng], {
      icon: driverIcon(),
      zIndexOffset: 500,
      driverId: d.driver_id,
    }).addTo(map);
    const etaMin = d.eta_seconds ? Math.round(d.eta_seconds / 60) : "—";
    marker.bindPopup(`
      <strong>${d.name}</strong> · ⭐ ${d.rating}<br>
      ${d.vehicle.color} ${d.vehicle.make} ${d.vehicle.model} · ${d.vehicle.license_plate}<br>
      <em>${d.zone}</em><br>
      ${d.distance_km != null ? `A ${d.distance_km} km · ${etaMin} min` : ""}
    `);
    marker.on("click", () => showDriverRoute(d));
    state.driverMarkers.push(marker);
  });
}

// =========================================================
// GEOLOCALIZACIÓN EN TIEMPO REAL
// =========================================================
const locateBtn = $("locateBtn");

function buildLiveIcon() {
  return L.divIcon({
    className: "live-location-wrapper",
    html: `<div class="live-location-marker"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

async function reverseGeocode(lat, lng) {
  // Si el mock expone reverseGeocode lo usamos; si no, devolvemos un placeholder.
  if (typeof MockAPI !== "undefined" && typeof MockAPI.reverseGeocode === "function") {
    logAPI("GET", `/maps/api/geocode/json?latlng=${lat},${lng}`);
    try {
      const r = await MockAPI.reverseGeocode({ lat, lng });
      const result = r?.results?.[0];
      if (result) {
        return {
          place_id: result.place_id || `live_${Date.now()}`,
          name: result.name || "Mi ubicación",
          address: result.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        };
      }
    } catch (_) { /* cae al fallback */ }
  }
  return {
    place_id: `live_${Date.now()}`,
    name: "Mi ubicación",
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}

function updateLiveMarker(lat, lng, accuracy) {
  const latlng = [lat, lng];

  if (!state.markers.live) {
    state.markers.live = L.marker(latlng, {
      icon: buildLiveIcon(),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);
  } else {
    state.markers.live.setLatLng(latlng);
  }

  if (accuracy && accuracy > 0) {
    if (!state.accuracyCircle) {
      state.accuracyCircle = L.circle(latlng, {
        radius: accuracy,
        color: "#276EF1",
        fillColor: "#276EF1",
        fillOpacity: 0.12,
        weight: 1,
        interactive: false,
      }).addTo(map);
    } else {
      state.accuracyCircle.setLatLng(latlng);
      state.accuracyCircle.setRadius(accuracy);
    }
  }
}

function stopLiveTracking() {
  if (state.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
  locateBtn.classList.remove("active", "loading");
}

function handleGeoError(err) {
  stopLiveTracking();
  const messages = {
    1: "Permiso denegado. Habilita la ubicación en tu navegador.",
    2: "No se pudo determinar tu ubicación.",
    3: "La solicitud de ubicación tardó demasiado.",
  };
  alert(messages[err.code] || "Error al obtener tu ubicación.");
}

async function handleGeoSuccess(position) {
  const { latitude, longitude, accuracy } = position.coords;

  updateLiveMarker(latitude, longitude, accuracy);

  // Solo la primera posición fija el origen y centra el mapa
  if (!locateBtn.dataset.firstFixDone) {
    locateBtn.dataset.firstFixDone = "1";

    const place = await reverseGeocode(latitude, longitude);
    state.origin = place;
    originInput.value = place.name;
    addMarker("origin", place);
    loadNearbyDrivers(place);

    updateSearchBtnState();

    map.setView([latitude, longitude], 16);
    locateBtn.classList.remove("loading");
    locateBtn.classList.add("active");

    if (state.destination) autoCalcRoute();
  } else if (state.origin?.place_id?.toString().startsWith("live_")) {
    // Actualiza el origen en vivo mientras el usuario se mueve
    state.origin.lat = latitude;
    state.origin.lng = longitude;
    if (state.markers.origin) {
      state.markers.origin.setLatLng([latitude, longitude]);
    }
  }
}

function startLiveTracking() {
  if (!("geolocation" in navigator)) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  // Toggle: si ya está activo, apagar
  if (state.watchId !== null) {
    stopLiveTracking();
    return;
  }

  locateBtn.classList.add("loading");
  delete locateBtn.dataset.firstFixDone;

  state.watchId = navigator.geolocation.watchPosition(
    handleGeoSuccess,
    handleGeoError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    }
  );
}

locateBtn.addEventListener("click", startLiveTracking);

// =========================================================
// Inicialización: activa autocompletado
// =========================================================
setupAutocomplete(originInput, originSuggestions, "origin");
setupAutocomplete(destinationInput, destinationSuggestions, "destination");

// Carga inicial de conductores (centro de Medellín)
loadNearbyDrivers({ lat: 6.2442, lng: -75.5812 });

// Log inicial
console.log("🚗 RideGo iniciado. Prueba buscar 'Poblado', 'Lleras', 'Aeropuerto', 'Laureles', 'Envigado'...");
