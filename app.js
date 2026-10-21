'use strict';

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 4;
const STORE_NAME = 'expenses';
const SETTINGS_STORE = 'settings';
const CATEGORIES_STORE = 'categories';
const INITIAL_BALANCE_KEY = 'initialBalance';
const QUICK_TEMPLATES_KEY = 'quickTemplates';
const QUICK_TEMPLATE_LABEL_MAX = 30;
const CATEGORY_LIMIT_MAX = 100000000;

const SYSTEM_CATEGORY_NAME = 'Другое';
const TRANSACTION_TYPES = ['expense', 'income'];
const DEFAULT_CATEGORIES = {
  expense: ['Еда', 'Транспорт', 'Жильё', 'Развлечения', SYSTEM_CATEGORY_NAME],
  income: ['Зарплата', 'Фриланс', 'Подарок', 'Инвестиции', SYSTEM_CATEGORY_NAME]
};

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

const MONTHS_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const EXPENSE_SORTS = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
const CUSTOM_CHART_DAY_LIMIT = 62;
const TAB_NAMES = ['home', 'history', 'stats', 'settings'];

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_FONT_SIZE = 9;
const CHART_LABEL_GAP = 6;
const UNDO_DELETE_TIMEOUT = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_DAYS = 30;
const APP_LOCK_TIMEOUT = 60 * 1000;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_DURATION = 30 * 1000;

const appRoot = document.querySelector('.app');
const tabPanels = [...document.querySelectorAll('.tab-panel[data-tab]')];
const bottomNavButtons = [...document.querySelectorAll('[data-tab-target]')];
const homeLastOperations = document.getElementById('home-last-operations');
const homeLastList = document.getElementById('home-last-list');
const homeShowAllButton = document.getElementById('home-show-all');
const form = document.getElementById('expense-form');
const formTitle = document.getElementById('form-title');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const submitButton = form.querySelector('button[type="submit"]');
const cancelEditButton = document.getElementById('cancel-edit');
const formPanel = form.closest('.panel');
const typeTabs = document.getElementById('type-tabs');
const expenseList = document.getElementById('expense-list');
const emptyState = document.getElementById('empty-state');
const balanceValue = document.getElementById('balance-value');
const initialBalanceValue = document.getElementById('initial-balance-value');
const balanceHint = document.getElementById('balance-hint');
const editBalanceButton = document.getElementById('edit-balance');
const editInitialBalanceButton = document.getElementById('edit-initial-balance');
const homeLimits = document.getElementById('home-limits');
const homeLimitsList = document.getElementById('home-limits-list');
const manageLimitsButton = document.getElementById('manage-limits');
const totalExpense = document.getElementById('total-expense');
const totalIncome = document.getElementById('total-income');
const totalNet = document.getElementById('total-net');
const errorMessage = document.getElementById('app-error');
const statsPanel = document.getElementById('stats-panel');
const statsPeriodControls = document.getElementById('stats-period-controls');
const statsTabEmpty = document.getElementById('stats-tab-empty');
const periodTabs = document.getElementById('period-tabs');
const customFromInput = document.getElementById('custom-from');
const customToInput = document.getElementById('custom-to');
const customApplyButton = document.getElementById('custom-apply');
const customResetButton = document.getElementById('custom-reset');
const customRangeError = document.getElementById('custom-range-error');
const statsPeriodLabel = document.getElementById('stats-period-label');
const statsExpense = document.getElementById('stats-expense');
const statsIncome = document.getElementById('stats-income');
const statsNet = document.getElementById('stats-net');
const statsAvg = document.getElementById('stats-avg');
const statsChart = document.getElementById('stats-chart');
const balanceChartTitle = document.getElementById('balance-chart-title');
const statsBalanceChart = document.getElementById('stats-balance-chart');
const statsComparison = document.getElementById('stats-comparison');
const statsExpenseGroup = document.getElementById('stats-expense-group');
const statsExpenseCategories = document.getElementById('stats-expense-categories');
const statsIncomeGroup = document.getElementById('stats-income-group');
const statsIncomeCategories = document.getElementById('stats-income-categories');
const statsEmpty = document.getElementById('stats-empty');
const categoryFilter = document.getElementById('category-filter');
const expenseSearchInput = document.getElementById('expense-search');
const expenseSortSelect = document.getElementById('expense-sort');
const exportJsonButton = document.getElementById('export-json');
const exportCsvButton = document.getElementById('export-csv');
const reportPdfButton = document.getElementById('report-pdf');
const importJsonButton = document.getElementById('import-json');
const importFileInput = document.getElementById('import-file');
const backupBanner = document.getElementById('backup-banner');
const backupBannerText = document.getElementById('backup-banner-text');
const backupBannerExportButton = document.getElementById('backup-banner-export');
const backupBannerHideButton = document.getElementById('backup-banner-hide');
const lastBackupValue = document.getElementById('last-backup-value');
const manageCategoriesButton = document.getElementById('manage-categories');
const manageQuickTemplatesButton = document.getElementById('manage-quick-templates');
const quickTemplatesRow = document.getElementById('quick-templates');
const quickTemplateModal = document.getElementById('quick-template-modal');
const quickTemplateModalClose = document.getElementById('quick-template-modal-close');
const quickTemplateList = document.getElementById('quick-template-list');
const quickTemplateEmpty = document.getElementById('quick-template-empty');
const quickTemplateForm = document.getElementById('quick-template-form');
const quickTemplateFormTitle = document.getElementById('quick-template-form-title');
const quickTemplateLabelInput = document.getElementById('quick-template-label');
const quickTemplateAmountInput = document.getElementById('quick-template-amount');
const quickTemplateTypeSelect = document.getElementById('quick-template-type');
const quickTemplateCategorySelect = document.getElementById('quick-template-category');
const quickTemplateNoteInput = document.getElementById('quick-template-note');
const quickTemplateCancel = document.getElementById('quick-template-cancel');
const quickTemplateError = document.getElementById('quick-template-error');
const categoryModal = document.getElementById('category-modal');
const categoryModalClose = document.getElementById('category-modal-close');
const categoryModalTabs = document.getElementById('category-modal-tabs');
const categoryModalList = document.getElementById('category-modal-list');
const categoryModalEmpty = document.getElementById('category-modal-empty');
const categoryAddForm = document.getElementById('category-add-form');
const categoryNameInput = document.getElementById('category-name-input');
const categoryModalError = document.getElementById('category-modal-error');
const manageSecurityButton = document.getElementById('manage-security');
const securityModal = document.getElementById('security-modal');
const securityModalClose = document.getElementById('security-modal-close');
const securityEnablePinSection = document.getElementById('security-enable-pin-section');
const securityDisablePinSection = document.getElementById('security-disable-pin-section');
const securityPinForm = document.getElementById('security-pin-form');
const securityPinInput = document.getElementById('security-pin');
const securityPinConfirmInput = document.getElementById('security-pin-confirm');
const securityEnablePinButton = document.getElementById('security-enable-pin');
const securityCurrentPinForm = document.getElementById('security-current-pin-form');
const securityCurrentPinInput = document.getElementById('security-current-pin');
const securityDisablePinButton = document.getElementById('security-disable-pin');
const securityPinStatus = document.getElementById('security-pin-status');
const securityBiometricStatus = document.getElementById('security-biometric-status');
const securityBiometricHint = document.getElementById('security-biometric-hint');
const securityEnableBiometricButton = document.getElementById('security-enable-biometric');
const securityDisableBiometricButton = document.getElementById('security-disable-biometric');
const securityModalError = document.getElementById('security-modal-error');
const securityChangePinSection = document.getElementById('security-change-pin-section');
const securityChangePinForm = document.getElementById('security-change-pin-form');
const securityChangeOldPinInput = document.getElementById('security-change-old-pin');
const securityChangeNewPinInput = document.getElementById('security-change-new-pin');
const securityChangeNewPinConfirmInput = document.getElementById('security-change-new-pin-confirm');
const securityChangePinButton = document.getElementById('security-change-pin');
const securityChangePinStatus = document.getElementById('security-change-pin-status');
const reconcileBalanceButton = document.getElementById('reconcile-balance');
const balanceReconcileModal = document.getElementById('balance-reconcile-modal');
const balanceReconcileClose = document.getElementById('balance-reconcile-close');
const balanceReconcileForm = document.getElementById('balance-reconcile-form');
const reconcileComputedValue = document.getElementById('reconcile-computed-value');
const reconcileActualInput = document.getElementById('reconcile-actual');
const reconcileSubmitButton = document.getElementById('reconcile-submit');
const reconcileError = document.getElementById('reconcile-error');
const reconcileResult = document.getElementById('reconcile-result');
const reconcileResultMessage = document.getElementById('reconcile-result-message');
const reconcileResultActions = document.getElementById('reconcile-result-actions');
const reconcileCreateButton = document.getElementById('reconcile-create');
const reconcileCancelButton = document.getElementById('reconcile-cancel');
const undoToast = document.getElementById('undo-toast');
const undoToastText = document.getElementById('undo-toast-text');
const undoToastButton = document.getElementById('undo-toast-button');
const infoToast = document.getElementById('info-toast');
const infoToastText = document.getElementById('info-toast-text');
const lockScreen = document.getElementById('lock-screen');
const lockForm = document.getElementById('lock-form');
const lockPinInput = document.getElementById('lock-pin');
const lockSubmitButton = document.getElementById('lock-submit');
const lockForgotPinButton = document.getElementById('lock-forgot-pin');
const lockBiometricButton = document.getElementById('lock-biometric');
const lockMessage = document.getElementById('lock-message');
const pinRecoveryModal = document.getElementById('pin-recovery-modal');
const pinRecoveryClose = document.getElementById('pin-recovery-close');
const pinRecoveryOptions = document.getElementById('pin-recovery-options');
const pinRecoveryBiometricButton = document.getElementById('pin-recovery-biometric');
const pinRecoveryResetButton = document.getElementById('pin-recovery-reset');
const pinRecoveryWarning = document.getElementById('pin-recovery-warning');
const pinRecoveryWarningContinue = document.getElementById('pin-recovery-warning-continue');
const pinRecoveryWarningCancel = document.getElementById('pin-recovery-warning-cancel');
const pinRecoveryConfirm = document.getElementById('pin-recovery-confirm');
const pinRecoveryConfirmInput = document.getElementById('pin-recovery-confirm-input');
const pinRecoveryConfirmDelete = document.getElementById('pin-recovery-confirm-delete');
const pinRecoveryBack = document.getElementById('pin-recovery-back');
const pinRecoveryError = document.getElementById('pin-recovery-error');

const amountFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const reportDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

let db = null;
let expenses = [];
let currentType = 'expense';
let currentPeriod = 'month';
let currentFilter = '';
let currentSearch = '';
let currentSort = 'date-desc';
let customRange = null;
let initialBalance = 0;
let initialBalanceExists = false;
let activeTab = null;
let appDataLoaded = false;
let statsDirty = true;
let statsRenderedDay = null;
let historyDirty = true;
const tabScrollPositions = {
  home: 0,
  history: 0,
  stats: 0,
  settings: 0
};
let statsRequestId = 0;
let lastChartData = null;
let lastChartPeriod = 'month';
let lastBalanceSeries = null;
let lastBalancePeriod = 'month';
let categoryModalType = 'expense';
let categoryModalReturnFocus = null;
let editingExpenseId = null;
let quickTemplates = [];
let editingQuickTemplateId = null;
let quickTemplateModalReturnFocus = null;
let pendingUndo = null;
let pendingUndoCommit = null;
let printReportAfterPrint = null;
let printReportTimer = null;
let lastBackupAt = null;
let backupBannerHiddenUntil = null;
let securityState = {
  pinEnabled: false,
  pinHash: '',
  pinSalt: '',
  biometricEnabled: false,
  credentialId: ''
};
let pinFailedAttempts = 0;
let pinLockedUntil = 0;
let pinLockCountdownTimer = null;
let appHiddenAt = 0;
let isAppLocked = false;
let pinRecoveryReturnFocus = null;
let reconcileDraft = null;
let reconcileCloseTimer = null;
let reconcileReturnFocus = null;
let infoToastTimer = null;

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
      const upgradeTransaction = request.transaction;

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
        const categoriesStore = database.createObjectStore(CATEGORIES_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });
        const knownCategories = new Set();

        createDefaultCategoryRecords().forEach((record) => {
          categoriesStore.add(record);
          knownCategories.add(categoryKey(record.type, record.name));
        });

        const expensesStore = database.objectStoreNames.contains(STORE_NAME)
          ? upgradeTransaction.objectStore(STORE_NAME)
          : null;

        if (expensesStore) {
          const cursorRequest = expensesStore.openCursor();

          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;

            if (!cursor) {
              return;
            }

            const record = cursor.value || {};
            const type = record.type === 'income' ? 'income' : 'expense';
            const name = typeof record.category === 'string' ? record.category : '';
            const key = name ? categoryKey(type, name) : '';

            if (name && !knownCategories.has(key)) {
              knownCategories.add(key);
              categoriesStore.add({
                name,
                type,
                isSystem: name === SYSTEM_CATEGORY_NAME,
                monthlyLimit: null
              });
            }

            cursor.continue();
          };
        }
      }

      const categoriesStore = upgradeTransaction.objectStore(CATEGORIES_STORE);
      const limitMigrationRequest = categoriesStore.openCursor();

      limitMigrationRequest.onsuccess = () => {
        const cursor = limitMigrationRequest.result;

        if (!cursor) {
          return;
        }

        const record = cursor.value || {};

        if (!Object.prototype.hasOwnProperty.call(record, 'monthlyLimit')) {
          cursor.update({
            ...record,
            monthlyLimit: null
          });
        }

        cursor.continue();
      };
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
    type: record.type === 'income' ? 'income' : 'expense',
    isAdjustment: record.isAdjustment === true
  };
}

function isSystemCategory(category) {
  return Boolean(category) && (
    category.isSystem === true ||
    category.name === SYSTEM_CATEGORY_NAME
  );
}

function normalizeMonthlyLimit(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = typeof value === 'number'
    ? value
    : Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));

  if (
    !Number.isFinite(number) ||
    number <= 0 ||
    number > CATEGORY_LIMIT_MAX
  ) {
    return null;
  }

  return roundCurrency(number);
}

function normalizeCategory(record) {
  const category = record && typeof record === 'object' ? record : {};
  const name = typeof category.name === 'string' ? category.name : '';
  const type = category.type === 'income' ? 'income' : 'expense';

  return {
    ...category,
    name,
    type,
    isSystem: category.isSystem === true || name === SYSTEM_CATEGORY_NAME,
    monthlyLimit: type === 'expense'
      ? normalizeMonthlyLimit(category.monthlyLimit)
      : null
  };
}

function createDefaultCategoryRecords() {
  const records = [];

  TRANSACTION_TYPES.forEach((type) => {
    DEFAULT_CATEGORIES[type].forEach((name) => {
      records.push({
        name,
        type,
        isSystem: name === SYSTEM_CATEGORY_NAME,
        monthlyLimit: null
      });
    });
  });

  return records;
}

function sortCategoryGroup(categories) {
  const regular = categories
    .filter((category) => !category.isSystem)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const system = categories
    .filter((category) => category.isSystem)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return [...regular, ...system];
}

function readAllCategories() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(CATEGORIES_STORE, 'readonly');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(CATEGORIES_STORE);
    const request = store.getAll();
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось прочитать категории.'));
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve((request.result || []).map(normalizeCategory));
    };

    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

async function getCategories(type) {
  const all = await readAllCategories();
  const group = all.filter((category) => category.type === type);

  return sortCategoryGroup(group);
}

async function getAllCategories() {
  const all = await readAllCategories();

  return [
    ...sortCategoryGroup(all.filter((category) => category.type === 'expense')),
    ...sortCategoryGroup(all.filter((category) => category.type === 'income'))
  ];
}

function getCategoryById(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(CATEGORIES_STORE, 'readonly');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(CATEGORIES_STORE);
    const request = store.get(id);
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось прочитать категорию.'));
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(request.result ? normalizeCategory(request.result) : null);
    };

    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function seedDefaultsIfEmpty() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(CATEGORIES_STORE);
    const request = store.getAll();
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось проверить категории.'));
    };

    request.onsuccess = () => {
      const existing = request.result || [];

      TRANSACTION_TYPES.forEach((type) => {
        const typeCategories = existing.filter((category) => category.type === type);

        if (typeCategories.length === 0) {
          DEFAULT_CATEGORIES[type].forEach((name) => {
            store.add({
              name,
              type,
              isSystem: name === SYSTEM_CATEGORY_NAME,
              monthlyLimit: null
            });
          });
        } else if (!typeCategories.some((category) => {
          return category.name === SYSTEM_CATEGORY_NAME;
        })) {
          store.add({
            name: SYSTEM_CATEGORY_NAME,
            type,
            isSystem: true,
            monthlyLimit: null
          });
        }
      });
    };

    request.onerror = () => fail(request.error);
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

function validateCategoryName(rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!name) {
    throw new Error('Название категории не может быть пустым.');
  }

  return name;
}

function categoryKey(type, name) {
  return `${type}\u0000${name.toLowerCase()}`;
}

function addCategory(name, type) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    if (!TRANSACTION_TYPES.includes(type)) {
      reject(new Error('Неизвестный тип категории.'));
      return;
    }

    let cleanName;

    try {
      cleanName = validateCategoryName(name);
    } catch (error) {
      reject(error);
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(CATEGORIES_STORE);
    const listRequest = store.getAll();
    let created = null;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось добавить категорию.'));
    };

    listRequest.onsuccess = () => {
      const exists = (listRequest.result || []).some((category) => {
        return (
          category.type === type &&
          String(category.name).trim().toLowerCase() === cleanName.toLowerCase()
        );
      });

      if (exists) {
        transaction.abort();
        fail(new Error('Категория с таким названием уже есть.'));
        return;
      }

      const addRequest = store.add({
        name: cleanName,
        type,
        isSystem: false,
        monthlyLimit: null
      });

      addRequest.onsuccess = () => {
        created = {
          id: addRequest.result,
          name: cleanName,
          type,
          isSystem: false,
          monthlyLimit: null
        };
      };
    };

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(created);
    };

    transaction.onerror = () => fail(transaction.error || listRequest.error);
    transaction.onabort = () => fail(transaction.error || listRequest.error);
  });
}

function renameCategory(id, newName) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction([CATEGORIES_STORE, STORE_NAME], 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
    const expensesStore = transaction.objectStore(STORE_NAME);
    const getRequest = categoriesStore.get(id);
    let updatedExpenses = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось переименовать категорию.'));
    };

    getRequest.onsuccess = () => {
      const category = getRequest.result;

      if (!category) {
        transaction.abort();
        fail(new Error('Категория не найдена.'));
        return;
      }

      if (isSystemCategory(category)) {
        transaction.abort();
        fail(new Error('Системную категорию нельзя переименовать.'));
        return;
      }

      let cleanName;

      try {
        cleanName = validateCategoryName(newName);
      } catch (error) {
        transaction.abort();
        fail(error);
        return;
      }

      const oldName = typeof category.name === 'string' ? category.name : '';
      const listRequest = categoriesStore.getAll();

      listRequest.onsuccess = () => {
        const exists = (listRequest.result || []).some((item) => {
          return (
            item.id !== id &&
            item.type === category.type &&
            String(item.name).trim().toLowerCase() === cleanName.toLowerCase()
          );
        });

        if (exists) {
          transaction.abort();
          fail(new Error('Категория с таким названием уже есть.'));
          return;
        }

        category.name = cleanName;
        categoriesStore.put(category);

        const cursorRequest = expensesStore.openCursor();

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;

          if (!cursor) {
            return;
          }

          const record = cursor.value;
          const recordType = record && record.type === 'income' ? 'income' : 'expense';

          if (recordType === category.type && record.category === oldName) {
            cursor.update({
              ...record,
              category: cleanName
            });
            updatedExpenses += 1;
          }

          cursor.continue();
        };
      };
    };

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ updatedExpenses });
    };

    transaction.onerror = () => fail(transaction.error || getRequest.error);
    transaction.onabort = () => fail(transaction.error || getRequest.error);
  });
}

