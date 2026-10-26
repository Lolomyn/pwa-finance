'use strict';

/* ------------------------------------------------------------------ */
/* Финансы · данные и интерфейс                                        */
/* ------------------------------------------------------------------ */

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 5;
const EXPENSES_STORE = 'expenses';
const SETTINGS_STORE = 'settings';
const CATEGORIES_STORE = 'categories';
const NOTES_STORE = 'notes';
const INITIAL_BALANCE_KEY = 'initialBalance';
const QUICK_TEMPLATES_KEY = 'quickTemplates';
const FINANCE_CATEGORIES_KEY = 'financeCategoriesInitialized';

const PALETTE = [
  { bg: '#D6F5DF', fg: '#1B8048' },
  { bg: '#FFE2CC', fg: '#C36B1F' },
  { bg: '#D6E6FF', fg: '#3E6CB5' },
  { bg: '#FFD9EA', fg: '#C13A77' },
  { bg: '#FFD6DD', fg: '#C2364D' },
  { bg: '#E6DEFF', fg: '#6845C7' },
  { bg: '#FFF2CC', fg: '#B38900' },
  { bg: '#E0F2FE', fg: '#0284C7' }
];

const ICON_VISUALS = {
  food: { emoji: '🛒', bg: '#D6F5DF', fg: '#1B8048' },
  cafe: { emoji: '☕', bg: '#FFE2CC', fg: '#C36B1F' },
  transport: { emoji: '🚗', bg: '#D6E6FF', fg: '#3E6CB5' },
  home: { emoji: '🏠', bg: '#E6DEFF', fg: '#6845C7' },
  utilities: { emoji: '💡', bg: '#FFF2CC', fg: '#B38900' },
  entertainment: { emoji: '🎉', bg: '#FFD9EA', fg: '#C13A77' },
  clothes: { emoji: '👕', bg: '#FFF2CC', fg: '#B38900' },
  health: { emoji: '💊', bg: '#FFD6DD', fg: '#C2364D' },
  sport: { emoji: '🏋️', bg: '#D6F5DF', fg: '#1B8048' },
  education: { emoji: '📚', bg: '#D6E6FF', fg: '#3E6CB5' },
  communication: { emoji: '📱', bg: '#E0F2FE', fg: '#0284C7' },
  subscriptions: { emoji: '🔁', bg: '#E6DEFF', fg: '#6845C7' },
  travel: { emoji: '✈️', bg: '#D6F5DF', fg: '#1B8048' },
  pets: { emoji: '🐾', bg: '#FFE2CC', fg: '#C36B1F' },
  beauty: { emoji: '💅', bg: '#FFD9EA', fg: '#C13A77' },
  gifts: { emoji: '🎁', bg: '#FFD6DD', fg: '#C2364D' },
  salary: { emoji: '💼', bg: '#D6F5DF', fg: '#1B8048' },
  freelance: { emoji: '💻', bg: '#D6E6FF', fg: '#3E6CB5' },
  investments: { emoji: '📈', bg: '#E6DEFF', fg: '#6845C7' },
  other: { emoji: '🏷️', bg: '#D6E6FF', fg: '#3E6CB5' }
};

const NAME_VISUALS = [
  [['продукты', 'еда', 'супермаркет'], 'food'],
  [['кафе', 'ресторан', 'кофе'], 'cafe'],
  [['транспорт', 'такси', 'машина', 'авто'], 'transport'],
  [['дом', 'жильё', 'жилье', 'аренда'], 'home'],
  [['платежи', 'жкх', 'коммуналка', 'связь'], 'utilities'],
  [['досуг', 'развлечения', 'кино'], 'entertainment'],
  [['одежда', 'обувь'], 'clothes'],
  [['здоровье', 'аптека', 'медицина'], 'health'],
  [['спорт', 'фитнес'], 'sport'],
  [['образование', 'учёба', 'учеба'], 'education'],
  [['подписки'], 'subscriptions'],
  [['поездки', 'путешествия', 'отпуск'], 'travel'],
  [['питомцы', 'животные'], 'pets'],
  [['красота', 'салон'], 'beauty'],
  [['подарки', 'подарок'], 'gifts'],
  [['зарплата'], 'salary'],
  [['аванс'], 'salary'],
  [['фриланс'], 'freelance'],
  [['инвестиции', 'проценты', 'дивиденды'], 'investments'],
  [['другое', 'прочее', 'разное'], 'other']
];

const PREVIEW_CATEGORIES = [
  { name: 'Дом', type: 'expense', emoji: '🏠', bg: '#E6DEFF', fg: '#6845C7', icon: 'home' },
  { name: 'Досуг', type: 'expense', emoji: '🎉', bg: '#FFD9EA', fg: '#C13A77', icon: 'entertainment' },
  { name: 'Кафе', type: 'expense', emoji: '☕', bg: '#FFE2CC', fg: '#C36B1F', icon: 'cafe' },
  { name: 'Машина', type: 'expense', emoji: '🚗', bg: '#D6E6FF', fg: '#3E6CB5', icon: 'transport' },
  { name: 'Одежда', type: 'expense', emoji: '👕', bg: '#FFF2CC', fg: '#B38900', icon: 'clothes' },
  { name: 'Платежи', type: 'expense', emoji: '💳', bg: '#E0F2FE', fg: '#0284C7', icon: 'utilities' },
  { name: 'Подарки', type: 'expense', emoji: '🎁', bg: '#FFD6DD', fg: '#C2364D', icon: 'gifts' },
  { name: 'Поездки', type: 'expense', emoji: '✈️', bg: '#D6F5DF', fg: '#1B8048', icon: 'travel' },
  { name: 'Продукты', type: 'expense', emoji: '🛒', bg: '#D6F5DF', fg: '#1B8048', icon: 'food' },
  { name: 'Аванс', type: 'income', emoji: '💵', bg: '#FFF2CC', fg: '#B38900', icon: 'salary' },
  { name: 'Зарплата', type: 'income', emoji: '💼', bg: '#D6F5DF', fg: '#1B8048', icon: 'salary' },
  { name: 'Подарок', type: 'income', emoji: '🎁', bg: '#FFE2CC', fg: '#C36B1F', icon: 'gifts' },
  { name: 'Другое', type: 'income', emoji: '🏷️', bg: '#D6E6FF', fg: '#3E6CB5', icon: 'other' }
];

const LEGACY_DEFAULT_CATEGORIES = {
  expense: ['Еда', 'Транспорт', 'Жильё', 'Развлечения', 'Другое'],
  income: ['Зарплата', 'Фриланс', 'Подарок', 'Инвестиции', 'Другое']
};

