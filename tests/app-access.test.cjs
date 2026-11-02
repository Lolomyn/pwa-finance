'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'app-access.js'), 'utf8');
const TICKET_KEY = 'expense-tracker-access-navigation';
const PIN = { pinEnabled: true, pinHash: 'hash', pinSalt: 'salt' };

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  dispatchEvent(event) {
    return Promise.all((this.listeners.get(event.type) || []).map((listener) => listener(event)));
  }
  async emit(type, event = {}) { return this.dispatchEvent({ ...event, type }); }
}

class Element extends Events {
  constructor() {
    super();
    this.attributes = new Map();
    this.inert = false;
    this.children = [];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(child) { this.children.push(child); }
  closest(selector) {
    return selector === 'a[href]' && this.hasAttribute('href') ? this : null;
  }
}

function makeStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

function makeIndexedDB(settings, state) {
  return {
    open(name) {
      assert.equal(name, 'expense-tracker-db');
      const request = {};
      queueMicrotask(() => {
        const failure = new Error('IndexedDB failure');
        if (state.error === 'open') {
          request.error = failure;
          request.onerror();
          return;
        }
        if (state.error === 'blocked') {
          request.onblocked();
          return;
        }
        if (state.error === 'missing-database') {
          request.transaction = { abort: () => queueMicrotask(() => request.onerror()) };
          request.onupgradeneeded();
          return;
        }

        request.result = {
          objectStoreNames: {
            contains: (store) => store === 'settings' && state.error !== 'missing-store'
          },
          close: () => { state.closed += 1; },
          transaction: () => {
            const tx = { getCount: 0 };
            tx.objectStore = () => ({
              get(key) {
                tx.getCount += 1;
                const get = {};
                queueMicrotask(() => {
                  if (state.error === 'get') {
                    get.error = failure;
                    get.onerror?.();
                    tx.error = failure;
                    tx.onabort?.();
                    return;
                  }
                  get.result = Object.prototype.hasOwnProperty.call(settings, key)
                    ? { key, value: settings[key] } : undefined;
                  get.onsuccess?.();
                  if (tx.getCount === 3) {
                    queueMicrotask(() => {
                      if (state.error === 'transaction') {
                        tx.error = failure;
                        tx.onerror?.();
                      } else {
                        tx.oncomplete?.();
                      }
                    });
                  }
                });
                return get;
              }
            });
            return tx;
          }
        };
        request.onsuccess();
      });
      return request;
    }
  };
}

function makeBroadcastChannel() {
  const peers = new Set();
  return class BroadcastChannel {
    constructor(name) { this.name = name; peers.add(this); }
    postMessage(data) {
      for (const peer of peers) {
        if (peer !== this && peer.name === this.name) {
          queueMicrotask(() => peer.onmessage?.({ data }));
        }
      }
    }
  };
}

function setup({ page = 'finance.html', settings = {}, sessionStorage = makeStorage(),
  clock = { now: 1_000_000 }, BroadcastChannel = makeBroadcastChannel(), error = null } = {}) {
  const document = new Events();
  const window = new Events();
  const root = new Element();
  const body = new Element();
  const redirects = [];
  const location = {
    href: `https://expenses.test/app/${page}`,
    pathname: `/app/${page}`,
    origin: 'https://expenses.test',
    assign: (url) => redirects.push(url),
    replace: (url) => redirects.push(url),
    reload: () => {}
  };
  const state = { error, closed: 0 };
  Object.assign(document, {
    documentElement: root, body, readyState: 'complete', hidden: false,
    getElementById: () => null,
    createElement: () => new Element(),
    createTextNode: (text) => ({ textContent: text })
  });
  window.Event = class Event { constructor(type) { this.type = type; } };
  const context = {
    document, window, location, sessionStorage, BroadcastChannel, indexedDB: makeIndexedDB(settings, state),
    URL, Element, Event: window.Event, history: { replaceState() {} }, Date: class extends Date {
      static now() { return clock.now; }
    }, setTimeout, clearTimeout
  };
  vm.runInNewContext(source, context, { filename: 'app-access.js' });
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return {
    document, window, root, body, redirects, sessionStorage, settings, clock, state,
    access: window.AppAccess,
    covered: () => root.hasAttribute('data-access-pending'),
    advance(ms) { clock.now += ms; },
    async visibility(hidden) {
      document.hidden = hidden;
      await document.emit('visibilitychange');
      await flush();
    },
    async click(href) {
      const link = new Element();
      link.setAttribute('href', href);
      await document.emit('click', { target: link });
      await flush();
    },
    async broadcast() { await flush(); }
  };
}

function assertCovered(app) {
  assert.equal(app.covered(), true);
  assert.equal(app.body.inert, true);
}

function assertRevealed(app) {
  assert.equal(app.covered(), false);
  assert.equal(app.body.inert, false);
}

async function hub(options = {}) {
  const app = setup({ ...options, page: 'index.html' });
  assert.equal(await app.access.ready, true);
  return app;
}

async function unlockedHub(options = {}) {
  const app = await hub(options);
  app.access.unlocked();
  assert.equal(app.access.isAuthorized(), true);
  assertRevealed(app);
  return app;
}

async function financeFromHub(options = {}) {
  const sourceHub = await unlockedHub(options);
  sourceHub.access.navigate('finance.html');
  const app = setup({ ...options, page: 'finance.html', settings: sourceHub.settings,
    sessionStorage: sourceHub.sessionStorage, clock: sourceHub.clock });
  assert.equal(await app.access.ready, true);
  assert.equal(app.access.isAuthorized(), true);
  app.access.reveal();
  assertRevealed(app);
  return app;
}

test('without PIN, every screen is ready and authorized', async () => {
  for (const page of ['index.html', 'finance.html', 'notes.html']) {
    const app = setup({ page, settings: { pinEnabled: false } });
    assert.equal(await app.access.ready, true);
    assert.equal(app.access.isAuthorized(), true);
  }
});

test('direct protected pages redirect to index unlock and stay covered', async () => {
  const app = setup({ settings: PIN });
  assert.equal(await app.access.ready, false);
  assert.deepEqual(app.redirects, ['./index.html?unlock=finance.html#hub']);
  assert.equal(app.access.isAuthorized(), false);
  assertCovered(app);
});

test('protected hub is ready but remains covered until reveal', async () => {
  const app = await hub({ settings: PIN });
  assert.equal(app.access.isAuthorized(), false);
  assertCovered(app);
  app.access.reveal();
  assert.equal(app.access.isAuthorized(), false);
  assertRevealed(app);
});

test('unlocked hub navigation creates a one-use ticket; reload rejects it', async () => {
  const sourceHub = await unlockedHub({ settings: PIN });
  sourceHub.access.navigate('finance.html');
  const ticket = JSON.parse(sourceHub.sessionStorage.getItem(TICKET_KEY));
  assert.equal(ticket.target, 'finance.html');
  assert.equal(ticket.expires, sourceHub.clock.now + 10_000);

  const options = { settings: PIN, sessionStorage: sourceHub.sessionStorage, clock: sourceHub.clock };
  const finance = setup(options);
  assert.equal(await finance.access.ready, true);
  assert.equal(finance.sessionStorage.getItem(TICKET_KEY), null);
  finance.access.reveal();
  assertRevealed(finance);

  const reload = setup(options);
  assert.equal(await reload.access.ready, false);
  assert.deepEqual(reload.redirects, ['./index.html?unlock=finance.html#hub']);
  assertCovered(reload);
});

test('expired and wrong-page tickets are denied and consumed', async (t) => {
  for (const kind of ['expired', 'wrong-page']) {
    await t.test(kind, async () => {
      const sourceHub = await unlockedHub({ settings: PIN });
      sourceHub.access.navigate(kind === 'wrong-page' ? 'notes.html' : 'finance.html');
      if (kind === 'expired') sourceHub.advance(10_001);
      const app = setup({ page: 'finance.html', settings: PIN,
        sessionStorage: sourceHub.sessionStorage, clock: sourceHub.clock });
      assert.equal(await app.access.ready, false);
      assert.equal(app.sessionStorage.getItem(TICKET_KEY), null);
      assertCovered(app);
    });
  }
});

test('finance hides immediately, locks after more than 60 seconds, and retains short hides', async () => {
  const app = await financeFromHub({ settings: PIN });
  await app.visibility(true);
  assertCovered(app);
  app.advance(60_001);
  await app.visibility(false);
  assert.equal(app.access.isAuthorized(), false);
  assert.deepEqual(app.redirects, ['./index.html?unlock=finance.html#hub']);

  const retained = await financeFromHub({ settings: PIN });
  await retained.visibility(true);
  retained.advance(59_999);
  await retained.visibility(false);
  assert.equal(retained.access.isAuthorized(), true);
  assertRevealed(retained);
});

test('IndexedDB errors fail closed', async (t) => {
  for (const error of ['open', 'blocked', 'get', 'transaction']) {
    await t.test(error, async () => {
      const app = setup({ page: 'finance.html', settings: PIN, error });
      assert.equal(await app.access.ready, false);
      assert.equal(app.access.isAuthorized(), false);
      assert.equal(app.covered(), true);
      assert.equal(app.root.hasAttribute('data-access-error'), true);
    });
  }
});

test('missing database is a safe first run, but a missing settings store fails closed', async () => {
  const firstRun = setup({ page: 'index.html', error: 'missing-database' });
  assert.equal(await firstRun.access.ready, true);
  assert.equal(firstRun.access.isAuthorized(), true);

  const broken = setup({ page: 'index.html', settings: PIN, error: 'missing-store' });
  assert.equal(await broken.access.ready, false);
  assert.equal(broken.access.isAuthorized(), false);
  assert.equal(broken.covered(), true);
});

test('bfcache restore relocks finance', async () => {
  const app = await financeFromHub({ settings: PIN });
  await app.window.emit('pagehide');
  await app.window.emit('pageshow', { persisted: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.access.isAuthorized(), false);
  assert.deepEqual(app.redirects, ['./index.html?unlock=finance.html#hub']);
  assertCovered(app);
});

test('security-change broadcast blocks other screens', async () => {
  const BroadcastChannel = makeBroadcastChannel();
  const sender = await unlockedHub({ settings: PIN, BroadcastChannel });
  const other = await financeFromHub({ settings: PIN, BroadcastChannel });
  await sender.access.settingsChanged();
  await other.broadcast();
  assert.equal(sender.access.isAuthorized(), true);
  assert.equal(other.access.isAuthorized(), false);
  assertCovered(other);
});
