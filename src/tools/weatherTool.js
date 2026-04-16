const STORAGE_KEY = 'student-tools:weather-saved-locations-v2';

const weatherCodeMap = {
  0: { label: 'Clear sky', suggestion: 'A good day to go outside.' },
  1: { label: 'Mainly clear', suggestion: 'A light jacket may be enough.' },
  2: { label: 'Partly cloudy', suggestion: 'Keep a light layer with you.' },
  3: { label: 'Overcast', suggestion: 'Cloudy day, stay prepared.' },
  45: { label: 'Fog', suggestion: 'Drive carefully and stay visible.' },
  48: { label: 'Fog', suggestion: 'Drive carefully and stay visible.' },
  51: { label: 'Light drizzle', suggestion: 'Bring a small umbrella.' },
  53: { label: 'Drizzle', suggestion: 'Bring an umbrella.' },
  55: { label: 'Heavy drizzle', suggestion: 'Bring an umbrella and wear water-resistant shoes.' },
  61: { label: 'Light rain', suggestion: 'Bring an umbrella.' },
  63: { label: 'Rain', suggestion: 'Bring an umbrella or raincoat.' },
  65: { label: 'Heavy rain', suggestion: 'Bring an umbrella and a raincoat.' },
  66: { label: 'Freezing rain', suggestion: 'Be careful on roads and paths.' },
  67: { label: 'Freezing rain', suggestion: 'Be careful on roads and paths.' },
  71: { label: 'Light snow', suggestion: 'Wear warm clothes and be careful.' },
  73: { label: 'Snow', suggestion: 'Wear warm clothes and be careful.' },
  75: { label: 'Heavy snow', suggestion: 'Wear warm clothes and watch for slippery ground.' },
  77: { label: 'Snow grains', suggestion: 'Stay warm and watch your steps.' },
  80: { label: 'Rain showers', suggestion: 'Bring an umbrella.' },
  81: { label: 'Rain showers', suggestion: 'Bring an umbrella.' },
  82: { label: 'Violent rain showers', suggestion: 'Bring an umbrella and avoid long outdoor trips.' },
  85: { label: 'Snow showers', suggestion: 'Wear warm clothes.' },
  86: { label: 'Snow showers', suggestion: 'Wear warm clothes.' },
  95: { label: 'Thunderstorm', suggestion: 'Stay indoors if possible and avoid open areas.' },
  96: { label: 'Thunderstorm with hail', suggestion: 'Stay indoors and avoid open areas.' },
  99: { label: 'Thunderstorm with hail', suggestion: 'Stay indoors and avoid open areas.' }
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
};

const escapeHtml = (value) => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const getWeatherMeta = (code) => weatherCodeMap[code] || { label: 'Unknown weather', suggestion: 'Check the forecast before going out.' };

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀';
  if ([1, 2].includes(code)) return '⛅';
  if (code === 3) return '☁';
  if ([45, 48].includes(code)) return '🌫';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ([95, 96, 99].includes(code)) return '⛈';
  return '🌤';
};

const getUmbrellaSuggestion = (weatherCode, precipitationChance) => {
  const rainyCodes = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82];
  return rainyCodes.includes(weatherCode) || precipitationChance >= 40
    ? 'It may rain. Bring an umbrella.'
    : 'No umbrella needed based on the current forecast.';
};

const buildLocationLabel = (location) => {
  return [location.name, location.admin1, location.country].filter(Boolean).join(', ');
};

const getLocationKey = (location) => {
  return `${Number(location.latitude).toFixed(4)}:${Number(location.longitude).toFixed(4)}`;
};

const loadSavedLocations = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveSavedLocations = (locations) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
};

const buildSnapshot = (payload, location) => {
  const current = payload.current || {};
  const daily = payload.daily || {};
  const weatherCode = Number(current.weather_code ?? daily.weather_code?.[0] ?? 0);
  const meta = getWeatherMeta(weatherCode);
  const precipitationChance = Number(daily.precipitation_probability_max?.[0] ?? 0);

  return {
    locationKey: getLocationKey(location),
    locationLabel: buildLocationLabel(location),
    forecastDate: daily.time?.[0] || new Date().toISOString().slice(0, 10),
    emoji: getWeatherEmoji(weatherCode),
    metaLabel: meta.label,
    temperature: current.temperature_2m ?? daily.temperature_2m_max?.[0],
    windSpeed: current.wind_speed_10m,
    minTemp: daily.temperature_2m_min?.[0],
    maxTemp: daily.temperature_2m_max?.[0],
    precipitationChance,
    umbrellaSuggestion: getUmbrellaSuggestion(weatherCode, precipitationChance),
    tip: meta.suggestion
  };
};

