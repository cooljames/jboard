// ═══════════════════════════════════════════════════════════
// News & AI Agent Constants
// ═══════════════════════════════════════════════════════════

export const COUNTRY_PRESETS = {
  '🇰🇷 한국': ['ko', 'KR', 'KR:ko'],
  '🇺🇸 미국': ['en-US', 'US', 'US:en'],
};

export const SOURCE_CATEGORIES = {
  '전체 헤드라인': '',
  '경제/비즈니스': 'BUSINESS',
  '기술': 'TECHNOLOGY',
  '과학': 'SCIENCE',
  '건강': 'HEALTH',
  '스포츠': 'SPORTS',
  '엔터테인먼트': 'ENTERTAINMENT',
  '세계': 'WORLD',
};

export const PERIOD_PRESETS = {
  '전체 기간': '',
  '실시간 (1시간)': '1h',
  '최근 3시간': '3h',
  '오늘 (1일)': '1d',
  '최근 3일': '3d',
  '이번 주 (7일)': '7d',
  '이번 달 (30일)': '30d',
};

// 첨부 이미지 1에 해당하는 시간 필터 버튼 목록
export const TIME_FILTER_BUTTONS = [
  { label: '1시간', hours: 1 },
  { label: '3시간', hours: 3 },
  { label: '6시간', hours: 6 },
  { label: '12시간', hours: 12 },
  { label: '18시간', hours: 18 },
  { label: '24시간', hours: 24 },
  { label: '오늘', hours: 'today' },
  { label: '이번주', hours: 24 * 7 },
];

// 첨부 이미지 2에 해당하는 Gemini 모델 목록 + Gemini 3.8 Flash 추가
export const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', apiFallback: 'gemini-2.5-flash' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', apiFallback: 'gemini-2.5-flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', apiFallback: 'gemini-2.5-flash' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', apiFallback: 'gemini-2.5-flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', apiFallback: 'gemini-2.0-flash-lite' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (추천)', isDefault: true, apiFallback: 'gemini-2.0-flash' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', apiFallback: 'gemini-1.5-pro' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', apiFallback: 'gemini-2.0-flash' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', apiFallback: 'gemini-1.5-pro' },
];

export const SUMMARY_LINES_OPTIONS = [
  { value: '5줄', label: '5줄', minChars: 500, isDefault: true },
  { value: '7줄', label: '7줄', minChars: 700 },
  { value: '10줄', label: '10줄', minChars: 1000 },
];

export const DEFAULT_NEWS_CONFIG = {
  country: '🇰🇷 한국',
  category: '경제/비즈니스',
  period: '최근 3시간',
  searchMode: 'OR (하나 이상 포함)',
  summaryLines: '5줄',
  modelId: 'gemini-3.1-flash-lite',
  apiKey: '',
};

export const NEWS_CONFIG_STORAGE_KEY = 'jboard_news_config';
