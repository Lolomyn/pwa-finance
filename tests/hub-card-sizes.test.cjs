'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('const HIDDEN_HUB_CARDS_KEY =');
const end = source.indexOf('async function render(items)', start);
assert.ok(start >= 0 && end > start, 'the hub hiding block must exist in app.js');
const hubSource = source.slice(start, end);

test('weather supports the shared card size and hide registry', () => {
  assert.match(hubSource, /'widget-weather': 'Виджет «Погода»'/);
  assert.match(hubSource, /RESIZABLE_HUB_CARD_IDS = \['widget-weather'/);
});

test('widgets and applications have separate layout containers', () => {
  const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const widgets = html.indexOf('class="hub-bento hub-widgets"');
  const apps = html.indexOf('class="hub-bento hub-apps"');
  assert.ok(widgets >= 0 && apps > widgets);
  assert.ok(html.indexOf('id="hub-weather"') > widgets && html.indexOf('id="hub-weather"') < apps);
  assert.ok(html.indexOf('id="hub-widget"') < apps);
  assert.ok(html.indexOf('id="hub-finance"') > apps);
  assert.ok(html.indexOf('id="hub-notes"') > apps);
});

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  emit(type, properties = {}) {
    const event = {
      type, defaultPrevented: false, propagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
      stopImmediatePropagation() { this.propagationStopped = true; },
      ...properties
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
}

class Element extends Events {
  constructor({ id = '', cardId, parent = null, interactive = false } = {}) {
    super();
    this.id = id;
    this.dataset = cardId ? { cardId } : {};
    this.parent = parent;
    this.interactive = interactive;
    this.hidden = false;
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle(name, force = !classes.has(name)) {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      }
    };
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...children) { this.children.push(...children); }
  focus() {}
  contains(element) { return element === this || Boolean(element?.parent && this.contains(element.parent)); }
  closest(selector) {
    if (selector === '[data-card-id]') return this.dataset.cardId ? this : this.parent?.closest(selector) || null;
    if (selector === 'button, a, input, select, textarea, [role="button"]') {
      return this.interactive ? this : this.parent?.closest(selector) || null;
    }
    if (selector === '.restore-btn') return this.className === 'restore-btn' ? this : null;
    throw new Error(`Unexpected closest selector: ${selector}`);
  }
}

function setup({ storedSizes, storage = new Map() } = {}) {
  const document = new Events();
  const window = new Events();
  const timers = new Map();
  let timerId = 0;
  let now = 10_000;
  const elements = new Map();
  for (const id of ['hubCardActionSheet', 'hubCardActionBackdrop', 'hubCardActionHide',
    'hubCardActionClose', 'hubCardActionTitle', 'hubCardSizeOptions', 'hubCardSizeToggle', 'hiddenCardsWrap', 'hiddenCardsList', 'hubSettingsSheet',
    'hubCalendarSheet', 'hubDaySheet']) {
    elements.set(id, new Element({ id }));
  }
  const sheet = elements.get('hubCardActionSheet');
  sheet.hidden = true;
  for (const id of ['hubSettingsSheet', 'hubCalendarSheet', 'hubDaySheet']) elements.get(id).hidden = true;
  const cards = ['widget-days', 'app-finance', 'app-notes', 'widget-cashback'].map((cardId) => new Element({ cardId }));
  Object.assign(document, {
    body: new Element(),
    getElementById: (id) => elements.get(id) || null,
    createElement: () => new Element(),
    querySelector(selector) {
      return cards.find((card) => selector === `[data-card-id="${card.dataset.cardId}"]`) || null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, '[data-card-id]');
      return cards;
    }
  });
  Object.assign(window, {
    requestAnimationFrame: (callback) => callback(),
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id)
  });
  const context = vm.createContext({
    document, window, Element,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    Date: class extends Date { static now() { return now; } },
    hapticFeedback() {}
  });
  vm.runInContext(`${hubSource}\nglobalThis.hub = {
    HUB_CARD_SIZES_KEY, HIDDEN_HUB_CARDS_KEY, RESIZABLE_HUB_CARD_IDS,
    loadHubCardSizes, applyHubCardSizes, setHubCardSize,
    loadHiddenHubCards, hideCurrentHubCard, restoreHubCard,
    openHubCardAction, closeHubCardAction, initHubCardHiding
  };`, context, { filename: 'app.js (hub hiding block)' });
  const hub = context.hub;
  if (storedSizes !== undefined) storage.set(hub.HUB_CARD_SIZES_KEY, storedSizes);
  return {
    hub, cards, document, window, storage, elements, sheet,
    card: (id) => cards.find((card) => card.dataset.cardId === id),
    stored: () => JSON.parse(storage.get(hub.HUB_CARD_SIZES_KEY)),
    advance(ms) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at <= now) { timers.delete(id); timer.callback(); }
      }
    }
  };
}

