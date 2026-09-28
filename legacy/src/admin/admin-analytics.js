// ═══════════════════════════════════════════════════════════
// Admin Analytics, ApexCharts & System Settings View
// ═══════════════════════════════════════════════════════════
import { pageHeader, smallBox, showToast, bindCardTools } from '../utils/ui-helpers.js';
import { DEFAULT_POSTS, DEFAULT_MEMBERS } from '../data/mock-data.js';
import { renderAdminPage } from './admin-layout.js';

export function renderAnalytics(app) {
  const c = app.adminContainer;
  const catStats = {};
  app.posts.forEach(p => {
    if (!catStats[p.categoryName]) catStats[p.categoryName] = { count: 0, views: 0, likes: 0 };
    catStats[p.categoryName].count++;
    catStats[p.categoryName].views += p.views || 0;
    catStats[p.categoryName].likes += p.likes || 0;
  });
  const tv = app.posts.reduce((s, p) => s + (p.views || 0), 0);
  const tl = app.posts.reduce((s, p) => s + (p.likes || 0), 0);
  const avg = app.posts.length ? Math.round(tv / app.posts.length) : 0;
  const au = {};
  app.posts.forEach(p => {
    au[p.author] = (au[p.author] || 0) + 1;
  });
  const sa = Object.entries(au).sort((a, b) => b[1] - a[1]);

  c.innerHTML = `
    ${pageHeader('통계 분석', '게시판 활동 및 트렌드 데이터 인터랙티브 분석', '통계 분석')}
    
    <!-- Small Boxes -->
    <div class="row g-3 mb-4">
      ${smallBox(app.posts.length, '총 게시글 수', 'primary', 'bi-file-earmark-bar-graph-fill', 'board')}
      ${smallBox(avg.toLocaleString(), '게시글 당 평균 조회', 'info', 'bi-bar-chart-line-fill', 'analytics')}
      ${smallBox(tl.toLocaleString(), '전체 누적 추천수', 'danger', 'bi-heart-fill', 'analytics')}
      ${smallBox(sa.length, '고유 작성자 수', 'success', 'bi-person-lines-fill', 'members')}
    </div>

    <!-- ApexCharts Row -->
    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <div class="card card-primary card-outline shadow-sm h-100">
          <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
            <h5 class="card-title mb-0 fw-bold">
              <i class="bi bi-graph-up me-2 text-primary"></i>주간 활동 트렌드 (조회수 및 신규 게시글)
            </h5>
            <div class="card-tools d-flex align-items-center gap-1">
              <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
              <button type="button" class="btn btn-tool" data-lte-toggle="card-remove"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
          <div class="card-body p-3">
            <div id="analyticsWeeklyChart" style="min-height: 320px;"></div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-info card-outline shadow-sm h-100">
          <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
            <h6 class="card-title mb-0 fw-bold">
              <i class="bi bi-pie-chart-fill me-2 text-info"></i>카테고리별 비중 분포
            </h6>
            <div class="card-tools">
              <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
            </div>
          </div>
          <div class="card-body p-3">
            <div id="analyticsCategoryChart" style="min-height: 320px;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rankings Row -->
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-0 fw-bold"><i class="bi bi-trophy-fill me-2 text-warning"></i>우수 작성자 랭킹</h6>
            <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              ${sa
                .map(([name, cnt], i) => {
                  const m = app.members.find(x => x.name === name);
                  return `
                  <div class="list-group-item d-flex align-items-center gap-3 py-3">
                    <span class="badge bg-${i < 3 ? ['danger', 'warning', 'info'][i] : 'secondary'} rounded-circle d-flex align-items-center justify-content-center" style="width:28px;height:28px">${i + 1}</span>
                    <img src="${m?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}" class="rounded-circle border" width="32" height="32">
                    <div class="flex-grow-1"><span class="fw-semibold">${name}</span></div>
                    <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">${cnt}건 등록</span>
                  </div>`;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-0 fw-bold"><i class="bi bi-fire me-2 text-danger"></i>누적 조회수 TOP 5</h6>
            <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              ${[...app.posts]
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map(
                  (p, i) => `
                <div class="list-group-item d-flex align-items-center gap-3 py-3">
                  <span class="badge bg-${i < 3 ? ['danger', 'warning', 'info'][i] : 'secondary'} rounded-circle d-flex align-items-center justify-content-center" style="width:28px;height:28px">${i + 1}</span>
                  <div class="flex-grow-1 text-truncate">
                    <a href="#" class="fw-semibold small text-truncate d-block text-decoration-none text-body post-title-link" data-id="${p.id}">${p.title}</a>
                    <small class="text-body-secondary">${p.author} · ${p.categoryName}</small>
                  </div>
                  <span class="badge bg-info-subtle text-info rounded-pill px-3 py-1"><i class="bi bi-eye me-1"></i>${p.views.toLocaleString()}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindCardTools();
  renderActivityChart(app, 'analyticsWeeklyChart');
  renderCategoryDonutChart(app, 'analyticsCategoryChart', catStats);

  c.querySelectorAll('.post-title-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.openDetailModal(parseInt(el.getAttribute('data-id')));
    });
  });

  c.querySelectorAll('[data-admin-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.adminPage = el.getAttribute('data-admin-page');
      document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector(`[data-admin-page="${app.adminPage}"]`)?.classList.add('active');
      renderAdminPage(app);
    });
  });
}

