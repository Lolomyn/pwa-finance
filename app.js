'use strict';

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 2;
const STORE_NAME = 'expenses';
const SETTINGS_STORE = 'settings';
const INITIAL_BALANCE_KEY = 'initialBalance';

const EXPENSE_CATEGORIES = ['Еда', 'Транспорт', 'Жильё', 'Развлечения', 'Другое'];
const INCOME_CATEGORIES = ['Зарплата', 'Фриланс', 'Подарок', 'Инвестиции', 'Другое'];
const TRANSACTION_TYPES = ['expense', 'income'];

const PERIODS = ['week', 'month', 'year', 'all'];
const PERIOD_DAYS = {
  week: 7,
  month: 30,
  year: 365
};

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
];

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_FONT_SIZE = 9;
const CHART_LABEL_GAP = 6;

const form = document.getElementById('expense-form');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const submitButton = form.querySelector('button[type="submit"]');
const typeTabs = document.getElementById('type-tabs');
const expenseList = document.getElementById('expense-list');
const emptyState = document.getElementById('empty-state');
const balanceValue = document.getElementById('balance-value');
const initialBalanceValue = document.getElementById('initial-balance-value');
const balanceHint = document.getElementById('balance-hint');
const editBalanceButton = document.getElementById('edit-balance');
const totalExpense = document.getElementById('total-expense');
const totalIncome = document.getElementById('total-income');
const totalNet = document.getElementById('total-net');
const errorMessage = document.getElementById('app-error');
const periodTabs = document.getElementById('period-tabs');
const statsExpense = document.getElementById('stats-expense');
const statsIncome = document.getElementById('stats-income');
const statsNet = document.getElementById('stats-net');
const statsAvg = document.getElementById('stats-avg');
const statsChart = document.getElementById('stats-chart');
const statsExpenseGroup = document.getElementById('stats-expense-group');
const statsExpenseCategories = document.getElementById('stats-expense-categories');
const statsIncomeGroup = document.getElementById('stats-income-group');
const statsIncomeCategories = document.getElementById('stats-income-categories');
const statsEmpty = document.getElementById('stats-empty');
const categoryFilter = document.getElementById('category-filter');
const exportJsonButton = document.getElementById('export-json');
const exportCsvButton = document.getElementById('export-csv');
const importJsonButton = document.getElementById('import-json');
const importFileInput = document.getElementById('import-file');

const amountFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

let db = null;
let expenses = [];
let currentType = 'expense';
let currentPeriod = 'month';
let currentFilter = '';
let initialBalance = 0;
let initialBalanceExists = false;
let statsRequestId = 0;
let lastChartData = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB недоступен в этом браузере.'));
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
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();

        if (db === database) {
          db = null;
        }
      };

      resolve(database);
    };

    request.onerror = () => {
      reject(request.error || new Error('Не удалось открыть базу данных.'));
    };

    request.onblocked = () => {
      reject(new Error('База данных занята другой вкладкой.'));
    };
  });
}

function normalizeTransaction(transaction) {
  const record = transaction && typeof transaction === 'object' ? transaction : {};

  return {
    ...record,
    type: record.type === 'income' ? 'income' : 'expense'
  };
}

function getInitialBalance() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(SETTINGS_STORE, 'readonly');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(INITIAL_BALANCE_KEY);
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось прочитать начальный баланс.'));
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      const record = request.result;
      const value = record ? Number(record.value) : 0;

      initialBalanceExists = Boolean(record);
      settled = true;
      resolve(Number.isFinite(value) ? value : 0);
    };

    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function setInitialBalance(value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(SETTINGS_STORE);
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось сохранить начальный баланс.'));
    };

    try {
      store.put({
        key: INITIAL_BALANCE_KEY,
        value
      });
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      initialBalanceExists = true;
      settled = true;
      resolve();
    };

    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function getAllExpenses() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(STORE_NAME, 'readonly');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось прочитать траты.'));
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve((request.result || []).map(normalizeTransaction));
    };

    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function addExpense(expense) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(STORE_NAME, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    let request;
    let newId = null;
    let settled = false;

    try {
      request = store.add(expense);
    } catch (error) {
      reject(error);
      return;
    }

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось сохранить трату.'));
    };

    request.onsuccess = () => {
      newId = request.result;
    };

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(newId);
    };

    transaction.onerror = () => fail(transaction.error || request.error);
    transaction.onabort = () => fail(transaction.error || request.error);
  });
}