function countCategoryUsage(category) {
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
      reject(error || new Error('Не удалось посчитать операции категории.'));
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }

      settled = true;

      const count = (request.result || []).filter((record) => {
        const recordType = record && record.type === 'income' ? 'income' : 'expense';

        return recordType === category.type && record.category === category.name;
      }).length;

      resolve(count);
    };

    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function deleteCategoryRecord(category, moveToOther) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction([CATEGORIES_STORE, STORE_NAME], 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
    const expensesStore = transaction.objectStore(STORE_NAME);
    let movedExpenses = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось удалить категорию.'));
    };

    try {
      categoriesStore.delete(category.id);

      if (moveToOther) {
        const cursorRequest = expensesStore.openCursor();

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;

          if (!cursor) {
            return;
          }

          const record = cursor.value;
          const recordType = record && record.type === 'income' ? 'income' : 'expense';

          if (recordType === category.type && record.category === category.name) {
            cursor.update({
              ...record,
              category: SYSTEM_CATEGORY_NAME
            });
            movedExpenses += 1;
          }

          cursor.continue();
        };
      }
    } catch (error) {
      try {
        transaction.abort();
      } catch (abortError) {
        // Транзакция уже завершилась — данные не менялись.
      }

      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ movedExpenses });
    };

    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

async function deleteCategory(id) {
  const category = await getCategoryById(id);

  if (!category) {
    throw new Error('Категория не найдена.');
  }

  if (isSystemCategory(category)) {
    throw new Error('Системную категорию нельзя удалить.');
  }

  const usage = await countCategoryUsage(category);
  const message = usage > 0
    ? `Категория используется в ${usage} операциях. Заменить их на «Другое» и удалить?`
    : `Удалить категорию «${category.name}»?`;

  if (!window.confirm(message)) {
    return false;
  }

  await deleteCategoryRecord(category, usage > 0);

  return true;
}

function validateCategoryLimitValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' && !value.trim()) {
    return null;
  }

  const raw = typeof value === 'string'
    ? value.trim().replace(/\s/g, '').replace(',', '.')
    : value;
  const number = Number(raw);

  if (
    !Number.isFinite(number) ||
    number <= 0 ||
    number > CATEGORY_LIMIT_MAX
  ) {
    throw new Error('Лимит должен быть числом больше 0 и не больше 100 000 000.');
  }

  return roundCurrency(number);
}

function getCategoryLimit(categoryName) {
  return getCategories('expense').then((categories) => {
    const category = categories.find((item) => item.name === categoryName);
    return category ? category.monthlyLimit : null;
  });
}

function setCategoryLimit(categoryId, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    if (!Number.isInteger(categoryId)) {
      reject(new Error('Категория не найдена.'));
      return;
    }

    let monthlyLimit;

    try {
      monthlyLimit = validateCategoryLimitValue(value);
    } catch (error) {
      reject(error);
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(CATEGORIES_STORE);
    const getRequest = store.get(categoryId);
    let updated = null;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось сохранить лимит.'));
    };

    getRequest.onsuccess = () => {
      const category = getRequest.result;

      if (!category) {
        transaction.abort();
        fail(new Error('Категория не найдена.'));
        return;
      }

      if (category.type !== 'expense') {
        transaction.abort();
        fail(new Error('Лимиты доступны только для расходных категорий.'));
        return;
      }

      const updatedRecord = {
        ...category,
        monthlyLimit
      };
      const putRequest = store.put(updatedRecord);

      putRequest.onsuccess = () => {
        updated = normalizeCategory(updatedRecord);
      };
    };

    getRequest.onerror = () => fail(getRequest.error);
    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(updated);
    };
    transaction.onerror = () => fail(transaction.error || getRequest.error);
    transaction.onabort = () => fail(transaction.error || getRequest.error);
  });
}

async function getMonthLimitStats() {
  const categories = await getAllCategories();
  const today = getTodayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const spentByCategory = new Map();

  expenses.forEach((expense) => {
    if (getTransactionType(expense) !== 'expense' || expense.isAdjustment === true) {
      return;
    }

    if (typeof expense.date !== 'string') {
      return;
    }

    if (expense.date < monthStart || expense.date > today) {
      return;
    }

    const amount = Number(expense.amount);

    if (!Number.isFinite(amount)) {
      return;
    }

    const current = spentByCategory.get(expense.category) || 0;
    spentByCategory.set(expense.category, current + amount);
  });

  return categories
    .filter((category) => {
      return category.type === 'expense' && category.monthlyLimit !== null;
    })
    .map((category) => {
      const limit = category.monthlyLimit;
      const spent = roundCurrency(spentByCategory.get(category.name) || 0);
      const remaining = roundCurrency(limit - spent);

      return {
        category,
        limit,
        spent,
        remaining,
        percent: (spent / limit) * 100,
        over: spent > limit
      };
    })
    .sort((left, right) => {
      return right.percent - left.percent
        || left.category.name.localeCompare(right.category.name, 'ru');
    });
}

function getLimitColor(percent) {
  if (percent > 100) {
    return '#e74c3c';
  }

  if (percent > 70) {
    return '#f39c12';
  }

  return '#27ae60';
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

function getSettings(keys) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    const requestedKeys = Array.isArray(keys) ? [...new Set(keys)] : [];

    if (requestedKeys.length === 0) {
      resolve({});
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
    const values = {};
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось прочитать настройки.'));
    };

    requestedKeys.forEach((key) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;

        values[key] = record ? record.value : null;
      };
      request.onerror = () => fail(request.error);
    });

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(values);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function setSettings(values) {
  return new Promise((resolve, reject) => {
    if (!values || typeof values !== 'object') {
      resolve();
      return;
    }

    const entries = Object.entries(values);

    if (entries.length === 0) {
      resolve();
      return;
    }

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
      reject(error || new Error('Не удалось сохранить настройки.'));
    };

    try {
      entries.forEach(([key, value]) => {
        if (value === undefined) {
          store.delete(key);
        } else {
          store.put({
            key,
            value
          });
        }
      });
    } catch (error) {
      try {
        transaction.abort();
      } catch (abortError) {
        // Транзакция уже завершилась — настройки не изменились.
      }

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

function createQuickTemplateId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeStoredQuickTemplate(record, index) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return null;
  }

  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const amount = Number(record.amount);
  const roundedAmount = roundCurrency(amount);
  const type = TRANSACTION_TYPES.includes(record.type) ? record.type : '';
  const category = typeof record.category === 'string' ? record.category.trim() : '';
  const note = typeof record.note === 'string' ? record.note.trim() : '';

  if (
    !label ||
    label.length > QUICK_TEMPLATE_LABEL_MAX ||
    !Number.isFinite(amount) ||
    roundedAmount <= 0 ||
    !type ||
    !category
  ) {
    return null;
  }

  const order = Number.isFinite(Number(record.order)) ? Number(record.order) : index;
  const id = typeof record.id === 'string' && record.id.trim()
    ? record.id.trim()
    : createQuickTemplateId();

  return {
    id,
    label,
    amount: roundedAmount,
    type,
    category,
    note: note || label,
    enabled: record.enabled !== false,
    order
  };
}

async function getQuickTemplates() {
  const values = await getSettings([QUICK_TEMPLATES_KEY]);
  const rawList = Array.isArray(values[QUICK_TEMPLATES_KEY])
    ? values[QUICK_TEMPLATES_KEY]
    : [];
  const usedIds = new Set();
  const normalized = [];

  rawList.forEach((record, index) => {
    const template = normalizeStoredQuickTemplate(record, index);

    if (!template) {
      return;
    }

    if (usedIds.has(template.id)) {
      template.id = createQuickTemplateId();
    }

    usedIds.add(template.id);
    normalized.push({ template, index });
  });

  normalized.sort((left, right) => {
    return left.template.order - right.template.order || left.index - right.index;
  });

  return normalized.map((entry) => entry.template);
}

async function saveQuickTemplates(list) {
  const source = Array.isArray(list) ? list : [];
  const normalized = source.map((template, index) => ({
    ...template,
    order: index
  }));

  await setSettings({
    [QUICK_TEMPLATES_KEY]: normalized
  });

  return normalized;
}

async function validateQuickTemplateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Некорректные данные шаблона.');
  }

  const label = typeof input.label === 'string' ? input.label.trim() : '';

  if (!label) {
    throw new Error('Введите название шаблона.');
  }

  if (label.length > QUICK_TEMPLATE_LABEL_MAX) {
    throw new Error(`Название должно быть не длиннее ${QUICK_TEMPLATE_LABEL_MAX} символов.`);
  }

  const rawAmount = typeof input.amount === 'string'
    ? input.amount.trim().replace(',', '.')
    : input.amount;
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Сумма должна быть больше 0.');
  }

  const roundedAmount = roundCurrency(amount);

  if (roundedAmount <= 0) {
    throw new Error('Сумма должна быть больше 0.');
  }

  const type = TRANSACTION_TYPES.includes(input.type) ? input.type : '';

  if (!type) {
    throw new Error('Выберите тип шаблона.');
  }

  const category = typeof input.category === 'string' ? input.category.trim() : '';

  if (!category) {
    throw new Error('Выберите категорию.');
  }

  const categories = await getCategories(type);
  const categoryExists = categories.some((item) => item.name === category);

  if (!categoryExists) {
    throw new Error(`Категория "${category}" не существует. Выберите другую.`);
  }

  const note = typeof input.note === 'string' ? input.note.trim() : '';

  return {
    label,
    amount: roundedAmount,
    type,
    category,
    note: note || label,
    enabled: input.enabled !== false
  };
}

async function addQuickTemplate(template) {
  const list = await getQuickTemplates();
  const prepared = await validateQuickTemplateInput(template);
  const created = {
    ...prepared,
    id: createQuickTemplateId(),
    order: list.length
  };

  await saveQuickTemplates([...list, created]);

  return created;
}

async function updateQuickTemplate(id, patch) {
  const list = await getQuickTemplates();
  const index = list.findIndex((template) => template.id === id);

  if (index < 0) {
    throw new Error('Шаблон не найден.');
  }

  const merged = {
    ...list[index],
    ...(patch && typeof patch === 'object' ? patch : {})
  };
  const prepared = await validateQuickTemplateInput(merged);
  const updated = {
    ...prepared,
    id: list[index].id,
    order: list[index].order
  };

  list[index] = updated;
  await saveQuickTemplates(list);

  return updated;
}

async function setQuickTemplateEnabled(id, enabled) {
  const list = await getQuickTemplates();
  const index = list.findIndex((template) => template.id === id);

  if (index < 0) {
    throw new Error('Шаблон не найден.');
  }

  const updated = {
    ...list[index],
    enabled: enabled === true
  };

  list[index] = updated;
  await saveQuickTemplates(list);

  return updated;
}

async function deleteQuickTemplate(id) {
  const list = await getQuickTemplates();
  const index = list.findIndex((template) => template.id === id);

  if (index < 0) {
    return null;
  }

  const [removed] = list.splice(index, 1);
  await saveQuickTemplates(list);

  return removed;
}

async function reorderQuickTemplate(id, direction) {
  const list = await getQuickTemplates();
  const index = list.findIndex((template) => template.id === id);

  if (index < 0) {
    return list;
  }

  const targetIndex = direction === 'up'
    ? index - 1
    : (direction === 'down' ? index + 1 : index);

  if (targetIndex === index || targetIndex < 0 || targetIndex >= list.length) {
    return list;
  }

  const [template] = list.splice(index, 1);
  list.splice(targetIndex, 0, template);
  await saveQuickTemplates(list);

  return list;
}

async function renameQuickTemplateCategory(type, oldName, newName) {
  const list = await getQuickTemplates();
  let changed = false;

  const updated = list.map((template) => {
    if (template.type === type && template.category === oldName) {
      changed = true;
      return {
        ...template,
        category: newName
      };
    }

    return template;
  });

  if (changed) {
    await saveQuickTemplates(updated);
  }
}

async function applyQuickTemplate(template) {
  if (!template || typeof template !== 'object') {
    return null;
  }

  const categories = await getCategories(template.type);
  const matchingCategory = categories.find((item) => {
    return categoryKey(item.type, item.name) === categoryKey(template.type, template.category);
  });

  if (!matchingCategory) {
    alert(`Категория "${template.category}" удалена, обновите шаблон`);
    return null;
  }

  const prepared = await validateQuickTemplateInput({
    ...template,
    category: matchingCategory.name
  });

  await settlePendingUndoForNewAction();

  const expense = {
    amount: prepared.amount,
    note: prepared.note,
    category: prepared.category,
    date: getTodayISO(),
    type: prepared.type,
    createdAt: new Date().toISOString()
  };
  const id = await addExpense(expense);
  const created = { id, ...expense };

  expenses.push(created);

  startPendingUndo({
    kind: 'quick-add',
    toastText: `Добавлено: ${prepared.label} ${formatAmount(prepared.amount)}`,
    renderAfterCommit: false,
    undoErrorMessage: 'Не удалось отменить добавление. Проверьте доступ к хранилищу.',
    undo: async () => {
      await deleteExpenseRecord(id);
      expenses = expenses.filter((item) => item.id !== id);

      if (editingExpenseId === id) {
        await resetFormToAdd();
      }

      await render(expenses);
    },
    commit: async () => {}
  });

  await render(expenses);

  return created;
}

function loadStoredPreferences() {
  return getSettings([
    'lastBackupAt',
    'backupBannerHiddenUntil',
    'pinHash',
    'pinSalt',
    'pinEnabled',
    'biometricEnabled',
    'credentialId'
  ]).then((values) => {
    const pinHash = typeof values.pinHash === 'string' ? values.pinHash : '';
    const pinSalt = typeof values.pinSalt === 'string' ? values.pinSalt : '';
    const pinEnabled = values.pinEnabled === true && Boolean(pinHash) && Boolean(pinSalt);

    lastBackupAt = typeof values.lastBackupAt === 'string' ? values.lastBackupAt : null;
    backupBannerHiddenUntil = typeof values.backupBannerHiddenUntil === 'string'
      ? values.backupBannerHiddenUntil
      : null;
    securityState = {
      pinEnabled,
      pinHash,
      pinSalt,
      biometricEnabled: pinEnabled && values.biometricEnabled === true,
      credentialId: typeof values.credentialId === 'string' ? values.credentialId : ''
    };
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

function updateExpense(id, data) {
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
    const getRequest = store.get(id);
    let updatedRecord = null;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось обновить операцию.'));
    };

    getRequest.onsuccess = () => {
      const existing = getRequest.result;

      if (!existing) {
        transaction.abort();
        fail(new Error('Операция не найдена.'));
        return;
      }

      const fields = data && typeof data === 'object' ? data : {};
      const updated = {
        ...existing,
        ...fields,
        id: existing.id,
        createdAt: existing.createdAt
      };

      let putRequest;

      try {
        putRequest = store.put(updated);
      } catch (error) {
        transaction.abort();
        fail(error);
        return;
      }

      updatedRecord = updated;
      putRequest.onerror = () => fail(putRequest.error);
    };

    getRequest.onerror = () => fail(getRequest.error);
    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(normalizeTransaction(updatedRecord));
    };
    transaction.onerror = () => fail(transaction.error || getRequest.error);
    transaction.onabort = () => fail(transaction.error || getRequest.error);
  });
}

