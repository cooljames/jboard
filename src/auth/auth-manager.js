// ═══════════════════════════════════════════════════════════
// Authentication & User State Manager
// ═══════════════════════════════════════════════════════════
import { api } from '../api.js';
import { hashLocalPassword, verifyLocalPassword } from '../utils/security.js';
import { showToast, formatLocalTime } from '../utils/ui-helpers.js';

export async function syncWithBackend(app) {
  try {
    const data = await api.getPosts({ limit: 50 });
    if (data && data.posts && data.posts.length > 0) {
      // Normalize posts received from server
      const serverPosts = data.posts.map(sp => {
        const localExisting = app.posts.find(lp => lp.id === sp.id);
        return {
          id: sp.id,
          category: sp.category,
          categoryName: app.getCategoryName(sp.category),
          title: sp.title,
          author: sp.author,
          authorAvatar: localExisting?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sp.author || 'user')}`,
          content: sp.content,
          views: sp.views || 0,
          likes: sp.likes || 0,
          comments: localExisting?.comments || [],
          attachments: typeof sp.attachments === 'string' ? JSON.parse(sp.attachments || '[]') : (sp.attachments || []),
          createdAt: formatLocalTime(sp.created_at),
          isNotice: (sp.title || '').includes('📢'),
          _serverSynced: true
        };
      });

      // Smart Merge: 로컬에만 존재하거나 로컬에서 수정된 게시글 보존
      const serverIds = new Set(serverPosts.map(p => p.id));
      const localOnlyPosts = app.posts.filter(lp => !serverIds.has(lp.id));

      // 서버 게시글 중 로컬에 이미 content가 있는 경우, 로컬 content가 더 길면 보존
      const mergedServerPosts = serverPosts.map(sp => {
        const local = app.posts.find(lp => lp.id === sp.id);
        if (local && local.content && !local._serverSynced) {
          // 로컬에서 수정된 게시글은 로컬 데이터 유지
          return { ...sp, content: local.content, title: local.title, category: local.category, categoryName: local.categoryName };
        }
        return sp;
      });

      app.posts = [...localOnlyPosts, ...mergedServerPosts];
      app.saveData('jboard_posts', app.posts);

      // 모달이 열려 있으면 게시판 목록 갱신을 건너뜀 (DOM 경합으로 에디터 내용 유실 방지)
      const writeModalOpen = document.getElementById('postWriteModal')?.classList.contains('show');
      const detailModalOpen = document.getElementById('postDetailModal')?.classList.contains('show');
      if (!writeModalOpen && !detailModalOpen) {
        app.refreshCurrentBoard();
      }
      app.refreshNotifications();
    }
  } catch (e) {
    console.warn('[Sync with backend note]:', e.message);
  }

  // Server users sync
  try {
    const users = await api.getUsers();
    if (Array.isArray(users)) {
      let changed = false;
      for (const u of users) {
        const m = app.members.find(x => x.email === u.email);
        const lastLogin = formatLocalTime(u.last_login);
        if (m) {
          if (lastLogin && m.lastLogin !== lastLogin) {
            m.lastLogin = lastLogin;
            changed = true;
          }
        } else {
          app.members.push({
            id: u.id ?? (app.members.length ? Math.max(...app.members.map(x => x.id)) + 1 : 1),
            name: u.name,
            email: u.email,
            role: u.role || 'member',
            status: u.status || 'active',
            joinedAt: (formatLocalTime(u.created_at) || '').substring(0, 10),
            lastLogin: lastLogin || '-',
            posts: 0,
            avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || u.email)}`
          });
          changed = true;
        }
      }
      if (changed) {
        app.saveData('jboard_members', app.members);
        app.refreshNotifications();
        if (app.currentPage === 'admin' && app.adminPage === 'members') app.renderMembers();
      }
    }
  } catch (e) {
    console.warn('[Sync users note]:', e.message);
  }
}

export async function saveLocalUserMirror(app, user, password) {
  if (!app.users.some(u => u.email === user.email)) {
    app.users.push({
      id: user.id ?? (app.users.length ? Math.max(...app.users.map(u => u.id)) + 1 : 1),
      name: user.name,
      email: user.email,
      password: await hashLocalPassword(password ?? ''),
      role: user.role || 'member',
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || user.email)}`,
      createdAt: (formatLocalTime(user.created_at) || formatLocalTime(new Date())).substring(0, 10)
    });
    app.saveData('jboard_users', app.users);
  }
  if (!app.members.some(m => m.email === user.email)) {
    app.members.push({
      id: app.members.length ? Math.max(...app.members.map(m => m.id)) + 1 : 1,
      name: user.name,
      email: user.email,
      role: user.role || 'member',
      status: user.status || 'active',
      joinedAt: (formatLocalTime(user.created_at) || formatLocalTime(new Date())).substring(0, 10),
      lastLogin: '-',
      posts: 0,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || user.email)}`
    });
    app.saveData('jboard_members', app.members);
  }
}

