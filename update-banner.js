'use strict';

/* Баннер обновления. Регистрирует service worker, следит за установкой новой
   версии и предлагает перезагрузить приложение, когда обновление готово.
   Подключается на всех страницах: index.html, finance.html, notes.html. */

(function () {
  const RELOAD_FALLBACK_MS = 3000;
  const HIDE_ANIMATION_MS = 240;

  let banner = null;
  let actionButton = null;
  let closeButton = null;
  let registration = null;
  let hadController = false;
  let controllerChanged = false;
  let reloadRequested = false;
  let reloadTimer = null;
  let hideTimer = null;
  let dismissed = false;

  function positionBanner() {
    if (!banner || banner.hidden) {
      return;
    }

    let offset = 16;

    // На «Финансах» и старых вкладках хаба баннер поднимается над нижним меню.
    const nav = document.querySelector('.bottom-nav');

    if (nav) {
      const navStyle = window.getComputedStyle(nav);
      const navRect = nav.getBoundingClientRect();

      if (navStyle.display !== 'none' && navStyle.visibility !== 'hidden' && navRect.height > 0) {
        offset = Math.max(offset, window.innerHeight - navRect.top + 12);
      }
    }

    // На «Финансах» не перекрываем плавающую кнопку добавления операции.
    const fab = document.querySelector('.fab');

    if (fab) {
      const fabStyle = window.getComputedStyle(fab);
      const fabRect = fab.getBoundingClientRect();

      if (
        fabStyle.display !== 'none' &&
        fabStyle.visibility !== 'hidden' &&
        fabStyle.opacity !== '0' &&
        !fab.classList.contains('hide') &&
        fabRect.height > 0
      ) {
        offset = Math.max(offset, window.innerHeight - fabRect.top + 12);
      }
    }

    banner.style.bottom = offset === 16
      ? 'calc(16px + env(safe-area-inset-bottom, 0px))'
      : `${offset}px`;
  }

  function createBanner() {
    if (banner || !document.body) {
      return;
    }

    banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.id = 'updateBanner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-atomic', 'true');
    banner.hidden = true;
    banner.innerHTML = `
      <div class="update-banner-text">
        <div class="update-banner-title">Доступно обновление</div>
        <div class="update-banner-sub">Новая версия уже загружена</div>
      </div>
      <button class="update-banner-action" type="button">Обновить</button>
      <button class="update-banner-close" type="button" aria-label="Скрыть уведомление об обновлении">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18"/>
        </svg>
      </button>`;

    document.body.append(banner);

    actionButton = banner.querySelector('.update-banner-action');
    closeButton = banner.querySelector('.update-banner-close');

    actionButton?.addEventListener('click', requestReload);
    closeButton?.addEventListener('click', dismissBanner);
  }

  function showBanner() {
    if (!hadController || dismissed) {
      return;
    }

    createBanner();

    if (!banner) {
      return;
    }

    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    banner.hidden = false;
    positionBanner();

    window.requestAnimationFrame(() => {
      if (!dismissed && banner && !banner.hidden) {
        banner.classList.add('is-visible');
      }
    });
  }

  function hideBanner() {
    if (!banner || banner.hidden) {
      return;
    }

    banner.classList.remove('is-visible');

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(() => {
      if (banner) {
        banner.hidden = true;
      }

      hideTimer = null;
    }, HIDE_ANIMATION_MS);
  }

  function dismissBanner() {
    dismissed = true;
    hideBanner();
  }

  function reloadNow() {
    if (reloadTimer) {
      window.clearTimeout(reloadTimer);
      reloadTimer = null;
    }

    window.location.reload();
  }

  function requestReload() {
    if (reloadRequested) {
      return;
    }

    reloadRequested = true;

    if (actionButton) {
      actionButton.disabled = true;
      actionButton.textContent = 'Обновляем…';
    }

    // Если новый service worker ещё ждёт активации, просим его включиться.
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    if (controllerChanged) {
      reloadNow();
      return;
    }

    // Не перезагружаем страницу на старую версию, если активация не завершилась.
    reloadTimer = window.setTimeout(() => {
      reloadTimer = null;
      reloadRequested = false;

      if (actionButton) {
        actionButton.disabled = false;
        actionButton.textContent = 'Обновить';
      }

      const subtitle = banner?.querySelector('.update-banner-sub');

      if (subtitle) {
        subtitle.textContent = 'Обновление ещё устанавливается. Попробуйте снова.';
      }
    }, RELOAD_FALLBACK_MS);
  }

  function watchWorker(worker) {
    if (!worker) {
      return;
    }

    worker.addEventListener('statechange', () => {
      if (worker.state !== 'installed') {
        return;
      }

      if (!navigator.serviceWorker.controller) {
        return;
      }

      showBanner();
    });
  }

  async function init() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    createBanner();

    hadController = Boolean(navigator.serviceWorker.controller);

    // Подписываемся до register(): активация может завершиться ещё до его resolve.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        // Первый claim не является обновлением, но следующие смены уже будут им.
        hadController = true;
        return;
      }

      controllerChanged = true;

      if (reloadRequested) {
        reloadNow();
        return;
      }

      showBanner();
    });

    window.addEventListener('resize', positionBanner);
    window.addEventListener('orientationchange', () => {
      window.setTimeout(positionBanner, 150);
    });
    window.addEventListener('hashchange', () => {
      window.setTimeout(positionBanner, 150);
    });
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;

        if (target?.closest('.bottom-nav, [data-tab-target], .fab, .nav-btn')) {
          window.setTimeout(positionBanner, 150);
        }
      },
      true
    );

    try {
      registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
    } catch (error) {
      console.warn('Не удалось зарегистрировать service worker:', error);
      return;
    }

    watchWorker(registration.installing);

    if (registration.waiting && hadController) {
      showBanner();
    }

    registration.addEventListener('updatefound', () => {
      watchWorker(registration.installing);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      positionBanner();
      registration?.update().catch(() => {});
    });

    window.addEventListener('online', () => {
      positionBanner();
      registration?.update().catch(() => {});
    });
  }

  init();
})();