function deleteExpenseRecord(id) {
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

function replaceAllData(data) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(
        [STORE_NAME, SETTINGS_STORE, CATEGORIES_STORE],
        'readwrite'
      );
    } catch (error) {
      reject(error);
      return;
    }

    const store = transaction.objectStore(STORE_NAME);
    const settingsStore = transaction.objectStore(SETTINGS_STORE);
    const categoriesStore = transaction.objectStore(CATEGORIES_STORE);
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
      categoriesStore.clear();
      store.clear();

      (data.categories || []).forEach((category) => {
        categoriesStore.add({
          name: category.name,
          type: category.type,
          isSystem: isSystemCategory(category),
          monthlyLimit: category.type === 'expense'
            ? normalizeMonthlyLimit(category.monthlyLimit)
            : null
        });
      });

      (data.items || []).forEach((item) => {
        store.add({
          amount: item.amount,
          note: item.note,
          category: item.category,
          date: item.date,
          createdAt: typeof item.createdAt === 'string'
            ? item.createdAt
            : fallbackCreatedAt,
          type: item.type,
          isAdjustment: item.isAdjustment === true
        });
      });

      settingsStore.put({
        key: INITIAL_BALANCE_KEY,
        value: data.balance
      });

      if (Array.isArray(data.quickTemplates)) {
        settingsStore.put({
          key: QUICK_TEMPLATES_KEY,
          value: data.quickTemplates
        });
      }
    } catch (error) {
      try {
        transaction.abort();
      } catch (abortError) {
        // Транзакция уже завершилась — данные не менялись.
      }

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

function getExpenseAmount(expense) {
  const amount = Number(expense.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function compareExpensesByAmountDescending(a, b) {
  return getExpenseAmount(b) - getExpenseAmount(a) || compareExpenses(a, b);
}

function compareExpensesByAmountAscending(a, b) {
  return getExpenseAmount(a) - getExpenseAmount(b) || compareExpenses(a, b);
}

function sortExpensesForList(items) {
  const sorted = [...items];

  if (currentSort === 'date-asc') {
    sorted.sort(compareExpensesByDateAscending);
  } else if (currentSort === 'amount-desc') {
    sorted.sort(compareExpensesByAmountDescending);
  } else if (currentSort === 'amount-asc') {
    sorted.sort(compareExpensesByAmountAscending);
  } else {
    sorted.sort(compareExpenses);
  }

  return sorted;
}

function isAmountSort() {
  return currentSort === 'amount-desc' || currentSort === 'amount-asc';
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

function escapeHtml(value) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return String(value == null ? '' : value).replace(
    /[&<>"']/g,
    (character) => replacements[character]
  );
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

  if (period === 'custom') {
    const start = customRange ? parseISODate(customRange.from) : null;
    const end = customRange ? parseISODate(customRange.to) : null;

    if (!start || !end || start > end) {
      return { start: today, end: today };
    }

    return { start, end };
  }

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

function getSignedTransactionAmount(expense) {
  const amount = Number(expense.amount);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return getTransactionType(expense) === 'income' ? amount : -amount;
}

function getOpeningBalance(items, startIso) {
  let netBeforePeriod = 0;

  items.forEach((expense) => {
    const date = parseISODate(expense.date);

    if (!date || formatISODate(date) >= startIso) {
      return;
    }

    netBeforePeriod += getSignedTransactionAmount(expense);
  });

  const balance = Number(initialBalance);
  return roundCurrency((Number.isFinite(balance) ? balance : 0) + netBeforePeriod);
}

function buildBalanceSeries(chartData, openingBalance) {
  let runningBalance = roundCurrency(openingBalance);

  return chartData.map((point) => {
    const income = Number(point.income);
    const expense = Number(point.expense);
    const safeIncome = Number.isFinite(income) ? income : 0;
    const safeExpense = Number.isFinite(expense) ? expense : 0;

    runningBalance = roundCurrency(runningBalance + safeIncome - safeExpense);

    return {
      label: point.label,
      value: runningBalance
    };
  });
}

function getPreviousPeriodRange(range, period) {
  if (period === 'all') {
    return null;
  }

  const days = period === 'custom'
    ? countCalendarDays(range.start, range.end)
    : PERIOD_DAYS[period];

  if (!days) {
    return null;
  }

  const previousEnd = startOfDay(range.start);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  return {
    start: previousStart,
    end: previousEnd
  };
}

function calculateTotalsForRange(items, range) {
  const startIso = formatISODate(range.start);
  const endIso = formatISODate(range.end);
  const filtered = [];

  items.forEach((expense) => {
    const date = parseISODate(expense.date);

    if (!date) {
      return;
    }

    const isoDate = formatISODate(date);

    if (isoDate >= startIso && isoDate <= endIso) {
      filtered.push(expense);
    }
  });

  return calculateTotals(filtered);
}

function buildPeriodComparison(items, period, range, currentTotals) {
  if (period === 'all') {
    return null;
  }

  const previousRange = getPreviousPeriodRange(range, period);

  if (!previousRange) {
    return null;
  }

  const previousTotals = calculateTotalsForRange(items, previousRange);

  return {
    current: {
      expense: currentTotals.expenseTotal,
      income: currentTotals.incomeTotal,
      net: currentTotals.netFlow
    },
    prev: {
      expense: previousTotals.expenseTotal,
      income: previousTotals.incomeTotal,
      net: previousTotals.netFlow
    }
  };
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
  const openingBalance = getOpeningBalance(items, startIso);

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
      : SYSTEM_CATEGORY_NAME;
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
  let chartPeriod = period;
  let chartStartMonth = null;

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

    chartStartMonth = startMonth;
    chartData = buildMonthChartData(
      startMonth,
      endMonth,
      incomeByMonth,
      expenseByMonth
    );
  } else if (period === 'all' && filtered.length > 0) {
    const startMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

    chartStartMonth = startMonth;
    chartData = buildMonthChartData(
      startMonth,
      endMonth,
      incomeByMonth,
      expenseByMonth
    );
  } else if (period === 'custom') {
    const daySpan = countCalendarDays(range.start, range.end) - 1;

    if (daySpan <= CUSTOM_CHART_DAY_LIMIT) {
      chartPeriod = 'custom-days';
      chartData = buildDayChartData(
        range.start,
        range.end,
        incomeByDate,
        expenseByDate
      );
    } else {
      chartPeriod = 'custom-months';
      const startMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

      chartStartMonth = startMonth;
      chartData = buildMonthChartData(
        startMonth,
        endMonth,
        incomeByMonth,
        expenseByMonth
      );
    }
  }

  const daysInPeriod = countCalendarDays(range.start, range.end);
  const balanceGranularity = (
    period === 'year' ||
    period === 'all' ||
    chartPeriod === 'custom-months'
  ) ? 'month' : 'day';

  let balanceOpening = openingBalance;

  // На месячной шкале первая точка может быть позже начала периода.
  // Учитываем такие операции сразу, чтобы каждая точка была балансом на конец месяца.
  if (chartStartMonth) {
    const firstChartMonthIso = formatISODate(chartStartMonth);

    filtered.forEach((expense) => {
      const date = parseISODate(expense.date);

      if (!date || formatISODate(date) >= firstChartMonthIso) {
        return;
      }

      balanceOpening += getSignedTransactionAmount(expense);
    });

    balanceOpening = roundCurrency(balanceOpening);
  }

  let balanceSeries = buildBalanceSeries(chartData, balanceOpening);

  if (balanceSeries.length === 0) {
    balanceSeries = [{
      label: balanceGranularity === 'month'
        ? formatMonthLabel(range.end, false)
        : formatDayLabel(range.end),
      value: openingBalance
    }];
  }

  const comparison = buildPeriodComparison(items, period, range, {
    expenseTotal,
    incomeTotal,
    netFlow
  });

  return {
    filtered,
    expenseTotal,
    incomeTotal,
    netFlow,
    expenseByCategory: roundCategoryTotals(rawExpenseByCategory),
    incomeByCategory: roundCategoryTotals(rawIncomeByCategory),
    avgPerDay: expenseTotal / Math.max(1, daysInPeriod),
    chartData,
    chartPeriod,
    balanceSeries,
    balanceGranularity,
    comparison
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

  meta.append(category);

  if (expense.isAdjustment === true) {
    const adjustmentBadge = document.createElement('span');
    adjustmentBadge.className = 'expense-adjustment-badge';
    adjustmentBadge.textContent = 'корректировка';
    meta.append(adjustmentBadge);
  }

  const separator = document.createElement('span');
  separator.className = 'expense-separator';
  separator.setAttribute('aria-hidden', 'true');
  separator.textContent = '•';

  const date = document.createElement('time');
  date.className = 'expense-date';
  date.dateTime = expense.date;
  date.textContent = formatDate(expense.date);

  meta.append(separator, date);
  info.append(amount, meta);

  if (expense.note) {
    const note = document.createElement('p');
    note.className = 'expense-note';
    note.textContent = expense.note;
    info.append(note);
  }

  const actions = document.createElement('div');
  actions.className = 'expense-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'edit-button expense-action-button';
  editButton.dataset.id = String(expense.id);
  editButton.textContent = 'Изменить';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-button expense-action-button';
  deleteButton.dataset.id = String(expense.id);
  deleteButton.textContent = 'Удалить';

  actions.append(editButton, deleteButton);
  item.append(info, actions);
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

function renderBalanceLine() {
  updateBalance(calculateTotals(expenses));
}

function formatHomeOperationDate(isoDate) {
  if (isoDate === getTodayISO()) {
    return '';
  }

  const date = parseISODate(isoDate);

  if (!date) {
    return String(isoDate);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function createHomeOperationElement(expense) {
  const item = document.createElement('li');
  item.className = 'home-last-item';

  const type = getTransactionType(expense);
  const amount = document.createElement('span');
  amount.className = type === 'income'
    ? 'home-last-amount is-income'
    : 'home-last-amount';
  amount.textContent = formatSignedAmount(expense.amount, type);

  const label = document.createElement('span');
  label.className = 'home-last-label';
  label.textContent = expense.category || expense.note || SYSTEM_CATEGORY_NAME;

  const dateText = formatHomeOperationDate(expense.date);
  item.append(amount, label);

  if (dateText) {
    const date = document.createElement('time');
    date.className = 'home-last-date';
    date.dateTime = expense.date;
    date.textContent = dateText;
    item.append(date);
  }

  return item;
}

function renderHomeLastOperations(items = expenses) {
  const pendingDeleteId = getPendingExpenseDeleteId();
  const latest = [...items]
    .filter((expense) => expense.id !== pendingDeleteId)
    .sort(compareExpenses)
    .slice(0, 5);

  if (latest.length === 0) {
    homeLastList.replaceChildren();
    homeLastOperations.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  latest.forEach((expense) => {
    fragment.append(createHomeOperationElement(expense));
  });

  homeLastList.replaceChildren(fragment);
  homeLastOperations.hidden = false;
}

async function renderLimitsHome(container = homeLimitsList) {
  let stats;

  try {
    stats = await getMonthLimitStats();
  } catch (error) {
    homeLimits.hidden = true;
    container.replaceChildren();
    return;
  }

  if (stats.length === 0) {
    container.replaceChildren();
    homeLimits.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  stats.forEach((stat) => {
    const roundedPercent = Math.round(stat.percent);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `month-limit-row${stat.over ? ' is-over' : ''}`;
    row.dataset.limitCategory = stat.category.name;

    const top = document.createElement('span');
    top.className = 'month-limit-top';

    const name = document.createElement('span');
    name.className = 'month-limit-name';
    name.textContent = stat.category.name;

    const separator = document.createElement('span');
    separator.className = 'month-limit-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '·';

    const amounts = document.createElement('span');
    amounts.className = 'month-limit-amounts';
    amounts.textContent = `${amountFormatter.format(stat.spent)} / ${amountFormatter.format(stat.limit)} ₽`;

    const metrics = document.createElement('span');
    metrics.className = 'month-limit-metrics';

    const percent = document.createElement('span');
    percent.className = 'month-limit-percent';
    percent.textContent = `${roundedPercent}%`;
    metrics.append(percent);

    if (stat.over) {
      const over = document.createElement('span');
      over.className = 'month-limit-over';
      over.textContent = `+${formatAmount(Math.abs(stat.remaining))}`;
      metrics.append(over);
    }

    top.append(name, separator, amounts, metrics);

    const bar = document.createElement('span');
    bar.className = 'month-limit-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(Math.min(100, roundedPercent)));
    bar.setAttribute(
      'aria-label',
      `${stat.category.name}: потрачено ${formatAmount(stat.spent)} из ${formatAmount(stat.limit)}`
    );

    const fill = document.createElement('span');
    fill.className = 'month-limit-progress-fill';
    fill.style.width = `${Math.min(100, Math.max(0, stat.percent))}%`;
    fill.style.backgroundColor = getLimitColor(stat.percent);
    bar.append(fill);

    row.append(top, bar);
    fragment.append(row);
  });

  container.replaceChildren(fragment);
  homeLimits.hidden = false;
}

async function renderHome(items = expenses) {
  updateTotal(items);
  renderHomeLastOperations(items);
  updateBackupBanner();
  updateLastBackupStatusLine();
  await renderLimitsHome();
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
  } else if (period === 'month' || period === 'custom-days') {
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

function renderBalanceChart(container, series, period = 'month') {
  container.replaceChildren();

  const points = Array.isArray(series)
    ? series
      .map((point) => ({
        label: point && point.label != null ? String(point.label) : '',
        value: Number(point && point.value)
      }))
      .filter((point) => Number.isFinite(point.value))
    : [];
  const hasValues = points.some((point) => point.value !== 0);

  if (points.length === 0 || !hasValues) {
    const message = document.createElement('p');
    message.className = 'stats-chart-empty';
    message.textContent = 'Нет данных за период';
    container.append(message);
    return;
  }

  const width = Math.max(1, Math.round(container.clientWidth || 320));
  const height = Math.max(1, Math.round(container.clientHeight || 180));
  const chartLeft = 62;
  const chartRight = width - 8;
  const chartTop = 14;
  const chartBottom = height - 28;
  const plotWidth = Math.max(1, chartRight - chartLeft);
  const plotHeight = Math.max(1, chartBottom - chartTop);

  const rawMin = points.reduce(
    (min, point) => Math.min(min, point.value),
    points[0].value
  );
  const rawMax = points.reduce(
    (max, point) => Math.max(max, point.value),
    points[0].value
  );

  let scaleMin = rawMin;
  let scaleMax = rawMax;

  if (rawMin === rawMax) {
    const padding = Math.max(Math.abs(rawMin) * 0.1, 1);

    scaleMin = rawMin - padding;
    scaleMax = rawMax + padding;

    if (rawMin < 0) {
      scaleMax = Math.max(scaleMax, 0);
    }
  } else if (rawMin < 0) {
    scaleMax = Math.max(rawMax, 0);
  }

  if (scaleMin === scaleMax) {
    scaleMin -= 1;
    scaleMax += 1;
  }

  const scaleSpan = scaleMax - scaleMin;
  const yFor = (value) => (
    chartBottom - ((value - scaleMin) / scaleSpan) * plotHeight
  );
  const xFor = (index) => (
    points.length === 1
      ? chartLeft + plotWidth / 2
      : chartLeft + (plotWidth * index) / (points.length - 1)
  );

  const linePoints = points.length === 1
    ? [
      { x: chartLeft, y: yFor(points[0].value) },
      { x: chartRight, y: yFor(points[0].value) }
    ]
    : points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point.value)
    }));

  const svg = document.createElementNS(SVG_NS, 'svg');
  const chartDescription = period === 'year' ||
    period === 'all' ||
    period === 'custom-months'
    ? 'по месяцам'
    : 'по дням';

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `График накопленного баланса ${chartDescription}`);

  const area = document.createElementNS(SVG_NS, 'polygon');
  const areaPoints = [
    `${linePoints[0].x.toFixed(2)},${chartBottom.toFixed(2)}`,
    ...linePoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`),
    `${linePoints[linePoints.length - 1].x.toFixed(2)},${chartBottom.toFixed(2)}`
  ];

  area.setAttribute('points', areaPoints.join(' '));
  area.setAttribute('fill', '#2c3e50');
  area.setAttribute('fill-opacity', '0.12');
  area.classList.add('balance-chart-area');
  svg.append(area);

  if (rawMin < 0) {
    const zeroLine = document.createElementNS(SVG_NS, 'line');

    zeroLine.setAttribute('x1', chartLeft.toFixed(2));
    zeroLine.setAttribute('x2', chartRight.toFixed(2));
    zeroLine.setAttribute('y1', yFor(0).toFixed(2));
    zeroLine.setAttribute('y2', yFor(0).toFixed(2));
    zeroLine.setAttribute('stroke', '#e74c3c');
    zeroLine.setAttribute('stroke-width', '1.5');
    zeroLine.setAttribute('stroke-dasharray', '4 3');
    zeroLine.classList.add('balance-chart-zero-line');
    svg.append(zeroLine);
  }

  const line = document.createElementNS(SVG_NS, 'polyline');

  line.setAttribute('points', linePoints
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#2c3e50');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linejoin', 'round');
  line.classList.add('balance-chart-line');
  svg.append(line);

  const maxLabel = document.createElementNS(SVG_NS, 'text');
  maxLabel.setAttribute('x', '4');
  maxLabel.setAttribute('y', (chartTop + CHART_FONT_SIZE - 1).toFixed(2));
  maxLabel.setAttribute('text-anchor', 'start');
  maxLabel.setAttribute('fill', '#666666');
  maxLabel.setAttribute('font-size', String(CHART_FONT_SIZE));
  maxLabel.classList.add('balance-chart-y-label');
  maxLabel.textContent = amountFormatter.format(rawMax);
  svg.append(maxLabel);

  const minLabel = document.createElementNS(SVG_NS, 'text');
  minLabel.setAttribute('x', '4');
  minLabel.setAttribute('y', (chartBottom + CHART_FONT_SIZE - 1).toFixed(2));
  minLabel.setAttribute('text-anchor', 'start');
  minLabel.setAttribute('fill', '#666666');
  minLabel.setAttribute('font-size', String(CHART_FONT_SIZE));
  minLabel.classList.add('balance-chart-y-label');
  minLabel.textContent = amountFormatter.format(rawMin);
  svg.append(minLabel);

  const labelIndices = getChartLabelIndices(points, period, plotWidth);

  labelIndices.forEach((index) => {
    const text = document.createElementNS(SVG_NS, 'text');
    const x = points.length === 1
      ? chartLeft + plotWidth / 2
      : chartLeft + (plotWidth * index) / (points.length - 1);

    text.setAttribute('x', x.toFixed(2));
    text.setAttribute('y', (height - 8).toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#666666');
    text.setAttribute('font-size', String(CHART_FONT_SIZE));
    text.classList.add('balance-chart-label');
    text.textContent = points[index].label;
    svg.append(text);
  });

  container.append(svg);

  const labelElements = Array.from(svg.querySelectorAll('.balance-chart-label'));
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

function formatComparisonDifference(value) {
  const amount = roundCurrency(Number(value) || 0);

  if (amount === 0) {
    return formatAmount(0);
  }

  return `${amount > 0 ? '+' : '−'}${formatAmount(Math.abs(amount))}`;
}

function getComparisonChange(metric, current, previous) {
  const difference = roundCurrency(current - previous);

  if (previous === 0) {
    if (current === 0) {
      return {
        arrow: '→',
        tone: 'neutral',
        text: 'без изменений'
      };
    }

    if (current > 0) {
      const positiveLabel = metric === 'expense'
        ? 'новые траты'
        : metric === 'income'
          ? 'новые доходы'
          : 'новый поток';

      return {
        arrow: '↑',
        tone: metric === 'expense' ? 'bad' : 'good',
        text: `${positiveLabel} / ${formatComparisonDifference(difference)}`
      };
    }

    return {
      arrow: '↓',
      tone: 'bad',
      text: `отрицательный поток / ${formatComparisonDifference(difference)}`
    };
  }

  if (difference === 0) {
    return {
      arrow: '→',
      tone: 'neutral',
      text: '0% / 0 ₽'
    };
  }

  const grew = difference > 0;
  const tone = metric === 'expense'
    ? (grew ? 'bad' : 'good')
    : (grew ? 'good' : 'bad');
  const percent = Math.abs(Math.round((difference / Math.abs(previous)) * 100));

  return {
    arrow: grew ? '↑' : '↓',
    tone,
    text: `${percent}% / ${formatComparisonDifference(difference)}`
  };
}

function getComparisonMetricRows(comparison) {
  if (!comparison || !comparison.current || !comparison.prev) {
    return [];
  }

  const metrics = [
    {
      key: 'expense',
      label: 'Расходы:',
      current: comparison.current.expense,
      previous: comparison.prev.expense
    },
    {
      key: 'income',
      label: 'Доходы:',
      current: comparison.current.income,
      previous: comparison.prev.income
    },
    {
      key: 'net',
      label: 'Чистый поток:',
      current: comparison.current.net,
      previous: comparison.prev.net
    }
  ];

  return metrics.map((metric) => {
    const current = Number(metric.current);
    const previous = Number(metric.previous);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const safePrevious = Number.isFinite(previous) ? previous : 0;

    return {
      key: metric.key,
      label: metric.label,
      current: safeCurrent,
      currentText: metric.key === 'net'
        ? formatNetAmount(safeCurrent)
        : formatAmount(safeCurrent),
      change: getComparisonChange(metric.key, safeCurrent, safePrevious)
    };
  });
}

function renderComparison(container, comparison) {
  container.replaceChildren();

  const rows = getComparisonMetricRows(comparison);

  if (rows.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  const title = document.createElement('span');
  title.className = 'stats-label comparison-title';
  title.textContent = 'Сравнение с прошлым периодом';

  const list = document.createElement('div');
  list.className = 'comparison-list';

  rows.forEach((metric) => {
    const change = metric.change;
    const row = document.createElement('div');
    const label = document.createElement('span');
    const values = document.createElement('span');
    const currentValue = document.createElement('strong');
    const detail = document.createElement('span');
    const arrow = document.createElement('span');

    row.className = 'comparison-row';
    label.className = 'comparison-label';
    label.textContent = metric.label;
    values.className = 'comparison-values';
    currentValue.className = 'comparison-current';
    currentValue.textContent = metric.currentText;
    detail.className = 'comparison-change';
    arrow.className = `comparison-arrow comparison-arrow--${change.tone}`;
    arrow.textContent = change.arrow;
    detail.append(
      document.createTextNode('('),
      arrow,
      document.createTextNode(` ${change.text})`)
    );
    values.append(currentValue, document.createTextNode(' '), detail);
    row.append(label, document.createTextNode(' '), values);

    if (list.childNodes.length > 0) {
      list.append(document.createTextNode(' '));
    }

    list.append(row);
  });

  container.append(title, document.createTextNode(' '), list);
}

function renderLimitsInStats(container, limitStat) {
  const details = document.createElement('div');
  details.className = 'stats-limit-details';

  const bar = document.createElement('div');
  bar.className = 'month-limit-progress stats-limit-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(Math.min(100, Math.round(limitStat.percent))));
  bar.setAttribute(
    'aria-label',
    `${limitStat.category.name}: потрачено ${formatAmount(limitStat.spent)} из ${formatAmount(limitStat.limit)}`
  );

  const fill = document.createElement('span');
  fill.className = 'month-limit-progress-fill';
  fill.style.width = `${Math.min(100, Math.max(0, limitStat.percent))}%`;
  fill.style.backgroundColor = getLimitColor(limitStat.percent);
  bar.append(fill);

  const caption = document.createElement('span');
  caption.className = limitStat.over
    ? 'stats-limit-caption is-over'
    : 'stats-limit-caption';
  caption.textContent = limitStat.over
    ? `перерасход: +${formatAmount(Math.abs(limitStat.remaining))}`
    : `из ${formatAmount(limitStat.limit)}`;

  details.append(bar, caption);
  container.append(details);
}

function renderCategoryBreakdown(container, list, categories, total, limitStats) {
  const entries = Object.entries(categories)
    .filter(([, sum]) => Number.isFinite(sum) && sum > 0)
    .sort((a, b) => b[1] - a[1]);
  const fragment = document.createDocumentFragment();

  entries.forEach(([category, sum]) => {
    const item = document.createElement('li');
    item.className = 'stats-category';

    const main = document.createElement('div');
    main.className = 'stats-category-main';

    const name = document.createElement('span');
    name.className = 'stats-category-name';
    name.textContent = `${category} —`;

    const value = document.createElement('span');
    value.className = 'stats-category-value';

    const percent = total > 0
      ? Math.round((sum / total) * 100)
      : 0;

    value.textContent = `${formatAmount(sum)} (${percent}%)`;

    main.append(name, value);
    item.append(main);

    if (limitStats && limitStats.has(category)) {
      renderLimitsInStats(item, limitStats.get(category));
    }

    fragment.append(item);
  });

  list.replaceChildren(fragment);
  list.hidden = entries.length === 0;
  container.hidden = entries.length === 0;

  return entries.length;
}

function updateStatsVisibility(hasData) {
  statsTabEmpty.hidden = hasData;
  statsPeriodControls.hidden = !hasData;
  statsPanel.hidden = !hasData;
}

async function renderStats(result) {
  const netFlow = result.netFlow;

  updateStatsVisibility(true);
  statsExpense.textContent = formatAmount(result.expenseTotal);
  statsIncome.textContent = formatAmount(result.incomeTotal);
  statsNet.textContent = formatNetAmount(netFlow);
  statsNet.classList.toggle('is-income', netFlow >= 0);
  statsNet.classList.toggle('is-expense', netFlow < 0);
  statsAvg.textContent = formatAmount(result.avgPerDay);

  let limitStatsByName = new Map();

  try {
    const monthLimitStats = await getMonthLimitStats();
    limitStatsByName = new Map(
      monthLimitStats.map((stat) => [stat.category.name, stat])
    );
  } catch (error) {
    limitStatsByName = new Map();
  }

  const expenseCount = renderCategoryBreakdown(
    statsExpenseGroup,
    statsExpenseCategories,
    result.expenseByCategory,
    result.expenseTotal,
    limitStatsByName
  );
  const incomeCount = renderCategoryBreakdown(
    statsIncomeGroup,
    statsIncomeCategories,
    result.incomeByCategory,
    result.incomeTotal
  );

  statsEmpty.hidden = expenseCount + incomeCount > 0;

  lastChartData = result.chartData;
  lastChartPeriod = result.chartPeriod || currentPeriod;
  renderBarChart(statsChart, result.chartData, lastChartPeriod);

  balanceChartTitle.textContent = result.balanceGranularity === 'month'
    ? 'Баланс по месяцам'
    : 'Баланс по дням';

  lastBalanceSeries = result.balanceSeries;
  lastBalancePeriod = result.chartPeriod || currentPeriod;
  renderBalanceChart(statsBalanceChart, result.balanceSeries, lastBalancePeriod);
  renderComparison(statsComparison, result.comparison);
}

function getActiveStatsPeriod() {
  return customRange ? 'custom' : currentPeriod;
}

function updatePeriodTabs() {
  periodTabs.querySelectorAll('[data-period]').forEach((tab) => {
    const isActive = !customRange && tab.dataset.period === currentPeriod;

    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function updateStatsPeriodLabel() {
  if (!customRange) {
    statsPeriodLabel.textContent = '';
    statsPeriodLabel.hidden = true;
    return;
  }

  const from = parseISODate(customRange.from);
  const to = parseISODate(customRange.to);

  if (!from || !to) {
    statsPeriodLabel.textContent = '';
    statsPeriodLabel.hidden = true;
    return;
  }

  statsPeriodLabel.textContent = `Период: ${dateFormatter.format(from)} — ${dateFormatter.format(to)}`;
  statsPeriodLabel.hidden = false;
}

function clearCustomRangeError() {
  customRangeError.textContent = '';
  customRangeError.hidden = true;
}

function showCustomRangeError(message) {
  customRangeError.textContent = message;
  customRangeError.hidden = false;
}

function getCustomRangeValidationError(from, to) {
  if (!from || !to) {
    return 'Выберите обе даты.';
  }

  if (!isValidDate(from) || !isValidDate(to)) {
    return 'Введите корректные даты.';
  }

  if (from > to) {
    return 'Начальная дата не может быть позже конечной.';
  }

  return '';
}

function clearCustomRangeFields() {
  customFromInput.value = '';
  customToInput.value = '';
  clearCustomRangeError();
}

function applyCustomRange() {
  const from = customFromInput.value;
  const to = customToInput.value;
  const error = getCustomRangeValidationError(from, to);

  if (error) {
    showCustomRangeError(error);
    return;
  }

  customRange = { from, to };
  clearCustomRangeError();
  updatePeriodTabs();
  updateStatsPeriodLabel();
  refreshStats();
}

function resetCustomRange() {
  customRange = null;
  clearCustomRangeFields();
  updatePeriodTabs();
  updateStatsPeriodLabel();
  refreshStats();
}

function initCustomPeriod() {
  customApplyButton.addEventListener('click', applyCustomRange);
  customResetButton.addEventListener('click', resetCustomRange);

  [customFromInput, customToInput].forEach((input) => {
    input.addEventListener('input', clearCustomRangeError);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyCustomRange();
      }
    });
  });

  updatePeriodTabs();
  updateStatsPeriodLabel();
}

function markStatsDirty() {
  statsDirty = true;
}

async function refreshStats() {
  const requestId = ++statsRequestId;

  try {
    const allExpenses = await getAllExpenses();

    if (requestId !== statsRequestId) {
      return;
    }

    if (allExpenses.length === 0) {
      lastChartData = null;
      lastBalanceSeries = null;
      updateStatsVisibility(false);
      statsDirty = false;
      statsRenderedDay = getTodayISO();
      return;
    }

    await renderStats(aggregate(allExpenses, getActiveStatsPeriod()));
    statsDirty = false;
    statsRenderedDay = getTodayISO();
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
  customRange = null;
  clearCustomRangeFields();
  updatePeriodTabs();
  updateStatsPeriodLabel();
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

async function renderCategoryFilter() {
  const categories = await getAllCategories();
  const names = [...new Set(categories.map((category) => category.name))];
  const fragment = document.createDocumentFragment();
  const allOption = document.createElement('option');

  allOption.value = '';
  allOption.textContent = 'Все категории';
  fragment.append(allOption);

  names.forEach((name) => {
    const option = document.createElement('option');

    option.value = name;
    option.textContent = name;
    fragment.append(option);
  });

  categoryFilter.replaceChildren(fragment);

  if (currentFilter && names.includes(currentFilter)) {
    categoryFilter.value = currentFilter;
  } else {
    currentFilter = '';
    categoryFilter.value = '';
  }
}

function initCategoryFilter() {
  categoryFilter.addEventListener('change', () => {
    currentFilter = categoryFilter.value;
    renderExpenseList(expenses);
  });
}

function matchesExpenseSearch(expense, query) {
  if (!query) {
    return true;
  }

  const note = expense.note == null ? '' : String(expense.note).toLowerCase();
  const category = expense.category == null ? '' : String(expense.category).toLowerCase();
  const amount = expense.amount == null ? '' : String(expense.amount).toLowerCase();

  return note.includes(query) || category.includes(query) || amount.includes(query);
}

function hasActiveListFilters() {
  return Boolean(currentSearch.trim() || currentFilter);
}

function getVisibleExpenses(items) {
  const pendingDeleteId = getPendingExpenseDeleteId();
  const query = currentSearch.trim().toLowerCase();

  return items.filter((expense) => {
    if (expense.id === pendingDeleteId) {
      return false;
    }

    if (currentFilter && expense.category !== currentFilter) {
      return false;
    }

    return matchesExpenseSearch(expense, query);
  });
}

function getYesterdayISO() {
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  return formatISODate(yesterday);
}

function getExpenseDateGroupTitle(isoDate, todayIso, yesterdayIso) {
  if (isoDate === todayIso) {
    return 'Сегодня';
  }

  if (isoDate === yesterdayIso) {
    return 'Вчера';
  }

  const date = parseISODate(isoDate);

  if (!date) {
    return String(isoDate);
  }

  return `${date.getDate()} ${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

function createExpenseGroup(date, groupItems, todayIso, yesterdayIso) {
  const section = document.createElement('section');
  section.className = 'expense-group';

  const title = document.createElement('h3');
  title.className = 'expense-group-title';
  title.textContent = getExpenseDateGroupTitle(date, todayIso, yesterdayIso);

  const list = document.createElement('ul');
  list.className = 'expense-items';

  groupItems.forEach((expense) => {
    list.append(createExpenseElement(expense));
  });

  section.append(title, list);
  return section;
}

function createFlatExpenseList(sortedExpenses) {
  const list = document.createElement('ul');
  list.className = 'expense-items';

  sortedExpenses.forEach((expense) => {
    list.append(createExpenseElement(expense));
  });

  return list;
}

function updateExpenseEmptyState(items, visibleCount) {
  if (visibleCount > 0) {
    emptyState.hidden = true;
    return;
  }

  const hasFilters = hasActiveListFilters();
  emptyState.textContent = items.length > 0 || hasFilters
    ? 'Ничего не найдено.'
    : 'Пока нет операций. Добавьте первую на вкладке «Главная».';
  emptyState.hidden = false;
}

function renderExpenseList(items) {
  const visibleExpenses = getVisibleExpenses(items);
  const sortedExpenses = sortExpensesForList(visibleExpenses);

  if (sortedExpenses.length === 0) {
    expenseList.replaceChildren();
    updateExpenseEmptyState(items, 0);
    return;
  }

  const fragment = document.createDocumentFragment();

  if (isAmountSort()) {
    fragment.append(createFlatExpenseList(sortedExpenses));
  } else {
    const todayIso = getTodayISO();
    const yesterdayIso = getYesterdayISO();
    const groups = new Map();

    sortedExpenses.forEach((expense) => {
      if (!groups.has(expense.date)) {
        groups.set(expense.date, []);
      }

      groups.get(expense.date).push(expense);
    });

    groups.forEach((groupItems, date) => {
      fragment.append(createExpenseGroup(date, groupItems, todayIso, yesterdayIso));
    });
  }

  expenseList.replaceChildren(fragment);
  updateExpenseEmptyState(items, sortedExpenses.length);
}

function initExpenseListControls() {
  currentSort = EXPENSE_SORTS.includes(currentSort) ? currentSort : 'date-desc';
  currentSearch = expenseSearchInput.value;
  expenseSortSelect.value = currentSort;

  const handleSearch = () => {
    currentSearch = expenseSearchInput.value;
    renderExpenseList(expenses);
  };

  expenseSearchInput.addEventListener('input', handleSearch);
  expenseSearchInput.addEventListener('search', handleSearch);
  expenseSortSelect.addEventListener('change', () => {
    currentSort = EXPENSE_SORTS.includes(expenseSortSelect.value)
      ? expenseSortSelect.value
      : 'date-desc';
    expenseSortSelect.value = currentSort;
    renderExpenseList(expenses);
  });
}

function renderHistory(items = expenses) {
  renderExpenseList(items);
  historyDirty = false;
}

async function render(items) {
  historyDirty = true;
  markStatsDirty();
  await renderHome(items);

  if (activeTab === 'history') {
    renderHistory(items);
  } else if (activeTab === 'stats') {
    await refreshStats();
  }
}

function getTabFromHash() {
  const tabName = window.location.hash.replace(/^#/, '');
  return TAB_NAMES.includes(tabName) ? tabName : 'home';
}

function syncHash(tabName, push) {
  const hash = `#${tabName}`;

  if (window.location.hash === hash) {
    if (!window.history.state || window.history.state.tab !== tabName) {
      window.history.replaceState({ tab: tabName }, '', hash);
    }

    return;
  }

  const method = push ? 'pushState' : 'replaceState';
  window.history[method]({ tab: tabName }, '', hash);
}

function onTabShow(tabName) {
  if (!appDataLoaded) {
    return;
  }

  if (tabName === 'home') {
    renderHome(expenses);
  } else if (tabName === 'history' && historyDirty) {
    renderHistory(expenses);
  } else if (
    tabName === 'stats' &&
    (statsDirty || statsRenderedDay !== getTodayISO())
  ) {
    refreshStats();
  } else if (tabName === 'settings') {
    renderBalanceLine();
    updateLastBackupStatusLine();
  }
}

function showTab(tabName, { push = true } = {}) {
  const targetTab = TAB_NAMES.includes(tabName) ? tabName : 'home';
  const previousTab = activeTab;
  const isTabChange = previousTab !== targetTab;

  if (isTabChange && previousTab) {
    tabScrollPositions[previousTab] = window.scrollY;
  }

  activeTab = targetTab;

  tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tab !== targetTab;
  });

  bottomNavButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === targetTab;

    button.classList.toggle('is-active', isActive);

    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  syncHash(targetTab, push && isTabChange);

  if (isTabChange) {
    window.scrollTo(0, tabScrollPositions[targetTab] || 0);
  }

  onTabShow(targetTab);
}

function initTabNavigation() {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  bottomNavButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showTab(button.dataset.tabTarget);
    });
  });

  const handleRouteChange = () => {
    const tabName = getTabFromHash();

    if (tabName === activeTab) {
      return;
    }

    showTab(tabName, { push: false });
  };

  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('hashchange', handleRouteChange);
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

function hideBackupBanner() {
  backupBanner.hidden = true;
}

function showBackupBanner(message) {
  backupBannerText.textContent = message;
  backupBanner.hidden = false;
}

function updateBackupBanner() {
  const now = Date.now();
  const hiddenUntil = Date.parse(backupBannerHiddenUntil || '');

  if (Number.isFinite(hiddenUntil) && now < hiddenUntil) {
    hideBackupBanner();
    return;
  }

  if (expenses.length === 0) {
    hideBackupBanner();
    return;
  }

  if (!lastBackupAt) {
    showBackupBanner('Резервная копия ещё не создавалась');
    return;
  }

  const lastBackupTime = Date.parse(lastBackupAt);

  if (!Number.isFinite(lastBackupTime)) {
    showBackupBanner('Резервная копия ещё не создавалась');
    return;
  }

  const elapsed = now - lastBackupTime;

  if (elapsed > BACKUP_REMINDER_DAYS * DAY_MS) {
    const days = Math.max(1, Math.floor(elapsed / DAY_MS));

    showBackupBanner(`Последняя копия была ${days} дней назад`);
    return;
  }

  hideBackupBanner();
}

function updateLastBackupStatusLine() {
  if (!lastBackupValue) {
    return;
  }

  if (!lastBackupAt) {
    lastBackupValue.textContent = 'никогда';
    return;
  }

  const time = Date.parse(lastBackupAt);

  if (!Number.isFinite(time)) {
    lastBackupValue.textContent = 'никогда';
    return;
  }

  const days = Math.max(0, Math.floor((Date.now() - time) / DAY_MS));

  if (days === 0) {
    lastBackupValue.textContent = 'сегодня';
    return;
  }

  const lastTwo = days % 100;
  const lastOne = days % 10;
  let suffix = 'дней';

  if (lastTwo < 11 || lastTwo > 14) {
    if (lastOne === 1) {
      suffix = 'день';
    } else if (lastOne >= 2 && lastOne <= 4) {
      suffix = 'дня';
    }
  }

  lastBackupValue.textContent = `${days} ${suffix} назад`;
}

async function handleBackupBannerHide() {
  const hiddenUntil = new Date(Date.now() + DAY_MS).toISOString();

  backupBannerHideButton.disabled = true;

  try {
    await setSettings({
      backupBannerHiddenUntil: hiddenUntil
    });
    backupBannerHiddenUntil = hiddenUntil;
    hideBackupBanner();
  } catch (error) {
    showError('Не удалось скрыть напоминание. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    backupBannerHideButton.disabled = false;
  }
}

async function exportJSON() {
  const exportedAt = new Date().toISOString();
  const [items, balance, categories, templates] = await Promise.all([
    getAllExpenses(),
    getInitialBalance(),
    getAllCategories(),
    getQuickTemplates()
  ]);
  const content = JSON.stringify({
    version: 2,
    exportedAt,
    initialBalance: balance,
    categories: categories.map((category) => ({
      name: category.name,
      type: category.type,
      isSystem: isSystemCategory(category),
      monthlyLimit: category.type === 'expense' ? category.monthlyLimit : null
    })),
    quickTemplates: templates.map((template) => ({
      id: template.id,
      label: template.label,
      amount: template.amount,
      type: template.type,
      category: template.category,
      note: template.note,
      enabled: template.enabled,
      order: template.order
    })),
    transactions: items.map((item) => {
      const { isAdjustment, ...rest } = item;
      return isAdjustment === true ? { ...rest, isAdjustment: true } : rest;
    })
  }, null, 2);

  downloadFile(
    content,
    `expenses-backup-${getTodayISO()}.json`,
    'application/json;charset=utf-8'
  );

  await setSettings({
    lastBackupAt: exportedAt
  });
  lastBackupAt = exportedAt;
  updateLastBackupStatusLine();
  hideBackupBanner();
}

async function handleExportJson() {
  clearError();
  exportJsonButton.disabled = true;
  backupBannerExportButton.disabled = true;

  try {
    await exportJSON();
  } catch (error) {
    showError('Не удалось экспортировать данные. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    exportJsonButton.disabled = false;
    backupBannerExportButton.disabled = false;
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

function getReportPeriodLabel(period) {
  if (period === 'custom') {
    const from = customRange ? parseISODate(customRange.from) : null;
    const to = customRange ? parseISODate(customRange.to) : null;

    if (from && to) {
      return `${dateFormatter.format(from)} — ${dateFormatter.format(to)}`;
    }

    return 'Произвольный период';
  }

  const labels = {
    week: 'Неделя (последние 7 дней)',
    month: 'Месяц (последние 30 дней)',
    year: 'Год (последние 365 дней)',
    all: 'Всё время'
  };

  return labels[period] || labels.month;
}

function buildReportCategoryTableHTML(categories, total) {
  const source = categories && typeof categories === 'object' ? categories : {};
  const entries = Object.entries(source)
    .filter(([, sum]) => Number.isFinite(sum) && sum > 0)
    .sort((a, b) => b[1] - a[1]);
  const rows = entries.length > 0
    ? entries.map(([category, sum]) => {
      const percent = total > 0
        ? Math.round((sum / total) * 100)
        : 0;

      return `
        <tr>
          <td>${escapeHtml(category)}</td>
          <td class="report-number">${escapeHtml(formatAmount(sum))}</td>
          <td class="report-number">${percent}%</td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="3" class="report-empty-cell">Нет данных</td>
      </tr>
    `;

  return `
    <table class="report-table report-category-table">
      <thead>
        <tr>
          <th>Категория</th>
          <th class="report-number">Сумма</th>
          <th class="report-number">Процент</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildReportOperationsHTML(items) {
  const sortedExpenses = items
    .filter((expense) => parseISODate(expense.date) !== null)
    .slice()
    .sort(compareExpenses);

  if (sortedExpenses.length === 0) {
    return '<p class="report-empty">Нет операций за период</p>';
  }

  const todayIso = getTodayISO();
  const yesterdayIso = getYesterdayISO();
  const groups = new Map();

  sortedExpenses.forEach((expense) => {
    if (!groups.has(expense.date)) {
      groups.set(expense.date, []);
    }

    groups.get(expense.date).push(expense);
  });

  const groupRows = Array.from(groups.entries()).map(([date, groupItems]) => {
    const rows = groupItems.map((expense) => {
      const type = getTransactionType(expense);
      const category = expense.category == null || expense.category === ''
        ? SYSTEM_CATEGORY_NAME
        : expense.category;
      const note = expense.note == null ? '' : String(expense.note);

      return `
        <tr>
          <td>${type === 'income' ? 'Доход' : 'Расход'}</td>
          <td>${escapeHtml(category)}</td>
          <td>${note ? escapeHtml(note) : '—'}</td>
          <td class="report-number">${escapeHtml(formatSignedAmount(expense.amount, type))}</td>
        </tr>
      `;
    }).join('');

    return `
      <tbody class="report-day-group">
        <tr class="report-day-row">
          <th colspan="4">${escapeHtml(getExpenseDateGroupTitle(date, todayIso, yesterdayIso))}</th>
        </tr>
        ${rows}
      </tbody>
    `;
  }).join('');

  return `
    <table class="report-table report-operations-table">
      <thead>
        <tr>
          <th>Тип</th>
          <th>Категория</th>
          <th>Заметка</th>
          <th class="report-number">Сумма</th>
        </tr>
      </thead>
      ${groupRows}
    </table>
  `;
}

function buildReportComparisonHTML(comparison) {
  const rows = getComparisonMetricRows(comparison);

  if (rows.length === 0) {
    return '';
  }

  const rowsHtml = rows.map((row) => `
    <p class="report-comparison-row">
      <span class="report-comparison-label">${escapeHtml(row.label)}</span>
      <span class="report-comparison-values"><strong>${escapeHtml(row.currentText)}</strong> (<span class="comparison-arrow comparison-arrow--${row.change.tone}">${row.change.arrow}</span> ${escapeHtml(row.change.text)})</span>
    </p>
  `).join('');

  return `
    <section class="report-section report-comparison">
      <h2>Сравнение с прошлым периодом</h2>
      ${rowsHtml}
    </section>
  `;
}

function buildReportHTML(period, filteredOps, stats) {
  const safeStats = stats && typeof stats === 'object' ? stats : {};
  const initial = Number(safeStats.initialBalance);
  const initialBalanceValue = Number.isFinite(initial) ? initial : initialBalance;
  const current = Number(safeStats.currentBalance);
  const currentBalanceValue = Number.isFinite(current) ? current : initialBalanceValue;
  const expenseTotal = Number(safeStats.expenseTotal);
  const incomeTotal = Number(safeStats.incomeTotal);
  const netFlow = Number(safeStats.netFlow);
  const safeExpenseTotal = Number.isFinite(expenseTotal) ? expenseTotal : 0;
  const safeIncomeTotal = Number.isFinite(incomeTotal) ? incomeTotal : 0;
  const safeNetFlow = Number.isFinite(netFlow) ? netFlow : 0;
  const periodLabel = getReportPeriodLabel(period);
  const generatedAt = reportDateTimeFormatter.format(new Date());
  const filterNote = hasActiveListFilters()
    ? '<p class="report-filter-note">с учётом фильтров</p>'
    : '';
  const balanceTitle = safeStats.balanceGranularity === 'month'
    ? 'Баланс по месяцам'
    : 'Баланс по дням';

  return `
    <header class="report-header">
      <h1>Отчёт по финансам</h1>
      <p class="report-period"><span>Период:</span> <strong>${escapeHtml(periodLabel)}</strong></p>
      ${filterNote}
      <p class="report-generated">Сформирован ${escapeHtml(generatedAt)}</p>
    </header>

    <section class="report-section">
      <h2>Сводка</h2>
      <div class="report-summary">
        <p><span>Начальный баланс:</span> <strong>${escapeHtml(formatAmount(initialBalanceValue))}</strong></p>
        <p><span>Текущий баланс:</span> <strong>${escapeHtml(formatAmount(currentBalanceValue))}</strong></p>
        <p><span>Доходы за период:</span> <strong>${escapeHtml(formatAmount(safeIncomeTotal))}</strong></p>
        <p><span>Расходы за период:</span> <strong>${escapeHtml(formatAmount(safeExpenseTotal))}</strong></p>
        <p><span>Чистый поток:</span> <strong>${escapeHtml(formatNetAmount(safeNetFlow))}</strong></p>
      </div>
    </section>

    ${buildReportComparisonHTML(safeStats.comparison)}

    <section class="report-section">
      <h2>Расходы по категориям</h2>
      ${buildReportCategoryTableHTML(safeStats.expenseByCategory, safeExpenseTotal)}
    </section>

    <section class="report-section">
      <h2>Доходы по категориям</h2>
      ${buildReportCategoryTableHTML(safeStats.incomeByCategory, safeIncomeTotal)}
    </section>

    <section class="report-section report-chart-section">
      <h2>График баланса</h2>
      <p class="report-chart-title">${escapeHtml(balanceTitle)}</p>
      <div class="report-chart" data-report-balance-chart></div>
    </section>

    <section class="report-section">
      <h2>Операции за период</h2>
      ${buildReportOperationsHTML(filteredOps)}
    </section>

    <footer class="report-footer">
      Мои Расходы — личный трекер. Данные хранятся на устройстве пользователя.
    </footer>
  `;
}

function cleanupPrintReport() {
  const report = document.getElementById('print-report');

  if (report) {
    report.remove();
  }

  document.body.classList.remove('print-mode');

  if (printReportTimer !== null) {
    window.clearTimeout(printReportTimer);
    printReportTimer = null;
  }

  if (printReportAfterPrint) {
    window.removeEventListener('afterprint', printReportAfterPrint);
    printReportAfterPrint = null;
  }
}

async function printReport() {
  if (document.getElementById('print-report')) {
    return;
  }

  clearError();
  reportPdfButton.disabled = true;

  try {
    const [allExpenses, balance] = await Promise.all([
      getAllExpenses(),
      getInitialBalance()
    ]);
    const period = getActiveStatsPeriod();
    const stats = aggregate(allExpenses, period);
    const range = getPeriodRange(period, allExpenses);
    const startIso = formatISODate(range.start);
    const endIso = formatISODate(range.end);
    const filteredExpenses = getVisibleExpenses(allExpenses).filter((expense) => {
      const date = parseISODate(expense.date);

      if (!date) {
        return false;
      }

      const isoDate = formatISODate(date);
      return isoDate >= startIso && isoDate <= endIso;
    });
    const totals = calculateTotals(allExpenses);
    const currentBalance = roundCurrency(
      (Number(balance) || 0) + totals.incomeTotal - totals.expenseTotal
    );
    const report = document.createElement('div');
    report.id = 'print-report';
    report.innerHTML = buildReportHTML(period, filteredExpenses, {
      ...stats,
      initialBalance: balance,
      currentBalance
    });

    document.body.append(report);
    document.body.classList.add('print-mode');

    const chartContainer = report.querySelector('[data-report-balance-chart]');

    if (chartContainer) {
      renderBalanceChart(
        chartContainer,
        stats.balanceSeries,
        stats.chartPeriod || period
      );
    }

    printReportAfterPrint = () => {
      cleanupPrintReport();
    };
    window.addEventListener('afterprint', printReportAfterPrint, { once: true });

    let printInvoked = false;
    const invokePrint = () => {
      if (printInvoked || !document.getElementById('print-report')) {
        return;
      }

      printInvoked = true;

      if (printReportTimer !== null) {
        window.clearTimeout(printReportTimer);
        printReportTimer = null;
      }

      try {
        window.print();
      } catch (error) {
        cleanupPrintReport();
        showError('Не удалось открыть окно печати. Попробуйте ещё раз.');
      }
    };

    requestAnimationFrame(invokePrint);
    // В фоновой вкладке requestAnimationFrame может не сработать до возврата фокуса.
    printReportTimer = window.setTimeout(invokePrint, 200);
  } catch (error) {
    cleanupPrintReport();
    showError('Не удалось сформировать отчёт. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    reportPdfButton.disabled = false;
  }
}

function validateImportItem(item, index, forcedType) {
  const label = `запись №${index + 1}`;

  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`${label}: ожидается объект.`);
  }

  let type = forcedType === 'income' || forcedType === 'expense'
    ? forcedType
    : 'expense';

  if (
    !forcedType &&
    Object.prototype.hasOwnProperty.call(item, 'type')
  ) {
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

  if (
    Object.prototype.hasOwnProperty.call(item, 'isAdjustment') &&
    typeof item.isAdjustment !== 'boolean'
  ) {
    throw new Error(`${label}: поле "isAdjustment" должно быть boolean.`);
  }

  return {
    amount: item.amount,
    note: Object.prototype.hasOwnProperty.call(item, 'note') ? item.note : '',
    category: item.category,
    date: item.date,
    createdAt: Object.prototype.hasOwnProperty.call(item, 'createdAt')
      ? item.createdAt
      : null,
    type,
    isAdjustment: item.isAdjustment === true
  };
}

function validateImportCategories(list) {
  if (!Array.isArray(list)) {
    throw new Error('поле "categories" должно быть массивом категорий.');
  }

  const result = [];
  const seen = new Set();

  list.forEach((entry, index) => {
    const label = `категория №${index + 1}`;

    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${label}: ожидается объект.`);
    }

    if (typeof entry.name !== 'string' || !entry.name.trim()) {
      throw new Error(`${label}: поле "name" должно быть непустой строкой.`);
    }

    if (entry.type !== 'expense' && entry.type !== 'income') {
      throw new Error(`${label}: поле "type" должно быть "expense" или "income".`);
    }

    const name = entry.name.trim();
    const key = categoryKey(entry.type, name);

    if (seen.has(key)) {
      return;
    }

    let monthlyLimit = null;

    if (
      entry.type === 'expense' &&
      Object.prototype.hasOwnProperty.call(entry, 'monthlyLimit') &&
      entry.monthlyLimit !== null
    ) {
      const rawLimit = entry.monthlyLimit;
      const isValidLimit = (
        typeof rawLimit === 'number' &&
        Number.isFinite(rawLimit) &&
        rawLimit > 0 &&
        rawLimit <= CATEGORY_LIMIT_MAX
      );

      if (isValidLimit) {
        monthlyLimit = roundCurrency(rawLimit);
      } else {
        console.warn(
          `${label}: некорректное поле "monthlyLimit", лимит будет снят.`
        );
      }
    }

    seen.add(key);
    result.push({
      name,
      type: entry.type,
      isSystem: name === SYSTEM_CATEGORY_NAME,
      monthlyLimit
    });
  });

  return result;
}

function buildImportCategories(importedCategories, items, addDefaults) {
  const map = new Map();

  const add = (rawName, type, forceSystem, monthlyLimit = null) => {
    if (!TRANSACTION_TYPES.includes(type)) {
      return null;
    }

    const name = typeof rawName === 'string' ? rawName.trim() : '';

    if (!name) {
      return null;
    }

    const key = categoryKey(type, name);
    const isSystem = forceSystem === true || name === SYSTEM_CATEGORY_NAME;
    const normalizedLimit = type === 'expense'
      ? normalizeMonthlyLimit(monthlyLimit)
      : null;

    if (map.has(key)) {
      const existing = map.get(key);

      if (isSystem) {
        existing.isSystem = true;
      }

      if (normalizedLimit !== null && existing.monthlyLimit === null) {
        existing.monthlyLimit = normalizedLimit;
      }

      return existing;
    }

    const record = {
      name,
      type,
      isSystem,
      monthlyLimit: normalizedLimit
    };
    map.set(key, record);

    return record;
  };

  (importedCategories || []).forEach((category) => {
    add(category.name, category.type, category.isSystem, category.monthlyLimit);
  });

  if (addDefaults) {
    TRANSACTION_TYPES.forEach((type) => {
      DEFAULT_CATEGORIES[type].forEach((name) => {
        add(name, type);
      });
    });
  }

  const normalizedItems = items.map((item) => {
    const type = item.type === 'income' ? 'income' : 'expense';
    const rawCategory = typeof item.category === 'string' ? item.category.trim() : '';
    const existing = rawCategory ? map.get(categoryKey(type, rawCategory)) : null;
    const category = existing
      || add(rawCategory || SYSTEM_CATEGORY_NAME, type, !rawCategory)
      || add(SYSTEM_CATEGORY_NAME, type, true);

    return {
      ...item,
      category: category.name,
      type
    };
  });

  TRANSACTION_TYPES.forEach((type) => {
    add(SYSTEM_CATEGORY_NAME, type, true);
  });

  return {
    categories: [...map.values()],
    items: normalizedItems
  };
}

function validateImportQuickTemplates(list, categories) {
  if (!Array.isArray(list)) {
    console.warn('Блок "quickTemplates" пропущен: ожидается массив шаблонов.');
    return undefined;
  }

  const categoryNames = new Map(
    (categories || []).map((category) => [
      categoryKey(category.type, category.name),
      category.name
    ])
  );
  const usedIds = new Set();
  const result = [];

  list.forEach((entry, index) => {
    const label = `шаблон №${index + 1}`;

    const skip = (reason) => {
      console.warn(`${label} пропущен: ${reason}`);
    };

    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      skip('ожидается объект.');
      return;
    }

    const templateLabel = typeof entry.label === 'string' ? entry.label.trim() : '';

    if (!templateLabel || templateLabel.length > QUICK_TEMPLATE_LABEL_MAX) {
      skip('поле "label" должно быть непустой строкой до 30 символов.');
      return;
    }

    if (
      typeof entry.amount !== 'number' ||
      !Number.isFinite(entry.amount) ||
      entry.amount <= 0
    ) {
      skip('поле "amount" должно быть положительным числом.');
      return;
    }

    const amount = roundCurrency(entry.amount);

    if (amount <= 0) {
      skip('поле "amount" слишком маленькое.');
      return;
    }

    if (!TRANSACTION_TYPES.includes(entry.type)) {
      skip('поле "type" должно быть "expense" или "income".');
      return;
    }

    const category = typeof entry.category === 'string' ? entry.category.trim() : '';

    if (!category) {
      skip('поле "category" должно быть непустой строкой.');
      return;
    }

    const canonicalCategory = categoryNames.get(categoryKey(entry.type, category));

    if (!canonicalCategory) {
      skip(`категория "${category}" отсутствует в резервной копии.`);
      return;
    }

    if (typeof entry.enabled !== 'boolean') {
      skip('поле "enabled" должно быть boolean.');
      return;
    }

    let id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : '';

    if (!id || usedIds.has(id)) {
      id = createQuickTemplateId();
    }

    usedIds.add(id);

    const note = typeof entry.note === 'string' ? entry.note.trim() : '';
    const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : index;

    result.push({
      template: {
        id,
        label: templateLabel,
        amount,
        type: entry.type,
        category: canonicalCategory,
        note: note || templateLabel,
        enabled: entry.enabled
      },
      order,
      index
    });
  });

  result.sort((left, right) => {
    return left.order - right.order || left.index - right.index;
  });

  return result.map((entry, index) => ({
    ...entry.template,
    order: index
  }));
}

function parseImportJson(text) {
  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error('файл содержит некорректный JSON.');
  }

  if (Array.isArray(data)) {
    return {
      format: 'legacy-array',
      balance: 0,
      items: data.map((item, index) => validateImportItem(item, index, 'expense')),
      categories: null
    };
  }

  if (data === null || typeof data !== 'object') {
    throw new Error('ожидается массив записей или объект с полем "transactions".');
  }

  if (Object.prototype.hasOwnProperty.call(data, 'version') && data.version !== 2) {
    throw new Error('неподдерживаемая версия резервной копии.');
  }

  let balance = 0;

  if (Object.prototype.hasOwnProperty.call(data, 'initialBalance')) {
    if (typeof data.initialBalance !== 'number' || !Number.isFinite(data.initialBalance)) {
      throw new Error('поле "initialBalance" должно быть числом.');
    }

    balance = data.initialBalance;
  }

  if (!Array.isArray(data.transactions)) {
    throw new Error('поле "transactions" должно быть массивом записей.');
  }

  if (
    data.version === 2 &&
    !Object.prototype.hasOwnProperty.call(data, 'categories')
  ) {
    throw new Error('в резервной копии версии 2 отсутствует поле "categories".');
  }

  const items = data.transactions.map((item, index) => {
    return validateImportItem(item, index);
  });
  const quickTemplates = Object.prototype.hasOwnProperty.call(data, 'quickTemplates')
    ? data.quickTemplates
    : undefined;

  if (Object.prototype.hasOwnProperty.call(data, 'categories')) {
    return {
      format: 'v2',
      balance,
      items,
      categories: validateImportCategories(data.categories),
      quickTemplates
    };
  }

  return {
    format: 'legacy-object',
    balance,
    items,
    categories: null,
    quickTemplates
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

    if (pendingUndoCommit) {
      await pendingUndoCommit;
    }

    discardPendingUndo();
    renderExpenseList(expenses);

    const prepared = buildImportCategories(
      importedData.categories,
      importedData.items,
      importedData.format !== 'v2'
    );
    const importedQuickTemplates = importedData.quickTemplates === undefined
      ? undefined
      : validateImportQuickTemplates(importedData.quickTemplates, prepared.categories);

    await replaceAllData({
      items: prepared.items,
      balance: importedData.balance,
      categories: prepared.categories,
      quickTemplates: importedQuickTemplates
    });

    initialBalance = importedData.balance;
    initialBalanceExists = true;
    currentFilter = '';
    closeCategoryModal();
    expenses = await getAllExpenses();

    if (editingExpenseId !== null) {
      await resetFormToAdd();
    }

    await refreshCategoryUi();
    await refreshQuickTemplatesUi();
    await render(expenses);
    updateBackupBanner();
  } catch (error) {
    showError('Не удалось импортировать данные. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    importJsonButton.disabled = false;
    input.value = '';
  }
}

function updateFormModeUi() {
  const isEditing = editingExpenseId !== null;
  const isIncome = currentType === 'income';

  formTitle.textContent = isEditing ? 'Редактирование операции' : 'Новая операция';
  submitButton.textContent = isEditing
    ? 'Сохранить изменения'
    : (isIncome ? 'Добавить доход' : 'Добавить расход');
  cancelEditButton.hidden = !isEditing;
  formPanel.classList.toggle('is-editing', isEditing);
}

function updateTypeControls() {
  typeTabs.querySelectorAll('[data-type]').forEach((tab) => {
    const isActive = tab.dataset.type === currentType;

    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  updateFormModeUi();
}

async function renderFormCategories(preferredName) {
  const type = currentType;
  const previousSelection = categoryInput.value;
  let categories;

  try {
    categories = await getCategories(type);
  } catch (error) {
    return;
  }

  if (type !== currentType) {
    return;
  }

  const fragment = document.createDocumentFragment();

  if (categories.length === 0) {
    const option = document.createElement('option');

    option.value = '';
    option.textContent = 'Нет категорий';
    option.disabled = true;
    fragment.append(option);
  } else {
    categories.forEach((category) => {
      const option = document.createElement('option');

      option.value = category.name;
      option.textContent = category.name;
      fragment.append(option);
    });
  }

  categoryInput.replaceChildren(fragment);

  const preferred = preferredName === undefined ? previousSelection : preferredName;

  if (preferred && categories.some((category) => category.name === preferred)) {
    categoryInput.value = preferred;
  } else if (categories.length > 0) {
    categoryInput.value = categories[0].name;
  }
}

async function setTransactionType(type) {
  if (!TRANSACTION_TYPES.includes(type) || type === currentType) {
    return;
  }

  currentType = type;
  updateTypeControls();
  await renderFormCategories(null);
}

async function resetFormToAdd({ focus = false } = {}) {
  editingExpenseId = null;
  currentType = 'expense';
  form.reset();
  dateInput.value = getTodayISO();
  updateTypeControls();
  await renderFormCategories(null);

  if (focus) {
    amountInput.focus();
  }
}

async function startEditingExpense(expense) {
  if (!expense || !Number.isInteger(Number(expense.id))) {
    return;
  }

  const id = Number(expense.id);

  clearError();
  showTab('home', { push: false });
  editingExpenseId = id;
  currentType = getTransactionType(expense);
  amountInput.value = String(expense.amount);
  noteInput.value = typeof expense.note === 'string' ? expense.note : '';
  dateInput.value = expense.date;
  updateTypeControls();
  await renderFormCategories(expense.category);

  if (editingExpenseId !== id) {
    return;
  }

  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  amountInput.focus({ preventScroll: true });
}

async function handleCancelEdit() {
  if (editingExpenseId === null) {
    return;
  }

  clearError();
  await resetFormToAdd({ focus: true });
}

function initTypeTabs() {
  updateTypeControls();

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

function setCategoryModalError(message) {
  const text = typeof message === 'string' ? message : '';

  categoryModalError.textContent = text;
  categoryModalError.hidden = !text;
}

function updateCategoryModalTabs() {
  categoryModalTabs.querySelectorAll('[data-category-type]').forEach((tab) => {
    const isActive = tab.dataset.categoryType === categoryModalType;

    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

async function renderCategoryModalList() {
  const type = categoryModalType;
  let categories;

  try {
    categories = await getCategories(type);
  } catch (error) {
    setCategoryModalError('Не удалось загрузить категории.');
    return;
  }

  if (type !== categoryModalType || categoryModal.hidden) {
    return;
  }

  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const item = document.createElement('li');
    item.className = 'category-item';

    const info = document.createElement('div');
    info.className = 'category-item-info';

    const name = document.createElement('span');
    name.className = 'category-item-name';
    name.textContent = category.name;
    info.append(name);

    if (isSystemCategory(category)) {
      const badge = document.createElement('span');
      badge.className = 'category-system-badge';
      badge.textContent = 'системная';
      info.append(badge);
    }

    if (category.type === 'expense') {
      const limit = document.createElement('span');
      limit.className = 'category-item-limit';
      limit.textContent = category.monthlyLimit === null
        ? 'Лимит не задан'
        : `Лимит: ${formatAmount(category.monthlyLimit)}/мес`;
      info.append(limit);
    }

    const actions = document.createElement('div');
    actions.className = 'category-item-actions';

    const actionsDisabled = isSystemCategory(category);

    if (category.type === 'expense') {
      const limitButton = document.createElement('button');
      limitButton.type = 'button';
      limitButton.className = 'category-action-button';
      limitButton.dataset.categoryAction = 'limit';
      limitButton.dataset.id = String(category.id);
      limitButton.textContent = category.monthlyLimit === null
        ? 'Задать лимит'
        : 'Изменить лимит';
      actions.append(limitButton);
    }

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'category-action-button';
    renameButton.dataset.categoryAction = 'rename';
    renameButton.dataset.id = String(category.id);
    renameButton.textContent = 'Переименовать';
    renameButton.disabled = actionsDisabled;

    if (actionsDisabled) {
      renameButton.title = 'Системная категория';
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'category-action-button category-action-button--danger';
    deleteButton.dataset.categoryAction = 'delete';
    deleteButton.dataset.id = String(category.id);
    deleteButton.textContent = 'Удалить';
    deleteButton.disabled = actionsDisabled;

    if (actionsDisabled) {
      deleteButton.title = 'Системная категория';
    }

    actions.append(renameButton, deleteButton);
    item.append(info, actions);
    fragment.append(item);
  });

  categoryModalList.replaceChildren(fragment);
  categoryModalEmpty.hidden = categories.length > 0;
}

function openCategoryModal(type = currentType) {
  categoryModalType = TRANSACTION_TYPES.includes(type) ? type : currentType;
  categoryModalReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  updateCategoryModalTabs();
  setCategoryModalError('');
  categoryNameInput.value = '';
  categoryModal.hidden = false;
  document.body.classList.add('modal-open');
  renderCategoryModalList();
  categoryNameInput.focus();
}

function closeCategoryModal() {
  if (categoryModal.hidden) {
    return;
  }

  categoryModal.hidden = true;
  document.body.classList.remove('modal-open');
  setCategoryModalError('');

  const returnFocus = categoryModalReturnFocus;
  categoryModalReturnFocus = null;

  if (returnFocus && returnFocus.isConnected) {
    returnFocus.focus();
    return;
  }

  if (manageCategoriesButton && manageCategoriesButton.offsetParent !== null) {
    manageCategoriesButton.focus();
  }
}

async function refreshCategoryUi() {
  await renderCategoryFilter();
  await renderFormCategories();

  if (!categoryModal.hidden) {
    await renderCategoryModalList();
  }
}

async function refreshAfterCategoryChange() {
  expenses = await getAllExpenses();
  await refreshCategoryUi();
  await refreshQuickTemplatesUi();
  await render(expenses);
}

async function handleCategoryRename(id) {
  setCategoryModalError('');

  let category;

  try {
    const categories = await getCategories(categoryModalType);

    category = categories.find((item) => item.id === id);
  } catch (error) {
    setCategoryModalError('Не удалось загрузить категории.');
    return;
  }

  if (!category) {
    setCategoryModalError('Категория не найдена.');
    return;
  }

  const newName = window.prompt('Новое название категории:', category.name);

  if (newName === null) {
    return;
  }

  try {
    await renameCategory(id, newName);
    await renameQuickTemplateCategory(category.type, category.name, newName.trim());
    setCategoryModalError('');

    if (currentFilter === category.name) {
      currentFilter = newName.trim();
    }

    await refreshAfterCategoryChange();
  } catch (error) {
    setCategoryModalError(error.message || 'Не удалось переименовать категорию.');
  }
}

async function handleCategoryLimit(id) {
  setCategoryModalError('');

  let categories;

  try {
    categories = await getCategories('expense');
  } catch (error) {
    setCategoryModalError('Не удалось загрузить категории.');
    return;
  }

  const category = categories.find((item) => item.id === id);

  if (!category) {
    setCategoryModalError('Категория не найдена.');
    return;
  }

  const currentLimit = category.monthlyLimit === null
    ? ''
    : String(category.monthlyLimit);
  const raw = window.prompt(
    `Месячный лимит для «${category.name}» в рублях. Оставьте поле пустым, чтобы снять лимит:`,
    currentLimit
  );

  if (raw === null) {
    return;
  }

  try {
    await setCategoryLimit(id, raw);
    setCategoryModalError('');
    await refreshAfterCategoryChange();
  } catch (error) {
    setCategoryModalError(error.message || 'Не удалось сохранить лимит.');
  }
}

async function handleCategoryDelete(id) {
  setCategoryModalError('');

  let category;

  try {
    const categories = await getCategories(categoryModalType);

    category = categories.find((item) => item.id === id);
  } catch (error) {
    setCategoryModalError('Не удалось загрузить категории.');
    return;
  }

  if (!category) {
    setCategoryModalError('Категория не найдена.');
    return;
  }

  try {
    const deleted = await deleteCategory(id);

    if (!deleted) {
      return;
    }

    if (currentFilter === category.name) {
      currentFilter = '';
    }

    setCategoryModalError('');
    await refreshAfterCategoryChange();
  } catch (error) {
    setCategoryModalError(error.message || 'Не удалось удалить категорию.');
  }
}

function initCategoryModal() {
  manageCategoriesButton.addEventListener('click', openCategoryModal);
  categoryModalClose.addEventListener('click', closeCategoryModal);
  categoryModal.addEventListener('click', (event) => {
    if (event.target === categoryModal) {
      closeCategoryModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !categoryModal.hidden) {
      closeCategoryModal();
    }
  });

  categoryModalTabs.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const tab = target.closest('[data-category-type]');

    if (!tab || !categoryModalTabs.contains(tab)) {
      return;
    }

    const type = tab.dataset.categoryType;

    if (type === categoryModalType) {
      return;
    }

    categoryModalType = type;
    updateCategoryModalTabs();
    setCategoryModalError('');
    renderCategoryModalList();
  });

  categoryModalList.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('[data-category-action]');

    if (!button || !categoryModalList.contains(button)) {
      return;
    }

    const id = Number(button.dataset.id);

    if (!Number.isInteger(id)) {
      return;
    }

    if (button.dataset.categoryAction === 'limit') {
      handleCategoryLimit(id);
    } else if (button.dataset.categoryAction === 'rename') {
      handleCategoryRename(id);
    } else if (button.dataset.categoryAction === 'delete') {
      handleCategoryDelete(id);
    }
  });

  categoryAddForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setCategoryModalError('');

    try {
      await addCategory(categoryNameInput.value, categoryModalType);
      categoryNameInput.value = '';
      await refreshAfterCategoryChange();
      categoryNameInput.focus();
    } catch (error) {
      setCategoryModalError(error.message || 'Не удалось добавить категорию.');
    }
  });
}

function setQuickTemplateError(message) {
  const text = typeof message === 'string' ? message : '';

  quickTemplateError.textContent = text;
  quickTemplateError.hidden = !text;
}

async function populateQuickTemplateCategorySelect(type, preferredName, keepEmptyWhenMissing) {
  let categories;

  try {
    categories = await getCategories(type);
  } catch (error) {
    return;
  }

  if (quickTemplateTypeSelect.value !== type) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement('option');

  placeholder.value = '';
  placeholder.textContent = 'Выберите категорию';
  fragment.append(placeholder);

  categories.forEach((category) => {
    const option = document.createElement('option');

    option.value = category.name;
    option.textContent = category.name;
    fragment.append(option);
  });

  quickTemplateCategorySelect.replaceChildren(fragment);

  const names = categories.map((category) => category.name);
  const preferred = typeof preferredName === 'string' ? preferredName : '';

  if (preferred && names.includes(preferred)) {
    quickTemplateCategorySelect.value = preferred;
  } else if (!keepEmptyWhenMissing && categories.length > 0) {
    quickTemplateCategorySelect.value = categories[0].name;
  } else {
    quickTemplateCategorySelect.value = '';
  }
}

async function resetQuickTemplateForm() {
  editingQuickTemplateId = null;
  quickTemplateForm.reset();
  quickTemplateTypeSelect.value = 'expense';
  quickTemplateFormTitle.textContent = 'Новый шаблон';
  quickTemplateCancel.hidden = true;
  setQuickTemplateError('');
  await populateQuickTemplateCategorySelect('expense', '', false);
}

async function renderQuickTemplateModalList() {
  if (quickTemplateModal.hidden) {
    return;
  }

  let categories;

  try {
    categories = await getAllCategories();
  } catch (error) {
    setQuickTemplateError('Не удалось загрузить категории.');
    return;
  }

  if (quickTemplateModal.hidden) {
    return;
  }

  const categoryKeys = new Set(
    categories.map((category) => categoryKey(category.type, category.name))
  );
  const fragment = document.createDocumentFragment();

  quickTemplates.forEach((template, index) => {
    const missingCategory = !categoryKeys.has(
      categoryKey(template.type, template.category)
    );
    const item = document.createElement('li');

    item.className = 'quick-template-item';
    item.dataset.id = template.id;

    if (missingCategory) {
      item.classList.add('is-missing-category');
    }

    const info = document.createElement('div');

    info.className = 'quick-template-item-info';

    const name = document.createElement('span');

    name.className = 'quick-template-item-name';
    name.textContent = template.label;

    const amount = document.createElement('span');

    amount.className = `quick-template-item-amount is-${template.type}`;
    amount.textContent = formatAmount(template.amount);

    const typeBadge = document.createElement('span');

    typeBadge.className = `quick-template-item-type is-${template.type}`;
    typeBadge.textContent = template.type === 'income' ? 'Доход' : 'Расход';

    const category = document.createElement('span');

    category.className = 'quick-template-item-category';
    category.textContent = `Категория: ${template.category}`;

    info.append(name, amount, typeBadge, category);

    if (missingCategory) {
      const missingBadge = document.createElement('span');

      missingBadge.className = 'quick-template-missing-badge';
      missingBadge.textContent = 'Категория удалена';
      info.append(missingBadge);
    }

    const actions = document.createElement('div');

    actions.className = 'quick-template-item-actions';

    const createActionButton = (action, text, className) => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = className || 'quick-template-action-button';
      button.dataset.quickTemplateAction = action;
      button.dataset.id = template.id;
      button.textContent = text;

      return button;
    };

    const upButton = createActionButton('up', 'Вверх');

    upButton.disabled = index === 0;

    const downButton = createActionButton('down', 'Вниз');

    downButton.disabled = index === quickTemplates.length - 1;

    const editButton = createActionButton('edit', 'Изменить');
    const deleteButton = createActionButton(
      'delete',
      'Удалить',
      'quick-template-action-button quick-template-action-button--danger'
    );
    const toggleButton = createActionButton(
      'toggle',
      template.enabled ? 'Вкл' : 'Выкл',
      `quick-template-action-button quick-template-toggle${template.enabled ? '' : ' is-off'}`
    );

    toggleButton.setAttribute('aria-pressed', String(template.enabled));
    toggleButton.title = template.enabled ? 'Отключить шаблон' : 'Включить шаблон';

    actions.append(upButton, downButton, editButton, deleteButton, toggleButton);
    item.append(info, actions);
    fragment.append(item);
  });

  quickTemplateList.replaceChildren(fragment);
  quickTemplateEmpty.hidden = quickTemplates.length > 0;
}

async function renderQuickTemplateRow() {
  let categories;

  try {
    categories = await getAllCategories();
  } catch (error) {
    return;
  }

  const categoryKeys = new Set(
    categories.map((category) => categoryKey(category.type, category.name))
  );
  const fragment = document.createDocumentFragment();
  const activeTemplates = quickTemplates.filter((template) => template.enabled);

  if (quickTemplates.length === 0) {
    const addButton = document.createElement('button');

    addButton.type = 'button';
    addButton.className = 'quick-template-add';
    addButton.dataset.quickTemplateAction = 'manage';
    addButton.textContent = '+ Добавить шаблон';
    fragment.append(addButton);
  } else {
    activeTemplates.forEach((template) => {
      const missingCategory = !categoryKeys.has(
        categoryKey(template.type, template.category)
      );
      const button = document.createElement('button');

      button.type = 'button';
      button.className = `quick-template-button is-${template.type}${missingCategory ? ' is-disabled' : ''}`;
      button.dataset.quickTemplateId = template.id;

      if (missingCategory) {
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Категория удалена';
      }

      const label = document.createElement('span');

      label.className = 'quick-template-label';
      label.textContent = template.label;

      const amount = document.createElement('span');

      amount.className = 'quick-template-amount';
      amount.textContent = formatAmount(template.amount);

      button.append(label, amount);

      if (missingCategory) {
        const badge = document.createElement('span');

        badge.className = 'quick-template-badge';
        badge.textContent = 'Категория удалена';
        button.append(badge);
      }

      fragment.append(button);
    });

    const manageButton = document.createElement('button');

    manageButton.type = 'button';
    manageButton.className = 'quick-template-manage';
    manageButton.dataset.quickTemplateAction = 'manage';
    manageButton.setAttribute('aria-label', 'Управление шаблонами');
    manageButton.title = 'Управление шаблонами';
    manageButton.textContent = '⚙';
    fragment.append(manageButton);
  }

  quickTemplatesRow.replaceChildren(fragment);
}

async function refreshQuickTemplatesUi() {
  try {
    quickTemplates = await getQuickTemplates();
  } catch (error) {
    if (!quickTemplateModal.hidden) {
      setQuickTemplateError('Не удалось загрузить шаблоны.');
    }

    return;
  }

  await renderQuickTemplateRow();

  if (!quickTemplateModal.hidden) {
    await renderQuickTemplateModalList();
  }
}

async function openQuickTemplateModal() {
  if (isAppLocked) {
    return;
  }

  setQuickTemplateError('');
  quickTemplateModalReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  quickTemplateModal.hidden = false;
  document.body.classList.add('modal-open');
  await resetQuickTemplateForm();
  await renderQuickTemplateModalList();

  if (!quickTemplateModal.hidden) {
    quickTemplateLabelInput.focus();
  }
}

function closeQuickTemplateModal() {
  if (quickTemplateModal.hidden) {
    return;
  }

  quickTemplateModal.hidden = true;
  document.body.classList.remove('modal-open');
  setQuickTemplateError('');

  const returnFocus = quickTemplateModalReturnFocus;
  quickTemplateModalReturnFocus = null;

  if (returnFocus && returnFocus.isConnected) {
    returnFocus.focus();
    return;
  }

  const focusTarget = quickTemplatesRow.querySelector(
    '.quick-template-manage, .quick-template-add'
  );

  if (focusTarget) {
    focusTarget.focus();
  }
}

async function editQuickTemplate(id) {
  const template = quickTemplates.find((item) => item.id === id);

  if (!template) {
    setQuickTemplateError('Шаблон не найден.');
    return;
  }

  let categories;

  try {
    categories = await getCategories(template.type);
  } catch (error) {
    setQuickTemplateError('Не удалось загрузить категории.');
    return;
  }

  const matchingCategory = categories.find((category) => {
    return categoryKey(category.type, category.name)
      === categoryKey(template.type, template.category);
  });

  editingQuickTemplateId = template.id;
  quickTemplateFormTitle.textContent = 'Редактирование шаблона';
  quickTemplateLabelInput.value = template.label;
  quickTemplateAmountInput.value = String(template.amount);
  quickTemplateTypeSelect.value = template.type;
  quickTemplateNoteInput.value = template.note;
  quickTemplateCancel.hidden = false;
  setQuickTemplateError('');

  await populateQuickTemplateCategorySelect(
    template.type,
    matchingCategory ? matchingCategory.name : template.category,
    !matchingCategory
  );

  if (quickTemplateModal.hidden) {
    return;
  }

  quickTemplateForm.scrollIntoView({ block: 'nearest' });
  quickTemplateLabelInput.focus();
}

async function handleQuickTemplateSubmit(event) {
  event.preventDefault();
  setQuickTemplateError('');

  const label = quickTemplateLabelInput.value.trim();

  if (!label) {
    setQuickTemplateError('Введите название шаблона.');
    quickTemplateLabelInput.focus();
    return;
  }

  if (label.length > QUICK_TEMPLATE_LABEL_MAX) {
    setQuickTemplateError(`Название должно быть не длиннее ${QUICK_TEMPLATE_LABEL_MAX} символов.`);
    quickTemplateLabelInput.focus();
    return;
  }

  const rawAmount = quickTemplateAmountInput.value.trim();
  const amount = Number(rawAmount.replace(',', '.'));

  if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
    setQuickTemplateError('Сумма должна быть больше 0.');
    quickTemplateAmountInput.focus();
    return;
  }

  const type = TRANSACTION_TYPES.includes(quickTemplateTypeSelect.value)
    ? quickTemplateTypeSelect.value
    : '';
  const category = quickTemplateCategorySelect.value;

  if (!type) {
    setQuickTemplateError('Выберите тип шаблона.');
    return;
  }

  if (!category) {
    setQuickTemplateError('Выберите категорию.');
    quickTemplateCategorySelect.focus();
    return;
  }

  const data = {
    label,
    amount,
    type,
    category,
    note: quickTemplateNoteInput.value
  };

  try {
    if (editingQuickTemplateId === null) {
      await addQuickTemplate(data);
    } else {
      await updateQuickTemplate(editingQuickTemplateId, data);
    }

    await refreshQuickTemplatesUi();
    await resetQuickTemplateForm();
    quickTemplateLabelInput.focus();
  } catch (error) {
    setQuickTemplateError(error.message || 'Не удалось сохранить шаблон.');
  }
}

async function handleQuickTemplateDelete(id) {
  const template = quickTemplates.find((item) => item.id === id);
  const index = quickTemplates.findIndex((item) => item.id === id);

  if (!template || index < 0) {
    setQuickTemplateError('Шаблон не найден.');
    return;
  }

  setQuickTemplateError('');

  try {
    await settlePendingUndoForNewAction();
    const removed = await deleteQuickTemplate(id);

    if (!removed) {
      await refreshQuickTemplatesUi();
      return;
    }

    if (editingQuickTemplateId === id) {
      await resetQuickTemplateForm();
    }

    await refreshQuickTemplatesUi();

    startPendingUndo({
      kind: 'template-delete',
      toastText: 'Шаблон удалён.',
      renderAfterCommit: false,
      undoErrorMessage: 'Не удалось вернуть шаблон. Проверьте доступ к хранилищу.',
      undo: async () => {
        const current = await getQuickTemplates();

        if (!current.some((item) => item.id === template.id)) {
          current.splice(Math.min(index, current.length), 0, template);
          await saveQuickTemplates(current);
        }

        await refreshQuickTemplatesUi();
      },
      commit: async () => {}
    });
  } catch (error) {
    setQuickTemplateError(error.message || 'Не удалось удалить шаблон.');
  }
}

async function handleQuickTemplateToggle(id) {
  const template = quickTemplates.find((item) => item.id === id);

  if (!template) {
    return;
  }

  setQuickTemplateError('');

  try {
    await setQuickTemplateEnabled(id, !template.enabled);
    await refreshQuickTemplatesUi();
  } catch (error) {
    setQuickTemplateError(error.message || 'Не удалось изменить шаблон.');
  }
}

async function handleQuickTemplateReorder(id, direction) {
  setQuickTemplateError('');

  try {
    await reorderQuickTemplate(id, direction);
    await refreshQuickTemplatesUi();
  } catch (error) {
    setQuickTemplateError(error.message || 'Не удалось изменить порядок шаблонов.');
  }
}

function initQuickTemplateUi() {
  quickTemplatesRow.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[data-quick-template-action="manage"]')) {
      await openQuickTemplateModal();
      return;
    }

    const button = target.closest('[data-quick-template-id]');

    if (!button || !quickTemplatesRow.contains(button)) {
      return;
    }

    const template = quickTemplates.find((item) => {
      return item.id === button.dataset.quickTemplateId;
    });

    if (!template) {
      return;
    }

    try {
      await applyQuickTemplate(template);
    } catch (error) {
      showError('Не удалось добавить операцию по шаблону. Проверьте доступ к хранилищу.');
    }
  });

  quickTemplateModalClose.addEventListener('click', closeQuickTemplateModal);
  quickTemplateModal.addEventListener('click', (event) => {
    if (event.target === quickTemplateModal) {
      closeQuickTemplateModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !quickTemplateModal.hidden) {
      closeQuickTemplateModal();
    }
  });

  quickTemplateList.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest('[data-quick-template-action]');

    if (!button || !quickTemplateList.contains(button)) {
      return;
    }

    const action = button.dataset.quickTemplateAction;
    const id = button.dataset.id;

    if (!id) {
      return;
    }

    if (action === 'up' || action === 'down') {
      await handleQuickTemplateReorder(id, action);
    } else if (action === 'edit') {
      await editQuickTemplate(id);
    } else if (action === 'delete') {
      await handleQuickTemplateDelete(id);
    } else if (action === 'toggle') {
      await handleQuickTemplateToggle(id);
    }
  });

  quickTemplateTypeSelect.addEventListener('change', async () => {
    setQuickTemplateError('');
    await populateQuickTemplateCategorySelect(
      quickTemplateTypeSelect.value,
      '',
      false
    );
  });

  quickTemplateForm.addEventListener('submit', handleQuickTemplateSubmit);
  quickTemplateCancel.addEventListener('click', async () => {
    await resetQuickTemplateForm();
    quickTemplateLabelInput.focus();
  });
}

