// ═══════════════════════════════════════════════════════════
// UI Helpers, Formatters & DOM Utilities
// ═══════════════════════════════════════════════════════════

export function showToast(msg, type = 'primary') {
  const ct = document.getElementById('toastContainer');
  if (!ct) return;
  const id = 't_' + Date.now();
  const safeMsg = escapeHtml(msg);
  ct.insertAdjacentHTML(
    'beforeend',
    `<div id="${id}" class="toast align-items-center text-bg-${type} border-0 shadow" role="alert">
      <div class="d-flex">
        <div class="toast-body"><i class="bi bi-info-circle-fill me-2"></i>${safeMsg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`
  );
  const el = document.getElementById(id);
  const toast = new window.bootstrap.Toast(el, { delay: 3000 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// 본문 빈줄 정규화: 빈 문단을 표준형으로 통일 후 연속 빈줄을 1개로 압축
// (이전에 저장된 글의 2줄 띄움도 보기·저장 시점에 교정)
export function normalizeBlankLines(html) {
  if (!html) return '';
  return String(html)
    .replace(/<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '<p><br></p>')
    .replace(/(<p><br><\/p>)(\s*<p><br><\/p>)+/gi, '<p><br></p>');
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 브라우저 로컬 시간대 기준 'YYYY-MM-DD HH:mm' 포맷
export function formatLocalTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (!input || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseNotifTime(str) {
  if (!str) return 0;
  const s = String(str).includes('T') ? String(str) : String(str).replace(' ', 'T');
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 0) return '방금 전';
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export function badgeClass(cat, categories = []) {
  const found = categories?.find(c => c.id === cat);
  if (found) {
    if (found.color === 'danger') return 'bg-danger text-white';
    if (found.color === 'primary') return 'bg-primary text-white';
    if (found.color === 'warning') return 'bg-warning text-dark';
    if (found.color === 'secondary') return 'bg-secondary text-white';
    if (found.color === 'info') return 'bg-info text-dark';
    if (found.color === 'success') return 'bg-success text-white';
    if (found.color === 'dark') return 'bg-dark text-white';
    return `bg-${found.color} text-white`;
  }
  return {
    notice: 'bg-danger text-white',
    tech: 'bg-primary text-white',
    qna: 'bg-warning text-dark',
    free: 'bg-secondary text-white',
    info: 'bg-info text-dark'
  }[cat] || 'bg-light text-dark';
}

export function pageHeader(title, sub, bread) {
  return `
  <div class="app-content-header mb-4">
    <div class="container-fluid p-0">
      <div class="row align-items-center">
        <div class="col-sm-6">
          <h2 class="mb-1 fw-bold fs-4">${title}</h2>
          <p class="text-body-secondary small mb-0">${sub}</p>
        </div>
        <div class="col-sm-6 text-sm-end mt-2 mt-sm-0">
          <ol class="breadcrumb float-sm-end mb-0">
            <li class="breadcrumb-item"><a href="#" data-admin-page="dashboard" class="text-decoration-none">Admin</a></li>
            <li class="breadcrumb-item active" aria-current="page">${bread}</li>
          </ol>
        </div>
      </div>
    </div>
  </div>`;
}

// Official AdminLTE v4 Small-Box Widget
export function smallBox(val, label, color, icon, targetPage, footerText = '자세히 보기') {
  return `
  <div class="col-12 col-sm-6 col-xl-3">
    <div class="small-box text-bg-${color}">
      <div class="inner">
        <h3>${val}</h3>
        <p>${label}</p>
      </div>
      <i class="small-box-icon bi ${icon}"></i>
      <a href="#" class="small-box-footer" data-admin-page="${targetPage}">
        ${footerText} <i class="bi bi-arrow-right-circle ms-1"></i>
      </a>
    </div>
  </div>`;
}

export function bindCardTools() {
  document.querySelectorAll('[data-lte-toggle="card-collapse"]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const card = btn.closest('.card');
      if (!card) return;
      const body = card.querySelector('.card-body');
      const footer = card.querySelector('.card-footer');
      const icon = btn.querySelector('i');
      const isHidden = body?.classList.contains('d-none');
      if (isHidden) {
        body?.classList.remove('d-none');
        footer?.classList.remove('d-none');
        if (icon) icon.className = 'bi bi-dash-lg';
      } else {
        body?.classList.add('d-none');
        footer?.classList.add('d-none');
        if (icon) icon.className = 'bi bi-plus-lg';
      }
    };
  });

  document.querySelectorAll('[data-lte-toggle="card-remove"]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const card = btn.closest('.card');
      if (card) {
        card.style.transition = 'opacity 0.25s, transform 0.25s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
      }
    };
  });
}
