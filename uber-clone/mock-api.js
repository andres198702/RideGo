/* =========================================================
   mock-api.js
   Simulación de los 6 endpoints del reto:
   - Google Places Autocomplete
   - Google Place Details
   - Google Directions
   - Uber Price Estimates
   - Uber Time Estimates
   - Uber Ride Request
   Estructura de respuesta fiel a las APIs reales.
   ========================================================= */

const MockAPI = (() => {
  // Base de datos simulada de lugares en Medellín y área metropolitana
  const PLACES_DB = [
    {
      place_id: "ChIJ_medellin_poblado_01",
      name: "Parque Lleras",
      address: "Cl. 9A #37, El Poblado, Medellín",
      lat: 6.2087,
      lng: -75.5664,
    },
    {
      place_id: "ChIJ_medellin_botero_02",
      name: "Plaza Botero",
      address: "Cra. 52 #52, La Candelaria, Medellín",
      lat: 6.2533,
      lng: -75.5692,
    },
    {
      place_id: "ChIJ_medellin_pueblito_03",
      name: "Pueblito Paisa",
      address: "Cerro Nutibara, Medellín",
      lat: 6.2383,
      lng: -75.5855,
    },
    {
      place_id: "ChIJ_medellin_jmc_04",
      name: "Aeropuerto José María Córdova",
      address: "Vía Las Palmas, Rionegro",
      lat: 6.1645,
      lng: -75.4231,
    },
    {
      place_id: "ChIJ_medellin_olaya_05",
      name: "Aeropuerto Olaya Herrera",
      address: "Cra. 65A #13-157, Medellín",
      lat: 6.2194,
      lng: -75.5903,
    },
    {
      place_id: "ChIJ_medellin_santafe_06",
      name: "Centro Comercial Santafé",
      address: "Cra. 43A #7 Sur-170, Medellín",
      lat: 6.1968,
      lng: -75.5740,
    },
    {
      place_id: "ChIJ_medellin_tesoro_07",
      name: "Centro Comercial El Tesoro",
      address: "Cra. 25A #1A Sur-45, El Poblado, Medellín",
      lat: 6.1936,
      lng: -75.5570,
    },
    {
      place_id: "ChIJ_medellin_oviedo_08",
      name: "Centro Comercial Oviedo",
      address: "Cra. 43A #6 Sur-15, El Poblado, Medellín",
      lat: 6.1975,
      lng: -75.5753,
    },
    {
      place_id: "ChIJ_medellin_estadio_09",
      name: "Estadio Atanasio Girardot",
      address: "Cra. 74 #48-010, Medellín",
      lat: 6.2568,
      lng: -75.5897,
    },
    {
      place_id: "ChIJ_medellin_explora_10",
      name: "Parque Explora",
      address: "Cra. 52 #73-75, Medellín",
      lat: 6.2697,
      lng: -75.5656,
    },
    {
      place_id: "ChIJ_medellin_jardin_11",
      name: "Jardín Botánico",
      address: "Cl. 73 #51D-14, Medellín",
      lat: 6.2712,
      lng: -75.5645,
    },
    {
      place_id: "ChIJ_medellin_udea_12",
      name: "Universidad de Antioquia",
      address: "Cl. 67 #53-108, Medellín",
      lat: 6.2672,
      lng: -75.5685,
    },
    {
      place_id: "ChIJ_medellin_pies_13",
      name: "Parque de los Pies Descalzos",
      address: "Cra. 58 #42, Medellín",
      lat: 6.2453,
      lng: -75.5785,
    },
    {
      place_id: "ChIJ_medellin_comuna13_14",
      name: "Comuna 13",
      address: "San Javier, Medellín",
      lat: 6.2628,
      lng: -75.6142,
    },
    {
      place_id: "ChIJ_medellin_laureles_15",
      name: "Primer Parque de Laureles",
      address: "Cra. 81 #33, Laureles, Medellín",
      lat: 6.2438,
      lng: -75.5944,
    },
    {
      place_id: "ChIJ_medellin_arvi_16",
      name: "Parque Arví",
      address: "Vía Santa Elena, Medellín",
      lat: 6.2857,
      lng: -75.5031,
    },
    {
      place_id: "ChIJ_medellin_envigado_17",
      name: "Parque Principal de Envigado",
      address: "Cl. 38 Sur #43, Envigado",
      lat: 6.1736,
      lng: -75.5908,
    },
    {
      place_id: "ChIJ_medellin_sabaneta_18",
      name: "Parque Principal de Sabaneta",
      address: "Cra. 45 #70 Sur, Sabaneta",
      lat: 6.1525,
      lng: -75.6161,
    },
    {
      place_id: "ChIJ_medellin_bello_19",
      name: "Parque de Bello",
      address: "Cra. 50 #50, Bello",
      lat: 6.3373,
      lng: -75.5547,
    },
    {
      place_id: "ChIJ_medellin_itagui_20",
      name: "Parque Principal de Itagüí",
      address: "Cl. 51 #51, Itagüí",
      lat: 6.1719,
      lng: -75.6117,
    },
  ];

  // Flota simulada de conductores (Medellín y área metropolitana)
  const DRIVERS_DB = [
    {
      driver_id: "drv_001",
      name: "Carlos M.",
      phone: "+57 300 555 0147",
      rating: 4.9,
      zone: "El Poblado - Parque Lleras",
      vehicle: { make: "Toyota", model: "Corolla", license_plate: "ABC-123", color: "Blanco" },
      lat: 6.2095, lng: -75.5672,
    },
    {
      driver_id: "drv_002",
      name: "Andrés R.",
      phone: "+57 301 412 0988",
      rating: 4.8,
      zone: "Laureles",
      vehicle: { make: "Chevrolet", model: "Spark GT", license_plate: "DEF-456", color: "Rojo" },
      lat: 6.2440, lng: -75.5940,
    },
    {
      driver_id: "drv_003",
      name: "Luis P.",
      phone: "+57 312 705 3321",
      rating: 4.7,
      zone: "Belén",
      vehicle: { make: "Renault", model: "Logan", license_plate: "GHI-789", color: "Gris" },
      lat: 6.2283, lng: -75.6005,
    },
    {
      driver_id: "drv_004",
      name: "Camilo J.",
      phone: "+57 313 881 4422",
      rating: 4.9,
      zone: "El Poblado - Oviedo",
      vehicle: { make: "Mazda", model: "3", license_plate: "JKL-012", color: "Negro" },
      lat: 6.1970, lng: -75.5750,
    },
    {
      driver_id: "drv_005",
      name: "Sebastián G.",
      phone: "+57 300 224 7755",
      rating: 4.8,
      zone: "Envigado",
      vehicle: { make: "Kia", model: "Rio", license_plate: "MNO-345", color: "Azul" },
      lat: 6.1736, lng: -75.5910,
    },
    {
      driver_id: "drv_006",
      name: "Daniela T.",
      phone: "+57 310 663 1190",
      rating: 5.0,
      zone: "Centro - La Candelaria",
      vehicle: { make: "Chevrolet", model: "Onix", license_plate: "PQR-678", color: "Blanco" },
      lat: 6.2530, lng: -75.5690,
    },
    {
      driver_id: "drv_007",
      name: "Santiago V.",
      phone: "+57 315 908 4471",
      rating: 4.6,
      zone: "Sabaneta",
      vehicle: { make: "Hyundai", model: "i10", license_plate: "STU-901", color: "Plata" },
      lat: 6.1525, lng: -75.6161,
    },
    {
      driver_id: "drv_008",
      name: "Juliana M.",
      phone: "+57 302 553 1028",
      rating: 4.9,
      zone: "Aranjuez",
      vehicle: { make: "Nissan", model: "Versa", license_plate: "VWX-234", color: "Negro" },
      lat: 6.2750, lng: -75.5600,
    },
    {
      driver_id: "drv_009",
      name: "Mateo L.",
      phone: "+57 314 177 6680",
      rating: 4.7,
      zone: "Itagüí",
      vehicle: { make: "Chevrolet", model: "Aveo", license_plate: "YZA-567", color: "Rojo" },
      lat: 6.1719, lng: -75.6117,
    },
    {
      driver_id: "drv_010",
      name: "Valentina O.",
      phone: "+57 311 044 9915",
      rating: 5.0,
      zone: "Universidad de Antioquia",
      vehicle: { make: "Toyota", model: "Yaris", license_plate: "BCD-890", color: "Blanco" },
      lat: 6.2680, lng: -75.5690,
    },
  ];

  // Productos de Uber
  const UBER_PRODUCTS = [
    {
      product_id: "uberx-001",
      display_name: "UberX",
      description: "Viajes cómodos y económicos",
      icon: "🚗",
      base_multiplier: 1.0,
      capacity: 4,
    },
    {
      product_id: "comfort-002",
      display_name: "Comfort",
      description: "Autos nuevos con más espacio",
      icon: "🚙",
      base_multiplier: 1.3,
      capacity: 4,
    },
    {
      product_id: "black-003",
      display_name: "Uber Black",
      description: "Servicio premium con chofer",
      icon: "🖤",
      base_multiplier: 2.2,
      capacity: 4,
    },
    {
      product_id: "xl-004",
      display_name: "UberXL",
      description: "Vehículos para 6 personas",
      icon: "🚐",
      base_multiplier: 1.6,
      capacity: 6,
    },
  ];

  // Utilidad: simula latencia de red
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // Utilidad: distancia entre coordenadas (Haversine)
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371; // km
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // =========================================================
  // 1. Google Places Autocomplete
  // GET /maps/api/place/autocomplete/json?input=...
  // =========================================================
  async function autocomplete(input) {
    await delay(150);
    const query = input.trim().toLowerCase();
    if (query.length < 2) return { predictions: [], status: "OK" };

    const predictions = PLACES_DB
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map((p) => ({
        place_id: p.place_id,
        description: `${p.name}, ${p.address}`,
        structured_formatting: {
          main_text: p.name,
          secondary_text: p.address,
        },
      }));

    return {
      predictions,
      status: predictions.length > 0 ? "OK" : "ZERO_RESULTS",
    };
  }

  // =========================================================
  // 2. Google Place Details
  // GET /maps/api/place/details/json?place_id=...
  // =========================================================
  async function placeDetails(place_id) {
    await delay(200);
    const place = PLACES_DB.find((p) => p.place_id === place_id);
    if (!place) {
      return { status: "NOT_FOUND", result: null };
    }
    return {
      status: "OK",
      result: {
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.address,
        geometry: {
          location: {
            lat: place.lat,
            lng: place.lng,
          },
        },
      },
    };
  }

  // =========================================================
  // 3. Google Directions
  // GET /maps/api/directions/json?origin=...&destination=...
  // =========================================================
  async function directions(origin, destination) {
    await delay(400);
    const distanceKm = haversine(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    // Asumimos velocidad promedio en ciudad: 25 km/h
    const durationMin = Math.round((distanceKm / 25) * 60);

    // Generamos polyline simple (línea con waypoints intermedios)
    const steps = 8;
    const path = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Agrega pequeño offset para simular curvas de calles
      const jitter = i > 0 && i < steps ? (Math.random() - 0.5) * 0.003 : 0;
      path.push([
        origin.lat + (destination.lat - origin.lat) * t + jitter,
        origin.lng + (destination.lng - origin.lng) * t + jitter,
      ]);
    }

    return {
      status: "OK",
      routes: [
        {
          summary: "Ruta más rápida",
          legs: [
            {
              distance: {
                text: `${distanceKm.toFixed(1)} km`,
                value: Math.round(distanceKm * 1000),
              },
              duration: {
                text: `${durationMin} min`,
                value: durationMin * 60,
              },
              start_address: `${origin.lat},${origin.lng}`,
              end_address: `${destination.lat},${destination.lng}`,
            },
          ],
          // En la API real sería un polyline codificado. Aquí lo damos como array.
          overview_path: path,
        },
      ],
    };
  }

  // =========================================================
  // 4. Uber Price Estimates
  // GET /v1.2/estimates/price?start_latitude=...&end_latitude=...
  // =========================================================
  async function priceEstimates(origin, destination) {
    await delay(350);
    const distanceKm = haversine(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng
    );
    // Tarifa base: $4.000 COP + $1.800/km
    const baseFare = 4000;
    const perKm = 1800;

    const prices = UBER_PRODUCTS.map((p) => {
      const low = Math.round(
        (baseFare + distanceKm * perKm) * p.base_multiplier * 0.9
      );
      const high = Math.round(
        (baseFare + distanceKm * perKm) * p.base_multiplier * 1.1
      );
      return {
        product_id: p.product_id,
        display_name: p.display_name,
        description: p.description,
        icon: p.icon,
        capacity: p.capacity,
        currency_code: "COP",
        estimate: `$${low.toLocaleString("es-CO")} - $${high.toLocaleString("es-CO")}`,
        low_estimate: low,
        high_estimate: high,
        distance: distanceKm.toFixed(1),
        duration: Math.round((distanceKm / 25) * 60 * 60), // segundos
      };
    });

    return { prices };
  }

  // =========================================================
  // 5. Uber Time Estimates
  // GET /v1.2/estimates/time?start_latitude=...
  // =========================================================
  async function timeEstimates(origin) {
    await delay(250);
    // Simula tiempos de llegada por tipo de producto
    const times = UBER_PRODUCTS.map((p) => ({
      product_id: p.product_id,
      display_name: p.display_name,
      // Tiempo aleatorio entre 2 y 8 minutos
      estimate: Math.floor(Math.random() * 6 + 2) * 60, // segundos
    }));
    return { times };
  }

  // =========================================================
  // 6. Uber Ride Request (requiere OAuth 2.0)
  // POST /v1.2/requests
  // =========================================================
  async function requestRide(payload) {
    await delay(800);
    // Simula validación de OAuth
    if (!payload.product_id) {
      return {
        status: "error",
        error: "invalid_request",
        message: "Falta product_id",
      };
    }
    const requestId = "req_" + Math.random().toString(36).substring(2, 12);

    // Asigna conductor: si el cliente especificó uno (oferta directa), se honra;
    // si no, el más cercano al pickup.
    let assignedDriver = DRIVERS_DB[0];
    if (payload.preferred_driver_id) {
      const preferred = DRIVERS_DB.find(
        (d) => d.driver_id === payload.preferred_driver_id
      );
      if (preferred) assignedDriver = preferred;
    } else if (payload.pickup) {
      // Elige aleatoriamente entre los 3 conductores más cercanos (no siempre el mismo)
      const ranked = DRIVERS_DB
        .map((d) => ({
          ...d,
          _dist: haversine(payload.pickup.lat, payload.pickup.lng, d.lat, d.lng),
        }))
        .sort((a, b) => a._dist - b._dist);
      const topN = ranked.slice(0, Math.min(3, ranked.length));
      assignedDriver = topN[Math.floor(Math.random() * topN.length)];
    }
    const etaMin = Math.max(2, Math.round(haversine(
      payload.pickup.lat, payload.pickup.lng,
      assignedDriver.lat, assignedDriver.lng
    ) / 25 * 60));

    return {
      status: "processing",
      request_id: requestId,
      product_id: payload.product_id,
      driver: {
        driver_id: assignedDriver.driver_id,
        name: assignedDriver.name,
        phone: assignedDriver.phone,
        rating: assignedDriver.rating,
        zone: assignedDriver.zone,
        location: { lat: assignedDriver.lat, lng: assignedDriver.lng },
        vehicle: assignedDriver.vehicle,
      },
      eta: etaMin,
      pickup: payload.pickup,
      destination: payload.destination,
    };
  }

  // =========================================================
  // Ofertas de conductores (bidding inverso tipo inDriver)
  // GET /v1.2/drivers/offers?pickup=...&destination=...&product_id=...
  // =========================================================
  async function driverOffers(origin, destination, productId) {
    await delay(500);

    const priceResp = await priceEstimates(origin, destination);
    const product =
      priceResp.prices.find((p) => p.product_id === productId) ||
      priceResp.prices[0];

    // Tomamos los 6 conductores más cercanos al pickup y barajamos para elegir 3.
    const nearby = DRIVERS_DB
      .map((d) => ({
        ...d,
        _dist: haversine(origin.lat, origin.lng, d.lat, d.lng),
      }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, Math.min(6, DRIVERS_DB.length));

    // Fisher–Yates shuffle
    for (let i = nearby.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nearby[i], nearby[j]] = [nearby[j], nearby[i]];
    }
    const picked = nearby.slice(0, 3);

    // Bucket de variaciones: uno bajo, uno medio, uno premium — con jitter
    const rand = (min, max) => Math.random() * (max - min) + min;
    const buckets = [
      rand(-0.12, -0.02),
      rand(0.03, 0.15),
      rand(0.18, 0.32),
    ].sort(() => Math.random() - 0.5); // barajar también el tipo

    const messagePool = [
      "¡Puedo estar allá ya!",
      "Voy en esa dirección, te llevo.",
      "Conductor cerca, servicio seguro.",
      "Te llevo sin tráfico, conozco la zona.",
      "Confirma y salgo de inmediato.",
      "Auto limpio y aire acondicionado.",
      "Mejor precio por esta ruta.",
      "Experiencia 5⭐ garantizada.",
    ];
    // Baraja los mensajes y toma 3 distintos
    const shuffledMsgs = [...messagePool].sort(() => Math.random() - 0.5);

    const offers = picked.map((d, i) => {
      const variation = buckets[i] ?? 0;
      const rawOffer = product.low_estimate * (1 + variation);
      const offered = Math.round(rawOffer / 500) * 500; // redondea a 500
      const etaMin = Math.max(2, Math.round((d._dist / 25) * 60));
      return {
        driver_id: d.driver_id,
        name: d.name,
        rating: d.rating,
        zone: d.zone,
        vehicle: d.vehicle,
        location: { lat: d.lat, lng: d.lng },
        distance_km: Number(d._dist.toFixed(2)),
        eta_min: etaMin,
        offered_price: offered,
        currency_code: "COP",
        base_low: product.low_estimate,
        base_high: product.high_estimate,
        product_id: product.product_id,
        message: shuffledMsgs[i] || "Te llevo.",
      };
    });

    return { offers, product_id: product.product_id };
  }

  // =========================================================
  // Conductores cercanos (para pintar en el mapa)
  // GET /v1.2/drivers?lat=...&lng=...
  // =========================================================
  async function nearbyDrivers(origin) {
    await delay(200);
    const hasOrigin = origin && typeof origin.lat === "number";
    const list = DRIVERS_DB.map((d) => {
      const distKm = hasOrigin
        ? haversine(origin.lat, origin.lng, d.lat, d.lng)
        : null;
      return {
        driver_id: d.driver_id,
        name: d.name,
        rating: d.rating,
        zone: d.zone,
        vehicle: d.vehicle,
        location: { lat: d.lat, lng: d.lng },
        distance_km: distKm !== null ? Number(distKm.toFixed(2)) : null,
        eta_seconds: distKm !== null ? Math.round((distKm / 25) * 3600) : null,
      };
    });
    if (hasOrigin) list.sort((a, b) => a.distance_km - b.distance_km);
    return { drivers: list };
  }

  return {
    autocomplete,
    placeDetails,
    directions,
    priceEstimates,
    timeEstimates,
    requestRide,
    nearbyDrivers,
    driverOffers,
  };
})();