export async function signup(app, name, email, password) {
  // 1. Try Neon DB registration
  try {
    const serverUser = await api.register(name, email, password);
    await saveLocalUserMirror(app, serverUser, password);
    return { ok: true };
  } catch (apiErr) {
    if (apiErr.message && apiErr.message.includes('이미 존재하는 이메일')) {
      return { ok: false, msg: apiErr.message };
    }
    console.warn('[Signup API note, using local fallback]:', apiErr.message);
  }

  // 2. Fallback to local storage
  if (app.users.find(u => u.email === email)) return { ok: false, msg: '이미 등록된 이메일입니다.' };
  const user = {
    id: app.users.length ? Math.max(...app.users.map(u => u.id)) + 1 : 1,
    name,
    email,
    password: await hashLocalPassword(password),
    role: 'member',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    createdAt: formatLocalTime(new Date()).substring(0, 10)
  };
  app.users.push(user);
  app.saveData('jboard_users', app.users);

  app.members.push({
    id: app.members.length ? Math.max(...app.members.map(m => m.id)) + 1 : 1,
    name,
    email,
    role: 'member',
    status: 'active',
    joinedAt: user.createdAt,
    lastLogin: '-',
    posts: 0,
    avatar: user.avatar
  });
  app.saveData('jboard_members', app.members);
  app.refreshNotifications();
  return { ok: true };
}

export async function login(app, email, password) {
  // 1. Try Neon DB authentication
  try {
    const serverUser = await api.login(email, password);
    await saveLocalUserMirror(app, serverUser, password);
    app.currentUser = {
      id: serverUser.id,
      name: serverUser.name,
      email: serverUser.email,
      role: serverUser.role,
      avatar: serverUser.avatar || app.users.find(u => u.email === email)?.avatar
    };
    app.saveData('jboard_currentUser', app.currentUser);
    touchMemberLogin(app, email);
    return { ok: true, user: app.currentUser };
  } catch (apiErr) {
    if (apiErr.message && apiErr.message.includes('이메일 또는 비밀번호')) {
      const loginLocalRes = await loginLocal(app, email, password);
      if (loginLocalRes) return { ok: true, user: app.currentUser };
      return { ok: false, msg: apiErr.message };
    }
    console.warn('[Login API note, using local fallback]:', apiErr.message);
  }

  // 2. Offline / Local fallback
  const loginLocalRes = await loginLocal(app, email, password);
  if (!loginLocalRes) return { ok: false, msg: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  return { ok: true, user: app.currentUser };
}

export function touchMemberLogin(app, email) {
  const m = app.members.find(x => x.email === email);
  if (m) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    m.lastLogin = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    app.saveData('jboard_members', app.members);
  }
}

export async function loginLocal(app, email, password) {
  const user = app.users.find(u => u.email === email);
  if (!user) return false;
  const { ok, needsRehash } = await verifyLocalPassword(password, user.password);
  if (!ok) return false;
  if (needsRehash) {
    user.password = await hashLocalPassword(password);
    app.saveData('jboard_users', app.users);
  }
  app.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar };
  app.saveData('jboard_currentUser', app.currentUser);
  touchMemberLogin(app, email);
  return true;
}

export function logout(app) {
  app.currentUser = null;
  localStorage.removeItem('jboard_currentUser');
  showToast('로그아웃 되었습니다.');
  app.navigate('home');
}

export function openWithdrawModal(app) {
  if (!app.currentUser) return;
  const pwInput = document.getElementById('withdrawPassword');
  const errEl = document.getElementById('withdrawError');
  if (pwInput) pwInput.value = '';
  if (errEl) errEl.classList.add('d-none');
  const confirmBtn = document.getElementById('withdrawConfirmBtn');
  if (confirmBtn) confirmBtn.onclick = () => handleWithdraw(app);
  if (pwInput) {
    pwInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleWithdraw(app);
      }
    };
  }
  const modalEl = document.getElementById('withdrawModal');
  if (modalEl) (window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl)).show();
}

export async function handleWithdraw(app) {
  const email = app.currentUser?.email;
  if (!email) return;
  const pwInput = document.getElementById('withdrawPassword');
  const errEl = document.getElementById('withdrawError');
  const confirmBtn = document.getElementById('withdrawConfirmBtn');
  const pw = pwInput?.value || '';
  const showError = (msg) => {
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('d-none');
    }
  };
  if (!pw) {
    showError('비밀번호를 입력하세요.');
    return;
  }
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>처리 중...';
  }

  try {
    await api.withdraw(email, pw);
  } catch (apiErr) {
    if (apiErr.message && (apiErr.message.includes('비밀번호') || apiErr.message.includes('이메일'))) {
      showError(apiErr.message);
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '탈퇴하기';
      }
      return;
    }
    console.warn('[Withdraw API note, using local fallback]:', apiErr.message);
    const local = app.users.find(u => u.email === email);
    const v = local && (await verifyLocalPassword(pw, local.password));
    if (!v || !v.ok) {
      showError('서버에 연결할 수 없고 비밀번호도 일치하지 않습니다.');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '탈퇴하기';
      }
      return;
    }
  }

  app.users = app.users.filter(u => u.email !== email);
  app.members = app.members.filter(m => m.email !== email);
  app.saveData('jboard_users', app.users);
  app.saveData('jboard_members', app.members);
  app.refreshNotifications();

  const modalEl = document.getElementById('withdrawModal');
  if (modalEl) (window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl)).hide();
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = '탈퇴하기';
  }

  app.currentUser = null;
  localStorage.removeItem('jboard_currentUser');
  showToast('탈퇴 처리되었습니다.', 'warning');
  app.navigate('home');
}