function bytesToBase64(bytes) {
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function createRandomBytes(length) {
  const bytes = new Uint8Array(length);

  window.crypto.getRandomValues(bytes);
  return bytes;
}

function createRandomSalt() {
  return Array.from(createRandomBytes(16), (byte) => {
    return byte.toString(16).padStart(2, '0');
  }).join('');
}

async function hashPin(pin, salt) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto недоступен.');
  }

  const data = new TextEncoder().encode(`${pin}${salt}`);
  const digest = await window.crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest), (byte) => {
    return byte.toString(16).padStart(2, '0');
  }).join('');
}

function secureCompare(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

function isValidPinFormat(pin) {
  return typeof pin === 'string'
    && pin.length >= PIN_MIN_LENGTH
    && pin.length <= PIN_MAX_LENGTH
    && /^\d+$/.test(pin);
}

function isPinConfigured() {
  return securityState.pinEnabled
    && Boolean(securityState.pinHash)
    && Boolean(securityState.pinSalt);
}

function isBiometricSupported() {
  return Boolean(window.PublicKeyCredential)
    && Boolean(navigator.credentials)
    && typeof navigator.credentials.create === 'function'
    && typeof navigator.credentials.get === 'function';
}

function hasBiometricLogin() {
  return isBiometricSupported()
    && securityState.pinEnabled
    && securityState.biometricEnabled
    && Boolean(securityState.credentialId);
}

async function authenticateBiometric() {
  if (!hasBiometricLogin()) {
    throw new Error('Биометрия недоступна.');
  }

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: createRandomBytes(32),
      allowCredentials: [
        {
          id: base64ToBytes(securityState.credentialId),
          type: 'public-key'
        }
      ],
      userVerification: 'required',
      timeout: 60000
    }
  });

  if (!credential) {
    throw new Error('Биометрия не подтвердила вход.');
  }

  return credential;
}