const EMOJIS = [
  '🛒', '🍎', '🍔', '🍕', '🍣', '☕', '🍽️', '🏠', '💡', '💧', '🛠️', '🧹', '🛋️',
  '🚗', '⛽', '🚕', '🚌', '✈️', '🧳', '🏨', '🗺️', '👕', '👗', '👟', '🧥', '👜',
  '💊', '🏥', '🩺', '💄', '💅', '✂️', '🎉', '🎮', '🎬', '🎵', '🎨', '🎭', '🏋️',
  '⚽', '💳', '🧾', '📄', '💵', '💸', '💰', '📈', '🪙', '💼', '💻', '📚', '🎓',
  '✏️', '🎁', '🐾', '🐶', '📱', '🧸', '🏷️'
];

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WEEKDAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_SHORT_TITLE = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const state = {
  db: null,
  categories: [],
  transactions: [],
  initialBalance: 0,
  view: 'home',
  historyDate: startOfMonth(new Date()),
  statsRange: 'week',
  customStart: addDays(startOfDay(new Date()), -6),
  customEnd: startOfDay(new Date()),
  calcType: 'expense',
  calcCatId: null,
  calcExpr: '',
  newCatType: 'expense',
  selectedEmoji: EMOJIS[0],
  editCatId: null,
  activeActionCatId: null,
  activeTxId: null,
  editTxType: 'expense',
  editTxCatId: null,
  pickYear: new Date().getFullYear(),
  pickMonth: new Date().getMonth(),
  tempStart: null,
  tempEnd: null
};

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function pad(value) {
  return String(value).padStart(2, '0');
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISODate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? startOfDay(new Date()) : date;
}

function todayISO() {
  return isoDate(new Date());
}

function fmt(amount) {
  const value = Number(amount);
  return Math.round(Number.isFinite(value) ? value : 0).toLocaleString('ru-RU');
}

function fmtDateShort(date) {
  if (!date) {
    return '—';
  }
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function fmtDayMonth(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pluralDays(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return 'день';
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'дня';
  }
  return 'дней';
}

function resolveVisual(record, name, type) {
  const iconKey = typeof record.icon === 'string' && ICON_VISUALS[record.icon]
    ? record.icon
    : nameToIconKey(name);
  const base = iconKey ? ICON_VISUALS[iconKey] : null;

  if (base) {
    return {
      emoji: record.emoji || base.emoji,
      bg: record.bg || base.bg,
      fg: record.fg || base.fg,
      icon: iconKey
    };
  }

  const normalized = String(name || '').toLowerCase().replace(/ё/g, 'е');
  let hash = 0;
  for (const character of normalized) {
    hash = (hash * 31 + character.codePointAt(0)) % PALETTE.length;
  }
  const fallback = PALETTE[Math.abs(hash)];

  return {
    emoji: record.emoji || '🏷️',
    bg: record.bg || fallback.bg,
    fg: record.fg || fallback.fg,
    icon: iconKey
  };
}

function nameToIconKey(name) {
  const normalized = String(name || '').trim().toLowerCase().replace(/ё/g, 'е');
  for (const [names, key] of NAME_VISUALS) {
    if (names.some((item) => normalized === item || normalized.includes(item))) {
      return key;
    }
  }
  return '';
}

function normalizeCategory(record) {
  const source = record && typeof record === 'object' ? record : {};
  const name = String(source.name || '').trim();
  const type = source.type === 'income' ? 'income' : 'expense';
  const visual = resolveVisual(source, name, type);

  return {
    id: source.id,
    name,
    type,
    emoji: visual.emoji,
    bg: visual.bg,
    fg: visual.fg,
    icon: visual.icon,
    isSystem: source.isSystem === true
  };
}

function normalizeTransaction(record) {
  const source = record && typeof record === 'object' ? record : {};
  const date = typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
    ? source.date
    : todayISO();

  return {
    ...source,
    id: source.id,
    type: source.type === 'income' ? 'income' : 'expense',
    amount: Number(source.amount) || 0,
    category: String(source.category || ''),
    date,
    note: typeof source.note === 'string' ? source.note : '',
    isAdjustment: source.isAdjustment === true
  };
}

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

function openDatabase() {
  if (state.db) {
    return Promise.resolve(state.db);
  }

  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB недоступен.'));
      return;
    }

    let request;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(EXPENSES_STORE)) {
        database.createObjectStore(EXPENSES_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains(CATEGORIES_STORE)) {
        database.createObjectStore(CATEGORIES_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(NOTES_STORE)) {
        database.createObjectStore(NOTES_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        if (state.db === database) {
          state.db = null;
        }
      };
      state.db = database;
      resolve(database);
    };

    request.onerror = () => reject(request.error || new Error('Не удалось открыть базу данных.'));
    request.onblocked = () => reject(new Error('База данных занята другой вкладкой.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Ошибка IndexedDB.'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Ошибка транзакции.'));
    transaction.onabort = () => reject(transaction.error || new Error('Транзакция отменена.'));
  });
}

function getAllRecords(storeName) {
  const transaction = state.db.transaction(storeName, 'readonly');
  return requestResult(transaction.objectStore(storeName).getAll());
}

function addCategoryRecord(record) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(CATEGORIES_STORE, 'readwrite');
    const store = transaction.objectStore(CATEGORIES_STORE);
    const payload = categoryPayload(record);
    const request = store.add(payload);
    request.onsuccess = () => resolve({ ...payload, id: request.result });
    request.onerror = () => reject(request.error || new Error('Не удалось добавить категорию.'));
  });
}

function updateCategoryRecord(id, patch) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([CATEGORIES_STORE, EXPENSES_STORE], 'readwrite');
    const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
    const expensesStore = transaction.objectStore(EXPENSES_STORE);
    const getRequest = categoriesStore.get(id);
    let updatedExpenses = 0;

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        transaction.abort();
        reject(new Error('Категория не найдена.'));
        return;
      }

      const oldName = String(record.name || '');
      const newName = String(patch.name || record.name);
      const updated = { ...record, ...patch, name: newName };

      categoriesStore.put(updated);

      if (newName !== oldName) {
        const cursorRequest = expensesStore.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            return;
          }
          const expense = cursor.value || {};
          const expenseType = expense.type === 'income' ? 'income' : 'expense';
          if (expenseType === record.type && expense.category === oldName) {
            cursor.update({ ...expense, category: newName });
            updatedExpenses += 1;
          }
          cursor.continue();
        };
      }
    };

    getRequest.onerror = () => reject(getRequest.error || new Error('Не удалось прочитать категорию.'));
    transaction.oncomplete = () => resolve({ updatedExpenses });
    transaction.onerror = () => reject(transaction.error || new Error('Не удалось обновить категорию.'));
    transaction.onabort = () => reject(transaction.error || new Error('Обновление отменено.'));
  });
}

function deleteCategoryRecord(id) {
  const transaction = state.db.transaction(CATEGORIES_STORE, 'readwrite');
  const store = transaction.objectStore(CATEGORIES_STORE);
  store.delete(id);
  return transactionDone(transaction);
}

function addTransactionRecord(data) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(EXPENSES_STORE, 'readwrite');
    const store = transaction.objectStore(EXPENSES_STORE);
    const payload = {
      amount: Number(data.amount),
      note: typeof data.note === 'string' ? data.note.trim() : '',
      category: data.category,
      date: data.date,
      createdAt: new Date().toISOString(),
      type: data.type === 'income' ? 'income' : 'expense'
    };
    const request = store.add(payload);
    request.onsuccess = () => resolve({ ...payload, id: request.result });
    request.onerror = () => reject(request.error || new Error('Не удалось сохранить операцию.'));
  });
}

function updateTransactionRecord(id, patch) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(EXPENSES_STORE, 'readwrite');
    const store = transaction.objectStore(EXPENSES_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error('Операция не найдена.'));
        return;
      }
      store.put({ ...record, ...patch });
    };

    getRequest.onerror = () => reject(getRequest.error || new Error('Не удалось прочитать операцию.'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Не удалось обновить операцию.'));
    transaction.onabort = () => reject(transaction.error || new Error('Обновление отменено.'));
  });
}

