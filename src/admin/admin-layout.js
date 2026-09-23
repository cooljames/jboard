// ═══════════════════════════════════════════════════════════
// Admin Shell Layout, Navigation & Real-time Notifications
// ═══════════════════════════════════════════════════════════
import { NewsDeskController } from '../news/news-view.js';
import { escapeHtml, parseNotifTime, timeAgo } from '../utils/ui-helpers.js';

export function renderAdmin(app) {
  const user = app.currentUser;
  const tp = app.posts.length;
  const tv = app.posts.reduce((s, p) => s + (p.views || 0), 0);
  const tm = app.members.length;

  app.appRoot.innerHTML = `
  <div class="app-wrapper">
    <!-- ═══ App Header ═══ -->
    <nav class="app-header navbar navbar-expand bg-body shadow-sm px-3 notranslate" translate="no">
      <div class="container-fluid">
        <!-- Start Navbar Links -->
        <ul class="navbar-nav align-items-center">
          <li class="nav-item">
            <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button" title="사이드바 토글">
              <i class="bi bi-list fs-4"></i>
            </a>
          </li>
          <li class="nav-item d-none d-md-block ms-2">
            <a href="#" class="nav-link fw-semibold text-secondary" data-nav="home">
              <i class="bi bi-house me-1"></i>사용자 홈
            </a>
          </li>
          <li class="nav-item d-none d-lg-block">
            <a href="#" class="nav-link text-secondary" id="adminHeaderWriteBtn">
              <i class="bi bi-pencil-square me-1 text-primary"></i>새 글 작성
            </a>
          </li>
        </ul>

        <!-- End Navbar Links -->
        <ul class="navbar-nav ms-auto align-items-center gap-1">
          <!-- Notifications Dropdown -->
          <li class="nav-item dropdown" id="notifDropdownItem">
            <a class="nav-link position-relative py-2 px-2" data-bs-toggle="dropdown" href="#" title="알림 목록" id="notifBellBtn">
              <i class="bi bi-bell fs-5"></i>
              <span class="position-absolute top-1 start-100 translate-middle badge rounded-pill bg-warning text-dark text-xs" id="notifBadge" style="display:none">
                0
              </span>
            </a>
            <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end shadow-sm">
              <span class="dropdown-item dropdown-header fw-bold text-center py-2 bg-body-tertiary" id="notifHeader">
                <i class="bi bi-bell-fill me-1 text-warning"></i> 알림
              </span>
              <div class="dropdown-divider m-0"></div>
              <div id="notifList"></div>
              <div class="dropdown-divider m-0"></div>
              <a href="#" class="dropdown-item dropdown-footer text-center text-primary small py-2 fw-semibold" data-admin-page="dashboard">
                대시보드에서 전체 확인
              </a>
            </div>
          </li>

          <!-- Fullscreen Toggle -->
          <li class="nav-item">
            <a class="nav-link py-2 px-2" href="#" id="fullscreenToggleBtn" role="button" title="전체화면 토글">
              <i class="bi bi-arrows-fullscreen fs-5" id="fullscreenIcon"></i>
            </a>
          </li>

          <!-- Theme Mode Toggle -->
          <li class="nav-item dropdown">
            <button class="btn btn-link nav-link py-2 px-2 dropdown-toggle d-flex align-items-center" data-bs-toggle="dropdown" title="테마 변경">
              <i class="bi bi-circle-half me-1"></i>
              <span class="d-none d-lg-inline small">테마</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="light"><i class="bi bi-sun-fill me-2 text-warning"></i>라이트 모드</button></li>
              <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="dark"><i class="bi bi-moon-stars-fill me-2 text-primary"></i>다크 모드</button></li>
            </ul>
          </li>

          <!-- User Menu Dropdown -->
          <li class="nav-item dropdown user-menu ms-1">
            <a href="#" class="nav-link dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
              <img src="${user.avatar}" class="user-image rounded-circle shadow-sm border" width="32" height="32" alt="${user.name}" />
              <span class="d-none d-md-inline fw-semibold small">${user.name}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end shadow">
              <!-- User Header -->
              <li class="user-header">
                <img src="${user.avatar}" class="rounded-circle shadow mb-2 bg-white" alt="${user.name}" />
                <p>
                  ${user.name} <span class="badge bg-warning text-dark ms-1">Admin</span>
                  <small class="d-block mt-1">${user.email}</small>
                </p>
              </li>
              <!-- User Body -->
              <li class="user-body">
                <div class="row text-center g-0">
                  <div class="col-4 border-end">
                    <a href="#" class="text-decoration-none text-body small d-block" data-admin-page="board">
                      <span class="text-muted text-xs d-block">게시글</span>
                      <strong class="text-primary">${tp}</strong>
                    </a>
                  </div>
                  <div class="col-4 border-end">
                    <a href="#" class="text-decoration-none text-body small d-block" data-admin-page="members">
                      <span class="text-muted text-xs d-block">회원수</span>
                      <strong class="text-success">${tm}</strong>
                    </a>
                  </div>
                  <div class="col-4">
                    <a href="#" class="text-decoration-none text-body small d-block" data-admin-page="analytics">
                      <span class="text-muted text-xs d-block">조회수</span>
                      <strong class="text-info">${tv.toLocaleString()}</strong>
                    </a>
                  </div>
                </div>
              </li>
              <!-- User Footer -->
              <li class="user-footer d-flex justify-content-between align-items-center">
                <button class="btn btn-outline-secondary btn-sm" data-admin-page="settings">
                  <i class="bi bi-gear me-1"></i>환경 설정
                </button>
                <button class="btn btn-outline-danger btn-sm" id="adminLogoutBtn">
                  <i class="bi bi-box-arrow-right me-1"></i>로그아웃
                </button>
              </li>
              <li class="px-3 pb-2">
                <button class="btn btn-link btn-sm text-danger text-decoration-none w-100" id="adminWithdrawBtn">
                  <i class="bi bi-person-x me-1"></i>회원 탈퇴
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </nav>

    <!-- ═══ App Sidebar ═══ -->
    <aside class="app-sidebar bg-body-secondary shadow notranslate" translate="no" data-bs-theme="dark">
      <!-- Sidebar Brand -->
      <div class="sidebar-brand">
        <a href="#" class="brand-link" data-nav="home">
          <i class="bi bi-kanban-fill text-primary fs-3"></i>
          <span class="brand-text fw-light text-white">J뉴스보드 <b class="fw-bold">v4</b></span>
          <span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 ms-1 text-xs">AdminLTE</span>
        </a>
      </div>

      <!-- Sidebar Navigation -->
      <div class="sidebar-wrapper p-2 d-flex flex-column h-100">
        <nav class="mt-2 flex-grow-1" aria-label="사이드바 메뉴">
          <ul class="nav sidebar-menu flex-column" data-lte-toggle="treeview" role="menu">
            ${[
              { page: 'dashboard', icon: 'bi-speedometer2', color: 'info', label: '통합 대시보드' },
              { page: 'news', icon: 'bi-newspaper', color: 'danger', label: '실시간 뉴스/AI', badge: 'AI' },
              { page: 'board', icon: 'bi-chat-square-text', color: 'primary', label: '게시판 관리', badge: 'Hot' },
              { page: 'members', icon: 'bi-people', color: 'success', label: '회원 관리' },
              { page: 'analytics', icon: 'bi-graph-up', color: 'warning', label: '통계 분석' },
              { page: 'settings', icon: 'bi-gear', color: 'secondary', label: '환경 설정' }
            ]
              .map(
                m => `
              <li class="nav-item">
                <a href="#" class="nav-link ${app.adminPage === m.page ? 'active' : ''} rounded-3" data-admin-page="${m.page}">
                  <i class="nav-icon bi ${m.icon} text-${m.color}"></i>
                  <p class="fw-medium mb-0">${m.label}${m.badge ? ` <span class="nav-badge badge bg-danger rounded-pill px-2 py-0">${m.badge}</span>` : ''}<i class="nav-arrow bi bi-chevron-right opacity-50"></i></p>
                </a>
              </li>`
              )
              .join('')}
          </ul>
        </nav>

        <!-- Sidebar Bottom CTA -->
        <div class="p-3 mt-auto border-top border-secondary border-opacity-25">
          <button class="btn btn-sm btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2" data-nav="home">
            <i class="bi bi-box-arrow-up-right"></i>
            <span>사용자 화면 이동</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- ═══ App Main ═══ -->
    <main class="app-main">
      <div id="pageContainer" class="p-4"></div>
    </main>

    <!-- ═══ App Footer ═══ -->
    <footer class="app-footer text-muted py-3 px-4 bg-body border-top notranslate" translate="no">
      <div class="float-end d-none d-sm-inline"><b>AdminLTE</b> 4.9.1 Official Theme</div>
      <strong>© 2026 <a href="#" class="text-decoration-none">J뉴스보드</a>.</strong> All rights reserved.
    </footer>
  </div>`;

  // Bind admin header & nav
  app.bindNavLinks();
  app.bindThemeButtons();
  document.getElementById('adminLogoutBtn')?.addEventListener('click', () => app.logout());
  document.getElementById('adminWithdrawBtn')?.addEventListener('click', () => app.openWithdrawModal());

  refreshNotifications(app);
  document.getElementById('notifDropdownItem')?.addEventListener('shown.bs.dropdown', () => {
    setTimeout(() => markNotificationsSeen(app), 800);
  });

  // Sidebar toggle
  document.querySelectorAll('[data-lte-toggle="sidebar"]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      document.body.classList.toggle('sidebar-collapse');
    });
  });

  // Fullscreen toggle
  document.getElementById('fullscreenToggleBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const icon = document.getElementById('fullscreenIcon');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      if (icon) icon.className = 'bi bi-fullscreen-exit fs-5';
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      if (icon) icon.className = 'bi bi-arrows-fullscreen fs-5';
    }
  });

  // Header Quick Write button
  document.getElementById('adminHeaderWriteBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    app.openPostWriteModal();
  });

  // Sidebar menu navigation
  document.querySelectorAll('[data-admin-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.adminPage = el.getAttribute('data-admin-page');
      document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector(`[data-admin-page="${app.adminPage}"]`)?.classList.add('active');
      renderAdminPage(app);
    });
  });

  renderAdminPage(app);
}

