'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, '..', 'update-banner.js'), 'utf8');

class Events {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener(event);
    }
  }
}

class Element extends Events {
  constructor() {
    super();
    this.hidden = false;
    this.style = {};
    this.children = new Map();
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name)
    };
  }

  setAttribute() {}

  set innerHTML(value) {
    this.html = value;
    for (const selector of ['.update-banner-action', '.update-banner-close', '.update-banner-sub']) {
      this.children.set(selector, new Element());
    }
  }

  querySelector(selector) {
    return this.children.get(selector) || null;
  }
}

async function setup({ controlled = true, waiting = false, supported = true, onRegister } = {}) {
  const serviceWorker = new Events();
  const registration = new Events();
  const worker = new Events();
  const messages = [];
  const body = { append: (element) => { body.banner = element; } };
  const document = new Events();
  const window = new Events();
  const timers = new Map();
  let reloads = 0;
  let checks = 0;
  let timerId = 0;

  worker.postMessage = (message) => messages.push(message.type);
  worker.state = waiting ? 'installed' : 'installing';
  registration.installing = waiting ? null : worker;
  registration.waiting = waiting ? worker : null;
  registration.update = async () => { checks += 1; throw new Error('offline'); };
  serviceWorker.controller = controlled ? {} : null;
  serviceWorker.register = async () => {
    onRegister?.(serviceWorker);
    return registration;
  };
  Object.assign(document, {
    body,
    visibilityState: 'visible',
    createElement: () => new Element(),
    querySelector: () => null
  });
  Object.assign(window, {
    innerHeight: 800,
    location: { reload: () => { reloads += 1; } },
    requestAnimationFrame: (callback) => callback(),
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id)
  });

  vm.runInNewContext(source, {
    document,
    window,
    navigator: supported ? { serviceWorker } : {},
    Element,
    console
  });
  await Promise.resolve();
  await Promise.resolve();

  return {
    body, serviceWorker, worker, registration, document, window, messages,
    reloads: () => reloads,
    checks: () => checks,
    runTimers: () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } },
    install: () => { worker.state = 'installed'; worker.emit('statechange'); },
    activate: () => { serviceWorker.controller = worker; serviceWorker.emit('controllerchange'); }
  };
}

test('unsupported browsers do not register or render a banner', async () => {
  const app = await setup({ supported: false });
  assert.equal(app.body.banner, undefined);
});

test('first install stays silent', async () => {
  const app = await setup({ controlled: false });
  app.install();
  app.activate();
  assert.equal(app.body.banner.hidden, true);
  assert.equal(app.reloads(), 0);
});

test('updates after first install work without reopening the page', async () => {
  const app = await setup({ controlled: false });
  app.install();
  app.activate();
  assert.equal(app.body.banner.hidden, true);
  app.install();
  app.activate();
  assert.equal(app.body.banner.hidden, false);
});

test('an update shows a banner without automatically reloading', async () => {
  const app = await setup();
  app.install();
  app.activate();
  assert.equal(app.body.banner.hidden, false);
  assert.equal(app.body.banner.classList.contains('is-visible'), true);
  assert.equal(app.reloads(), 0);
  app.body.banner.querySelector('.update-banner-action').emit('click');
  assert.equal(app.reloads(), 1);
});

test('a waiting update is activated before reloading', async () => {
  const app = await setup({ waiting: true });
  app.body.banner.querySelector('.update-banner-action').emit('click');
  assert.deepEqual(app.messages, ['SKIP_WAITING']);
  assert.equal(app.reloads(), 0);
  app.activate();
  assert.equal(app.reloads(), 1);
});

test('a stalled activation does not reload the old version', async () => {
  const app = await setup({ waiting: true });
  const button = app.body.banner.querySelector('.update-banner-action');
  button.emit('click');
  app.runTimers();
  assert.equal(app.reloads(), 0);
  assert.equal(button.disabled, false);
});

test('controller changes during register are not missed', async () => {
  const app = await setup({ onRegister: (sw) => sw.emit('controllerchange') });
  assert.equal(app.body.banner.hidden, false);
  app.body.banner.querySelector('.update-banner-action').emit('click');
  assert.equal(app.reloads(), 1);
});

test('dismissal persists within this document', async () => {
  const app = await setup();
  app.install();
  app.body.banner.querySelector('.update-banner-close').emit('click');
  app.runTimers();
  app.activate();
  assert.equal(app.body.banner.hidden, true);
  assert.equal(app.reloads(), 0);
});

test('resuming and going online check for updates, including offline failures', async () => {
  const app = await setup();
  app.document.emit('visibilitychange');
  app.window.emit('online');
  await Promise.resolve();
  assert.equal(app.checks(), 2);
  assert.equal(app.body.banner.hidden, true);
});

test('all entry pages include the banner and its files are precached', () => {
  const root = path.join(__dirname, '..');
  for (const page of ['index.html', 'finance.html', 'notes.html']) {
    const html = readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /href="update-banner\.css"/);
    assert.match(html, /src="update-banner\.js" defer/);
  }
  const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /'\.\/update-banner\.css'/);
  assert.match(sw, /'\.\/update-banner\.js'/);
});