async function changePin(oldPin, newPin) {
  if (!isPinConfigured()) {
    throw new Error('PIN не настроен.');
  }

  if (!isValidPinFormat(oldPin)) {
    throw new Error('Введите текущий PIN из 4–6 цифр.');
  }

  if (!isValidPinFormat(newPin)) {
    throw new Error('Новый PIN должен состоять из 4–6 цифр.');
  }

  const oldPinHash = await hashPin(oldPin, securityState.pinSalt);

  if (!secureCompare(oldPinHash, securityState.pinHash)) {
    throw new Error('Неверный текущий PIN.');
  }

  const salt = createRandomSalt();
  const pinHash = await hashPin(newPin, salt);

  await setSettings({
    pinHash,
    pinSalt: salt
  });

  securityState = {
    ...securityState,
    pinHash,
    pinSalt: salt
  };

  return true;
}

async function resetAllData() {
  discardPendingUndo();

  if (pendingUndoCommit) {
    await pendingUndoCommit;
  }

  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не открыта.'));
      return;
    }

    let transaction;

    try {
      transaction = db.transaction(
        [STORE_NAME, SETTINGS_STORE, CATEGORIES_STORE],
        'readwrite'
      );
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error || new Error('Не удалось сбросить данные.'));
    };

    try {
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(SETTINGS_STORE).clear();
      transaction.objectStore(CATEGORIES_STORE).clear();
    } catch (error) {
      try {
        transaction.abort();
      } catch (abortError) {
        // Транзакция уже завершилась — данные не менялись.
      }

      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      if (settled) {
        return;
      }

      settled = true;

      if (pendingUndo) {
        window.clearTimeout(pendingUndo.timerId);
        pendingUndo = null;
      }

      pendingUndoCommit = null;
      isAppLocked = false;
      window.location.reload();
      resolve();
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

function setSecurityModalError(message) {
  securityModalError.textContent = message || '';
  securityModalError.hidden = !message;
}

function refreshSecurityModalUi() {
  const pinEnabled = securityState.pinEnabled;
  const biometricSupported = isBiometricSupported();
  const biometricEnabled = pinEnabled
    && biometricSupported
    && securityState.biometricEnabled
    && Boolean(securityState.credentialId);

  securityPinStatus.textContent = pinEnabled ? 'включён' : 'не включён';
  securityBiometricStatus.textContent = !biometricSupported
    ? 'недоступна'
    : (biometricEnabled ? 'включена' : 'не настроена');
  securityEnablePinSection.hidden = pinEnabled;
  securityDisablePinSection.hidden = !pinEnabled;
  securityChangePinSection.hidden = !pinEnabled;
  securityEnableBiometricButton.hidden = !biometricSupported || biometricEnabled;
  securityEnableBiometricButton.disabled = !pinEnabled;
  securityDisableBiometricButton.hidden = !biometricSupported || !biometricEnabled;

  if (!biometricSupported) {
    securityBiometricHint.textContent = 'Биометрия недоступна на этом устройстве.';
  } else if (!pinEnabled) {
    securityBiometricHint.textContent = 'Сначала включите PIN.';
  } else if (biometricEnabled) {
    securityBiometricHint.textContent = 'Биометрия включена. PIN остаётся резервным способом входа.';
  } else {
    securityBiometricHint.textContent = 'Используйте отпечаток или Face ID для быстрого входа.';
  }
}

function openSecurityModal() {
  if (isAppLocked) {
    return;
  }

  setSecurityModalError('');
  securityPinInput.value = '';
  securityPinConfirmInput.value = '';
  securityCurrentPinInput.value = '';
  securityChangeOldPinInput.value = '';
  securityChangeNewPinInput.value = '';
  securityChangeNewPinConfirmInput.value = '';
  securityChangePinStatus.textContent = '';
  securityChangePinStatus.hidden = true;
  refreshSecurityModalUi();
  securityModal.hidden = false;
  document.body.classList.add('modal-open');

  const focusTarget = securityState.pinEnabled
    ? securityCurrentPinInput
    : securityPinInput;

  window.setTimeout(() => {
    focusTarget.focus();
  }, 0);
}

function closeSecurityModal() {
  if (securityModal.hidden) {
    return;
  }

  securityModal.hidden = true;
  document.body.classList.remove('modal-open');
  setSecurityModalError('');
  securityChangePinStatus.hidden = true;
  manageSecurityButton.focus();
}

async function handleSecurityPinSubmit(event) {
  event.preventDefault();
  setSecurityModalError('');

  const pin = securityPinInput.value.trim();
  const confirmation = securityPinConfirmInput.value.trim();

  if (!isValidPinFormat(pin)) {
    setSecurityModalError('PIN должен состоять из 4–6 цифр.');
    securityPinInput.focus();
    return;
  }

  if (pin !== confirmation) {
    setSecurityModalError('PIN не совпадает.');
    securityPinConfirmInput.focus();
    return;
  }

  securityEnablePinButton.disabled = true;

  try {
    const salt = createRandomSalt();
    const pinHash = await hashPin(pin, salt);

    await setSettings({
      pinEnabled: true,
      pinHash,
      pinSalt: salt,
      biometricEnabled: false,
      credentialId: undefined
    });

    securityState = {
      pinEnabled: true,
      pinHash,
      pinSalt: salt,
      biometricEnabled: false,
      credentialId: ''
    };
    resetPinLockoutState();
    securityPinInput.value = '';
    securityPinConfirmInput.value = '';
    refreshSecurityModalUi();
    securityCurrentPinInput.focus();
  } catch (error) {
    setSecurityModalError('Не удалось включить PIN. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    securityEnablePinButton.disabled = false;
  }
}

async function handleSecurityCurrentPinSubmit(event) {
  event.preventDefault();
  setSecurityModalError('');

  const pin = securityCurrentPinInput.value.trim();

  if (!isPinConfigured()) {
    setSecurityModalError('PIN не настроен.');
    return;
  }

  if (!isValidPinFormat(pin)) {
    setSecurityModalError('Введите текущий PIN.');
    securityCurrentPinInput.value = '';
    securityCurrentPinInput.focus();
    return;
  }

  securityDisablePinButton.disabled = true;

  try {
    const pinHash = await hashPin(pin, securityState.pinSalt);

    if (!secureCompare(pinHash, securityState.pinHash)) {
      setSecurityModalError('Неверный PIN');
      securityCurrentPinInput.value = '';
      securityCurrentPinInput.focus();
      return;
    }

    await setSettings({
      pinEnabled: false,
      pinHash: undefined,
      pinSalt: undefined,
      biometricEnabled: false,
      credentialId: undefined
    });

    securityState = {
      pinEnabled: false,
      pinHash: '',
      pinSalt: '',
      biometricEnabled: false,
      credentialId: ''
    };
    resetPinLockoutState();
    securityCurrentPinInput.value = '';
    refreshSecurityModalUi();
    securityPinInput.focus();
  } catch (error) {
    setSecurityModalError('Не удалось отключить PIN. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    securityDisablePinButton.disabled = false;
  }
}

async function handleSecurityChangePinSubmit(event) {
  event.preventDefault();
  setSecurityModalError('');
  securityChangePinStatus.hidden = true;

  const oldPin = securityChangeOldPinInput.value.trim();
  const newPin = securityChangeNewPinInput.value.trim();
  const confirmation = securityChangeNewPinConfirmInput.value.trim();

  if (!isPinConfigured()) {
    setSecurityModalError('PIN не настроен.');
    return;
  }

  if (!isValidPinFormat(oldPin)) {
    setSecurityModalError('Введите текущий PIN из 4–6 цифр.');
    securityChangeOldPinInput.focus();
    return;
  }

  if (!isValidPinFormat(newPin)) {
    setSecurityModalError('Новый PIN должен состоять из 4–6 цифр.');
    securityChangeNewPinInput.focus();
    return;
  }

  if (newPin !== confirmation) {
    setSecurityModalError('Новый PIN не совпадает.');
    securityChangeNewPinConfirmInput.focus();
    return;
  }

  securityChangePinButton.disabled = true;

  try {
    await changePin(oldPin, newPin);
    securityChangeOldPinInput.value = '';
    securityChangeNewPinInput.value = '';
    securityChangeNewPinConfirmInput.value = '';
    securityCurrentPinInput.value = '';
    securityChangePinStatus.textContent = 'PIN изменён. Биометрия продолжает работать.';
    securityChangePinStatus.hidden = false;
    securityChangeOldPinInput.focus();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safeMessages = [
      'PIN не настроен.',
      'Введите текущий PIN из 4–6 цифр.',
      'Новый PIN должен состоять из 4–6 цифр.',
      'Неверный текущий PIN.'
    ];
    setSecurityModalError(
      safeMessages.includes(message)
        ? message
        : 'Не удалось сменить PIN. Проверьте доступ к хранилищу и попробуйте ещё раз.'
    );
  } finally {
    securityChangePinButton.disabled = false;
  }
}

async function handleEnableBiometric() {
  setSecurityModalError('');

  if (!securityState.pinEnabled) {
    setSecurityModalError('Сначала включите PIN.');
    return;
  }

  if (!isBiometricSupported()) {
    setSecurityModalError('Биометрия недоступна на этом устройстве.');
    return;
  }

  securityEnableBiometricButton.disabled = true;

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: createRandomBytes(32),
        rp: {
          name: 'Мои Расходы'
        },
        user: {
          id: createRandomBytes(16),
          name: 'local-user',
          displayName: 'Мои Расходы'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000,
        attestation: 'none'
      }
    });

    if (!credential || !credential.rawId) {
      throw new Error('Не удалось создать биометрический ключ.');
    }

    const credentialId = bytesToBase64(new Uint8Array(credential.rawId));

    await setSettings({
      biometricEnabled: true,
      credentialId
    });

    securityState.biometricEnabled = true;
    securityState.credentialId = credentialId;
    refreshSecurityModalUi();
  } catch (error) {
    setSecurityModalError('Не удалось включить биометрию. Убедитесь, что она настроена на устройстве.');
  } finally {
    securityEnableBiometricButton.disabled = false;
  }
}

