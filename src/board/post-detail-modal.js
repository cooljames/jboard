// ═══════════════════════════════════════════════════════════
// Post Detail Modal, Comments & Delete Handler
// ═══════════════════════════════════════════════════════════
import { api } from '../api.js';
import { showToast, escapeHtml, formatFileSize, formatLocalTime, normalizeBlankLines } from '../utils/ui-helpers.js';

// 간이 HTML 소독: <script>, on* 이벤트 핸들러, javascript: 프로토콜 제거
function sanitizeHtml(html) {
  if (!html) return '';
  return String(html)
    // <script>...</script> 제거
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // <script ... /> 자체 닫기 태그 제거
    .replace(/<script[^>]*\/>/gi, '')
    // on* 이벤트 속성 제거 (onerror, onclick, onload 등)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // javascript: 프로토콜 href/src 무력화
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:/gi, '$1=$2#blocked:');
}

// URL 프로토콜 화이트리스트 검증
function sanitizeUrl(url) {
  if (!url) return '#';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '#blocked';
}

export async function openDetailModal(app, id) {
  let p = app.posts.find(x => x.id === id);
  try {
    const res = await api.getPost(id);
    if (res.post) {
      if (!p) {
        const sp = res.post;
        p = {
          id: sp.id,
          category: sp.category,
          categoryName: app.getCategoryName(sp.category),
          title: sp.title,
          author: sp.author,
          authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sp.author || 'user')}`,
          content: sp.content || '',
          views: sp.views || 0,
          likes: sp.likes || 0,
          comments: [],
          attachments: typeof sp.attachments === 'string' ? JSON.parse(sp.attachments || '[]') : (sp.attachments || []),
          createdAt: formatLocalTime(sp.created_at),
          isNotice: (sp.title || '').includes('📢')
        };
        app.posts.unshift(p);
      } else {
        p.views = res.post.views;
        p.likes = res.post.likes;
        if (res.post.content) p.content = res.post.content;
        if (res.post.category) {
          p.category = res.post.category;
          p.categoryName = p.categoryName || app.getCategoryName(res.post.category);
        }
        if (!p.authorAvatar) {
          p.authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.author || 'user')}`;
        }
      }
      p.comments = (res.comments || []).map(c => ({
        author: c.author,
        date: formatLocalTime(c.created_at),
        content: c.content
      }));
      if (res.post.attachments) {
        p.attachments = typeof res.post.attachments === 'string' ? JSON.parse(res.post.attachments || '[]') : (res.post.attachments || []);
      }
    }
  } catch {
    if (p) p.views = (p.views || 0) + 1;
  }

  if (!p) {
    showToast('게시글을 찾을 수 없습니다.', 'danger');
    return;
  }

  app.saveData('jboard_posts', app.posts);
  app.refreshCurrentBoard();

  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailMeta').innerHTML = `
    <div class="d-flex align-items-center gap-3 text-muted small">
      <span class="d-flex align-items-center gap-1">
        <img src="${p.authorAvatar}" width="22" height="22" class="rounded-circle border">
        <strong class="text-body">${escapeHtml(p.author)}</strong>
      </span>
      <span><i class="bi bi-calendar3 me-1"></i>${p.createdAt}</span>
      <span><i class="bi bi-eye me-1"></i>${p.views}</span>
      <span><i class="bi bi-heart me-1 text-danger"></i>${p.likes}</span>
    </div>
  `;

  // Render Rich Content (sanitize 후 빈줄 정규화)
  const isHtml = p.content.includes('<p>') || p.content.includes('<div>') || p.content.includes('<img');
  const sanitized = isHtml ? sanitizeHtml(normalizeBlankLines(p.content)) : escapeHtml(p.content).replace(/\n/g, '<br>');
  document.getElementById('detailContent').innerHTML = sanitized;

  // Attachments display
  const attachContainer = document.getElementById('detailAttachmentsContainer');
  const attachList = document.getElementById('detailAttachmentsList');
  const attachCount = document.getElementById('detailAttachmentsCount');

  const attachments = Array.isArray(p.attachments) ? p.attachments : (typeof p.attachments === 'string' ? JSON.parse(p.attachments || '[]') : []);

  if (attachments && attachments.length > 0) {
    attachContainer.classList.remove('d-none');
    attachCount.textContent = attachments.length;
    attachList.innerHTML = attachments.map(att => {
      let icon = 'bi-file-earmark';
      if (att.type?.startsWith('image/')) icon = 'bi-file-earmark-image text-primary';
      else if (att.type?.includes('pdf')) icon = 'bi-file-earmark-pdf text-danger';
      else if (att.type?.includes('zip')) icon = 'bi-file-earmark-zip text-warning';

      const formattedSize = formatFileSize(att.size);
      const safeUrl = sanitizeUrl(att.url);
      return `
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" download="${escapeHtml(att.name)}" class="detail-attachment-badge" title="다운로드/열기">
          <i class="bi ${icon}"></i>
          <span>${escapeHtml(att.name)}</span>
          <span class="badge bg-secondary-subtle text-secondary small">${formattedSize}</span>
          <i class="bi bi-download ms-1 opacity-75"></i>
        </a>
      `;
    }).join('');
  } else {
    attachContainer.classList.add('d-none');
  }

  // 비로그인 열람 모드: 추천·댓글 작성 불가, 읽기만 가능
  const detailLikeBtn = document.getElementById('detailLikeBtn');
  const commentAddForm = document.getElementById('commentAddForm');
  let guestCommentPrompt = document.getElementById('guestCommentPrompt');
  if (!app.currentUser) {
    detailLikeBtn.style.display = 'none';
    commentAddForm.style.display = 'none';
    if (!guestCommentPrompt) {
      guestCommentPrompt = document.createElement('div');
      guestCommentPrompt.id = 'guestCommentPrompt';
      guestCommentPrompt.className = 'small text-body-secondary py-2';
      guestCommentPrompt.innerHTML = '댓글 작성과 추천은 <a href="#" id="guestLoginLink">로그인</a> 후 이용할 수 있습니다.';
      commentAddForm.parentNode.insertBefore(guestCommentPrompt, commentAddForm);
    } else {
      guestCommentPrompt.style.display = '';
    }
    document.getElementById('guestLoginLink')?.addEventListener('click', e => {
      e.preventDefault();
      (window.bootstrap.Modal.getInstance(document.getElementById('postDetailModal')))?.hide();
      app.navigate('login');
    });
  } else {
    detailLikeBtn.style.display = '';
    commentAddForm.style.display = '';
    if (guestCommentPrompt) guestCommentPrompt.style.display = 'none';
  }

  document.getElementById('detailLikeBtn').onclick = async () => {
    if (!app.currentUser) {
      showToast('로그인이 필요합니다.', 'info');
      app.navigate('login');
      return;
    }
    try { await api.likePost(id); } catch {}
    p.likes++;
    app.saveData('jboard_posts', app.posts);
    app.refreshCurrentBoard();
    openDetailModal(app, id);
    showToast('추천! ❤️');
  };

  const comments = p.comments || [];
  document.getElementById('detailCommentCount').textContent = `댓글 (${comments.length})`;
  document.getElementById('commentsList').innerHTML = !comments.length
    ? '<p class="text-muted small my-2">첫 댓글을 남겨보세요!</p>'
    : comments.map(c => `
      <div class="border-bottom py-2">
        <div class="d-flex justify-content-between text-muted small mb-1">
          <strong>${escapeHtml(c.author)}</strong>
          <span>${c.date}</span>
        </div>
        <div class="small">${escapeHtml(c.content)}</div>
      </div>
    `).join('');

  document.getElementById('commentAddForm').onsubmit = async (e) => {
    e.preventDefault();
    const a = app.currentUser
      ? app.currentUser.name
      : (document.getElementById('commentAuthor').value.trim() || '익명');
    const t = document.getElementById('commentText').value.trim();
    if (!t) return;
    try {
      await api.addComment({ post_id: id, author: a, author_email: '', content: t });
    } catch {}
    p.comments.push({ author: a, date: formatLocalTime(new Date()), content: t });
    app.saveData('jboard_posts', app.posts);
    document.getElementById('commentText').value = '';
    app.refreshCurrentBoard();
    app.refreshNotifications();
    openDetailModal(app, id);
    showToast('댓글이 등록되었습니다.');
  };

  // 댓글 작성자: 로그인 시 닉네임 고정(읽기전용), 게스트는 직접 입력
  const commentAuthorInput = document.getElementById('commentAuthor');
  if (commentAuthorInput) {
    if (app.currentUser) {
      commentAuthorInput.value = app.currentUser.name;
      commentAuthorInput.setAttribute('readonly', 'readonly');
      commentAuthorInput.classList.add('bg-body-secondary');
    } else {
      commentAuthorInput.value = '사용자';
      commentAuthorInput.removeAttribute('readonly');
      commentAuthorInput.classList.remove('bg-body-secondary');
    }
  }

  const el = document.getElementById('postDetailModal');
  const isOwner = app.currentUser && (p.author === app.currentUser.name || app.currentUser.role === 'admin');
  const ownerActions = document.getElementById('detailOwnerActions');
  if (ownerActions) {
    if (isOwner) {
      ownerActions.classList.remove('d-none');
      ownerActions.classList.add('d-flex');
      document.getElementById('detailEditBtn').onclick = () => {
        (window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el)).hide();
        app.openPostWriteModal(id);
      };
      document.getElementById('detailDeleteBtn').onclick = () => {
        (window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el)).hide();
        deletePost(app, id);
      };
    } else {
      ownerActions.classList.remove('d-flex');
      ownerActions.classList.add('d-none');
    }
  }

  (window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el)).show();
}

// 다음 페인트에 양보 — 클릭 핸들러가 네트워크를 기다리지 않고
// 먼저 시각적 피드백을 칠 수 있게 해서 INP를 짧게 유지
function yieldToPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

function ensurePostDeleteModal() {
  let modalEl = document.getElementById('postDeleteConfirmModal');
  if (!modalEl) {
    document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="postDeleteConfirmModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
        <div class="modal-content shadow border-0">
          <div class="modal-header bg-danger text-white py-2">
            <h6 class="modal-title fw-bold mb-0"><i class="bi bi-trash3 me-2"></i>게시글 삭제 확인</h6>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="닫기"></button>
          </div>
          <div class="modal-body p-4" id="postDeleteModalBody"></div>
          <div class="modal-footer bg-body-tertiary py-2">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-danger btn-sm px-4 fw-semibold" id="confirmDeletePostBtn">
              <i class="bi bi-trash-fill me-1"></i>삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>`);
    modalEl = document.getElementById('postDeleteConfirmModal');
  }
  return modalEl;
}

