// ═══════════════════════════════════════════════════════════
// Post Detail Modal, Comments & Delete Handler
// ═══════════════════════════════════════════════════════════
import { api } from '../api.js';
import { showToast, escapeHtml, formatFileSize, formatLocalTime, normalizeBlankLines } from '../utils/ui-helpers.js';

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

  // Render Rich Content (연속 빈줄은 1개로 교정 후 표시)
  const isHtml = p.content.includes('<p>') || p.content.includes('<div>') || p.content.includes('<img');
  document.getElementById('detailContent').innerHTML = isHtml ? normalizeBlankLines(p.content) : p.content.replace(/\n/g, '<br>');

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
      return `
        <a href="${att.url}" target="_blank" download="${escapeHtml(att.name)}" class="detail-attachment-badge" title="다운로드/열기">
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

export async function deletePost(app, id) {
  if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
  try {
    await api.deletePost(id);
  } catch (e) {
    console.warn('API delete error, deleting locally:', e);
  }
  app.posts = app.posts.filter(p => p.id !== id);
  app.saveData('jboard_posts', app.posts);
  app.refreshCurrentBoard();
  showToast('삭제됨', 'warning');
}
