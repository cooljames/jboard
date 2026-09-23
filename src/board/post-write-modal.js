// ═══════════════════════════════════════════════════════════
// Post Creation & Edit Modal with Quill & Multi-File Dropzone
// ═══════════════════════════════════════════════════════════
import { api } from '../api.js';
import { showToast, escapeHtml, formatFileSize, formatLocalTime, normalizeBlankLines } from '../utils/ui-helpers.js';

export function initQuillEditor(app) {
  const container = document.getElementById('quillEditorContainer');
  if (!container) return;

  // 기존 에디터 잔재 정리 후 재생성 (중복 초기화 방지)
  try {
    app.quill?.off?.('text-change');
  } catch {}
  app.quill = null;
  const oldToolbar = container.parentElement.querySelector('.ql-toolbar');
  if (oldToolbar) oldToolbar.remove();

  container.innerHTML = '';

  try {
    app.quill = new window.Quill(container, {
      theme: 'snow',
      placeholder: '게시글 내용을 자유롭게 작성하세요. (스크린샷이나 이미지를 Ctrl+V로 붙여넣을 수 있습니다)',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ color: [] }, { background: [] }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
  } catch (err) {
    console.error('[editor] Quill 초기화 실패:', err);
    app.quill = null;
    showToast('에디터 초기화에 실패했습니다. 페이지를 새로고침해 주세요.', 'danger');
    return;
  }

  app.quill.on('text-change', () => {
    const hiddenInput = document.getElementById('postContent');
    if (hiddenInput) {
      hiddenInput.value = app.quill.root.innerHTML;
    }
  });

  // Clipboard paste handler for screenshots / images
  app.quill.root.addEventListener('paste', async (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (const item of clipboardData.items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          showToast('클립보드 이미지를 업로드하고 있습니다... ⏳', 'info');
          try {
            const uploaded = await api.uploadFile(file);
            const range = app.quill.getSelection(true) || { index: app.quill.getLength() };
            app.quill.insertEmbed(range.index, 'image', uploaded.url);
            app.quill.setSelection(range.index + 1);
            showToast('이미지가 본문에 성공적으로 삽입되었습니다! 🖼️', 'success');
          } catch (err) {
            console.error('Image paste upload error:', err);
            showToast('이미지 업로드에 실패했습니다.', 'danger');
          }
        }
      }
    }
  });

  // Custom toolbar image button handler
  const toolbar = app.quill.getModule('toolbar');
  toolbar.addHandler('image', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (file) {
        showToast('이미지 업로드 중... ⏳', 'info');
        try {
          const uploaded = await api.uploadFile(file);
          const range = app.quill.getSelection(true) || { index: app.quill.getLength() };
          app.quill.insertEmbed(range.index, 'image', uploaded.url);
          app.quill.setSelection(range.index + 1);
          showToast('이미지가 본문에 삽입되었습니다.', 'success');
        } catch {
          showToast('이미지 업로드 실패', 'danger');
        }
      }
    };
    fileInput.click();
  });
}

// 공식 Clipboard API로 HTML 주입 (innerHTML 직접 대입보다 안정적) + 주입 검증·재시도
export function setEditorHtml(app, html, retries = 2) {
  const hiddenInput = document.getElementById('postContent');
  const source = html || '';
  if (hiddenInput) hiddenInput.value = source;
  if (!app.quill) {
    console.warn('[editor] Quill 인스턴스 없음 — hidden input에만 보관');
    return false;
  }
  if (!source) {
    try {
      app.quill.setContents([]);
    } catch {}
    return true;
  }
  try {
    app.quill.setContents([]);
    app.quill.clipboard.dangerouslyPasteHTML(0, source, 'api');
  } catch (e) {
    try {
      app.quill.setContents(app.quill.clipboard.convert(source));
    } catch (e2) {
      app.quill.root.innerHTML = source;
    }
  }
  if (hiddenInput) hiddenInput.value = app.quill.root.innerHTML;
  const injected =
    app.quill.getText().trim().length > 0 || !!app.quill.root.querySelector('img, hr, ul, ol, table');
  if (!injected) {
    console.warn('[editor] HTML 주입 확인 실패, 재시도 남음:', retries);
    if (retries > 0) {
      setTimeout(() => setEditorHtml(app, source, retries - 1), 300);
    } else {
      showToast('본문 자동 입력에 실패했습니다. 내용을 직접 붙여넣어 주세요.', 'danger');
    }
  }
  return injected;
}

