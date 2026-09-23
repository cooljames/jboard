// ═══════════════════════════════════════════════════════════
// News Desk Filter & Unified Action Toolbar HTML Templates
// ═══════════════════════════════════════════════════════════
import { COUNTRY_PRESETS, SOURCE_CATEGORIES, PERIOD_PRESETS, TIME_FILTER_BUTTONS, SUMMARY_LINES_OPTIONS } from './constants.js';

export function renderNewsToolbarHtml(ctrl) {
  const selectedCount = ctrl.articles.filter((a) => a.selected).length;

  return `
    <!-- ═══ Filter & Search Bar with Merged [뉴스 설정] & [새로고침] on Row 1 (Item 1) ═══ -->
    <div class="card shadow-sm border-0 mb-3 bg-body rounded-3">
      <div class="card-body p-3">
        <!-- 1. Country & Category Badges Row + Merged Buttons on the Right -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted small fw-semibold"><i class="bi bi-globe me-1"></i>국가:</span>
              <div class="btn-group btn-group-sm" role="group" id="newsCountryList">
                ${Object.keys(COUNTRY_PRESETS).map((c) => `
                  <button type="button" class="btn ${c === ctrl.country ? 'btn-primary' : 'btn-outline-secondary'}" data-country="${c}">
                    ${c}
                  </button>`).join('')}
              </div>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="text-muted small fw-semibold"><i class="bi bi-grid-fill me-1"></i>분야:</span>
              <div class="d-flex flex-wrap gap-1" id="newsCatList">
                ${Object.keys(SOURCE_CATEGORIES).map((cat) => `
                  <button type="button" class="badge-cat-btn btn btn-sm rounded-pill py-1 px-2.5 ${cat === ctrl.category ? 'btn-primary' : 'btn-outline-secondary'}" data-category="${cat}">
                    ${cat}
                  </button>`).join('')}
              </div>
            </div>
          </div>

          <!-- Merged News Config & Refresh Buttons (오른쪽 정렬) -->
          <div class="d-flex align-items-center gap-2 ms-auto">
            <button type="button" class="btn btn-outline-secondary btn-sm px-3 shadow-sm d-flex align-items-center gap-1" id="newsConfigToggleBtn">
              <i class="bi bi-gear-fill"></i><span>뉴스 설정</span>
            </button>
            <button type="button" class="btn btn-primary btn-sm px-3 shadow-sm d-flex align-items-center gap-1 fw-semibold" id="newsRefreshBtn" ${ctrl.isLoading ? 'disabled' : ''}>
              <i class="bi bi-arrow-clockwise ${ctrl.isLoading ? 'spin-icon' : ''}"></i><span>새로고침</span>
            </button>
          </div>
        </div>

        <!-- 2. Search & Period Row -->
        <div class="row g-2 align-items-center">
          <div class="col-md-3 col-lg-2">
            <select id="newsPeriodSelect" class="form-select form-select-sm">
              ${Object.keys(PERIOD_PRESETS).map((p) => `<option value="${p}" ${p === ctrl.period ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>

          <div class="col-md-3 col-lg-2">
            <select id="newsSearchModeSelect" class="form-select form-select-sm">
              <option value="OR (하나 이상 포함)" ${ctrl.searchMode.includes('OR') ? 'selected' : ''}>OR (단어 포함)</option>
              <option value="AND (모두 포함)" ${ctrl.searchMode.includes('AND') ? 'selected' : ''}>AND (정확 일치)</option>
            </select>
          </div>

          <div class="col-md-6 col-lg-8">
            <form id="newsSearchForm" class="d-flex gap-2">
              <div class="input-group input-group-sm flex-grow-1">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="newsSearchInput" class="form-control" placeholder="검색 키워드 입력 (콤마로 구분 가능. 예: AI, 반도체)" value="${ctrl.searchQuery}" />
                ${ctrl.searchQuery ? '<button type="button" class="btn btn-outline-secondary" id="clearNewsSearchBtn"><i class="bi bi-x"></i></button>' : ''}
              </div>
              <button type="submit" class="btn btn-primary btn-sm px-3 text-nowrap fw-semibold">
                <i class="bi bi-search me-1"></i>검색
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Bootstrap 5.0 Unified Controls Card ═══ -->
    <div class="card shadow-sm border-0 mb-3 bg-body rounded-3">
      <div class="card-body p-3">
        <!-- Row 1: 선택 제어, 시간 필터, 요약 선택 (한 행 통합 배치), 번역 토글 버튼 -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-2 mb-2 border-bottom">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-secondary" id="exactBtnSelectAll" title="모든 기사 선택">
                <i class="bi bi-check-all me-1"></i>전체 선택
              </button>
              <button type="button" class="btn btn-outline-secondary" id="exactBtnDeselectAll" title="선택 해제">
                <i class="bi bi-dash me-1"></i>전체 해제
              </button>
            </div>

            <div class="vr d-none d-sm-block my-1 text-secondary opacity-25"></div>

            <!-- 시간 필터 (1시간 ~ 이번주) -->
            <div class="btn-group btn-group-sm flex-wrap" role="group" id="timeFilterBtnGroup">
              ${TIME_FILTER_BUTTONS.map((btn) => `
                <button type="button" class="btn ${ctrl.activeTimeFilter === btn.label ? 'btn-primary' : 'btn-outline-primary'}" data-time-label="${btn.label}">
                  ${btn.label}
                </button>
              `).join('')}
            </div>

            <div class="vr d-none d-md-block my-1 text-secondary opacity-25"></div>

            <!-- 요약 선택 (시간 선택 바로 옆에 한 행으로 배치) -->
            <div class="d-inline-flex align-items-center gap-1">
              <span class="badge bg-secondary-subtle text-secondary-emphasis px-2 py-1 small fw-semibold">요약</span>
              <div class="btn-group btn-group-sm" role="group">
                ${SUMMARY_LINES_OPTIONS.map((opt) => `
                  <button type="button" class="btn ${ctrl.summaryLines === opt.value ? 'btn-secondary' : 'btn-outline-secondary'}" data-summary-val="${opt.value}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- 번역 버튼 (토글 방식으로 색상과 텍스트 변경) -->
          <div class="d-flex align-items-center ms-auto">
            ${ctrl.isTranslating ? `
              <button type="button" class="btn btn-sm btn-warning text-dark fw-semibold shadow-sm d-inline-flex align-items-center gap-1" id="exactBtnTranslateUS" disabled>
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                <span>번역 중...</span>
              </button>
            ` : ctrl.showTranslation ? `
              <button type="button" class="btn btn-sm btn-success fw-semibold shadow-sm d-inline-flex align-items-center gap-1" id="exactBtnTranslateUS" title="클릭 시 원문으로 전환합니다">
                <i class="bi bi-check-circle-fill"></i>
                <span>번역 켜짐 (원문 보기)</span>
              </button>
            ` : `
              <button type="button" class="btn btn-sm btn-outline-primary fw-semibold d-inline-flex align-items-center gap-1" id="exactBtnTranslateUS" title="클릭 시 한글로 번역합니다">
                <i class="bi bi-translate"></i>
                <span>한글 번역</span>
              </button>
            `}
          </div>
        </div>

        <!-- Row 2: 기사 분석 & 저장, 보고서 열어보기, 실시간 기사 수 및 선택 카운트 -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <button type="button" class="btn btn-primary btn-sm px-3 fw-bold shadow-sm d-inline-flex align-items-center gap-2" id="exactBtnAnalyzeSave" ${ctrl.isAnalyzing ? 'disabled' : ''}>
              <i class="bi bi-bar-chart-fill"></i>
              <span>${ctrl.isAnalyzing ? '선택된 기사 분석 및 파일 저장 중...' : '선택된 기사 분석하여 파일 저장'}</span>
            </button>
            <button type="button" class="btn btn-dark btn-sm px-3 fw-semibold shadow-sm d-inline-flex align-items-center gap-1" id="exactBtnOpenReport">
              <i class="bi bi-box-arrow-up-right me-1"></i>열어보기
            </button>
          </div>

          <div class="small text-body-secondary d-flex align-items-center gap-2" id="newsStatusText">
            <span>총 <strong>${ctrl.articles.length}</strong>개 실시간 기사 중 <span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-1">${selectedCount}개 선택됨</span></span>
          </div>
        </div>
      </div>
    </div>
  `;
}
