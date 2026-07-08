const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const GEO = "https://geocoding-api.open-meteo.com/v1/search";

export async function getByCoords(lat, lon, date) {
  const isHistorical = date && date < new Date().toISOString().split("T")[0];
  const base = isHistorical ? ARCHIVE : FORECAST;

  let url = `${base}?latitude=${lat}&longitude=${lon}&timezone=auto`;

  if (isHistorical) {
    url += `&start_date=${date}&end_date=${date}`;
    url += `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`;
    url += `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset`;
  } else {
    url += `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,surface_pressure`;
    url += `&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m`;
    url += `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather data unavailable");
  const data = await res.json();
  data.latitude = lat;
  data.longitude = lon;
  data._isHistorical = !!isHistorical;
  data._date = date;
  return data;
}

export async function getByCity(city, date) {
  const geoRes = await fetch(`${GEO}?name=${encodeURIComponent(city)}&count=1`);
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error("City not found");
  }
  const r = geoData.results[0];
  const weather = await getByCoords(r.latitude, r.longitude, date);
  weather._city = r.name;
  weather._country = r.country || "";
  weather._admin1 = r.admin1 || "";
  return weather;
}

export async function getLocationName(lat, lon) {
  const apis = [
    { url: `https://bigdatacloud.com/api/v3/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, parse: d => ({ city: d.locality || d.city || "", country: d.countryName || "", admin1: d.principalSubdivision || "", district: d.localityInfo?.democratic?.[0]?.name || "" }) },
    { url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&accept-language=en`, parse: d => { const a = d.address || {}; return { city: a.city || a.town || a.village || a.hamlet || a.county || "", country: a.country || "", admin1: a.state || "", district: a.neighbourhood || a.suburb || a.quarter || "" }; } },
    { url: `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&format=json`, parse: d => { const a = d.address || {}; return { city: a.city || a.town || a.village || a.county || "", country: a.country || "", admin1: a.state || "", district: a.neighbourhood || a.suburb || a.quarter || "" }; } }
  ];

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { headers: { "Accept": "application/json" } });
      if (!res.ok) continue;
      const data = await res.json();
      const result = api.parse(data);
      if (result.city) return result;
    } catch {}
  }

  return { city: "", country: "", admin1: "", district: "" };
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error("Location access denied. Please allow location or search a city.")),
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  });
}