async function handleDisableBiometric() {
  setSecurityModalError('');
  securityDisableBiometricButton.disabled = true;

  try {
    await setSettings({
      biometricEnabled: false,
      credentialId: undefined
    });

    securityState.biometricEnabled = false;
    securityState.credentialId = '';
    refreshSecurityModalUi();
  } catch (error) {
    setSecurityModalError('Не удалось отключить биометрию. Попробуйте ещё раз.');
  } finally {
    securityDisableBiometricButton.disabled = false;
  }
}

function setLockMessage(message, isLockout = false) {
  lockMessage.textContent = message || '';
  lockMessage.hidden = !message;
  lockMessage.dataset.lockout = isLockout ? 'true' : 'false';
}

function resetPinLockoutState() {
  if (pinLockCountdownTimer !== null) {
    window.clearInterval(pinLockCountdownTimer);
    pinLockCountdownTimer = null;
  }

  pinFailedAttempts = 0;
  pinLockedUntil = 0;
  lockPinInput.disabled = false;
  lockSubmitButton.disabled = false;
}

function updatePinLockoutUi() {
  const remaining = pinLockedUntil - Date.now();

  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);

    lockPinInput.disabled = true;
    lockSubmitButton.disabled = true;
    setLockMessage(`Слишком много попыток. Повторите через ${seconds} с.`, true);
    return;
  }

  pinLockedUntil = 0;

  if (pinLockCountdownTimer !== null) {
    window.clearInterval(pinLockCountdownTimer);
    pinLockCountdownTimer = null;
  }

  lockPinInput.disabled = false;
  lockSubmitButton.disabled = false;

  if (lockMessage.dataset.lockout === 'true') {
    setLockMessage('');
  }
}

