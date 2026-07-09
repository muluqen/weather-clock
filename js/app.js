import { getByCoords, getByCity, getLocation, getLocationName } from "./weather.js";
import {
  renderLocation,
  renderCurrent,
  renderHourly,
  showLoading,
  showMain,
  showError
} from "./ui.js";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const suggestionsEl = document.getElementById("suggestions");
const retryBtn = document.getElementById("retry-btn");
const locBtn = document.getElementById("loc-btn");
const dateBar = document.getElementById("date-bar");
const dateDisplay = document.getElementById("date-display");
const datePicker = document.getElementById("date-picker");
const dateLabel = document.getElementById("date-label");
const dateBack = document.getElementById("date-back");
const dateForward = document.getElementById("date-forward");
const dateToday = document.getElementById("date-today");

let debounceTimer = null;
let activeIdx = -1;
let currentLat = null;
let currentLon = null;
let currentDate = null;

const weatherFacts = [
  "One hurricane can release as much energy as 10,000 nuclear bombs.",
  "Lightning is about 5 times hotter than the surface of the sun.",
  "The fastest wind ever recorded was 253 mph — during a cyclone in Australia in 1996.",
  "Snowflakes aren't actually white — they're made of clear ice.",
  "You'd need about 1.3 million Earths to fill the sun.",
  "Rain can contain vitamin B12 — made by bacteria living in clouds.",
  "Antarctica is the world's biggest desert — it gets less rain than the Sahara.",
  "A thunderstorm can drop ice balls as big as softballs.",
  "The Dead Sea is so salty you can't sink in it — you just float.",
  "No two snowflakes are exactly the same.",
  "Fog is just a cloud sitting on the ground.",
  "A big thundercloud can weigh over a million pounds.",
  "Tornado winds can exceed 300 mph — faster than any hurricane.",
  "The coldest temperature ever recorded was -128.6°F in Antarctica.",
  "Humidity makes hot days feel worse because your sweat can't dry.",
  "Lightning hits the Earth about 100 times every second.",
  "The rainiest place on Earth gets over 467 inches of rain per year — in India.",
  "Sunsets look red because the light has to travel through more air to reach you.",
  "Hailstones can fall at over 100 mph.",
  "That earthy smell after rain? It comes from bacteria in the soil.",
  "A hurricane loses power fast once it hits land.",
  "The longest rainstorm on record lasted 331 days — in Hawaii.",
  "The highest city in the world is in Peru — at 16,700 feet up.",
  "You can hear thunder from up to 15 miles away.",
  "Tornadoes aren't measured the same way as earthquakes.",
  "The sun will eventually swell up and swallow the inner planets.",
  "One inch of rain on one acre of land weighs over 113 tons.",
  "Snow can fall even when it's above freezing outside — if the air up high is cold enough.",
  "The Sahara Desert got snow in 2018 — the first time in living memory.",
  "Clouds weigh millions of pounds but float because the air below them is heavier.",
  "Cold wind feels colder because it strips heat from your skin faster.",
  "The Bay of Fundy has the biggest tides in the world — up to 53 feet.",
  "A blue moon is the second full moon in one month.",
  "Flamingos are pink because of the shrimp they eat.",
  "Earth's atmosphere stretches about 6,200 miles into space.",
  "The 1931 China floods killed up to 4 million people — the deadliest natural disaster ever.",
  "Lightning CAN strike the same place twice — it hits the Empire State Building about 20 times a year.",
  "The Great Storm of 1987 destroyed 15 million trees across the UK in one night.",
  "A Category 5 hurricane has winds of 157 mph or more.",
  "The hottest temperature ever recorded was 134°F in Death Valley in 1913."
];

