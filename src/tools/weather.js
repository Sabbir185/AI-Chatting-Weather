export const weatherToolDefinition = {
  type: "function",
  function: {
    name: "get_current_weather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "The location to get the weather for, e.g. San Francisco, CA",
        },
        format: {
          type: "string",
          description:
            "The format to return the weather in, e.g. 'celsius' or 'fahrenheit'",
          enum: ["celsius", "fahrenheit"],
        },
      },
      required: ["location", "format"],
    },
  },
};

const COUNTRY_FALLBACK_CITY = {
  bangladesh: "Dhaka, Bangladesh",
  india: "New Delhi, India",
  pakistan: "Islamabad, Pakistan",
  nepal: "Kathmandu, Nepal",
  "sri lanka": "Colombo, Sri Lanka",
  usa: "Washington, DC, USA",
  "united states": "Washington, DC, USA",
  uk: "London, United Kingdom",
  "united kingdom": "London, United Kingdom",
};

const LOCATION_COORD_FALLBACK = {
  bangladesh: { latitude: 23.8103, longitude: 90.4125, label: "Dhaka, Bangladesh" },
  india: { latitude: 28.6139, longitude: 77.209, label: "New Delhi, India" },
  pakistan: { latitude: 33.6844, longitude: 73.0479, label: "Islamabad, Pakistan" },
  nepal: { latitude: 27.7172, longitude: 85.324, label: "Kathmandu, Nepal" },
  "sri lanka": { latitude: 6.9271, longitude: 79.8612, label: "Colombo, Sri Lanka" },
};

function weatherCodeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
  };

  return map[code] || `Weather code ${code}`;
}

function normalizeLocation(location) {
  const key = String(location || "").trim().toLowerCase();
  return COUNTRY_FALLBACK_CITY[key] || location;
}

async function fetchJsonWithRetry(url, { retries = 4, timeoutMs = 15000 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      return await resp.json();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

async function getWeatherFromWttr(location, format) {
  const wttrUrl = new URL(`https://wttr.in/${encodeURIComponent(location)}`);
  wttrUrl.searchParams.set("format", "j1");

  const wttrData = await fetchJsonWithRetry(wttrUrl, {
    retries: 2,
    timeoutMs: 12000,
  });

  const current = wttrData.current_condition?.[0];
  if (!current) {
    return null;
  }

  const tempKey = format === "fahrenheit" ? "temp_F" : "temp_C";
  const windKey = format === "fahrenheit" ? "Miles" : "Kmph";

  return {
    location,
    temperature: Number(current[tempKey]),
    temperature_unit: format === "fahrenheit" ? "degF" : "degC",
    wind_speed: Number(current[`windspeed${windKey}`]),
    wind_speed_unit: format === "fahrenheit" ? "mph" : "km/h",
    condition: current.weatherDesc?.[0]?.value || "Unknown",
    observed_at: current.localObsDateTime || new Date().toISOString(),
    source: "wttr.in",
  };
}

export async function getCurrentWeather({ location, format }) {
  const locationKey = String(location || "").trim().toLowerCase();
  const normalizedLocation = normalizeLocation(location);
  const temperatureUnit = format === "fahrenheit" ? "fahrenheit" : "celsius";
  const windSpeedUnit = format === "fahrenheit" ? "mph" : "kmh";

  try {
    let place;
    const fallbackCoord = LOCATION_COORD_FALLBACK[locationKey];

    if (fallbackCoord) {
      place = {
        latitude: fallbackCoord.latitude,
        longitude: fallbackCoord.longitude,
        name: fallbackCoord.label,
        country: "",
      };
    } else {
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.searchParams.set("name", normalizedLocation);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "en");
      geoUrl.searchParams.set("format", "json");

      const geoData = await fetchJsonWithRetry(geoUrl);
      if (!geoData.results || geoData.results.length === 0) {
        return { error: `No matching location found for '${location}'` };
      }

      place = geoData.results[0];
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(place.latitude));
    forecastUrl.searchParams.set("longitude", String(place.longitude));
    forecastUrl.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    forecastUrl.searchParams.set("temperature_unit", temperatureUnit);
    forecastUrl.searchParams.set("wind_speed_unit", windSpeedUnit);

    const forecastData = await fetchJsonWithRetry(forecastUrl);
    const current = forecastData.current;

    if (!current || !forecastData.current_units) {
      return {
        error: "Weather API returned incomplete data. Please try again in a moment.",
      };
    }

    return {
      location: place.country ? `${place.name}, ${place.country}` : place.name,
      temperature: current.temperature_2m,
      temperature_unit: forecastData.current_units.temperature_2m,
      wind_speed: current.wind_speed_10m,
      wind_speed_unit: forecastData.current_units.wind_speed_10m,
      condition: weatherCodeToText(current.weather_code),
      observed_at: current.time,
      source: "open-meteo",
    };
  } catch (openMeteoError) {
    try {
      const fallback = await getWeatherFromWttr(normalizedLocation, format);
      if (fallback) {
        return fallback;
      }
    } catch {
      // Ignore fallback errors and return a clear message below.
    }

    return {
      error: "Weather service is temporarily unavailable. Please try again shortly.",
      details: openMeteoError.message,
    };
  }
}
