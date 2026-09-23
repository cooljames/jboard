// ═══════════════════════════════════════════════════════════
// News Desk & AI Agent View Controller
// ═══════════════════════════════════════════════════════════
import {
  TIME_FILTER_BUTTONS,
  DEFAULT_NEWS_CONFIG,
  NEWS_CONFIG_STORAGE_KEY,
} from './constants.js';
import { scrapeNewsArticles, translateNewsTitle, parsePubDate } from './news-service.js';
import { generateNewsAnalysis } from './gemini-agent.js';
import { openNewsConfigModal } from './news-config-modal.js';
import { renderNewsToolbarHtml } from './news-toolbar.js';
import { renderNewsArticleList } from './news-article-list.js';
import {
  renderProgress,
  renderAnalysisCardHtml,
  postToJBoard,
  downloadReport,
  openReportInNewTab,
} from './news-analysis-view.js';

export class NewsDeskController {
  constructor(appInstance, container) {
    this.app = appInstance;
    this.container = container;
    this.config = this.loadConfig();

    // State
    this.country = this.config.country || '🇰🇷 한국';
    this.category = this.config.category || '경제/비즈니스';
    this.period = this.config.period || '최근 3시간';
    this.searchQuery = '';
    this.searchMode = this.config.searchMode || 'OR (하나 이상 포함)';
    this.summaryLines = this.config.summaryLines || '5줄';
    this.modelId = this.config.modelId || 'gemini-3.8-flash';
    this.apiKey = this.config.apiKey || '';

    this.articles = [];
    this.newsPage = 1;
    this.newsPageSize = 15;
    this.activeTimeFilter = null;
    this.isLoading = false;
    this.isTranslating = false;
    this.showTranslation = false;
    this.isAnalyzing = false;
    this.analysisProgress = { percent: 0, message: '' };
    this.latestAnalysis = null;
    this.error = null;

    this.render();
    this.loadArticles();
  }

  loadConfig() {
    try {
      const data = localStorage.getItem(NEWS_CONFIG_STORAGE_KEY);
      return data ? { ...DEFAULT_NEWS_CONFIG, ...JSON.parse(data) } : { ...DEFAULT_NEWS_CONFIG };
    } catch {
      return { ...DEFAULT_NEWS_CONFIG };
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(
        NEWS_CONFIG_STORAGE_KEY,
        JSON.stringify({
          country: this.country,
          category: this.category,
          period: this.period,
          searchMode: this.searchMode,
          summaryLines: this.summaryLines,
          modelId: this.modelId,
          apiKey: this.apiKey,
        })
      );
    } catch (e) {
      console.warn('Failed to save news config to localStorage:', e);
    }
  }

