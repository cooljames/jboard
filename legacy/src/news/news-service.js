// ═══════════════════════════════════════════════════════════
// News Scraper & Translation Service
// ═══════════════════════════════════════════════════════════
import { COUNTRY_PRESETS, SOURCE_CATEGORIES, PERIOD_PRESETS } from './constants.js';

// ── Date parsing & formatting ──
export function parsePubDate(pubDateStr) {
  if (!pubDateStr) return new Date();
  const d = new Date(pubDateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatDateTime(date) {
  const d = typeof date === 'string' ? parsePubDate(date) : date;
  const pad = (n) => String(n).padStart(2, '0');
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  return `${Y}-${M}-${D} ${h}:${m}`;
}

export function timeAgo(date) {
  const d = typeof date === 'string' ? parsePubDate(date) : date;
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDateTime(d).substring(0, 10);
}

// ── Search Query Builder ──
export function buildSearchQuery(rawQuery, searchMode = 'OR (하나 이상 포함)') {
  if (!rawQuery || !rawQuery.trim()) return '';
  const keywords = rawQuery
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywords.length === 0) return '';
  if (keywords.length === 1) return `"${keywords[0]}"`;

  if (searchMode.includes('AND')) {
    return keywords.map((k) => `"${k}"`).join(' AND ');
  } else {
    return keywords.map((k) => `"${k}"`).join(' OR ');
  }
}

// ── Translation ──
function parseGoogleTranslateResponse(raw) {
  let data = raw;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<title>Sorry') || trimmed.includes('<html')) {
      return '';
    }
    try {
      data = JSON.parse(trimmed);
    } catch {
      return '';
    }
  }
  if (Array.isArray(data)) {
    if (typeof data[0] === 'string') return data.join(' ').trim();
    if (Array.isArray(data[0])) {
      return data[0]
        .filter((item) => item && typeof item[0] === 'string')
        .map((item) => item[0])
        .join('')
        .trim();
    }
  }
  return '';
}

async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Google GTX 원시 응답 요청 (/api/translate → 직접 호출 순). 실패 시 null.
async function requestGtxRaw(text, from, to) {
  try {
    const res = await fetchWithTimeout(`/api/translate?text=${encodeURIComponent(text)}&from=${from}&to=${to}`);
    if (res.ok) return await res.text();
    console.warn(`[translate] /api/translate responded ${res.status}`);
  } catch (e) {
    console.warn('[translate] /api/translate failed:', e?.name || e);
  }

  try {
    const directUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetchWithTimeout(directUrl);
    if (resp.ok) return await resp.text();
    console.warn(`[translate] direct GTX responded ${resp.status}`);
  } catch (e) {
    console.warn('[translate] direct GTX failed:', e?.name || e);
  }

  return null;
}

function decodeHtmlEntities(s) {
  return (s || '')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// 번역 캐시 (반복 조회 시 무료 API 쿼터 절약) — localStorage 영속, 최대 500건
const TRANSLATION_CACHE_KEY = 'jboard_news_translations';
const translationCache = new Map();
try {
  const saved = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '[]');
  if (Array.isArray(saved)) {
    saved.slice(-500).forEach(([k, v]) => {
      if (k && v) translationCache.set(k, v);
    });
  }
} catch {}
function cacheSet(key, value) {
  if (!key || !value) return;
  translationCache.set(key, value);
  if (translationCache.size > 500) {
    translationCache.delete(translationCache.keys().next().value);
  }
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify([...translationCache].slice(-500)));
  } catch {}
}

// MyMemory 일일 무료 한도 소진 감지 (감지 후 6시간 동안 추가 요청 자제)
let quotaExhaustedAt = 0;
export function isTranslationQuotaExhausted() {
  return Date.now() - quotaExhaustedAt < 6 * 3600 * 1000;
}
function markQuotaExhausted() {
  quotaExhaustedAt = Date.now();
}

// 번역문 품질 검사 (TM 쓰레기·원문 에코 방지)
function isGoodTranslation(t, source, to) {
  const s = (source || '').trim();
  if (!t || !s) return false;
  if (t === s || t.startsWith('<')) return false;
  if (/MYMEMORY WARNING/i.test(t)) return false;
  if (to === 'ko') {
    if (!/[가-힣]/.test(t)) return false;
    if (s.length > 8 && t.includes(s)) return false;
  }
  return true;
}

