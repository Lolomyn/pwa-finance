'use strict';

/* Приложение «Заметки» для хаба PWA.
   Выделено в отдельный модуль, чтобы не раздувать app.js трекера.
   Работает поверх общего соединения IndexedDB (глобальная переменная db
   и константы схемы из app.js): новая версия базы создаёт стор `notes`.
   Публичный API: window.Notes.init / render / renderHub / createQuickNote /
   exportJson / importJson. */

(function () {
  const NOTES_STORE = 'notes';

  const NOTE_COLORS = ['plain', 'yellow', 'pink', 'green', 'blue', 'violet'];
  const TRASH_RETENTION_DAYS = 30;
  const AUTOSAVE_DELAY_MS = 400;
  const UNDO_TIMEOUT_MS = 5000;
  const PURGE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const PURGE_TIMESTAMP_KEY = 'notesPurgeCheckedAt';

  const appRoot = document.getElementById('app');
  const els = {};

  let notesCache = [];
  let loaded = false;
  let eventsBound = false;
  let pendingRender = false;

  let editorId = null;
  let editorIsNew = false;
  let editorOpen = false;
  let editorMode = 'text';
  let editorPreview = false;
  let editorSaveTimer = null;
  let editorReturnFocus = null;

  let checklistDraftItems = [];
  let lastChecklistItemId = 0;

  let noteUndoEntry = null;

  /* ------------------------------------------------------------------ */
  /* Утилиты                                                            */
  /* ------------------------------------------------------------------ */

  function el(id) {
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

  function escapeHtml(text) {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatDate(ms) {
    try {
      return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(ms));
    } catch (error) {
      return '';
    }
  }

  function excerpt(text, limit) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();

    if (clean.length <= limit) {
      return clean;
    }

    return `${clean.slice(0, limit - 1).trimEnd()}…`;
  }

  function plainPreview(note) {
    if (note.mode === 'checklist') {
      const source = Array.isArray(note.items) ? note.items : [];
      const firstOpen = source.find((item) => !item.done) || source[0];

      return firstOpen ? excerpt(firstOpen.text, 90) : '';
    }

    return excerpt(note.text, 90);
  }

  /* ------------------------------------------------------------------ */
  /* Данные                                                             */
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

  let fallbackDb = null;

  function openFallbackDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB недоступен.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE, {
            keyPath: 'key'
          });
        }

        if (!database.objectStoreNames.contains(CATEGORIES_STORE)) {
          database.createObjectStore(CATEGORIES_STORE, {
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
  /* Маркдаун-подсветка                                                 */
  /* ------------------------------------------------------------------ */

  function mdToHtml(raw) {
    const lines = String(raw || '').split(/\r?\n/);
    const parts = [];
    let bullet = [];

    const flushBullets = () => {
      if (bullet.length === 0) {
        return;
      }

      parts.push(`<ul>${bullet.map((line) => `<li>${line}</li>`).join('')}</ul>`);
      bullet = [];
    };

    lines.forEach((line) => {
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);

      if (bulletMatch) {
        bullet.push(inlineMd(bulletMatch[1]));
        return;
      }

      flushBullets();

      if (line.trim() === '') {
        return;
      }

      parts.push(`<p>${inlineMd(line)}</p>`);
    });

    flushBullets();

    return parts.join('');
  }

  function inlineMd(text) {
    let out = escapeHtml(text);
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Тексты карточки                                                    */
  /* ------------------------------------------------------------------ */

  function noteTitleText(note) {
    return note.title && note.title.trim() ? note.title.trim() : 'Без заголовка';
  }

  function buildCard(note, context) {
    const card = document.createElement('article');
    card.className = [
      'note-card',
      `is-color--${note.color}`,
      note.pinned && context === 'active' ? 'is-pinned' : '',
      context === 'archive' ? 'is-archived' : ''
    ].filter(Boolean).join(' ');
    card.dataset.id = String(note.id);
    card.dataset.context = context;
    card.setAttribute('role', 'listitem');

    const inner = document.createElement('div');
    inner.className = 'note-card-inner';

    const head = document.createElement('header');
    head.className = 'note-card-head';

    const title = document.createElement('h3');
    title.className = 'note-card-title';
    title.textContent = noteTitleText(note);
    head.append(title);

    if (note.pinned && context === 'active') {
      const flag = document.createElement('span');
      flag.className = 'note-card-flag';
      flag.textContent = '📌';
      flag.setAttribute('aria-label', 'Закреплена');
      head.append(flag);
    }

    inner.append(head);

    const preview = plainPreview(note);

    if (preview) {
      const previewEl = document.createElement('p');
      previewEl.className = 'note-card-preview';
      previewEl.textContent = preview;
      inner.append(previewEl);
    }

    const meta = document.createElement('footer');
    meta.className = 'note-card-meta';
    const date = document.createElement('span');
    date.textContent = formatDate(note.updatedAt);
    meta.append(date);

    if (note.mode === 'checklist') {
      const info = document.createElement('span');
      info.className = 'note-card-checkinfo';
      const total = (note.items || []).length;
      const done = (note.items || []).filter((item) => item.done).length;
      info.textContent = `✔ ${done}/${total}`;
      meta.append(info);
    }

    if (note.deletedAt) {
      const info = document.createElement('span');
      const daysLeft = TRASH_RETENTION_DAYS - Math.floor((nowMs() - note.deletedAt) / (24 * 60 * 60 * 1000));
      info.textContent = `осталось ~${Math.max(1, daysLeft)} дн.`;
      meta.append(info);
    }

    inner.append(meta);

    if (context === 'archive') {
      const actions = document.createElement('div');
      actions.className = 'note-card-actions';
      const unarchive = document.createElement('button');
      unarchive.type = 'button';
      unarchive.className = 'note-card-button';
      unarchive.dataset.action = 'unarchive';
      unarchive.textContent = 'Вернуть из архива';
      actions.append(unarchive);
      inner.append(actions);
    }

    if (context === 'trash') {
      const actions = document.createElement('div');
      actions.className = 'note-card-actions';

      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'note-card-button note-card-button--restore';
      restore.dataset.action = 'restore';
      restore.textContent = 'Восстановить';

      const purge = document.createElement('button');
      purge.type = 'button';
      purge.className = 'note-card-button note-card-button--purge';
      purge.dataset.action = 'purge';
      purge.textContent = 'Удалить навсегда';

      actions.append(restore, purge);
      inner.append(actions);
    }

    if (context === 'active') {
      const hintLeft = document.createElement('span');
      hintLeft.className = 'note-card-hint note-card-hint--left';
      hintLeft.textContent = '🗑';
      hintLeft.setAttribute('aria-hidden', 'true');

      const hintRight = document.createElement('span');
      hintRight.className = 'note-card-hint note-card-hint--right';
      hintRight.textContent = note.pinned ? 'Открепить' : '📌';
      hintRight.setAttribute('aria-hidden', 'true');

      card.append(hintLeft, hintRight);
    }

    card.append(inner);

    if (context === 'active') {
      attachCardSwipe(card, note);
    }

    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Отрисовка экрана и виджета хаба                                    */
  /* ------------------------------------------------------------------ */

  function readDom() {
    if (els.root) {
      return;
    }

    els.root = el('tab-notes');
    els.list = el('notes-list');
    els.empty = el('notes-empty');
    els.countLabel = el('notes-count-label');
    els.addButton = el('notes-add');
    els.tools = {
      archive: el('notes-toggle-archive'),
      trash: el('notes-toggle-trash')
    };
    els.archive = {
      count: el('notes-archive-count'),
      section: el('notes-archive-section'),
      list: el('notes-archive-list'),
      empty: el('notes-archive-empty')
    };
    els.trash = {
      count: el('notes-trash-count'),
      section: el('notes-trash-section'),
      list: el('notes-trash-list'),
      empty: el('notes-trash-empty')
    };

    els.editor = el('notes-editor');
    els.editorBack = el('notes-editor-back');
    els.editorTitle = el('notes-editor-title');
    els.editorEye = el('notes-editor-preview');
    els.pinButton = el('note-pin');
    els.archiveButton = el('note-archive');
    els.deleteButton = el('note-delete');
    els.palette = document.querySelectorAll('#notes-editor .note-palette-swatch');
    els.modeText = el('note-mode-text');
    els.modeChecklist = el('note-mode-checklist');
    els.titleInput = el('note-title-input');
    els.textInput = el('note-text-input');
    els.checklistEditor = el('note-checklist-editor');
    els.checkItems = el('note-check-items');
    els.checkNew = el('note-check-new');
    els.checkAddButton = el('note-check-add-button');
    els.mdPreview = el('note-md-preview');

    els.hubNotesWidget = el('hub-notes-widget');
    els.hubNotesWidgetTitle = el('hub-notes-widget-title');
    els.hubNotesWidgetPreview = el('hub-notes-widget-preview');
    els.hubNotesWidgetMeta = el('hub-notes-widget-meta');

    els.exportButton = el('notes-export');
    els.importButton = el('notes-import');
    els.importFile = el('notes-import-file');

    els.undoToast = el('notes-undo-toast');
    els.undoText = el('notes-undo-text');
    els.undoButton = el('notes-undo-button');
  }

  function segmentLists() {
    const active = [];
    const archived = [];
    const trashed = [];

    notesCache.forEach((note) => {
      if (note.deletedAt) {
        trashed.push(note);
      } else if (note.archived) {
        archived.push(note);
      } else {
        active.push(note);
      }
    });

    const byUpdatedDesc = (a, b) => b.updatedAt - a.updatedAt;

    active.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || byUpdatedDesc(a, b));
    archived.sort(byUpdatedDesc);
    trashed.sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

    return { active, archived, trashed };
  }

  function fillList(container, notes, context) {
    container.replaceChildren();
    notes.forEach((note) => {
      container.append(buildCard(note, context));
    });
  }

  function setExtraVisible(which, visible) {
    const segment = els[which];
    const counter = segment.count;
    const count = notesCache.filter(which === 'archive'
      ? (note) => !note.deletedAt && note.archived
      : (note) => Boolean(note.deletedAt)).length;

    counter.textContent = String(count);
    counter.hidden = count === 0;

    segment.section.hidden = !visible;
    els.tools[which].setAttribute('aria-expanded', visible ? 'true' : 'false');

    fillList(segment.list, which === 'archive'
      ? segmentLists().archived
      : segmentLists().trashed, which === 'archive' ? 'archive' : 'trash');

    segment.empty.hidden = which === 'archive'
      ? segmentLists().archived.length > 0
      : segmentLists().trashed.length > 0;
  }

  function render() {
    readDom();

    if (!loaded) {
      pendingRender = true;
      return;
    }

    const { active } = segmentLists();
    fillList(els.list, active, 'active');

    els.empty.hidden = active.length > 0;
    els.countLabel.textContent = `${notesCountLabel(active.length)} в основной папке`;

    const openArchive = els.tools.archive.getAttribute('aria-expanded') === 'true';
    const openTrash = els.tools.trash.getAttribute('aria-expanded') === 'true';

    if (els.archive.section && !els.archive.section.hidden) {
      setExtraVisible('archive', openArchive);
    } else {
      const archivedCount = segmentLists().archived.length;
      els.archive.count.textContent = String(archivedCount);
      els.archive.count.hidden = archivedCount === 0;
    }

    if (els.trash.section && !els.trash.section.hidden) {
      setExtraVisible('trash', openTrash);
    } else {
      const trashedCount = segmentLists().trashed.length;
      els.trash.count.textContent = String(trashedCount);
      els.trash.count.hidden = trashedCount === 0;
    }

    pendingRender = false;
  }

  function renderHub() {
    readDom();

    const { active } = segmentLists();
    const latest = [...active].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;

    const statEl = el('hub-notes-stat');

    if (statEl) {
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

    if (!els.hubNotesWidgetTitle) {
      return;
    }

    if (latest) {
      els.hubNotesWidgetTitle.textContent = noteTitleText(latest);
      els.hubNotesWidgetPreview.textContent = plainPreview(latest) || 'Пустая заметка';
    } else {
      els.hubNotesWidgetTitle.textContent = 'Нет заметок';
      els.hubNotesWidgetPreview.textContent = 'Создайте первую';
    }

    const archivedCount = segmentLists().archived.length;
    const metaParts = [notesCountLabel(active.length)];

    if (archivedCount > 0) {
      metaParts.push(`в архиве ${archivedCount}`);
    }

    els.hubNotesWidgetMeta.textContent = metaParts.join(' · ');
  }

  /* ------------------------------------------------------------------ */
  /* Undo удаления                                                      */
  /* ------------------------------------------------------------------ */

  function hideNotesUndoToast() {
    if (!els.undoToast) {
      return;
    }

    els.undoToast.hidden = true;
    els.undoToast.classList.remove('is-visible');
  }

  function showNotesUndoToast(message) {
    els.undoText.textContent = message || 'Заметка удалена.';
    els.undoToast.hidden = false;
    els.undoToast.classList.remove('is-visible');
    void els.undoToast.offsetWidth;
    els.undoToast.classList.add('is-visible');
  }

  function scheduleNoteUndo(note) {
    discardNoteUndo();

    noteUndoEntry = {
      note,
      timerId: window.setTimeout(() => {
        noteUndoEntry = null;
        hideNotesUndoToast();
      }, UNDO_TIMEOUT_MS)
    };

    showNotesUndoToast('Заметка в корзине.');
  }

  function discardNoteUndo() {
    if (!noteUndoEntry) {
      hideNotesUndoToast();
      return;
    }

    window.clearTimeout(noteUndoEntry.timerId);
    noteUndoEntry = null;
    hideNotesUndoToast();
  }

  async function moveNoteToTrash(note) {
    const stamp = nowMs();
    const saved = { ...note, deletedAt: stamp, updatedAt: stamp };
    await putNote(saved);
    await reloadNotes();

    const current = notesCache.find((item) => item.id === saved.id);

    if (current) {
      scheduleNoteUndo(current);
    }

    render();
    renderHub();
  }

  /* ------------------------------------------------------------------ */
  /* Действия с карточками                                              */
  /* ------------------------------------------------------------------ */

  async function handleCardAction(card, action) {
    const id = Number(card.dataset.id);
    const note = notesCache.find((item) => item.id === id);

    if (!note) {
      return;
    }

    if (card.dataset.confirm === '1' && action === 'purge') {
      card.dataset.confirm = '0';
      await deleteNoteRecord(id);
      await reloadNotes();
      render();
      renderHub();
      showInfoToast('Заметка удалена навсегда');
      return;
    }

    if (action === 'purge') {
      card.dataset.confirm = '1';
      card.querySelector('[data-action="purge"]').textContent = 'Точно удалить?';
      window.setTimeout(() => {
        if (card.isConnected && card.dataset.confirm === '1') {
          card.dataset.confirm = '0';
          const button = card.querySelector('[data-action="purge"]');

          if (button) {
            button.textContent = 'Удалить навсегда';
          }
        }
      }, 2600);
      return;
    }

    if (action === 'restore') {
      await putNote({ ...note, deletedAt: null, updatedAt: nowMs() });
      await reloadNotes();
      discardNoteUndo();
      render();
      renderHub();
      return;
    }

    if (action === 'unarchive') {
      await toggleArchive(note);
      return;
    }
  }

  async function togglePin(note) {
    await putNote({ ...note, pinned: !note.pinned, updatedAt: nowMs() });
    await reloadNotes();
    render();
    renderHub();
  }

  async function toggleArchive(note) {
    await putNote({ ...note, archived: !note.archived, updatedAt: nowMs() });
    await reloadNotes();
    render();
    renderHub();
  }

  /* ------------------------------------------------------------------ */
  /* Свайпы карточек                                                    */
  /* ------------------------------------------------------------------ */

  const SWIPE_COMMIT_DISTANCE = 64;
  const SWIPE_MAX_DRAG = 96;

  function attachCardSwipe(card) {
    let active = null;
    let committed = false;

    card.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.note-card-button') || event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      active = {
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        dragging: false
      };
      committed = false;
    });

    card.addEventListener('pointermove', (event) => {
      if (!active || committed) {
        return;
      }

      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;

      if (!active.dragging) {
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) {
          if (Math.abs(dy) > Math.abs(dx) + 8) {
            active = null;
          }

          return;
        }

        active.dragging = true;
        card.classList.add('is-swiping');
        try {
          card.setPointerCapture(event.pointerId);
        } catch (error) {
          // Захват указателя не критичен.
        }
      }

      active.dx = Math.max(-SWIPE_MAX_DRAG * 1.4, Math.min(SWIPE_MAX_DRAG * 1.4, dx * 0.85));
      const inner = card.querySelector('.note-card-inner');
      inner.style.transform = `translateX(${active.dx}px)`;
      card.classList.toggle('is-hint-left', active.dx < -24);
      card.classList.toggle('is-hint-right', active.dx > 24);
    });

    const finish = async (event) => {
      if (!active) {
        return;
      }

      const gesture = active;
      active = null;
      const inner = card.querySelector('.note-card-inner');
      card.classList.remove('is-swiping', 'is-hint-left', 'is-hint-right');

      if (gesture.dragging && !committed) {
        committed = true;

        const id = Number(card.dataset.id);
        const note = notesCache.find((item) => item.id === id);

        card.classList.remove('is-pin-flash');

        if (inner.style.transform) {
          inner.style.transform = '';
        }

        if (gesture.dx <= -SWIPE_COMMIT_DISTANCE && note) {
          haptic();
          await moveNoteToTrash(note);
        } else if (gesture.dx >= SWIPE_COMMIT_DISTANCE && note) {
          haptic();
          card.classList.add('is-pin-flash');
          window.setTimeout(() => card.classList.remove('is-pin-flash'), 420);
          await togglePin(note);
        }
      }

      if (event.pointerId !== undefined) {
        try {
          card.releasePointerCapture(event.pointerId);
        } catch (error) {
          // Указатель уже отпущен.
        }
      }
    };

    card.addEventListener('pointerup', finish);
    card.addEventListener('pointercancel', finish);
  }

  function haptic() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch (error) {
        // Виброотклик не критичен.
      }
    }
  }

  function showInfoToast(message) {
    if (typeof window.showInfoToast === 'function') {
      window.showInfoToast(message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Редактор                                                           */
  /* ------------------------------------------------------------------ */

  function currentEditorNote() {
    if (editorIsNew) {
      return null;
    }

    return notesCache.find((item) => item.id === editorId) || null;
  }

  function openEditor(noteId) {
    readDom();
    reloadDomRefsForEditor();

    const note = noteId ? notesCache.find((item) => item.id === noteId) : null;

    editorIsNew = !note;
    editorId = note ? note.id : null;
    checklistDraftItems = note && Array.isArray(note.items)
      ? note.items.map((item) => ({ ...item }))
      : [];
    editorMode = note ? note.mode : 'text';
    editorPreview = false;

    els.titleInput.value = note ? note.title : '';
    els.textInput.value = note ? note.text : '';
    els.mdPreview.hidden = true;
    els.mdPreview.innerHTML = '';
    els.editorEye.setAttribute('aria-pressed', 'false');
    els.editorEye.hidden = editorMode !== 'text';

    syncEditorMode();
    syncPaletteSelection(note ? note.color : 'plain');
    syncPinButton(note ? note.pinned : false);
    syncArchiveButton(note ? note.archived : false);
    renderChecklist();

    els.editorTitle.textContent = note ? 'Редактирование' : 'Новая заметка';
    els.editor.hidden = false;
    document.body.classList.add('modal-open');
    editorOpen = true;
    editorReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (editorIsNew) {
      window.setTimeout(() => els.titleInput.focus(), 60);
    }
  }

  async function closeEditor() {
    if (!editorOpen) {
      return;
    }

    editorOpen = false;
    clearSaveTimer();

    const state = collectEditorState();
    const ctx = { id: editorId, isNew: editorIsNew };
    const opener = editorReturnFocus;
    editorReturnFocus = null;

    els.editor.hidden = true;
    document.body.classList.remove('modal-open');

    try {
      await applyEditorState(state, ctx);
    } catch (error) {
      showInfoToast('Не удалось сохранить заметку');
    }

    editorId = null;
    editorIsNew = false;
    discardEditorDraftData();

    if (opener && opener.isConnected) {
      opener.focus();
    }

    render();
    renderHub();
  }

  function discardEditorDraftData() {
    checklistDraftItems = [];
  }

  function syncPinButton(pinned) {
    els.pinButton.setAttribute('aria-pressed', pinned ? 'true' : 'false');
  }

  function syncArchiveButton(archived) {
    els.archiveButton.setAttribute('aria-pressed', archived ? 'true' : 'false');
  }

  function syncPaletteSelection(color) {
    els.palette.forEach((swatch) => {
      swatch.classList.toggle('is-active', swatch.dataset.color === color);
    });
  }

  function syncEditorMode() {
    els.modeText.classList.toggle('is-active', editorMode === 'text');
    els.modeText.setAttribute('aria-selected', editorMode === 'text' ? 'true' : 'false');
    els.modeChecklist.classList.toggle('is-active', editorMode === 'checklist');
    els.modeChecklist.setAttribute('aria-selected', editorMode === 'checklist' ? 'true' : 'false');

    const isText = editorMode === 'text';
    els.textInput.hidden = !isText || editorPreview;
    els.checklistEditor.hidden = isText;
    els.mdPreview.hidden = !editorPreview || !isText;
    els.editorEye.hidden = !isText;
  }

  function renderChecklist() {
    els.checkItems.replaceChildren();

    checklistDraftItems.forEach((item) => {
      const row = document.createElement('li');
      row.className = `note-check-row${item.done ? ' is-done' : ''}`;
      row.dataset.itemId = String(item.id);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.done === true;
      checkbox.setAttribute('aria-label', 'Выполнено');
      checkbox.dataset.action = 'toggle';

      const text = document.createElement('input');
      text.type = 'text';
      text.className = 'note-check-text';
      text.value = item.text;
      text.placeholder = 'Пункт…';
      text.dataset.action = 'text';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'note-check-del';
      del.dataset.action = 'delete';
      del.textContent = '×';
      del.setAttribute('aria-label', 'Удалить пункт');

      row.append(checkbox, text, del);
      els.checkItems.append(row);
    });
  }

  function collectEditorState() {
    const items = checklistDraftItems.filter((item) => item.text.trim() !== '');
    return {
      title: els.titleInput.value.trim(),
      text: els.textInput.value.replace(/\s+$/, ''),
      color: currentPaletteColor(),
      mode: editorMode,
      pinned: els.pinButton.getAttribute('aria-pressed') === 'true',
      archived: els.archiveButton.getAttribute('aria-pressed') === 'true',
      items: items.map((item) => ({ ...item }))
    };
  }

  function currentPaletteColor() {
    const active = [...els.palette].find((swatch) => swatch.classList.contains('is-active'));
    return active ? active.dataset.color : 'plain';
  }

  function editorHasContent(state) {
    return Boolean(
      state.title ||
      state.text ||
      (state.mode === 'checklist' && state.items.length > 0)
    );
  }

  async function persistEditorChanges() {
    const state = collectEditorState();
    await applyEditorState(state, { id: editorId, isNew: editorIsNew });
  }

  async function applyEditorState(state, ctx) {
    const stamp = nowMs();

    if (ctx.isNew) {
      if (!editorHasContent(state)) {
        return null;
      }

      const created = normalizeNote({
        ...state,
        deletedAt: null,
        createdAt: stamp,
        updatedAt: stamp
      });

      const newId = await putNote(created);
      await reloadNotes();

      editorId = Number.isFinite(newId) ? newId : created.id;
      editorIsNew = false;

      if (editorOpen) {
        els.editorTitle.textContent = 'Редактирование';

        const stored = notesCache.find((item) => item.id === editorId);

        if (stored) {
          syncPinButton(stored.pinned);
          syncArchiveButton(stored.archived);
          syncPaletteSelection(stored.color);
        }
      }

      return editorId;
    }

    const existing = notesCache.find((item) => item.id === ctx.id);

    if (!existing) {
      return null;
    }

    await putNote({
      ...existing,
      ...state,
      id: existing.id,
      updatedAt: stamp
    });
    await reloadNotes();

    return existing.id;
  }

  function clearSaveTimer() {
    if (editorSaveTimer !== null) {
      window.clearTimeout(editorSaveTimer);
      editorSaveTimer = null;
    }
  }

  function scheduleEditorSave() {
    clearSaveTimer();

    editorSaveTimer = window.setTimeout(async () => {
      editorSaveTimer = null;

      if (!editorOpen) {
        return;
      }

      try {
        const state = collectEditorState();
        await applyEditorState(state, { id: editorId, isNew: editorIsNew });
      } catch (error) {
        showInfoToast('Не удалось сохранить заметку');
      }
    }, AUTOSAVE_DELAY_MS);
  }

  function flushEditorSave() {
    if (editorSaveTimer !== null) {
      clearSaveTimer();

      if (editorOpen) {
        const state = collectEditorState();
        const ctx = { id: editorId, isNew: editorIsNew };
        return applyEditorState(state, ctx).catch(() => showInfoToast('Не удалось сохранить заметку'));
      }
    }

    return Promise.resolve();
  }

  function reloadDomRefsForEditor() {
    // Заглушка на будущее: элементы уже собраны в readDom().
  }

  /* ------------------------------------------------------------------ */
  /* Экспорт/импорт                                                     */
  /* ------------------------------------------------------------------ */

  function exportJson() {
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

    showInfoToast('Экспорт сохранён');
  }

  async function importJson(file) {
    if (!file) {
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      showInfoToast('Файл не читается');
      return;
    }

    const incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed && parsed.notes) ? parsed.notes : [];

    if (incoming.length === 0) {
      showInfoToast('В файле нет заметок');
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
    render();
    renderHub();

    showInfoToast(added > 0 ? `Добавлено ${added} ${pluralize(added, 'заметка', 'заметки', 'заметок')}` : 'Новых заметок нет');
  }

  /* ------------------------------------------------------------------ */
  /* Публичные действия                                                 */
  /* ------------------------------------------------------------------ */

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

    render();
    renderHub();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Инициализация и события                                            */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    els.addButton?.addEventListener('click', () => openEditor(null));

    els.tools.archive?.addEventListener('click', () => {
      const visible = els.tools.archive.getAttribute('aria-expanded') !== 'true';

      if (visible) {
        els.tools.trash.setAttribute('aria-expanded', 'false');
        els.trash.section.hidden = true;
      }

      setExtraVisible('archive', visible);
    });

    els.tools.trash?.addEventListener('click', () => {
      const visible = els.tools.trash.getAttribute('aria-expanded') !== 'true';

      if (visible) {
        els.tools.archive.setAttribute('aria-expanded', 'false');
        els.archive.section.hidden = true;
      }

      setExtraVisible('trash', visible);
    });

    els.list?.addEventListener('click', (event) => {
      const card = event.target.closest('.note-card');

      if (!card || card.dataset.context !== 'active') {
        return;
      }

      if (event.target.closest('.note-card-button')) {
        return;
      }

      openEditor(Number(card.dataset.id));
    });

    [els.archive.list, els.trash.list].forEach((container) => {
      container?.addEventListener('click', async (event) => {
        const button = event.target.closest('.note-card-button');

        if (!button) {
          return;
        }

        const card = button.closest('.note-card');

        if (!card) {
          return;
        }

        await handleCardAction(card, button.dataset.action);
      });
    });

    els.editorBack?.addEventListener('click', closeEditor);
    els.editor?.addEventListener('click', (event) => {
      if (event.target === els.editor) {
        closeEditor();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && editorOpen) {
        event.preventDefault();
        closeEditor();
      }
    });

    els.editorEye?.addEventListener('click', () => {
      editorPreview = !editorPreview;
      els.editorEye.setAttribute('aria-pressed', editorPreview ? 'true' : 'false');
      els.mdPreview.innerHTML = mdToHtml(els.textInput.value);
      syncEditorMode();
    });

    els.titleInput?.addEventListener('input', scheduleEditorSave);
    els.textInput?.addEventListener('input', () => {
      if (editorPreview) {
        els.mdPreview.innerHTML = mdToHtml(els.textInput.value);
      }

      scheduleEditorSave();
    });

    els.palette.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        syncPaletteSelection(swatch.dataset.color);
        scheduleEditorSave();
      });
    });

    els.pinButton?.addEventListener('click', () => {
      const pinned = els.pinButton.getAttribute('aria-pressed') !== 'true';
      syncPinButton(pinned);
      haptic();
      scheduleEditorSave();
    });

    els.archiveButton?.addEventListener('click', () => {
      const archived = els.archiveButton.getAttribute('aria-pressed') !== 'true';
      syncArchiveButton(archived);
      haptic();
      scheduleEditorSave();
    });

    els.deleteButton?.addEventListener('click', async () => {
      const note = currentEditorNote();

      if (editorIsNew || !note) {
        closeEditor();
        return;
      }

      await flushEditorSave();

      const fresh = notesCache.find((item) => item.id === note.id) || note;

      closeEditorSilently();
      await moveNoteToTrash(fresh);
    });

    els.modeText?.addEventListener('click', () => {
      if (editorMode === 'text') {
        return;
      }

      const currentState = collectEditorState();

      if (editorMode === 'checklist' && currentState.items.length > 0) {
        els.textInput.value = currentState.items
          .map((item) => `${item.done ? '✔ ' : ''}${item.text}`)
          .join('\n');
      }

      editorMode = 'text';
      syncEditorMode();
      scheduleEditorSave();
    });

    els.modeChecklist?.addEventListener('click', () => {
      if (editorMode === 'checklist') {
        return;
      }

      if (editorMode === 'text') {
        const lines = els.textInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        checklistDraftItems = lines.length > 0
          ? lines.map((line, index) => ({
            id: ++lastChecklistItemId,
            text: line.replace(/^[-*]\s+/, '').replace(/^✔\s*/, ''),
            done: /^✔/.test(line.trim())
          }))
          : [{ id: ++lastChecklistItemId, text: '', done: false }];

        renderChecklist();
      }

      editorMode = 'checklist';
      syncEditorMode();
      scheduleEditorSave();
    });

    els.checkItems?.addEventListener('change', (event) => {
      const row = event.target.closest('.note-check-row');

      if (!row || event.target.type !== 'checkbox') {
        return;
      }

      const item = checklistDraftItems.find((entry) => String(entry.id) === row.dataset.itemId);

      if (item) {
        item.done = event.target.checked;
        row.classList.toggle('is-done', item.done);
        scheduleEditorSave();
      }
    });

    els.checkItems?.addEventListener('input', (event) => {
      if (event.target.type !== 'text') {
        return;
      }

      const row = event.target.closest('.note-check-row');

      if (!row) {
        return;
      }

      const item = checklistDraftItems.find((entry) => String(entry.id) === row.dataset.itemId);

      if (item) {
        item.text = event.target.value;
        scheduleEditorSave();
      }
    });

    els.checkItems?.addEventListener('click', (event) => {
      const del = event.target.closest('.note-check-del');

      if (!del) {
        return;
      }

      const row = del.closest('.note-check-row');
      checklistDraftItems = checklistDraftItems.filter((entry) => String(entry.id) !== row.dataset.itemId);
      row.remove();

      if (checklistDraftItems.length === 0) {
        checklistDraftItems = [{ id: ++lastChecklistItemId, text: '', done: false }];
        renderChecklist();
        window.setTimeout(() => els.checkNew.focus(), 30);
      }

      scheduleEditorSave();
    });

    els.checkNew?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addChecklistItem();
      }
    });

    els.checkAddButton?.addEventListener('click', addChecklistItem);

    els.exportButton?.addEventListener('click', () => {
      if (!loaded) {
        showInfoToast('Приложение заметок ещё загружается');
        return;
      }

      exportJson();
    });

    els.importButton?.addEventListener('click', () => els.importFile?.click());
    els.importFile?.addEventListener('change', async () => {
      const file = els.importFile.files && els.importFile.files[0];

      try {
        await importJson(file);
      } catch (error) {
        showInfoToast('Не удалось импортировать');
      } finally {
        els.importFile.value = '';
      }
    });

    els.undoButton?.addEventListener('click', async () => {
      if (!noteUndoEntry) {
        discardNoteUndo();
        return;
      }

      const entry = noteUndoEntry;
      discardNoteUndo();

      try {
        await putNote({ ...entry.note, deletedAt: null });
        await reloadNotes();
        render();
        renderHub();
        showInfoToast('Восстановлено');
      } catch (error) {
        showInfoToast('Не удалось восстановить');
      }
    });
  }

  function closeEditorSilently() {
    clearSaveTimer();
    discardEditorDraftData();

    editorOpen = false;
    els.editor.hidden = true;
    document.body.classList.remove('modal-open');
    editorId = null;
    editorIsNew = false;
    editorReturnFocus = null;
  }

  function addChecklistItem() {
    const value = els.checkNew.value.trim();

    if (!value) {
      window.setTimeout(() => els.checkNew.focus(), 20);
      return;
    }

    checklistDraftItems.push({ id: ++lastChecklistItemId, text: value, done: false });

    els.checkNew.value = '';
    renderChecklist();

    const rows = els.checkItems.querySelectorAll('.note-check-text');
    const last = rows[rows.length - 1];

    if (last) {
      last.focus();
    }

    scheduleEditorSave();
  }

  async function init() {
    readDom();

    if (!els.root) {
      return;
    }

    if (!eventsBound) {
      eventsBound = true;
      bindEvents();
    }

    try {
      await purgeTrashIfNeeded();
      await reloadNotes();
    } catch (error) {
      console.warn('Заметки: не удалось загрузить данные:', error);
      loaded = false;
    }

    render();
    renderHub();
  }

  window.Notes = {
    init,
    render,
    renderHub,
    createQuickNote,
    exportJson,
    importJson,
    openEditor
  };
})();
