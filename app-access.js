'use strict';

/* Shared entry gate for the PWA screens. This is an interface lock, not
 * encryption of IndexedDB. The PIN gate itself lives on the hub. */
(function () {
  const TICKET_KEY = 'expense-tracker-access-navigation';
  const LOCK_TIMEOUT = 60 * 1000;
  const ALLOWED_PAGES = new Set(['index.html', 'finance.html', 'notes.html', 'subscriptions.html']);
  const root = document.documentElement;
  const page = location.pathname.split('/').pop() || 'index.html';
  const isHub = page === 'index.html';
  let authorized = false;
  let pinRequired = false;
  let fingerprint = '';
  let hiddenAt = 0;
  let checkVersion = 0;
  let channel = null;

  root.setAttribute('data-access-pending', '');

  function reveal() {
    if (document.hidden) return;
    root.removeAttribute('data-access-pending');
    if (document.body) document.body.inert = false;
  }

  function conceal() {
    root.setAttribute('data-access-pending', '');
    if (document.body) document.body.inert = true;
  }

  function readSecuritySettings() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('expense-tracker-db');
      let missingDatabase = false;

      request.onupgradeneeded = () => {
        missingDatabase = true;
        request.transaction.abort();
      };
      request.onerror = () => {
        if (missingDatabase) resolve({});
        else reject(request.error || new Error('Не удалось открыть хранилище.'));
      };
      request.onblocked = () => reject(new Error('Хранилище занято другой вкладкой.'));
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.close();
          reject(new Error('Настройки защиты недоступны.'));
          return;
        }

        const values = {};
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        ['pinEnabled', 'pinHash', 'pinSalt'].forEach((key) => {
          const get = store.get(key);
          get.onsuccess = () => { values[key] = get.result ? get.result.value : undefined; };
        });
        tx.oncomplete = () => { db.close(); resolve(values); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Не удалось прочитать настройки.')); };
      };
    });
  }

  function consumeTicket() {
    try {
      const ticket = JSON.parse(sessionStorage.getItem(TICKET_KEY) || 'null');
      sessionStorage.removeItem(TICKET_KEY);
      return Boolean(ticket
        && ticket.target === page
        && ticket.expires > Date.now()
        && ticket.expires <= Date.now() + 10000);
    } catch (error) {
      return false;
    }
  }

  function resolveDestination(value) {
    const url = new URL(value, location.href);
    const target = url.pathname.split('/').pop() || 'index.html';
    const directory = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);

    if (url.origin !== location.origin
      || url.pathname !== `${directory}${target}`
      || !ALLOWED_PAGES.has(target)) {
      throw new Error('Недопустимый экран приложения.');
    }

    return { url, target };
  }

  function navigate(value, replace = false) {
    const { url, target } = resolveDestination(value);

    try {
      if (authorized) {
        sessionStorage.setItem(TICKET_KEY, JSON.stringify({ target, expires: Date.now() + 10000 }));
      } else {
        sessionStorage.removeItem(TICKET_KEY);
      }
    } catch (error) {
      // Without sessionStorage the destination safely asks for PIN again.
    }

    conceal();
    if (replace) location.replace(url.href);
    else location.assign(url.href);
  }

  function showStorageError() {
    conceal();
    root.setAttribute('data-access-error', '');
    if (document.body) document.body.inert = false;

    const render = () => {
      document.body.inert = false;
      if (document.getElementById('access-error')) return;
      const panel = document.createElement('div');
      panel.id = 'access-error';
      panel.setAttribute('role', 'alert');
      panel.append(document.createTextNode('Не удалось проверить настройки защиты. Проверьте доступ к хранилищу и '));
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'повторите попытку';
      retry.addEventListener('click', () => location.reload());
      panel.append(retry);
      document.body.append(panel);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
    else render();
  }

  function sendToHub() {
    authorized = false;
    try { sessionStorage.removeItem(TICKET_KEY); } catch (error) {}
    conceal();
    location.replace(`./index.html?unlock=${encodeURIComponent(page)}#hub`);
  }

  async function check(initial = false) {
    const version = ++checkVersion;
    conceal();

    try {
      const values = await readSecuritySettings();
      if (version !== checkVersion) return false;

      const nextFingerprint = `${values.pinHash || ''}:${values.pinSalt || ''}`;
      if (values.pinEnabled === true && (!values.pinHash || !values.pinSalt)) {
        throw new Error('Настройки PIN повреждены.');
      }
      const nextPinRequired = values.pinEnabled === true;

      if (initial) {
        pinRequired = nextPinRequired;
        fingerprint = nextFingerprint;
        const ticketValid = consumeTicket();
        authorized = !pinRequired || ticketValid;
      } else if (!nextPinRequired) {
        pinRequired = false;
        fingerprint = nextFingerprint;
        authorized = true;
      } else {
        const settingsChanged = fingerprint !== nextFingerprint;
        pinRequired = true;
        fingerprint = nextFingerprint;
        authorized = authorized && !settingsChanged && !(hiddenAt && Date.now() - hiddenAt >= LOCK_TIMEOUT);
      }

      hiddenAt = 0;

      if (initial) {
        if (!authorized && !isHub) {
          sendToHub();
          return false;
        }
        return true;
      }
      if (!authorized && pinRequired) {
        lockHub();
        return false;
      }
      if (!document.hidden) reveal();
      return true;
    } catch (error) {
      if (version === checkVersion) showStorageError();
      return false;
    }
  }

  function unlock() {
    authorized = true;
    reveal();

    if (!isHub) return;
    const url = new URL(location.href);
    const requestedPage = url.searchParams.get('unlock');
    if (requestedPage && ALLOWED_PAGES.has(requestedPage) && requestedPage !== 'index.html') {
      url.searchParams.delete('unlock');
      history.replaceState(null, '', url.href);
      navigate(`./${requestedPage}`, true);
    }
  }

  async function settingsChanged() {
    let values;
    try {
      values = await readSecuritySettings();
    } catch (error) {
      showStorageError();
      throw error;
    }
    if (values.pinEnabled === true && (!values.pinHash || !values.pinSalt)) {
      showStorageError();
      throw new Error('Настройки PIN повреждены.');
    }
    fingerprint = `${values.pinHash || ''}:${values.pinSalt || ''}`;
    pinRequired = values.pinEnabled === true;
    authorized = true;
    reveal();
    if (channel) channel.postMessage('settings-changed');
  }

  function lockHub() {
    authorized = false;
    conceal();
    if (isHub) {
      window.dispatchEvent(new Event('app-access-lock'));
      return;
    }
    sendToHub();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      conceal();
    } else {
      check(false);
    }
  });
  window.addEventListener('pagehide', conceal);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      authorized = false;
      check(false);
    }
  });
  window.addEventListener('storage', (event) => {
    if (['pinHash', 'pinSalt', 'pinEnabled'].includes(event.key)) check(false);
  });

  try {
    channel = new BroadcastChannel('expense-tracker-security');
    channel.onmessage = () => {
      authorized = false;
      check(false);
    };
  } catch (error) {}

  window.AppAccess = {
    ready: check(true),
    reveal,
    unlocked: unlock,
    navigate,
    settingsChanged,
    showStorageError,
    isAuthorized: () => authorized,
    requiresPin: () => pinRequired
  };
})();
