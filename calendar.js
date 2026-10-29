'use strict';

/* Календарь событий хаба. Виджет рабочих дней открывает большой календарь,
   а нажатие на день — карточку событий. Данные хранятся в IndexedDB
   (settings → calendarEvents). */

(function () {
  const STORAGE_KEY = 'calendarEvents';
  const TITLE_MAX_LENGTH = 80;
  const SHEET_ANIMATION_MS = 350;
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTH_NAMES_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const DAYS_IN_GRID = 42;

  const state = {
    events: [],
    ready: false,
    bound: false,
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),
    selectedDate: null,
    yearly: false,
    saving: false,
    calendarHideTimer: null,
    dayHideTimer: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(value) {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  function isValidISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = parseISO(value);

    return !Number.isNaN(date.getTime()) && toISO(date) === value;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeEvents(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: item.id ? String(item.id) : makeId(),
        date: item.date,
        title: typeof item.title === 'string' ? item.title.trim().slice(0, TITLE_MAX_LENGTH) : '',
        isYearly: Boolean(item.isYearly)
      }))
      .filter((item) => isValidISO(item.date) && item.title.length > 0);
  }

  function matchesDate(event, date) {
    if (event.isYearly) {
      const source = parseISO(event.date);
      return source.getDate() === date.getDate() && source.getMonth() === date.getMonth();
    }

    return event.date === toISO(date);
  }

  function eventsForDate(date) {
    return state.events.filter((event) => matchesDate(event, date));
  }

  function persist() {
    if (typeof setSettings !== 'function') {
      return Promise.resolve(false);
    }

    return setSettings({ [STORAGE_KEY]: state.events })
      .then(() => true)
      .catch((error) => {
        console.error('Не удалось сохранить события календаря:', error);
        return false;
      });
  }

  function haptic(duration) {
    if (typeof hapticFeedback === 'function') {
      hapticFeedback(duration);
    }
  }

  function syncOverlayLock() {
    if (typeof syncHubOverlayLock === 'function') {
      syncHubOverlayLock();
    }
  }

  /* ────────────────────────────── Шторки ────────────────────────────── */

  function openSheet(backdrop, sheet, which) {
    if (!backdrop || !sheet) {
      return;
    }

    const timerKey = which === 'day' ? 'dayHideTimer' : 'calendarHideTimer';

    if (state[timerKey]) {
      window.clearTimeout(state[timerKey]);
      state[timerKey] = null;
    }

    backdrop.hidden = false;
    sheet.hidden = false;

    // Принудительный reflow, чтобы transition сработал после снятия hidden.
    void sheet.offsetHeight;

    window.requestAnimationFrame(() => {
      backdrop.classList.add('open');
      sheet.classList.add('open');
      syncOverlayLock();
    });
  }

  function closeSheet(backdrop, sheet, which) {
    if (!backdrop || !sheet || sheet.hidden) {
      return;
    }

    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    syncOverlayLock();

    const timerKey = which === 'day' ? 'dayHideTimer' : 'calendarHideTimer';

    if (state[timerKey]) {
      window.clearTimeout(state[timerKey]);
    }

    state[timerKey] = window.setTimeout(() => {
      backdrop.hidden = true;
      sheet.hidden = true;
      state[timerKey] = null;
    }, SHEET_ANIMATION_MS);
  }

  function openCalendar() {
    if (!state.ready) {
      return;
    }

    const backdrop = byId('hubCalendarBackdrop');
    const sheet = byId('hubCalendarSheet');

    if (!backdrop || !sheet) {
      return;
    }

    renderCalendar();
    openSheet(backdrop, sheet, 'calendar');
    haptic(6);
    byId('hubCalendarClose')?.focus({ preventScroll: true });
  }

  function closeCalendar() {
    closeSheet(byId('hubCalendarBackdrop'), byId('hubCalendarSheet'), 'calendar');
  }

  function openDay(date) {
    state.yearly = false;
    state.selectedDate = toISO(date);

    const title = byId('hubDayDate');
    const input = byId('hubDayInput');
    const yearlySwitch = byId('hubDayYearly');

    if (title) {
      title.textContent = `${date.getDate()} ${MONTH_NAMES_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
    }

    if (input) {
      input.value = '';
      input.classList.remove('is-invalid');
    }

    yearlySwitch?.setAttribute('aria-checked', 'false');
    removeError();

    renderCalendar();
    renderDayEvents();
    openSheet(byId('hubDayBackdrop'), byId('hubDaySheet'), 'day');
    haptic(6);
    byId('hubDayClose')?.focus({ preventScroll: true });
  }

  function closeDay() {
    closeSheet(byId('hubDayBackdrop'), byId('hubDaySheet'), 'day');
    state.selectedDate = null;

    if (state.ready) {
      renderCalendar();
    }
  }

  /* ─────────────────────────── Большой календарь ─────────────────────── */

  function renderCalendar() {
    const title = byId('hubCalendarMonth');
    const grid = byId('hubCalendarGrid');

    if (title) {
      title.textContent = `${MONTH_NAMES[state.viewMonth]} ${state.viewYear}`;
    }

    if (!grid) {
      return;
    }

    const firstDay = new Date(state.viewYear, state.viewMonth, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const start = new Date(state.viewYear, state.viewMonth, 1 - offset);
    const todayKey = toISO(new Date());
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < DAYS_IN_GRID; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = toISO(date);
      const dayEvents = eventsForDate(date);
      const button = document.createElement('button');
      let className = 'hub-calendar-day';

      if (date.getMonth() !== state.viewMonth) {
        className += ' is-outside';
      }

      if (iso === todayKey) {
        className += ' is-today';
      }

      if (dayEvents.length > 0) {
        className += ' has-event';
      }

      if (iso === state.selectedDate) {
        className += ' is-selected';
      }

      button.type = 'button';
      button.className = className;
      button.dataset.date = iso;
      button.textContent = String(date.getDate());
      button.setAttribute(
        'aria-label',
        `${date.getDate()} ${MONTH_NAMES_GENITIVE[date.getMonth()]} ${date.getFullYear()}${
          dayEvents.length > 0 ? `, событий: ${dayEvents.length}` : ''
        }`
      );

      if (iso === todayKey) {
        button.setAttribute('aria-current', 'date');
      }

      fragment.append(button);
    }

    grid.replaceChildren(fragment);
  }

  function shiftMonth(delta) {
    const date = new Date(state.viewYear, state.viewMonth + delta, 1);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth();
    renderCalendar();
  }

  function shiftYear(delta) {
    state.viewYear += delta;
    renderCalendar();
  }

  /* ───────────────────────── Карточка дня ───────────────────────────── */

  function removeError() {
    const error = byId('hubDayError');

    if (error) {
      error.textContent = '';
      error.hidden = true;
    }
  }

  function showError(message) {
    const error = byId('hubDayError');

    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }

  function createDeleteButton(eventId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hub-day-delete';
    button.dataset.eventId = eventId;
    button.setAttribute('aria-label', 'Удалить событие');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 7h16M9 7V5h6v2M6.5 7 7.5 20h9L17.5 7"/>
        <path d="M10 11v5M14 11v5"/>
      </svg>`;
    return button;
  }

  function renderDayEvents() {
    const list = byId('hubDayList');

    if (!list) {
      return;
    }

    if (!state.selectedDate) {
      list.replaceChildren();
      return;
    }

    const date = parseISO(state.selectedDate);
    const dayEvents = eventsForDate(date);
    const fragment = document.createDocumentFragment();

    if (dayEvents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hub-day-empty';
      empty.textContent = 'Нет событий на этот день';
      fragment.append(empty);
    } else {
      dayEvents.forEach((event) => {
        const row = document.createElement('div');
        row.className = 'hub-day-event';

        const info = document.createElement('div');
        info.className = 'hub-day-event-info';

        const name = document.createElement('div');
        name.className = 'hub-day-event-name';
        name.textContent = event.title;

        const type = document.createElement('div');
        type.className = `hub-day-event-type${event.isYearly ? ' is-yearly' : ''}`;
        type.textContent = event.isYearly ? 'Ежегодное' : 'Одноразовое';

        info.append(name, type);
        row.append(info, createDeleteButton(event.id));
        fragment.append(row);
      });
    }

    list.replaceChildren(fragment);
  }

  async function addEvent() {
    const input = byId('hubDayInput');

    if (!input || !state.selectedDate || state.saving) {
      return;
    }

    const title = input.value.trim();

    if (!title) {
      input.classList.add('is-invalid');
      input.focus({ preventScroll: true });
      window.setTimeout(() => input.classList.remove('is-invalid'), 600);
      return;
    }

    state.saving = true;

    const event = {
      id: makeId(),
      date: state.selectedDate,
      title: title.slice(0, TITLE_MAX_LENGTH),
      isYearly: state.yearly
    };

    state.events.push(event);
    input.value = '';
    removeError();
    renderDayEvents();
    renderCalendar();
    decorateMiniCalendar();
    haptic(10);

    const saved = await persist();
    state.saving = false;

    if (!saved) {
      state.events = state.events.filter((item) => item.id !== event.id);
      renderDayEvents();
      renderCalendar();
      decorateMiniCalendar();
      showError('Не удалось сохранить событие');
    }
  }

  async function deleteEvent(eventId) {
    const index = state.events.findIndex((item) => item.id === eventId);

    if (index === -1 || state.saving) {
      return;
    }

    state.saving = true;

    const removed = state.events.splice(index, 1)[0];
    renderDayEvents();
    renderCalendar();
    decorateMiniCalendar();
    haptic(8);

    const saved = await persist();
    state.saving = false;

    if (!saved) {
      state.events.splice(index, 0, removed);
      renderDayEvents();
      renderCalendar();
      decorateMiniCalendar();
      showError('Не удалось удалить событие');
    }
  }

  function toggleYearly() {
    const yearlySwitch = byId('hubDayYearly');

    state.yearly = !state.yearly;
    yearlySwitch?.setAttribute('aria-checked', String(state.yearly));
    haptic(4);
  }

  /* ────────────────────── Мини-календарь виджета ────────────────────── */

  function decorateMiniCalendar() {
    const grid = byId('hub-widget-calendar');

    if (!grid) {
      return;
    }

    const year = Number(grid.dataset.year);
    const month = Number(grid.dataset.month);

    if (!year || !month) {
      return;
    }

    grid.querySelectorAll('[data-day]').forEach((cell) => {
      const day = Number(cell.dataset.day);
      const date = new Date(year, month - 1, day);

      cell.classList.toggle('hub-cal-has-event', eventsForDate(date).length > 0);
    });
  }

  /* ─────────────────────────── События UI ───────────────────────────── */

  function bindEvents() {
    if (state.bound) {
      return;
    }

    state.bound = true;

    const widget = byId('hub-widget');
    const calendarBackdrop = byId('hubCalendarBackdrop');
    const dayBackdrop = byId('hubDayBackdrop');
    const grid = byId('hubCalendarGrid');
    const dayList = byId('hubDayList');
    const input = byId('hubDayInput');

    widget?.addEventListener('click', openCalendar);
    widget?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCalendar();
      }
    });

    byId('hubCalendarClose')?.addEventListener('click', closeCalendar);
    byId('hubCalPrevMonth')?.addEventListener('click', () => shiftMonth(-1));
    byId('hubCalNextMonth')?.addEventListener('click', () => shiftMonth(1));
    byId('hubCalPrevYear')?.addEventListener('click', () => shiftYear(-1));
    byId('hubCalNextYear')?.addEventListener('click', () => shiftYear(1));
    calendarBackdrop?.addEventListener('click', closeCalendar);

    grid?.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('[data-date]');

      if (!button?.dataset.date) {
        return;
      }

      const date = parseISO(button.dataset.date);
      state.viewYear = date.getFullYear();
      state.viewMonth = date.getMonth();
      openDay(date);
    });

    byId('hubDayClose')?.addEventListener('click', closeDay);
    dayBackdrop?.addEventListener('click', closeDay);
    byId('hubDayYearly')?.addEventListener('click', toggleYearly);
    byId('hubDayAdd')?.addEventListener('click', addEvent);

    dayList?.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('[data-event-id]');

      if (button?.dataset.eventId) {
        deleteEvent(button.dataset.eventId);
      }
    });

    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addEvent();
      }
    });

    input?.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      removeError();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      const daySheet = byId('hubDaySheet');
      const calendarSheet = byId('hubCalendarSheet');

      if (daySheet && !daySheet.hidden) {
        closeDay();
      } else if (calendarSheet && !calendarSheet.hidden) {
        closeCalendar();
      }
    });
  }

  function init(storedEvents) {
    state.events = normalizeEvents(storedEvents);
    state.ready = true;
    bindEvents();
    decorateMiniCalendar();
  }

  window.HubCalendar = {
    init,
    open: openCalendar,
    decorateMini: decorateMiniCalendar
  };
})();