export function renderActivityChart(app, containerId) {
  const el = document.getElementById(containerId);
  if (!el || typeof window.ApexCharts === 'undefined') return;

  if (app.charts[containerId]) {
    try { app.charts[containerId].destroy(); } catch {}
  }

  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  const options = {
    series: [
      { name: '일별 누적 조회수', data: [120, 180, 240, 310, 290, 420, 560] },
      { name: '신규 등록 게시글', data: [2, 4, 1, 6, 3, 5, 8] }
    ],
    chart: {
      type: 'area',
      height: 280,
      toolbar: { show: false },
      background: 'transparent'
    },
    colors: ['#0d6efd', '#20c997'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: [3, 2] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 95, 100]
      }
    },
    xaxis: {
      categories: ['9/16(월)', '9/17(화)', '9/18(수)', '9/19(목)', '9/20(금)', '9/21(토)', '9/22(일)'],
      labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } }
    },
    yaxis: [
      { title: { text: '조회수', style: { color: '#0d6efd', fontWeight: 600 } }, labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } } },
      { opposite: true, title: { text: '등록글 (건)', style: { color: '#20c997', fontWeight: 600 } }, labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } } }
    ],
    tooltip: { theme: isDark ? 'dark' : 'light' },
    grid: { borderColor: isDark ? '#343a40' : '#e9ecef' },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: isDark ? '#f8f9fa' : '#212529' } }
  };

  const chart = new window.ApexCharts(el, options);
  chart.render();
  app.charts[containerId] = chart;
}

export function renderCategoryDonutChart(app, containerId, catStats) {
  const el = document.getElementById(containerId);
  if (!el || typeof window.ApexCharts === 'undefined') return;

  if (app.charts[containerId]) {
    try { app.charts[containerId].destroy(); } catch {}
  }

  const labels = Object.keys(catStats || { '공지': 1, '기술': 2, '질문': 1, '자유': 1, '정보': 1 });
  const series = labels.map(k => (catStats ? catStats[k].count : 1));
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

  const options = {
    series: series.length ? series : [1, 2, 1, 1, 1],
    labels: labels.length ? labels : ['공지', '기술', '질문', '자유', '정보'],
    chart: {
      type: 'donut',
      height: 320,
      background: 'transparent'
    },
    colors: ['#ef4444', '#0d6efd', '#ffc107', '#6c757d', '#0dcaf0'],
    legend: {
      position: 'bottom',
      labels: { colors: isDark ? '#f8f9fa' : '#212529' }
    },
    dataLabels: { enabled: true },
    stroke: { colors: [isDark ? '#212529' : '#ffffff'], width: 2 },
    tooltip: { theme: isDark ? 'dark' : 'light' }
  };

  const chart = new window.ApexCharts(el, options);
  chart.render();
  app.charts[containerId] = chart;
}