function startPinLockout() {
  pinFailedAttempts = 0;
  pinLockedUntil = Date.now() + PIN_LOCK_DURATION;
  lockPinInput.value = '';

  if (pinLockCountdownTimer !== null) {
    window.clearInterval(pinLockCountdownTimer);
  }

  updatePinLockoutUi();
  pinLockCountdownTimer = window.setInterval(updatePinLockoutUi, 500);
}

function showLockScreen() {
  if (!isPinConfigured()) {
    return;
  }

  isAppLocked = true;
  appRoot.hidden = true;
  lockScreen.hidden = false;
  document.body.classList.add('lock-screen-open');
  lockPinInput.value = '';
  setLockMessage('');
  lockBiometricButton.hidden = !hasBiometricLogin();
  lockBiometricButton.disabled = false;
  updatePinLockoutUi();

  if (!lockPinInput.disabled) {
    window.setTimeout(() => {
      if (isAppLocked) {
        lockPinInput.focus();
      }
    }, 0);
  }
}

function unlockApp() {
  if (!isAppLocked) {
    return;
  }

  isAppLocked = false;
  appRoot.hidden = false;
  lockScreen.hidden = true;
  document.body.classList.remove('lock-screen-open');
  lockPinInput.value = '';
  setLockMessage('');
  resetPinLockoutState();
  appHiddenAt = 0;
}

async function handleLockSubmit(event) {
  event.preventDefault();

  if (Date.now() < pinLockedUntil) {
    updatePinLockoutUi();
    return;
  }

  if (!isPinConfigured()) {
    setLockMessage('PIN не настроен.');
    return;
  }

  setLockMessage('');

  const pin = lockPinInput.value.trim();

  if (!isValidPinFormat(pin)) {
    setLockMessage('Введите PIN из 4–6 цифр.');
    lockPinInput.value = '';
    lockPinInput.focus();
    return;
  }

  lockSubmitButton.disabled = true;

  try {
    const pinHash = await hashPin(pin, securityState.pinSalt);

    if (!secureCompare(pinHash, securityState.pinHash)) {
      pinFailedAttempts += 1;
      lockPinInput.value = '';

      if (pinFailedAttempts >= PIN_MAX_ATTEMPTS) {
        startPinLockout();
      } else {
        setLockMessage('Неверный PIN');
        lockPinInput.focus();
      }

      return;
    }

    unlockApp();
  } catch (error) {
    setLockMessage('Не удалось проверить PIN. Попробуйте ещё раз.');
  } finally {
    if (Date.now() >= pinLockedUntil) {
      lockSubmitButton.disabled = false;
    }
  }
}

async function handleBiometricUnlock() {
  if (!isAppLocked || !hasBiometricLogin()) {
    return;
  }

  lockBiometricButton.disabled = true;
  setLockMessage('');

  try {
    await authenticateBiometric();
    unlockApp();
  } catch (error) {
    setLockMessage('Биометрия недоступна, введите PIN');

    if (!lockPinInput.disabled) {
      lockPinInput.focus();
    }
  } finally {
    lockBiometricButton.disabled = false;
  }
}

function setPinRecoveryError(message) {
  pinRecoveryError.textContent = message || '';
  pinRecoveryError.hidden = !message;
}

function setPinRecoveryStep(step) {
  pinRecoveryOptions.hidden = step !== 'options';
  pinRecoveryWarning.hidden = step !== 'warning';
  pinRecoveryConfirm.hidden = step !== 'confirm';
  setPinRecoveryError('');
}

function resetPinRecoveryFlow() {
  pinRecoveryConfirmInput.value = '';
  pinRecoveryConfirmInput.disabled = false;
  pinRecoveryConfirmDelete.disabled = true;
  pinRecoveryConfirmDelete.textContent = 'Удалить и сбросить';
  pinRecoveryBiometricButton.disabled = false;
  setPinRecoveryStep('options');
}

function openPinRecoveryModal() {
  if (!isAppLocked) {
    return;
  }

  pinRecoveryReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : lockForgotPinButton;
  resetPinRecoveryFlow();
  pinRecoveryBiometricButton.hidden = securityState.biometricEnabled !== true;
  pinRecoveryModal.hidden = false;
  document.body.classList.add('modal-open');

  window.setTimeout(() => {
    const focusTarget = pinRecoveryBiometricButton.hidden
      ? pinRecoveryResetButton
      : pinRecoveryBiometricButton;
    focusTarget.focus();
  }, 0);
}

function closePinRecoveryModal({ restoreFocus = true } = {}) {
  if (pinRecoveryModal.hidden) {
    return;
  }

  pinRecoveryModal.hidden = true;
  document.body.classList.remove('modal-open');
  setPinRecoveryError('');
  pinRecoveryConfirmInput.value = '';
  pinRecoveryConfirmDelete.disabled = true;

  const returnFocus = pinRecoveryReturnFocus;
  pinRecoveryReturnFocus = null;

  if (restoreFocus) {
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus();
    } else if (!lockPinInput.disabled) {
      lockPinInput.focus();
    }
  }
}

function handlePinRecoveryResetStart() {
  setPinRecoveryStep('warning');
  pinRecoveryWarningContinue.focus();
}