function compactIds(app) {
  return app.cards.filter((card) => card.classList.contains('is-compact')).map((card) => card.dataset.cardId);
}

function beginPress(app, target) {
  target.closest('[data-card-id]').emit('pointerdown', { target, pointerType: 'touch', clientX: 20, clientY: 30 });
}

test('missing size preferences default every card to normal', () => {
  const app = setup();
  app.hub.loadHubCardSizes();
  assert.deepEqual(compactIds(app), []);
  assert.equal(app.storage.has(app.hub.HUB_CARD_SIZES_KEY), false);
});

test('loading valid preferences applies compact only to resizable cards', () => {
  const app = setup({ storedSizes: JSON.stringify({
    'widget-days': 'compact', 'app-finance': 'normal', 'app-notes': 'compact',
    'widget-cashback': 'compact', unknown: 'compact'
  }) });
  app.hub.loadHubCardSizes();
  assert.deepEqual(compactIds(app), ['widget-days', 'app-notes']);
});

for (const raw of ['{broken', 'null', '[]', '42', '"compact"', '{"app-finance":true,"app-notes":"small","widget-days":{}}']) {
  test(`malformed or unsupported stored sizes are ignored: ${raw}`, () => {
    const app = setup();
    app.hub.setHubCardSize('widget-days', 'compact');
    app.storage.set(app.hub.HUB_CARD_SIZES_KEY, raw);
    assert.doesNotThrow(() => app.hub.loadHubCardSizes());
    assert.deepEqual(compactIds(app), []);
  });
}

test('setting compact persists all selected sizes and survives reloading', () => {
  const app = setup();
  app.hub.setHubCardSize('app-finance', 'compact');
  app.hub.setHubCardSize('app-notes', 'compact');
  assert.deepEqual(app.stored(), { 'app-finance': 'compact', 'app-notes': 'compact' });
  assert.deepEqual(compactIds(app), ['app-finance', 'app-notes']);
  const reloaded = setup({ storage: app.storage });
  reloaded.hub.loadHubCardSizes();
  assert.deepEqual(compactIds(reloaded), ['app-finance', 'app-notes']);
});

test('switching to normal removes only that preference from storage', () => {
  const app = setup();
  app.hub.setHubCardSize('widget-days', 'compact');
  app.hub.setHubCardSize('app-finance', 'compact');
  app.hub.setHubCardSize('widget-days', 'normal');
  assert.deepEqual(app.stored(), { 'app-finance': 'compact' });
  assert.deepEqual(compactIds(app), ['app-finance']);
  app.hub.setHubCardSize('app-finance', 'normal');
  assert.deepEqual(app.stored(), {});
  assert.deepEqual(compactIds(app), []);
});

test('cashback and unknown card IDs cannot be resized or persisted', () => {
  const app = setup();
  app.hub.setHubCardSize('widget-cashback', 'compact');
  app.hub.setHubCardSize('unknown', 'compact');
  assert.deepEqual(compactIds(app), []);
  assert.equal(app.storage.has(app.hub.HUB_CARD_SIZES_KEY), false);
  app.hub.openHubCardAction(app.card('widget-cashback'));
  assert.equal(app.elements.get('hubCardSizeOptions').hidden, true);
});

test('invalid requested size leaves existing preferences unchanged', () => {
  const app = setup();
  app.hub.setHubCardSize('app-finance', 'compact');
  app.hub.setHubCardSize('app-finance', 'small');
  assert.deepEqual(app.stored(), { 'app-finance': 'compact' });
  assert.deepEqual(compactIds(app), ['app-finance']);
});

test('applying sizes retains card-hidden and unrelated classes', () => {
  const app = setup();
  const card = app.card('app-finance');
  card.classList.add('card-hidden', 'custom-class');
  app.hub.setHubCardSize('app-finance', 'compact');
  app.hub.applyHubCardSizes();
  assert.equal(card.classList.contains('card-hidden'), true);
  assert.equal(card.classList.contains('custom-class'), true);
  app.hub.setHubCardSize('app-finance', 'normal');
  assert.equal(card.classList.contains('card-hidden'), true);
  assert.equal(card.classList.contains('custom-class'), true);
});