export function renderSettings(app) {
  const c = app.adminContainer;
  const ct = localStorage.getItem('lte-theme') || 'light';
  c.innerHTML = `
    ${pageHeader('환경 설정', '시스템 운영 및 보안 환경설정', '환경 설정')}
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card card-primary card-outline shadow-sm mb-4">
          <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0 fw-bold"><i class="bi bi-sliders me-2 text-primary"></i>기본 시스템 설정</h5>
            <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
          </div>
          <div class="card-body p-4">
            <form id="settingsForm">
              <div class="mb-4">
                <label class="form-label fw-semibold">플랫폼 명칭</label>
                <input type="text" class="form-control" value="JnewsBoard v4">
                <div class="form-text">헤더 및 사이드바 로고에 표시되는 플랫폼 이름입니다.</div>
              </div>
              <div class="mb-4">
                <label class="form-label fw-semibold">사이트 설명</label>
                <textarea class="form-control" rows="2">AdminLTE 4 기반 모던 커뮤니티 및 관리자 대시보드 플랫폼</textarea>
              </div>
              <hr class="my-4">
              <h6 class="fw-bold mb-3"><i class="bi bi-shield-lock me-2 text-primary"></i>보안 및 접근 정책</h6>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="sett_captcha" checked>
                  <label class="form-check-label fw-medium" for="sett_captcha">회원가입 시 스팸 방지 검증</label>
                </div>
              </div>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="sett_notice">
                  <label class="form-check-label fw-medium" for="sett_notice">신규 글 관리자 사전 검토제</label>
                </div>
              </div>
              <hr class="my-4">
              <h6 class="fw-bold mb-3"><i class="bi bi-bell me-2 text-warning"></i>실시간 알림 수신</h6>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="sett_alert1" checked>
                  <label class="form-check-label fw-medium" for="sett_alert1">신규 댓글 등록 시 실시간 토스트 알림</label>
                </div>
              </div>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="sett_alert2" checked>
                  <label class="form-check-label fw-medium" for="sett_alert2">새 공지사항 등록 시 헤더 배지 업데이트</label>
                </div>
              </div>
              <div class="text-end mt-4">
                <button type="submit" class="btn btn-primary px-4 fw-semibold">
                  <i class="bi bi-check-lg me-1"></i>설정 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-info card-outline shadow-sm mb-4">
          <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-0 fw-bold"><i class="bi bi-palette me-2 text-info"></i>테마 스킨 설정</h6>
            <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
          </div>
          <div class="card-body p-4">
            <div class="d-grid gap-2">
              <button class="btn ${ct === 'light' ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center gap-2" data-bs-theme-value="light"><i class="bi bi-sun-fill"></i>라이트 모드</button>
              <button class="btn ${ct === 'dark' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center gap-2" data-bs-theme-value="dark"><i class="bi bi-moon-stars-fill"></i>다크 모드</button>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-4">
          <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
            <h6 class="card-title mb-0 fw-bold"><i class="bi bi-info-circle me-2 text-primary"></i>시스템 정보</h6>
            <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
          </div>
          <div class="list-group list-group-flush">
            ${[['프레임워크', 'AdminLTE v4.9.1'], ['차트 엔진', 'ApexCharts v3.37'], ['UI 라이브러리', 'Bootstrap 5.3'], ['타이포그래피', 'Source Sans 3'], ['개발 번들러', 'Vite v8.3'], ['서비스 포트', 'Localhost:3000']]
              .map(
                ([k, v]) => `
              <div class="list-group-item d-flex justify-content-between py-2">
                <span class="text-body-secondary small">${k}</span>
                <span class="fw-semibold small">${v}</span>
              </div>`
              )
              .join('')}
          </div>
        </div>

        <div class="card shadow-sm border-danger border-opacity-25">
          <div class="card-header bg-danger-subtle border-bottom py-3">
            <h6 class="card-title mb-0 fw-bold text-danger"><i class="bi bi-exclamation-triangle me-2"></i>데이터 초기화</h6>
          </div>
          <div class="card-body p-4">
            <p class="small text-body-secondary mb-3">모든 게시글 및 회원 데이터를 초기 데모 상태로 리셋합니다.</p>
            <button class="btn btn-outline-danger btn-sm w-100" id="dangerResetBtn">
              <i class="bi bi-arrow-counterclockwise me-1"></i>전체 데이터 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindCardTools();
  app.bindThemeButtons();

  document.getElementById('settingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    showToast('환경 설정이 성공적으로 저장되었습니다! ✅', 'success');
  });

  document.getElementById('dangerResetBtn')?.addEventListener('click', () => {
    if (!confirm('모든 데이터를 초기 상태로 리셋하시겠습니까?')) return;
    app.posts = structuredClone(DEFAULT_POSTS);
    app.members = structuredClone(DEFAULT_MEMBERS);
    app.saveData('jboard_posts', app.posts);
    app.saveData('jboard_members', app.members);
    showToast('데이터가 초기화되었습니다.', 'warning');
    renderSettings(app);
  });
}