function deleteExpense(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(STORE_NAME, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    let settled = false;

    try {
      store.delete(id);
    } catch (error) {
      reject(error);
      return;
    }

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось удалить трату.'));
    };

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function replaceAllData(items, balance) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction([STORE_NAME, SETTINGS_STORE], 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    const settingsStore = transaction.objectStore(SETTINGS_STORE);
    const fallbackCreatedAt = new Date().toISOString();
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось импортировать данные.'));
    };

    try {
      store.clear();

      items.forEach((item) => {
        store.add({
          amount: item.amount,
          note: item.note,
          category: item.category,
          date: item.date,
          createdAt: typeof item.createdAt === 'string'
            ? item.createdAt
            : fallbackCreatedAt,
          type: item.type
        });
      });

      settingsStore.put({
        key: INITIAL_BALANCE_KEY,
        value: balance
      });
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function compareExpenses(a, b) {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }

  return Number(b.id) - Number(a.id);
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function formatAmount(amount) {
  const value = Number(amount);
  return `${amountFormatter.format(Number.isFinite(value) ? value : 0)} ₽`;
}

function formatSignedAmount(amount, type) {
  const sign = type === 'income' ? '+' : '−';
  return `${sign} ${formatAmount(Math.abs(Number(amount) || 0))}`;
}

function formatNetAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount === 0) {
    return formatAmount(0);
  }

  return `${amount > 0 ? '+' : '−'} ${formatAmount(Math.abs(amount))}`;
}

function getTransactionType(transaction) {
  return transaction && transaction.type === 'income' ? 'income' : 'expense';
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTodayISO() {
  return formatISODate(new Date());
}

function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isValidDate(value) {
  return parseISODate(value) !== null;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function countCalendarDays(start, end) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  return Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);
}

function getPeriodRange(period, items = expenses) {
  const today = startOfDay(new Date());

  if (period === 'all') {
    const dates = items
      .map((expense) => parseISODate(expense.date))
      .filter((date) => date !== null)
      .sort((a, b) => a - b);

    if (dates.length === 0) {
      return { start: today, end: today };
    }

    const earliest = dates[0];
    const start = earliest <= today ? earliest : today;

    return { start, end: today };
  }

  const days = PERIOD_DAYS[period] || PERIOD_DAYS.month;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  return { start, end: today };
}

