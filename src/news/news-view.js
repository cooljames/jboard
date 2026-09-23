// ═══════════════════════════════════════════════════════════
// News Desk & AI Agent View Controller
// ═══════════════════════════════════════════════════════════
import {
  TIME_FILTER_BUTTONS,
  DEFAULT_NEWS_CONFIG,
  NEWS_CONFIG_STORAGE_KEY,
} from './constants.js';
import { scrapeNewsArticles, parsePubDate } from './news-service.js';
import { loadSiteTranslate, setSiteLanguage, applySiteLanguage, isSiteTranslatedTo } from './site-translate.js';
import { generateNewsAnalysis } from './gemini-agent.js';
import { openNewsConfigModal } from './news-config-modal.js';
import { renderNewsToolbarHtml } from './news-toolbar.js';
import { renderNewsArticleList } from './news-article-list.js';
import {
  renderProgress,
  renderAnalysisCardHtml,
  postToJBoard,
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
    // Google 사이트 번역 위젯 상태 (쿠키에 저장된 상태와 동기화)
    this.showTranslation = isSiteTranslatedTo('ko');
    this.widgetLoading = false;
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

      // 한국 뉴스 모드에서는 번역 대상이 없으므로 켜져 있던 번역 자동 해제
      if (this.country.includes('한국') && this.showTranslation) {
        this.showTranslation = false;
        setSiteLanguage('en');
        this.updateTranslationButton();
      }
    } catch (err) {
      this.error = err.message || '뉴스를 불러오는 데 실패했습니다.';
      this.app?.showToast?.(this.error, 'danger');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  // Google 사이트 번역 위젯 켜기/끄기 (개별 문장 API 미사용 → 즉시·무제한)
  // - 콤보 변경은 쿠키로 실제 반영을 확인하며 재시도 (한 번 클릭으로 적용)
  async setTranslation(on) {
    if (this.widgetLoading) return;
    if ((this.country || '').includes('한국')) {
      this.app?.showToast?.('한국 뉴스는 번역 없이 바로 볼 수 있습니다.', 'info');
      return;
    }
    if (on === this.showTranslation) return;

    this.widgetLoading = true;
    this.updateTranslationButton();
    const { ok, reason } = await loadSiteTranslate();
    if (!ok) {
      this.widgetLoading = false;
      this.updateTranslationButton();
      if (reason === 'script-blocked') {
        this.app?.showToast?.('Google 번역 스크립트가 차단됐습니다. 광고 차단 확장 프로그램을 끄고 새로고침 후 다시 시도해 주세요.', 'danger');
      } else {
        this.app?.showToast?.('Google 번역 위젯 초기화에 실패했습니다. 새로고침 후 다시 시도해 주세요.', 'danger');
      }
      return;
    }
    const applied = await applySiteLanguage(on ? 'ko' : 'en');
    this.widgetLoading = false;
    if (applied) {
      this.showTranslation = on;
      this.app?.showToast?.(on ? 'Google 사이트 번역이 적용되었습니다.' : '원문으로 전환되었습니다.', 'success');
    } else {
      this.app?.showToast?.(on ? '번역 적용에 실패했습니다. 다시 시도해 주세요.' : '원문 복원에 실패했습니다. 다시 시도해 주세요.', 'warning');
    }
    this.updateTranslationButton();
    this.renderStatus();
  }

  updateTranslationButton() {
    const koBtn = document.getElementById('exactBtnTranslateKO');
    const enBtn = document.getElementById('exactBtnTranslateEN');
    if (!koBtn || !enBtn) return;
    // 한국 뉴스 모드에서는 번역 대상이 없으므로 토글 비활성화
    if ((this.country || '').includes('한국')) {
      koBtn.disabled = true;
      enBtn.disabled = true;
      koBtn.className = 'btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1 opacity-50';
      koBtn.title = '한국 뉴스는 번역 없이 바로 볼 수 있습니다';
      koBtn.innerHTML = `<i class="bi bi-translate"></i><span>한글 번역</span>`;
      enBtn.className = 'btn btn-sm btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-1 opacity-50';
      enBtn.title = '한국 뉴스는 번역 없이 바로 볼 수 있습니다';
      enBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>원문 보기</span>`;
      return;
    }
    koBtn.disabled = this.widgetLoading;
    enBtn.disabled = this.widgetLoading;
    if (this.widgetLoading) {
      koBtn.className = 'btn btn-sm btn-warning text-dark fw-semibold d-inline-flex align-items-center gap-1';
      koBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span><span>번역 준비 중...</span>`;
      enBtn.className = 'btn btn-sm btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-1';
      enBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>원문 보기</span>`;
    } else if (this.showTranslation) {
      koBtn.className = 'btn btn-sm btn-primary fw-semibold d-inline-flex align-items-center gap-1';
      koBtn.title = '한글 번역 적용 중';
      koBtn.innerHTML = `<i class="bi bi-translate"></i><span>한글 번역</span>`;
      enBtn.className = 'btn btn-sm btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-1';
      enBtn.title = '원문으로 전환합니다';
      enBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>원문 보기</span>`;
    } else {
      koBtn.className = 'btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1';
      koBtn.title = 'Google 사이트 번역으로 한글로 봅니다';
      koBtn.innerHTML = `<i class="bi bi-translate"></i><span>한글 번역</span>`;
      enBtn.className = 'btn btn-sm btn-secondary fw-semibold d-inline-flex align-items-center gap-1';
      enBtn.title = '원문 보기 상태입니다';
      enBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i><span>원문 보기</span>`;
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

  async runAiAnalysis() {
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
      <div id="aiProgressContainer" class="card shadow-sm border-0 mb-3 bg-body p-3 rounded-3 notranslate ${this.isAnalyzing ? '' : 'd-none'}" translate="no">
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
    this.updateTranslationButton();
    // 쿠키는 번역 상태인데 위젯이 없으면(새로고침 직후) 백그라운드로 미리 로드
    if (this.showTranslation && !document.querySelector('.goog-te-combo') && !this.widgetLoading) {
      loadSiteTranslate().then(() => this.updateTranslationButton());
    }
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

    // Translation segmented toggle: 한글 번역 | 원문 보기
    document.getElementById('exactBtnTranslateKO')?.addEventListener('click', () => this.setTranslation(true));
    document.getElementById('exactBtnTranslateEN')?.addEventListener('click', () => this.setTranslation(false));

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
      this.runAiAnalysis();
    });
    document.getElementById('exactBtnOpenReport')?.addEventListener('click', () => openReportInNewTab(this));
    document.getElementById('postToJBoardBtn')?.addEventListener('click', () => postToJBoard(this));
    document.getElementById('viewNewTabBtn')?.addEventListener('click', () => openReportInNewTab(this));
  }
}