export function setupDropzone(app) {
  const dropzone = document.getElementById('multiFileDropzone');
  const fileInput = document.getElementById('multiFileInput');
  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => fileInput.click();

  fileInput.onchange = (e) => {
    addFilesToQueue(app, Array.from(e.target.files));
    fileInput.value = '';
  };

  dropzone.ondragenter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-over');
  };
  dropzone.ondragover = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('drag-over');
  };
  dropzone.ondragleave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
  };
  dropzone.ondrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFilesToQueue(app, files);
    }
  };
}

export function addFilesToQueue(app, files) {
  files.forEach(file => {
    if (!app.attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
      app.attachedFiles.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'ready'
      });
    }
  });
  renderAttachedFilesList(app);
  showToast(`${files.length}개 파일이 첨부 큐에 추가되었습니다.`, 'info');
}

export function renderAttachedFilesList(app) {
  const container = document.getElementById('attachedFilesList');
  const countBadge = document.getElementById('dropzoneCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${app.attachedFiles.length}개 첨부됨`;
    countBadge.className = app.attachedFiles.length > 0 ? 'badge bg-primary' : 'badge bg-secondary-subtle text-secondary';
  }

  if (app.attachedFiles.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = app.attachedFiles.map((item, idx) => {
    let icon = 'bi-file-earmark';
    if (item.type?.startsWith('image/')) icon = 'bi-file-earmark-image text-primary';
    else if (item.type?.includes('pdf')) icon = 'bi-file-earmark-pdf text-danger';
    else if (item.type?.includes('zip') || item.type?.includes('compressed')) icon = 'bi-file-earmark-zip text-warning';
    else if (item.type?.includes('word') || item.type?.includes('document')) icon = 'bi-file-earmark-word text-info';

    const formattedSize = formatFileSize(item.size);

    return `
      <div class="attached-file-item" data-index="${idx}">
        <div class="attached-file-info">
          <i class="bi ${icon} fs-5"></i>
          <span class="attached-file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="badge bg-secondary-subtle text-secondary small">${formattedSize}</span>
        </div>
        <button type="button" class="btn btn-sm btn-link text-danger p-0 delete-attachment-btn" data-index="${idx}" title="삭제">
          <i class="bi bi-x-circle fs-6"></i>
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.delete-attachment-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      app.attachedFiles.splice(idx, 1);
      renderAttachedFilesList(app);
    };
  });
}

export function openPostWriteModal(app, editId = null, initialData = null) {
  const authorInput = document.getElementById('postAuthor');
  const titleInput = document.getElementById('postTitle');
  const catInput = document.getElementById('postCategory');
  const noticeInput = document.getElementById('postIsNotice');
  const form = document.getElementById('postWriteForm');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (catInput && app.categories?.length) {
    catInput.innerHTML = app.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (authorInput) {
    authorInput.value = app.currentUser ? app.currentUser.name : (authorInput.value || '관리자');
  }

  let editPost = null;
  if (editId) {
    editPost = app.posts.find(p => p.id === editId);
    if (editPost && form && submitBtn) {
      form.dataset.editId = editId;
      submitBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>게시글 수정';
      titleInput.value = editPost.title.replace('📢 ', '');
      catInput.value = editPost.category;
      noticeInput.checked = editPost.isNotice;
      authorInput.value = editPost.author;
      authorInput.disabled = true;
    }
  } else if (form && submitBtn) {
    delete form.dataset.editId;
    submitBtn.innerHTML = '게시글 등록';
    titleInput.value = initialData?.title || '';
    if (initialData?.category) {
      catInput.value = initialData.category;
    } else if (app.categories?.length) {
      catInput.value = app.categories[0].id;
    }
    noticeInput.checked = false;
    authorInput.disabled = false;
  }

  const modalEl = document.getElementById('postWriteModal');
  if (!modalEl) return;

  const modalInstance = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
  modalInstance.show();

  setTimeout(() => {
    initQuillEditor(app);
    if (app.quill) {
      if (editPost) {
        setEditorHtml(app, editPost.content || '');
      } else if (initialData?.content) {
        setEditorHtml(app, initialData.content);
      } else {
        setEditorHtml(app, '');
      }
    } else {
      // 에디터 초기화 실패 시에도 hidden input에 본문 보관 (저장 폴백용)
      const hiddenContent = document.getElementById('postContent');
      if (hiddenContent) hiddenContent.value = editPost?.content || initialData?.content || '';
      showToast('에디터 초기화에 실패했습니다. 페이지를 새로고침해 주세요.', 'danger');
    }
    app.attachedFiles = editPost && editPost.attachments ? structuredClone(editPost.attachments) : [];
    renderAttachedFilesList(app);
    setupDropzone(app);
  }, 150);
}

export async function handleCreatePost(app) {
  const title = document.getElementById('postTitle').value.trim();
  const author = document.getElementById('postAuthor').value.trim();
  const cat = document.getElementById('postCategory').value;
  const catN = document.getElementById('postCategory').selectedOptions[0].text;
  const notice = document.getElementById('postIsNotice').checked;

  // 에디터·hidden input 중 비어 있지 않은 쪽을 우선 사용 (본문 유실 방지)
  const quillHtml = app.quill ? app.quill.root.innerHTML : '';
  const quillText = app.quill ? app.quill.getText().trim() : '';
  const hiddenVal = document.getElementById('postContent').value || '';
  const rawContent = quillText ? quillHtml : (hiddenVal.trim() ? hiddenVal : quillHtml);
  const content = normalizeBlankLines(rawContent);
  const textContent = (quillText || hiddenVal.replace(/<[^>]*>?/gm, '')).trim();

  if (!title || !author || (!textContent && !content.includes('<img'))) {
    alert('제목, 작성자, 본문 내용을 모두 입력하세요.');
    return;
  }

  const submitBtn = document.querySelector('#postWriteForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>등록 중...';
  }

  try {
    const finalAttachments = [];
    for (const item of app.attachedFiles) {
      if (item.url) {
        finalAttachments.push({ name: item.name, size: item.size, type: item.type, url: item.url });
      } else if (item.file) {
        const uploaded = await api.uploadFile(item.file);
        finalAttachments.push(uploaded);
      }
    }

    const finalTitle = notice ? `📢 ${title}` : title;
    const authorEmail = app.currentUser ? app.currentUser.email : 'guest@jboard.co.kr';
    const editId = document.getElementById('postWriteForm').dataset.editId;

    if (editId) {
      const id = parseInt(editId);
      try {
        await api.updatePost({ id, title: finalTitle, category: cat, content, attachments: finalAttachments });
      } catch (apiErr) {
        console.warn('API update error, using local update:', apiErr);
      }

      const idx = app.posts.findIndex(p => p.id === id);
      if (idx !== -1) {
        app.posts[idx] = {
          ...app.posts[idx],
          title: finalTitle,
          category: cat,
          categoryName: catN,
          content,
          attachments: finalAttachments,
          isNotice: notice
        };
      }
    } else {
      let newPostData = null;
      try {
        const res = await api.createPost({
          title: finalTitle,
          category: cat,
          author,
          author_email: authorEmail,
          content,
          attachments: finalAttachments
        });
        if (res.post) newPostData = res.post;
      } catch (apiErr) {
        console.warn('API post creation note, using local post:', apiErr);
      }

      const newId = newPostData ? newPostData.id : (app.posts.length ? Math.max(...app.posts.map(p => p.id)) + 1 : 1);
      const newPost = {
        id: newId,
        category: cat,
        categoryName: catN,
        title: finalTitle,
        author,
        authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author)}`,
        content,
        views: 0,
        likes: 0,
        comments: [],
        attachments: finalAttachments,
        createdAt: formatLocalTime(new Date()),
        isNotice: notice
      };

      app.posts.unshift(newPost);
    }
    app.saveData('jboard_posts', app.posts);

    document.getElementById('postWriteForm').reset();
    if (app.quill) app.quill.setContents([]);
    app.attachedFiles = [];
    renderAttachedFilesList(app);

    window.bootstrap.Modal.getInstance(document.getElementById('postWriteModal'))?.hide();
    app.refreshCurrentBoard();
    app.refreshNotifications();
    showToast(editId ? '게시글이 성공적으로 수정되었습니다! ✏️' : '새 글이 성공적으로 등록되었습니다! 🎉', 'success');
  } catch (err) {
    console.error('Post creation error:', err);
    showToast(err.message || '게시글 등록 중 오류가 발생했습니다.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      const isEditMode = !!document.getElementById('postWriteForm').dataset.editId;
      submitBtn.innerHTML = isEditMode ? '<i class="bi bi-pencil-square me-1"></i>게시글 수정' : '게시글 등록';
    }
  }
}