  async loadArticles() {
    this.isLoading = true;
    this.error = null;
    this.newsPage = 1;
    this.renderStatus();

    try {
      const results = await scrapeNewsArticles(
        this.country,
        this.category,
        this.searchQuery,
        this.period,
        this.searchMode
      );
      this.articles = results;

      // Select first 3 articles by default
      this.articles.forEach((a, idx) => {
        if (idx < 3) a.selected = true;
      });

      // If US news and autoTranslateUS is enabled, turn on translation
      if (this.country.includes('미국') && this.config.autoTranslateUS) {
        this.showTranslation = true;
        this.translateAllTitles();
      }
    } catch (err) {
      this.error = err.message || '뉴스를 불러오는 데 실패했습니다.';
      this.app?.showToast?.(this.error, 'danger');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  async translateAllTitles() {
    if (this.isTranslating) return;
    this.isTranslating = true;
    this.showTranslation = true;
    this.updateTranslationButton();
    this.renderStatus();

    try {
      for (const a of this.articles) {
        if (!a.translatedTitle) {
          a.translatedTitle = await translateNewsTitle(a.title);
        }
      }
    } catch (e) {
      console.warn('Translation error:', e);
    } finally {
      this.isTranslating = false;
      renderNewsArticleList(this);
      this.updateTranslationButton();
      this.renderStatus();
    }
  }

  async toggleTranslation() {
    if (this.isTranslating) return;
    this.showTranslation = !this.showTranslation;

    if (this.showTranslation) {
      const needsTranslation = this.articles.some((a) => !a.translatedTitle);
      if (needsTranslation) {
        await this.translateAllTitles();
      } else {
        renderNewsArticleList(this);
        this.updateTranslationButton();
      }
    } else {
      renderNewsArticleList(this);
      this.updateTranslationButton();
    }
  }

  updateTranslationButton() {
    const btn = document.getElementById('exactBtnTranslateUS');
    if (!btn) return;
    if (this.isTranslating) {
      btn.className = 'btn btn-sm btn-warning text-dark fw-semibold shadow-sm d-inline-flex align-items-center gap-1';
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span><span>번역 중...</span>`;
    } else if (this.showTranslation) {
      btn.className = 'btn btn-sm btn-success fw-semibold shadow-sm d-inline-flex align-items-center gap-1';
      btn.disabled = false;
      btn.title = '클릭 시 원문으로 전환합니다';
      btn.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>번역 켜짐 (원문 보기)</span>`;
    } else {
      btn.className = 'btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1';
      btn.disabled = false;
      btn.title = '클릭 시 한글로 번역합니다';
      btn.innerHTML = `<i class="bi bi-translate"></i><span>한글 번역</span>`;
    }
  }

  toggleSelectAll(select) {
    this.articles.forEach((a) => {
      a.selected = select;
    });
    renderNewsArticleList(this);
    this.renderStatus();
  }

  filterByTime(filterObj) {
    this.activeTimeFilter = filterObj.label;
    const now = Date.now();
    let cutoffTime = 0;

    if (filterObj.hours === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cutoffTime = today.getTime();
    } else if (typeof filterObj.hours === 'number') {
      cutoffTime = now - filterObj.hours * 60 * 60 * 1000;
    }

    let matchedCount = 0;
    this.articles.forEach((a) => {
      const d = parsePubDate(a.pubDate);
      const t = d ? d.getTime() : 0;
      const isMatch = t >= cutoffTime;
      a.selected = isMatch;
      if (isMatch) matchedCount++;
    });

    renderNewsArticleList(this);
    this.renderStatus();
    this.app?.showToast?.(`[${filterObj.label}] 기준 ${matchedCount}개 기사가 선택되었습니다.`, 'info');
  }

  async runAiAnalysis(autoDownload = false) {
    if (!this.apiKey) {
      openNewsConfigModal(this);
      this.app?.showToast?.('Gemini API 키를 먼저 입력하고 저장해 주세요.', 'warning');
      return;
    }

    const selected = this.articles.filter((a) => a.selected);
    if (selected.length === 0) {
      this.app?.showToast?.('분석할 기사를 하나 이상 선택해 주세요.', 'warning');
      return;
    }

    this.isAnalyzing = true;
    this.analysisProgress = { percent: 10, message: 'Gemini AI 에이전트 초기화 중...' };
    this.render();
    renderProgress(this);

    try {
      const result = await generateNewsAnalysis({
        apiKey: this.apiKey,
        articles: this.articles,
        summaryLines: this.summaryLines,
        country: this.country,
        modelId: this.modelId,
        onProgress: (percent, msg) => {
          this.analysisProgress = { percent, message: msg };
          renderProgress(this);
        },
      });

      this.latestAnalysis = result;
      this.app?.showToast?.('AI 심층 뉴스 브리핑이 성공적으로 생성되었습니다!', 'success');

      if (autoDownload) {
        downloadReport(this);
      }
    } catch (err) {
      this.app?.showToast?.(err.message || 'AI 분석 중 오류가 발생했습니다.', 'danger');
    } finally {
      this.isAnalyzing = false;
      this.render();
      const el = document.getElementById('aiAnalysisResultCard');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  renderStatus() {
    const el = document.getElementById('newsStatusText');
    if (!el) return;
    if (this.isLoading) {
      el.innerHTML = '<span class="spinner-border spinner-border-sm text-primary me-2"></span>구글 뉴스 RSS 피드를 수집하는 중...';
      return;
    }
    if (this.isTranslating) {
      el.innerHTML = '<span class="spinner-border spinner-border-sm text-info me-2"></span>영문 기사 헤드라인 번역 중...';
      return;
    }
    if (this.error) {
      el.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>${this.error}</span>`;
      return;
    }
    const selectedCount = this.articles.filter((a) => a.selected).length;
    el.innerHTML = `총 <strong>${this.articles.length}</strong>개 실시간 기사 중 <span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-1">${selectedCount}개 선택됨</span>`;
  }

  render() {
    this.container.innerHTML = `
    <div class="news-desk-wrapper w-100">
      <!-- ═══ Filter, Search & Unified Actions Toolbar ═══ -->
      ${renderNewsToolbarHtml(this)}

      <!-- Progress Bar Area -->
      <div id="aiProgressContainer" class="card shadow-sm border-0 mb-3 bg-body p-3 rounded-3 ${this.isAnalyzing ? '' : 'd-none'}">
        <div class="progress" style="height: 10px; border-radius: 6px;">
          <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" id="aiProgressBar" role="progressbar" style="width: 0%"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2 small text-muted">
          <span id="aiProgressMessage">AI 분석 진행 중...</span>
          <span class="badge bg-secondary-subtle text-secondary" id="aiModelBadge">${this.modelId}</span>
        </div>
      </div>

      <!-- ═══ Article List Container (Item 3 Compact Format) ═══ -->
      <div id="newsArticlesContainer" class="news-list-container mb-4"></div>

      <!-- ═══ Latest Analysis Result Card ═══ -->
      ${renderAnalysisCardHtml(this)}
    </div>
    `;

    renderNewsArticleList(this);
    renderProgress(this);
    this.bindEvents();
  }

  bindEvents() {
    // Country change
    this.container.querySelectorAll('#newsCountryList button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.country = btn.getAttribute('data-country');
        this.saveConfig();
        this.loadArticles();
      });
    });

    // Category change
    this.container.querySelectorAll('#newsCatList button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.category = btn.getAttribute('data-category');
        this.saveConfig();
        this.loadArticles();
      });
    });