function deleteTransactionRecord(id) {
  const transaction = state.db.transaction(EXPENSES_STORE, 'readwrite');
  const store = transaction.objectStore(EXPENSES_STORE);
  store.delete(id);
  return transactionDone(transaction);
}

function getSetting(key) {
  const transaction = state.db.transaction(SETTINGS_STORE, 'readonly');
  const request = transaction.objectStore(SETTINGS_STORE).get(key);
  return requestResult(request).then((record) => record ? record.value : null);
}

function putSetting(key, value) {
  const transaction = state.db.transaction(SETTINGS_STORE, 'readwrite');
  transaction.objectStore(SETTINGS_STORE).put({ key, value });
  return transactionDone(transaction);
}

/* ------------------------------------------------------------------ */
/* Загрузка и сохранение                                               */
/* ------------------------------------------------------------------ */

function categoryPayload(record) {
  const payload = {
    name: record.name,
    type: record.type === 'income' ? 'income' : 'expense',
    isSystem: record.isSystem === true,
    emoji: record.emoji,
    bg: record.bg,
    fg: record.fg
  };

  if (record.icon) {
    payload.icon = record.icon;
  }

  return payload;
}

function writeCategorySeeds(seeds, { replace = false } = {}) {
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction(
      [CATEGORIES_STORE, SETTINGS_STORE],
      'readwrite'
    );
    const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
    const settingsStore = transaction.objectStore(SETTINGS_STORE);

    if (replace) {
      categoriesStore.clear();
    }

    seeds.forEach((seed) => {
      categoriesStore.add(categoryPayload(seed));
    });

    settingsStore.put({ key: FINANCE_CATEGORIES_KEY, value: true });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Не удалось создать категории.'));
    transaction.onabort = () => reject(transaction.error || new Error('Создание категорий отменено.'));
  });
}

function hasLegacyDefaultCategories(records) {
  const expected = new Set();

  Object.entries(LEGACY_DEFAULT_CATEGORIES).forEach(([type, names]) => {
    names.forEach((name) => expected.add(`${type}\u0000${name}`));
  });

  if (records.length === 0 || records.length > expected.size) {
    return false;
  }

  const actual = new Set(records.map((record) => {
    const type = record.type === 'income' ? 'income' : 'expense';
    return `${type}\u0000${String(record.name || '').trim()}`;
  }));

  return actual.size === records.length && [...actual].every((key) => expected.has(key));
}

async function ensureCategories() {
  const [records, transactions, initialized, quickTemplates] = await Promise.all([
    getAllRecords(CATEGORIES_STORE),
    getAllRecords(EXPENSES_STORE),
    getSetting(FINANCE_CATEGORIES_KEY),
    getSetting(QUICK_TEMPLATES_KEY)
  ]);

  if (initialized === true) {
    return;
  }

  if (records.length === 0) {
    const unique = new Map();

    transactions.forEach((record) => {
      const type = record.type === 'income' ? 'income' : 'expense';
      const name = String(record.category || '').trim();
      if (!name) {
        return;
      }
      const key = `${type}\u0000${name}`;
      if (!unique.has(key)) {
        unique.set(key, { name, type });
      }
    });

    const seeds = unique.size
      ? [...unique.values()].map((item) => {
          const visual = resolveVisual({}, item.name, item.type);
          return { ...item, ...visual };
        })
      : PREVIEW_CATEGORIES;

    await writeCategorySeeds(seeds);
    return;
  }

  const hasQuickTemplates = Array.isArray(quickTemplates) && quickTemplates.length > 0;

  if (
    transactions.length === 0 &&
    !hasQuickTemplates &&
    hasLegacyDefaultCategories(records)
  ) {
    await writeCategorySeeds(PREVIEW_CATEGORIES, { replace: true });
    return;
  }

  await putSetting(FINANCE_CATEGORIES_KEY, true);
}

async function loadState() {
  await openDatabase();
  await ensureCategories();

  const [categories, transactions, balance] = await Promise.all([
    getAllRecords(CATEGORIES_STORE),
    getAllRecords(EXPENSES_STORE),
    getSetting(INITIAL_BALANCE_KEY)
  ]);

  state.categories = categories.map(normalizeCategory);
  state.transactions = transactions.map(normalizeTransaction);
  state.initialBalance = Number.isFinite(Number(balance)) ? Number(balance) : 0;

  state.historyDate = startOfMonth(new Date());
  state.customStart = addDays(startOfDay(new Date()), -6);
  state.customEnd = startOfDay(new Date());
}

async function reloadCategories() {
  const records = await getAllRecords(CATEGORIES_STORE);
  state.categories = records.map(normalizeCategory);
}

async function reloadTransactions() {
  const records = await getAllRecords(EXPENSES_STORE);
  state.transactions = records.map(normalizeTransaction);
}

/* ------------------------------------------------------------------ */
/* Категории и операции                                                */
/* ------------------------------------------------------------------ */

function getCatById(id) {
  return state.categories.find((category) => String(category.id) === String(id)) || null;
}

function getCatByName(name, type) {
  return state.categories.find((category) => {
    return category.name === name && (!type || category.type === type);
  }) || null;
}

function getCatForTransaction(transaction) {
  const category = getCatByName(transaction.category, transaction.type);
  if (category) {
    return category;
  }

  return {
    id: '',
    name: 'Удалено',
    type: transaction.type,
    emoji: '❓',
    bg: '#EEEAE3',
    fg: '#6F6A63'
  };
}

function getCategoriesByType(type) {
  return state.categories.filter((category) => category.type === type);
}

function sortedTransactions(items = state.transactions) {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return Number(b.id) - Number(a.id);
  });
}

function calculateTotals(items) {
  let income = 0;
  let expense = 0;

  items.forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === 'income') {
      income += amount;
    } else {
      expense += amount;
    }
  });

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100
  };
}

function calculateBalance(items = state.transactions) {
  const totals = calculateTotals(items);
  return Math.round((state.initialBalance + totals.income - totals.expense) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Рендер операций                                                     */
/* ------------------------------------------------------------------ */

function renderTxList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.date)) {
      groups.set(item.date, []);
    }
    groups.get(item.date).push(item);
  });

  const dates = [...groups.keys()].sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    container.innerHTML = '<div class="tx-empty">Нет операций</div>';
    return;
  }

  container.innerHTML = dates.map((date) => {
    const parsed = parseISODate(date);
    const groupItems = groups.get(date).sort((a, b) => Number(b.id) - Number(a.id));

    const rows = groupItems.map((item) => {
      const category = getCatForTransaction(item);
      const isIncome = item.type === 'income';
      return `
        <div class="tx-item" data-tx-id="${escapeHtml(item.id)}">
          <div class="tx-icon" style="background:${escapeHtml(category.bg)}; color:${escapeHtml(category.fg)}">${escapeHtml(category.emoji)}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(category.name)}</div>
            <div class="tx-cat">${isIncome ? 'Доход' : 'Расход'}${item.note ? ` · ${escapeHtml(item.note)}` : ''}</div>
          </div>
          <div class="tx-amt ${isIncome ? 'income' : ''}">
            ${isIncome ? '+' : '−'}${fmt(item.amount)} ₽
          </div>
        </div>`;
    }).join('');

    return `
      <div class="tx-day-group">
        <div class="tx-day">${fmtDayMonth(parsed)}</div>
        ${rows}
      </div>`;
  }).join('');
}

