// ═══════════════════════════════════════════════════════════
// Admin Board Management & Category CRUD View
// ═══════════════════════════════════════════════════════════
import { pageHeader, smallBox, showToast } from '../utils/ui-helpers.js';
import { renderBoardTable } from '../board/member-view.js';
import { renderAdminPage } from './admin-layout.js';

export function renderBoard(app) {
  const c = app.adminContainer;
  const isPostsTab = app.adminBoardTab !== 'categories';

  c.innerHTML = `
    ${pageHeader('게시판 관리', '게시판(카테고리) CRUD 설정 및 게시글 통합 관리', '게시판 관리')}
    
    <!-- Sub Tabs: Posts vs Categories CRUD -->
    <div class="card shadow-sm border-0 mb-3 bg-body">
      <div class="card-body py-2 px-3">
        <ul class="nav nav-pills gap-2" id="adminBoardSubTabs">
          <li class="nav-item">
            <button class="nav-link ${isPostsTab ? 'active' : ''} btn-sm px-3 fw-semibold" data-subtab="posts">
              <i class="bi bi-file-earmark-text me-1"></i>게시글 목록 (${app.posts.length})
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link ${!isPostsTab ? 'active' : ''} btn-sm px-3 fw-semibold" data-subtab="categories">
              <i class="bi bi-folder-fill me-1"></i>게시판관리(${app.categories.length})
            </button>
          </li>
        </ul>
      </div>
    </div>

    ${isPostsTab ? `
      <!-- Small Boxes -->
      <div class="row g-3 mb-4">
        ${smallBox(app.posts.length, '전체 게시글', 'primary', 'bi-file-text-fill', 'board')}
        ${smallBox(app.posts.filter(p => p.createdAt.startsWith('2026-09-22')).length, '오늘 신규 등록', 'success', 'bi-pencil-square', 'board')}
        ${smallBox(app.posts.reduce((s, p) => s + (p.views || 0), 0).toLocaleString(), '누적 조회수', 'info', 'bi-eye-fill', 'analytics')}
        ${smallBox(app.posts.reduce((s, p) => s + (p.likes || 0), 0).toLocaleString(), '누적 추천수', 'danger', 'bi-heart-fill', 'analytics')}
      </div>

      <div id="adminBoardCard"></div>
    ` : `
      <!-- Categories CRUD Management Card -->
      <div class="card shadow-sm border-0 mb-4 bg-body">
        <div class="card-header bg-body border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h5 class="fw-bold mb-1"><i class="bi bi-folder-check text-primary me-2"></i>게시판(카테고리) 설정 및 관리</h5>
            <p class="text-body-secondary small mb-0">게시판을 신규 생성하거나 기존 게시판의 이름, 슬러그, 테마 색상을 자유롭게 변경·삭제합니다.</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm px-3 shadow-sm d-flex align-items-center gap-1 fw-semibold" id="openAddCategoryBtn">
            <i class="bi bi-plus-circle-fill"></i><span>새 게시판 추가</span>
          </button>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle board-table mb-0">
              <thead>
                <tr>
                  <th style="width: 140px;">아이디 (슬러그)</th>
                  <th style="width: 150px;">게시판 이름</th>
                  <th style="width: 130px;" class="text-center">뱃지 테마</th>
                  <th>설명</th>
                  <th style="width: 110px;" class="text-center">게시글 수</th>
                  <th style="width: 140px;" class="text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                ${app.categories
                  .map(cat => {
                    const postCount = app.posts.filter(p => p.category === cat.id).length;
                    return `
                    <tr>
                      <td><code>${cat.id}</code></td>
                      <td class="fw-bold text-body">${cat.name}</td>
                      <td class="text-center">
                        <span class="badge ${app.badgeClass(cat.id)}">${cat.name}</span>
                      </td>
                      <td class="text-body-secondary small">${cat.description || '-'}</td>
                      <td class="text-center"><span class="badge bg-secondary-subtle text-secondary rounded-pill px-2.5">${postCount}개</span></td>
                      <td class="text-center">
                        <div class="btn-group btn-group-sm">
                          <button type="button" class="btn btn-outline-primary btn-edit-category" data-cat-id="${cat.id}" title="수정">
                            <i class="bi bi-pencil-fill me-1"></i>수정
                          </button>
                          <button type="button" class="btn btn-outline-danger btn-delete-category" data-cat-id="${cat.id}" title="삭제">
                            <i class="bi bi-trash-fill me-1"></i>삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `}
  `;

  // Subtab click handlers
  c.querySelectorAll('#adminBoardSubTabs button[data-subtab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      app.adminBoardTab = btn.getAttribute('data-subtab');
      renderBoard(app);
    });
  });

  if (isPostsTab) {
    renderBoardTable(app, document.getElementById('adminBoardCard'));
  } else {
    // Category CRUD event bindings
    document.getElementById('openAddCategoryBtn')?.addEventListener('click', () => {
      openCategoryModal(app);
    });

    c.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        openCategoryModal(app, catId);
      });
    });

    c.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat-id');
        deleteCategory(app, catId);
      });
    });
  }

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

export function openCategoryModal(app, catId = null) {
  let modalEl = document.getElementById('categoryCrudModal');
  if (!modalEl) {
    const modalHtml = `
    <div class="modal fade" id="categoryCrudModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title fw-bold" id="catModalTitle"><i class="bi bi-folder-plus me-2"></i>게시판 추가</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <form id="categoryCrudForm">
            <div class="modal-body p-4">
              <input type="hidden" id="catIsEdit" value="false" />
              <div class="mb-3">
                <label for="catIdInput" class="form-label small fw-semibold">
                  게시판 아이디 (슬러그) <span class="text-danger">*</span>
                </label>
                <input type="text" id="catIdInput" class="form-control" placeholder="예: free, gallery, review (영문소문자, 숫자)" required />
                <div class="form-text small">시스템 및 URL에서 사용되는 고유 식별자입니다. (영문/숫자)</div>
              </div>

              <div class="mb-3">
                <label for="catNameInput" class="form-label small fw-semibold">
                  게시판 이름 <span class="text-danger">*</span>
                </label>
                <input type="text" id="catNameInput" class="form-control" placeholder="예: 갤러리, 리뷰/후기" required />
              </div>

              <div class="mb-3">
                <label for="catColorSelect" class="form-label small fw-semibold">뱃지 테마 색상</label>
                <select id="catColorSelect" class="form-select">
                  <option value="primary">Primary (파랑)</option>
                  <option value="danger">Danger (빨강)</option>
                  <option value="success">Success (초록)</option>
                  <option value="warning">Warning (노랑)</option>
                  <option value="info">Info (하늘)</option>
                  <option value="secondary">Secondary (회색)</option>
                  <option value="dark">Dark (검정)</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="catDescInput" class="form-label small fw-semibold">게시판 설명</label>
                <input type="text" id="catDescInput" class="form-control" placeholder="게시판에 대한 간단한 설명을 입력하세요" />
              </div>
            </div>
            <div class="modal-footer bg-body-tertiary">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">취소</button>
              <button type="submit" class="btn btn-primary btn-sm px-4 fw-semibold" id="saveCategoryBtn">
                <i class="bi bi-check-lg me-1"></i>저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('categoryCrudModal');
  }

  const titleEl = document.getElementById('catModalTitle');
  const idInput = document.getElementById('catIdInput');
  const nameInput = document.getElementById('catNameInput');
  const colorSelect = document.getElementById('catColorSelect');
  const descInput = document.getElementById('catDescInput');
  const isEditInput = document.getElementById('catIsEdit');

  if (catId) {
    const existing = app.categories.find(c => c.id === catId);
    if (!existing) return;
    titleEl.innerHTML = `<i class="bi bi-pencil-square me-2"></i>게시판 수정`;
    isEditInput.value = 'true';
    idInput.value = existing.id;
    idInput.disabled = true;
    nameInput.value = existing.name;
    colorSelect.value = existing.color || 'primary';
    descInput.value = existing.description || '';
  } else {
    titleEl.innerHTML = `<i class="bi bi-folder-plus me-2"></i>새 게시판 추가`;
    isEditInput.value = 'false';
    idInput.value = '';
    idInput.disabled = false;
    nameInput.value = '';
    colorSelect.value = 'primary';
    descInput.value = '';
  }

  const form = document.getElementById('categoryCrudForm');
  form.onsubmit = (e) => {
    e.preventDefault();
    const id = idInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const name = nameInput.value.trim();
    const color = colorSelect.value;
    const desc = descInput.value.trim();

    if (!id || !name) {
      showToast('아이디와 게시판 이름을 모두 입력해 주세요.', 'warning');
      return;
    }

    if (isEditInput.value === 'true') {
      const idx = app.categories.findIndex(c => c.id === id);
      if (idx !== -1) {
        app.categories[idx] = { ...app.categories[idx], name, color, description: desc };
        app.saveData('jboard_categories', app.categories);
        showToast(`'${name}' 게시판 정보가 수정되었습니다.`, 'success');
      }
    } else {
      if (app.categories.some(c => c.id === id)) {
        showToast(`이미 존재하는 게시판 아이디입니다: ${id}`, 'danger');
        return;
      }
      app.categories.push({ id, name, color, description: desc });
      app.saveData('jboard_categories', app.categories);
      showToast(`'${name}' 게시판이 성공적으로 추가되었습니다!`, 'success');
    }

    window.bootstrap.Modal.getInstance(modalEl)?.hide();
    renderBoard(app);
  };

  const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
  modal.show();
}

