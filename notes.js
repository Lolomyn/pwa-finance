'use strict';

/* Данные приложения «Заметки».
   Стор `notes` в общей базе `expense-tracker-db`, статистика на хабе,
   быстрая заметка, экспорт и импорт. Интерфейс экрана — notes-page.js. */

(function () {
  const NOTES_STORE = 'notes';
  const NOTE_COLORS = ['plain', 'yellow', 'pink', 'green', 'blue', 'violet'];
  const TRASH_RETENTION_DAYS = 30;
  const PURGE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const PURGE_TIMESTAMP_KEY = 'notesPurgeCheckedAt';

  const FALLBACK_DB = {
    name: 'expense-tracker-db',
    version: 5,
    expenses: 'expenses',
    settings: 'settings',
    categories: 'categories'
  };

  let notesCache = [];
  let loaded = false;
  let settingsBound = false;
  let fallbackDb = null;
  let lastChecklistItemId = 0;

  /* ------------------------------------------------------------------ */
  /* Утилиты                                                            */
  /* ------------------------------------------------------------------ */

  function byId(id) {
    return document.getElementById(id);
  }

  function nowMs() {
    return Date.now();
  }

  function pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return one;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return few;
    }

    return many;
  }

  function notesCountLabel(count) {
    return `${count} ${pluralize(count, 'заметка', 'заметки', 'заметок')}`;
  }

  function excerpt(text, limit) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();

    if (clean.length <= limit) {
      return clean;
    }

    return `${clean.slice(0, limit - 1).trimEnd()}…`;
  }

  function noteTitleText(note) {
    return note.title && note.title.trim() ? note.title.trim() : 'Без заголовка';
  }

  function plainPreview(note) {
    if (note.mode === 'checklist') {
      const source = Array.isArray(note.items) ? note.items : [];
      const firstOpen = source.find((item) => !item.done) || source[0];

      return firstOpen ? excerpt(firstOpen.text, 90) : '';
    }

    return excerpt(note.text, 90);
  }

  function toast(message) {
    if (typeof window.showInfoToast === 'function') {
      window.showInfoToast(message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Модель                                                             */
  /* ------------------------------------------------------------------ */

  function normalizeNote(raw) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const mode = record.mode === 'checklist' ? 'checklist' : 'text';
    const items = Array.isArray(record.items)
      ? record.items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          id: Number.isFinite(item.id) ? item.id : 0,
          text: typeof item.text === 'string' ? item.text : '',
          done: item.done === true
        }))
      : [];

    items.forEach((item) => {
      lastChecklistItemId = Math.max(lastChecklistItemId, item.id || 0);
    });

    return {
      id: Number.isFinite(record.id) ? record.id : null,
      title: typeof record.title === 'string' ? record.title.slice(0, 120) : '',
      text: typeof record.text === 'string' ? record.text.slice(0, 20000) : '',
      color: NOTE_COLORS.includes(record.color) ? record.color : 'plain',
      mode,
      items,
      pinned: record.pinned === true,
      archived: record.archived === true,
      deletedAt: Number.isFinite(record.deletedAt) ? record.deletedAt : null,
      createdAt: Number.isFinite(record.createdAt) ? record.createdAt : nowMs(),
      updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : nowMs()
    };
  }

  /* ------------------------------------------------------------------ */
  /* IndexedDB                                                          */
  /* ------------------------------------------------------------------ */

  function schema() {
    return {
      name: typeof DB_NAME === 'string' ? DB_NAME : FALLBACK_DB.name,
      version: typeof DB_VERSION === 'number' ? DB_VERSION : FALLBACK_DB.version,
      expenses: typeof STORE_NAME === 'string' ? STORE_NAME : FALLBACK_DB.expenses,
      settings: typeof SETTINGS_STORE === 'string' ? SETTINGS_STORE : FALLBACK_DB.settings,
      categories: typeof CATEGORIES_STORE === 'string' ? CATEGORIES_STORE : FALLBACK_DB.categories
    };
  }

  function openFallbackDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB недоступен.'));
        return;
      }

      const config = schema();
      const request = window.indexedDB.open(config.name, config.version);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(config.expenses)) {
          database.createObjectStore(config.expenses, {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        if (!database.objectStoreNames.contains(config.settings)) {
          database.createObjectStore(config.settings, {
            keyPath: 'key'
          });
        }

        if (!database.objectStoreNames.contains(config.categories)) {
          database.createObjectStore(config.categories, {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        if (!database.objectStoreNames.contains(NOTES_STORE)) {
          database.createObjectStore(NOTES_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = () => {
        const database = request.result;

        database.onversionchange = () => {
          database.close();

          if (fallbackDb === database) {
            fallbackDb = null;
          }
        };

        resolve(database);
      };

      request.onerror = () => reject(request.error || new Error('Не удалось открыть базу данных заметок.'));
      request.onblocked = () => reject(new Error('База данных занята другой вкладкой.'));
    });
  }

  async function withStore(mode) {
    // `db` — лексическая глобаль app.js (классический скрипт), недоступна через window.
    let database = typeof db === 'object' ? db : null;

    if (!database) {
      if (!fallbackDb) {
        fallbackDb = await openFallbackDb();
      }

      database = fallbackDb;
    }

    return database.transaction(NOTES_STORE, mode).objectStore(NOTES_STORE);
  }

  function settleStoreRequest(request, failMessage, transform) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const fail = (error) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error || new Error(failMessage));
      };

      request.onsuccess = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(transform ? transform(request.result) : request.result);
      };

      request.onerror = () => fail(request.error);
      request.transaction.onerror = () => fail(request.transaction.error);
      request.transaction.onabort = () => fail(request.transaction.error);
    });
  }

  async function getAllNotes() {
    const store = await withStore('readonly');

    return settleStoreRequest(
      store.getAll(),
      'Не удалось прочитать заметки.',
      (rows) => (rows || []).map(normalizeNote)
    );
  }

  async function putNote(note) {
    const copy = { ...note };
    delete copy.id;

    if (Number.isFinite(note.id)) {
      copy.id = note.id;
    }

    const store = await withStore('readwrite');
    const newId = await settleStoreRequest(store.put(copy), 'Не удалось сохранить заметку.');

    return Number.isFinite(newId) ? newId : copy.id;
  }

  async function deleteNoteRecord(id) {
    const store = await withStore('readwrite');

    await settleStoreRequest(store.delete(id), 'Не удалось удалить заметку.');
  }

  async function reloadNotes() {
    notesCache = await getAllNotes();
    loaded = true;
  }

  async function purgeTrashIfNeeded() {
    let lastCheck = 0;

    try {
      lastCheck = Number(window.localStorage.getItem(PURGE_TIMESTAMP_KEY)) || 0;
    } catch (error) {
      lastCheck = 0;
    }

    if (nowMs() - lastCheck < PURGE_CHECK_INTERVAL_MS) {
      return;
    }

    const cutoff = nowMs() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expired = notesCache.filter((note) => note.deletedAt && note.deletedAt < cutoff);

    for (const note of expired) {
      await deleteNoteRecord(note.id);
    }

    try {
      window.localStorage.setItem(PURGE_TIMESTAMP_KEY, String(nowMs()));
    } catch (error) {
      // localStorage может быть недоступен — просто пропускаем отметку времени.
    }

    if (expired.length > 0) {
      await reloadNotes();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Хаб                                                                */
  /* ------------------------------------------------------------------ */

  function activeNotes() {
    return notesCache.filter((note) => !note.deletedAt && !note.archived);
  }

  function renderHub() {
    const statEl = byId('hub-notes-stat');

    if (statEl) {
      const active = activeNotes();
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayCount = active.filter((note) => {
        const updated = new Date(note.updatedAt);

        if (Number.isNaN(updated.getTime())) {
          return false;
        }

        return updated.toISOString().slice(0, 10) === todayKey;
      }).length;

      const parts = [notesCountLabel(active.length)];

      if (todayCount > 0) {
        parts.push(`${todayCount} сегодня`);
      }

      statEl.textContent = parts.join(' · ');
    }

    const widgetTitle = byId('hub-notes-widget-title');

    if (!widgetTitle) {
      return;
    }

    const active = activeNotes();
    const latest = [...active].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;

    if (latest) {
      widgetTitle.textContent = noteTitleText(latest);
      byId('hub-notes-widget-preview').textContent = plainPreview(latest) || 'Пустая заметка';
    } else {
      widgetTitle.textContent = 'Нет заметок';
      byId('hub-notes-widget-preview').textContent = 'Создайте первую';
    }

    const archivedCount = notesCache.filter((note) => !note.deletedAt && note.archived).length;
    const metaParts = [notesCountLabel(active.length)];

    if (archivedCount > 0) {
      metaParts.push(`в архиве ${archivedCount}`);
    }

    byId('hub-notes-widget-meta').textContent = metaParts.join(' · ');
  }

  /* ------------------------------------------------------------------ */
  /* Публичные операции                                                 */
  /* ------------------------------------------------------------------ */

  function list() {
    return notesCache
      .filter((note) => !note.deletedAt && !note.archived)
      .map((note) => ({
        ...note,
        items: note.items.map((item) => ({ ...item }))
      }));
  }

  async function save(note) {
    const normalized = normalizeNote(note);
    const id = await putNote(normalized);

    await reloadNotes();
    renderHub();

    return id;
  }

  async function remove(id) {
    if (!Number.isFinite(id)) {
      return;
    }

    await deleteNoteRecord(id);
    await reloadNotes();
    renderHub();
  }

  function nextChecklistItemId() {
    lastChecklistItemId += 1;
    return lastChecklistItemId;
  }

  async function createQuickNote(text) {
    if (!loaded) {
      return null;
    }

    const trimmed = String(text || '').trim();

    if (!trimmed) {
      return null;
    }

    const firstLine = trimmed.split(/\r?\n/)[0].trim().slice(0, 60);
    const stamp = nowMs();
    const note = normalizeNote({
      title: firstLine,
      text: trimmed,
      color: 'plain',
      mode: 'text',
      deletedAt: null,
      createdAt: stamp,
      updatedAt: stamp
    });

    try {
      await putNote(note);
      await reloadNotes();
    } catch (error) {
      return null;
    }

    renderHub();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Экспорт и импорт                                                   */
  /* ------------------------------------------------------------------ */

  function exportJson() {
    if (!loaded) {
      toast('Приложение заметок ещё загружается');
      return;
    }

    const payload = {
      app: 'notes',
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: notesCache
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `notes-backup-${stamp}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast('Экспорт сохранён');
  }

  async function importJson(file) {
    if (!file) {
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      toast('Файл не читается');
      return;
    }

    const incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed && parsed.notes) ? parsed.notes : [];

    if (incoming.length === 0) {
      toast('В файле нет заметок');
      return;
    }

    const existingKey = (note) => `${note.title}\n${note.text}\n${note.updatedAt}`;
    const existingKeys = new Set(notesCache.map(existingKey));
    let added = 0;

    for (const raw of incoming) {
      const note = normalizeNote(raw);
      delete note.id;

      if (existingKeys.has(existingKey(note))) {
        continue;
      }

      existingKeys.add(existingKey(note));
      await putNote(note);
      added += 1;
    }

    await reloadNotes();
    renderHub();

    toast(added > 0 ? `Добавлено ${added} ${pluralize(added, 'заметка', 'заметки', 'заметок')}` : 'Новых заметок нет');
  }

  function bindSettingsButtons() {
    if (settingsBound) {
      return;
    }

    settingsBound = true;

    const exportButton = byId('notes-export');
    const importButton = byId('notes-import');
    const importFile = byId('notes-import-file');

    exportButton?.addEventListener('click', exportJson);
    importButton?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', async () => {
      const file = importFile.files && importFile.files[0];

      try {
        await importJson(file);
      } catch (error) {
        toast('Не удалось импортировать');
      } finally {
        importFile.value = '';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация                                                      */
  /* ------------------------------------------------------------------ */

  async function init() {
    bindSettingsButtons();

    try {
      await reloadNotes();
      await purgeTrashIfNeeded();
    } catch (error) {
      console.warn('Заметки: не удалось загрузить данные:', error);
      loaded = false;
    }

    renderHub();

    return notesCache;
  }

  function render() {
    renderHub();
  }

  window.Notes = {
    init,
    render,
    renderHub,
    createQuickNote,
    exportJson,
    importJson,
    list,
    save,
    remove,
    nextChecklistItemId,
    isLoaded: () => loaded
  };
})();
