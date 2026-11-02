'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '..', 'weather.js'), 'utf8');
const KEY = 'expense-tracker-weather';
const NOW = Date.parse('2026-11-02T12:00:00Z');
const IDS = ['hub-weather', 'weather-city', 'weather-date', 'weather-temp', 'weather-condition',
  'weather-icon', 'weather-status', 'weather-modal', 'weather-close', 'weather-location',
  'weather-search-form', 'weather-search-input', 'weather-search-results', 'weather-settings-status', 'weather-refresh'];

class Events {
  constructor() { this.events = new Map(); }
  addEventListener(type, callback) {
    if (!this.events.has(type)) this.events.set(type, []);
    this.events.get(type).push(callback);
  }
  async emit(type, details = {}) {
    const event = { target: this, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...details };
    for (const callback of this.events.get(type) || []) await callback(event);
    return event;
  }
}

class Element extends Events {
  constructor(document, id = '') {
    super();
    this.document = document;
    this.id = id;
    this.attrs = new Map();
    this.classes = new Set();
    this.classList = { contains: (name) => this.classes.has(name), add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name) };
    this.children = [];
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.tabIndex = ['hub-weather', 'weather-close', 'weather-location', 'weather-search-input', 'weather-refresh'].includes(id) ? 0 : -1;
    this.isConnected = true;
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  hasAttribute(name) { return this.attrs.has(name); }
  removeAttribute(name) { this.attrs.delete(name); }
  appendChild(element) { this.children.push(element); return element; }
  replaceChildren(...elements) { this.children = elements; }
  contains(element) { return element === this || this.children.some((child) => child.contains(element)); }
  querySelectorAll() {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
  }
  getClientRects() { return this.hidden ? [] : [{}]; }
  focus() { this.document.activeElement = this; }
}

function cached(age = 0, overrides = {}) {
  return {
    version: 1,
    config: { name: 'Москва', latitude: 55.75, longitude: 37.62 },
    data: { latitude: 55.75, longitude: 37.62, temperature: 4.2, code: 0, isDay: 1, updatedAt: NOW - age, ...overrides }
  };
}
function forecast(temperature = 10, code = 0, isDay = 1) {
  return { current: { temperature_2m: temperature, weather_code: code, is_day: isDay }, current_units: { temperature_2m: '°C' } };
}
function response(value, ok = true) { return { ok, json: async () => value }; }
async function flush() { for (let i = 0; i < 32; i++) await Promise.resolve(); }

function setup({ stored, offline = false, locked = false, pending = false, missing = [], storageFails = false, fetcher } = {}) {
  const document = new Events();
  const window = new Events();
  document.hidden = false;
  document.documentElement = new Element(document);
  document.body = new Element(document);
  const nodes = Object.fromEntries(IDS.filter((id) => !missing.includes(id)).map((id) => [id, new Element(document, id)]));
  if (nodes['weather-modal']) {
    nodes['weather-modal'].hidden = true;
    for (const id of ['weather-close', 'weather-location', 'weather-search-input', 'weather-refresh', 'weather-search-results']) {
      if (nodes[id]) nodes['weather-modal'].appendChild(nodes[id]);
    }
  }
  if (locked) document.body.classList.add('lock-screen-open');
  if (pending) document.documentElement.setAttribute('data-access-pending', '');
  document.activeElement = nodes['hub-weather'];
  document.getElementById = (id) => nodes[id] || null;
  document.createElement = (tag) => {
    const element = new Element(document);
    if (tag === 'button') element.tabIndex = 0;
    return element;
  };
  document.createElementNS = () => new Element(document);
  let otherModal = false;
  // Include the inner dialog even when its overlay is hidden (real selector behaviour).
  const innerDialog = new Element(document);
  if (nodes['weather-modal']) nodes['weather-modal'].appendChild(innerDialog);
  document.querySelectorAll = () => [innerDialog, ...(otherModal ? [new Element(document)] : [])];
  const values = new Map(stored === undefined ? [] : [[KEY, typeof stored === 'string' ? stored : JSON.stringify(stored)]]);
  const writes = [];
  const requests = [];
  const timeouts = new Map();
  const intervals = [];
  const observers = [];
  let timerId = 0;
  let now = NOW;
  let geoCalls = 0;
  let geoSuccess;
  let geoFailure;
  const navigator = { onLine: !offline, geolocation: { getCurrentPosition(success, failure) { geoCalls++; geoSuccess = success; geoFailure = failure; } } };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const context = vm.createContext({ window, document, navigator, URLSearchParams, AbortController, Date: Clock,
    localStorage: {
      getItem(key) { if (storageFails) throw Error('storage'); return values.get(key) || null; },
      setItem(key, value) { if (storageFails) throw Error('storage'); values.set(key, value); writes.push([key, JSON.parse(value)]); }
    },
    fetch: async (url, options) => { requests.push({ url, options }); return fetcher ? fetcher(url, options) : response(forecast()); },
    setTimeout(callback, ms) { const id = ++timerId; timeouts.set(id, { callback, ms }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(callback, ms) { intervals.push({ callback, ms }); return intervals.length; },
    MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} }
  });
  vm.runInContext(source, context, { filename: 'weather.js' });
  return { api: window.HubWeather, nodes, document, window, navigator, values, writes, requests, intervals, timeouts,
    advance(ms) { now += ms; }, observe() { observers.forEach((observer) => observer.callback()); },
    setOtherModal(value) { otherModal = value; }, get geoCalls() { return geoCalls; },
    geoSuccess(position) { geoSuccess(position); }, geoFailure() { geoFailure({ code: 1 }); } };
}

