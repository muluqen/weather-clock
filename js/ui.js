const WMO_CODES = {
  0: ["Clear", "\u2600\uFE0F"],
  1: ["Mostly clear", "\uD83C\uDF24\uFE0F"],
  2: ["Cloudy", "\u26C5"],
  3: ["Overcast", "\u2601\uFE0F"],
  45: ["Fog", "\uD83C\uDF2B\uFE0F"],
  48: ["Fog", "\uD83C\uDF2B\uFE0F"],
  51: ["Drizzle", "\uD83C\uDF26\uFE0F"],
  53: ["Drizzle", "\uD83C\uDF26\uFE0F"],
  55: ["Heavy drizzle", "\uD83C\uDF27\uFE0F"],
  61: ["Light rain", "\uD83C\uDF27\uFE0F"],
  63: ["Rain", "\uD83C\uDF27\uFE0F"],
  65: ["Heavy rain", "\uD83C\uDF27\uFE0F"],
  71: ["Snow", "\uD83C\uDF28\uFE0F"],
  73: ["Snow", "\uD83C\uDF28\uFE0F"],
  75: ["Heavy snow", "\uD83C\uDF28\uFE0F"],
  80: ["Showers", "\uD83C\uDF26\uFE0F"],
  81: ["Showers", "\uD83C\uDF27\uFE0F"],
  82: ["Heavy showers", "\uD83C\uDF27\uFE0F"],
  85: ["Snow showers", "\uD83C\uDF28\uFE0F"],
  86: ["Snow showers", "\uD83C\uDF28\uFE0F"],
  95: ["Thunder", "\u26C8\uFE0F"],
  96: ["Thunder + hail", "\u26C8\uFE0F"],
  99: ["Severe storm", "\u26C8\uFE0F"]
};

let hourlyData = null;
let activeMarker = null;

function info(code) {
  return WMO_CODES[code] || ["--", "\u2753"];
}

function tempColor(temp) {
  if (temp <= 0) return "#38bdf8";
  if (temp <= 10) return "#22d3ee";
  if (temp <= 20) return "#34d399";
  if (temp <= 30) return "#fbbf24";
  if (temp <= 35) return "#f97316";
  return "#ef4444";
}

function formatTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Rain animation
function createRain(intensity) {
  const el = document.getElementById("rain-container");
  el.innerHTML = "";
  if (intensity <= 0) return;
  const count = Math.min(Math.floor(intensity * 2), 60);
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("div");
    drop.classList.add("raindrop");
    drop.style.left = Math.random() * 100 + "%";
    drop.style.height = (Math.random() * 20 + 10) + "px";
    drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    drop.style.opacity = Math.random() * 0.4 + 0.1;
    el.appendChild(drop);
  }
}

// Wind particles
function createWind(speed) {
  const el = document.getElementById("particles-container");
  el.innerHTML = "";
  const count = Math.min(Math.floor(speed / 5), 15);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.classList.add("wind-particle");
    p.style.top = Math.random() * 100 + "%";
    p.style.width = (Math.random() * 40 + 20) + "px";
    p.style.animationDuration = (Math.random() * 3 + 2) + "s";
    p.style.animationDelay = Math.random() * 3 + "s";
    el.appendChild(p);
  }
}