function showDailyFact() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  const fact = weatherFacts[dayOfYear % weatherFacts.length];
  document.getElementById("fact-text").textContent = fact;
  document.getElementById("daily-fact").classList.remove("hidden");
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function shiftDate(str, days) {
  const d = new Date(str + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function updateDateLabel() {
  const today = todayStr();
  if (!currentDate || currentDate === today) {
    dateLabel.textContent = "Today";
  } else {
    dateLabel.textContent = formatDate(currentDate);
  }
  datePicker.value = currentDate || today;
}

async function loadWeather(promise) {
  showLoading();
  try {
    const data = await promise;
    if (!data._city) {
      const name = await getLocationName(data.latitude, data.longitude);
      if (name.city) {
        data._city = name.city;
        data._country = name.country;
        data._admin1 = name.admin1;
        data._district = name.district;
      }
    }
    currentLat = data.latitude;
    currentLon = data.longitude;
    currentDate = data._date || todayStr();
    renderLocation(data);
    renderCurrent(data);
    renderHourly(data);
    updateDateLabel();
    dateBar.classList.remove("hidden");
    showDailyFact();
    showMain();
  } catch (err) {
    showError(err.message);
  }
}

function loadCurrentLocation() {
  if (currentLat !== null && currentLon !== null) {
    loadWeather(getByCoords(currentLat, currentLon, currentDate));
  }
}

async function loadByLocation() {
  try {
    const { lat, lon } = await getLocation();
    currentDate = todayStr();
    await loadWeather(getByCoords(lat, lon, currentDate));
  } catch (err) {
    showError(err.message);
  }
}

// Date navigation
dateBack.addEventListener("click", () => {
  currentDate = shiftDate(currentDate || todayStr(), -1);
  loadCurrentLocation();
});

dateForward.addEventListener("click", () => {
  currentDate = shiftDate(currentDate || todayStr(), 1);
  loadCurrentLocation();
});

dateToday.addEventListener("click", () => {
  currentDate = todayStr();
  loadCurrentLocation();
});

dateDisplay.addEventListener("click", () => {
  datePicker.showPicker();
});

datePicker.addEventListener("change", () => {
  currentDate = datePicker.value;
  loadCurrentLocation();
});

// Autocomplete
async function fetchSuggestions(query) {
  if (query.length < 2) {
    suggestionsEl.classList.add("hidden");
    return;
  }
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`
    );
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      suggestionsEl.classList.add("hidden");
      return;
    }
    suggestionsEl.innerHTML = "";
    data.results.forEach((r) => {
      const div = document.createElement("div");
      div.classList.add("suggestion-item");
      const country = r.admin1 ? `${r.admin1}, ${r.country}` : r.country || "";
      div.innerHTML = `${r.name}<span class="suggestion-country">${country}</span>`;
      div.addEventListener("click", () => {
        searchInput.value = r.name;
        suggestionsEl.classList.add("hidden");
        activeIdx = -1;
        loadWeather(getByCoords(r.latitude, r.longitude, currentDate));
      });
      suggestionsEl.appendChild(div);
    });
    suggestionsEl.classList.remove("hidden");
    activeIdx = -1;
  } catch {
    suggestionsEl.classList.add("hidden");
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchSuggestions(searchInput.value.trim()), 250);
});

searchInput.addEventListener("keydown", (e) => {
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  if (suggestionsEl.classList.contains("hidden") || items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIdx = Math.min(activeIdx + 1, items.length - 1);
    items.forEach((el, i) => el.style.background = i === activeIdx ? "rgba(255,255,255,0.1)" : "");
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIdx = Math.max(activeIdx - 1, 0);
    items.forEach((el, i) => el.style.background = i === activeIdx ? "rgba(255,255,255,0.1)" : "");
  } else if (e.key === "Enter" && activeIdx >= 0) {
    e.preventDefault();
    items[activeIdx].click();
  } else if (e.key === "Escape") {
    suggestionsEl.classList.add("hidden");
    activeIdx = -1;
  }
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = searchInput.value.trim();
  if (city) loadWeather(getByCity(city, currentDate));
  suggestionsEl.classList.add("hidden");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#search-wrap")) {
    suggestionsEl.classList.add("hidden");
  }
});

retryBtn.addEventListener("click", loadByLocation);
locBtn.addEventListener("click", loadByLocation);

// Close popup on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".hour-marker") && !e.target.closest("#hour-popup")) {
    document.getElementById("hour-popup").classList.add("hidden");
    document.querySelectorAll(".hour-marker").forEach(m => m.classList.remove("active"));
  }
});

loadByLocation();