async function chooseCity(env, name = 'Москва') {
  env.api.openSettings();
  env.nodes['weather-search-input'].value = name;
  await env.nodes['weather-search-form'].emit('submit');
  await env.nodes['weather-search-results'].children[0].emit('click');
  await flush();
}

test('interface is guarded, idempotent and unconfigured weather is entirely opt-in', async () => {
  const incomplete = setup({ missing: ['weather-temp'] });
  assert.equal(incomplete.api.init(), false);
  assert.equal(incomplete.requests.length, 0);
  const env = setup();
  assert.deepEqual(Object.keys(env.api).sort(), ['init', 'openSettings', 'refresh']);
  assert.equal(env.api.init(), true);
  assert.equal(env.api.init(), true);
  assert.equal(env.intervals.length, 1);
  assert.equal(env.intervals[0].ms, 60000);
  assert.equal(env.nodes['weather-condition'].textContent, 'Выберите город');
  assert.match(env.nodes['weather-status'].textContent, /выбрать город/);
  await env.api.refresh();
  await env.nodes['hub-weather'].emit('click');
  assert.equal(env.nodes['weather-modal'].hidden, false);
  assert.equal(env.requests.length, 0);
  assert.equal(env.geoCalls, 0);
  assert.equal(env.writes.length, 0);
});

test('fresh cache renders locally, signed Celsius and clock; refresh uses only forecast API', async () => {
  const env = setup({ stored: cached(1000, { temperature: -2.6 }) });
  env.api.init();
  assert.equal(env.requests.length, 0);
  assert.equal(env.nodes['weather-temp'].textContent, '−3°C');
  assert.match(env.nodes['weather-status'].textContent, /Обновлено/);
  const before = env.nodes['weather-date'].textContent;
  env.advance(60000);
  env.intervals[0].callback();
  assert.notEqual(env.nodes['weather-date'].textContent, before);
  await env.api.refresh();
  const url = new URL(env.requests[0].url);
  assert.equal(url.origin, 'https://api.open-meteo.com');
  assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code,is_day');
  assert.equal(url.searchParams.get('timezone'), 'auto');
  assert.equal(env.requests[0].options.credentials, 'omit');
  assert.equal(env.nodes['weather-temp'].textContent, '+10°C');
  assert.equal(env.writes[0][0], KEY);
  assert.equal(env.timeouts.size, 0);
});

