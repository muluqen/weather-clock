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
  "A single hurricane can release as much energy as 10,000 nuclear bombs, which is why they cause so much destruction even days after making landfall.",
  "Lightning heats the air around it to about 50,000 degrees Fahrenheit, which is roughly five times hotter than the surface of the sun, but it only lasts a fraction of a second.",
  "The fastest wind speed ever recorded was 253 miles per hour, measured during Cyclone Olivia in Australia in 1996, strong enough to rip apart buildings.",
  "Snowflakes are actually made of clear ice and only look white because light bounces around inside them in a way that tricks your eyes into seeing white.",
  "The sun is so massive that you would need about 1.3 million Earths to fill it up completely, which is hard to even imagine.",
  "Rain can contain small amounts of vitamin B12, which is produced by bacteria that live high up in the clouds where we cannot reach them.",
  "Antarctica is technically the biggest desert on Earth because it gets less rain than even the Sahara Desert, even though it is covered in ice.",
  "A strong thunderstorm can drop chunks of ice called hailstones that are as big as softballs and fall at over 100 miles per hour.",
  "The Dead Sea is so salty that your body floats in it naturally and it is almost impossible to sink, no matter how hard you try.",
  "Every single snowflake has a unique shape because the ice crystals form differently depending on the temperature and humidity they pass through.",
  "Fog is not something separate from clouds, it is literally a cloud that sits right on the ground where you can walk through it.",
  "A single large thundercloud can weigh over a million pounds, but it floats because the air underneath it is even heavier and pushes it up.",
  "Tornadoes can have wind speeds exceeding 300 miles per hour, which is faster than any hurricane ever recorded and strong enough to lift cars off the ground.",
  "The coldest temperature ever recorded on Earth was minus 128.6 degrees Fahrenheit at a research station in Antarctica in 1983.",
  "Humidity makes hot days feel so much worse because your sweat cannot evaporate into the air when it is already full of moisture.",
  "Lightning strikes the surface of the Earth about 100 times every second, which adds up to around 8 million strikes per day.",
  "The rainiest place on Earth is a small town in India called Mawsynram, which gets over 467 inches of rain every single year.",
  "Sunsets look red and orange because the light has to travel through much more air to reach your eyes, and the air filters out the blue colors.",
  "Hailstones can fall from the sky at speeds over 100 miles per hour, which is why they can damage cars and break windows.",
  "That earthy smell you notice after rain is called petrichor and it comes from bacteria in the soil that release a special scent when they get wet.",
  "A hurricane loses most of its power within a day or two of hitting land because it needs warm ocean water to keep going and land cuts off that supply.",
  "The longest rainstorm ever recorded lasted 331 straight days in Hilo, Hawaii, which means it rained for almost an entire year without stopping.",
  "The highest city in the world is La Rinconada in Peru, sitting at over 16,700 feet above sea level, where the air is so thin that visitors often feel sick.",
  "You can hear thunder from a lightning strike that is up to 15 miles away, but if you hear it within 30 seconds of seeing the flash, the storm is close.",
  "Tornadoes are measured using a scale called the Enhanced Fujita scale, which is different from the Richter scale that is used for earthquakes.",
  "The sun will eventually run out of fuel and swell up into a red giant that will get so big it will swallow Mercury, Venus, and possibly Earth.",
  "A single inch of rain falling on one acre of land weighs over 113 tons, which is about the same weight as 20 elephants.",
  "Snow can fall even when the temperature outside is above freezing if the air higher up in the sky is cold enough to turn the rain into ice before it reaches you.",
  "The Sahara Desert actually got a rare snowfall in 2018, which was the first time anyone living there had ever seen snow in their lifetime.",
  "Clouds can weigh millions of pounds but they still float because the air underneath them is denser and pushes them upward like a balloon.",
  "Cold wind feels colder than still air at the same temperature because it blows away the thin layer of warm air your body creates around your skin.",
  "The Bay of Fundy in Canada has the highest tides in the world, with the water level rising and falling by up to 53 feet twice every day.",
  "A blue moon is the name given to the second full moon that happens in a single calendar month, which only happens about once every two to three years.",
  "Flamingos are not born pink, they get their color from the tiny shrimp and algae they eat, which are full of pink and orange pigments.",
  "Earth's atmosphere, the layer of air that keeps us alive, stretches about 6,200 miles into space, but most of it is packed into the first 10 miles.",
  "The 1931 China floods are considered the deadliest natural disaster in recorded history, killing an estimated one to four million people in a matter of weeks.",
  "Lightning absolutely can strike the same place more than once, and it actually strikes the Empire State Building about 20 times every year.",
  "The Great Storm of 1987 hit the UK with winds up to 120 miles per hour and destroyed about 15 million trees in a single night.",
  "A Category 5 hurricane, the strongest kind, has sustained winds of 157 miles per hour or higher, which can completely destroy well-built houses.",
  "The hottest temperature ever recorded on Earth was 134 degrees Fahrenheit in Death Valley, California in 1913, hot enough to cook an egg on the ground."
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
