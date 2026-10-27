'use strict';

/* Виджет кэшбэка в хабе. Данные хранятся в IndexedDB (settings → cashbackData). */

(function () {
  const STORAGE_KEY = 'cashbackData';
  const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const CAT_MAX_LENGTH = 40;
  const CAT_LIMIT = 20;

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
        <path d="M24.0409 2.2239C24.9581 2.1066 25.9037 1.95891 26.7497 2.06228C29.3365 2.37833 31.4222 4.34892 31.9107 6.899C31.9213 6.95371 31.9668 7.07999 32 7.12673V11.4844C31.8745 11.2045 31.8143 10.5817 31.6883 10.2163C31.1283 8.59056 29.899 7.28224 28.3112 6.62204C27.547 6.2997 26.7218 6.14701 25.8928 6.17449C25.36 6.18908 24.8043 6.27184 24.2732 6.33991L22.572 6.55261L6.64746 8.51687C5.62389 8.64672 4.68329 8.69237 3.72129 9.08659C2.2307 9.69854 1.04773 10.8827 0.437207 12.3738C0.311582 12.6754 0.242321 12.8785 0.171387 13.1931C0.135109 13.354 0.052104 13.8772 0 13.9936V9.77351C0.0807273 9.65049 0.152069 9.14198 0.19834 8.96755C0.65723 7.23805 1.66329 6.13113 3.15059 5.21238C3.31451 5.18353 3.53433 5.03995 3.69287 4.97253C4.02072 4.83311 4.36971 4.71596 4.71924 4.64519C6.00792 4.38422 7.41515 4.36845 8.70488 4.12673C9.06181 4.09541 9.44724 4.03183 9.80654 3.98835L21.7901 2.50671L24.0409 2.2239Z" fill="#F8604C"/>
        <path d="M7.14469 14.2735L14.3356 14.2734L10.6635 23.6469C9.78244 23.7377 8.82879 23.836 7.95306 23.9502L10.3887 17.7427C10.56 17.3097 10.758 16.8346 10.9047 16.3972C10.2467 16.4065 9.57836 16.3976 8.91796 16.4034C8.82401 16.7028 8.65394 17.0976 8.53544 17.3973L7.84799 19.1368L5.85079 24.1956C5.01134 24.2953 3.96481 24.3765 3.14526 24.5128L5.74056 17.8919L6.62204 15.6417C6.78844 15.2176 7.00501 14.7019 7.14469 14.2735Z" fill="#FEFDFD"/>
        <path d="M22.0429 14.2695C22.8838 14.2899 23.7883 14.2746 24.6326 14.273C24.5512 14.4581 24.4722 14.6557 24.3999 14.8458C23.8207 16.3695 23.1422 17.8784 22.6405 19.4281C22.2395 20.667 23.6014 20.5634 24.0945 19.7639C24.4994 19.1075 24.7198 18.4106 25.0055 17.6978C25.4637 16.5624 25.8762 15.4023 26.345 14.2732L28.924 14.2754L27.8502 17.034C27.2202 18.6513 26.5482 20.2982 25.944 21.9213C25.451 21.9515 24.8101 22.0458 24.3093 22.1051C24.3174 21.8998 24.3894 21.1331 24.2649 21.009C24.206 21.0204 24.1564 21.0383 24.1175 21.0891C23.3382 22.1096 21.9968 23.0283 20.6403 22.5044C20.2788 22.3688 19.9873 22.0931 19.8316 21.7398C19.5119 21.0113 19.7403 20.1656 20.0145 19.4622C20.2116 18.9566 20.4077 18.4507 20.6056 17.9454L22.0429 14.2695Z" fill="#FEFDFD"/>
        <path d="M17.6116 14.0338C17.8909 13.9922 18.439 14.0272 18.7117 14.0848C20.8682 14.5444 20.3924 17.1482 19.8589 18.657C19.2084 20.4969 18.0232 22.5153 16.0656 23.1642C15.049 23.5011 13.538 23.4775 12.91 22.4637C12.3492 21.5585 12.5469 20.4466 12.7617 19.4766L14.4381 19.4772L15.2486 19.4779C15.1432 19.792 14.8611 20.9807 15.2796 21.1276C16.0177 21.3866 16.6869 19.995 16.9146 19.4661L15.558 19.4687C15.7999 18.9303 16.0314 18.2611 16.2616 17.6978C16.688 17.7016 17.1672 17.6967 17.5883 17.7215C17.7767 17.1994 18.1332 15.6792 16.9439 16.4017C16.6865 16.5581 16.3355 17.1101 16.1504 17.3802C15.3556 17.3549 14.4758 17.372 13.6747 17.3723C14.4433 15.654 15.6092 14.1972 17.6116 14.0338Z" fill="#FEFDFD"/>
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

  let cashbackData = {};
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  let mode = 'add';
  let editingId = null;
  let selectedBankId = null;
  let draftCats = [];
  let bound = false;

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

  function monthKey() {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeData(raw) {
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

      raw[key].forEach((item) => {
        if (!item || typeof item !== 'object') {
          return;
        }

        const bank = BANKS.find((entry) => entry.id === item.bankId);
        if (!bank || seenBanks.has(bank.id)) {
          return;
        }

        seenBanks.add(bank.id);

        const cats = Array.isArray(item.cats)
          ? item.cats
            .filter((cat) => typeof cat === 'string')
            .map((cat) => cat.trim())
            .filter(Boolean)
            .slice(0, CAT_LIMIT)
          : [];

        list.push({
          id: typeof item.id === 'string' && item.id ? item.id : makeId(),
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

  function getCurrentList() {
    const list = cashbackData[monthKey()];
    return Array.isArray(list) ? list : [];
  }

  function persist() {
    if (typeof setSettings !== 'function') {
      return Promise.resolve(false);
    }

    return setSettings({ [STORAGE_KEY]: cashbackData })
      .then(() => true)
      .catch((error) => {
        console.error('Не удалось сохранить кэшбэк:', error);
        return false;
      });
  }

  function showError(message) {
    const error = byId('cbError');
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    const error = byId('cbError');
    error.textContent = '';
    error.hidden = true;
  }

  /* ═══ Виджет ═══ */

  function renderWidget() {
    byId('cbMonthLabel').textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const list = byId('cbList');
    const banks = getCurrentList();

    if (banks.length === 0) {
      list.innerHTML = `
        <div class="cb-empty">
          <svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M2.5 10h19"/></svg>
          <div class="cb-empty-title">Нет банков</div>
          <div class="cb-empty-sub">Нажмите «+», чтобы добавить банк и его категории кэшбэка на этот месяц</div>
        </div>
      `;
      return;
    }

    list.innerHTML = banks.map((item) => {
      const bank = BANKS.find((entry) => entry.id === item.bankId);
      if (!bank) {
        return '';
      }

      const cats = item.cats.length > 0
        ? item.cats.map((cat) => `<span class="cb-cat">${escapeHtml(cat)}</span>`).join('')
        : '<span class="cb-cat">Без категорий</span>';

      return `
        <button class="cb-item" type="button" data-bank-row="${escapeHtml(item.id)}" aria-label="Изменить кэшбэк: ${escapeHtml(bank.name)}">
          <span class="cb-logo">${bank.logo}</span>
          <span class="cb-info">
            <span class="cb-name">${escapeHtml(bank.name)}</span>
            <span class="cb-cats">${cats}</span>
          </span>
        </button>
      `;
    }).join('');
  }

  function shiftMonth(delta) {
    const date = new Date(currentYear, currentMonth + delta, 1);
    currentYear = date.getFullYear();
    currentMonth = date.getMonth();
    renderWidget();
  }

  /* ═══ Шторка ═══ */

  function openModal() {
    byId('cbBackdrop').classList.add('open');
    byId('cbModal').classList.add('open');
    document.body.classList.add('cb-modal-open');
  }

  function closeModal() {
    byId('cbBackdrop').classList.remove('open');
    byId('cbModal').classList.remove('open');
    document.body.classList.remove('cb-modal-open');
    clearError();
  }

  function openAddModal() {
    mode = 'add';
    editingId = null;
    selectedBankId = null;
    draftCats = [];

    byId('cbModalTitle').textContent = 'Добавить банк';
    byId('cbBankSelectorWrap').hidden = false;
    byId('cbEditHead').hidden = true;
    byId('cbCatInput').value = '';
    clearError();

    renderBankGrid();
    renderCatEditor();
    openModal();
  }

  function openEditModal(id) {
    const bankEntry = getCurrentList().find((item) => String(item.id) === String(id));
    if (!bankEntry) {
      return;
    }

    const bank = BANKS.find((entry) => entry.id === bankEntry.bankId);
    if (!bank) {
      return;
    }

    mode = 'edit';
    editingId = bankEntry.id;
    selectedBankId = null;
    draftCats = [...bankEntry.cats];

    byId('cbModalTitle').textContent = 'Редактировать';
    byId('cbBankSelectorWrap').hidden = true;
    byId('cbEditHead').hidden = false;
    byId('cbEditLogo').innerHTML = bank.logo;
    byId('cbEditName').textContent = bank.name;
    byId('cbCatInput').value = '';
    clearError();

    renderCatEditor();
    openModal();
  }

  function renderBankGrid() {
    const grid = byId('cbBankGrid');
    const added = new Set(getCurrentList().map((item) => item.bankId));

    if (added.size >= BANKS.length) {
      grid.innerHTML = '<p class="cb-bank-note" style="grid-column:1/-1; margin:0;">Все банки из списка уже добавлены на этот месяц.</p>';
      return;
    }

    grid.innerHTML = BANKS.map((bank) => {
      const isAdded = added.has(bank.id);
      return `
        <button
          class="cb-bank-opt${selectedBankId === bank.id ? ' selected' : ''}"
          type="button"
          data-bank-id="${escapeHtml(bank.id)}"
          ${isAdded ? 'disabled aria-disabled="true" title="Уже добавлен"' : ''}
        >
          <span class="cb-bank-opt-logo">${bank.logo}</span>
          <span class="cb-bank-opt-name">${escapeHtml(bank.name)}</span>
        </button>
      `;
    }).join('');
  }

  function selectBank(id) {
    selectedBankId = id;
    clearError();
    renderBankGrid();
  }

  function renderCatEditor() {
    const editor = byId('cbCatEditor');

    if (draftCats.length === 0) {
      editor.innerHTML = '<div class="cb-cat-empty">Пока нет категорий. Добавьте внизу.</div>';
      return;
    }

    editor.innerHTML = draftCats.map((cat, index) => `
      <span class="cb-chip">
        ${escapeHtml(cat)}
        <button type="button" data-remove-cat="${index}" aria-label="Удалить категорию ${escapeHtml(cat)}">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>
    `).join('');
  }

  function addCategory() {
    const input = byId('cbCatInput');
    const value = input.value.trim();

    if (!value) {
      return;
    }

    if (value.length > CAT_MAX_LENGTH) {
      showError(`Категория должна быть короче ${CAT_MAX_LENGTH + 1} символов.`);
      return;
    }

    if (draftCats.length >= CAT_LIMIT) {
      showError(`Можно добавить не больше ${CAT_LIMIT} категорий.`);
      return;
    }

    const normalized = value.toLocaleLowerCase('ru-RU');
    if (draftCats.some((cat) => cat.toLocaleLowerCase('ru-RU') === normalized)) {
      showError('Такая категория уже есть.');
      return;
    }

    draftCats.push(value);
    input.value = '';
    clearError();
    renderCatEditor();
    input.focus();
  }

  function removeCategory(index) {
    if (!Number.isInteger(index) || index < 0 || index >= draftCats.length) {
      return;
    }

    draftCats.splice(index, 1);
    clearError();
    renderCatEditor();
  }

  async function saveBank() {
    clearError();

    if (mode === 'add' && !selectedBankId) {
      showError('Сначала выберите банк.');
      return;
    }

    const list = [...getCurrentList()];
    const key = monthKey();

    if (mode === 'add') {
      const bank = BANKS.find((entry) => entry.id === selectedBankId);
      if (!bank) {
        showError('Банк не найден.');
        return;
      }

      if (list.some((item) => item.bankId === bank.id)) {
        showError('Этот банк уже добавлен на выбранный месяц.');
        return;
      }

      list.push({
        id: makeId(),
        bankId: bank.id,
        cats: [...draftCats]
      });
    } else {
      const index = list.findIndex((item) => String(item.id) === String(editingId));
      if (index === -1) {
        showError('Банк не найден.');
        return;
      }

      list[index] = { ...list[index], cats: [...draftCats] };
    }

    cashbackData[key] = list;

    const saved = await persist();
    if (!saved) {
      showError('Не удалось сохранить. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderWidget();
  }

  async function deleteBank() {
    clearError();

    if (!editingId) {
      return;
    }

    const key = monthKey();
    const next = getCurrentList().filter((item) => String(item.id) !== String(editingId));

    if (next.length > 0) {
      cashbackData[key] = next;
    } else {
      delete cashbackData[key];
    }

    const saved = await persist();
    if (!saved) {
      showError('Не удалось удалить банк. Попробуйте ещё раз.');
      return;
    }

    closeModal();
    renderWidget();
  }

  /* ═══ События ═══ */

  function bindEvents() {
    if (bound) {
      return;
    }
    bound = true;

    byId('cbPrevMonth').addEventListener('click', () => shiftMonth(-1));
    byId('cbNextMonth').addEventListener('click', () => shiftMonth(1));
    byId('cbAddBank').addEventListener('click', openAddModal);
    byId('cbClose').addEventListener('click', closeModal);
    byId('cbBackdrop').addEventListener('click', closeModal);
    byId('cbSave').addEventListener('click', saveBank);
    byId('cbDeleteBank').addEventListener('click', deleteBank);
    byId('cbAddCat').addEventListener('click', addCategory);

    byId('cbCatInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCategory();
      }
    });

    byId('cbCatInput').addEventListener('input', clearError);

    byId('cbCatInput').addEventListener('focus', () => {
      window.setTimeout(() => {
        byId('cbCatInput').scrollIntoView({ block: 'nearest' });
      }, 250);
    });

    byId('cbList').addEventListener('click', (event) => {
      const row = event.target.closest('[data-bank-row]');
      if (row) {
        openEditModal(row.dataset.bankRow);
      }
    });

    byId('cbBankGrid').addEventListener('click', (event) => {
      const option = event.target.closest('[data-bank-id]');
      if (option && !option.disabled) {
        selectBank(option.dataset.bankId);
      }
    });

    byId('cbCatEditor').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-cat]');
      if (button) {
        removeCategory(Number.parseInt(button.dataset.removeCat, 10));
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && byId('cbModal').classList.contains('open')) {
        closeModal();
      }
    });
  }

  function init(storedData) {
    cashbackData = normalizeData(storedData);
    bindEvents();
    renderWidget();
  }

  window.Cashback = { init };
})();