test('stale and offline cache keeps city/data; reconnect refreshes, no repeated foreground polling', async () => {
  const env = setup({ stored: cached(31 * 60000), offline: true });
  env.api.init();
  assert.equal(env.requests.length, 0);
  assert.equal(env.nodes['weather-city'].textContent, 'Москва');
  assert.equal(env.nodes['weather-temp'].textContent, '+4°C');
  assert.match(env.nodes['weather-status'].textContent, /Нет сети.*сохранённые данные/);
  env.navigator.onLine = true;
  await env.window.emit('online');
  await flush();
  assert.equal(env.requests.length, 1);
  env.intervals[0].callback();
  await flush();
  assert.equal(env.requests.length, 1);
  env.advance(30 * 60000);
  env.intervals[0].callback();
  await flush();
  assert.equal(env.requests.length, 2);
});

test('all WMO code families use local safe SVG and known labels', async () => {
  const groups = { sun: [0], partly: [1, 2], cloud: [3], fog: [45, 48], rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82], snow: [71, 73, 75, 77, 85, 86], thunder: [95, 96, 99] };
  for (const [icon, codes] of Object.entries(groups)) {
    for (const code of codes) {
      const env = setup({ stored: cached(0, { code, temperature: 0, isDay: 0 }) });
      env.api.init();
      assert.equal(env.nodes['weather-icon'].attrs.get('data-weather-icon'), icon, String(code));
      assert.equal(env.nodes['weather-temp'].textContent, '0°C');
      assert.ok(env.nodes['weather-condition'].textContent);
      const svg = env.nodes['weather-icon'].children[0];
      assert.equal(svg.attrs.get('aria-hidden'), 'true');
      assert.equal(svg.attrs.has('src'), false);
      assert.equal(svg.attrs.has('href'), false);
    }
  }
});

test('HTTP, network, malformed and invalid forecasts keep old data, retry is throttled', async () => {
  const bad = [
    () => response({}, false), () => { throw Error('network'); },
    () => ({ ok: true, json: async () => { throw Error('json'); } }),
    () => response({ error: true }), () => response(forecast(null)),
    () => response(forecast('12')), () => response(forecast(12, 123)),
    () => response(forecast(12, 0, '1')), () => response(forecast(999)),
    () => response({ current: forecast().current })
  ];
  for (const fetcher of bad) {
    const env = setup({ stored: cached(31 * 60000), fetcher });
    env.api.init();
    await flush();
    assert.equal(env.nodes['weather-temp'].textContent, '+4°C');
    assert.match(env.nodes['weather-status'].textContent, /Не удалось обновить.*сохранённые данные/);
    assert.equal(env.writes.length, 0);
    env.intervals[0].callback();
    assert.equal(env.requests.length, 2);
    assert.equal(env.timeouts.size, 0);
  }
});

test('forecast timeout aborts request and preserves cached data', async () => {
  const env = setup({ stored: cached(31 * 60000), fetcher: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Error('abort')));
  }) });
  env.api.init();
  const timer = [...env.timeouts.values()][0];
  assert.equal(timer.ms, 12000);
  timer.callback();
  await flush();
  assert.equal(env.requests[0].options.signal.aborted, true);
  assert.equal(env.requests.length, 2);
  [...env.timeouts.values()][0].callback();
  await flush();
  assert.match(env.nodes['weather-status'].textContent, /Не удалось обновить/);
  assert.equal(env.nodes['weather-temp'].textContent, '+4°C');
});

test('network failure uses wttr.in fallback, maps codes and persists source', async () => {
  const env = setup({ stored: cached(31 * 60000), fetcher: (url) => {
    if (url.includes('api.open-meteo.com')) throw new TypeError('Failed to fetch');
    return response({ current_condition: [{ temp_C: '-3', weatherCode: '116', localObsDateTime: '2026-11-02 02:00 PM' }] });
  } });
  env.api.init();
  await flush();
  assert.equal(env.requests.length, 2);
  assert.match(env.requests[1].url, /^https:\/\/wttr.in\/55.75,37.62\?format=j1$/);
  assert.equal(env.nodes['weather-temp'].textContent, '−3°C');
  assert.equal(env.nodes['weather-icon'].attrs.get('data-weather-icon'), 'partly');
  assert.equal(JSON.parse(env.values.get(KEY)).data.source, 'wttr.in');
  assert.match(env.nodes['weather-status'].textContent, /wttr.in/);
});