function renderHome() {
  const totals = calculateTotals(state.transactions);
  const balance = calculateBalance();
  const now = new Date();

  document.getElementById('homeMonthLabel').textContent =
    `${MONTH_NAMES[now.getMonth()].toLowerCase()} ${now.getFullYear()}`;
  document.getElementById('balanceVal').innerHTML = `${fmt(balance)}<span class="cur">₽</span>`;
  document.getElementById('incomeVal').textContent = `+${fmt(totals.income)} ₽`;
  document.getElementById('expenseVal').textContent = `−${fmt(totals.expense)} ₽`;

  const recent = sortedTransactions().slice(0, 5);
  renderTxList('homeTxList', recent);
}

function renderHistory() {
  const year = state.historyDate.getFullYear();
  const month = state.historyDate.getMonth();
  const prefix = `${year}-${pad(month + 1)}`;

  document.getElementById('historyMonthLabel').textContent = `${MONTH_NAMES[month]} ${year}`;

  const items = state.transactions.filter((item) => item.date.startsWith(prefix));
  renderTxList('historyTxList', items);
}

function changeMonth(delta) {
  state.historyDate = new Date(
    state.historyDate.getFullYear(),
    state.historyDate.getMonth() + delta,
    1
  );
  renderHistory();
}

/* ------------------------------------------------------------------ */
/* Навигация                                                           */
/* ------------------------------------------------------------------ */

function switchView(view) {
  const allowed = ['home', 'history', 'stats', 'categories'];
  const target = allowed.includes(view) ? view : 'home';
  state.view = target;

  document.querySelectorAll('.content-area').forEach((element) => {
    element.style.display = 'none';
  });

  const activeView = document.getElementById(`view-${target}`);
  if (activeView) {
    activeView.style.display = 'block';
    activeView.scrollTop = 0;
  }

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.id === `nav-${target}`);
  });

  const fab = document.getElementById('fab');
  if (fab) {
    fab.classList.toggle('hide', target === 'categories' || target === 'stats');
  }

  if (target === 'home') {
    renderHome();
  } else if (target === 'history') {
    renderHistory();
  } else if (target === 'stats') {
    renderStats();
  } else if (target === 'categories') {
    renderCategories();
  }
}

function goHub() {
  window.location.href = './index.html';
}

/* ------------------------------------------------------------------ */
/* Статистика                                                          */
/* ------------------------------------------------------------------ */

function getStatsRange() {
  const now = startOfDay(new Date());

  if (state.statsRange === 'week') {
    return {
      kind: 'week',
      start: addDays(now, -6),
      end: now,
      title: 'Динамика за неделю'
    };
  }

  if (state.statsRange === 'month') {
    return {
      kind: 'month',
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      title: 'Динамика за месяц'
    };
  }

  if (state.statsRange === 'year') {
    return {
      kind: 'year',
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      title: 'Динамика за год'
    };
  }

  return {
    kind: 'custom',
    start: state.customStart,
    end: state.customEnd,
    title: 'Динамика за период'
  };
}

function setStatsRange(range, button) {
  state.statsRange = range;

  document.querySelectorAll('.stats-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.range === range);
  });

  if (range === 'custom') {
    openDatePicker();
  }

  renderStats();
}

function renderStats() {
  const range = getStatsRange();
  const startIso = isoDate(range.start);
  const endIso = isoDate(range.end);

  const filtered = state.transactions.filter((item) => {
    return item.date >= startIso && item.date <= endIso;
  });

  const totals = calculateTotals(filtered);
  const diffDays = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);

  document.getElementById('statExpense').textContent = `${fmt(totals.expense)} ₽`;
  document.getElementById('statIncome').textContent = `${fmt(totals.income)} ₽`;
  document.getElementById('statAvg').textContent = `${fmt(totals.expense / diffDays)} ₽`;

  let maxTransaction = null;
  filtered.forEach((item) => {
    if (item.type !== 'expense') {
      return;
    }
    if (!maxTransaction || item.amount > maxTransaction.amount) {
      maxTransaction = item;
    }
  });

  document.getElementById('statMax').textContent = `${fmt(maxTransaction ? maxTransaction.amount : 0)} ₽`;
  document.getElementById('statMaxCat').textContent = maxTransaction
    ? getCatForTransaction(maxTransaction).name
    : '—';

  const labelElement = document.getElementById('statsPeriodLbl');
  labelElement.onclick = null;
  labelElement.className = 'stats-period-lbl';

  if (range.kind === 'week') {
    labelElement.textContent = `${fmtDateShort(range.start)} — ${fmtDateShort(range.end)}`;
  } else if (range.kind === 'month') {
    labelElement.textContent = `${MONTH_NAMES[range.start.getMonth()]} ${range.start.getFullYear()}`;
  } else if (range.kind === 'year') {
    labelElement.textContent = `${range.start.getFullYear()} год`;
  } else {
    labelElement.innerHTML = `${fmtDateShort(range.start)} — ${fmtDateShort(range.end)} <span style="font-size:11px; margin-left:4px;">(изменить)</span>`;
    labelElement.className = 'stats-period-lbl clickable';
    labelElement.onclick = openDatePicker;
  }

  document.getElementById('barChartTitle').textContent = range.title;
  renderBarChart(range, filtered);
  renderPieChart(filtered, totals.expense, range);
}

function renderBarChart(range, filtered) {
  const barChart = document.getElementById('barChart');
  const now = startOfDay(new Date());
  const bars = [];

  if (range.kind === 'week') {
    for (let index = 6; index >= 0; index -= 1) {
      const date = addDays(now, -index);
      const dateKey = isoDate(date);
      const amount = filtered
        .filter((item) => item.type === 'expense' && item.date === dateKey)
        .reduce((sum, item) => sum + item.amount, 0);
      bars.push({ label: WEEKDAY_NAMES[date.getDay()], amount });
    }
  } else if (range.kind === 'month') {
    const year = range.start.getFullYear();
    const month = range.start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let index = 0; index < 4; index += 1) {
      const firstDay = 1 + index * 7;
      const lastDay = index === 3 ? daysInMonth : 7 + index * 7;
      const amount = filtered
        .filter((item) => {
          if (item.type !== 'expense') {
            return false;
          }
          const date = parseISODate(item.date);
          return date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() >= firstDay &&
            date.getDate() <= lastDay;
        })
        .reduce((sum, item) => sum + item.amount, 0);
      bars.push({ label: `${index + 1} нед`, amount });
    }
  } else if (range.kind === 'year') {
    const year = range.start.getFullYear();
    for (let month = 0; month < 12; month += 1) {
      const monthKey = `${year}-${pad(month + 1)}`;
      const amount = filtered
        .filter((item) => item.type === 'expense' && item.date.startsWith(monthKey))
        .reduce((sum, item) => sum + item.amount, 0);
      bars.push({ label: MONTHS_SHORT_TITLE[month], amount });
    }
  } else {
    const diffDays = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);

    if (diffDays <= 14) {
      for (let index = 0; index < diffDays; index += 1) {
        const date = addDays(range.start, index);
        const dateKey = isoDate(date);
        const amount = filtered
          .filter((item) => item.type === 'expense' && item.date === dateKey)
          .reduce((sum, item) => sum + item.amount, 0);
        bars.push({ label: `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`, amount });
      }
    } else {
      let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      while (cursor <= range.end) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const amount = filtered
          .filter((item) => {
            if (item.type !== 'expense') {
              return false;
            }
            const date = parseISODate(item.date);
            return date.getFullYear() === year && date.getMonth() === month;
          })
          .reduce((sum, item) => sum + item.amount, 0);
        bars.push({ label: MONTHS_SHORT_TITLE[month], amount });
        cursor = new Date(year, month + 1, 1);
      }
    }
  }

  const max = Math.max(...bars.map((bar) => bar.amount), 1);
  barChart.innerHTML = bars.map((bar) => {
    const percent = (bar.amount / max) * 100;
    return `
      <div class="bar-col">
        <div class="bar ${bar.amount > 0 ? 'active' : ''}" style="height: ${Math.max(4, percent)}%"></div>
        <div class="bar-lbl">${escapeHtml(bar.label)}</div>
      </div>`;
  }).join('');
}

