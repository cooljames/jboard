// ═══════════════════════════════════════════════════════════
// Member Board View & Shared Board Table Component
// ═══════════════════════════════════════════════════════════
import { NewsDeskController } from '../news/news-view.js';

export function renderMemberBoard(app) {
  if (!app.memberTab) app.memberTab = 'news';
  const isNews = app.memberTab === 'news';

  app.appRoot.innerHTML = `
  <!-- ═══ Member Navbar ═══ -->
  <nav class="pub-navbar notranslate" translate="no">
    <div class="container-fluid px-2 px-md-3 px-xl-4">
      <div class="d-flex align-items-center justify-content-between py-2">
        <div class="d-flex align-items-center gap-3">
          <a href="#" class="d-flex align-items-center gap-2 text-decoration-none" data-nav="home">
            <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
            <span class="fw-bold fs-5 text-body">JnewsBoard</span>
          </a>
          <!-- Tab switcher: 실시간 뉴스를 게시판 메뉴 앞에 배치 -->
          <div class="btn-group p-1 bg-body-tertiary rounded-pill border ms-1" role="group">
            <button type="button" class="btn btn-sm ${isNews ? 'btn-primary' : 'btn-light border-0'} rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 shadow-none" id="memberTabNewsBtn">
              <i class="bi bi-newspaper"></i><span>실시간 뉴스</span>
              <span class="badge ${isNews ? 'bg-danger text-white' : 'bg-danger-subtle text-danger'} rounded-pill px-1.5 py-0 text-xs">AI</span>
            </button>
            <button type="button" class="btn btn-sm ${!isNews ? 'btn-primary' : 'btn-light border-0'} rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 shadow-none" id="memberTabBoardBtn">
              <i class="bi bi-chat-square-text-fill"></i><span>커뮤니티 게시판</span>
            </button>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <!-- Theme dropdown -->
          <div class="dropdown me-1">
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1 dropdown-toggle d-flex align-items-center gap-1" data-bs-toggle="dropdown" title="테마 변경">
              <i class="bi bi-circle-half"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="light"><i class="bi bi-sun-fill me-2 text-warning"></i>라이트</button></li>
              <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="dark"><i class="bi bi-moon-stars-fill me-2 text-primary"></i>다크</button></li>
            </ul>
          </div>

          <!-- Member info & Logout -->
          <div class="d-flex align-items-center gap-2 ms-2">
            <div class="dropdown">
              <a href="#" data-bs-toggle="dropdown" aria-expanded="false" title="프로필 메뉴">
                <img src="${app.currentUser.avatar}" class="rounded-circle border" width="30" height="30" role="button">
              </a>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li class="dropdown-header small">${app.currentUser.name}<br><span class="text-body-secondary">${app.currentUser.email}</span></li>
                <li><hr class="dropdown-divider"></li>
                <li><button type="button" class="dropdown-item text-danger small" id="memberWithdrawBtn"><i class="bi bi-person-x me-2"></i>회원 탈퇴</button></li>
              </ul>
            </div>
            <div class="d-none d-md-block text-start">
              <div class="small fw-bold text-body">${app.currentUser.name}</div>
            </div>
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 ms-1" id="memberLogoutBtn">
              <i class="bi bi-box-arrow-right me-1"></i>로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- ═══ Member Main Content ═══ -->
  <main class="pub-main-container">
    <div class="container-fluid px-2 px-md-3 px-xl-4">
      ${isNews ? `
        <!-- 1. Real-time News & AI Desk -->
        <div id="memberNewsContainer"></div>
      ` : `
        <!-- 2. Community Board (Header removed as requested) -->
        <div id="homeBoardContainer"></div>
      `}
    </div>
  </main>

  <!-- ═══ Clean Modern Footer ═══ -->
  <footer class="pub-footer bg-body border-top py-4 mt-4 notranslate" translate="no">
    <div class="container-fluid px-2 px-md-3 px-xl-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-kanban-fill fs-5" style="color:var(--jb-primary)"></i>
          <span class="fw-bold">JnewsBoard</span>
          <span class="text-body-secondary small ms-2">© 2026 JnewsBoard</span>
        </div>
        <div class="d-flex align-items-center gap-3 small text-body-secondary">
          <span>로그인: <strong>${app.currentUser.name}</strong></span>
          <span>포트 3000 서비스 중</span>
        </div>
      </div>
    </div>
  </footer>
  `;

  app.bindNavLinks();
  app.bindThemeButtons();
  document.getElementById('memberLogoutBtn')?.addEventListener('click', () => app.logout());
  document.getElementById('memberWithdrawBtn')?.addEventListener('click', () => app.openWithdrawModal());

  // Tab switcher events
  document.getElementById('memberTabNewsBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    app.memberTab = 'news';
    app.renderMemberBoard();
  });
  document.getElementById('memberTabBoardBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    app.memberTab = 'board';
    app.renderMemberBoard();
  });

  if (isNews) {
    const container = document.getElementById('memberNewsContainer');
    if (container) {
      app.newsController = new NewsDeskController(app, container);
    }
  } else {
    renderBoardTable(app, document.getElementById('homeBoardContainer'));
  }
}

