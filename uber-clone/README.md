# 🚗 RideGo — Reto Taller Google Maps + Uber API

Prototipo full-stack que conecta **los 6 endpoints** del reto en un flujo funcional tipo Uber.

## ✅ APIs integradas (6/6)

| # | API | Endpoint simulado | Uso en la app |
|---|-----|-------------------|---------------|
| 1 | Google Places Autocomplete | `GET /maps/api/place/autocomplete/json` | Sugiere lugares mientras escribes en origen/destino |
| 2 | Google Place Details | `GET /maps/api/place/details/json` | Convierte el `place_id` en coordenadas lat/lng |
| 3 | Google Directions | `GET /maps/api/directions/json` | Calcula ruta, distancia, duración y polyline |
| 4 | Uber Price Estimates | `GET /v1.2/estimates/price` | Muestra precios por UberX, Comfort, Black, XL |
| 5 | Uber Time Estimates | `GET /v1.2/estimates/time` | Muestra cuántos minutos tarda cada servicio en llegar |
| 6 | Uber Ride Request | `POST /v1.2/requests` | Confirma el viaje y asigna conductor (simula OAuth 2.0) |

## 🚀 Cómo ejecutarlo

1. Descomprime los archivos en una carpeta.
2. Abre una terminal en esa carpeta.
3. Lanza un servidor local. Opciones:

   **Con Python (más fácil):**
   ```bash
   python3 -m http.server 8000
   ```

   **Con Node.js:**
   ```bash
   npx serve .
   ```

   **Con VS Code:** extensión *Live Server* y clic derecho en `index.html` → *Open with Live Server*.

4. Abre en tu navegador: `http://localhost:8000`

> 💡 No abras `index.html` haciendo doble click — algunos navegadores bloquean módulos y fetch local.

## 🎮 Cómo probarlo

1. Escribe en el campo **origen**: `Plaza`, `Zona`, `Aeropuerto`, `Monserrate`, `Candelaria`, `Andino`...
2. Selecciona una sugerencia → aparece un marcador negro en el mapa.
3. Repite con el **destino** → aparece un marcador blanco.
4. Click en **"Buscar ruta"** → se dibuja la ruta y aparecen los precios y tiempos.
5. Selecciona un tipo de viaje (UberX, Comfort, Black, XL).
6. Click en **"Solicitar viaje"** → simula OAuth 2.0 y asigna conductor.

En la esquina inferior derecha verás el **Registro de APIs** mostrando cada llamada en tiempo real.

## 📁 Estructura

```
uber-clone/
├── index.html      # Estructura de la app
├── styles.css      # Estilos inspirados en Uber
├── app.js          # Lógica principal + conexión con mapa
└── mock-api.js     # Mock de las 6 APIs (estructura fiel a las reales)
```

## 🔧 Cómo cambiar a APIs reales

El archivo `mock-api.js` replica exactamente la estructura de respuesta de Google Maps y Uber.
Para conectarlo con APIs reales:

1. **Google Maps:** obtén una API key en [Google Cloud Console](https://console.cloud.google.com/).
2. **Uber API:** registra una app en [developer.uber.com](https://developer.uber.com/) y obtén tokens OAuth 2.0.
3. Reemplaza cada función en `mock-api.js` por un `fetch()` real. Ejemplo:

```js
async function autocomplete(input) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&key=TU_API_KEY`
  );
  return res.json();
}
```

> ⚠️ Las llamadas directas a Google desde el navegador exigen un **backend proxy** en producción (para no exponer la API key). El reto se enfoca en el flujo, así que el mock muestra la estructura correcta.

## 🛠 Stack técnico

- **HTML5 / CSS3 / JavaScript vanilla** (sin frameworks)
- **Leaflet + OpenStreetMap** para el mapa (gratis, sin API key)
- **Mock API** con estructura fiel a Google Maps Platform y Uber API v1.2

## 👨‍💻 Flujos implementados

- ✅ Autocompletado con debounce (evita spam de llamadas)
- ✅ Marcadores personalizados en el mapa
- ✅ Dibujo de polyline de la ruta
- ✅ Panel con estimados de precio, tiempo y distancia
- ✅ Selección de tipo de servicio
- ✅ Solicitud de viaje con confirmación de conductor
- ✅ Registro visible de todas las llamadas API
- ✅ Diseño responsive (mobile friendly)

---

Hecho con 🖤 para el Reto Taller.