// Build clock markers
function buildClock(hourly, startIdx) {
  const markersG = document.getElementById("hour-markers");
  const dotsG = document.getElementById("hour-dots");
  const tempRing = document.getElementById("temp-ring");
  markersG.innerHTML = "";
  dotsG.innerHTML = "";
  tempRing.innerHTML = "";

  const cx = 200, cy = 200, r = 170;
  const temps = [];

  for (let i = 0; i < 24; i++) {
    const idx = startIdx + i;
    if (idx >= hourly.time.length) break;
    const d = new Date(hourly.time[idx]);
    const h = d.getHours();
    const angle = ((h / 12) * 360 - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const temp = hourly.temperature_2m[idx];
    temps.push(temp);

    // Hour label
    const lr = r + 16;
    const lx = cx + lr * Math.cos(angle);
    const ly = cy + lr * Math.sin(angle);
    const label = h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? h + "a" : (h - 12) + "p";

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", lx);
    text.setAttribute("y", ly);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", "rgba(255,255,255,0.35)");
    text.setAttribute("font-size", "9");
    text.textContent = label;
    markersG.appendChild(text);

    // Temperature dot
    const dr = 130;
    const dx = cx + dr * Math.cos(angle);
    const dy = cy + dr * Math.sin(angle);
    const dotSize = Math.max(3, Math.min(8, temp / 5));

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", dx);
    circle.setAttribute("cy", dy);
    circle.setAttribute("r", dotSize);
    circle.setAttribute("fill", tempColor(temp));
    circle.setAttribute("opacity", "0.7");
    circle.classList.add("hour-marker");
    circle.dataset.index = idx;

    circle.addEventListener("click", (e) => {
      e.stopPropagation();
      showPopup(idx, x, y);
    });

    dotsG.appendChild(circle);
  }

  // Temperature ring
  if (temps.length > 1) {
    let pathD = "";
    for (let i = 0; i < temps.length; i++) {
      const angle = ((i / temps.length) * 360 - 90) * (Math.PI / 180);
      const ringR = 100 + (temps[i] / 45) * 30;
      const px = cx + ringR * Math.cos(angle);
      const py = cy + ringR * Math.sin(angle);
      pathD += (i === 0 ? "M" : "L") + `${px},${py}`;
    }
    pathD += "Z";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(255,255,255,0.08)");
    path.setAttribute("stroke-width", "1.5");
    tempRing.appendChild(path);
  }
}

// Clock hand
function updateClockHand() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const angle = ((hours + minutes / 60) / 12) * 360 - 90;
  const rad = angle * (Math.PI / 180);
  const len = 100;
  const hand = document.getElementById("clock-hand");
  hand.setAttribute("x2", 200 + len * Math.cos(rad));
  hand.setAttribute("y2", 200 + len * Math.sin(rad));
}

// Hour popup
function showPopup(idx, anchorX, anchorY) {
  if (!hourlyData) return;
  const popup = document.getElementById("hour-popup");

  if (activeMarker === idx) {
    popup.classList.add("hidden");
    activeMarker = null;
    document.querySelectorAll(".hour-marker").forEach(m => m.classList.remove("active"));
    return;
  }

  activeMarker = idx;
  document.querySelectorAll(".hour-marker").forEach(m => m.classList.remove("active"));
  const marker = document.querySelector(`.hour-marker[data-index="${idx}"]`);
  if (marker) marker.classList.add("active");

  const [desc, icon] = info(hourlyData.weather_code[idx]);
  const temp = Math.round(hourlyData.temperature_2m[idx]);
  const rain = hourlyData.precipitation_probability[idx];
  const wind = Math.round(hourlyData.wind_speed_10m[idx]);
  const timeStr = formatTime(hourlyData.time[idx]);

  document.getElementById("popup-time").textContent = timeStr;
  document.getElementById("popup-icon").textContent = icon;
  document.getElementById("popup-temp").textContent = `${temp}\u00B0C`;
  document.getElementById("popup-temp").style.color = tempColor(temp);
  document.getElementById("popup-desc").textContent = desc;

  document.getElementById("popup-details").innerHTML = `
    <div class="pd-item">
      <div class="pd-label">Rain</div>
      <div class="pd-val">${rain}%</div>
      <div class="pd-rain-bar"><div class="pd-rain-fill" style="width:${rain}%"></div></div>
    </div>
    <div class="pd-item">
      <div class="pd-label">Wind</div>
      <div class="pd-val">${wind} km/h</div>
    </div>
    <div class="pd-item">
      <div class="pd-label">Temp</div>
      <div class="pd-val">${temp}\u00B0</div>
    </div>
    <div class="pd-item">
      <div class="pd-label">Conditions</div>
      <div class="pd-val">${desc}</div>
    </div>
  `;

  const svg = document.getElementById("clock-svg");
  const rect = svg.getBoundingClientRect();
  const scaleX = rect.width / 400;
  const scaleY = rect.height / 400;

  let px = rect.left + anchorX * scaleX;
  let py = rect.top + anchorY * scaleY;

  if (px + 220 > window.innerWidth) px = window.innerWidth - 230;
  if (px < 10) px = 10;
  if (py + 280 > window.innerHeight) py = py - 280;
  if (py < 10) py = 10;

  popup.style.left = px + "px";
  popup.style.top = py + "px";
  popup.classList.remove("hidden");
}

// Sun arc
function updateSunArc(data) {
  if (!data.daily) return;
  const sunrise = new Date(data.daily.sunrise[0]);
  const sunset = new Date(data.daily.sunset[0]);
  const now = data._isHistorical ? new Date(data._date + "T12:00:00") : new Date();

  const dayStart = sunrise.getHours() * 60 + sunrise.getMinutes();
  const dayEnd = sunset.getHours() * 60 + sunset.getMinutes();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const progress = Math.max(0, Math.min(1, (nowMin - dayStart) / (dayEnd - dayStart)));

  const sx = 20 + progress * 260;
  const sy = 90 - Math.sin(progress * Math.PI) * 110;

  document.getElementById("sun-dot").setAttribute("cx", sx);
  document.getElementById("sun-dot").setAttribute("cy", sy);
  document.getElementById("sunrise-label").textContent = formatTime(sunrise);
  document.getElementById("sunset-label").textContent = formatTime(sunset);
}

