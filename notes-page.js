'use strict';

/* Экран приложения «Заметки»: список, свайпы, редактор-шторка и подтверждение удаления.
   Данные — window.Notes из notes.js. */

(function () {
  const ACTION_WIDTH = 110;
  const SWIPE_THRESHOLD = 10;
  const CLICK_GUARD_MS = 350;
  const COLOR_STYLE = {
    plain: 'var(--note-default)',
    yellow: 'var(--note-yellow)',
    green: 'var(--note-mint)',
    blue: 'var(--note-blue)',
    pink: 'var(--note-pink)',
    violet: 'var(--note-purple)'
  };

  const els = {};
  const state = {
    notes: [],
    query: '',
    openCardId: null,
    suppressClickUntil: 0,
    editorOpen: false,
    sheetMode: 'edit',
    editingId: null,
    color: 'plain',
    pinned: false,
    type: 'text',
    checklist: [],
    confirmOpen: false,
    deleteTarget: null
  };

  let drag = null;
  const lastContentTap = { time: 0, x: 0, y: 0 };

  /* ── Утилиты ───────────────────────────────────────────────────────── */

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function colorStyle(color) {
    return COLOR_STYLE[color] || COLOR_STYLE.plain;
  }

  function dateLabel(ms) {
    const date = new Date(ms);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    return `${date.getDate()} ${date.toLocaleString('ru-RU', { month: 'short' })}`;
  }

  function meta(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7l2 2v2H7v-2l2-2V3z"/><path d="M12 14v7"/></svg>`;
  }

  function pinSvg(withSlash) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 3h6v7l2 2v2H7v-2l2-2V3z"/><path d="M12 14v7"/>
        ${withSlash ? '<line x1="3" y1="3" x2="21" y2="21" stroke-width="2.5"/>' : ''}
      </svg>
    `;
  }

  function trashSvg() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
      </svg>
    `;
  }

  function matchesQuery(note, query) {
    if (!query) {
      return true;
    }

    const haystack = note.mode === 'checklist'
      ? [note.title, ...note.items.map((item) => item.text)]
      : [note.title, note.text];

    return haystack.join('\n').toLowerCase().includes(query);
  }

  /* ── Список ────────────────────────────────────────────────────────── */

  function cardHtml(note) {
    const pinned = note.pinned;

    let content = '';

    if (note.mode === 'checklist') {
      const items = note.items.slice(0, 3).map((item) => `
        <div class="checklist-preview-item${item.done ? ' done' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            ${item.done
              ? '<polyline points="20 6 9 17 4 12"/>'
              : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'}
          </svg>
          <span>${escapeHtml(item.text)}</span>
        </div>
      `).join('');

      const more = note.items.length > 3
        ? `<div class="checklist-more">+${note.items.length - 3} пунктов</div>`
        : '';

      content = `<div class="note-checklist-preview">${items}${more}</div>`;
    } else {
      content = `<div class="note-snippet">${escapeHtml(note.text || 'Пустая заметка')}</div>`;
    }

    return `
      <div class="swipe-wrapper" data-id="${note.id}">
        <div class="swipe-actions">
          <button class="swipe-btn pin" type="button" data-action="pin" aria-label="${pinned ? 'Открепить' : 'Закрепить'}">
            ${pinSvg(pinned)}
          </button>
          <button class="swipe-btn del" type="button" data-action="delete" aria-label="Удалить">
            ${trashSvg()}
          </button>
        </div>
        <div class="note-card" data-id="${note.id}" style="background:${colorStyle(note.color)}">
          <div class="note-header">
            <div class="note-title">${escapeHtml(note.title || 'Без названия')}</div>
          </div>
          ${pinned ? `<div class="note-pin-icon">${meta()}</div>` : ''}
          ${content}
          <div class="note-date">${dateLabel(note.updatedAt)}</div>
        </div>
      </div>
    `;
  }

  function renderList() {
    const list = els.notesList;
    const query = state.query.trim().toLowerCase();

    const notes = state.notes
      .filter((note) => matchesQuery(note, query))
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.updatedAt - a.updatedAt));

    if (notes.length === 0) {
      list.innerHTML = '';
      els.empty.hidden = false;

      if (query) {
        els.emptyTitle.textContent = 'Ничего не найдено';
        els.emptySub.innerHTML = 'Попробуйте изменить<br>поисковый запрос';
      } else {
        els.emptyTitle.textContent = 'Нет заметок';
        els.emptySub.innerHTML = 'Нажмите на плюс внизу, чтобы<br>создать первую заметку';
      }

      state.openCardId = null;
      return;
    }

    els.empty.hidden = true;
    list.innerHTML = notes.map(cardHtml).join('');
    state.openCardId = null;
  }

  async function refresh() {
    state.notes = window.Notes ? window.Notes.list() : [];
    renderList();
  }

  /* ── Свайпы ────────────────────────────────────────────────────────── */

  function closeOpenCard() {
    if (state.openCardId === null) {
      return;
    }

    const card = els.notesList.querySelector(`.note-card[data-id="${state.openCardId}"]`);

    if (card) {
      card.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
      card.style.transform = 'translateX(0)';
    }

    state.openCardId = null;
  }

  function openCard(id) {
    const card = els.notesList.querySelector(`.note-card[data-id="${id}"]`);

    if (!card) {
      return;
    }

    if (state.openCardId !== null && state.openCardId !== id) {
      closeOpenCard();
    }

    card.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
    card.style.transform = `translateX(-${ACTION_WIDTH}px)`;
    state.openCardId = id;
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const card = event.target.closest('.note-card');

    if (!card) {
      return;
    }

    const id = Number(card.dataset.id);

    if (state.openCardId !== null && state.openCardId !== id) {
      closeOpenCard();
    }

    drag = {
      id,
      card,
      startX: event.clientX,
      startY: event.clientY,
      baseX: state.openCardId === id ? -ACTION_WIDTH : 0,
      x: state.openCardId === id ? -ACTION_WIDTH : 0,
      horizontal: false
    };

    card.style.transition = 'none';
  }

  function onPointerMove(event) {
    if (!drag) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.horizontal) {
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        drag.horizontal = true;
      } else {
        return;
      }
    }

    if (event.cancelable) {
      event.preventDefault();
    }

    let nextX = drag.baseX + deltaX;

    if (nextX > 0) {
      nextX = 0;
    }

    if (nextX < -ACTION_WIDTH - 20) {
      nextX = -ACTION_WIDTH - 20;
    }

    drag.x = nextX;
    drag.card.style.transform = `translateX(${nextX}px)`;
  }

  function finishDrag() {
    if (!drag) {
      return;
    }

    const current = drag;
    drag = null;
    current.card.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';

    if (current.horizontal) {
      if (current.x < -ACTION_WIDTH / 2) {
        openCard(current.id);
      } else {
        current.card.style.transform = 'translateX(0)';
        state.openCardId = null;
      }

      state.suppressClickUntil = Date.now() + CLICK_GUARD_MS;
    } else {
      current.card.style.transform = `translateX(${state.openCardId === current.id ? -ACTION_WIDTH : 0}px)`;
    }
  }

  /* ── Действия со списком ───────────────────────────────────────────── */

  async function togglePin(id) {
    const note = state.notes.find((item) => item.id === id);

    if (!note) {
      return;
    }

    try {
      await window.Notes.save({ ...note, pinned: !note.pinned });
    } catch (error) {
      return;
    }

    closeOpenCard();
    await refresh();
  }

  function onListClick(event) {
    const actionButton = event.target.closest('.swipe-btn');

    if (actionButton) {
      const wrapper = actionButton.closest('.swipe-wrapper');
      const id = wrapper ? Number(wrapper.dataset.id) : null;

      if (actionButton.dataset.action === 'pin') {
        togglePin(id);
      } else if (actionButton.dataset.action === 'delete') {
        askDelete(id);
      }

      return;
    }

    const card = event.target.closest('.note-card');

    if (!card) {
      return;
    }

    if (Date.now() < state.suppressClickUntil) {
      return;
    }

    const id = Number(card.dataset.id);

    if (state.openCardId === id) {
      closeOpenCard();
      return;
    }

    openEditor(id);
  }

  /* ── Редактор ──────────────────────────────────────────────────────── */

  function syncPin() {
    els.pinBtn.style.color = state.pinned ? 'var(--coral)' : 'var(--ink-2)';
    els.pinBtn.setAttribute('aria-pressed', state.pinned ? 'true' : 'false');
    els.pinBtn.setAttribute('aria-label', state.pinned ? 'Открепить' : 'Закрепить');
    els.pinBtn.title = state.pinned ? 'Открепить' : 'Закрепить';
  }

  function syncColors() {
    els.colorPicker.querySelectorAll('.color-opt').forEach((option) => {
      option.classList.toggle('active', option.dataset.color === state.color);
    });
  }

  function focusFirstChecklistInput() {
    const input = els.editChecklist.querySelector('.checklist-row input[type="text"]');

    if (input) {
      input.focus();
    }
  }

  function renderChecklistEditor() {
    const view = state.sheetMode === 'view';

    const rows = state.checklist.map((item) => `
      <div class="checklist-row${item.done ? ' done' : ''}" data-id="${item.id}">
        <input type="checkbox" ${item.done ? 'checked' : ''} aria-label="Готово">
        <input
          type="text"
          value="${escapeHtml(item.text)}"
          placeholder="Пункт"
          maxlength="200"
          autocomplete="off"
          aria-label="Текст пункта"
          ${view ? 'readonly tabindex="-1"' : ''}
        >
        <button class="checklist-del" type="button" aria-label="Удалить пункт">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `).join('');

    els.editChecklist.innerHTML = rows + `
      <button class="add-checklist-item" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Добавить пункт
      </button>
    `;
  }

  function syncType(options) {
    const focus = options && options.focus;

    els.typeBtnText.classList.toggle('active', state.type === 'text');
    els.typeBtnChecklist.classList.toggle('active', state.type === 'checklist');

    if (state.type === 'text') {
      els.editBody.hidden = false;
      els.editChecklist.hidden = true;

      if (focus) {
        els.editBody.focus();
      }

      return;
    }

    els.editBody.hidden = true;
    els.editChecklist.hidden = false;
    renderChecklistEditor();

    if (focus) {
      window.setTimeout(focusFirstChecklistInput, 100);
    }
  }

  function applySheetMode(mode) {
    state.sheetMode = mode;

    const view = mode === 'view';

    els.editorSheet.classList.toggle('is-view', view);
    els.editorSheet.setAttribute('aria-label', view ? 'Просмотр заметки' : 'Редактор заметки');
    els.editorTitle.readOnly = view;
    els.editBody.readOnly = view;
    els.editorHint.hidden = !view;
    els.editorModeLabel.hidden = !view;
    els.pinBtn.hidden = view && !state.pinned;

    if (state.type === 'checklist') {
      renderChecklistEditor();
    }

    if (view) {
      document.activeElement?.blur?.();
    }
  }

  function enterEditMode(source) {
    if (state.sheetMode !== 'view' || state.editingId === null) {
      return;
    }

    applySheetMode('edit');

    const tappedBody = source instanceof Element && source.closest('.editor-body');
    const tappedChecklist = source instanceof Element && source.closest('.checklist-editor');

    window.setTimeout(() => {
      if (state.type === 'checklist') {
        if (tappedChecklist) {
          focusFirstChecklistInput();
        }

        return;
      }

      const field = tappedBody ? els.editBody : els.editorTitle;
      const end = field.value.length;

      field.focus();
      field.setSelectionRange(end, end);
    }, 30);
  }

  function openEditor(id) {
    const noteId = Number.isFinite(id) ? id : null;
    const note = noteId !== null ? state.notes.find((item) => item.id === noteId) : null;

    state.editingId = note ? note.id : null;
    state.color = note ? note.color : 'plain';
    state.pinned = Boolean(note && note.pinned);
    state.type = note ? note.mode : 'text';
    state.checklist = note ? note.items.map((item) => ({ ...item })) : [];
    state.sheetMode = note ? 'view' : 'edit';

    els.editorTitle.value = note ? note.title : '';
    els.editBody.value = note && note.mode === 'text' ? note.text : '';
    els.deleteBtn.hidden = !note;

    syncPin();
    syncColors();
    syncType({ focus: false });
    applySheetMode(state.sheetMode);

    els.backdrop.classList.add('open');
    els.editorSheet.classList.add('open');
    els.editorSheet.setAttribute('aria-hidden', 'false');
    els.editorSheet.style.zIndex = '';
    els.backdrop.style.zIndex = '';
    state.editorOpen = true;

    if (note) {
      return;
    }

    window.setTimeout(() => els.editorTitle.focus(), 300);
  }

  function closeEditor() {
    els.backdrop.classList.remove('open');
    els.editorSheet.classList.remove('open');
    els.editorSheet.setAttribute('aria-hidden', 'true');
    els.editorSheet.style.zIndex = '';
    els.backdrop.style.zIndex = '';
    state.editorOpen = false;
    state.editingId = null;

    document.activeElement?.blur?.();
  }

  function addChecklistItem() {
    state.checklist.push({
      id: window.Notes.nextChecklistItemId(),
      text: '',
      done: false
    });

    renderChecklistEditor();

    const inputs = els.editChecklist.querySelectorAll('.checklist-row input[type="text"]');
    inputs[inputs.length - 1]?.focus();
  }

  async function saveEditor() {
    const title = els.editorTitle.value.trim();
    const body = els.editBody.value.trim();
    const items = state.checklist
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text);

    const empty = state.type === 'text'
      ? !title && !body
      : !title && items.length === 0;

    if (empty) {
      closeEditor();
      return;
    }

    const existing = state.editingId !== null
      ? state.notes.find((item) => item.id === state.editingId)
      : null;
    const stamp = Date.now();
    const note = {
      id: existing ? existing.id : undefined,
      title,
      text: state.type === 'text' ? body : '',
      mode: state.type,
      items: state.type === 'checklist' ? items : [],
      color: state.color,
      pinned: state.pinned,
      archived: existing ? existing.archived : false,
      deletedAt: existing ? existing.deletedAt : null,
      createdAt: existing ? existing.createdAt : stamp,
      updatedAt: stamp
    };

    try {
      await window.Notes.save(note);
    } catch (error) {
      console.error('Не удалось сохранить заметку:', error);
      return;
    }

    closeEditor();
    await refresh();
  }

  async function persistChecklistState() {
    if (state.editingId === null) {
      return;
    }

    const existing = state.notes.find((item) => item.id === state.editingId);

    if (!existing) {
      return;
    }

    const note = {
      ...existing,
      items: state.checklist.map((item) => ({ ...item })),
      updatedAt: Date.now()
    };

    try {
      await window.Notes.save(note);
    } catch (error) {
      console.error('Не удалось сохранить отметки чек-листа:', error);
      return;
    }

    state.notes = window.Notes.list();
    renderList();
  }

  /* ── Удаление ──────────────────────────────────────────────────────── */

  function askDelete(id) {
    if (!Number.isFinite(id)) {
      return;
    }

    state.deleteTarget = id;

    if (state.editorOpen) {
      els.editorSheet.style.zIndex = '90';
      els.backdrop.style.zIndex = '89';
    }

    els.confirmBackdrop.classList.add('open');
    els.confirmModal.classList.add('open');
    els.confirmModal.setAttribute('aria-hidden', 'false');
    state.confirmOpen = true;
  }

  function closeConfirm() {
    els.confirmBackdrop.classList.remove('open');
    els.confirmModal.classList.remove('open');
    els.confirmModal.setAttribute('aria-hidden', 'true');
    state.confirmOpen = false;
    state.deleteTarget = null;

    if (state.editorOpen) {
      els.editorSheet.style.zIndex = '100';
      els.backdrop.style.zIndex = '99';
    }
  }

  async function confirmDelete() {
    const id = state.deleteTarget;

    if (!Number.isFinite(id)) {
      closeConfirm();
      return;
    }

    try {
      await window.Notes.remove(id);
    } catch (error) {
      console.error('Не удалось удалить заметку:', error);
      closeConfirm();
      return;
    }

    if (state.editingId === id) {
      closeEditor();
    }

    closeOpenCard();
    closeConfirm();
    await refresh();
  }

  /* ── Инициализация ─────────────────────────────────────────────────── */

  function cacheElements() {
    els.backBtn = byId('backBtn');
    els.searchInput = byId('searchInput');
    els.notesList = byId('notesList');
    els.empty = byId('emptyState');
    els.emptyTitle = byId('emptyTitle');
    els.emptySub = byId('emptySub');
    els.fab = byId('fab');
    els.backdrop = byId('backdrop');
    els.editorSheet = byId('editorSheet');
    els.editorTitle = byId('editTitle');
    els.editBody = byId('editBody');
    els.editChecklist = byId('editChecklist');
    els.editorHint = byId('editorHint');
    els.editorModeLabel = byId('editorModeLabel');
    els.pinBtn = byId('pinBtn');
    els.colorPicker = byId('colorPicker');
    els.deleteBtn = byId('deleteBtn');
    els.saveBtn = byId('saveBtn');
    els.typeBtnText = byId('typeBtnText');
    els.typeBtnChecklist = byId('typeBtnChecklist');
    els.confirmBackdrop = byId('confirmBackdrop');
    els.confirmModal = byId('confirmModal');
    els.confirmCancel = byId('confirmCancel');
    els.confirmDelete = byId('confirmDelete');
  }

  function bindEvents() {
    els.backBtn.addEventListener('click', () => {
      window.location.href = './index.html#hub';
    });

    els.searchInput.addEventListener('input', () => {
      state.query = els.searchInput.value;
      renderList();
    });

    els.fab.addEventListener('click', () => openEditor(null));
    els.backdrop.addEventListener('click', closeEditor);

    els.editorSheet.addEventListener('pointerup', (event) => {
      if (state.sheetMode !== 'view') {
        lastContentTap.time = 0;
        return;
      }

      if (!event.target.closest('.editor-title, .editor-body, .checklist-editor')) {
        return;
      }

      if (event.target.closest('.checklist-row input[type="checkbox"]')) {
        return;
      }

      const now = Date.now();
      const sameSpot = Math.abs(event.clientX - lastContentTap.x) < 32
        && Math.abs(event.clientY - lastContentTap.y) < 32;
      const isDoubleTap = now - lastContentTap.time < 350 && sameSpot;

      lastContentTap.time = isDoubleTap ? 0 : now;
      lastContentTap.x = event.clientX;
      lastContentTap.y = event.clientY;

      if (isDoubleTap) {
        enterEditMode(event.target);
      }
    });

    els.editorSheet.addEventListener('dblclick', (event) => {
      if (event.target.closest('.editor-title, .editor-body, .checklist-editor')) {
        enterEditMode(event.target);
      }
    });

    els.notesList.addEventListener('click', onListClick);
    els.notesList.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    document.addEventListener('click', (event) => {
      if (state.openCardId !== null && !event.target.closest('.swipe-wrapper')) {
        closeOpenCard();
      }
    });

    els.pinBtn.addEventListener('click', () => {
      state.pinned = !state.pinned;
      syncPin();
    });

    els.colorPicker.addEventListener('click', (event) => {
      const option = event.target.closest('.color-opt');

      if (!option) {
        return;
      }

      state.color = option.dataset.color;
      syncColors();
    });

    els.typeBtnText.addEventListener('click', () => {
      state.type = 'text';
      syncType({ focus: true });
    });

    els.typeBtnChecklist.addEventListener('click', () => {
      state.type = 'checklist';
      syncType({ focus: true });
    });

    els.editChecklist.addEventListener('click', (event) => {
      const addButton = event.target.closest('.add-checklist-item');

      if (addButton) {
        addChecklistItem();
        return;
      }

      const removeButton = event.target.closest('.checklist-del');

      if (!removeButton) {
        return;
      }

      const row = removeButton.closest('.checklist-row');
      const id = row ? Number(row.dataset.id) : null;
      state.checklist = state.checklist.filter((item) => item.id !== id);
      renderChecklistEditor();
    });

    els.editChecklist.addEventListener('change', (event) => {
      if (event.target.type !== 'checkbox') {
        return;
      }

      const row = event.target.closest('.checklist-row');
      const id = row ? Number(row.dataset.id) : null;
      const item = state.checklist.find((entry) => entry.id === id);

      if (!item) {
        return;
      }

      item.done = event.target.checked;
      row.classList.toggle('done', item.done);

      if (state.sheetMode === 'view') {
        persistChecklistState();
      }
    });

    els.editChecklist.addEventListener('input', (event) => {
      if (event.target.type !== 'text') {
        return;
      }

      const row = event.target.closest('.checklist-row');
      const id = row ? Number(row.dataset.id) : null;
      const item = state.checklist.find((entry) => entry.id === id);

      if (item) {
        item.text = event.target.value;
      }
    });

    els.deleteBtn.addEventListener('click', () => {
      if (state.editingId !== null) {
        askDelete(state.editingId);
      }
    });

    els.saveBtn.addEventListener('click', saveEditor);

    els.confirmCancel.addEventListener('click', closeConfirm);
    els.confirmBackdrop.addEventListener('click', closeConfirm);
    els.confirmDelete.addEventListener('click', confirmDelete);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (state.confirmOpen) {
        closeConfirm();
      } else if (state.editorOpen) {
        closeEditor();
      }
    });

    window.addEventListener('pagehide', () => {
      closeOpenCard();
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.error('Не удалось зарегистрировать service worker:', error);
    });
  }

  async function init() {
    cacheElements();
    bindEvents();

    try {
      await window.Notes.init();
    } catch (error) {
      console.warn('Не удалось загрузить заметки:', error);
    }

    await refresh();
    registerServiceWorker();
  }

  init();
})();