// 번역 실패 시 '' 반환 (호출자가 원문 유지 여부를 판단). 원문을 그대로 반환하지 않음.
export async function translateText(text, from = 'en', to = 'ko') {
  if (!text || !text.trim()) return '';
  const source = text.trim();

  const cacheKey = `${from}>${to}:${source}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const raw = await requestGtxRaw(source, from, to);
  if (raw != null) {
    const parsed = parseGoogleTranslateResponse(raw);
    if (isGoodTranslation(parsed, source, to)) {
      cacheSet(cacheKey, parsed);
      return parsed;
    }
  }

  // 3. MyMemory 무료 API 폴백 (CORS 허용, 쿼리 500자 이하 권장)
  if (!isTranslationQuotaExhausted()) {
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source)}&langpair=${from}|${to}`;
      const mmRes = await fetchWithTimeout(mmUrl);
      if (mmRes.ok) {
        const mmJson = await mmRes.json();
        if (mmJson?.quotaFinished === true) {
          markQuotaExhausted();
          console.warn('[translate] MyMemory daily quota finished');
        } else {
          const t = decodeHtmlEntities(mmJson?.responseData?.translatedText || '').trim();
          if (mmJson?.responseStatus === 200 && isGoodTranslation(t, source, to)) {
            cacheSet(cacheKey, t);
            return t;
          }
        }
      } else {
        console.warn(`[translate] MyMemory responded ${mmRes.status}`);
      }
    } catch (e) {
      console.warn('[translate] MyMemory failed:', e?.name || e);
    }
  }

  return '';
}

// ── XML Parsing ──
export function parseRssXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = xmlDoc.querySelectorAll('item');
  const articles = [];

  items.forEach((item, index) => {
    const title = item.querySelector('title')?.textContent?.trim() || '';
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const pubDateStr = item.querySelector('pubDate')?.textContent?.trim() || '';
    let description = item.querySelector('description')?.textContent?.trim() || '';

    // Strip HTML from description
    description = description.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();

    // Source 추출 (' - 언론사' 분리)
    let sourceName = 'Google News';
    const lastDash = title.lastIndexOf(' - ');
    if (lastDash !== -1) {
      sourceName = title.substring(lastDash + 3).trim();
    }

    const pubDate = parsePubDate(pubDateStr);
    const displayDate = formatDateTime(pubDate);
    const ago = timeAgo(pubDate);

    articles.push({
      id: `art_${Date.now()}_${index}`,
      title,
      translatedTitle: '',
      description,
      link,
      pubDate: pubDateStr,
      displayDate,
      timeAgo: ago,
      source: sourceName,
      selected: false,
    });
  });

  // 최신순 정렬 (발행일시 내림차순)
  articles.sort((a, b) => {
    const timeA = parsePubDate(a.pubDate).getTime();
    const timeB = parsePubDate(b.pubDate).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

  return articles;
}

// ── Fetch RSS with multi-stage fallback ──
export async function fetchRssXml(url) {
  // 1. Try /api/rss proxy
  try {
    const resp = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
    if (resp.ok) {
      const text = await resp.text();
      if (text && (text.includes('<item>') || text.includes('<channel>'))) {
        return text;
      }
    }
  } catch (e) {
    console.warn('/api/rss endpoint error, falling back...', e);
  }

  // 2. Try /api/gnews proxy
  try {
    const proxyUrl = url.replace('https://news.google.com', '/api/gnews');
    const resp = await fetch(proxyUrl);
    if (resp.ok) {
      const text = await resp.text();
      if (text && (text.includes('<item>') || text.includes('<channel>'))) {
        return text;
      }
    }
  } catch (e) {
    console.warn('/api/gnews proxy error, falling back to external CORS proxies...', e);
  }

  // 3. Fallback to reliable external CORS proxies
  const proxyEndpoints = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  for (const proxy of proxyEndpoints) {
    try {
      const resp = await fetch(proxy);
      if (resp.ok) {
        const text = await resp.text();
        if (text && (text.includes('<item>') || text.includes('<channel>'))) {
          return text;
        }
      }
    } catch (e) {
      console.warn(`External proxy failed (${proxy}):`, e);
    }
  }

  throw new Error('구글 뉴스 RSS 데이터를 가져오지 못했습니다. 네트워크 연결을 확인해 주세요.');
}

// ── Main scrape function ──
export async function scrapeNewsArticles(
  country = '🇰🇷 한국',
  category = '경제/비즈니스',
  query = '',
  period = '오늘 (1일)',
  searchMode = 'OR (하나 이상 포함)'
) {
  const preset = COUNTRY_PRESETS[country] || COUNTRY_PRESETS['🇰🇷 한국'];
  const [hl, gl, ceid] = preset;

  let finalQuery = buildSearchQuery(query, searchMode);

  // 미국 뉴스인데 한글 검색어 입력 시 영문으로 자동 번역 (실패 시 원본 쿼리 유지)
  if (country.includes('미국') && finalQuery.match(/[가-힣]/)) {
    const translatedQuery = await translateText(finalQuery, 'ko', 'en');
    if (translatedQuery) finalQuery = translatedQuery;
  }

  const baseUrl = 'https://news.google.com';
  let url = '';

  const periodCode = PERIOD_PRESETS[period] || '';
  const periodParam = periodCode ? ` when:${periodCode}` : '';

  if (finalQuery) {
    const q = encodeURIComponent(finalQuery + periodParam);
    url = `${baseUrl}/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  } else if (SOURCE_CATEGORIES[category]) {
    url = `${baseUrl}/rss/headlines/section/topic/${SOURCE_CATEGORIES[category]}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  } else {
    url = `${baseUrl}/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }

  const xmlText = await fetchRssXml(url);
  return parseRssXml(xmlText);
}