    // Period change
    document.getElementById('newsPeriodSelect')?.addEventListener('change', (e) => {
      this.period = e.target.value;
      this.saveConfig();
      this.loadArticles();
    });

    // Search mode change
    document.getElementById('newsSearchModeSelect')?.addEventListener('change', (e) => {
      this.searchMode = e.target.value;
      this.saveConfig();
      this.loadArticles();
    });

    // Search form submit
    document.getElementById('newsSearchForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.searchQuery = document.getElementById('newsSearchInput').value.trim();
      this.loadArticles();
    });

    // Refresh & Config buttons (Merged on Row 1)
    document.getElementById('newsRefreshBtn')?.addEventListener('click', () => this.loadArticles());
    document.getElementById('newsConfigToggleBtn')?.addEventListener('click', () => {
      if (!this.app.currentUser) {
        this.app.navigate('signup');
        return;
      }
      openNewsConfigModal(this);
    });

    // Clear Search Button
    document.getElementById('clearNewsSearchBtn')?.addEventListener('click', () => {
      this.searchQuery = '';
      const input = document.getElementById('newsSearchInput');
      if (input) input.value = '';
      this.loadArticles();
    });

    // Selection buttons
    document.getElementById('exactBtnSelectAll')?.addEventListener('click', () => this.toggleSelectAll(true));
    document.getElementById('exactBtnDeselectAll')?.addEventListener('click', () => this.toggleSelectAll(false));

    // Time Filter Buttons
    this.container.querySelectorAll('[data-time-label]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = btn.getAttribute('data-time-label');
        const filterObj = TIME_FILTER_BUTTONS.find((f) => f.label === label);
        if (filterObj) {
          this.filterByTime(filterObj);
          this.container.querySelectorAll('[data-time-label]').forEach((b) => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline-primary');
          });
          btn.classList.remove('btn-outline-primary');
          btn.classList.add('btn-primary');
        }
      });
    });

    // Translation toggle button
    document.getElementById('exactBtnTranslateUS')?.addEventListener('click', () => this.toggleTranslation());

    // Summary Toggle Buttons
    this.container.querySelectorAll('[data-summary-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-summary-val');
        this.summaryLines = val;
        this.saveConfig();
        this.container.querySelectorAll('[data-summary-val]').forEach((b) => {
          b.classList.remove('btn-secondary');
          b.classList.add('btn-outline-secondary');
        });
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-secondary');
        this.app?.showToast?.(`요약 분량이 [${val}]으로 설정되었습니다.`, 'info');
      });
    });

    // Analysis actions
    document.getElementById('exactBtnAnalyzeSave')?.addEventListener('click', () => {
      if (!this.app.currentUser) {
        this.app.navigate('signup');
        return;
      }
      this.runAiAnalysis(true);
    });
    document.getElementById('exactBtnOpenReport')?.addEventListener('click', () => openReportInNewTab(this));
    document.getElementById('postToJBoardBtn')?.addEventListener('click', () => postToJBoard(this));
    document.getElementById('downloadHtmlBtn')?.addEventListener('click', () => downloadReport(this));
    document.getElementById('viewNewTabBtn')?.addEventListener('click', () => openReportInNewTab(this));
  }
}