const renderWeatherCard = (snapshot, options = {}) => {
  const { isCurrent = false, showRemove = false } = options;

  return `
    <article class="weather-location-card ${isCurrent ? 'current-weather-card' : ''}" data-location-key="${escapeHtml(snapshot.locationKey)}">
      <div class="weather-location-head">
        <div>
          <div class="weather-location-label">${isCurrent ? 'Current location' : 'Saved location'}</div>
          <h3>${escapeHtml(snapshot.locationLabel)}</h3>
        </div>
        <div class="weather-location-icon">${escapeHtml(snapshot.emoji || '🌤')}</div>
      </div>

      <p class="weather-date">${escapeHtml(snapshot.forecastDate || '--')}</p>

      <div class="weather-grid compact">
        <div class="weather-metric"><span>Today</span><strong>${escapeHtml(snapshot.metaLabel || '--')}</strong></div>
        <div class="weather-metric"><span>Temperature</span><strong>${snapshot.temperature ?? '--'}°C</strong></div>
        <div class="weather-metric"><span>Wind</span><strong>${snapshot.windSpeed ?? '--'} km/h</strong></div>
        <div class="weather-metric"><span>Min / Max</span><strong>${snapshot.minTemp ?? '--'}°C / ${snapshot.maxTemp ?? '--'}°C</strong></div>
        <div class="weather-metric"><span>Rain chance</span><strong>${snapshot.precipitationChance ?? '--'}%</strong></div>
        <div class="weather-metric"><span>Advice</span><strong>${escapeHtml(snapshot.umbrellaSuggestion || '--')}</strong></div>
      </div>

      <div class="weather-tip"><strong>Tip:</strong> ${escapeHtml(snapshot.tip || 'Check the forecast before going out.')}</div>

      ${showRemove ? `<div class="weather-location-actions"><button type="button" class="remove-row weather-remove-btn" data-location-key="${escapeHtml(snapshot.locationKey)}">Remove</button></div>` : ''}
    </article>
  `;
};