export function renderAdminPage(app) {
  const pages = {
    dashboard: () => app.renderDashboard(),
    news: () => renderNewsDesk(app),
    board: () => app.renderBoard(),
    members: () => app.renderMembers(),
    analytics: () => app.renderAnalytics(),
    settings: () => app.renderSettings()
  };
  (pages[app.adminPage] || pages.dashboard)();
}

export function renderNewsDesk(app) {
  const container = document.getElementById('pageContainer');
  if (!container) return;
  app.newsController = new NewsDeskController(app, container);
}

export function buildNotifications(app) {
  const items = [];
  [...app.posts]
    .sort((a, b) => parseNotifTime(b.createdAt) - parseNotifTime(a.createdAt))
    .slice(0, 4)
    .forEach(p => items.push({
      icon: 'bi-file-earmark-text-fill text-primary',
      title: '신규 게시글',
      desc: p.title,
      ts: parseNotifTime(p.createdAt),
      page: 'board'
    }));

  [...app.members]
    .sort((a, b) => parseNotifTime(b.joinedAt) - parseNotifTime(a.joinedAt))
    .slice(0, 2)
    .forEach(m => items.push({
      icon: 'bi-person-check-fill text-success',
      title: '신규 회원 가입',
      desc: `${m.name}님이 가입했습니다.`,
      ts: parseNotifTime(m.joinedAt) || Date.now(),
      page: 'members'
    }));

  const comments = [];
  app.posts.forEach(p => (p.comments || []).forEach(c => comments.push({ post: p, c })));
  comments
    .sort((a, b) => parseNotifTime(b.c.date) - parseNotifTime(a.c.date))
    .slice(0, 2)
    .forEach(({ c }) => items.push({
      icon: 'bi-chat-dots-fill text-info',
      title: '신규 댓글',
      desc: `${c.author}: ${c.content}`.substring(0, 60),
      ts: parseNotifTime(c.date),
      page: 'board'
    }));

  return items.filter(n => n.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, 6);
}