// window.confirm() 대체: 메인 스레드를 막지 않는 비동기 확인.
// 클릭 핸들러는 모달을 띄운 뒤 즉시 반환되므로 INP가 길어지지 않음.
function confirmPostDelete(title) {
  const modalEl = ensurePostDeleteModal();
  const bodyEl = document.getElementById('postDeleteModalBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="text-center mb-2">
        <div class="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle p-3 mb-2" style="width:56px;height:56px;">
          <i class="bi bi-trash3 fs-4"></i>
        </div>
        <p class="fw-bold mb-1">이 게시글을 삭제하시겠습니까?</p>
        <p class="text-body-secondary small text-truncate mb-0">${escapeHtml(title || '')}</p>
      </div>
      <p class="text-center text-body-secondary small mb-0">삭제된 게시글은 복구할 수 없습니다.</p>
    `;
  }
  const confirmBtn = document.getElementById('confirmDeletePostBtn');
  const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);

  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (settled) return;
      settled = true;
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
      resolve(v);
    };
    const onHidden = () => done(false);
    modalEl.addEventListener('hidden.bs.modal', onHidden, { once: true });
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        modal.hide();
        done(true);
      };
    }
    modal.show();
  });
}

const pendingDeletes = new Set();

export async function deletePost(app, id) {
  if (pendingDeletes.has(id)) return;
  const target = app.posts.find(p => p.id === id);

  // 1. 논블로킹 확인 — 여기서 핸들러는 이미 반환되어 첫 페인트(INP)가 끝남
  const confirmed = await confirmPostDelete(target?.title);
  if (!confirmed) return;
  pendingDeletes.add(id);

  // 2. 즉각적인 시각 피드백 (다음 페인트 전에 동기 실행)
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');
  const rowBtn = document.querySelector(`.btn-delete[data-id="${id}"]`);
  const rowBtnHtml = rowBtn?.innerHTML;
  if (detailDeleteBtn) {
    detailDeleteBtn.disabled = true;
    detailDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>삭제 중';
  }
  if (rowBtn) {
    rowBtn.disabled = true;
    rowBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  }
  showToast('삭제 중…', 'info');
  await yieldToPaint();

  // 3. 낙관적 로컬 삭제 → 즉시 리렌더 (네트워크 대기 없이 페인트)
  app.posts = app.posts.filter(p => p.id !== id);
  try {
    app.saveData('jboard_posts', app.posts);
  } catch (e) {
    console.warn('local save failed:', e);
  }
  try {
    app.refreshCurrentBoard();
  } catch (e) {
    console.warn('refresh failed:', e);
  }
  await yieldToPaint();

  // 4. 서버 삭제는 백그라운드로 (타임아웃 8초, 실패해도 로컬 삭제 유지)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    await api.deletePost(id, ctrl.signal);
    showToast('삭제됨', 'warning');
  } catch (e) {
    if (e?.name === 'AbortError') {
      console.warn('API delete timeout, keeping local delete:', e);
      showToast('서버 응답이 느려 로컬에서 먼저 삭제했습니다.', 'warning');
    } else {
      console.warn('API delete error, deleting locally:', e);
      showToast('서버 삭제 실패 — 로컬에서 삭제했습니다.', 'warning');
    }
  } finally {
    clearTimeout(timer);
    pendingDeletes.delete(id);
    if (detailDeleteBtn) {
      detailDeleteBtn.disabled = false;
      detailDeleteBtn.textContent = '삭제';
    }
    if (rowBtn && document.contains(rowBtn) && rowBtnHtml) {
      rowBtn.disabled = false;
      rowBtn.innerHTML = rowBtnHtml;
    }
  }
}