function renderPieChart(filtered, expenseTotal, range) {
  const pieChart = document.getElementById('pieChart');
  const pieLegend = document.getElementById('pieLegend');
  document.getElementById('pieTotal').textContent = `${fmt(expenseTotal)} ₽`;

  if (expenseTotal <= 0) {
    pieChart.style.background = '#F5F1EA';
    pieLegend.innerHTML = '<div style="text-align:center;font-size:13px;color:#8E8A82;">Нет данных</div>';
    return;
  }

  const categoryTotals = new Map();
  filtered.forEach((item) => {
    if (item.type !== 'expense') {
      return;
    }
    const key = item.category || 'Удалено';
    categoryTotals.set(key, (categoryTotals.get(key) || 0) + item.amount);
  });

  const sorted = [...categoryTotals.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      category: getCatByName(name, 'expense') || getCatForTransaction({ category: name, type: 'expense' })
    }))
    .sort((a, b) => b.amount - a.amount);

  const colors = ['#FF6B4A', '#10B981', '#3E6CB5', '#C13A77', '#B38900', '#6845C7', '#0284C7'];
  const gradient = [];
  let currentPercent = 0;
  let legendHtml = '';

  sorted.slice(0, 7).forEach((item, index) => {
    const percent = (item.amount / expenseTotal) * 100;
    const color = colors[index % colors.length];

    gradient.push(`${color} ${currentPercent}% ${currentPercent + percent}%`);
    currentPercent += percent;

    legendHtml += `
      <div class="legend-item" data-cat-key="${escapeHtml(item.name)}">
        <div class="legend-left">
          <div class="legend-dot" style="background:${color}"></div>
          <div class="legend-name">${escapeHtml(item.category.name || item.name)}</div>
        </div>
        <div class="legend-pct">${Math.round(percent)}%</div>
      </div>`;
  });

  if (sorted.length > 7) {
    const restPercent = Math.max(0, 100 - currentPercent);
    gradient.push(`#D1D5DB ${currentPercent}% 100%`);
    legendHtml += `
      <div class="legend-item" style="cursor:default">
        <div class="legend-left">
          <div class="legend-dot" style="background:#D1D5DB"></div>
          <div class="legend-name">Другие</div>
        </div>
        <div class="legend-pct">${Math.round(restPercent)}%</div>
      </div>`;
  }

  pieChart.style.background = `conic-gradient(${gradient.join(', ')})`;
  pieLegend.innerHTML = legendHtml;
}

function openCategoryStats(categoryName) {
  const range = getStatsRange();
  const startIso = isoDate(range.start);
  const endIso = isoDate(range.end);
  const category = getCatByName(categoryName, 'expense') || {
    name: 'Удалено',
    emoji: '❓',
    bg: '#EEEAE3',
    fg: '#6F6A63'
  };

  const items = state.transactions
    .filter((item) => {
      return item.type === 'expense' &&
        item.category === categoryName &&
        item.date >= startIso &&
        item.date <= endIso;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));

  const sum = items.reduce((total, item) => total + item.amount, 0);

  document.getElementById('catStatsTitle').textContent = category.name;
  document.getElementById('catStatsSum').textContent = `${fmt(sum)} ₽`;

  const list = document.getElementById('catStatsList');

  if (items.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:14px">Нет операций</div>';
  } else {
    list.innerHTML = items.map((item) => {
      const date = parseISODate(item.date);
      return `
        <div class="tx-item" data-tx-id="${escapeHtml(item.id)}" style="box-shadow:none; border-bottom:1px solid var(--line); border-radius:0; padding:12px 0; margin-bottom:0;">
          <div class="tx-icon" style="background:${escapeHtml(category.bg)}; color:${escapeHtml(category.fg)}">${escapeHtml(category.emoji)}</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(category.name)}</div>
            <div class="tx-cat">${fmtDayMonth(date)}</div>
          </div>
          <div class="tx-amt">−${fmt(item.amount)} ₽</div>
        </div>`;
    }).join('');
  }

  openModal('catStatsModal');
}

/* ------------------------------------------------------------------ */
/* Календарь                                                           */
/* ------------------------------------------------------------------ */

function openDatePicker() {
  state.pickYear = state.customStart.getFullYear();
  state.pickMonth = state.customStart.getMonth();
  state.tempStart = new Date(state.customStart);
  state.tempEnd = new Date(state.customEnd);
  renderDatePicker();
  openModal('datePickerModal');
}

function changePickMonth(delta) {
  state.pickMonth += delta;
  if (state.pickMonth < 0) {
    state.pickMonth = 11;
    state.pickYear -= 1;
  }
  if (state.pickMonth > 11) {
    state.pickMonth = 0;
    state.pickYear += 1;
  }
  renderDatePicker();
}

function renderDatePicker() {
  document.getElementById('pickMonthLbl').textContent = `${MONTH_NAMES[state.pickMonth]} ${state.pickYear}`;
  document.getElementById('pickStartLbl').textContent = fmtDateShort(state.tempStart);
  document.getElementById('pickEndLbl').textContent = fmtDateShort(state.tempEnd);

  const grid = document.getElementById('calDaysGrid');
  const firstDay = new Date(state.pickYear, state.pickMonth, 1);
  const jsDay = firstDay.getDay();
  const offset = jsDay === 0 ? 6 : jsDay - 1;
  const daysInMonth = new Date(state.pickYear, state.pickMonth + 1, 0).getDate();
  const todayKey = todayISO();

  grid.innerHTML = '';

  for (let index = 0; index < offset; index += 1) {
    grid.insertAdjacentHTML('beforeend', '<div class="cal-day empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(state.pickYear, state.pickMonth, day);
    const classes = ['cal-day'];

    if (isoDate(date) === todayKey) {
      classes.push('today');
    }

    if (state.tempStart && state.tempEnd) {
      if (date > state.tempStart && date < state.tempEnd) {
        classes.push('in-range');
      }
      if (date.getTime() === state.tempStart.getTime()) {
        classes.push('range-start');
      }
      if (date.getTime() === state.tempEnd.getTime()) {
        classes.push('range-end');
      }
    } else if (state.tempStart && date.getTime() === state.tempStart.getTime()) {
      classes.push('range-start', 'range-end');
    }

    grid.insertAdjacentHTML(
      'beforeend',
      `<div class="${classes.join(' ')}" data-cal-day="${day}">${day}</div>`
    );
  }
}

function selectCalDay(day) {
  const clickedDate = new Date(state.pickYear, state.pickMonth, day);

  if (state.tempStart && state.tempEnd) {
    state.tempStart = clickedDate;
    state.tempEnd = null;
  } else if (state.tempStart && !state.tempEnd) {
    if (clickedDate < state.tempStart) {
      state.tempEnd = state.tempStart;
      state.tempStart = clickedDate;
    } else {
      state.tempEnd = clickedDate;
    }
  } else {
    state.tempStart = clickedDate;
    state.tempEnd = null;
  }

  renderDatePicker();
}

function applyCustomRange() {
  if (!state.tempStart) {
    return;
  }

  state.customStart = startOfDay(state.tempStart);
  state.customEnd = startOfDay(state.tempEnd || state.tempStart);
  state.statsRange = 'custom';

  document.querySelectorAll('.stats-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.range === 'custom');
  });

  closeAllModals();
  renderStats();
}