function handlePinRecoveryWarningContinue() {
  setPinRecoveryStep('confirm');
  pinRecoveryConfirmInput.value = '';
  pinRecoveryConfirmDelete.disabled = true;
  pinRecoveryConfirmInput.focus();
}

function handlePinRecoveryWarningCancel() {
  setPinRecoveryStep('options');
  pinRecoveryResetButton.focus();
}

function handlePinRecoveryBack() {
  setPinRecoveryStep('warning');
  pinRecoveryWarningContinue.focus();
}

function handlePinRecoveryInput() {
  pinRecoveryConfirmDelete.disabled = pinRecoveryConfirmInput.value !== 'УДАЛИТЬ';
  setPinRecoveryError('');
}

async function handlePinRecoveryBiometric() {
  if (!securityState.biometricEnabled) {
    setPinRecoveryError('Биометрия недоступна.');
    return;
  }

  pinRecoveryBiometricButton.disabled = true;

  try {
    await authenticateBiometric();
    closePinRecoveryModal({ restoreFocus: false });
    unlockApp();
  } catch (error) {
    closePinRecoveryModal({ restoreFocus: false });
    setLockMessage('Биометрия недоступна');

    if (!lockPinInput.disabled) {
      lockPinInput.focus();
    }
  } finally {
    pinRecoveryBiometricButton.disabled = false;
  }
}

async function handlePinRecoveryDelete() {
  if (pinRecoveryConfirmInput.value !== 'УДАЛИТЬ') {
    setPinRecoveryError('Введите слово УДАЛИТЬ заглавными буквами.');
    pinRecoveryConfirmInput.focus();
    return;
  }

  setPinRecoveryError('');
  pinRecoveryConfirmDelete.disabled = true;
  pinRecoveryConfirmInput.disabled = true;
  pinRecoveryConfirmDelete.textContent = 'Удаление…';

  try {
    pinRecoveryModal.hidden = true;
    document.body.classList.remove('modal-open');
    await resetAllData();
  } catch (error) {
    pinRecoveryModal.hidden = false;
    document.body.classList.add('modal-open');
    pinRecoveryConfirmInput.disabled = false;
    pinRecoveryConfirmDelete.disabled = false;
    pinRecoveryConfirmDelete.textContent = 'Удалить и сбросить';
    setPinRecoveryError(
      'Не удалось удалить данные. Проверьте доступ к хранилищу и попробуйте ещё раз.'
    );
  }
}

function handleVisibilityChange() {
  if (!isPinConfigured()) {
    return;
  }

  if (document.visibilityState === 'hidden') {
    if (!isAppLocked) {
      appHiddenAt = Date.now();
    }

    return;
  }

  if (document.visibilityState === 'visible') {
    const hiddenAt = appHiddenAt;

    appHiddenAt = 0;

    if (!isAppLocked && hiddenAt && Date.now() - hiddenAt > APP_LOCK_TIMEOUT) {
      showLockScreen();
    }
  }
}

function initSecurityUi() {
  manageSecurityButton.addEventListener('click', openSecurityModal);
  securityModalClose.addEventListener('click', closeSecurityModal);
  securityModal.addEventListener('click', (event) => {
    if (event.target === securityModal) {
      closeSecurityModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (!pinRecoveryModal.hidden) {
      closePinRecoveryModal();
      return;
    }

    if (!securityModal.hidden) {
      closeSecurityModal();
    }
  });

  securityPinForm.addEventListener('submit', handleSecurityPinSubmit);
  securityCurrentPinForm.addEventListener('submit', handleSecurityCurrentPinSubmit);
  securityChangePinForm.addEventListener('submit', handleSecurityChangePinSubmit);
  securityEnableBiometricButton.addEventListener('click', handleEnableBiometric);
  securityDisableBiometricButton.addEventListener('click', handleDisableBiometric);
  lockForm.addEventListener('submit', handleLockSubmit);
  lockForgotPinButton.addEventListener('click', openPinRecoveryModal);
  lockBiometricButton.addEventListener('click', handleBiometricUnlock);
  pinRecoveryClose.addEventListener('click', () => closePinRecoveryModal());
  pinRecoveryModal.addEventListener('click', (event) => {
    if (event.target === pinRecoveryModal) {
      closePinRecoveryModal();
    }
  });
  pinRecoveryBiometricButton.addEventListener('click', handlePinRecoveryBiometric);
  pinRecoveryResetButton.addEventListener('click', handlePinRecoveryResetStart);
  pinRecoveryWarningContinue.addEventListener('click', handlePinRecoveryWarningContinue);
  pinRecoveryWarningCancel.addEventListener('click', handlePinRecoveryWarningCancel);
  pinRecoveryBack.addEventListener('click', handlePinRecoveryBack);
  pinRecoveryConfirmInput.addEventListener('input', handlePinRecoveryInput);
  pinRecoveryConfirmDelete.addEventListener('click', handlePinRecoveryDelete);
  document.addEventListener('visibilitychange', handleVisibilityChange);
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
  editInitialBalanceButton.disabled = true;

  try {
    await setInitialBalance(value);

    initialBalance = value;
    renderBalanceLine();
    markStatsDirty();
  } catch (error) {
    showError('Не удалось сохранить начальный баланс. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    editBalanceButton.disabled = false;
    editInitialBalanceButton.disabled = false;
  }
}

function getCurrentBalance() {
  const totals = calculateTotals(expenses);
  return roundCurrency(initialBalance + totals.incomeTotal - totals.expenseTotal);
}

function setReconcileError(message) {
  reconcileError.textContent = message || '';
  reconcileError.hidden = !message;
}

function clearReconcileCloseTimer() {
  if (reconcileCloseTimer !== null) {
    window.clearTimeout(reconcileCloseTimer);
    reconcileCloseTimer = null;
  }
}

function resetReconcileView() {
  clearReconcileCloseTimer();
  reconcileDraft = null;
  balanceReconcileForm.hidden = false;
  reconcileResult.hidden = true;
  reconcileResultActions.hidden = true;
  reconcileResultMessage.textContent = '';
  reconcileResultMessage.classList.remove('is-difference');
  reconcileActualInput.value = '';
  reconcileCreateButton.disabled = false;
  reconcileSubmitButton.disabled = false;
  setReconcileError('');
}

async function openBalanceReconcileModal() {
  if (isAppLocked) {
    return;
  }

  if (pendingUndo) {
    await settlePendingUndoForNewAction();
  }

  if (isAppLocked) {
    return;
  }

  reconcileReturnFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : reconcileBalanceButton;
  resetReconcileView();

  const computed = getCurrentBalance();
  reconcileDraft = {
    computed,
    actual: null,
    diff: 0
  };
  reconcileComputedValue.textContent = formatAmount(computed);
  balanceReconcileModal.hidden = false;
  document.body.classList.add('modal-open');

  window.setTimeout(() => {
    reconcileActualInput.focus();
  }, 0);
}

function closeBalanceReconcileModal({ restoreFocus = true } = {}) {
  if (balanceReconcileModal.hidden) {
    return;
  }

  balanceReconcileModal.hidden = true;
  document.body.classList.remove('modal-open');
  resetReconcileView();

  const returnFocus = reconcileReturnFocus;
  reconcileReturnFocus = null;

  if (restoreFocus) {
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
      returnFocus.focus();
    } else {
      reconcileBalanceButton.focus();
    }
  }
}

function handleReconcileSubmit(event) {
  event.preventDefault();
  setReconcileError('');
  clearReconcileCloseTimer();

  const actual = parseBalanceInput(reconcileActualInput.value);

  if (actual === null) {
    setReconcileError('Введите фактический остаток числом. Значение может быть отрицательным.');
    reconcileActualInput.focus();
    return;
  }

  const computed = reconcileDraft ? reconcileDraft.computed : getCurrentBalance();
  const diff = roundCurrency(actual - computed);

  reconcileDraft = {
    computed,
    actual,
    diff
  };
  reconcileComputedValue.textContent = formatAmount(computed);
  balanceReconcileForm.hidden = true;
  reconcileResult.hidden = false;

  if (Math.abs(diff) < 1) {
    reconcileResultMessage.textContent = 'Баланс совпадает';
    reconcileResultMessage.classList.remove('is-difference');
    reconcileResultActions.hidden = true;
    reconcileCreateButton.disabled = true;
    reconcileCloseTimer = window.setTimeout(() => {
      reconcileCloseTimer = null;
      closeBalanceReconcileModal();
    }, 1500);
    return;
  }

  reconcileResultMessage.textContent = `Расхождение: ${formatNetAmount(diff)}`;
  reconcileResultMessage.classList.add('is-difference');
  reconcileResultActions.hidden = false;
  reconcileCreateButton.disabled = false;
  reconcileCreateButton.focus();
}

async function handleCreateAdjustment() {
  if (!reconcileDraft || Math.abs(reconcileDraft.diff) < 1) {
    return;
  }

  const diff = reconcileDraft.diff;
  const amount = roundCurrency(Math.abs(diff));
  const type = diff > 0 ? 'income' : 'expense';

  if (amount <= 0) {
    setReconcileError('Сумма корректировки должна быть больше нуля.');
    return;
  }

  reconcileCreateButton.disabled = true;
  setReconcileError('');

  try {
    await settlePendingUndoForNewAction();

    const categories = await getCategories(type);
    const systemCategory = categories.find((category) => category.isSystem === true)
      || categories.find((category) => category.name === SYSTEM_CATEGORY_NAME);

    if (!systemCategory) {
      throw new Error('Системная категория «Другое» не найдена.');
    }

    const adjustment = {
      amount,
      note: 'Корректировка баланса',
      category: systemCategory.name,
      date: getTodayISO(),
      type,
      createdAt: new Date().toISOString(),
      isAdjustment: true
    };

    const id = await addExpense(adjustment);
    expenses.push({ id, ...adjustment });

    try {
      await render(expenses);
    } catch (renderError) {
      showError('Корректировка создана, но не удалось обновить экран. Перезагрузите приложение.');
    }

    closeBalanceReconcileModal();
    showInfoToast(`Баланс сверен: ${formatNetAmount(diff)}`);
  } catch (error) {
    reconcileCreateButton.disabled = false;
    setReconcileError(
      error instanceof Error && error.message === 'Системная категория «Другое» не найдена.'
        ? error.message
        : 'Не удалось создать корректировку. Проверьте доступ к хранилищу и попробуйте ещё раз.'
    );
  }
}

function initBalanceReconcileUi() {
  reconcileBalanceButton.addEventListener('click', openBalanceReconcileModal);
  balanceReconcileClose.addEventListener('click', () => closeBalanceReconcileModal());
  balanceReconcileModal.addEventListener('click', (event) => {
    if (event.target === balanceReconcileModal) {
      closeBalanceReconcileModal();
    }
  });
  balanceReconcileForm.addEventListener('submit', handleReconcileSubmit);
  reconcileCreateButton.addEventListener('click', handleCreateAdjustment);
  reconcileCancelButton.addEventListener('click', () => closeBalanceReconcileModal());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !balanceReconcileModal.hidden) {
      closeBalanceReconcileModal();
    }
  });
}

function showUndoToast(message) {
  undoToastText.textContent = message || 'Удалено.';
  undoToast.hidden = false;
  undoToast.classList.remove('is-visible');
  void undoToast.offsetWidth;
  undoToast.classList.add('is-visible');
  document.body.classList.add('undo-toast-visible');
}

function hideUndoToast() {
  undoToast.hidden = true;
  undoToast.classList.remove('is-visible');
  document.body.classList.remove('undo-toast-visible');
}

function showInfoToast(message) {
  if (infoToastTimer !== null) {
    window.clearTimeout(infoToastTimer);
    infoToastTimer = null;
  }

  infoToastText.textContent = message || '';
  infoToast.hidden = false;
  infoToastTimer = window.setTimeout(() => {
    infoToastTimer = null;
    infoToast.hidden = true;
  }, 3500);
}

function startPendingUndo(options) {
  const entry = {
    kind: options.kind,
    toastText: options.toastText || 'Удалено.',
    renderAfterCommit: options.renderAfterCommit === true,
    undoErrorMessage: options.undoErrorMessage,
    commitErrorMessage: options.commitErrorMessage,
    expense: options.expense || null,
    undo: options.undo,
    commit: options.commit,
    timerId: null
  };

  entry.timerId = window.setTimeout(() => {
    finalizePendingUndo(entry);
  }, UNDO_DELETE_TIMEOUT);
  pendingUndo = entry;
  showUndoToast(entry.toastText);

  return entry;
}

function discardPendingUndo() {
  if (!pendingUndo) {
    hideUndoToast();
    return;
  }

  window.clearTimeout(pendingUndo.timerId);
  pendingUndo = null;
  hideUndoToast();
}

async function undoPendingUndo() {
  if (!pendingUndo) {
    return;
  }

  const entry = pendingUndo;

  discardPendingUndo();

  try {
    await entry.undo();
  } catch (error) {
    showError(entry.undoErrorMessage || 'Не удалось отменить действие. Попробуйте ещё раз.');
  }
}

function getPendingExpenseDeleteId() {
  if (pendingUndo && pendingUndo.kind === 'expense-delete' && pendingUndo.expense) {
    return pendingUndo.expense.id;
  }

  return null;
}

async function commitPendingUndo() {
  if (!pendingUndo) {
    if (pendingUndoCommit) {
      await pendingUndoCommit;
    }

    return;
  }

  const entry = pendingUndo;

  window.clearTimeout(entry.timerId);
  pendingUndo = null;
  hideUndoToast();

  const commit = (async () => {
    try {
      await entry.commit();
    } catch (error) {
      showError(
        entry.commitErrorMessage
          || 'Не удалось завершить действие. Проверьте доступ к хранилищу и попробуйте ещё раз.'
      );
    }
  })();

  pendingUndoCommit = commit;

  try {
    await commit;
  } finally {
    if (pendingUndoCommit === commit) {
      pendingUndoCommit = null;
    }
  }
}

async function finalizePendingUndo(entry) {
  if (!pendingUndo || pendingUndo !== entry) {
    return;
  }

  await commitPendingUndo();

  if (entry.renderAfterCommit) {
    await render(expenses);
  }
}

async function settlePendingUndoForNewAction() {
  if (pendingUndo) {
    const renderAfterCommit = pendingUndo.renderAfterCommit;

    await commitPendingUndo();

    if (renderAfterCommit) {
      await render(expenses);
    }
  } else if (pendingUndoCommit) {
    await pendingUndoCommit;
  }
}

async function deleteExpense(id) {
  if (!Number.isInteger(id)) {
    return;
  }

  if (
    pendingUndo
    && pendingUndo.kind === 'expense-delete'
    && pendingUndo.expense
    && pendingUndo.expense.id === id
  ) {
    return;
  }

  clearError();
  await settlePendingUndoForNewAction();

  const expense = expenses.find((item) => item.id === id);

  if (!expense) {
    await render(expenses);
    return;
  }

  if (editingExpenseId === id) {
    await resetFormToAdd();
  }

  startPendingUndo({
    kind: 'expense-delete',
    toastText: 'Удалено.',
    expense,
    renderAfterCommit: true,
    commitErrorMessage: 'Не удалось удалить операцию. Проверьте доступ к хранилищу и попробуйте ещё раз.',
    undoErrorMessage: 'Не удалось отменить удаление. Попробуйте ещё раз.',
    undo: async () => {
      renderHome(expenses);

      if (activeTab === 'history') {
        renderHistory(expenses);
      }
    },
    commit: async () => {
      await deleteExpenseRecord(expense.id);
      expenses = expenses.filter((item) => item.id !== expense.id);
    }
  });

  await render(expenses);
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

  const selectedCategory = categoryInput.selectedOptions[0];

  if (!categoryInput.value || !selectedCategory || selectedCategory.disabled) {
    alert('Выберите категорию.');
    categoryInput.focus();
    return;
  }

  const expenseData = {
    amount,
    note: noteInput.value.trim(),
    category: categoryInput.value,
    date: dateInput.value,
    type: currentType
  };

  submitButton.disabled = true;
  cancelEditButton.disabled = true;

  try {
    if (editingExpenseId !== null) {
      const updated = await updateExpense(editingExpenseId, expenseData);

      expenses = expenses.map((expense) => {
        return expense.id === updated.id ? updated : expense;
      });
      await render(expenses);
      await resetFormToAdd();
    } else {
      const expense = {
        ...expenseData,
        createdAt: new Date().toISOString()
      };
      const id = await addExpense(expense);

      expenses.push({ id, ...expense });
      await render(expenses);

      form.reset();
      dateInput.value = getTodayISO();
      amountInput.focus();
    }
  } catch (error) {
    showError('Не удалось сохранить операцию. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  } finally {
    submitButton.disabled = false;
    cancelEditButton.disabled = false;
  }
}

async function handleExpenseListClick(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const editButton = target.closest('.edit-button');

  if (editButton && expenseList.contains(editButton)) {
    const id = Number(editButton.dataset.id);
    const expense = expenses.find((item) => item.id === id);

    if (expense) {
      await startEditingExpense(expense);
    }

    return;
  }

  const deleteButton = target.closest('.delete-button');

  if (!deleteButton || !expenseList.contains(deleteButton)) {
    return;
  }

  const id = Number(deleteButton.dataset.id);

  if (!Number.isInteger(id)) {
    return;
  }

  try {
    await deleteExpense(id);
  } catch (error) {
    showError('Не удалось удалить операцию. Проверьте доступ к хранилищу и попробуйте ещё раз.');
  }
}

async function init() {
  if ('launchQueue' in window && typeof window.launchQueue.setConsumer === 'function') {
    window.launchQueue.setConsumer(async () => {
      // focus-existing переиспользует уже открытое окно; данные запуска не нужны.
    });
  }

  dateInput.value = getTodayISO();

  form.addEventListener('submit', handleSubmit);
  cancelEditButton.addEventListener('click', handleCancelEdit);
  expenseList.addEventListener('click', handleExpenseListClick);
  undoToastButton.addEventListener('click', undoPendingUndo);
  editBalanceButton.addEventListener('click', handleEditBalance);
  editInitialBalanceButton.addEventListener('click', handleEditBalance);
  homeShowAllButton.addEventListener('click', () => showTab('history'));
  manageLimitsButton.addEventListener('click', () => openCategoryModal('expense'));
  homeLimits.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[data-limit-category]')) {
      showTab('stats');
    }
  });
  manageQuickTemplatesButton.addEventListener('click', openQuickTemplateModal);
  exportJsonButton.addEventListener('click', handleExportJson);
  exportCsvButton.addEventListener('click', handleExportCsv);
  reportPdfButton.addEventListener('click', printReport);
  importJsonButton.addEventListener('click', handleImportClick);
  importFileInput.addEventListener('change', handleImportFileChange);
  backupBannerExportButton.addEventListener('click', handleExportJson);
  backupBannerHideButton.addEventListener('click', handleBackupBannerHide);
  initTypeTabs();
  initPeriodTabs();
  initCustomPeriod();
  initCategoryFilter();
  initExpenseListControls();
  initCategoryModal();
  initQuickTemplateUi();
  initSecurityUi();
  initBalanceReconcileUi();
  initTabNavigation();
  showTab(getTabFromHash(), { push: false });

  window.addEventListener('resize', () => {
    if (lastChartData) {
      renderBarChart(statsChart, lastChartData, lastChartPeriod);
    }

    if (lastBalanceSeries) {
      renderBalanceChart(statsBalanceChart, lastBalanceSeries, lastBalancePeriod);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (pendingUndo) {
      window.clearTimeout(pendingUndo.timerId);
      pendingUndo = null;
    }
  });

  try {
    db = await openDB();
    await seedDefaultsIfEmpty();
    await loadStoredPreferences();

    if (isPinConfigured()) {
      showLockScreen();
    }

    const [loadedExpenses, balance] = await Promise.all([
      getAllExpenses(),
      getInitialBalance()
    ]);

    expenses = loadedExpenses;
    initialBalance = balance;
    await refreshCategoryUi();
    await refreshQuickTemplatesUi();
    appDataLoaded = true;
    await render(expenses);
    updateBackupBanner();
  } catch (error) {
    showError('Не удалось загрузить операции. Проверьте настройки браузера и перезагрузите страницу.');
  }
}

init();