export function refreshNotifications(app) {
  const listEl = document.getElementById('notifList');
  const badgeEl = document.getElementById('notifBadge');
  const headerEl = document.getElementById('notifHeader');
  if (!listEl || !badgeEl) return;
  const items = buildNotifications(app);
  const seen = app.loadData('jboard_notif_seen', 0);
  const unread = items.filter(n => n.ts > seen).length;
  badgeEl.textContent = unread;
  badgeEl.style.display = unread > 0 ? '' : 'none';
  if (headerEl) headerEl.innerHTML = `<i class="bi bi-bell-fill me-1 text-warning"></i> 알림 ${items.length}건`;
  listEl.innerHTML = items.length
    ? items.map(n => `
      <a href="#" class="dropdown-item d-flex align-items-center gap-3 py-2" data-admin-page="${n.page}">
        <i class="bi ${n.icon} fs-5"></i>
        <div class="flex-grow-1 text-truncate">
          <div class="small fw-semibold">${n.title}${n.ts > seen ? ' <span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem">NEW</span>' : ''}</div>
          <small class="text-body-secondary text-xs">${escapeHtml(n.desc)}</small>
        </div>
        <small class="text-body-secondary text-xs text-nowrap">${timeAgo(n.ts)}</small>
      </a>`).join('<div class="dropdown-divider m-0"></div>')
    : '<div class="dropdown-item text-center text-body-secondary small py-3">새 알림이 없습니다.</div>';

  listEl.querySelectorAll('[data-admin-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.adminPage = el.getAttribute('data-admin-page');
      renderAdminPage(app);
    });
  });
}

export function markNotificationsSeen(app) {
  app.saveData('jboard_notif_seen', Date.now());
  refreshNotifications(app);
}