function formatDayLabel(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}.${month}`;
}

function formatMonthLabel(date, includeYear) {
  const month = MONTHS_SHORT[date.getMonth()];

  if (!includeYear) {
    return month;
  }

  return `${month} ${String(date.getFullYear()).slice(-2)}`;
}

function buildDayChartData(start, end, incomeByDate, expenseByDate) {
  const chartData = [];
  const cursor = startOfDay(start);
  const lastDay = startOfDay(end);

  while (cursor <= lastDay) {
    const isoDate = formatISODate(cursor);

    chartData.push({
      label: formatDayLabel(cursor),
      income: roundCurrency(incomeByDate[isoDate] || 0),
      expense: roundCurrency(expenseByDate[isoDate] || 0)
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return chartData;
}

function buildMonthChartData(startMonth, endMonth, incomeByMonth, expenseByMonth) {
  const months = [];
  const cursor = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
  const lastMonth = new Date(endMonth.getFullYear(), endMonth.getMonth(), 1);

  while (cursor <= lastMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const includeYear = months.length > 12;

  return months.map((date) => {
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    return {
      label: formatMonthLabel(date, includeYear),
      income: roundCurrency(incomeByMonth[monthKey] || 0),
      expense: roundCurrency(expenseByMonth[monthKey] || 0)
    };
  });
}

function roundCategoryTotals(totals) {
  const result = {};

  Object.keys(totals).forEach((category) => {
    result[category] = roundCurrency(totals[category]);
  });

  return result;
}

function aggregate(items, period) {
  const range = getPeriodRange(period, items);
  const startIso = formatISODate(range.start);
  const endIso = formatISODate(range.end);

  const filtered = [];
  const rawExpenseByCategory = {};
  const rawIncomeByCategory = {};
  const expenseByDate = {};
  const incomeByDate = {};
  const expenseByMonth = {};
  const incomeByMonth = {};
  let rawExpenseTotal = 0;
  let rawIncomeTotal = 0;

  items.forEach((expense) => {
    const date = parseISODate(expense.date);

    if (!date) {
      return;
    }

    const expenseIso = formatISODate(date);

    if (expenseIso < startIso || expenseIso > endIso) {
      return;
    }

    filtered.push(expense);

    const amount = Number(expense.amount);

    if (!Number.isFinite(amount)) {
      return;
    }

    const category = typeof expense.category === 'string' && expense.category
      ? expense.category
      : 'Другое';
    const monthKey = expenseIso.slice(0, 7);
    const type = getTransactionType(expense);

    if (type === 'income') {
      rawIncomeTotal += amount;
      rawIncomeByCategory[category] = (rawIncomeByCategory[category] || 0) + amount;
      incomeByDate[expenseIso] = (incomeByDate[expenseIso] || 0) + amount;
      incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + amount;
    } else {
      rawExpenseTotal += amount;
      rawExpenseByCategory[category] = (rawExpenseByCategory[category] || 0) + amount;
      expenseByDate[expenseIso] = (expenseByDate[expenseIso] || 0) + amount;
      expenseByMonth[monthKey] = (expenseByMonth[monthKey] || 0) + amount;
    }
  });

  const expenseTotal = roundCurrency(rawExpenseTotal);
  const incomeTotal = roundCurrency(rawIncomeTotal);
  const netFlow = roundCurrency(rawIncomeTotal - rawExpenseTotal);

  let chartData = [];

  if (period === 'week' || period === 'month') {
    chartData = buildDayChartData(
      range.start,
      range.end,
      incomeByDate,
      expenseByDate
    );
  } else if (period === 'year') {
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    const startMonth = new Date(endMonth.getFullYear(), endMonth.getMonth() - 11, 1);

    chartData = buildMonthChartData(
      startMonth,
      endMonth,
      incomeByMonth,
      expenseByMonth
    );
  } else if (period === 'all' && filtered.length > 0) {
    const startMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    chartData = buildMonthChartData(
      startMonth,
      endMonth,
      incomeByMonth,
      expenseByMonth
    );
  }

  const daysInPeriod = countCalendarDays(range.start, range.end);

  return {
    filtered,
    expenseTotal,
    incomeTotal,
    netFlow,
    expenseByCategory: roundCategoryTotals(rawExpenseByCategory),
    incomeByCategory: roundCategoryTotals(rawIncomeByCategory),
    avgPerDay: expenseTotal / Math.max(1, daysInPeriod),
    chartData
  };
}

function formatDate(isoDate) {
  const parts = String(isoDate).split('-');

  if (parts.length !== 3) {
    return String(isoDate);
  }

  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  if (Number.isNaN(date.getTime())) {
    return String(isoDate);
  }

  return dateFormatter.format(date);
}

function createExpenseElement(expense) {
  const item = document.createElement('li');
  item.className = 'expense-item';

  const info = document.createElement('div');
  info.className = 'expense-info';

  const type = getTransactionType(expense);
  const amount = document.createElement('span');
  amount.className = type === 'income'
    ? 'expense-amount is-income'
    : 'expense-amount';
  amount.textContent = formatSignedAmount(expense.amount, type);

  const meta = document.createElement('div');
  meta.className = 'expense-meta';

  const category = document.createElement('span');
  category.className = 'expense-category';
  category.textContent = expense.category;

  const separator = document.createElement('span');
  separator.className = 'expense-separator';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '•';

  const date = document.createElement('time');
  date.className = 'expense-date';
  date.dateTime = expense.date;
  date.textContent = formatDate(expense.date);

  meta.append(category, separator, date);
  info.append(amount, meta);

  if (expense.note) {
    const note = document.createElement('p');
    note.className = 'expense-note';
    note.textContent = expense.note;
    info.append(note);
  }

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button';
  deleteButton.dataset.id = String(expense.id);
  deleteButton.textContent = 'Удалить';

  item.append(info, deleteButton);
  return item;
}

function calculateTotals(items) {
  let expenseTotal = 0;
  let incomeTotal = 0;

  items.forEach((expense) => {
    const amount = Number(expense.amount);

    if (!Number.isFinite(amount)) {
      return;
    }

    if (getTransactionType(expense) === 'income') {
      incomeTotal += amount;
    } else {
      expenseTotal += amount;
    }
  });

  return {
    expenseTotal: roundCurrency(expenseTotal),
    incomeTotal: roundCurrency(incomeTotal),
    netFlow: roundCurrency(incomeTotal - expenseTotal)
  };
}

function updateBalance(totals) {
  const balance = roundCurrency(
    initialBalance + totals.incomeTotal - totals.expenseTotal
  );

  balanceValue.textContent = formatAmount(balance);
  balanceValue.classList.toggle('is-negative', balance < 0);
  initialBalanceValue.textContent = formatAmount(initialBalance);
  balanceHint.hidden = initialBalanceExists;
}

function updateTotal(items) {
  const totals = calculateTotals(items);
  const netFlow = totals.netFlow;

  totalExpense.textContent = formatAmount(totals.expenseTotal);
  totalIncome.textContent = formatAmount(totals.incomeTotal);
  totalNet.textContent = formatNetAmount(netFlow);
  totalNet.classList.toggle('is-income', netFlow >= 0);
  totalNet.classList.toggle('is-expense', netFlow < 0);

  updateBalance(totals);
}

function estimateChartLabelWidth(label) {
  return String(label).length * CHART_FONT_SIZE * 0.55;
}

function getChartLabelIndices(chartData, period, plotWidth) {
  const count = chartData.length;

  if (count === 0) {
    return [];
  }

  if (count === 1) {
    return [0];
  }

  const maxLabelWidth = chartData.reduce((maxWidth, point) => {
    return Math.max(maxWidth, estimateChartLabelWidth(point.label));
  }, 0);

  const maxByWidth = Math.max(
    2,
    Math.floor(plotWidth / (maxLabelWidth + CHART_LABEL_GAP)) + 1
  );

  let maxLabels;

  if (period === 'week') {
    maxLabels = count;
  } else if (period === 'month') {
    maxLabels = Math.min(8, count);
  } else {
    maxLabels = count <= 12 ? count : 12;
  }

  maxLabels = Math.max(2, Math.min(maxLabels, maxByWidth, count));

  if (maxLabels >= count) {
    return chartData.map((_, index) => index);
  }

  const indices = [];

  for (let index = 0; index < maxLabels; index += 1) {
    indices.push(Math.round((index * (count - 1)) / (maxLabels - 1)));
  }

  return [...new Set(indices)];
}

function createChartBar(x, y, width, height, type, label, value) {
  const color = type === 'income' ? '#27ae60' : '#e74c3c';
  let shape;

  if (height > 0) {
    const radius = Math.min(2, width / 2, height);
    const bottom = y + height;
    const right = x + width;

    shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('d', [
      `M ${x.toFixed(2)} ${bottom.toFixed(2)}`,
      `L ${x.toFixed(2)} ${(y + radius).toFixed(2)}`,
      `Q ${x.toFixed(2)} ${y.toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)}`,
      `L ${(right - radius).toFixed(2)} ${y.toFixed(2)}`,
      `Q ${right.toFixed(2)} ${y.toFixed(2)} ${right.toFixed(2)} ${(y + radius).toFixed(2)}`,
      `L ${right.toFixed(2)} ${bottom.toFixed(2)}`,
      'Z'
    ].join(' '));
  } else {
    shape = document.createElementNS(SVG_NS, 'rect');
    shape.setAttribute('x', x.toFixed(2));
    shape.setAttribute('y', y.toFixed(2));
    shape.setAttribute('width', width.toFixed(2));
    shape.setAttribute('height', '0');
  }

  shape.setAttribute('fill', color);
  shape.classList.add('bar-chart-bar', `bar-chart-bar--${type}`);
  shape.dataset.type = type;
  shape.dataset.value = String(value);

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = `${label}: ${type === 'income' ? 'доход' : 'расход'} ${formatAmount(value)}`;
  shape.append(title);

  return shape;
}

function renderBarChart(container, chartData, period) {
  container.replaceChildren();

  const points = Array.isArray(chartData) ? chartData : [];
  const hasValues = points.some((point) => {
    const income = Number(point.income);
    const expense = Number(point.expense);

    return (
      (Number.isFinite(income) && income > 0) ||
      (Number.isFinite(expense) && expense > 0)
    );
  });

  if (points.length === 0 || !hasValues) {
    const message = document.createElement('p');
    message.className = 'stats-chart-empty';
    message.textContent = 'Нет данных за период';
    container.append(message);
    return;
  }

  const width = Math.max(1, Math.round(container.clientWidth || 320));
  const height = Math.max(1, Math.round(container.clientHeight || 160));
  const chartLeft = 8;
  const chartRight = width - 8;
  const chartTop = 8;
  const chartBottom = height - 28;
  const plotWidth = Math.max(1, chartRight - chartLeft);
  const plotHeight = Math.max(1, chartBottom - chartTop);

  const maxValue = points.reduce((max, point) => {
    const income = Number(point.income);
    const expense = Number(point.expense);
    const safeIncome = Number.isFinite(income) && income > 0 ? income : 0;
    const safeExpense = Number.isFinite(expense) && expense > 0 ? expense : 0;

    return Math.max(max, safeIncome, safeExpense);
  }, 0);

  const slotWidth = plotWidth / points.length;
  const barWidth = Math.max(0.5, slotWidth * 0.4);
  const barGap = Math.max(0.25, slotWidth * 0.08);
  const pairWidth = barWidth * 2 + barGap;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'График доходов и расходов за период');

  points.forEach((point, index) => {
    const incomeValue = Number(point.income);
    const expenseValue = Number(point.expense);
    const safeIncome = Number.isFinite(incomeValue) && incomeValue > 0 ? incomeValue : 0;
    const safeExpense = Number.isFinite(expenseValue) && expenseValue > 0 ? expenseValue : 0;
    const incomeHeight = (safeIncome / maxValue) * plotHeight;
    const expenseHeight = (safeExpense / maxValue) * plotHeight;
    const pairLeft = chartLeft + slotWidth * index + (slotWidth - pairWidth) / 2;
    const incomeX = pairLeft;
    const expenseX = pairLeft + barWidth + barGap;

    svg.append(
      createChartBar(
        incomeX,
        chartBottom - incomeHeight,
        barWidth,
        incomeHeight,
        'income',
        point.label,
        safeIncome
      ),
      createChartBar(
        expenseX,
        chartBottom - expenseHeight,
        barWidth,
        expenseHeight,
        'expense',
        point.label,
        safeExpense
      )
    );
  });

  const labelIndices = getChartLabelIndices(points, period, plotWidth);

  labelIndices.forEach((index) => {
    const point = points[index];
    const x = chartLeft + slotWidth * (index + 0.5);
    const text = document.createElementNS(SVG_NS, 'text');

    text.setAttribute('x', x.toFixed(2));
    text.setAttribute('y', (height - 8).toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#666666');
    text.setAttribute('font-size', String(CHART_FONT_SIZE));
    text.classList.add('bar-chart-label');
    text.textContent = point.label;
    svg.append(text);
  });

  container.append(svg);

  const labelElements = Array.from(svg.querySelectorAll('.bar-chart-label'));
  const containerRect = container.getBoundingClientRect();
  const leftLimit = containerRect.left + chartLeft;
  const rightLimit = containerRect.left + chartRight;

  labelElements.forEach((label) => {
    const rect = label.getBoundingClientRect();

    if (rect.left < leftLimit) {
      label.setAttribute('text-anchor', 'start');
      label.setAttribute('x', chartLeft.toFixed(2));
    } else if (rect.right > rightLimit) {
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('x', chartRight.toFixed(2));
    }
  });

  for (let index = labelElements.length - 2; index >= 1; index -= 1) {
    const currentRect = labelElements[index].getBoundingClientRect();
    const nextRect = labelElements[index + 1].getBoundingClientRect();

    if (currentRect.right + 2 > nextRect.left) {
      labelElements[index].remove();
      labelElements.splice(index, 1);
    }
  }
}

function renderCategoryBreakdown(container, list, categories, total) {
  const entries = Object.entries(categories)
    .filter(([, sum]) => Number.isFinite(sum) && sum > 0)
    .sort((a, b) => b[1] - a[1]);
  const fragment = document.createDocumentFragment();

  entries.forEach(([category, sum]) => {
    const item = document.createElement('li');
    item.className = 'stats-category';

    const name = document.createElement('span');
    name.className = 'stats-category-name';
    name.textContent = `${category} —`;

    const value = document.createElement('span');
    value.className = 'stats-category-value';

    const percent = total > 0
      ? Math.round((sum / total) * 100)
      : 0;

    value.textContent = `${formatAmount(sum)} (${percent}%)`;

    item.append(name, value);
    fragment.append(item);
  });

  list.replaceChildren(fragment);
  list.hidden = entries.length === 0;
  container.hidden = entries.length === 0;

  return entries.length;
}

function renderStats(result) {
  const netFlow = result.netFlow;

  statsExpense.textContent = formatAmount(result.expenseTotal);
  statsIncome.textContent = formatAmount(result.incomeTotal);
  statsNet.textContent = formatNetAmount(netFlow);
  statsNet.classList.toggle('is-income', netFlow >= 0);
  statsNet.classList.toggle('is-expense', netFlow < 0);
  statsAvg.textContent = formatAmount(result.avgPerDay);

  const expenseCount = renderCategoryBreakdown(
    statsExpenseGroup,
    statsExpenseCategories,
    result.expenseByCategory,
    result.expenseTotal
  );
  const incomeCount = renderCategoryBreakdown(
    statsIncomeGroup,
    statsIncomeCategories,
    result.incomeByCategory,
    result.incomeTotal
  );

  statsEmpty.hidden = expenseCount + incomeCount > 0;

  lastChartData = result.chartData;
  renderBarChart(statsChart, result.chartData, currentPeriod);
}

function updatePeriodTabs() {
  periodTabs.querySelectorAll('[data-period]').forEach((tab) => {
    const isActive = tab.dataset.period === currentPeriod;

    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

async function refreshStats() {
  const requestId = ++statsRequestId;

  try {
    const allExpenses = await getAllExpenses();

    if (requestId !== statsRequestId) {
      return;
    }

    renderStats(aggregate(allExpenses, currentPeriod));
  } catch (error) {
    if (requestId === statsRequestId) {
      showError('Не удалось обновить статистику. Проверьте доступ к хранилищу и попробуйте ещё раз.');
    }
  }
}

function setPeriod(period) {
  if (!PERIODS.includes(period)) {
    return;
  }

  currentPeriod = period;
  updatePeriodTabs();
  return refreshStats();
}

function initPeriodTabs() {
  updatePeriodTabs();

  periodTabs.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const tab = target.closest('[data-period]');

    if (!tab || !periodTabs.contains(tab)) {
      return;
    }

    setPeriod(tab.dataset.period);
  });
}

function getAllCategories() {
  return [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
}

function initCategoryFilter() {
  const fragment = document.createDocumentFragment();

  getAllCategories().forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    fragment.append(option);
  });

  categoryFilter.append(fragment);
  categoryFilter.value = currentFilter;

  categoryFilter.addEventListener('change', () => {
    currentFilter = categoryFilter.value;
    renderExpenseList(expenses);
  });
}

function renderExpenseList(items) {
  const visibleExpenses = currentFilter
    ? items.filter((expense) => expense.category === currentFilter)
    : items;
  const sortedExpenses = [...visibleExpenses].sort(compareExpenses);
  const fragment = document.createDocumentFragment();

  sortedExpenses.forEach((expense) => {
    fragment.append(createExpenseElement(expense));
  });

  expenseList.replaceChildren(fragment);
  emptyState.hidden = sortedExpenses.length > 0;
}

async function render(items) {
  renderExpenseList(items);
  updateTotal(items);

  await refreshStats();
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function compareExpensesByDateAscending(a, b) {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }

  return Number(a.id) - Number(b.id);
}

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(items) {
  const rows = [['date', 'type', 'amount', 'category', 'note']];

  [...items]
    .sort(compareExpensesByDateAscending)
    .forEach((expense) => {
      rows.push([
        expense.date,
        getTransactionType(expense),
        String(expense.amount),
        expense.category,
        expense.note == null ? '' : expense.note
      ]);
    });

  const body = rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');

  return `\uFEFF${body}`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

async function handleExportJson() {
  clearError();
  exportJsonButton.disabled = true;

  try {
    const [items, balance] = await Promise.all([
      getAllExpenses(),
      getInitialBalance()
    ]);
    const content = JSON.stringify({
      initialBalance: balance,
      exportedAt: new Date().toISOString(),
      transactions: items
    }, null, 2);

    downloadFile(
      content,
      `expenses-backup-${getTodayISO()}.json`,
      'application/json;charset=utf-8'
    );
  } catch (error) {
    showError('Не удалось экспортировать данные. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    exportJsonButton.disabled = false;
  }
}

async function handleExportCsv() {
  clearError();
  exportCsvButton.disabled = true;

  try {
    const items = await getAllExpenses();

    downloadFile(
      buildCsv(items),
      `expenses-${getTodayISO()}.csv`,
      'text/csv;charset=utf-8'
    );
  } catch (error) {
    showError('Не удалось экспортировать данные. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    exportCsvButton.disabled = false;
  }
}

function validateImportItem(item, index) {
  const label = `запись №${index + 1}`;

  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`${label}: ожидается объект.`);
  }

  let type = 'expense';

  if (Object.prototype.hasOwnProperty.call(item, 'type')) {
    if (item.type !== 'expense' && item.type !== 'income') {
      throw new Error(`${label}: поле "type" должно быть "expense" или "income".`);
    }

    type = item.type;
  }

  if (typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0) {
    throw new Error(`${label}: поле "amount" должно быть числом больше 0.`);
  }

  if (typeof item.category !== 'string') {
    throw new Error(`${label}: поле "category" должно быть строкой.`);
  }

  if (typeof item.date !== 'string' || !isValidDate(item.date)) {
    throw new Error(`${label}: поле "date" должно быть датой в формате ГГГГ-ММ-ДД.`);
  }

  if (
    Object.prototype.hasOwnProperty.call(item, 'note') &&
    typeof item.note !== 'string'
  ) {
    throw new Error(`${label}: поле "note" должно быть строкой.`);
  }

  if (
    Object.prototype.hasOwnProperty.call(item, 'createdAt') &&
    typeof item.createdAt !== 'string'
  ) {
    throw new Error(`${label}: поле "createdAt" должно быть строкой.`);
  }

  return {
    amount: item.amount,
    note: Object.prototype.hasOwnProperty.call(item, 'note') ? item.note : '',
    category: item.category,
    date: item.date,
    createdAt: Object.prototype.hasOwnProperty.call(item, 'createdAt')
      ? item.createdAt
      : null,
    type
  };
}

function parseImportJson(text) {
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error('файл содержит некорректный JSON.');
  }

  let initialBalance = 0;
  let items;

  if (Array.isArray(data)) {
    items = data;
  } else if (data !== null && typeof data === 'object') {
    if (Object.prototype.hasOwnProperty.call(data, 'initialBalance')) {
      if (typeof data.initialBalance !== 'number' || !Number.isFinite(data.initialBalance)) {
        throw new Error('поле "initialBalance" должно быть числом.');
      }

      initialBalance = data.initialBalance;
    }

    if (!Array.isArray(data.transactions)) {
      throw new Error('поле "transactions" должно быть массивом записей.');
    }

    items = data.transactions;
  } else {
    throw new Error('ожидается массив записей или объект с полем "transactions".');
  }

  return {
    initialBalance,
    items: items.map(validateImportItem)
  };
}

function handleImportClick() {
  importFileInput.value = '';
  importFileInput.click();
}

async function handleImportFileChange(event) {
  const input = event.target;
  const file = input.files && input.files[0];

  if (!file) {
    input.value = '';
    return;
  }

  clearError();
  importJsonButton.disabled = true;

  try {
    let text;

    try {
      text = await file.text();
    } catch (error) {
      alert('Не удалось прочитать файл. Выберите другой файл и попробуйте ещё раз.');
      return;
    }

    let importedData;

    try {
      importedData = parseImportJson(text.replace(/^\uFEFF/, ''));
    } catch (error) {
      alert(`Импорт отменён: ${error.message}`);
      return;
    }

    if (!confirm('Импорт заменит все текущие данные. Продолжить?')) {
      return;
    }

    await replaceAllData(importedData.items, importedData.initialBalance);

    initialBalance = importedData.initialBalance;
    initialBalanceExists = true;
    expenses = await getAllExpenses();
    await render(expenses);
  } catch (error) {
    showError('Не удалось импортировать данные. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    importJsonButton.disabled = false;
    input.value = '';
  }
}

function getCategoriesForType(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function updateTypeControls() {
  const isIncome = currentType === 'income';

  typeTabs.querySelectorAll('[data-type]').forEach((tab) => {
    const isActive = tab.dataset.type === currentType;

    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  submitButton.textContent = isIncome ? 'Добавить доход' : 'Добавить расход';
}

function renderFormCategories() {
  const categories = getCategoriesForType(currentType);
  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    fragment.append(option);
  });

  categoryInput.replaceChildren(fragment);
  categoryInput.value = categories[0];
}

function setTransactionType(type) {
  if (!TRANSACTION_TYPES.includes(type) || type === currentType) {
    return;
  }

  currentType = type;
  updateTypeControls();
  renderFormCategories();
}

function initTypeTabs() {
  updateTypeControls();
  renderFormCategories();

  typeTabs.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const tab = target.closest('[data-type]');

    if (!tab || !typeTabs.contains(tab)) {
      return;
    }

    setTransactionType(tab.dataset.type);
  });
}

function parseBalanceInput(raw) {
  if (typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');

  if (!normalized) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  const rounded = roundCurrency(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

async function handleEditBalance() {
  clearError();

  const raw = window.prompt(
    'Введите начальный баланс в рублях (число может быть отрицательным):',
    String(initialBalance)
  );

  if (raw === null) {
    return;
  }

  const value = parseBalanceInput(raw);

  if (value === null) {
    alert('Введите корректное число для начального баланса.');
    return;
  }

  editBalanceButton.disabled = true;

  try {
    await setInitialBalance(value);

    initialBalance = value;
    updateBalance(calculateTotals(expenses));
  } catch (error) {
    showError('Не удалось сохранить начальный баланс. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    editBalanceButton.disabled = false;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  clearError();

  const rawAmount = amountInput.value.trim();
  const parsedAmount = Number(rawAmount.replace(',', '.'));
  const amount = Math.round(parsedAmount * 100) / 100;

  if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
    alert('Введите сумму больше 0.');
    amountInput.focus();
    return;
  }

  if (!dateInput.value || !isValidDate(dateInput.value)) {
    alert('Выберите корректную дату операции.');
    dateInput.focus();
    return;
  }

  if (!getCategoriesForType(currentType).includes(categoryInput.value)) {
    alert('Выберите категорию.');
    categoryInput.focus();
    return;
  }

  const expense = {
    amount,
    note: noteInput.value.trim(),
    category: categoryInput.value,
    date: dateInput.value,
    createdAt: new Date().toISOString(),
    type: currentType
  };

  submitButton.disabled = true;

  try {
    const id = await addExpense(expense);

    expenses.push({ id, ...expense });
    await render(expenses);

    form.reset();
    dateInput.value = getTodayISO();
    amountInput.focus();
  } catch (error) {
    showError('Не удалось сохранить операцию. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    submitButton.disabled = false;
  }
}

async function handleExpenseListClick(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest('.delete-button');

  if (!button || !expenseList.contains(button)) {
    return;
  }

  const id = Number(button.dataset.id);

  if (!Number.isInteger(id)) {
    return;
  }

  if (!confirm('Удалить эту операцию?')) {
    return;
  }

  clearError();
  button.disabled = true;

  try {
    await deleteExpense(id);
    expenses = expenses.filter((expense) => expense.id !== id);
    await render(expenses);
  } catch (error) {
    button.disabled = false;
    showError('Не удалось удалить операцию. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  }
}

async function init() {
  dateInput.value = getTodayISO();

  form.addEventListener('submit', handleSubmit);
  expenseList.addEventListener('click', handleExpenseListClick);
  editBalanceButton.addEventListener('click', handleEditBalance);
  exportJsonButton.addEventListener('click', handleExportJson);
  exportCsvButton.addEventListener('click', handleExportCsv);
  importJsonButton.addEventListener('click', handleImportClick);
  importFileInput.addEventListener('change', handleImportFileChange);
  initTypeTabs();
  initPeriodTabs();
  initCategoryFilter();

  window.addEventListener('resize', () => {
    if (lastChartData) {
      renderBarChart(statsChart, lastChartData, currentPeriod);
    }
  });

  try {
    db = await openDB();

    const [loadedExpenses, balance] = await Promise.all([
      getAllExpenses(),
      getInitialBalance()
    ]);

    expenses = loadedExpenses;
    initialBalance = balance;
    await render(expenses);
  } catch (error) {
    showError('Не удалось загрузить операции. Проверьте настройки браузера и перезагрузите страницу.');
  }
}

init();