export const weatherTool = {
  id: 'weather',
  label: 'Weather',
  render: () => `
    <section class="card weather-card">
      <h2>Weather</h2>
      <p>Look up today's weather, save locations you want to keep, and compare them side by side.</p>

      <div class="weather-search-row">
        <input id="weather-city" type="text" placeholder="Enter a city or town" />
        <button id="weather-search-btn" class="action-btn primary" type="button">Check Weather</button>
      </div>

      <div class="weather-actions-row">
        <button id="weather-save-btn" class="action-btn" type="button" disabled>Save Location</button>
        <button id="weather-clear-saved-btn" class="remove-row" type="button">Clear Saved</button>
      </div>

      <div id="weather-status" class="weather-status">Search for a place to see today's weather.</div>

      <div class="weather-dashboard">
        <div class="weather-dashboard-column">
          <div class="weather-section-title">Current weather</div>
          <div id="weather-current" class="weather-result"></div>
        </div>

        <div class="weather-dashboard-column">
          <div class="weather-section-title">Saved locations</div>
          <div id="weather-saved-grid" class="weather-saved-grid"></div>
        </div>
      </div>
    </section>
  `,
  mount: (root) => {
    const cityInput = root.querySelector('#weather-city');
    const searchBtn = root.querySelector('#weather-search-btn');
    const saveBtn = root.querySelector('#weather-save-btn');
    const clearSavedBtn = root.querySelector('#weather-clear-saved-btn');
    const statusBox = root.querySelector('#weather-status');
    const currentBox = root.querySelector('#weather-current');
    const savedGrid = root.querySelector('#weather-saved-grid');

    let savedLocations = loadSavedLocations();
    let currentLocation = null;
    let currentSnapshot = null;

    const renderCurrent = () => {
      if (!currentSnapshot) {
        currentBox.innerHTML = '<div class="weather-empty">Search for a city to see today\'s weather.</div>';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Save Location';
        return;
      }

      currentBox.innerHTML = renderWeatherCard(currentSnapshot, { isCurrent: true });
      saveBtn.disabled = savedLocations.some((item) => item.locationKey === currentSnapshot.locationKey);
      saveBtn.textContent = saveBtn.disabled ? 'Saved' : 'Save Location';
    };

    const renderSaved = async () => {
      if (!savedLocations.length) {
        savedGrid.innerHTML = '<div class="weather-empty">No saved locations yet. Save a search to compare it later.</div>';
        return;
      }

      savedGrid.innerHTML = savedLocations
        .map(
          (location) => `
            <article class="weather-location-card weather-loading-card" data-location-key="${escapeHtml(location.locationKey)}">
              <div class="weather-location-head">
                <div>
                  <div class="weather-location-label">Saved location</div>
                  <h3>${escapeHtml(buildLocationLabel(location))}</h3>
                </div>
                <div class="weather-location-icon">⌛</div>
              </div>
              <p class="weather-date">Loading weather...</p>
              <div class="weather-tip">Please wait while today\'s weather loads.</div>
            </article>
          `
        )
        .join('');

      const snapshots = await Promise.all(
        savedLocations.map(async (location) => {
          try {
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
            const weatherData = await fetchJson(weatherUrl);
            return buildSnapshot(weatherData, location);
          } catch {
            return {
              locationKey: location.locationKey,
              locationLabel: buildLocationLabel(location),
              forecastDate: new Date().toISOString().slice(0, 10),
              emoji: '⚠',
              metaLabel: 'Unavailable',
              temperature: null,
              windSpeed: null,
              minTemp: null,
              maxTemp: null,
              precipitationChance: null,
              umbrellaSuggestion: 'Weather unavailable right now.',
              tip: 'Try refreshing later.'
            };
          }
        })
      );

      savedGrid.innerHTML = snapshots.map((snapshot) => renderWeatherCard(snapshot, { showRemove: true })).join('');
    };

    const refreshPanels = async () => {
      renderCurrent();
      await renderSaved();
    };

    const searchWeather = async () => {
      const city = cityInput.value.trim();
      if (!city) {
        statusBox.textContent = 'Please enter a city or town name.';
        return;
      }

      statusBox.textContent = 'Searching weather...';
      currentBox.innerHTML = '<div class="weather-empty">Loading weather...</div>';

      try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geocodeData = await fetchJson(geocodeUrl);
        const location = geocodeData.results?.[0];

        if (!location) {
          statusBox.textContent = 'No location found. Try another city name.';
          currentSnapshot = null;
          currentLocation = null;
          renderCurrent();
          return;
        }

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
        const weatherData = await fetchJson(weatherUrl);

        currentLocation = { ...location, locationKey: getLocationKey(location) };
        currentSnapshot = buildSnapshot(weatherData, currentLocation);
        statusBox.textContent = `Showing today's weather for ${currentSnapshot.locationLabel}.`;
        await refreshPanels();
      } catch {
        statusBox.textContent = 'Unable to load weather right now. Please try again.';
        currentBox.innerHTML = '<div class="weather-empty">Unable to load weather right now.</div>';
      }
    };

    saveBtn.addEventListener('click', async () => {
      if (!currentLocation || !currentSnapshot) {
        statusBox.textContent = 'Search for a location first.';
        return;
      }

      if (savedLocations.some((item) => item.locationKey === currentLocation.locationKey)) {
        statusBox.textContent = 'That location is already saved.';
        return;
      }

      savedLocations = [currentLocation, ...savedLocations];
      saveSavedLocations(savedLocations);
      statusBox.textContent = `${currentSnapshot.locationLabel} saved.`;
      await refreshPanels();
    });

    clearSavedBtn.addEventListener('click', async () => {
      if (!window.confirm('Delete all saved locations? This cannot be undone.')) {
        statusBox.textContent = 'Clear saved locations canceled.';
        return;
      }

      savedLocations = [];
      saveSavedLocations(savedLocations);
      statusBox.textContent = 'Saved locations cleared.';
      await refreshPanels();
    });

    savedGrid.addEventListener('click', async (event) => {
      const removeBtn = event.target.closest('.weather-remove-btn');
      if (!removeBtn) {
        return;
      }

      const locationKey = removeBtn.dataset.locationKey;
      if (!window.confirm('Remove this saved location?')) {
        statusBox.textContent = 'Remove canceled.';
        return;
      }

      savedLocations = savedLocations.filter((item) => item.locationKey !== locationKey);
      saveSavedLocations(savedLocations);
      statusBox.textContent = 'Saved location removed.';
      await refreshPanels();
    });

    searchBtn.addEventListener('click', searchWeather);
    cityInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        searchWeather();
      }
    });

    refreshPanels();
  }
};