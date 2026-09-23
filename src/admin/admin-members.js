// ═══════════════════════════════════════════════════════════
// Admin Members Management View
// ═══════════════════════════════════════════════════════════
import { pageHeader, smallBox, showToast, bindCardTools } from '../utils/ui-helpers.js';
import { renderAdminPage } from './admin-layout.js';

export function renderMembers(app) {
  const c = app.adminContainer;
  const rl = { admin: '관리자', editor: '에디터', member: '일반회원' };
  const rb = { admin: 'bg-danger', editor: 'bg-primary', member: 'bg-secondary' };
  const sl = { active: '활성', inactive: '비활성', banned: '정지' };
  const sb = { active: 'bg-success', inactive: 'bg-warning text-dark', banned: 'bg-danger' };

  c.innerHTML = `
    ${pageHeader('회원 관리', '전체 회원 현황 및 권한 제어', '회원 관리')}
    
    <!-- Small Boxes -->
    <div class="row g-3 mb-4">
      ${smallBox(app.members.length, '전체 등록 회원', 'primary', 'bi-people-fill', 'members')}
      ${smallBox(app.members.filter(m => m.status === 'active').length, '현재 활동 회원', 'success', 'bi-person-check-fill', 'members')}
      ${smallBox(app.members.filter(m => m.status === 'inactive').length, '미접속 회원', 'warning', 'bi-person-dash-fill', 'members')}
      ${smallBox(app.members.filter(m => m.status === 'banned').length, '정지/제재 회원', 'danger', 'bi-person-x-fill', 'members')}
    </div>

    <!-- Member Table Card -->
    <div class="card shadow-sm border-0">
      <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0 fw-bold">
          <i class="bi bi-people me-2 text-success"></i>회원 목록 (${app.members.length}명)
        </h5>
        <div class="card-tools d-flex align-items-center gap-1">
          <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-striped align-middle board-table mb-0">
            <thead>
              <tr>
                <th class="text-center" style="width:60px">ID</th>
                <th>회원 정보</th>
                <th style="width:180px">이메일</th>
                <th class="text-center" style="width:100px">역할</th>
                <th class="text-center" style="width:90px">상태</th>
                <th class="text-center" style="width:80px">게시글</th>
                <th class="text-center" style="width:140px">최근 접속</th>
                <th class="text-center" style="width:90px">관리</th>
              </tr>
            </thead>
            <tbody>
              ${app.members
                .map(
                  m => `
                <tr>
                  <td class="text-center text-body-secondary">${m.id}</td>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img src="${m.avatar}" class="rounded-circle border" width="32" height="32">
                      <div>
                        <div class="fw-medium">${m.name}</div>
                        <small class="text-body-secondary">${m.joinedAt}</small>
                      </div>
                    </div>
                  </td>
                  <td class="small">${m.email}</td>
                  <td class="text-center"><span class="badge ${rb[m.role]} rounded-pill">${rl[m.role]}</span></td>
                  <td class="text-center"><span class="badge ${sb[m.status]} rounded-pill">${sl[m.status]}</span></td>
                  <td class="text-center fw-semibold">${m.posts}</td>
                  <td class="text-center text-body-secondary small">${m.lastLogin}</td>
                  <td class="text-center">
                    <button class="btn btn-outline-danger btn-sm btn-mdel py-0 px-2" data-id="${m.id}" title="회원 삭제">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer bg-body border-top py-3 text-body-secondary small">
        총 ${app.members.length}명의 회원이 등록되어 있습니다.
      </div>
    </div>
  `;

  bindCardTools();

  c.querySelectorAll('.btn-mdel').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = parseInt(el.getAttribute('data-id'));
      if (!confirm('정말 이 회원을 삭제하시겠습니까?')) return;
      app.members = app.members.filter(m => m.id !== id);
      app.saveData('jboard_members', app.members);
      renderMembers(app);
      showToast('회원이 삭제되었습니다.', 'warning');
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