/* ------------------------------------------------------------------ */
/* Категории                                                           */
/* ------------------------------------------------------------------ */

function renderCategories() {
  const expenseGrid = document.getElementById('catGridExpense');
  const incomeGrid = document.getElementById('catGridIncome');

  const renderGrid = (type) => {
    const items = getCategoriesByType(type);
    if (items.length === 0) {
      return '<div class="cat-grid-empty">Нет категорий</div>';
    }

    return items.map((category) => `
      <div class="cat-grid-item" data-cat-id="${escapeHtml(category.id)}">
        <div class="cat-grid-icon" style="background:${escapeHtml(category.bg)}; color:${escapeHtml(category.fg)}">${escapeHtml(category.emoji)}</div>
        <div class="cat-grid-name">${escapeHtml(category.name)}</div>
      </div>`).join('');
  };

  expenseGrid.innerHTML = renderGrid('expense');
  incomeGrid.innerHTML = renderGrid('income');
}

function openCatModal(type) {
  state.editCatId = null;
  state.newCatType = type === 'income' ? 'income' : 'expense';
  state.selectedEmoji = EMOJIS[0];

  document.getElementById('catModalTitle').textContent = 'Новая категория';
  const input = document.getElementById('newCatName');
  input.value = '';
  input.style.borderColor = '';
  renderEmojiGrid();
  openModal('catModal');
  setTimeout(() => input.focus(), 120);
}

function editCategory(id) {
  const category = getCatById(id);
  if (!category) {
    return;
  }

  state.editCatId = category.id;
  state.newCatType = category.type;
  state.selectedEmoji = category.emoji;

  document.getElementById('catModalTitle').textContent = 'Редактировать категорию';
  const input = document.getElementById('newCatName');
  input.value = category.name;
  input.style.borderColor = '';
  renderEmojiGrid();
  openModal('catModal');
  setTimeout(() => input.focus(), 120);
}

function renderEmojiGrid() {
  document.getElementById('emojiGrid').innerHTML = EMOJIS.map((emoji) => `
    <button class="emoji-btn ${emoji === state.selectedEmoji ? 'active' : ''}" type="button" data-emoji="${escapeHtml(emoji)}">${emoji}</button>
  `).join('');
}

function selectEmoji(emoji, button) {
  state.selectedEmoji = emoji;
  document.querySelectorAll('#emojiGrid .emoji-btn').forEach((item) => {
    item.classList.toggle('active', item === button);
  });
}

async function saveNewCategory() {
  const input = document.getElementById('newCatName');
  const name = input.value.trim();

  if (!name) {
    input.style.borderColor = '#FF6B4A';
    setTimeout(() => { input.style.borderColor = ''; }, 500);
    input.focus();
    return;
  }

  const duplicate = state.categories.some((category) => {
    return category.type === state.newCatType &&
      String(category.id) !== String(state.editCatId) &&
      category.name.toLowerCase() === name.toLowerCase();
  });

  if (duplicate) {
    input.style.borderColor = '#FF6B4A';
    setTimeout(() => { input.style.borderColor = ''; }, 900);
    input.focus();
    return;
  }

  try {
    if (state.editCatId !== null) {
      const category = getCatById(state.editCatId);
      if (!category) {
        return;
      }
      await updateCategoryRecord(category.id, {
        name,
        emoji: state.selectedEmoji,
        bg: category.bg,
        fg: category.fg
      });
    } else {
      const color = PALETTE[state.categories.length % PALETTE.length];
      await addCategoryRecord({
        name,
        type: state.newCatType,
        emoji: state.selectedEmoji,
        bg: color.bg,
        fg: color.fg,
        icon: 'other'
      });
    }

    await reloadCategories();
    await reloadTransactions();
    closeAllModals();
    renderCategories();
    renderCurrentView();
  } catch (error) {
    console.error(error);
    input.style.borderColor = '#FF6B4A';
  }
}

async function deleteCategory(id) {
  try {
    await deleteCategoryRecord(id);
    await reloadCategories();

    if (state.calcCatId !== null && !getCatById(state.calcCatId)) {
      const first = getCategoriesByType(state.calcType)[0];
      state.calcCatId = first ? first.id : null;
    }

    renderCategories();
    renderCurrentView();

    if (document.getElementById('calcSheet').classList.contains('open')) {
      renderCalcCats();
    }
  } catch (error) {
    console.error(error);
  }
}

/* ------------------------------------------------------------------ */
/* Шторки действий                                                     */
/* ------------------------------------------------------------------ */

function openCatActionSheet(id) {
  const category = getCatById(id);
  if (!category) {
    return;
  }

  state.activeActionCatId = category.id;
  document.getElementById('actionSheetTitle').textContent = category.name;
  document.getElementById('actionBackdrop').classList.add('open');
  document.getElementById('actionSheet').classList.add('open');
}

function closeCatActionSheet() {
  document.getElementById('actionBackdrop').classList.remove('open');
  document.getElementById('actionSheet').classList.remove('open');
  setTimeout(() => {
    state.activeActionCatId = null;
  }, 300);
}

function editCategoryFromSheet() {
  if (state.activeActionCatId === null) {
    return;
  }
  const id = state.activeActionCatId;
  closeCatActionSheet();
  setTimeout(() => editCategory(id), 150);
}

function deleteCategoryFromSheet() {
  if (state.activeActionCatId === null) {
    return;
  }
  const id = state.activeActionCatId;
  closeCatActionSheet();
  setTimeout(() => deleteCategory(id), 150);
}

function openTxActionSheet(id) {
  const transaction = state.transactions.find((item) => String(item.id) === String(id));
  if (!transaction) {
    return;
  }

  state.activeTxId = transaction.id;
  const category = getCatForTransaction(transaction);
  document.getElementById('txActionTitle').textContent = `${category.name} · ${fmt(transaction.amount)} ₽`;
  document.getElementById('txActionBackdrop').classList.add('open');
  document.getElementById('txActionSheet').classList.add('open');
}