// Stats
function updateStats(data, hourIdx) {
  const isHistorical = data._isHistorical;
  const rainNow = hourlyData ? hourlyData.precipitation_probability[hourIdx || 0] : 0;
  let wind, humidity;

  if (isHistorical) {
    wind = hourlyData ? hourlyData.wind_speed_10m[hourIdx || 0] : 0;
    humidity = 50;
  } else {
    const c = data.current;
    wind = c.wind_speed_10m;
    humidity = c.relative_humidity_2m;
  }

  document.getElementById("rain-value").textContent = rainNow + "%";
  document.getElementById("wind-value").textContent = Math.round(wind) + " km/h";
  document.getElementById("humidity-value").textContent = humidity + "%";

  document.getElementById("rain-visual").innerHTML = `<div class="rain-anim"><div class="drop"></div><div class="drop"></div><div class="drop"></div></div>`;
  document.getElementById("wind-visual").innerHTML = `<div class="wind-anim"><div class="line"></div><div class="line"></div><div class="line"></div></div>`;
  document.getElementById("humidity-visual").innerHTML = `<div class="humidity-anim"><div class="wave"></div></div>`;

  createRain(rainNow);
  createWind(wind);
}

// === EXPORTED ===

export function renderLocation(data) {
  const lat = data.latitude;
  const lon = data.longitude;
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";

  let city = data._city || "";
  let country = data._country || "";
  let admin1 = data._admin1 || "";
  let district = data._district || "";

  let nameStr = "";
  if (district && city) nameStr = district + ", " + city;
  else if (admin1 && city) nameStr = city + ", " + admin1;
  else if (country && city) nameStr = city + ", " + country;
  else if (city) nameStr = city;
  else if (country) nameStr = country;

  document.getElementById("city-name").textContent = nameStr || "Your Location";
  document.getElementById("coords").textContent =
    `${Math.abs(lat).toFixed(4)}\u00B0${latDir}  ${Math.abs(lon).toFixed(4)}\u00B0${lonDir}`;
}

export function renderCurrent(data) {
  const isHistorical = data._isHistorical;
  const date = data._date;
  let c, desc, icon, temp;

  if (isHistorical) {
    const h = data.hourly;
    const noonIdx = h.time.findIndex(t => t.includes("T12:00"));
    const idx = noonIdx >= 0 ? noonIdx : 0;
    c = {
      weather_code: h.weather_code[idx],
      temperature_2m: h.temperature_2m[idx],
      wind_speed_10m: h.wind_speed_10m[idx],
      relative_humidity_2m: 50
    };
  } else {
    c = data.current;
  }

  [desc, icon] = info(c.weather_code);
  temp = Math.round(c.temperature_2m);

  const displayDate = date ? new Date(date + "T12:00:00") : new Date();
  document.getElementById("clock-day").textContent = displayDate.toLocaleDateString("en-US", { weekday: "long" });
  document.getElementById("clock-date").textContent = displayDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  document.getElementById("clock-icon").textContent = icon;
  document.getElementById("clock-temp").textContent = `${temp}\u00B0`;
  document.getElementById("clock-temp").style.color = tempColor(temp);
  document.getElementById("clock-desc").textContent = isHistorical ? desc + " (historical)" : desc;

  if (!isHistorical) {
    updateClockHand();
    setInterval(updateClockHand, 60000);
  }
  updateSunArc(data);
}

export function renderHourly(data) {
  hourlyData = data.hourly;
  if (!hourlyData) return;

  let startIdx;
  if (data._isHistorical) {
    startIdx = 0;
  } else {
    const now = new Date();
    startIdx = hourlyData.time.findIndex(t => new Date(t) >= now);
    startIdx = Math.max(0, startIdx);
  }
  buildClock(hourlyData, startIdx);
  updateStats(data, startIdx);
  updateOutfit(data);
  updateActivities(data);
}