test('hiding and restoring a compact card preserves its size, including after reload', () => {
  const app = setup();
  app.hub.setHubCardSize('widget-days', 'compact');
  app.hub.openHubCardAction(app.card('widget-days'));
  app.hub.hideCurrentHubCard();
  assert.equal(app.card('widget-days').classList.contains('card-hidden'), true);
  assert.equal(app.card('widget-days').classList.contains('is-compact'), true);
  const reloaded = setup({ storage: app.storage });
  reloaded.hub.loadHubCardSizes();
  reloaded.hub.loadHiddenHubCards();
  assert.equal(reloaded.card('widget-days').classList.contains('card-hidden'), true);
  reloaded.hub.restoreHubCard('widget-days');
  assert.equal(reloaded.card('widget-days').classList.contains('card-hidden'), false);
  assert.equal(reloaded.card('widget-days').classList.contains('is-compact'), true);
  assert.deepEqual(reloaded.stored(), { 'widget-days': 'compact' });
  assert.deepEqual(JSON.parse(reloaded.storage.get(reloaded.hub.HIDDEN_HUB_CARDS_KEY)), []);
});

test('long press opens size controls and buttons switch compact back to normal', () => {
  const app = setup();
  app.hub.initHubCardHiding();
  const card = app.card('app-finance');
  beginPress(app, card);
  app.advance(449);
  assert.equal(app.sheet.hidden, true);
  app.advance(1);
  assert.equal(app.sheet.hidden, false);
  assert.equal(app.elements.get('hubCardSizeOptions').hidden, false);
  const toggle = app.elements.get('hubCardSizeToggle');
  assert.equal(toggle.textContent, 'Сделать компактным');
  toggle.emit('click');
  assert.equal(card.classList.contains('is-compact'), true);
  assert.equal(app.sheet.classList.contains('open'), false);
  app.advance(350);
  beginPress(app, card);
  app.advance(450);
  assert.equal(toggle.textContent, 'Вернуть обычный размер');
  toggle.emit('click');
  assert.equal(card.classList.contains('is-compact'), false);
  assert.deepEqual(app.stored(), {});
});

test('movement beyond the long-press threshold cancels opening', () => {
  const app = setup();
  app.hub.initHubCardHiding();
  const card = app.card('widget-days');
  beginPress(app, card);
  app.document.emit('pointermove', { target: card, clientX: 30, clientY: 30 });
  app.advance(100);
  app.document.emit('pointermove', { target: card, clientX: 31, clientY: 30 });
  app.advance(450);
  assert.equal(app.sheet.hidden, true);
});

for (const cancelEvent of ['pointerup', 'pointercancel']) {
  test(`${cancelEvent} cancels an unfinished long press`, () => {
    const app = setup();
    app.hub.initHubCardHiding();
    const card = app.card('app-notes');
    beginPress(app, card);
    card.emit(cancelEvent);
    app.advance(450);
    assert.equal(app.sheet.hidden, true);
  });
}

test('inner cashback controls keep their click and context-menu behavior', () => {
  const app = setup();
  app.hub.initHubCardHiding();
  const cashback = app.card('widget-cashback');
  const button = new Element({ parent: cashback, interactive: true });
  const icon = new Element({ parent: button });
  let clicks = 0;
  button.addEventListener('click', () => { clicks += 1; });
  beginPress(app, icon);
  app.advance(450);
  assert.equal(app.sheet.hidden, true);
  const click = cashback.emit('click', { target: icon });
  assert.equal(click.defaultPrevented, false);
  assert.equal(click.propagationStopped, false);
  button.emit('click', { target: icon });
  assert.equal(clicks, 1);
  const menu = cashback.emit('contextmenu', { target: icon });
  assert.equal(menu.defaultPrevented, true);
  assert.equal(app.sheet.hidden, true);
  beginPress(app, cashback);
  app.advance(450);
  assert.equal(app.sheet.hidden, false);
  assert.equal(app.elements.get('hubCardSizeOptions').hidden, true);
});

test('a completed long press suppresses its immediate card click but not later clicks', () => {
  const app = setup();
  app.hub.initHubCardHiding();
  const card = app.card('app-finance');
  beginPress(app, card);
  app.advance(450);
  const click = card.emit('click', { target: card });
  assert.equal(click.defaultPrevented, true);
  assert.equal(click.propagationStopped, true);
  app.advance(901);
  assert.equal(card.emit('click', { target: card }).defaultPrevented, false);
});