export function deleteCategory(app, catId) {
  const cat = app.categories.find(c => c.id === catId);
  if (!cat) return;
  const postCount = app.posts.filter(p => p.category === catId).length;

  let modalEl = document.getElementById('categoryDeleteConfirmModal');
  if (!modalEl) {
    const modalHtml = `
    <div class="modal fade" id="categoryDeleteConfirmModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>게시판 삭제 확인</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4" id="categoryDeleteModalBody">
          </div>
          <div class="modal-footer bg-body-tertiary">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-danger btn-sm px-4 fw-semibold" id="confirmDeleteCategoryBtn">
              <i class="bi bi-trash-fill me-1"></i>삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('categoryDeleteConfirmModal');
  }

  const bodyEl = document.getElementById('categoryDeleteModalBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="text-center mb-3">
        <div class="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle p-3 mb-2" style="width: 60px; height: 60px;">
          <i class="bi bi-trash3 fs-3"></i>
        </div>
        <h5 class="fw-bold mb-1 text-danger">'${cat.name}' 게시판을 삭제하시겠습니까?</h5>
        <p class="text-body-secondary small mb-0">아이디: <code>${cat.id}</code></p>
      </div>
      ${postCount > 0 ? `
        <div class="alert alert-warning d-flex align-items-center small mb-0">
          <i class="bi bi-exclamation-triangle-fill me-2 fs-5 flex-shrink-0"></i>
          <div>
            현재 이 게시판에 등록된 게시글이 <strong>${postCount}개</strong> 있습니다.<br>
            게시판을 삭제해도 작성된 게시글은 유지되나 카테고리 분류가 해제됩니다.
          </div>
        </div>
      ` : `
        <p class="text-center text-body-secondary small mb-0">
          삭제된 게시판 정보는 복구할 수 없습니다. 계속 진행하시겠습니까?
        </p>
      `}
    `;
  }

  const confirmBtn = document.getElementById('confirmDeleteCategoryBtn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      app.categories = app.categories.filter(c => c.id !== catId);
      if (app.boardCategory === catId) {
        app.boardCategory = 'all';
      }
      app.saveData('jboard_categories', app.categories);
      showToast(`'${cat.name}' 게시판이 삭제되었습니다.`, 'info');
      const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) {
        modalInstance.hide();
      }
      renderBoard(app);
    };
  }

  const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
  modal.show();
}
