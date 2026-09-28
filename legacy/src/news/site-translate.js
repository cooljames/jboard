// ═══════════════════════════════════════════════════════════
// Google 공식 사이트 번역 위젯 로더 및 제어
// (개별 문장 번역 API 대신 페이지 단위 공식 번역을 사용 → 즉시·무제한)
// ═══════════════════════════════════════════════════════════

let loadPromise = null;

function ensureWidgetContainer() {
  let el = document.getElementById('google_translate_element');
  if (!el) {
    el = document.createElement('div');
    el.id = 'google_translate_element';
    el.className = 'notranslate';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
    document.body.appendChild(el);
  }
  return el;
}

// 위젯 스크립트 로드 (1회만). 콤보박스 렌더까지 확인 후 true.
export function loadSiteTranslate() {
  if (window.google?.translate?.TranslateElement && document.querySelector('.goog-te-combo')) {
    return Promise.resolve({ ok: true, reason: '' });
  }
  if (loadPromise) return loadPromise;

  // { ok, reason } — reason: 'script-blocked' | 'init-timeout' | 'combo-missing' | 'init-error'
  loadPromise = new Promise((resolve) => {
    ensureWidgetContainer();
    let settled = false;
    let cbFired = false;
    const done = (ok, reason = '') => {
      if (!settled) {
        settled = true;
        resolve({ ok, reason });
      }
    };
    const hasCombo = () => !!document.querySelector('.goog-te-combo');
    const timer = setTimeout(() => {
      console.warn('[site-translate] widget load timeout, cbFired:', cbFired);
      done(hasCombo(), cbFired ? 'combo-missing' : 'init-timeout');
    }, 20000);

    window.__jbTranslateInit = () => {
      cbFired = true;
      try {
        // layout 생략 = 기본 가로형 가젯 (select.goog-te-combo 렌더 보장)
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,ko',
            autoDisplay: false,
          },
          'google_translate_element'
        );
        const waiter = setInterval(() => {
          if (hasCombo()) {
            clearInterval(waiter);
            clearTimeout(timer);
            done(true);
          }
        }, 200);
        setTimeout(() => {
          clearInterval(waiter);
          clearTimeout(timer);
          done(hasCombo(), 'combo-missing');
        }, 20000);
      } catch (e) {
        console.warn('[site-translate] init failed:', e);
        clearTimeout(timer);
        done(false, 'init-error');
      }
    };

    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=__jbTranslateInit';
    s.async = true;
    s.onerror = () => {
      console.warn('[site-translate] loader script blocked/failed');
      clearTimeout(timer);
      done(false, 'script-blocked');
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}

// 'ko' → 한글 번역 켜기, 'en' → 원문 복원
export function setSiteLanguage(lang) {
  const combo = document.querySelector('.goog-te-combo');
  if (!combo) return false;
  try {
    if (combo.value === lang) return true;
    combo.value = lang;
    try {
      const legacy = document.createEvent('HTMLEvents');
      legacy.initEvent('change', true, false);
      combo.dispatchEvent(legacy);
    } catch {}
    try {
      combo.dispatchEvent(new Event('change', { bubbles: true }));
    } catch {}
    return true;
  } catch (e) {
    console.warn('[site-translate] set language failed:', e);
    return false;
  }
}

// Google이 <html>에 부여하는 번역 적용 표시 (쿠키보다 직접적인 성공 신호)
export function isDomTranslated() {
  try {
    const cls = document.documentElement.classList;
    return cls.contains('translated-ltr') || cls.contains('translated-rtl');
  } catch {
    return false;
  }
}

// googtrans 쿠키로 현재 번역 상태 확인 (새로고침 후에도 유지됨)
export function isSiteTranslatedTo(lang = 'ko') {
  try {
    return new RegExp(`(^|;)\\s*googtrans=/en/${lang}`).test(document.cookie || '');
  } catch {
    return false;
  }
}

export function currentSiteLang() {
  try {
    const m = (document.cookie || '').match(/(?:^|;)\s*googtrans=\/en\/([a-z-]+)/i);
    return m ? m[1].toLowerCase() : '';
  } catch {
    return '';
  }
}

// 콤보 변경이 실제 반영될 때까지 확인하며 재시도 (위젯 초기화 레이스 대응)
// 쿠키 + DOM 번역 표시 둘 다 확인 (쿠키 차단 환경에서도 오판 방지)
export async function applySiteLanguage(lang, retries = 8) {
  const check = () => {
    if (lang === 'ko') {
      return currentSiteLang() === 'ko' || isDomTranslated();
    }
    return !isDomTranslated() && currentSiteLang() !== 'ko';
  };
  for (let i = 0; i < retries; i++) {
    if (!setSiteLanguage(lang)) return false;
    await new Promise((r) => setTimeout(r, 500));
    if (check()) return true;
  }
  return check();
}