test('city search is safe, selection alone persists, no reverse geocoding', async () => {
  const name = '<img src=x onerror=alert(1)>';
  const env = setup({ fetcher: (url) => response(url.includes('geocoding-api') ? {
    results: [{ name, latitude: 1, longitude: 2, country: 'Страна' }, { name: 'Invalid', latitude: null, longitude: 2 }]
  } : forecast()) });
  env.api.init();
  env.api.openSettings();
  env.nodes['weather-search-input'].value = 'A&B';
  await env.nodes['weather-search-form'].emit('submit');
  assert.equal(new URL(env.requests[0].url).searchParams.get('name'), 'A&B');
  const results = env.nodes['weather-search-results'].children;
  assert.equal(results.length, 1);
  assert.equal(results[0].textContent, `${name}, Страна`);
  assert.equal(results[0].children.length, 0);
  assert.equal(env.writes.length, 0);
  await results[0].emit('click');
  await flush();
  assert.equal(env.nodes['weather-city'].textContent, `${name}, Страна`);
  assert.equal(env.requests.length, 2);
  assert.equal(env.geoCalls, 0);
});

test('geolocation only on explicit click; denial does not replace saved city', async () => {
  const env = setup({ stored: cached() });
  env.api.init();
  env.api.openSettings();
  assert.equal(env.geoCalls, 0);
  await env.nodes['weather-location'].emit('click');
  env.geoFailure();
  assert.equal(env.writes.length, 0);
  assert.equal(env.nodes['weather-city'].textContent, 'Москва');
  await env.nodes['weather-location'].emit('click');
  env.geoSuccess({ coords: { latitude: 10, longitude: 20 } });
  await flush();
  assert.equal(env.nodes['weather-city'].textContent, 'Моё местоположение');
  assert.equal(env.requests.length, 1);
  assert.equal(new URL(env.requests[0].url).hostname, 'api.open-meteo.com');
});

test('search errors and timeout preserve the selected city; later city selection invalidates geolocation', async () => {
  const env = setup({ stored: cached(), fetcher: (url, { signal }) => url.includes('geocoding-api')
    ? new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('timeout'))))
    : response(forecast()) });
  env.api.init();
  env.api.openSettings();
  env.nodes['weather-search-input'].value = 'Москва';
  const search = env.nodes['weather-search-form'].emit('submit');
  [...env.timeouts.values()][0].callback();
  await search;
  assert.match(env.nodes['weather-settings-status'].textContent, /Не удалось найти/);
  assert.equal(env.nodes['weather-city'].textContent, 'Москва');
  assert.equal(env.writes.length, 0);
  const selected = setup({ fetcher: (url) => response(url.includes('geocoding-api')
    ? { results: [{ name: 'Тула', latitude: 54, longitude: 37 }] } : forecast()) });
  selected.api.init();
  selected.api.openSettings();
  await selected.nodes['weather-location'].emit('click');
  await chooseCity(selected, 'Тула');
  selected.geoSuccess({ coords: { latitude: 1, longitude: 2 } });
  assert.equal(selected.nodes['weather-city'].textContent, 'Тула');
});

test('malformed storage is ignored and storage failures are nonfatal', async () => {
  for (const stored of ['{', cached(0, { temperature: null }), { ...cached(), config: { name: 'X', latitude: '1', longitude: 2 } }]) {
    const env = setup({ stored, offline: true });
    env.api.init();
    assert.equal(env.nodes['weather-temp'].textContent, '—');
    assert.equal(env.requests.length, 0);
  }
  const env = setup({ storageFails: true, fetcher: (url) => response(url.includes('geocoding-api') ? { results: [{ name: 'Тула', latitude: 54, longitude: 37 }] } : forecast()) });
  env.api.init();
  await chooseCity(env, 'Тула');
  assert.equal(env.nodes['weather-city'].textContent, 'Тула');
  assert.equal(env.nodes['weather-temp'].textContent, '+10°C');
});

