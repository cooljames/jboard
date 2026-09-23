// ═══════════════════════════════════════════════════════════
// Admin Dashboard Overview View
// ═══════════════════════════════════════════════════════════
import { pageHeader, smallBox, bindCardTools } from '../utils/ui-helpers.js';
import { renderAdminPage } from './admin-layout.js';

export function renderDashboard(app) {
  const c = app.adminContainer;
  const tp = app.posts.length;
  const tv = app.posts.reduce((s, p) => s + (p.views || 0), 0);
  const today = app.posts.filter(p => p.createdAt.startsWith('2026-09-22')).length;
  const am = app.members.filter(m => m.status === 'active').length;

  c.innerHTML = `
    ${pageHeader('통합 대시보드', 'J뉴스보드 실시간 운영 지표 및 활동 현황', '대시보드')}
    
    <!-- ═══ AdminLTE v4 Small Boxes Row ═══ -->
    <div class="row g-3 mb-4">
      ${smallBox(tp, '전체 게시글 수', 'primary', 'bi-file-earmark-text-fill', 'board')}
      ${smallBox(today, '오늘 신규 등록글', 'success', 'bi-pencil-square', 'board')}
      ${smallBox(tv.toLocaleString(), '누적 조회수', 'info', 'bi-eye-fill', 'analytics')}
      ${smallBox(app.members.length, `전체 회원 (활성 ${am}명)`, 'warning', 'bi-people-fill', 'members')}
    </div>

    <!-- ═══ Activity Chart & Quick Stats ═══ -->
    <div class="row g-3 mb-4">
      <!-- Interactive Chart Card -->
      <div class="col-lg-8">
        <div class="card card-primary card-outline shadow-sm h-100">
          <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
            <h5 class="card-title mb-0 fw-bold">
              <i class="bi bi-graph-up-arrow me-2 text-primary"></i>주간 게시글 및 조회수 활동 트렌드
            </h5>
            <div class="card-tools d-flex align-items-center gap-1">
              <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse" title="접기/펼치기">
                <i class="bi bi-dash-lg"></i>
              </button>
              <button type="button" class="btn btn-tool" data-lte-toggle="card-remove" title="닫기">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="card-body p-3">
            <div id="dashboardActivityChart" style="min-height: 280px;"></div>
          </div>
        </div>
      </div>

      <!-- Quick Summary / Popular Top 3 Card -->
      <div class="col-lg-4">
        <div class="card card-warning card-outline shadow-sm mb-3">
          <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
            <h6 class="card-title mb-0 fw-bold">
              <i class="bi bi-heart-fill me-2 text-danger"></i>인기 게시글 TOP 3
            </h6>
            <div class="card-tools">
              <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              ${[...app.posts]
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 3)
                .map(
                  (p, i) => `
                <div class="list-group-item d-flex align-items-center gap-3 py-3">
                  <span class="badge bg-${['danger', 'warning', 'secondary'][i]} rounded-pill fs-6">${i + 1}</span>
                  <div class="flex-grow-1 text-truncate">
                    <a href="#" class="fw-semibold small text-truncate d-block text-decoration-none text-body post-title-link" data-id="${p.id}">${p.title}</a>
                    <small class="text-body-secondary"><i class="bi bi-heart-fill text-danger me-1"></i>추천 ${p.likes} · 조회 ${p.views}</small>
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- System Status Box -->
        <div class="card border-0 bg-body shadow-sm p-3 rounded-3 mb-2 d-flex flex-row align-items-center gap-3">
          <div class="rounded-circle bg-success-subtle text-success p-3 fs-4 d-flex align-items-center justify-content-center" style="width:52px;height:52px;">
            <i class="bi bi-shield-check"></i>
          </div>
          <div>
            <div class="fw-bold small">시스템 정상 운영 중</div>
            <small class="text-body-secondary text-xs">포트 3000 / AdminLTE v4 모드</small>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Recent Posts Table Card ═══ -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
        <h5 class="card-title mb-0 fw-bold">
          <i class="bi bi-chat-square-text me-2 text-primary"></i>최근 등록 게시글
        </h5>
        <div class="card-tools d-flex align-items-center gap-2">
          <a href="#" class="btn btn-primary btn-sm px-3" data-admin-page="board">
            전체 보기 <i class="bi bi-arrow-right ms-1"></i>
          </a>
          <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-striped align-middle board-table mb-0">
            <thead>
              <tr>
                <th class="text-center" style="width:60px">번호</th>
                <th style="width:90px">분류</th>
                <th>제목</th>
                <th style="width:140px">작성자</th>
                <th class="text-center" style="width:80px">조회</th>
                <th class="text-center" style="width:80px">추천</th>
                <th class="text-center" style="width:130px">등록일</th>
              </tr>
            </thead>
            <tbody>
              ${app.posts
                .slice(0, 5)
                .map(
                  p => `
                <tr>
                  <td class="text-center text-body-secondary">${p.id}</td>
                  <td><span class="badge ${app.badgeClass(p.category)} badge-category">${p.categoryName}</span></td>
                  <td class="text-truncate" style="max-width:320px">
                    <a href="#" class="post-title-link" data-id="${p.id}">${p.title}</a>
                    ${p.comments?.length ? `<span class="badge bg-secondary-subtle text-secondary ms-1 small">[${p.comments.length}]</span>` : ''}
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img src="${p.authorAvatar}" class="rounded-circle border" width="22" height="22">
                      <span class="small">${p.author}</span>
                    </div>
                  </td>
                  <td class="text-center text-body-secondary small">${p.views}</td>
                  <td class="text-center text-danger small"><i class="bi bi-heart-fill me-1"></i>${p.likes}</td>
                  <td class="text-center text-body-secondary small">${p.createdAt.split(' ')[0]}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindCardTools();
  app.renderActivityChart('dashboardActivityChart');

  // Post detail click handlers
  c.querySelectorAll('.post-title-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.openDetailModal(parseInt(el.getAttribute('data-id')));
    });
  });

  // Admin nav links in cards
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