export function renderBoardTable(app, container) {
  if (!container) return;
  const filtered = app.posts.filter(p => {
    const mc = app.boardCategory === 'all' || p.category === app.boardCategory;
    const ms = !app.boardSearch ||
      p.title.toLowerCase().includes(app.boardSearch) ||
      p.content.toLowerCase().includes(app.boardSearch) ||
      p.author.toLowerCase().includes(app.boardSearch);
    return mc && ms;
  });

  const totalPosts = filtered.length;
  const pageSize = app.boardPageSize || 10;
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  if (app.boardPage > totalPages) app.boardPage = totalPages;
  if (app.boardPage < 1) app.boardPage = 1;
  const startIndex = (app.boardPage - 1) * pageSize;
  const pagePosts = filtered.slice(startIndex, startIndex + pageSize);

  container.innerHTML = `
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-body border-bottom py-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <ul class="nav board-cat-nav" id="catTabs">
            <li class="nav-item">
              <a class="nav-link ${app.boardCategory === 'all' ? 'active' : ''}" href="#" data-category="all">전체보기</a>
            </li>
            ${(app.categories || []).map(c => `
              <li class="nav-item">
                <a class="nav-link ${c.id === app.boardCategory ? 'active' : ''}" href="#" data-category="${c.id}">${c.name}</a>
              </li>
            `).join('')}
          </ul>
          <div class="d-flex align-items-center gap-2">
            <form id="searchForm" class="d-flex align-items-center">
              <div class="input-group input-group-sm" style="width: 220px;">
                <input type="text" id="searchInput" class="form-control" placeholder="검색..." value="${app.boardSearch}">
                <button class="btn btn-outline-secondary" type="submit"><i class="bi bi-search"></i></button>
              </div>
            </form>
            <button type="button" class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm px-3" id="openWriteModalBtn">
              <i class="bi bi-pencil-fill"></i><span>새 글</span>
            </button>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle board-table mb-0">
            <thead>
              <tr>
                <th style="width:65px" class="text-center">번호</th>
                <th style="width:85px" class="text-center">분류</th>
                <th>제목</th>
                <th style="width:160px">작성자</th>
                <th style="width:140px" class="text-center">작성일</th>
                <th style="width:85px" class="text-center">조회</th>
                <th style="width:105px" class="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              ${!pagePosts.length ? `
                <tr>
                  <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>게시글이 없습니다.
                  </td>
                </tr>` : pagePosts.map(p => `
                <tr class="${p.isNotice ? 'table-warning-subtle' : ''}">
                  <td class="text-center text-muted">${p.id}</td>
                  <td class="text-center"><span class="badge ${app.badgeClass(p.category)} badge-category">${p.categoryName || app.getCategoryName(p.category)}</span></td>
                  <td>
                    <a href="#" class="post-title-link" data-id="${p.id}">
                      ${p.title}
                      ${p.comments?.length ? `<span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill ms-1">[${p.comments.length}]</span>` : ''}
                      ${p.attachments?.length ? `<span class="badge bg-info-subtle text-info-emphasis rounded-pill ms-1" title="첨부파일 ${p.attachments.length}개"><i class="bi bi-paperclip me-1"></i>${p.attachments.length}</span>` : ''}
                    </a>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img src="${p.authorAvatar}" class="rounded-circle border" width="24" height="24">
                      <span>${p.author}</span>
                    </div>
                  </td>
                  <td class="text-center text-muted small">${p.createdAt}</td>
                  <td class="text-center"><i class="bi bi-eye text-muted me-1"></i>${p.views}</td>
                  <td class="text-center">
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary btn-view" data-id="${p.id}" title="상세보기"><i class="bi bi-eye"></i></button>
                      ${(app.currentUser && (p.author === app.currentUser.name || app.currentUser.role === 'admin')) ? `<button class="btn btn-outline-danger btn-delete" data-id="${p.id}" title="삭제"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer bg-body border-top py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="text-muted small">
          총 <strong>${totalPosts}</strong>건 중 <strong>${totalPosts ? startIndex + 1 : 0}-${Math.min(startIndex + pageSize, totalPosts)}</strong>건 표시
        </span>
        ${totalPages > 1 ? `
        <nav aria-label="게시판 페이지 네비게이션">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item ${app.boardPage === 1 ? 'disabled' : ''}">
              <a class="page-link board-page-link" href="#" data-page="${app.boardPage - 1}">이전</a>
            </li>
            ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
              <li class="page-item ${app.boardPage === p ? 'active' : ''}">
                <a class="page-link board-page-link" href="#" data-page="${p}">${p}</a>
              </li>
            `).join('')}
            <li class="page-item ${app.boardPage === totalPages ? 'disabled' : ''}">
              <a class="page-link board-page-link" href="#" data-page="${app.boardPage + 1}">다음</a>
            </li>
          </ul>
        </nav>
        ` : ''}
      </div>
    </div>
  `;

  // Filter click
  container.querySelector('#catTabs')?.addEventListener('click', e => {
    const t = e.target.closest('[data-category]');
    if (!t) return;
    e.preventDefault();
    app.boardCategory = t.getAttribute('data-category');
    app.boardPage = 1;
    app.refreshCurrentBoard();
  });

  // Search
  container.querySelector('#searchForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const val = container.querySelector('#searchInput').value.trim().toLowerCase();
    app.boardSearch = val;
    app.boardPage = 1;
    app.refreshCurrentBoard();
  });

  container.querySelector('#searchInput')?.addEventListener('input', e => {
    if (!e.target.value) {
      app.boardSearch = '';
      app.boardPage = 1;
      app.refreshCurrentBoard();
    }
  });

  // Pagination
  container.querySelectorAll('.board-page-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const p = parseInt(link.getAttribute('data-page'));
      if (p >= 1 && p <= totalPages && p !== app.boardPage) {
        app.boardPage = p;
        app.refreshCurrentBoard();
      }
    });
  });

  // Write button
  container.querySelector('#openWriteModalBtn')?.addEventListener('click', () => {
    app.openPostWriteModal();
  });

  // Post detail & delete
  container.querySelectorAll('.post-title-link, .btn-view').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.openDetailModal(parseInt(el.getAttribute('data-id')));
    });
  });

  container.querySelectorAll('.btn-delete').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      app.deletePost(parseInt(el.getAttribute('data-id')));
    });
  });
}

export function refreshCurrentBoard(app) {
  if (app.currentPage === 'home') {
    const el = document.getElementById('homeBoardContainer');
    if (el) renderBoardTable(app, el);
  } else if (app.currentPage === 'admin' && app.adminPage === 'board') {
    const el = document.getElementById('adminBoardCard');
    if (el) renderBoardTable(app, el);
    else app.renderBoard();
  }
}