test('hidden, access-pending and locked app make no requests, resume only foreground', async () => {
  for (const options of [{ locked: true }, { pending: true }]) {
    const env = setup({ ...options, stored: cached(31 * 60000) });
    env.api.init();
    await env.api.refresh();
    env.api.openSettings();
    env.intervals[0].callback();
    assert.equal(env.requests.length, 0);
    assert.equal(env.nodes['weather-modal'].hidden, true);
    env.document.body.classList.remove('lock-screen-open');
    env.document.documentElement.removeAttribute('data-access-pending');
    env.observe();
    await flush();
    assert.equal(env.requests.length, 1);
  }
  const env = setup({ stored: cached() });
  env.api.init();
  env.document.hidden = true;
  env.advance(31 * 60000);
  await env.document.emit('visibilitychange');
  await env.api.refresh();
  assert.equal(env.requests.length, 0);
  env.document.hidden = false;
  await env.document.emit('visibilitychange');
  await flush();
  assert.equal(env.requests.length, 1);
});

test('out-of-order search and forecast responses never overwrite the chosen place', async () => {
  const pending = [];
  const env = setup({ stored: cached(31 * 60000), fetcher: (url) => new Promise((resolve) => pending.push({ url, resolve })) });
  env.api.init(); // Old city's request remains in flight, even if fetch ignores abort.
  env.api.openSettings();
  env.nodes['weather-search-input'].value = 'First';
  const first = env.nodes['weather-search-form'].emit('submit');
  env.nodes['weather-search-input'].value = 'Second';
  const second = env.nodes['weather-search-form'].emit('submit');
  pending[2].resolve(response({ results: [{ name: 'Second', latitude: 20, longitude: 30 }] }));
  await second;
  pending[1].resolve(response({ results: [{ name: 'First', latitude: 1, longitude: 2 }] }));
  await first;
  assert.equal(env.nodes['weather-search-results'].children[0].textContent, 'Second');
  await env.nodes['weather-search-results'].children[0].emit('click');
  pending[3].resolve(response(forecast(20)));
  await flush();
  pending[0].resolve(response(forecast(-10)));
  await flush();
  assert.equal(env.nodes['weather-city'].textContent, 'Second');
  assert.equal(env.nodes['weather-temp'].textContent, '+20°C');
  assert.equal(JSON.parse(env.values.get(KEY)).data.temperature, 20);
});

test('closing or locking discards pending location/search, in-flight weather cannot save while locked', async () => {
  let resolve;
  const env = setup({ stored: cached(31 * 60000), fetcher: () => new Promise((done) => { resolve = done; }) });
  env.api.init();
  env.api.openSettings();
  await env.nodes['weather-location'].emit('click');
  await env.nodes['weather-close'].emit('click');
  env.geoSuccess({ coords: { latitude: 1, longitude: 2 } });
  assert.equal(env.writes.length, 0);
  env.document.body.classList.add('lock-screen-open');
  env.observe();
  resolve(response(forecast(99)));
  await flush();
  assert.equal(env.writes.length, 0);
});

test('modal keyboard, focus return, backdrop and shared body lock', async () => {
  const env = setup();
  env.api.init();
  const key = await env.nodes['hub-weather'].emit('keydown', { key: ' ' });
  assert.equal(key.defaultPrevented, true);
  assert.equal(env.document.activeElement, env.nodes['weather-search-input']);
  env.nodes['weather-close'].focus();
  await env.document.emit('keydown', { key: 'Tab', shiftKey: true });
  assert.equal(env.document.activeElement, env.nodes['weather-search-input']);
  await env.document.emit('keydown', { key: 'Escape' });
  assert.equal(env.nodes['weather-modal'].hidden, true);
  assert.equal(env.document.activeElement, env.nodes['hub-weather']);
  assert.equal(env.document.body.classList.contains('modal-open'), false);
  env.document.body.classList.add('modal-open');
  env.api.openSettings();
  await env.nodes['weather-modal'].emit('click');
  assert.equal(env.document.body.classList.contains('modal-open'), true);
  env.document.body.classList.remove('modal-open');
  env.api.openSettings();
  env.setOtherModal(true);
  await env.nodes['weather-close'].emit('click');
  assert.equal(env.document.body.classList.contains('modal-open'), true);
});
