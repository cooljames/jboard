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

export async function translateText(text, from = 'en', to = 'ko') {
  if (!text || !text.trim()) return '';
  
  // 1. Try internal /api/translate
  try {
    const res = await fetch(`/api/translate?text=${encodeURIComponent(text)}&from=${from}&to=${to}`);
    if (res.ok) {
      const textData = await res.text();
      const parsed = parseGoogleTranslateResponse(textData);
      if (parsed) return parsed;
    }
  } catch (e) {
    // fallback
  }

  // 2. Try direct Google translate GTX
  try {
    const directUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(directUrl);
    if (resp.ok) {
      const textData = await resp.text();
      const parsed = parseGoogleTranslateResponse(textData);
      if (parsed) return parsed;
    }
  } catch (e) {
    // fallback
  }

  return text;
}

/**
 * 미국 뉴스 제목 번역:
 * 구글 뉴스 RSS의 '제목 - 언론사명' 형태에서 언론사명 오번역을 방지하고
 * 순수 기사 헤드라인만 번역한 뒤 언론사명을 유지하여 반환합니다.
 */
export async function translateNewsTitle(rawTitle) {
  if (!rawTitle || !rawTitle.trim()) return '';
  const lastDashIndex = rawTitle.lastIndexOf(' - ');
  if (lastDashIndex !== -1) {
    const headline = rawTitle.substring(0, lastDashIndex).trim();
    const source = rawTitle.substring(lastDashIndex + 3).trim();
    if (headline) {
      const translatedHeadline = await translateText(headline, 'en', 'ko');
      if (translatedHeadline && !translatedHeadline.startsWith('<')) {
        return source ? `${translatedHeadline} - ${source}` : translatedHeadline;
      }
      return rawTitle;
    }
  }
  const translated = await translateText(rawTitle, 'en', 'ko');
  return (translated && !translated.startsWith('<')) ? translated : rawTitle;
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

  // 미국 뉴스인데 한글 검색어 입력 시 영문으로 자동 번역
  if (country.includes('미국') && finalQuery.match(/[가-힣]/)) {
    finalQuery = await translateText(finalQuery, 'ko', 'en');
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
