'use strict';

/* Optional, standalone hub weather. Nothing is requested until a place is selected. */
(function () {
  const STORAGE_KEY = 'expense-tracker-weather';
  const FRESH_MS = 30 * 60 * 1000;
  const RETRY_MS = 5 * 60 * 1000;
  const TIMEOUT_MS = 12000;
  const IDS = ['hub-weather', 'weather-city', 'weather-date', 'weather-temp',
    'weather-condition', 'weather-icon', 'weather-status', 'weather-modal',
    'weather-close', 'weather-location', 'weather-search-form', 'weather-search-input',
    'weather-search-results', 'weather-settings-status', 'weather-refresh'];
  const CONDITIONS = {
    0: ['Ясно', 'sun'], 1: ['Преимущественно ясно', 'partly'],
    2: ['Переменная облачность', 'partly'], 3: ['Пасмурно', 'cloud'],
    45: ['Туман', 'fog'], 48: ['Изморозь', 'fog'],
    51: ['Слабая морось', 'rain'], 53: ['Морось', 'rain'], 55: ['Сильная морось', 'rain'],
    56: ['Ледяная морось', 'rain'], 57: ['Ледяная морось', 'rain'],
    61: ['Небольшой дождь', 'rain'], 63: ['Дождь', 'rain'], 65: ['Сильный дождь', 'rain'],
    66: ['Ледяной дождь', 'rain'], 67: ['Ледяной дождь', 'rain'],
    71: ['Небольшой снег', 'snow'], 73: ['Снег', 'snow'], 75: ['Сильный снег', 'snow'],
    77: ['Снежные зёрна', 'snow'], 80: ['Небольшой ливень', 'rain'],
    81: ['Ливень', 'rain'], 82: ['Сильный ливень', 'rain'],
    85: ['Снежный ливень', 'snow'], 86: ['Сильный снежный ливень', 'snow'],
    95: ['Гроза', 'thunder'], 96: ['Гроза с градом', 'thunder'], 99: ['Гроза с градом', 'thunder']
  };
  let nodes;
  let config = null;
  let data = null;
  let initialized = false;
  let loading = false;
  let failure = '';
  let lastAttempt = 0;
  let forecastVersion = 0;
  let searchVersion = 0;
  let locationVersion = 0;
  let forecastController = null;
  let searchController = null;
  let modalOpen = false;
  let returnFocus = null;
  let ownedModalLock = false;

  function available() {
    const root = document.documentElement;
    return !document.hidden && !root.hasAttribute('data-access-pending') &&
      !root.classList.contains('app-access-pending') &&
      !document.body.classList.contains('app-access-pending') &&
      !document.body.classList.contains('lock-screen-open');
  }

  function online() { return navigator.onLine !== false; }
  function validPlace(value) {
    return value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
      Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 &&
      typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 200;
  }
  function samePlace(a, b) {
    return a && b && a.latitude === b.latitude && a.longitude === b.longitude;
  }
  function validData(value, place) {
    return value && samePlace(value, place) && Number.isFinite(value.temperature) &&
      value.temperature >= -150 && value.temperature <= 100 &&
      Number.isInteger(value.code) && Object.prototype.hasOwnProperty.call(CONDITIONS, value.code) &&
      (value.isDay === 0 || value.isDay === 1) && Number.isFinite(value.updatedAt) &&
      value.updatedAt > 0 && value.updatedAt <= Date.now() + 60000;
  }
  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || stored.version !== 1 || !validPlace(stored.config)) return;
      config = { latitude: stored.config.latitude, longitude: stored.config.longitude, name: stored.config.name };
      if (validData(stored.data, config)) data = stored.data;
    } catch (_) { /* Storage may be unavailable or contain an older/corrupt entry. */ }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, config, data })); }
    catch (_) { /* Weather still works for this session in private/full storage. */ }
  }

  // Only constant geometry goes into SVG: API strings are always textContent.
  function drawIcon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 96 80');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', '96');
    svg.setAttribute('height', '80');
    function shape(tag, attrs) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.keys(attrs).forEach((key) => element.setAttribute(key, attrs[key]));
      svg.appendChild(element);
    }
    if (kind === 'sun' || kind === 'partly') {
      shape('path', { d: 'M39 4v7 M39 61v7 M7 36h7 M64 36h7 M16 13l5 5 M57 54l5 5 M16 59l5-5 M57 18l5-5', stroke: '#f5b92f', 'stroke-width': '4', 'stroke-linecap': 'round', fill: 'none' });
      shape('circle', { cx: '39', cy: '36', r: '18', fill: '#ffd35a' });
    }
    if (kind !== 'sun') {
      shape('path', { d: 'M25 59C8 59 9 35 25 34C29 13 61 13 66 34C89 29 99 59 77 59Z', fill: '#dce9f2', stroke: '#b7cddd', 'stroke-width': '2', 'stroke-linejoin': 'round' });
    }
    if (kind === 'rain') shape('path', { d: 'M31 65l-4 9 M49 65l-4 9 M67 65l-4 9', stroke: '#6db7e9', 'stroke-width': '4', 'stroke-linecap': 'round' });
    if (kind === 'snow') [30, 49, 68].forEach((cx) => shape('circle', { cx: String(cx), cy: '70', r: '3', fill: '#a1cde8' }));
    if (kind === 'thunder') shape('path', { d: 'M49 49L37 67h11l-4 12 19-22H51l6-8Z', fill: '#ffc843' });
    if (kind === 'fog') shape('path', { d: 'M18 65h60 M25 73h47', stroke: '#b7cddd', 'stroke-width': '4', 'stroke-linecap': 'round' });
    nodes['weather-icon'].replaceChildren(svg);
    nodes['weather-icon'].setAttribute('data-weather-icon', kind);
  }

  function formatTemperature(value) {
    const rounded = Math.round(value);
    return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)}°C`;
  }
  function settingsStatus(message) { nodes['weather-settings-status'].textContent = message; }
  function render() {
    nodes['weather-date'].textContent = new Date().toLocaleString('ru-RU', {
      weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });
    nodes['weather-city'].textContent = config ? config.name : 'Ваш город';
    nodes['weather-temp'].textContent = data ? formatTemperature(data.temperature) : '—';
    nodes['weather-condition'].textContent = data ? CONDITIONS[data.code][0] : 'Выберите город';
    drawIcon(data ? CONDITIONS[data.code][1] : 'partly');
    const parts = [];
    if (data) parts.push(`Обновлено ${new Date(data.updatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`);
    if (!online()) parts.push('Нет сети' + (data ? ' · сохранённые данные' : ''));
    else if (loading) parts.push('Обновление…');
    else if (failure) parts.push(failure);
    else if (data && Date.now() - data.updatedAt >= FRESH_MS) parts.push('Данные устарели');
    else if (!config) parts.push('Нажмите, чтобы выбрать город');
    nodes['weather-status'].textContent = parts.join(' · ');
    nodes['hub-weather'].setAttribute('aria-busy', String(loading));
    nodes['weather-refresh'].disabled = loading || !config;
  }

  async function requestJSON(url, controller) {
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('http');
      const result = await response.json();
      if (!result || typeof result !== 'object' || Array.isArray(result) || result.error) throw new Error('response');
      return result;
    } finally { clearTimeout(timeout); }
  }

  async function update(force) {
    if (!initialized || !config || !available() || loading) return;
    if (!online()) { render(); return; }
    if (!force && ((data && Date.now() - data.updatedAt < FRESH_MS) || Date.now() - lastAttempt < RETRY_MS)) return;
    const place = { ...config };
    const version = ++forecastVersion;
    const controller = new AbortController();
    forecastController = controller;
    lastAttempt = Date.now();
    loading = true;
    failure = '';
    render();
    if (modalOpen) settingsStatus('Обновление погоды…');
    try {
      const params = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: 'temperature_2m,weather_code,is_day', temperature_unit: 'celsius', timezone: 'auto' });
      const result = await requestJSON(`https://api.open-meteo.com/v1/forecast?${params}`, controller);
      const current = result.current;
      const next = current && { latitude: place.latitude, longitude: place.longitude,
        temperature: current.temperature_2m, code: current.weather_code,
        isDay: current.is_day, updatedAt: Date.now() };
      if (!validData(next, place) || !result.current_units || result.current_units.temperature_2m !== '°C') throw new Error('response');
      if (version !== forecastVersion || !available()) return;
      data = next;
      save();
      if (modalOpen) settingsStatus('Погода обновлена.');
    } catch (_) {
      if (version !== forecastVersion || !available()) return;
      failure = 'Не удалось обновить' + (data ? ' · сохранённые данные' : ' · попробуйте позже');
      if (modalOpen) settingsStatus(failure);
    } finally {
      if (version === forecastVersion) {
        loading = false;
        forecastController = null;
        if (available()) render();
      }
    }
  }

  function selectPlace(place) {
    if (!available()) return;
    locationVersion++;
    searchVersion++;
    if (searchController) searchController.abort();
    forecastVersion++;
    if (forecastController) forecastController.abort();
    loading = false;
    if (!samePlace(config, place)) data = null;
    config = place;
    failure = '';
    lastAttempt = 0;
    save();
    nodes['weather-search-results'].replaceChildren();
    settingsStatus(`Выбрано: ${place.name}`);
    render();
    void update(true);
  }

  async function searchCities(event) {
    event.preventDefault();
    if (!available() || !modalOpen) return;
    const version = ++searchVersion;
    locationVersion++;
    if (searchController) searchController.abort();
    nodes['weather-search-results'].replaceChildren();
    const query = nodes['weather-search-input'].value.trim();
    if (query.length < 2 || query.length > 100) { settingsStatus('Введите от 2 до 100 символов.'); return; }
    if (!online()) { settingsStatus('Нет сети. Сохранённый город не изменён.'); return; }
    const controller = new AbortController();
    searchController = controller;
    settingsStatus('Поиск городов…');
    try {
      const params = new URLSearchParams({ name: query, count: '8', language: 'ru', format: 'json' });
      const result = await requestJSON(`https://geocoding-api.open-meteo.com/v1/search?${params}`, controller);
      if (version !== searchVersion || !available() || !modalOpen) return;
      if (result.results !== undefined && !Array.isArray(result.results)) throw new Error('response');
      const places = (result.results || []).slice(0, 8).filter(validPlace).map((place) => {
        const parts = [place.name, place.admin1, place.country].filter((part) => typeof part === 'string' && part.trim());
        return { latitude: place.latitude, longitude: place.longitude, name: [...new Set(parts)].join(', ').slice(0, 200) };
      });
      places.forEach((place) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'weather-search-result';
        button.textContent = place.name;
        button.addEventListener('click', () => {
          if (version === searchVersion && modalOpen) selectPlace(place);
        });
        nodes['weather-search-results'].appendChild(button);
      });
      settingsStatus(places.length ? 'Выберите город из списка.' : 'Города не найдены. Уточните название.');
    } catch (_) {
      if (version === searchVersion && available() && modalOpen) settingsStatus('Не удалось найти город. Попробуйте ещё раз.');
    } finally {
      if (version === searchVersion) searchController = null;
    }
  }

  function locate() {
    if (!available() || !modalOpen) return;
    const version = ++locationVersion;
    searchVersion++;
    if (searchController) searchController.abort();
    nodes['weather-search-results'].replaceChildren();
    if (!navigator.geolocation) { settingsStatus('Геолокация недоступна. Найдите город по названию.'); return; }
    settingsStatus('Ожидание разрешения на геолокацию…');
    const denied = () => {
      if (version === locationVersion && available() && modalOpen) settingsStatus('Местоположение недоступно. Найдите город по названию.');
    };
    try {
      navigator.geolocation.getCurrentPosition((position) => {
        if (version !== locationVersion || !available() || !modalOpen) return;
        const coords = position && position.coords;
        const place = coords && { name: 'Моё местоположение', latitude: coords.latitude, longitude: coords.longitude };
        if (!validPlace(place)) { settingsStatus('Не удалось определить координаты.'); return; }
        selectPlace(place);
      }, denied, { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: FRESH_MS });
    } catch (_) { denied(); }
  }

  function focusable() {
    return Array.from(nodes['weather-modal'].querySelectorAll('button, input, select, textarea, a[href], [tabindex]'))
      .filter((element) => !element.disabled && !element.hidden && element.tabIndex >= 0 && element.getClientRects().length);
  }
  function openSettings() {
    if (!initialized && !init()) return;
    if (!available() || modalOpen) return;
    modalOpen = true;
    returnFocus = document.activeElement;
    ownedModalLock = !document.body.classList.contains('modal-open');
    nodes['weather-modal'].hidden = false;
    nodes['weather-modal'].setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    settingsStatus(config ? `Выбрано: ${config.name}` : 'Выберите город или разрешите геолокацию.');
    nodes['weather-search-input'].focus();
  }
  function closeSettings() {
    if (!modalOpen) return;
    modalOpen = false;
    searchVersion++;
    locationVersion++;
    if (searchController) searchController.abort();
    nodes['weather-modal'].hidden = true;
    nodes['weather-modal'].setAttribute('aria-hidden', 'true');
    const others = Array.from(document.querySelectorAll('.modal-overlay:not([hidden]), [role="dialog"]:not([hidden]), .hub-sheet.open, .bottom-sheet.open'))
      .some((element) => !nodes['weather-modal'].contains(element) && element.getClientRects().length > 0);
    if (ownedModalLock && !others) document.body.classList.remove('modal-open');
    ownedModalLock = false;
    if (available() && returnFocus && returnFocus.isConnected) returnFocus.focus();
  }
  function modalKeys(event) {
    if (!modalOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSettings(); }
    if (event.key === 'Tab') {
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); nodes['weather-close'].focus(); return; }
      if (!nodes['weather-modal'].contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  }

  function pause() {
    forecastVersion++;
    searchVersion++;
    locationVersion++;
    if (forecastController) forecastController.abort();
    if (searchController) searchController.abort();
    forecastController = null;
    searchController = null;
    loading = false;
    lastAttempt = 0;
    if (modalOpen) closeSettings();
  }
  function tick() {
    if (!available()) { pause(); return; }
    render();
    void update(false);
  }
  function init() {
    if (initialized) return true;
    const found = {};
    for (const id of IDS) {
      found[id] = document.getElementById(id);
      if (!found[id]) return false;
    }
    nodes = found;
    initialized = true;
    load();
    nodes['hub-weather'].addEventListener('click', openSettings);
    nodes['hub-weather'].addEventListener('keydown', (event) => {
      if (event.target === nodes['hub-weather'] && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (!event.repeat) openSettings();
      }
    });
    nodes['weather-close'].addEventListener('click', closeSettings);
    nodes['weather-modal'].addEventListener('click', (event) => {
      if (event.target === nodes['weather-modal']) closeSettings();
    });
    nodes['weather-location'].addEventListener('click', locate);
    nodes['weather-search-form'].addEventListener('submit', searchCities);
    nodes['weather-refresh'].addEventListener('click', () => { void update(true); });
    document.addEventListener('keydown', modalKeys);
    document.addEventListener('focusin', (event) => {
      if (modalOpen && !nodes['weather-modal'].contains(event.target)) nodes['weather-search-input'].focus();
    });
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', () => { lastAttempt = 0; tick(); });
    window.addEventListener('offline', tick);
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(tick);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-access-pending', 'class'] });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    setInterval(tick, 60000);
    if (available()) tick();
    return true;
  }

  window.HubWeather = { init, openSettings, refresh: () => update(true) };
})();