function updateOutfit(data) {
  const el = document.getElementById("outfit-items");
  const isHistorical = data._isHistorical;
  let temp, rain, wind;

  if (isHistorical && hourlyData) {
    temp = hourlyData.temperature_2m[12] || 15;
    rain = hourlyData.precipitation_probability[12] || 0;
    wind = hourlyData.wind_speed_10m[12] || 0;
  } else {
    temp = data.current.temperature_2m;
    rain = hourlyData ? hourlyData.precipitation_probability[0] : 0;
    wind = data.current.wind_speed_10m;
  }

  const items = [];

  if (temp <= 5) items.push({ icon: "\uD83E\uDDE5", text: "Heavy coat" });
  else if (temp <= 12) items.push({ icon: "\uD83E\uDDE4", text: "Jacket" });
  else if (temp <= 20) items.push({ icon: "\uD83D\uDC55", text: "Light layers" });
  else if (temp <= 28) items.push({ icon: "\uD83D\uDC5A", text: "T-shirt" });
  else items.push({ icon: "\uD83D\uDC59", text: "Shorts" });

  if (rain > 50) items.push({ icon: "\u2602\uFE0F", text: "Umbrella" });
  else if (rain > 20) items.push({ icon: "\uD83E\uDD7B", text: "Rain jacket" });

  if (wind > 30) items.push({ icon: "\uD83C\uDF2C\uFE0F", text: "Windbreaker" });

  if (temp > 20 && rain < 30) items.push({ icon: "\uD83D\uDD76\uFE0F", text: "Sunglasses" });

  if (temp <= 0) items.push({ icon: "\uD83E\uDDF4", text: "Scarf" });

  el.innerHTML = items.map((item, i) =>
    `<div class="outfit-item" style="animation-delay:${i * 0.1}s">
      <span class="outfit-icon">${item.icon}</span>
      <span class="outfit-text">${item.text}</span>
    </div>`
  ).join("");

  document.getElementById("outfit-section").classList.remove("hidden");
}

function updateActivities(data) {
  const el = document.getElementById("activity-badges");
  const isHistorical = data._isHistorical;
  let temp, rain, wind;

  if (isHistorical && hourlyData) {
    temp = hourlyData.temperature_2m[12] || 15;
    rain = hourlyData.precipitation_probability[12] || 0;
    wind = hourlyData.wind_speed_10m[12] || 0;
  } else {
    temp = data.current.temperature_2m;
    rain = hourlyData ? hourlyData.precipitation_probability[0] : 0;
    wind = data.current.wind_speed_10m;
  }

  const activities = [
    { name: "Picnic", icon: "\uD83C\uDF7E", good: rain < 20 && temp > 10 && temp < 35 },
    { name: "Beach", icon: "\uD83C\uDFD6\uFE0F", good: temp > 25 && rain < 20 },
    { name: "Hiking", icon: "\uD83E\uDD7E", good: temp > 5 && temp < 30 && rain < 40 && wind < 40 },
    { name: "Running", icon: "\uD83C\uDFC3", good: temp > 8 && temp < 28 && rain < 30 },
    { name: "Cycling", icon: "\uD83D\uDEB4", good: temp > 8 && temp < 30 && rain < 25 && wind < 35 },
    { name: "Photos", icon: "\uD83D\uDCF7", good: rain < 50 },
    { name: "Reading", icon: "\uD83D\uDCDA", good: true },
    { name: "Cooking", icon: "\uD83C\uDF73", good: true },
  ];

  el.innerHTML = activities.map((a, i) =>
    `<div class="activity-badge ${a.good ? 'good' : 'bad'}" style="animation-delay:${i * 0.05}s">
      <span>${a.icon}</span>
      <span>${a.name}</span>
    </div>`
  ).join("");

  document.getElementById("activities-section").classList.remove("hidden");
}

export function showLoading() {
  document.getElementById("loading-screen").classList.remove("hidden");
  document.getElementById("clock-area").classList.add("hidden");
  document.getElementById("stats-row").classList.add("hidden");
  document.getElementById("sun-arc").classList.add("hidden");
  document.getElementById("outfit-section").classList.add("hidden");
  document.getElementById("activities-section").classList.add("hidden");
  document.getElementById("error-screen").classList.add("hidden");
}

export function showMain() {
  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("clock-area").classList.remove("hidden");
  document.getElementById("stats-row").classList.remove("hidden");
  document.getElementById("sun-arc").classList.remove("hidden");
  document.getElementById("error-screen").classList.add("hidden");
}

export function showError(msg) {
  document.getElementById("loading-screen").classList.add("hidden");
  document.getElementById("clock-area").classList.add("hidden");
  document.getElementById("stats-row").classList.add("hidden");
  document.getElementById("sun-arc").classList.add("hidden");
  document.getElementById("outfit-section").classList.add("hidden");
  document.getElementById("activities-section").classList.add("hidden");
  document.getElementById("error-screen").classList.remove("hidden");
  document.getElementById("error-msg").textContent = msg;
}
