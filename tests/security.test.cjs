'use strict';

const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Security source markers must exist: ${start}, ${end}`);
  return source.slice(from, to);
}

// Evaluate the original security implementation, not init() or app-access.js.
const securitySource = extractBetween('function bytesToBase64(', 'function setPinRecoveryError(');
const stateSource = extractBetween('let securityState = {', 'let reconcileDraft =');
const constants = ['PIN_MIN_LENGTH', 'PIN_MAX_LENGTH', 'PIN_MAX_ATTEMPTS', 'PIN_LOCK_DURATION']
  .map((name) => {
    const match = source.match(new RegExp(`const ${name} = [^;]+;`));
    assert.ok(match, `Missing ${name}`);
    return match[0];
  }).join('\n');
const event = { preventDefault() {} };
const credentialBytes = Uint8Array.from([1, 2, 3, 4]);
const credentialId = Buffer.from(credentialBytes).toString('base64');

function element() {
  const classes = new Set();
  return {
    value: '', hidden: false, disabled: false, textContent: '', dataset: {}, focused: false,
    focus() { this.focused = true; },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

function setup({ online = true, platformAvailable = true, getCredential, createCredential } = {}) {
  let now = 1_000_000;
  let nextTimer = 0;
  const timers = new Map();
  const writes = [];
  const persisted = {};
  const requests = { get: [], create: [] };
  const hubStatus = element();
  const context = {
    Uint8Array, TextEncoder, Error,
    Date: class extends Date { static now() { return now; } },
    window: {
      crypto: webcrypto,
      isSecureContext: true,
      PublicKeyCredential: {
        async isUserVerifyingPlatformAuthenticatorAvailable() { return platformAvailable; }
      },
      btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
      atob: (value) => Buffer.from(value, 'base64').toString('binary'),
      setTimeout(callback) { callback(); return ++nextTimer; },
      setInterval(callback) { timers.set(++nextTimer, callback); return nextTimer; },
      clearInterval(id) { timers.delete(id); }
    },
    navigator: {
      onLine: online,
      credentials: {
        async get(options) {
          requests.get.push(options);
          return getCredential ? getCredential(options) : {
            id: Buffer.from(credentialBytes).toString('base64url'),
            rawId: credentialBytes.buffer,
            type: 'public-key', response: {}
          };
        },
        async create(options) {
          requests.create.push(options);
          return createCredential ? createCredential(options) : { rawId: credentialBytes.buffer };
        }
      }
    },
    document: { body: element(), getElementById: () => hubStatus },
    appRoot: element(),
    async setSettings(settings) {
      writes.push({ ...settings });
      for (const [key, value] of Object.entries(settings)) {
        if (value === undefined) delete persisted[key];
        else persisted[key] = value;
      }
    }
  };
  // Use the actual DOM binding names so the security UI functions run too.
  for (const match of source.matchAll(/const ((?:security|lock)\w+) = document\.getElementById\(/g)) {
    context[match[1]] = element();
  }
  vm.createContext(context);
  vm.runInContext(`${constants}\n${stateSource}\n${securitySource}`, context, { filename: 'app.js:security' });
  return {
    context, writes, persisted, requests, timers,
    state: () => vm.runInContext('securityState', context),
    read: (expression) => vm.runInContext(expression, context),
    advance(ms) {
      now += ms;
      for (const callback of [...timers.values()]) callback();
    },
    async enable(pin = '1234', confirmation = pin) {
      context.securityPinInput.value = pin;
      context.securityPinConfirmInput.value = confirmation;
      await context.handleSecurityPinSubmit(event);
    },
    async unlock(pin) {
      context.lockPinInput.value = pin;
      await context.handleLockSubmit(event);
    },
    async biometric() {
      await this.enable();
      await context.handleEnableBiometric();
    }
  };
}

function expectedHash(pin, salt) {
  return createHash('sha256').update(`${pin}${salt}`).digest('hex');
}

test('enable PIN rejects invalid format and mismatched confirmation without persisting', async () => {
  const app = setup();
  for (const pin of ['', '123', '1234567', '12a4', '１２３４', '12 34']) {
    await app.enable(pin);
    assert.equal(app.writes.length, 0, `Invalid PIN: ${pin}`);
    assert.match(app.context.securityModalError.textContent, /4–6/);
    assert.equal(app.state().pinEnabled, false);
  }
  await app.enable('1234', '4321');
  assert.equal(app.writes.length, 0);
  assert.match(app.context.securityModalError.textContent, /не совпадает/);
});

test('enable PIN persists a salted SHA-256 hash, never plaintext, for 4–6 digits', async () => {
  for (const pin of ['0123', '12345', '123456']) {
    const app = setup();
    await app.enable(pin);
    assert.equal(app.writes.length, 1);
    assert.equal(app.persisted.pinEnabled, true);
    assert.match(app.persisted.pinSalt, /^[a-f0-9]{32}$/);
    assert.match(app.persisted.pinHash, /^[a-f0-9]{64}$/);
    assert.equal(app.persisted.pinHash, expectedHash(pin, app.persisted.pinSalt));
    assert.notEqual(app.persisted.pinHash, pin);
    assert.ok(!Object.values(app.persisted).includes(pin));
    assert.equal(app.state().pinHash, app.persisted.pinHash);
    assert.equal(app.context.securityPinInput.value, '');
    assert.equal(app.context.securityPinConfirmInput.value, '');
    const salt = app.persisted.pinSalt;
    await app.enable(pin);
    assert.notEqual(app.persisted.pinSalt, salt);
  }
});

test('wrong PIN stays locked; fifth failed attempt starts a 30-second cooldown', async () => {
  const app = setup();
  await app.enable();
  app.context.showLockScreen();
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await app.unlock('9999');
    assert.equal(app.read('isAppLocked'), true);
    assert.equal(app.read('pinFailedAttempts'), attempt);
    assert.equal(app.context.lockPinInput.disabled, false);
    assert.match(app.context.lockMessage.textContent, /Неверный PIN/);
  }
  await app.unlock('9999');
  assert.equal(app.context.lockPinInput.disabled, true);
  assert.equal(app.context.lockSubmitButton.disabled, true);
  assert.equal(app.read('pinLockedUntil - Date.now()'), 30_000);
  assert.equal(app.timers.size, 1);
  await app.unlock('1234');
  assert.equal(app.read('isAppLocked'), true, 'Even correct PIN cannot bypass cooldown');
  app.advance(29_999);
  assert.equal(app.context.lockPinInput.disabled, true);
  app.advance(1);
  assert.equal(app.context.lockPinInput.disabled, false);
  assert.equal(app.timers.size, 0);
  await app.unlock('1234');
  assert.equal(app.read('isAppLocked'), false);
  assert.equal(app.read('pinFailedAttempts'), 0);
  assert.equal(app.read('pinLockedUntil'), 0);
});

test('change PIN requires configured PIN, valid old/new format and correct old PIN', async () => {
  const app = setup();
  await assert.rejects(app.context.changePin('1234', '5678'), /PIN не настроен/);
  await app.enable();
  const hash = app.persisted.pinHash;
  const salt = app.persisted.pinSalt;
  for (const [oldPin, newPin, message] of [
    ['123', '5678', /текущий PIN/],
    ['1234', '56x8', /Новый PIN/],
    ['9999', '5678', /Неверный текущий PIN/]
  ]) {
    await assert.rejects(app.context.changePin(oldPin, newPin), message);
    assert.equal(app.persisted.pinHash, hash);
    assert.equal(app.writes.length, 1);
  }
  await app.context.changePin('1234', '567890');
  assert.notEqual(app.persisted.pinHash, hash);
  assert.notEqual(app.persisted.pinSalt, salt);
  assert.equal(app.persisted.pinHash, expectedHash('567890', app.persisted.pinSalt));
  app.context.showLockScreen();
  await app.unlock('1234');
  assert.equal(app.read('isAppLocked'), true);
  await app.unlock('567890');
  assert.equal(app.read('isAppLocked'), false);
});

test('change PIN form rejects confirmation mismatch and preserves biometric configuration', async () => {
  const app = setup();
  await app.biometric();
  const { context } = app;
  const before = app.writes.length;
  context.securityChangeOldPinInput.value = '1234';
  context.securityChangeNewPinInput.value = '5678';
  context.securityChangeNewPinConfirmInput.value = '8765';
  await context.handleSecurityChangePinSubmit(event);
  assert.equal(app.writes.length, before);
  assert.match(context.securityModalError.textContent, /не совпадает/);
  context.securityChangeNewPinConfirmInput.value = '5678';
  await context.handleSecurityChangePinSubmit(event);
  assert.equal(app.state().biometricEnabled, true);
  assert.equal(app.state().credentialId, credentialId);
  assert.equal(app.persisted.pinHash, expectedHash('5678', app.persisted.pinSalt));
  assert.match(context.securityChangePinStatus.textContent, /PIN изменён/);
});

test('disable PIN validates current PIN and clears PIN plus biometric settings', async () => {
  const app = setup();
  await app.biometric();
  const before = app.writes.length;
  for (const pin of ['abc', '9999']) {
    app.context.securityCurrentPinInput.value = pin;
    await app.context.handleSecurityCurrentPinSubmit(event);
    assert.equal(app.writes.length, before);
    assert.equal(app.state().pinEnabled, true);
    assert.equal(app.context.securityModalError.hidden, false);
  }
  app.context.securityCurrentPinInput.value = '1234';
  await app.context.handleSecurityCurrentPinSubmit(event);
  assert.equal(app.state().pinEnabled, false);
  assert.equal(app.state().biometricEnabled, false);
  assert.equal(app.state().credentialId, '');
  assert.deepEqual(app.persisted, { pinEnabled: false, biometricEnabled: false });
});

test('WebAuthn registration requires PIN, platform authenticator and required verification', async () => {
  const app = setup();
  await app.context.handleEnableBiometric();
  assert.equal(app.requests.create.length, 0);
  assert.match(app.context.securityModalError.textContent, /Сначала включите PIN/);
  await app.biometric();
  const { publicKey } = app.requests.create[0];
  assert.equal(publicKey.authenticatorSelection.authenticatorAttachment, 'platform');
  assert.equal(publicKey.authenticatorSelection.userVerification, 'required');
  assert.equal(publicKey.challenge.byteLength, 32);
  assert.equal(publicKey.user.id.byteLength, 16);
  assert.equal(publicKey.attestation, 'none');
  assert.equal(app.persisted.credentialId, credentialId);
  assert.equal(app.persisted.biometricEnabled, true);
  const unavailable = setup({ platformAvailable: false });
  await unavailable.biometric();
  assert.equal(unavailable.requests.create.length, 0);
  assert.equal(unavailable.state().biometricEnabled, false);
});

test('authenticateBiometric requests saved credential and required user verification', async () => {
  const app = setup();
  await assert.rejects(app.context.authenticateBiometric(), /недоступна/);
  await app.biometric();
  const credential = await app.context.authenticateBiometric();
  const { publicKey } = app.requests.get[0];
  assert.equal(publicKey.userVerification, 'required');
  assert.equal(publicKey.challenge.byteLength, 32);
  assert.equal(publicKey.allowCredentials.length, 1);
  assert.equal(publicKey.allowCredentials[0].type, 'public-key');
  assert.deepEqual([...publicKey.allowCredentials[0].id], [...credentialBytes]);
  assert.deepEqual([...new Uint8Array(credential.rawId)], [...credentialBytes]);
});

test('authenticateBiometric rejects a null credential and keeps the app locked', async () => {
  const app = setup({ getCredential: () => null });
  await app.biometric();
  await assert.rejects(app.context.authenticateBiometric(), /не подтвердила вход/);
  app.context.showLockScreen();
  await app.context.handleBiometricUnlock();
  assert.equal(app.read('isAppLocked'), true);
  assert.match(app.context.lockMessage.textContent, /введите PIN/);
});

test('authenticateBiometric rejects a credential with a different ID (security regression)', async () => {
  const otherBytes = Uint8Array.from([9, 8, 7, 6]);
  const app = setup({ getCredential: () => ({
    id: Buffer.from(otherBytes).toString('base64url'),
    rawId: otherBytes.buffer,
    type: 'public-key', response: {}
  }) });
  await app.biometric();
  await assert.rejects(app.context.authenticateBiometric());
});

test('offline WebAuthn failure leaves PIN fallback usable without network requests', async () => {
  const app = setup({
    online: false,
    getCredential() { throw new Error('Authenticator unavailable offline'); }
  });
  await app.biometric();
  app.context.showLockScreen();
  await app.context.handleBiometricUnlock();
  assert.equal(app.requests.get.length, 1);
  assert.equal(app.read('isAppLocked'), true);
  assert.match(app.context.lockMessage.textContent, /Face ID недоступен, введите PIN/);
  assert.equal(app.context.lockPinInput.disabled, false);
  assert.equal(app.context.lockBiometricButton.disabled, false);
  await app.unlock('1234');
  assert.equal(app.read('isAppLocked'), false);
});
