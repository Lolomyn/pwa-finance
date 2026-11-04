'use strict';

/* Приложение «Подписки и платежи». Данные хранятся в общей IndexedDB
   expense-tracker-db: subscriptionsData — подписки и платежи,
   cashbackData — кэшбэк (формат совместим со старым виджетом хаба). */
(function () {
  const DB_NAME = 'expense-tracker-db';
  const DB_VERSION = 5;
  const EXPENSES_STORE = 'expenses';
  const SETTINGS_STORE = 'settings';
  const CATEGORIES_STORE = 'categories';
  const NOTES_STORE = 'notes';

  const SUBSCRIPTIONS_KEY = 'subscriptionsData';
  const CASHBACK_KEY = 'cashbackData';

  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const FREQUENCIES = ['мес', '2 нед', 'нед', 'год'];
  const FREQ_LABELS = {
    'мес': 'ежемесячно',
    '2 нед': 'раз в 2 недели',
    'нед': 'еженедельно',
    'год': 'ежегодно'
  };
  const CAT_MAX_LENGTH = 40;
  const CAT_LIMIT = 20;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const URGENT_DAYS = 7;

  const LOGOS = {
    tbank: `
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M56 0H0V56H56V0Z" fill="#FFDD2D"/>
        <path d="M13.3 15.3999H42.7001V30.189C42.7001 33.978 40.6771 37.484 37.3965 39.3758L28 44.7999L18.6035 39.3758C15.3229 37.4787 13.3 33.978 13.3 30.189V15.3999Z" fill="white"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M21.3706 23.1826V27.7839C21.9995 27.0711 23.1419 26.5942 24.4521 26.5942H25.8723V31.9397C25.8723 33.3599 25.4845 34.6072 24.9133 35.2937H31.092C30.5208 34.6072 30.1329 33.3651 30.1329 31.9449V26.5942H31.5532C32.8581 26.5942 34.0058 27.0764 34.6347 27.7839V23.1826H21.3706Z" fill="#333333"/>
      </svg>
    `,
    alfa: `
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EF3124" d="M0 0h28v28H0z"/>
        <path fill="#fff" d="M8.743 19.815h10.514V22H8.743zM15.912 7.6c-.301-.894-.646-1.6-1.83-1.6s-1.552.703-1.867 1.6l-3.253 9.247h2.157l.75-2.198h4.154l.698 2.198h2.295zm-3.414 5.192 1.475-4.388h.054l1.393 4.388z"/>
      </svg>
    `,
    ozon: `
      <svg viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="1000" height="1000" fill="#005BFF"/>
        <path d="M278.02 348.657C278.02 408.327 233.815 449.496 173.51 449.496C113.179 449.496 69 408.327 69 348.657C69 288.987 113.206 247.818 173.51 247.818C233.842 247.818 278.02 288.987 278.02 348.657ZM685.329 348.657C685.329 408.327 641.124 449.496 580.819 449.496C520.514 449.496 476.309 408.327 476.309 348.657C476.309 288.987 520.514 247.818 580.819 247.818C641.124 247.818 685.329 288.987 685.329 348.657ZM897.963 326.573V442.94H847.195V337.323C847.195 306.904 832.85 294.349 808.383 294.349C782.693 294.349 764.177 308.656 764.177 349.851V442.94H713.409V253.764H763.592V282.404H764.788C777.327 260.931 798.845 247.792 826.315 247.792C867.491 247.818 897.963 270.486 897.963 326.573ZM296.536 253.764V296.737H396.266L294.145 402.354V442.94H463.77V399.966H356.868L458.987 293.739V253.764H296.536ZM122.158 348.657C122.158 381.465 142.455 402.965 173.51 402.965C204.565 402.965 224.862 381.492 224.862 348.657C224.862 315.822 204.565 294.349 173.51 294.349C142.455 294.349 122.158 315.822 122.158 348.657ZM529.467 348.657C529.467 381.465 549.764 402.965 580.819 402.965C611.874 402.965 632.17 381.492 632.17 348.657C632.17 315.822 611.874 294.349 580.819 294.349C549.764 294.349 529.467 315.822 529.467 348.657Z" fill="white"/>
        <path d="M712.05 561.039V744.214H662.891V670.245H584.231V744.214H535.072V561.039H584.231V627.477H662.891V561.039H712.05ZM444.296 561.039V587.615H443.147C434.478 569.135 411.326 555.256 381.849 555.256C333.85 555.256 294.514 589.928 294.514 652.331C294.514 715.326 332.689 750.562 381.849 750.562C411.917 750.562 433.317 736.683 443.147 719.36H444.296V744.214H493.455V561.039H444.296ZM184.085 559.317C154.015 559.317 130.89 573.196 118.749 595.145H117.59C119.314 554.691 133.205 537.368 180.613 532.742L254.052 525.802V479L172.51 485.348C92.7162 491.697 69 546.029 69 632.694C69 709.543 113.527 750.562 171.352 750.562C228.611 750.562 272.547 709.543 272.547 652.331C272.547 595.145 232.65 559.317 184.085 559.317ZM394.579 706.073C365.068 706.073 346.011 684.123 346.011 653.488C346.011 622.286 365.102 599.746 394.579 599.746C424.057 599.746 444.296 621.694 444.296 652.896C444.296 683.532 424.057 706.073 394.579 706.073ZM170.76 706.073C142.44 706.073 120.446 684.689 120.446 652.922C120.446 620.563 142.414 601.493 170.76 601.493C199.108 601.493 221.075 620.563 221.075 652.922C221.075 684.689 199.108 706.073 170.76 706.073ZM869.346 744.214L802.86 656.391V744.214H753.701V561.039H802.86V636.73L864.159 561.039H924.888L849.699 644.235L931.805 744.187H869.346V744.214Z" fill="white"/>
      </svg>
    `,
    yandex: `
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="url(#cb-yandex-gradient)"/>
        <path d="M-1.19209e-06 11.3L3.65 7.5L29.15 5.5L32 8.7L34 33H-2L-1.19209e-06 11.3Z" fill="#170023"/>
        <path d="M7.14469 14.2735L14.3356 14.2734L10.6635 23.6469C9.78244 23.7377 8.82879 23.836 7.95306 23.9502L10.3887 17.7427C10.56 17.3097 10.758 16.8346 10.9047 16.3972C10.2467 16.4065 9.57836 16.3976 8.91796 16.4034C8.82401 16.7028 8.65394 17.0976 8.53544 17.3973L7.84799 19.1368L5.85079 24.1956C5.01134 24.2953 3.96481 24.3765 3.14526 24.5128L5.74056 17.8919L6.62204 15.6417C6.78844 15.2176 7.00501 14.7019 7.14469 14.2735Z" fill="#FEFDFD"/>
        <path d="M24.3881 12.4502L28.0421 12.4492C27.9431 12.6635 27.5991 13.7658 27.4749 13.8342L25.1846 13.8373C24.7648 13.8363 24.2779 13.8231 23.8625 13.8411C24.0315 13.3992 24.2466 12.8924 24.3881 12.4502Z" fill="#FEFDFD"/>
        <defs>
          <linearGradient id="cb-yandex-gradient" x1="0" y1="16" x2="32" y2="16" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFC3C3"/>
            <stop offset="1" stop-color="#B7D0F7"/>
          </linearGradient>
        </defs>
      </svg>
    `,
    sber: `
      <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" fill="url(#cb-sber-gradient)"/>
        <path d="M13.9912 5C16.0506 5.00114 18.0476 5.70839 19.6484 7.00391L17.8926 8.29883C16.8416 7.57729 15.6149 7.15963 14.3467 7.08691L14.3457 7.1084C14.2209 7.09045 14.115 7.09082 13.9912 7.09082C13.0837 7.09084 12.1849 7.26991 11.3477 7.62012C10.5105 7.97032 9.75149 8.48376 9.11426 9.12988L9.1084 9.12402C8.50745 9.72195 8.02125 10.4262 7.67481 11.2021C7.32932 11.976 7.12868 12.8061 7.08399 13.6504L7.09277 13.6514C7.0863 13.696 7.08371 13.7386 7.08106 13.7803C7.07847 13.8561 7.07528 13.9319 7.0752 14.0078C7.07384 14.9148 7.25258 15.8127 7.60254 16.6494C7.95284 17.4869 8.46676 18.2466 9.11426 18.8828L9.10547 18.8906C9.70291 19.4935 10.4077 19.9813 11.1846 20.3281C11.959 20.6738 12.7898 20.8729 13.6348 20.916L13.6357 20.9062C13.69 20.9141 13.7409 20.9174 13.791 20.9199C13.8576 20.9218 13.9245 20.9249 13.9912 20.9248C14.8995 20.9304 15.7997 20.7528 16.6377 20.4023C17.4757 20.0518 18.2343 19.5355 18.8682 18.8848L18.8828 18.8994C19.4891 18.3004 19.9799 17.5935 20.3281 16.8135C20.7223 15.9304 20.9257 14.9739 20.9248 14.0068V13.8291L22.8584 12.3926C22.9464 12.9245 23 13.4569 23 14.0068C23.0004 15.2637 22.7368 16.5067 22.2266 17.6553C21.7164 18.8038 20.9709 19.8325 20.0381 20.6748L20.0234 20.6582C19.2582 21.3549 18.3778 21.915 17.4199 22.3125C16.3329 22.7636 15.168 22.9964 13.9912 22.998V23C12.7342 23.0023 11.4906 22.7397 10.3418 22.2295C9.19298 21.7192 8.1643 20.9723 7.32324 20.0381L7.33203 20.0293C6.63927 19.2663 6.08145 18.3894 5.68555 17.4355C5.23215 16.3431 4.99942 15.1711 5 13.9883C5 13.9773 5.00078 13.9662 5.00098 13.9551C5.00606 12.716 5.26733 11.4912 5.77051 10.3584C6.28086 9.20951 7.02759 8.18093 7.96192 7.33984L7.96777 7.34668C8.73055 6.65434 9.608 6.09785 10.5615 5.70215C11.6487 5.25102 12.8143 5.01823 13.9912 5.0166V5Z" fill="white"/>
        <path d="M21.1201 8.50977C21.5461 9.05972 21.9002 9.66284 22.2022 10.3008L14.0088 16.3486L10.5693 14.1846V11.5957L13.9912 13.7412L21.1201 8.50977Z" fill="white"/>
        <defs>
          <radialGradient id="cb-sber-gradient" cx="0" cy="0" r="1" gradientTransform="matrix(38.6327 -34.4166 21.2959 151.905 -1.73554 34.4167)" gradientUnits="userSpaceOnUse">
            <stop offset="0.063611" stop-color="#EAE619"/>
            <stop offset="0.390103" stop-color="#15B648"/>
            <stop offset="0.745717" stop-color="#0A9FDF"/>
          </radialGradient>
        </defs>
      </svg>
    `,
    vtb: `
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="white"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.5996 10L9.50417 13.0005H24.684L25.7794 10H10.5996ZM8.95613 14.5001L7.86073 17.4999H23.0405L24.1359 14.5001H8.95613ZM7.3161 19.0002L6.2207 22H21.4005L22.4952 19.0002H7.3161Z" fill="#00AAFF"/>
      </svg>
    `
  };

  const BANKS = [
    { id: 'tbank', name: 'Т-Банк', logo: LOGOS.tbank },
    { id: 'alfa', name: 'Альфа-Банк', logo: LOGOS.alfa },
    { id: 'ozon', name: 'Озон Банк', logo: LOGOS.ozon },
    { id: 'yandex', name: 'Яндекс Пэй', logo: LOGOS.yandex },
    { id: 'sber', name: 'Сбер', logo: LOGOS.sber },
    { id: 'vtb', name: 'ВТБ', logo: LOGOS.vtb }
  ];

  let items = [];
  let cashbackData = {};
  let currentCbYear = new Date().getFullYear();
  let currentCbMonth = new Date().getMonth();
  let currentTab = 'sub';
  let editingId = null;
  let selectedDate = null;
  let calendarYear = new Date().getFullYear();
  let calendarMonth = new Date().getMonth();
  let cbEditingId = null;
  let cbSelectedBank = null;
  let cbDraftCats = [];
  let dbPromise = null;
  let saving = false;
  let bound = false;

  /* ═════════ Вспомогательные функции ═════════ */

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

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function parseISODate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) {
      return null;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      return null;
    }
    return date;
  }

  function toISODate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function dayDiff(from, to) {
    const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((end - start) / DAY_MS);
  }

  function addMonthsClamped(base, months) {
    const day = base.getDate();
    const result = new Date(base.getFullYear(), base.getMonth() + months, 1);
    const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, daysInMonth));
    return result;
  }

  function nextOccurrence(item) {
    const stored = parseISODate(item.date);
    if (!stored) {
      return null;
    }

    const today = startOfDay(new Date());
    if (stored >= today) {
      return stored;
    }

    if (item.freq === 'нед' || item.freq === '2 нед') {
      const step = item.freq === 'нед' ? 7 : 14;
      const diff = dayDiff(stored, today);
      const steps = Math.ceil(diff / step);
      return new Date(stored.getFullYear(), stored.getMonth(), stored.getDate() + steps * step);
    }

    if (item.freq === 'мес' || item.freq === 'год') {
      const step = item.freq === 'год' ? 12 : 1;
      let months = (today.getFullYear() - stored.getFullYear()) * 12 + (today.getMonth() - stored.getMonth());
      if (months < 0) {
        months = 0;
      }
      let next = addMonthsClamped(stored, months);
      let guard = 0;
      while (next < today && guard < 600) {
        months += step;
        next = addMonthsClamped(stored, months);
        guard += 1;
      }
      return next;
    }

    return stored;
  }

  function isUrgent(item) {
    const next = nextOccurrence(item);
    if (!next) {
      return false;
    }
    const days = dayDiff(startOfDay(new Date()), next);
    return days >= 0 && days <= URGENT_DAYS;
  }

  function formatDate(date) {
    if (!date) {
      return '';
    }
    return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
  }

  function formatMoney(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '';
    }
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }

  function pluralDays(value) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return 'день';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'дня';
    }
    return 'дней';
  }

  function cashbackKey() {
    return `${currentCbYear}-${String(currentCbMonth + 1).padStart(2, '0')}`;
  }

  function currentCashbackList() {
    const list = cashbackData[cashbackKey()];
    return Array.isArray(list) ? list : [];
  }

  /* ═════════ IndexedDB ═════════ */

  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
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
          dbPromise = null;
        };
        resolve(database);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('Не удалось открыть базу данных.'));
      };
      request.onblocked = () => reject(new Error('База данных занята другой вкладкой.'));
    });

    return dbPromise;
  }

  async function getSetting(key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(SETTINGS_STORE, 'readonly');
      const request = transaction.objectStore(SETTINGS_STORE).get(key);
      let result = null;

      request.onsuccess = () => {
        result = request.result ? request.result.value : null;
      };
      request.onerror = () => reject(request.error || new Error('Не удалось прочитать настройку.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('Ошибка чтения.'));
      transaction.onabort = () => reject(transaction.error || new Error('Чтение отменено.'));
    });
  }

  async function putSetting(key, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
      transaction.objectStore(SETTINGS_STORE).put({ key, value });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Ошибка записи.'));
      transaction.onabort = () => reject(transaction.error || new Error('Запись отменена.'));
    });
  }

  /* ═════════ Нормализация данных ═════════ */

  function normalizeSubscriptions(raw) {
    let source = raw;
    if (source && !Array.isArray(source) && typeof source === 'object' && Array.isArray(source.items)) {
      source = source.items;
    }
    if (!Array.isArray(source)) {
      return [];
    }

    const seen = new Set();
    const list = [];

    source.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 80) : '';
      if (!name) {
        return;
      }

      let id = entry.id === undefined || entry.id === null ? '' : String(entry.id);
      if (!id || seen.has(id)) {
        id = makeId();
      }
      seen.add(id);

      const type = entry.type === 'pay' ? 'pay' : 'sub';
      const amount = entry.amount === null || entry.amount === undefined || entry.amount === ''
        ? null
        : Number(entry.amount);
      const freq = FREQUENCIES.includes(entry.freq) ? entry.freq : null;
      const date = parseISODate(entry.date) ? entry.date : null;

      list.push({
        id,
        type,
        name,
        amount: Number.isFinite(amount) && amount >= 0 ? amount : null,
        freq,
        date
      });
    });

    return list;
  }

  function normalizeCashback(raw) {
    const clean = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return clean;
    }

    Object.keys(raw).forEach((key) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key) || !Array.isArray(raw[key])) {
        return;
      }

      const seenBanks = new Set();
      const list = [];

      raw[key].forEach((entry) => {
        if (!entry || typeof entry !== 'object') {
          return;
        }
        const bank = BANKS.find((item) => item.id === entry.bankId);
        if (!bank || seenBanks.has(bank.id)) {
          return;
        }
        seenBanks.add(bank.id);

        const cats = Array.isArray(entry.cats)
          ? entry.cats
            .filter((cat) => typeof cat === 'string')
            .map((cat) => cat.trim().slice(0, CAT_MAX_LENGTH))
            .filter(Boolean)
            .slice(0, CAT_LIMIT)
          : [];

        list.push({
          id: entry.id === undefined || entry.id === null || entry.id === '' ? makeId() : String(entry.id),
          bankId: bank.id,
          cats
        });
      });

      if (list.length > 0) {
        clean[key] = list;
      }
    });

    return clean;
  }

  async function loadData() {
    const [storedSubscriptions, storedCashback] = await Promise.all([
      getSetting(SUBSCRIPTIONS_KEY),
      getSetting(CASHBACK_KEY)
    ]);

    items = normalizeSubscriptions(storedSubscriptions);
    cashbackData = normalizeCashback(storedCashback);
  }

  async function persistSubscriptions() {
    try {
      await putSetting(SUBSCRIPTIONS_KEY, items);
      return true;
    } catch (error) {
      console.error('Не удалось сохранить подписки и платежи:', error);
      return false;
    }
  }

  async function persistCashback() {
    try {
      await putSetting(CASHBACK_KEY, cashbackData);
      return true;
    } catch (error) {
      console.error('Не удалось сохранить кэшбэк:', error);
      return false;
    }
  }

  /* ═════════ Рендер списков ═════════ */

  function sortedItems(list) {
    return list
      .map((item) => ({ item, next: nextOccurrence(item) }))
      .sort((a, b) => {
        if (!a.next && !b.next) {
          return 0;
        }
        if (!a.next) {
          return 1;
        }
        if (!b.next) {
          return -1;
        }
        return a.next - b.next;
      })
      .map((entry) => entry.item);
  }

  function renderItemCard(item) {
    const next = nextOccurrence(item);
    const urgent = isUrgent(item);
    const dateHtml = next
      ? `<div class="item-date${urgent ? ' urgent' : ''}">${urgent ? '⚠️ ' : ''}${escapeHtml(formatDate(next))}</div>`
      : '';
    let priceHtml = '';
    if (typeof item.amount === 'number') {
      priceHtml = `<div class="item-price">${escapeHtml(formatMoney(item.amount))} ₽</div>`;
      if (item.freq) {
        priceHtml += `<div class="item-freq">/${escapeHtml(item.freq)}</div>`;
      }
    }

    return `
      <div class="item-card" role="button" tabindex="0" data-item-id="${escapeHtml(item.id)}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${dateHtml}
        </div>
        <div class="item-amt">${priceHtml}</div>
      </div>`;
  }

  function renderHero() {
    const total = items.reduce((sum, item) => (
      typeof item.amount === 'number' ? sum + item.amount : sum
    ), 0);

    byId('heroTotal').innerHTML = `${escapeHtml(formatMoney(total) || '0')}<span class="cur">₽</span>`;

    const today = startOfDay(new Date());
    const upcoming = items
      .map((item) => nextOccurrence(item))
      .filter((date) => date && date >= today)
      .sort((a, b) => a - b);

    let text = 'Ближайшее списание: нет';
    if (upcoming.length > 0) {
      const days = dayDiff(today, upcoming[0]);
      if (days === 0) {
        text = 'Ближайшее списание: сегодня';
      } else if (days === 1) {
        text = 'Ближайшее списание: завтра';
      } else {
        text = `Ближайшее списание: через ${days} ${pluralDays(days)}`;
      }
    }
    byId('heroNext').textContent = text;
  }

  function renderData() {
    const subs = sortedItems(items.filter((item) => item.type === 'sub'));
    const pays = sortedItems(items.filter((item) => item.type === 'pay'));

    renderHero();
    byId('countSubs').textContent = String(subs.length);
    byId('countPays').textContent = String(pays.length);

    byId('subsList').innerHTML = subs.length
      ? subs.map(renderItemCard).join('')
      : '<div class="empty-note">Нет активных подписок</div>';
    byId('paysList').innerHTML = pays.length
      ? pays.map(renderItemCard).join('')
      : '<div class="empty-note">Нет активных платежей</div>';
  }

  function renderCashback() {
    byId('cbMonthLabel').textContent = `${MONTH_NAMES[currentCbMonth]} ${currentCbYear}`;
    const banks = currentCashbackList();
    const list = byId('cashbackList');

    if (banks.length === 0) {
      list.innerHTML = '<div class="empty-note">Нажмите «+», чтобы добавить кэшбэк</div>';
      return;
    }

    list.innerHTML = banks.map((entry) => {
      const bank = BANKS.find((item) => item.id === entry.bankId);
      if (!bank) {
        return '';
      }
      const catsHtml = entry.cats.map((cat) => `<span class="cb-cat">${escapeHtml(cat)}</span>`).join('');
      return `
        <div class="cb-card" role="button" tabindex="0" data-bank-row="${escapeHtml(entry.id)}">
          <div class="cb-logo">${bank.logo}</div>
          <div class="cb-info">
            <div class="cb-name">${escapeHtml(bank.name)}</div>
            <div class="cb-cats">${catsHtml}</div>
          </div>
        </div>`;
    }).join('');
  }

  function changeCbMonth(delta) {
    currentCbMonth += delta;
    if (currentCbMonth < 0) {
      currentCbMonth = 11;
      currentCbYear -= 1;
    }
    if (currentCbMonth > 11) {
      currentCbMonth = 0;
      currentCbYear += 1;
    }
    renderCashback();
  }

  /* ═════════ Модалка ═════════ */

  function openItemModal(id = null) {
    const item = id ? items.find((entry) => entry.id === String(id)) : null;
    currentTab = item ? item.type : 'sub';
    editingId = item ? item.id : null;
    selectedDate = item ? item.date : null;
    cbEditingId = null;
    cbSelectedBank = null;
    cbDraftCats = [];

    if (item && item.date) {
      const date = parseISODate(item.date);
      if (date) {
        calendarYear = date.getFullYear();
        calendarMonth = date.getMonth();
      }
    }

    renderModal();
    showModal();
  }

  function openCbModal(id = null) {
    const bankId = id === null || id === undefined ? null : String(id);
    const bank = bankId ? currentCashbackList().find((entry) => entry.id === bankId) : null;

    currentTab = 'cb';
    editingId = null;
    selectedDate = null;
    cbEditingId = bank ? bank.id : null;
    cbSelectedBank = bank ? bank.bankId : null;
    cbDraftCats = bank ? [...bank.cats] : [];

    renderModal();
    showModal();
  }

  function tabsHtml() {
    if (editingId || cbEditingId) {
      const label = currentTab === 'sub' ? 'Подписка' : currentTab === 'pay' ? 'Платёж' : 'Кэшбэк';
      return `<div class="seg-toggle"><div class="seg-btn active" style="flex:1;text-align:center;">${label}</div></div>`;
    }

    return `
      <div class="seg-toggle">
        <button class="seg-btn ${currentTab === 'sub' ? 'active' : ''}" type="button" data-action="tab" data-tab="sub" aria-pressed="${currentTab === 'sub'}">Подписка</button>
        <button class="seg-btn ${currentTab === 'pay' ? 'active' : ''}" type="button" data-action="tab" data-tab="pay" aria-pressed="${currentTab === 'pay'}">Платёж</button>
        <button class="seg-btn ${currentTab === 'cb' ? 'active' : ''}" type="button" data-action="tab" data-tab="cb" aria-pressed="${currentTab === 'cb'}">Кэшбэк</button>
      </div>`;
  }

  function renderModal() {
    const content = byId('modalContent');
    byId('modalTitle').textContent = editingId || cbEditingId ? 'Редактировать' : 'Новая запись';

    if (currentTab === 'cb') {
      renderCashbackModal(content);
      return;
    }

    const item = editingId ? items.find((entry) => entry.id === editingId) : null;
    const selected = selectedDate ? parseISODate(selectedDate) : null;
    const freqOptions = [
      ['', 'Без повтора'],
      ['мес', 'Раз в месяц'],
      ['2 нед', 'Раз в 2 недели'],
      ['нед', 'Раз в неделю'],
      ['год', 'Раз в год']
    ].map(([value, label]) => (
      `<option value="${value}"${item && item.freq === value ? ' selected' : ''}>${label}</option>`
    )).join('');

    content.innerHTML = tabsHtml() + `
      <label class="field-label" for="itemName">Название</label>
      <input type="text" class="input-field" id="itemName" placeholder="Например, Яндекс Плюс" value="${item ? escapeHtml(item.name) : ''}" maxlength="80" autocomplete="off">
      <label class="field-label" for="itemAmount">Сумма (₽) <span class="optional">— необязательно</span></label>
      <input type="number" class="input-field" id="itemAmount" placeholder="Оставьте пустым, если меняется" value="${item && item.amount !== null ? escapeHtml(item.amount) : ''}" inputmode="decimal" min="0" step="0.01" autocomplete="off">
      <label class="field-label">Дата списания <span class="optional">— необязательно</span></label>
      <button class="date-picker-btn" type="button" id="dateBtn" data-action="toggle-calendar" aria-expanded="false">
        <span id="dateDisplay" class="${selected ? '' : 'placeholder'}">${selected ? escapeHtml(formatDate(selected)) : 'Выбрать дату'}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>
      </button>
      <div class="mini-cal" id="miniCal"></div>
      <label class="field-label" for="itemFreq">Периодичность <span class="optional">— необязательно</span></label>
      <select class="input-field" id="itemFreq" style="cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238E8A82%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>');background-repeat:no-repeat;background-position:right 16px center;">
        ${freqOptions}
      </select>
      <div style="height:20px"></div>
      <button class="btn btn-primary" type="button" data-action="save-item">Сохранить</button>
      ${editingId ? '<button class="btn btn-danger" type="button" data-action="delete-item">Удалить запись</button>' : ''}
    `;
  }

  function renderCashbackModal(content) {
    const bank = cbEditingId ? currentCashbackList().find((entry) => entry.id === cbEditingId) : null;
    const bankInfo = bank ? BANKS.find((entry) => entry.id === bank.bankId) : null;

    const bankBlock = cbEditingId && bankInfo
      ? `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div class="bank-opt-logo">${bankInfo.logo}</div>
          <div style="font-size:16px;font-weight:800;">${escapeHtml(bankInfo.name)}</div>
        </div>`
      : `
        <label class="field-label">Выберите банк</label>
        <div class="bank-grid">
          ${BANKS.map((entry) => `
            <button class="bank-opt ${cbSelectedBank === entry.id ? 'selected' : ''}" type="button" data-action="pick-bank" data-bank="${entry.id}" aria-pressed="${cbSelectedBank === entry.id}">
              <span class="bank-opt-logo">${entry.logo}</span>
              <span class="bank-opt-name">${escapeHtml(entry.name)}</span>
            </button>`).join('')}
        </div>`;

    content.innerHTML = tabsHtml() + bankBlock + `
      <label class="field-label">Категории кэшбэка</label>
      <div class="cb-cats-editor" id="cbCatsEditor"></div>
      <div class="cb-add-cat">
        <input type="text" id="cbNewCatInput" placeholder="Напр. Супермаркеты 5%" maxlength="${CAT_MAX_LENGTH}" autocomplete="off" enterkeyhint="done" aria-label="Новая категория кэшбэка">
        <button type="button" data-action="add-cat" aria-label="Добавить категорию" title="Добавить категорию">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style="height:16px"></div>
      <button class="btn btn-primary" type="button" data-action="save-cashback">Сохранить</button>
      ${cbEditingId ? '<button class="btn btn-danger" type="button" data-action="delete-cashback">Удалить</button>' : ''}
    `;

    renderCbDraftCats();
  }

  function showModal() {
    byId('backdrop').classList.add('open');
    byId('modalSheet').classList.add('open');
    window.requestAnimationFrame(() => {
      const target = byId('modalContent').querySelector('button, input, select');
      target?.focus({ preventScroll: true });
    });
  }

  function closeModal() {
    byId('backdrop').classList.remove('open');
    byId('modalSheet').classList.remove('open');
    editingId = null;
    cbEditingId = null;
    selectedDate = null;
    cbSelectedBank = null;
    cbDraftCats = [];
    byId('fabAdd')?.focus({ preventScroll: true });
  }

  function switchTab(tab) {
    if (editingId || cbEditingId) {
      return;
    }
    if (!['sub', 'pay', 'cb'].includes(tab)) {
      return;
    }
    currentTab = tab;
    renderModal();
  }

  /* ═════════ Календарь ═════════ */

  function toggleCalendar() {
    const calendar = byId('miniCal');
    const button = byId('dateBtn');
    if (!calendar || !button) {
      return;
    }

    if (calendar.classList.contains('open')) {
      calendar.classList.remove('open');
      button.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
      return;
    }

    calendar.classList.add('open');
    button.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    renderCalendar();
  }

  function renderCalendar() {
    const calendar = byId('miniCal');
    if (!calendar) {
      return;
    }

    const firstDay = new Date(calendarYear, calendarMonth, 1);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrev = new Date(calendarYear, calendarMonth, 0).getDate();
    const today = new Date();
    const todayStr = toISODate(today);
    let daysHtml = '';

    for (let i = startDay - 1; i >= 0; i -= 1) {
      daysHtml += `<div class="mc-day other">${daysInPrev - i}</div>`;
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let className = 'mc-day';
      if (iso === todayStr) {
        className += ' today';
      }
      if (iso === selectedDate) {
        className += ' selected';
      }
      daysHtml += `<div class="${className}" role="button" tabindex="0" data-action="pick-day" data-day="${day}">${day}</div>`;
    }

    const totalCells = startDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remaining; day += 1) {
      daysHtml += `<div class="mc-day other">${day}</div>`;
    }

    calendar.innerHTML = `
      <div class="mc-head">
        <div class="mc-nav"><button class="mc-nav-btn" type="button" data-action="cal-prev" aria-label="Предыдущий месяц"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button></div>
        <div class="mc-title">${MONTH_NAMES[calendarMonth]} ${calendarYear}</div>
        <div class="mc-nav"><button class="mc-nav-btn" type="button" data-action="cal-next" aria-label="Следующий месяц"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button></div>
      </div>
      <div class="mc-days-header"><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div></div>
      <div class="mc-days">${daysHtml}</div>`;
  }

  function changeCalMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear -= 1;
    }
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear += 1;
    }
    renderCalendar();
  }

  function selectDay(day) {
    selectedDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const display = byId('dateDisplay');
    if (display) {
      display.textContent = formatDate(parseISODate(selectedDate));
      display.classList.remove('placeholder');
    }
    byId('miniCal')?.classList.remove('open');
    const button = byId('dateBtn');
    button?.classList.remove('open');
    button?.setAttribute('aria-expanded', 'false');
  }

  /* ═════════ Кэшбэк: черновик ═════════ */

  function selectCbBank(bankId) {
    cbSelectedBank = bankId;
    byId('modalContent').querySelectorAll('.bank-opt').forEach((option) => {
      const selected = option.dataset.bank === bankId;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderCbDraftCats() {
    const editor = byId('cbCatsEditor');
    if (!editor) {
      return;
    }

    if (cbDraftCats.length === 0) {
      editor.innerHTML = '<div style="font-size:12.5px;color:var(--muted);padding:4px 0;width:100%;">Пока нет категорий</div>';
      return;
    }

    editor.innerHTML = cbDraftCats.map((cat, index) => `
      <span class="cb-cat-chip">${escapeHtml(cat)}<button type="button" data-action="remove-cat" data-index="${index}" aria-label="Удалить категорию ${escapeHtml(cat)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>
    `).join('');
  }

  function addCbCat() {
    const input = byId('cbNewCatInput');
    if (!input) {
      return;
    }
    const value = input.value.trim().slice(0, CAT_MAX_LENGTH);
    if (!value) {
      input.focus({ preventScroll: true });
      return;
    }
    if (cbDraftCats.length >= CAT_LIMIT) {
      input.value = '';
      return;
    }
    cbDraftCats.push(value);
    input.value = '';
    renderCbDraftCats();
    input.focus({ preventScroll: true });
  }

  function removeCbCat(index) {
    cbDraftCats.splice(index, 1);
    renderCbDraftCats();
  }

  /* ═════════ Сохранение ═════════ */

  function flashInvalid(element) {
    if (!element) {
      return;
    }
    element.classList.add('invalid');
    window.setTimeout(() => {
      element.classList.remove('invalid');
    }, 600);
  }

  async function saveItem() {
    if (saving) {
      return;
    }

    const nameInput = byId('itemName');
    const amountInput = byId('itemAmount');
    const freqInput = byId('itemFreq');
    if (!nameInput || !amountInput || !freqInput) {
      return;
    }

    const name = nameInput.value.trim();
    if (!name) {
      flashInvalid(nameInput);
      nameInput.focus({ preventScroll: true });
      return;
    }

    const amountRaw = amountInput.value.trim().replace(',', '.');
    const amount = amountRaw ? Number(amountRaw) : null;
    if (amountRaw && (!Number.isFinite(amount) || amount < 0)) {
      flashInvalid(amountInput);
      amountInput.focus({ preventScroll: true });
      return;
    }

    const type = currentTab === 'pay' ? 'pay' : 'sub';
    const freq = FREQUENCIES.includes(freqInput.value) ? freqInput.value : null;
    const previous = items;
    const next = {
      id: editingId || makeId(),
      type,
      name: name.slice(0, 80),
      amount,
      freq,
      date: selectedDate
    };

    saving = true;
    items = editingId
      ? items.map((item) => (item.id === editingId ? next : item))
      : [...items, next];

    const saved = await persistSubscriptions();
    saving = false;

    if (!saved) {
      items = previous;
      window.alert('Не удалось сохранить запись. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderData();
  }

  async function deleteItem() {
    if (!editingId || saving) {
      return;
    }

    const previous = items;
    const id = editingId;
    items = items.filter((item) => item.id !== id);

    saving = true;
    const saved = await persistSubscriptions();
    saving = false;

    if (!saved) {
      items = previous;
      window.alert('Не удалось удалить запись. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderData();
  }

  async function saveCashback() {
    if (saving) {
      return;
    }

    const key = cashbackKey();
    const draft = [...cbDraftCats];
    const previous = cashbackData;

    if (!cbEditingId && !cbSelectedBank) {
      window.alert('Сначала выберите банк');
      return;
    }

    if (!cashbackData[key]) {
      cashbackData[key] = [];
    }

    if (cbEditingId) {
      cashbackData = {
        ...cashbackData,
        [key]: cashbackData[key].map((entry) => (
          entry.id === cbEditingId ? { ...entry, cats: draft } : entry
        ))
      };
    } else {
      const existing = cashbackData[key].find((entry) => entry.bankId === cbSelectedBank);
      if (existing) {
        window.alert('Этот банк уже добавлен в этом месяце');
        return;
      }
      cashbackData = {
        ...cashbackData,
        [key]: [...cashbackData[key], { id: makeId(), bankId: cbSelectedBank, cats: draft }]
      };
    }

    saving = true;
    const saved = await persistCashback();
    saving = false;

    if (!saved) {
      cashbackData = previous;
      window.alert('Не удалось сохранить кэшбэк. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderCashback();
  }

  async function deleteCashback() {
    if (!cbEditingId || saving) {
      return;
    }

    const key = cashbackKey();
    const previous = cashbackData;
    const id = cbEditingId;
    const nextList = (cashbackData[key] || []).filter((entry) => entry.id !== id);

    cashbackData = { ...cashbackData };
    if (nextList.length > 0) {
      cashbackData[key] = nextList;
    } else {
      delete cashbackData[key];
    }

    saving = true;
    const saved = await persistCashback();
    saving = false;

    if (!saved) {
      cashbackData = previous;
      window.alert('Не удалось удалить кэшбэк. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderCashback();
  }

  /* ═════════ События ═════════ */

  function findItemId(target) {
    const row = target.closest('[data-item-id]');
    return row ? row.dataset.itemId : null;
  }

  function findBankRowId(target) {
    const row = target.closest('[data-bank-row]');
    return row ? row.dataset.bankRow : null;
  }

  function handleListClick(event) {
    const itemId = findItemId(event.target);
    if (itemId) {
      openItemModal(itemId);
      return;
    }
    const bankId = findBankRowId(event.target);
    if (bankId) {
      openCbModal(bankId);
    }
  }

  function handleListKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (!findItemId(event.target) && !findBankRowId(event.target)) {
      return;
    }
    event.preventDefault();
    handleListClick(event);
  }

  function handleModalClick(event) {
    const action = event.target.closest('[data-action]');
    if (!action) {
      return;
    }

    switch (action.dataset.action) {
      case 'tab':
        switchTab(action.dataset.tab);
        break;
      case 'toggle-calendar':
        toggleCalendar();
        break;
      case 'cal-prev':
        changeCalMonth(-1);
        break;
      case 'cal-next':
        changeCalMonth(1);
        break;
      case 'pick-day':
        selectDay(Number(action.dataset.day));
        break;
      case 'pick-bank':
        selectCbBank(action.dataset.bank);
        break;
      case 'add-cat':
        addCbCat();
        break;
      case 'remove-cat':
        removeCbCat(Number(action.dataset.index));
        break;
      case 'save-item':
        saveItem();
        break;
      case 'delete-item':
        deleteItem();
        break;
      case 'save-cashback':
        saveCashback();
        break;
      case 'delete-cashback':
        deleteCashback();
        break;
      default:
        break;
    }
  }

  function handleModalKeydown(event) {
    if (event.key === 'Enter' && event.target.id === 'cbNewCatInput') {
      event.preventDefault();
      addCbCat();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-action="pick-day"]')) {
      event.preventDefault();
      selectDay(Number(event.target.dataset.day));
    }
  }

  function bindEvents() {
    if (bound) {
      return;
    }
    bound = true;

    byId('backBtn').addEventListener('click', () => {
      window.AppAccess.navigate('./index.html#hub');
    });
    byId('fabAdd').addEventListener('click', () => openItemModal());
    byId('cbPrev').addEventListener('click', () => changeCbMonth(-1));
    byId('cbNext').addEventListener('click', () => changeCbMonth(1));
    byId('backdrop').addEventListener('click', closeModal);
    byId('modalContent').addEventListener('click', handleModalClick);
    byId('modalContent').addEventListener('keydown', handleModalKeydown);

    byId('subsList').addEventListener('click', handleListClick);
    byId('paysList').addEventListener('click', handleListClick);
    byId('cashbackList').addEventListener('click', handleListClick);
    byId('subsList').addEventListener('keydown', handleListKeydown);
    byId('paysList').addEventListener('keydown', handleListKeydown);
    byId('cashbackList').addEventListener('keydown', handleListKeydown);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && byId('modalSheet').classList.contains('open')) {
        closeModal();
      }
    });
  }

  /* ═════════ Инициализация ═════════ */

  async function init() {
    bindEvents();
    renderData();
    renderCashback();

    // Снять блокировку «Проверка защиты…» после того, как шлюз доступа
    // подтвердил авторизацию (редирект на хаб уже произошёл внутри check(true),
    // если не авторизован). Вызываем напрямую, а не через AppAccess.reveal(),
    // чтобы не зависеть от флага document.hidden при первом рендере вкладки.
    try {
      await window.AppAccess.ready;
      if (window.AppAccess.isAuthorized()) {
        document.documentElement.removeAttribute('data-access-pending');
        if (document.body) document.body.inert = false;
      }
    } catch (error) {
      console.error('Шлюз доступа не сработал:', error);
    }

    try {
      await loadData();
    } catch (error) {
      console.error('Не удалось загрузить подписки и платежи:', error);
    }

    renderData();
    renderCashback();
  }

  init();
})();