function closeTxActionSheet() {
  document.getElementById('txActionBackdrop').classList.remove('open');
  document.getElementById('txActionSheet').classList.remove('open');
  setTimeout(() => {
    if (!document.getElementById('txEditModal').classList.contains('open')) {
      state.activeTxId = null;
    }
  }, 300);
}

function editTxFromSheet() {
  if (state.activeTxId === null) {
    return;
  }
  const id = state.activeTxId;
  closeTxActionSheet();
  setTimeout(() => openTxEdit(id), 150);
}

function deleteTxFromSheet() {
  if (state.activeTxId === null) {
    return;
  }
  const id = state.activeTxId;
  closeTxActionSheet();
  setTimeout(() => deleteTransaction(id), 150);
}

async function deleteTransaction(id) {
  try {
    await deleteTransactionRecord(id);
    state.transactions = state.transactions.filter((item) => String(item.id) !== String(id));
    state.activeTxId = null;
    renderCurrentView();
  } catch (error) {
    console.error(error);
  }
}

/* ------------------------------------------------------------------ */
/* Редактирование операции                                             */
/* ------------------------------------------------------------------ */

function openTxEdit(id) {
  const transaction = state.transactions.find((item) => String(item.id) === String(id));
  if (!transaction) {
    return;
  }

  state.activeTxId = transaction.id;
  state.editTxType = transaction.type;

  const category = getCatByName(transaction.category, transaction.type);
  state.editTxCatId = category ? category.id : (getCategoriesByType(transaction.type)[0]?.id ?? null);

  document.getElementById('editTxAmount').value = transaction.amount;
  document.getElementById('editTxNote').value = transaction.note || '';
  updateEditTypeUI();
  renderEditTxCats();
  openModal('txEditModal');
  setTimeout(() => document.getElementById('editTxAmount').focus(), 120);
}

function editTxType(type) {
  state.editTxType = type === 'income' ? 'income' : 'expense';
  const first = getCategoriesByType(state.editTxType)[0];
  state.editTxCatId = first ? first.id : null;
  updateEditTypeUI();
  renderEditTxCats();
}

function updateEditTypeUI() {
  document.getElementById('editBtnExpense').classList.toggle('active', state.editTxType === 'expense');
  document.getElementById('editBtnIncome').classList.toggle('active', state.editTxType === 'income');
}

function renderEditTxCats() {
  const container = document.getElementById('editTxCats');
  const items = getCategoriesByType(state.editTxType);

  if (items.length === 0) {
    container.innerHTML = '<div class="calc-cats-empty">Нет категорий</div>';
    return;
  }

  if (state.editTxCatId === null || !getCatById(state.editTxCatId)) {
    state.editTxCatId = items[0].id;
  }

  container.innerHTML = items.map((category) => `
    <button class="calc-cat ${String(category.id) === String(state.editTxCatId) ? 'active' : ''}" type="button" data-edit-cat-id="${escapeHtml(category.id)}">
      ${escapeHtml(category.emoji)} ${escapeHtml(category.name)}
    </button>
  `).join('');
}

function selectEditTxCat(id) {
  state.editTxCatId = id;
  renderEditTxCats();
}

async function saveTxEdit() {
  const transaction = state.transactions.find((item) => String(item.id) === String(state.activeTxId));
  const input = document.getElementById('editTxAmount');
  const amount = Number.parseFloat(input.value);
  const category = getCatById(state.editTxCatId);

  if (!transaction || !Number.isFinite(amount) || amount <= 0 || !category) {
    input.style.borderColor = '#FF6B4A';
    setTimeout(() => { input.style.borderColor = ''; }, 500);
    return;
  }

  try {
    await updateTransactionRecord(transaction.id, {
      amount,
      type: state.editTxType,
      category: category.name,
      note: document.getElementById('editTxNote').value.trim()
    });

    await reloadTransactions();
    closeAllModals();
    state.activeTxId = null;
    renderCurrentView();
  } catch (error) {
    console.error(error);
    input.style.borderColor = '#FF6B4A';
  }
}

/* ------------------------------------------------------------------ */
/* Калькулятор                                                        */
/* ------------------------------------------------------------------ */

function openCalc() {
  state.calcExpr = '';
  state.calcType = 'expense';
  const categories = getCategoriesByType('expense');
  state.calcCatId = categories[0]?.id ?? null;

  document.getElementById('calcNote').value = '';

  updateCalcTypeUI();
  renderCalcCats();
  updateCalcDisplay();

  document.getElementById('backdrop').classList.add('open');
  document.getElementById('calcSheet').classList.add('open');
}

function switchCalcType(type) {
  state.calcType = type === 'income' ? 'income' : 'expense';
  const categories = getCategoriesByType(state.calcType);
  state.calcCatId = categories[0]?.id ?? null;
  updateCalcTypeUI();
  renderCalcCats();
}

function updateCalcTypeUI() {
  const expenseButton = document.getElementById('btnExpense');
  const incomeButton = document.getElementById('btnIncome');
  const submitButton = document.getElementById('btnSubmit');

  if (state.calcType === 'expense') {
    expenseButton.classList.add('active');
    incomeButton.classList.remove('active');
    submitButton.style.background = 'linear-gradient(135deg, #FF6B4A, #FFA07A)';
    submitButton.style.boxShadow = '0 4px 12px rgba(255,107,74,.3)';
  } else {
    incomeButton.classList.add('active');
    expenseButton.classList.remove('active');
    submitButton.style.background = 'linear-gradient(135deg, #10B981, #34D399)';
    submitButton.style.boxShadow = '0 4px 12px rgba(16,185,129,.3)';
  }
}

function renderCalcCats() {
  const container = document.getElementById('calcCats');
  const categories = getCategoriesByType(state.calcType);

  if (categories.length === 0) {
    state.calcCatId = null;
    container.innerHTML = '<div class="calc-cats-empty">Сначала добавьте категорию</div>';
    return;
  }

  if (state.calcCatId === null || !getCatById(state.calcCatId)) {
    state.calcCatId = categories[0].id;
  }

  container.innerHTML = categories.map((category) => `
    <button class="calc-cat ${String(category.id) === String(state.calcCatId) ? 'active' : ''}" type="button" data-calc-cat-id="${escapeHtml(category.id)}">
      ${escapeHtml(category.emoji)} ${escapeHtml(category.name)}
    </button>
  `).join('');
}

function selectCalcCat(id) {
  state.calcCatId = id;
  renderCalcCats();
}

function press(key) {
  if (key === 'back') {
    state.calcExpr = state.calcExpr.slice(0, -1);
  } else if (key === '.') {
    const parts = state.calcExpr.split(/[+\-×÷]/);
    const lastNumber = parts[parts.length - 1];
    if (!lastNumber.includes('.')) {
      state.calcExpr += '.';
    }
  } else if (['+', '-', '×', '÷'].includes(key)) {
    if (!state.calcExpr) {
      return;
    }
    const lastCharacter = state.calcExpr.slice(-1);
    if (['+', '-', '×', '÷'].includes(lastCharacter)) {
      state.calcExpr = state.calcExpr.slice(0, -1) + key;
    } else {
      state.calcExpr += key;
    }
  } else {
    if (state.calcExpr.length >= 14) {
      return;
    }
    state.calcExpr += key;
  }

  updateCalcDisplay();
}

function evaluateExpression(expression) {
  if (!expression) {
    return 0;
  }

  const cleaned = expression
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replace(/[+\-*/.]+$/, '');

  if (!cleaned || !/^[0-9+\-*/.]+$/.test(cleaned)) {
    return 0;
  }

  const tokens = cleaned.match(/(?:\d+(?:\.\d*)?|\.\d+|[+\-*/])/g);
  if (!tokens || tokens.length === 0) {
    return 0;
  }

  const values = [];
  const operators = [];

  const precedence = (operator) => (operator === '*' || operator === '/') ? 2 : 1;

  const apply = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (left === undefined || right === undefined) {
      return;
    }
    if (operator === '+') {
      values.push(left + right);
    } else if (operator === '-') {
      values.push(left - right);
    } else if (operator === '*') {
      values.push(left * right);
    } else if (operator === '/') {
      values.push(right === 0 ? 0 : left / right);
    }
  };

  tokens.forEach((token) => {
    if (/^[+\-*/]$/.test(token)) {
      while (operators.length && precedence(operators[operators.length - 1]) >= precedence(token)) {
        apply();
      }
      operators.push(token);
    } else {
      values.push(Number.parseFloat(token) || 0);
    }
  });

  while (operators.length) {
    apply();
  }

  const result = values[0];
  return Number.isFinite(result) ? Math.round(result * 100) / 100 : 0;
}

function updateCalcDisplay() {
  const display = document.getElementById('calcAmount');
  const resultElement = document.getElementById('calcResult');

  if (!state.calcExpr) {
    display.innerHTML = '0<span class="cur">₽</span>';
    display.classList.add('empty');
    resultElement.style.display = 'none';
    return;
  }

  display.classList.remove('empty');
  const displayText = state.calcExpr
    .replace(/([+\-×÷])/g, ' $1 ')
    .replace(/\./g, ',');
  display.innerHTML = `${escapeHtml(displayText)}<span class="cur">₽</span>`;

  const hasOperators = /[+\-×÷]/.test(state.calcExpr);
  const result = evaluateExpression(state.calcExpr);

  if (hasOperators && result > 0) {
    resultElement.textContent = `= ${fmt(result)} ₽`;
    resultElement.style.display = 'block';
  } else {
    resultElement.style.display = 'none';
  }
}

async function submitTx() {
  const amount = evaluateExpression(state.calcExpr);
  const category = getCatById(state.calcCatId);
  const display = document.getElementById('calcAmount');
  const note = document.getElementById('calcNote').value.trim();

  if (!amount || amount <= 0 || !category) {
    display.style.color = '#FF6B4A';
    setTimeout(() => { display.style.color = ''; }, 500);
    return;
  }

  try {
    const created = await addTransactionRecord({
      type: state.calcType,
      amount,
      category: category.name,
      date: todayISO(),
      note
    });

    state.transactions.push(normalizeTransaction(created));
    closeAllModals();
    renderCurrentView();
  } catch (error) {
    console.error(error);
    display.style.color = '#FF6B4A';
    setTimeout(() => { display.style.color = ''; }, 800);
  }
}

/* ------------------------------------------------------------------ */
/* Модалки и баланс                                                   */
/* ------------------------------------------------------------------ */

function openModal(id) {
  document.getElementById('backdrop').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function closeAllModals() {
  document.getElementById('backdrop').classList.remove('open');
  [
    'calcSheet',
    'catModal',
    'balanceModal',
    'txEditModal',
    'datePickerModal',
    'catStatsModal'
  ].forEach((id) => {
    document.getElementById(id).classList.remove('open');
  });
}

function openBalanceModal() {
  const input = document.getElementById('balanceInput');
  input.value = state.initialBalance || '';
  openModal('balanceModal');
  setTimeout(() => input.focus(), 120);
}

async function saveBalance() {
  const input = document.getElementById('balanceInput');
  const value = Number.parseFloat(input.value);
  state.initialBalance = Number.isFinite(value) ? value : 0;

  try {
    await putSetting(INITIAL_BALANCE_KEY, state.initialBalance);
    closeAllModals();
    renderHome();
  } catch (error) {
    console.error(error);
    input.style.borderColor = '#FF6B4A';
  }
}

function renderCurrentView() {
  if (state.view === 'home') {
    renderHome();
  } else if (state.view === 'history') {
    renderHistory();
  } else if (state.view === 'stats') {
    renderStats();
  } else if (state.view === 'categories') {
    renderCategories();
  }
}

/* ------------------------------------------------------------------ */
/* События                                                            */
/* ------------------------------------------------------------------ */

function handleDelegatedClick(event) {
  const target = event.target;

  const emojiButton = target.closest('[data-emoji]');
  if (emojiButton) {
    selectEmoji(emojiButton.dataset.emoji, emojiButton);
    return;
  }

  const calendarDay = target.closest('[data-cal-day]');
  if (calendarDay) {
    selectCalDay(Number(calendarDay.dataset.calDay));
    return;
  }

  const transactionElement = target.closest('[data-tx-id]');
  if (transactionElement) {
    closeAllModals();
    openTxActionSheet(transactionElement.dataset.txId);
    return;
  }

  const categoryElement = target.closest('[data-cat-id]');
  if (categoryElement) {
    openCatActionSheet(categoryElement.dataset.catId);
    return;
  }

  const legendElement = target.closest('[data-cat-key]');
  if (legendElement) {
    openCategoryStats(legendElement.dataset.catKey);
    return;
  }

  const calcCategory = target.closest('[data-calc-cat-id]');
  if (calcCategory) {
    selectCalcCat(calcCategory.dataset.calcCatId);
    return;
  }

  const editCategoryButton = target.closest('[data-edit-cat-id]');
  if (editCategoryButton) {
    selectEditTxCat(editCategoryButton.dataset.editCatId);
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeAllModals();
    closeCatActionSheet();
    closeTxActionSheet();
  }

  if (document.getElementById('balanceModal').classList.contains('open') && event.key === 'Enter') {
    saveBalance();
  }

  if (document.getElementById('catModal').classList.contains('open') && event.key === 'Enter') {
    saveNewCategory();
  }

  if (document.getElementById('calcSheet').classList.contains('open')) {
    if (/^\d$/.test(event.key)) {
      press(event.key);
      event.preventDefault();
    } else if (event.key === '.' || event.key === ',') {
      press('.');
      event.preventDefault();
    } else if (['+', '-', '*', '/'].includes(event.key)) {
      press(event.key === '*' ? '×' : event.key === '/' ? '÷' : event.key);
      event.preventDefault();
    } else if (event.key === 'Backspace') {
      press('back');
      event.preventDefault();
    } else if (event.key === 'Enter') {
      submitTx();
      event.preventDefault();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Запуск                                                             */
/* ------------------------------------------------------------------ */

async function init() {
  document.addEventListener('click', handleDelegatedClick);
  document.addEventListener('keydown', handleKeydown);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('Не удалось зарегистрировать service worker:', error);
    });
  }

  try {
    await loadState();
    renderHome();
    renderCategories();
    switchView('home');
  } catch (error) {
    console.error(error);
    const homeList = document.getElementById('homeTxList');
    if (homeList) {
      homeList.innerHTML = '<div class="tx-empty">Не удалось загрузить данные. Проверьте доступ к хранилищу и перезагрузите страницу.</div>';
    }
  }
}

init();
