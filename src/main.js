// ═══════════════════════════════════════════════════════════
// JBoard — Main Application
// Public Homepage + Auth + Admin Dashboard SPA
// ═══════════════════════════════════════════════════════════
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'admin-lte/dist/css/adminlte.min.css';
import * as bootstrap from 'bootstrap';
import './style.css';
import Quill from 'quill';
import { api } from './api.js';

window.bootstrap = bootstrap;
window.Quill = Quill;

// ─────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────
const DEFAULT_POSTS = [
  { id:1, category:'notice', categoryName:'공지', title:'📢 JBoard 시스템 정기 점검 안내 (09/25)', author:'시스템 관리자', authorAvatar:'https://api.dicebear.com/7.x/bottts/svg?seed=Admin', content:'안정적인 서비스 운영을 위해 데이터베이스 정기 점검 및 서버 패치 작업이 진행될 예정입니다.\n점검 시간 동안에는 서비스 접속이 일시적으로 제한될 수 있습니다.', views:1240, likes:42, comments:[{author:'김개발',date:'2026-09-22 09:15',content:'공지 확인했습니다!'}], createdAt:'2026-09-22 09:00', isNotice:true },
  { id:2, category:'tech', categoryName:'기술', title:'AdminLTE v4 + Vite 기반 관리자 페이지 구성 팁', author:'이프론트', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Lee', content:'AdminLTE 4는 Bootstrap 5 기반으로 완전히 재설계되었습니다.\nVite와 연동하면 HMR으로 초고속 개발이 가능합니다.', views:840, likes:56, comments:[{author:'박백엔드',date:'2026-09-22 09:40',content:'유용한 자료 감사합니다!'},{author:'최디자인',date:'2026-09-22 10:02',content:'다크모드 지원이 깔끔하네요.'}], createdAt:'2026-09-21 16:30', isNotice:false },
  { id:3, category:'qna', categoryName:'질문', title:'대시보드 실시간 웹소켓 아키텍처 문의', author:'박백엔드', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Park', content:'동시 접속자가 많은 상황에서 실시간 갱신을 위한 아키텍처 추천 부탁드립니다.', views:320, likes:18, comments:[], createdAt:'2026-09-21 14:10', isNotice:false },
  { id:4, category:'free', categoryName:'자유', title:'새로운 jboard 프로젝트를 시작했습니다!', author:'최신입', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Choi', content:'사내 게시판 및 관리자 툴 통합 프로젝트를 준비하고 있습니다.\n다양한 기능 제안 환영합니다.', views:512, likes:29, comments:[], createdAt:'2026-09-20 18:05', isNotice:false },
  { id:5, category:'info', categoryName:'정보', title:'2026년 웹 접근성 및 성능 최적화 가이드라인', author:'정도움', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Jung', content:'WCAG 2.2 표준 및 최신 브라우저 성능 측정 지표 체크리스트입니다.', views:670, likes:35, comments:[], createdAt:'2026-09-19 11:20', isNotice:false }
];

const DEFAULT_MEMBERS = [
  { id:1, name:'김개발', email:'kim@jboard.io', role:'admin', status:'active', joinedAt:'2025-03-15', lastLogin:'2026-09-22 10:12', posts:34, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Kim' },
  { id:2, name:'이프론트', email:'lee@jboard.io', role:'editor', status:'active', joinedAt:'2025-06-22', lastLogin:'2026-09-22 09:45', posts:28, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Lee' },
  { id:3, name:'박백엔드', email:'park@jboard.io', role:'editor', status:'active', joinedAt:'2025-08-10', lastLogin:'2026-09-21 17:30', posts:19, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Park' },
  { id:4, name:'최디자인', email:'choi@jboard.io', role:'member', status:'active', joinedAt:'2025-11-01', lastLogin:'2026-09-22 08:20', posts:12, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=ChoiD' },
  { id:5, name:'정도움', email:'jung@jboard.io', role:'member', status:'active', joinedAt:'2026-01-15', lastLogin:'2026-09-20 14:50', posts:8, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Jung' },
  { id:6, name:'한초보', email:'han@jboard.io', role:'member', status:'inactive', joinedAt:'2026-04-20', lastLogin:'2026-08-10 11:00', posts:2, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Han' },
  { id:7, name:'강매니저', email:'kang@jboard.io', role:'admin', status:'active', joinedAt:'2025-01-05', lastLogin:'2026-09-22 10:30', posts:45, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Kang' },
  { id:8, name:'윤테스트', email:'yoon@jboard.io', role:'member', status:'banned', joinedAt:'2026-07-01', lastLogin:'2026-09-01 09:00', posts:0, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Yoon' }
];

const DEFAULT_USERS = [
  { id:1, name:'관리자', email:'admin@jboard.local', password:'admin1234', role:'admin', avatar:'https://api.dicebear.com/7.x/bottts/svg?seed=Admin', createdAt:'2025-01-01' },
  { id:2, name:'일반회원', email:'user@jboard.local', password:'user1234', role:'member', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=User', createdAt:'2026-01-01' }
];

// ─────────────────────────────────────────────────
// JBoard App
// ─────────────────────────────────────────────────
class JBoardApp {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.posts = this.loadData('jboard_posts', DEFAULT_POSTS);
    this.members = this.loadData('jboard_members', DEFAULT_MEMBERS);
    this.users = this.loadData('jboard_users', DEFAULT_USERS);

    // Ensure default users exist in storage
    DEFAULT_USERS.forEach(du => {
      if (!this.users.some(u => u.email === du.email)) {
        this.users.push(du);
        this.saveData('jboard_users', this.users);
      }
    });

    this.currentUser = this.loadData('jboard_currentUser', null);
    this.currentPage = 'home';
    this.adminPage = 'dashboard';
    this.boardCategory = 'all';
    this.boardSearch = '';
    this.charts = {};
    this.attachedFiles = [];
    this.quill = null;

    this.initTheme();

    // Initial navigation according to role
    if (!this.currentUser) {
      this.navigate('home');
    } else if (this.currentUser.role === 'admin') {
      this.navigate('admin');
    } else {
      this.navigate('home');
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.pub-navbar');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Sync with Neon Postgres backend
    this.syncWithBackend();
  }

  async syncWithBackend() {
    try {
      const data = await api.getPosts({ limit: 50 });
      if (data && data.posts && data.posts.length > 0) {
        this.posts = data.posts.map(p => ({
          id: p.id,
          category: p.category,
          categoryName: this.getCategoryName(p.category),
          title: p.title,
          author: p.author,
          authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.author)}`,
          content: p.content,
          views: p.views || 0,
          likes: p.likes || 0,
          comments: [],
          attachments: typeof p.attachments === 'string' ? JSON.parse(p.attachments || '[]') : (p.attachments || []),
          createdAt: (p.created_at || '').replace('T', ' ').substring(0, 16),
          isNotice: (p.title || '').includes('📢')
        }));
        this.saveData('jboard_posts', this.posts);
        this.refreshCurrentBoard();
      }
    } catch (e) {
      console.warn('[Sync with backend note]:', e.message);
    }
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getCategoryName(cat) {
    const map = { tech: '기술', notice: '공지', qna: '질문', free: '자유', info: '정보', '기술': '기술', '공지': '공지', '질문': '질문', '자유': '자유', '정보': '정보' };
    return map[cat] || cat || '자유';
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Data ──
  loadData(k, fallback) {
    try { const d = localStorage.getItem(k); if (d) return JSON.parse(d); } catch {}
    if (fallback !== null) localStorage.setItem(k, JSON.stringify(fallback));
    return fallback ? structuredClone(fallback) : null;
  }
  saveData(k, d) { localStorage.setItem(k, JSON.stringify(d)); }

  // ── Theme ──
  initTheme() {
    this.applyTheme(localStorage.getItem('lte-theme') || 'light');
  }
  applyTheme(theme) {
    const resolved = theme === 'auto' ? (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light') : theme;
    document.documentElement.setAttribute('data-bs-theme', resolved);
    localStorage.setItem('lte-theme', theme);
    if (this.currentPage === 'admin') {
      if (this.adminPage === 'dashboard' || this.adminPage === 'analytics') {
        setTimeout(() => this.renderAdminPage(), 50);
      }
    }
  }
  bindThemeButtons() {
    document.querySelectorAll('[data-bs-theme-value]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.applyTheme(btn.getAttribute('data-bs-theme-value'));
        this.showToast(`테마가 변경되었습니다.`);
        if (this.currentPage === 'admin' && this.adminPage === 'settings') this.renderSettings();
      });
    });
  }

  // ── Auth ──
  signup(name, email, password) {
    if (this.users.find(u => u.email === email)) return { ok:false, msg:'이미 등록된 이메일입니다.' };
    const user = {
      id: this.users.length ? Math.max(...this.users.map(u=>u.id))+1 : 1,
      name, email, password, role:'member',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.users.push(user);
    this.saveData('jboard_users', this.users);
    // Also add to members list
    this.members.push({ id: this.members.length?Math.max(...this.members.map(m=>m.id))+1:1, name, email, role:'member', status:'active', joinedAt:user.createdAt, lastLogin:'-', posts:0, avatar:user.avatar });
    this.saveData('jboard_members', this.members);
    return { ok:true };
  }
  login(email, password) {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (!user) return { ok:false, msg:'이메일 또는 비밀번호가 올바르지 않습니다.' };
    this.currentUser = { id:user.id, name:user.name, email:user.email, role:user.role, avatar:user.avatar };
    this.saveData('jboard_currentUser', this.currentUser);
    return { ok:true, user: this.currentUser };
  }
  logout() {
    this.currentUser = null;
    localStorage.removeItem('jboard_currentUser');
    this.showToast('로그아웃 되었습니다.');
    this.navigate('home');
  }

  // ═══════════════════════════════════════════════
  // ROUTER
  // ═══════════════════════════════════════════════
  navigate(page) {
    this.currentPage = page;
    window.scrollTo(0, 0);

    // Remove AdminLTE body classes for standard pages
    const body = document.body;
    body.className = '';

    switch(page) {
      case 'home':
        if (!this.currentUser) {
          // 1. 비로그인 사용자: 기본 안내 홈페이지 (Hero, 기능 소개, CTA 등)
          this.renderPublicLanding();
        } else if (this.currentUser.role === 'admin') {
          // 3. 관리자: 대시보드
          body.className = 'layout-fixed sidebar-expand-lg bg-body-tertiary';
          this.renderAdmin();
        } else {
          // 2. 일반회원: 게시판 전용 화면
          this.renderMemberBoard();
        }
        break;

      case 'landing':
        // 안내 홈페이지 전용 라우트
        this.renderPublicLanding();
        break;

      case 'board':
        if (!this.currentUser) {
          this.showToast('로그인이 필요합니다.', 'info');
          this.navigate('login');
          return;
        }
        this.renderMemberBoard();
        break;

      case 'login':
        this.renderLogin();
        break;

      case 'signup':
        this.renderSignup();
        break;

      case 'admin':
        if (!this.currentUser) {
          this.navigate('login');
          return;
        }
        if (this.currentUser.role !== 'admin') {
          this.showToast('관리자 권한이 없습니다. (일반회원 계정)', 'danger');
          this.navigate('home');
          return;
        }
        body.className = 'layout-fixed sidebar-expand-lg bg-body-tertiary';
        this.renderAdmin();
        break;

      default:
        this.navigate('home');
    }
  }

  // Helper to bind [data-nav] links
  bindNavLinks() {
    this.appRoot.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.navigate(el.getAttribute('data-nav')); });
    });
  }

  // ═══════════════════════════════════════════════
  // 1. 비로그인 사용자: 기본 안내 홈페이지 (Public Landing)
  // ═══════════════════════════════════════════════
  renderPublicLanding() {
    const totalPosts = this.posts.length;
    const totalMembers = this.members.length;
    const totalViews = this.posts.reduce((s,p) => s + (p.views || 0), 0);
    const recentPosts = this.posts.slice(0, 6);

    this.appRoot.innerHTML = `
    <!-- ═══ Navbar ═══ -->
    <nav class="pub-navbar">
      <div class="container-fluid px-3 px-xl-5">
        <div class="d-flex align-items-center justify-content-between py-2">
          <a href="#" class="d-flex align-items-center gap-2 text-decoration-none" data-nav="home">
            <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
            <span class="fw-bold fs-5 text-body">JBoard</span>
          </a>
          <div class="d-none d-md-flex align-items-center gap-1">
            <a href="#features" class="nav-link text-body-secondary">기능 소개</a>
            <a href="#posts" class="nav-link text-body-secondary">최신 소식</a>
            <a href="#contact" class="nav-link text-body-secondary">문의</a>
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
                <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="auto"><i class="bi bi-circle-half me-2 text-secondary"></i>시스템</button></li>
              </ul>
            </div>

            <a href="#" class="btn btn-sm btn-outline-primary rounded-pill px-3" data-nav="login">로그인</a>
            <a href="#" class="btn btn-sm btn-primary rounded-pill px-3" data-nav="signup">무료 회원가입</a>
          </div>
        </div>
      </div>
    </nav>

    <!-- ═══ Hero ═══ -->
    <section class="hero-section bg-body">
      <div class="container-fluid px-3 px-xl-5">
        <div class="row align-items-center g-5">
          <div class="col-lg-6 hero-content">
            <div class="hero-badge"><i class="bi bi-stars"></i> AdminLTE 4 기반 최신 플랫폼</div>
            <h1 class="hero-title mb-3">
              모던 커뮤니티를<br><span class="gradient-text">더 스마트하게</span> 관리하세요
            </h1>
            <p class="hero-subtitle text-body-secondary mb-4">
              JBoard는 게시판 관리, 회원 관리, 통계 분석을 하나의 대시보드에서 제공하는 차세대 커뮤니티 관리 플랫폼입니다.
            </p>
            <div class="d-flex flex-wrap gap-3">
              <a href="#" class="hero-cta hero-cta-primary" data-nav="signup">
                <i class="bi bi-rocket-takeoff-fill"></i> 무료로 시작하기
              </a>
              <a href="#features" class="hero-cta hero-cta-outline">
                <i class="bi bi-play-circle"></i> 더 알아보기
              </a>
            </div>
            <div class="d-flex gap-4 mt-4 pt-2">
              <div><span class="fw-bold fs-4" style="color:var(--jb-primary)">${totalPosts}</span><br><small class="text-body-secondary">총 게시글</small></div>
              <div><span class="fw-bold fs-4" style="color:var(--jb-primary)">${totalMembers}</span><br><small class="text-body-secondary">회원 수</small></div>
              <div><span class="fw-bold fs-4" style="color:var(--jb-primary)">${totalViews.toLocaleString()}</span><br><small class="text-body-secondary">누적 조회수</small></div>
            </div>
          </div>
          <div class="col-lg-6 hero-visual d-none d-lg-block">
            <div class="hero-card-float">
              <div class="d-flex align-items-center gap-2 mb-3">
                <div class="rounded-circle bg-danger" style="width:12px;height:12px"></div>
                <div class="rounded-circle bg-warning" style="width:12px;height:12px"></div>
                <div class="rounded-circle bg-success" style="width:12px;height:12px"></div>
                <span class="ms-2 text-body-secondary small">JBoard Live Stats</span>
              </div>
              <div class="row g-2 mb-3">
                ${[{l:'게시글',v:totalPosts,c:'primary',i:'bi-file-text'},{l:'회원',v:totalMembers,c:'success',i:'bi-people'},{l:'조회수',v:totalViews.toLocaleString(),c:'info',i:'bi-eye'}].map(s => `
                  <div class="col-4">
                    <div class="rounded-3 p-2 text-center" style="background:var(--bs-tertiary-bg)">
                      <i class="bi ${s.i} text-${s.c} fs-5 d-block mb-1"></i>
                      <div class="fw-bold">${s.v}</div>
                      <small class="text-body-secondary">${s.l}</small>
                    </div>
                  </div>`).join('')}
              </div>
              <div class="rounded-3 p-3" style="background:var(--bs-tertiary-bg)">
                ${this.posts.slice(0,3).map((p,i) => `
                  <div class="d-flex align-items-center gap-2 ${i>0?'mt-2 pt-2 border-top':''}">
                    <img src="${p.authorAvatar}" class="rounded-circle border" width="28" height="28">
                    <div class="flex-grow-1 text-truncate small fw-medium">${p.title}</div>
                    <span class="badge ${this.badgeClass(p.category)} badge-category">${p.categoryName}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Features ═══ -->
    <section class="feature-section" id="features">
      <div class="container-fluid px-3 px-xl-5">
        <div class="text-center mb-5">
          <span class="section-label mb-3"><i class="bi bi-grid-3x3-gap-fill"></i> Features</span>
          <h2 class="section-title mt-3">강력하고 직관적인 관리 도구</h2>
          <p class="text-body-secondary mx-auto" style="max-width:560px">JBoard가 제공하는 핵심 기능으로 커뮤니티를 효율적으로 운영하세요.</p>
        </div>
        <div class="row g-4">
          ${[
            {icon:'bi-chat-square-text-fill',color:'primary',title:'게시판 관리',desc:'카테고리 분류, 검색 필터, CRUD 기능을 갖춘 고급 게시판 관리 시스템'},
            {icon:'bi-people-fill',color:'success',title:'회원 관리',desc:'역할 기반 권한 관리, 상태 추적, 회원 프로필 관리를 한눈에'},
            {icon:'bi-graph-up-arrow',color:'warning',title:'통계 분석',desc:'게시글 트렌드, 카테고리별 분포, 작성자 랭킹 등 데이터 시각화'},
            {icon:'bi-shield-lock-fill',color:'danger',title:'보안 설정',desc:'CAPTCHA 인증, 관리자 승인, 이메일 인증 등 다층 보안 시스템'},
            {icon:'bi-palette-fill',color:'info',title:'테마 커스텀',desc:'라이트/다크 모드 지원, 실시간 테마 전환으로 최적의 사용 환경'},
            {icon:'bi-phone-fill',color:'secondary',title:'반응형 디자인',desc:'모바일, 태블릿, 데스크톱 모든 화면에서 완벽하게 동작'}
          ].map(f => `
            <div class="col-md-6 col-lg-4">
              <div class="feature-card">
                <div class="feature-icon bg-${f.color}-subtle text-${f.color}"><i class="bi ${f.icon}"></i></div>
                <h5 class="fw-bold mb-2">${f.title}</h5>
                <p class="text-body-secondary small mb-0">${f.desc}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- ═══ Recent Posts Preview ═══ -->
    <section class="posts-section" id="posts">
      <div class="container-fluid px-3 px-xl-5">
        <div class="text-center mb-5">
          <span class="section-label mb-3"><i class="bi bi-file-earmark-text-fill"></i> Community</span>
          <h2 class="section-title mt-3">최근 게시글</h2>
          <p class="text-body-secondary">활발한 커뮤니티에서 최신 정보를 만나보세요. 로그인 시 전체 글을 볼 수 있습니다.</p>
        </div>
        <div class="row g-3">
          ${recentPosts.map(p => `
            <div class="col-md-6 col-lg-4">
              <div class="post-preview-card h-100">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <span class="badge ${this.badgeClass(p.category)} badge-category">${p.categoryName}</span>
                  <small class="text-body-secondary">${p.createdAt.split(' ')[0]}</small>
                </div>
                <h6 class="fw-bold mb-2 text-truncate">${p.title}</h6>
                <p class="text-body-secondary small mb-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${p.content}</p>
                <div class="d-flex align-items-center justify-content-between mt-auto">
                  <div class="d-flex align-items-center gap-2">
                    <img src="${p.authorAvatar}" class="rounded-circle border" width="24" height="24">
                    <span class="small fw-medium">${p.author}</span>
                  </div>
                  <div class="d-flex gap-3 text-body-secondary small">
                    <span><i class="bi bi-eye me-1"></i>${p.views}</span>
                    <span><i class="bi bi-heart me-1"></i>${p.likes}</span>
                  </div>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- ═══ CTA ═══ -->
    <section class="cta-section" id="contact">
      <div class="container-fluid px-3 px-xl-5">
        <div class="cta-box text-center">
          <h2 class="fw-bold mb-3" style="font-size:clamp(1.5rem,3vw,2.2rem)">지금 바로 JBoard를 시작하세요</h2>
          <p class="opacity-75 mb-4 mx-auto" style="max-width:500px">무료로 가입하고 활발한 커뮤니티 소통을 경험해 보세요.</p>
          <a href="#" class="hero-cta" style="background:rgba(255,255,255,0.15);color:#fff;border:2px solid rgba(255,255,255,0.3)" data-nav="signup">
            <i class="bi bi-rocket-takeoff-fill"></i> 무료 회원가입
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ Footer ═══ -->
    <footer class="pub-footer bg-body border-top py-4">
      <div class="container-fluid px-3 px-xl-5">
        <div class="row g-4">
          <div class="col-md-4">
            <div class="d-flex align-items-center gap-2 mb-3">
              <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
              <span class="fw-bold fs-5">JBoard</span>
            </div>
            <p class="text-body-secondary small">AdminLTE 4 기반의 차세대 커뮤니티 플랫폼. 게시판, 회원, 통계를 효율적으로 운영하세요.</p>
          </div>
          <div class="col-md-2">
            <h6 class="fw-bold mb-3">메뉴</h6>
            <ul class="list-unstyled small">
              <li class="mb-2"><a href="#features" class="text-body-secondary text-decoration-none">기능 소개</a></li>
              <li class="mb-2"><a href="#posts" class="text-body-secondary text-decoration-none">최신 소식</a></li>
            </ul>
          </div>
          <div class="col-md-2">
            <h6 class="fw-bold mb-3">계정</h6>
            <ul class="list-unstyled small">
              <li class="mb-2"><a href="#" class="text-body-secondary text-decoration-none" data-nav="login">로그인</a></li>
              <li class="mb-2"><a href="#" class="text-body-secondary text-decoration-none" data-nav="signup">회원가입</a></li>
            </ul>
          </div>
          <div class="col-md-4">
            <h6 class="fw-bold mb-3">기술 스택</h6>
            <div class="d-flex flex-wrap gap-2">
              ${['AdminLTE 4','Bootstrap 5','Vite','ES Modules','LocalStorage'].map(t => `<span class="badge bg-body-secondary text-body-secondary rounded-pill px-2 py-1">${t}</span>`).join('')}
            </div>
          </div>
        </div>
        <hr class="my-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center">
          <small class="text-body-secondary">© 2026 JBoard Project. All rights reserved.</small>
          <div class="d-flex gap-3">
            <a href="#" class="text-body-secondary"><i class="bi bi-github fs-5"></i></a>
            <a href="#" class="text-body-secondary"><i class="bi bi-twitter-x fs-5"></i></a>
          </div>
        </div>
      </div>
    </footer>
    `;

    this.bindNavLinks();
    this.bindThemeButtons();
  }

  // ═══════════════════════════════════════════════
  // 2. 로그인 일반회원: 게시판 전용 풀위드 화면 (Member Board Only)
  // ═══════════════════════════════════════════════
  renderMemberBoard() {
    const totalPosts = this.posts.length;
    const totalMembers = this.members.length;
    const totalViews = this.posts.reduce((s,p) => s + (p.views || 0), 0);
    const totalLikes = this.posts.reduce((s,p) => s + (p.likes || 0), 0);

    this.appRoot.innerHTML = `
    <!-- ═══ Member Navbar ═══ -->
    <nav class="pub-navbar">
      <div class="container-fluid px-3 px-xl-5">
        <div class="d-flex align-items-center justify-content-between py-2">
          <div class="d-flex align-items-center gap-3">
            <a href="#" class="d-flex align-items-center gap-2 text-decoration-none" data-nav="home">
              <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
              <span class="fw-bold fs-5 text-body">JBoard</span>
            </a>
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 small d-none d-sm-inline-block">
              <i class="bi bi-chat-square-text-fill me-1"></i>커뮤니티 게시판
            </span>
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
                <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="auto"><i class="bi bi-circle-half me-2 text-secondary"></i>시스템</button></li>
              </ul>
            </div>

            <!-- Member info & Logout -->
            <div class="d-flex align-items-center gap-2 ms-2">
              <img src="${this.currentUser.avatar}" class="rounded-circle border" width="30" height="30">
              <div class="d-none d-md-block text-start">
                <div class="small fw-bold text-body lh-1">${this.currentUser.name}</div>
                <span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill" style="font-size:0.68rem">일반회원</span>
              </div>
              <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 ms-1" id="memberLogoutBtn">
                <i class="bi bi-box-arrow-right me-1"></i>로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- ═══ Member Board Main Content (Full Width, No Sidebar) ═══ -->
    <main class="pub-main-container">
      <div class="container-fluid px-3 px-xl-5">
        <div class="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
          <div>
            <h4 class="fw-bold mb-1 d-flex align-items-center gap-2">
              <i class="bi bi-chat-square-text-fill text-primary"></i> 자유 소통 게시판
            </h4>
            <p class="text-body-secondary small mb-0">자유롭게 의견을 나누고 최신 정보를 확인하세요.</p>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill small">
              <i class="bi bi-check-circle-fill me-1"></i> 회원 인증 완료
            </span>
          </div>
        </div>

        <!-- Board Table Card (From screenshot) -->
        <div id="homeBoardContainer"></div>

        <!-- Quick Summary Stats Below Board -->
        <div class="row g-3 my-2">
          <div class="col-6 col-md-3">
            <div class="card border-0 bg-body shadow-sm p-3 text-center rounded-3">
              <i class="bi bi-file-text-fill text-primary fs-4 mb-1"></i>
              <div class="fw-bold fs-5">${totalPosts}</div>
              <small class="text-body-secondary">전체 게시글</small>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 bg-body shadow-sm p-3 text-center rounded-3">
              <i class="bi bi-people-fill text-success fs-4 mb-1"></i>
              <div class="fw-bold fs-5">${totalMembers}</div>
              <small class="text-body-secondary">등록 회원 수</small>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 bg-body shadow-sm p-3 text-center rounded-3">
              <i class="bi bi-eye-fill text-info fs-4 mb-1"></i>
              <div class="fw-bold fs-5">${totalViews.toLocaleString()}</div>
              <small class="text-body-secondary">누적 조회수</small>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 bg-body shadow-sm p-3 text-center rounded-3">
              <i class="bi bi-heart-fill text-danger fs-4 mb-1"></i>
              <div class="fw-bold fs-5">${totalLikes.toLocaleString()}</div>
              <small class="text-body-secondary">누적 추천수</small>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ═══ Clean Modern Footer ═══ -->
    <footer class="pub-footer bg-body border-top py-4 mt-4">
      <div class="container-fluid px-3 px-xl-5">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-kanban-fill fs-5" style="color:var(--jb-primary)"></i>
            <span class="fw-bold">JBoard</span>
            <span class="text-body-secondary small ms-2">© 2026 AdminLTE 4 모던 커뮤니티 플랫폼</span>
          </div>
          <div class="d-flex align-items-center gap-3 small text-body-secondary">
            <span>로그인: <strong>${this.currentUser.name}</strong> (일반회원)</span>
            <span>포트 3000 서비스 중</span>
          </div>
        </div>
      </div>
    </footer>
    `;

    this.bindNavLinks();
    this.bindThemeButtons();
    document.getElementById('memberLogoutBtn')?.addEventListener('click', () => this.logout());

    // Render the board card into #homeBoardContainer
    this.renderBoardTable(document.getElementById('homeBoardContainer'));
  }

  // ═══════════════════════════════════════════════
  // SHARED BOARD COMPONENT
  // ═══════════════════════════════════════════════
  renderBoardTable(container) {
    if (!container) return;
    const filtered = this.posts.filter(p => {
      const mc = this.boardCategory === 'all' || p.category === this.boardCategory;
      const ms = !this.boardSearch ||
        p.title.toLowerCase().includes(this.boardSearch) ||
        p.content.toLowerCase().includes(this.boardSearch) ||
        p.author.toLowerCase().includes(this.boardSearch);
      return mc && ms;
    });

    container.innerHTML = `
      <div class="card shadow-sm border-0 mb-4">
        <div class="card-header bg-body border-bottom py-3">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <ul class="nav board-cat-nav" id="catTabs">
              ${['all:전체보기','notice:공지','tech:기술','qna:질문','free:자유','info:정보'].map(x => {
                const [v, l] = x.split(':');
                return `<li class="nav-item"><a class="nav-link ${v === this.boardCategory ? 'active' : ''}" href="#" data-category="${v}">${l}</a></li>`;
              }).join('')}
            </ul>
            <div class="d-flex align-items-center gap-2">
              <form id="searchForm" class="d-flex align-items-center">
                <div class="input-group input-group-sm" style="width: 220px;">
                  <input type="text" id="searchInput" class="form-control" placeholder="검색..." value="${this.boardSearch}">
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
            <table class="table table-hover align-middle board-table mb-0">
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
                ${!filtered.length ? `
                  <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                      <i class="bi bi-inbox fs-1 d-block mb-2"></i>게시글이 없습니다.
                    </td>
                  </tr>` : filtered.map(p => `
                  <tr class="${p.isNotice ? 'table-warning-subtle' : ''}">
                    <td class="text-center text-muted">${p.id}</td>
                    <td class="text-center"><span class="badge ${this.badgeClass(p.category)} badge-category">${p.categoryName}</span></td>
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
                        <button class="btn btn-outline-danger btn-delete" data-id="${p.id}" title="삭제"><i class="bi bi-trash"></i></button>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer bg-body border-top py-3">
          <span class="text-muted small">총 ${filtered.length}건</span>
        </div>
      </div>
    `;

    // Event listeners for category filters
    container.querySelector('#catTabs')?.addEventListener('click', e => {
      const t = e.target.closest('[data-category]');
      if (!t) return;
      e.preventDefault();
      this.boardCategory = t.getAttribute('data-category');
      this.refreshCurrentBoard();
    });

    // Search
    container.querySelector('#searchForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const val = container.querySelector('#searchInput').value.trim().toLowerCase();
      this.boardSearch = val;
      this.refreshCurrentBoard();
    });

    container.querySelector('#searchInput')?.addEventListener('input', e => {
      if (!e.target.value) {
        this.boardSearch = '';
        this.refreshCurrentBoard();
      }
    });

    // Write button
    container.querySelector('#openWriteModalBtn')?.addEventListener('click', () => {
      this.openPostWriteModal();
    });

    // Post detail & delete
    container.querySelectorAll('.post-title-link, .btn-view').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.openDetailModal(parseInt(el.getAttribute('data-id')));
      });
    });

    container.querySelectorAll('.btn-delete').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.deletePost(parseInt(el.getAttribute('data-id')));
      });
    });

    const writeForm = document.getElementById('postWriteForm');
    if (writeForm) {
      writeForm.onsubmit = e => {
        e.preventDefault();
        this.handleCreatePost();
      };
    }
  }

  refreshCurrentBoard() {
    if (this.currentPage === 'home') {
      const el = document.getElementById('homeBoardContainer');
      if (el) this.renderBoardTable(el);
    } else if (this.currentPage === 'admin' && this.adminPage === 'board') {
      const el = document.getElementById('adminBoardCard');
      if (el) this.renderBoardTable(el);
      else this.renderBoard();
    }
  }

  // ═══════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════
  renderLogin() {
    this.appRoot.innerHTML = `
    <div class="auth-wrapper bg-body-tertiary">
      <div class="auth-card fade-in">
        <div class="text-center mb-4">
          <a href="#" class="text-decoration-none d-flex align-items-center justify-content-center gap-2 mb-3" data-nav="home">
            <i class="bi bi-kanban-fill fs-3" style="color:var(--jb-primary)"></i>
            <span class="auth-logo">JBoard</span>
          </a>
          <p class="text-body-secondary small">계정에 로그인하여 대시보드에 접속하세요</p>
        </div>

        <div id="loginError" class="alert alert-danger d-none py-2 small" role="alert"></div>

        <form id="loginForm">
          <div class="mb-3">
            <label for="loginEmail" class="form-label small fw-semibold">이메일 주소</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input type="email" class="form-control" id="loginEmail" placeholder="name@example.com" required autofocus />
            </div>
          </div>
          <div class="mb-4">
            <label for="loginPassword" class="form-label small fw-semibold">비밀번호</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input type="password" class="form-control" id="loginPassword" placeholder="비밀번호 입력" required />
              <button type="button" class="password-toggle input-group-text" id="toggleLoginPw"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="rememberMe">
              <label class="form-check-label small" for="rememberMe">로그인 유지</label>
            </div>
            <a href="#" class="small text-decoration-none" style="color:var(--jb-primary)">비밀번호 찾기</a>
          </div>
          <button type="submit" class="btn w-100 text-white fw-semibold py-2" style="background:var(--jb-gradient);border:none;border-radius:10px">
            <i class="bi bi-box-arrow-in-right me-1"></i>로그인
          </button>
        </form>

        <div class="auth-divider">또는</div>

        <div class="text-center">
          <span class="text-body-secondary small">계정이 없으신가요?</span>
          <a href="#" class="small fw-semibold text-decoration-none ms-1" style="color:var(--jb-primary)" data-nav="signup">회원가입</a>
        </div>

        <div class="mt-4 p-3 rounded-3 text-start" style="background:var(--bs-tertiary-bg)">
          <small class="text-body-secondary d-block mb-2 fw-semibold"><i class="bi bi-info-circle me-1"></i>테스트 계정 선택</small>
          <div class="d-flex flex-column gap-2 small">
            <div class="d-flex align-items-center justify-content-between">
              <div><span class="badge bg-danger me-1">관리자</span> <code>admin@jboard.local</code> / <code>admin1234</code></div>
              <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" id="fillAdminBtn" style="font-size:0.78rem">선택</button>
            </div>
            <div class="d-flex align-items-center justify-content-between">
              <div><span class="badge bg-primary me-1">일반회원</span> <code>user@jboard.local</code> / <code>user1234</code></div>
              <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" id="fillUserBtn" style="font-size:0.78rem">선택</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    this.bindNavLinks();

    // Quick fill buttons
    document.getElementById('fillAdminBtn')?.addEventListener('click', () => {
      document.getElementById('loginEmail').value = 'admin@jboard.local';
      document.getElementById('loginPassword').value = 'admin1234';
    });
    document.getElementById('fillUserBtn')?.addEventListener('click', () => {
      document.getElementById('loginEmail').value = 'user@jboard.local';
      document.getElementById('loginPassword').value = 'user1234';
    });

    // Toggle password visibility
    document.getElementById('toggleLoginPw')?.addEventListener('click', () => {
      const inp = document.getElementById('loginPassword');
      const icon = document.querySelector('#toggleLoginPw i');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      icon.className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
    });

    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const pw = document.getElementById('loginPassword').value;
      const result = this.login(email, pw);
      if (result.ok) {
        this.showToast(`${this.currentUser.name}님, 환영합니다! 🎉`, 'success');
        if (this.currentUser.role === 'admin') {
          this.navigate('admin');
        } else {
          this.navigate('home');
        }
      } else {
        const err = document.getElementById('loginError');
        err.textContent = result.msg;
        err.classList.remove('d-none');
      }
    });
  }

  // ═══════════════════════════════════════════════
  // SIGNUP
  // ═══════════════════════════════════════════════
  renderSignup() {
    this.appRoot.innerHTML = `
    <div class="auth-wrapper bg-body-tertiary">
      <div class="auth-card fade-in">
        <div class="text-center mb-4">
          <a href="#" class="text-decoration-none d-flex align-items-center justify-content-center gap-2 mb-3" data-nav="home">
            <i class="bi bi-kanban-fill fs-3" style="color:var(--jb-primary)"></i>
            <span class="auth-logo">JBoard</span>
          </a>
          <p class="text-body-secondary small">무료 계정을 만들고 시작하세요</p>
        </div>

        <div id="signupError" class="alert alert-danger d-none py-2 small" role="alert"></div>
        <div id="signupSuccess" class="alert alert-success d-none py-2 small" role="alert"></div>

        <form id="signupForm">
          <div class="mb-3">
            <label for="signupName" class="form-label small fw-semibold">이름</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input type="text" class="form-control" id="signupName" placeholder="홍길동" required autofocus />
            </div>
          </div>
          <div class="mb-3">
            <label for="signupEmail" class="form-label small fw-semibold">이메일 주소</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input type="email" class="form-control" id="signupEmail" placeholder="name@example.com" required />
            </div>
          </div>
          <div class="mb-3">
            <label for="signupPassword" class="form-label small fw-semibold">비밀번호</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input type="password" class="form-control" id="signupPassword" placeholder="8자 이상 입력" minlength="4" required />
              <button type="button" class="password-toggle input-group-text" id="toggleSignupPw"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <div class="mb-4">
            <label for="signupPasswordConfirm" class="form-label small fw-semibold">비밀번호 확인</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
              <input type="password" class="form-control" id="signupPasswordConfirm" placeholder="비밀번호 재입력" required />
            </div>
          </div>
          <div class="form-check mb-4">
            <input class="form-check-input" type="checkbox" id="agreeTerms" required>
            <label class="form-check-label small" for="agreeTerms">
              <a href="#" class="text-decoration-none" style="color:var(--jb-primary)">이용약관</a> 및
              <a href="#" class="text-decoration-none" style="color:var(--jb-primary)">개인정보처리방침</a>에 동의합니다
            </label>
          </div>
          <button type="submit" class="btn w-100 text-white fw-semibold py-2" style="background:var(--jb-gradient);border:none;border-radius:10px">
            <i class="bi bi-person-plus-fill me-1"></i>회원가입
          </button>
        </form>

        <div class="auth-divider">또는</div>

        <div class="text-center">
          <span class="text-body-secondary small">이미 계정이 있으신가요?</span>
          <a href="#" class="small fw-semibold text-decoration-none ms-1" style="color:var(--jb-primary)" data-nav="login">로그인</a>
        </div>
      </div>
    </div>`;

    this.bindNavLinks();

    document.getElementById('toggleSignupPw')?.addEventListener('click', () => {
      const inp = document.getElementById('signupPassword');
      const icon = document.querySelector('#toggleSignupPw i');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      icon.className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
    });

    document.getElementById('signupForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const pw = document.getElementById('signupPassword').value;
      const pw2 = document.getElementById('signupPasswordConfirm').value;
      const errEl = document.getElementById('signupError');
      const sucEl = document.getElementById('signupSuccess');
      errEl.classList.add('d-none');
      sucEl.classList.add('d-none');

      if (pw !== pw2) { errEl.textContent = '비밀번호가 일치하지 않습니다.'; errEl.classList.remove('d-none'); return; }
      if (pw.length < 4) { errEl.textContent = '비밀번호는 4자 이상이어야 합니다.'; errEl.classList.remove('d-none'); return; }

      const result = this.signup(name, email, pw);
      if (!result.ok) { errEl.textContent = result.msg; errEl.classList.remove('d-none'); return; }

      sucEl.textContent = '🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...';
      sucEl.classList.remove('d-none');
      setTimeout(() => this.navigate('login'), 1500);
    });
  }

  // ═══════════════════════════════════════════════
  // ADMIN LAYOUT (AdminLTE v4 Official Standard)
  // ═══════════════════════════════════════════════
  renderAdmin() {
    const user = this.currentUser;
    const tp = this.posts.length;
    const tv = this.posts.reduce((s,p)=>s+(p.views||0),0);
    const tm = this.members.length;

    this.appRoot.innerHTML = `
    <div class="app-wrapper">
      <!-- ═══ App Header ═══ -->
      <nav class="app-header navbar navbar-expand bg-body shadow-sm px-3">
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
            <li class="nav-item dropdown">
              <a class="nav-link position-relative py-2 px-2" data-bs-toggle="dropdown" href="#" title="알림 목록">
                <i class="bi bi-bell fs-5"></i>
                <span class="position-absolute top-1 start-100 translate-middle badge rounded-pill bg-warning text-dark text-xs">
                  3
                </span>
              </a>
              <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end shadow-sm">
                <span class="dropdown-item dropdown-header fw-bold text-center py-2 bg-body-tertiary">
                  <i class="bi bi-bell-fill me-1 text-warning"></i> 알림 3건
                </span>
                <div class="dropdown-divider m-0"></div>
                <a href="#" class="dropdown-item d-flex align-items-center gap-3 py-2" data-admin-page="board">
                  <i class="bi bi-file-earmark-text-fill text-primary fs-5"></i>
                  <div class="flex-grow-1 text-truncate">
                    <div class="small fw-semibold">신규 게시글 등록됨</div>
                    <small class="text-body-secondary text-xs">시스템 정기 점검 안내</small>
                  </div>
                  <small class="text-body-secondary text-xs">3분 전</small>
                </a>
                <div class="dropdown-divider m-0"></div>
                <a href="#" class="dropdown-item d-flex align-items-center gap-3 py-2" data-admin-page="members">
                  <i class="bi bi-person-check-fill text-success fs-5"></i>
                  <div class="flex-grow-1 text-truncate">
                    <div class="small fw-semibold">신규 회원 가입</div>
                    <small class="text-body-secondary text-xs">윤테스트님이 가입했습니다.</small>
                  </div>
                  <small class="text-body-secondary text-xs">15분 전</small>
                </a>
                <div class="dropdown-divider m-0"></div>
                <a href="#" class="dropdown-item d-flex align-items-center gap-3 py-2" data-admin-page="analytics">
                  <i class="bi bi-graph-up-arrow text-info fs-5"></i>
                  <div class="flex-grow-1 text-truncate">
                    <div class="small fw-semibold">주간 트렌드 업데이트</div>
                    <small class="text-body-secondary text-xs">조회수가 15% 상승했습니다.</small>
                  </div>
                  <small class="text-body-secondary text-xs">1시간 전</small>
                </a>
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
                <li><button type="button" class="dropdown-item d-flex align-items-center" data-bs-theme-value="auto"><i class="bi bi-circle-half me-2 text-secondary"></i>시스템 설정</button></li>
              </ul>
            </li>

            <!-- User Menu Dropdown (AdminLTE 4 Official Standard) -->
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
              </ul>
            </li>
          </ul>
        </div>
      </nav>

      <!-- ═══ App Sidebar ═══ -->
      <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <!-- Sidebar Brand -->
        <div class="sidebar-brand">
          <a href="#" class="brand-link" data-nav="home">
            <i class="bi bi-kanban-fill text-primary fs-3"></i>
            <span class="brand-text fw-light text-white">JBoard <b class="fw-bold">v4</b></span>
            <span class="badge bg-primary-subtle text-primary rounded-pill px-2 py-1 ms-1 text-xs">AdminLTE</span>
          </a>
        </div>

        <!-- Sidebar Navigation -->
        <div class="sidebar-wrapper p-2 d-flex flex-column h-100">
          <nav class="mt-2 flex-grow-1" aria-label="사이드바 메뉴">
            <ul class="nav sidebar-menu flex-column gap-1" data-lte-toggle="treeview" role="menu">
              <li class="nav-header text-uppercase text-xs text-muted px-3 py-1">대시보드 & 메뉴</li>
              ${[
                {page:'dashboard',icon:'bi-speedometer2',color:'info',label:'통합 대시보드'},
                {page:'board',icon:'bi-chat-square-text',color:'primary',label:'게시판 관리',badge:'Hot'},
                {page:'members',icon:'bi-people',color:'success',label:'회원 관리'},
                {page:'analytics',icon:'bi-graph-up',color:'warning',label:'통계 분석'}
              ].map(m => `
                <li class="nav-item">
                  <a href="#" class="nav-link ${this.adminPage===m.page?'active':''} rounded-3 d-flex align-items-center justify-content-between" data-admin-page="${m.page}">
                    <div class="d-flex align-items-center gap-2">
                      <i class="nav-icon bi ${m.icon} text-${m.color}"></i>
                      <p class="fw-medium mb-0">${m.label}</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      ${m.badge ? `<span class="nav-badge badge bg-danger rounded-pill px-2 py-0 text-xs">${m.badge}</span>` : ''}
                      <i class="nav-arrow bi bi-chevron-right opacity-50 text-xs"></i>
                    </div>
                  </a>
                </li>`).join('')}

              <li class="nav-header text-uppercase text-xs text-muted px-3 py-1 mt-3">시스템 설정</li>
              <li class="nav-item">
                <a href="#" class="nav-link ${this.adminPage==='settings'?'active':''} rounded-3 d-flex align-items-center justify-content-between" data-admin-page="settings">
                  <div class="d-flex align-items-center gap-2">
                    <i class="nav-icon bi bi-gear text-secondary"></i>
                    <p class="fw-medium mb-0">환경 설정</p>
                  </div>
                  <i class="nav-arrow bi bi-chevron-right opacity-50 text-xs"></i>
                </a>
              </li>
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
      <footer class="app-footer text-muted py-3 px-4 bg-body border-top">
        <div class="float-end d-none d-sm-inline"><b>AdminLTE</b> 4.9.1 Official Theme</div>
        <strong>© 2026 <a href="#" class="text-decoration-none">JBoard</a>.</strong> All rights reserved.
      </footer>
    </div>`;

    // Bind admin header & nav
    this.bindNavLinks();
    this.bindThemeButtons();
    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => this.logout());

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
      this.openPostWriteModal();
    });

    // Sidebar menu navigation
    document.querySelectorAll('[data-admin-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.adminPage = el.getAttribute('data-admin-page');
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-admin-page="${this.adminPage}"]`)?.classList.add('active');
        this.renderAdminPage();
      });
    });

    this.renderAdminPage();
  }

  renderAdminPage() {
    const pages = {
      dashboard: () => this.renderDashboard(),
      board: () => this.renderBoard(),
      members: () => this.renderMembers(),
      analytics: () => this.renderAnalytics(),
      settings: () => this.renderSettings()
    };
    (pages[this.adminPage] || pages.dashboard)();
  }

  get adminContainer() { return document.getElementById('pageContainer'); }

  pageHeader(title, sub, bread) {
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
  smallBox(val, label, color, icon, targetPage, footerText='자세히 보기') {
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

  badgeClass(cat) {
    return {notice:'bg-danger text-white',tech:'bg-primary text-white',qna:'bg-warning text-dark',free:'bg-secondary text-white',info:'bg-info text-dark'}[cat]||'bg-light text-dark';
  }

  // ═══════════════════════════════════════════════
  // ADMIN PAGES
  // ═══════════════════════════════════════════════
  renderDashboard() {
    const c = this.adminContainer;
    const tp = this.posts.length;
    const tv = this.posts.reduce((s,p)=>s+(p.views||0),0);
    const tl = this.posts.reduce((s,p)=>s+(p.likes||0),0);
    const today = this.posts.filter(p=>p.createdAt.startsWith('2026-09-22')).length;
    const am = this.members.filter(m=>m.status==='active').length;

    c.innerHTML = `
      ${this.pageHeader('통합 대시보드', 'JBoard 실시간 운영 지표 및 활동 현황', '대시보드')}
      
      <!-- ═══ AdminLTE v4 Small Boxes Row ═══ -->
      <div class="row g-3 mb-4">
        ${this.smallBox(tp, '전체 게시글 수', 'primary', 'bi-file-earmark-text-fill', 'board')}
        ${this.smallBox(today, '오늘 신규 등록글', 'success', 'bi-pencil-square', 'board')}
        ${this.smallBox(tv.toLocaleString(), '누적 조회수', 'info', 'bi-eye-fill', 'analytics')}
        ${this.smallBox(this.members.length, `전체 회원 (활성 ${am}명)`, 'warning', 'bi-people-fill', 'members')}
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
                ${[...this.posts].sort((a,b)=>b.likes-a.likes).slice(0,3).map((p,i)=>`
                  <div class="list-group-item d-flex align-items-center gap-3 py-3">
                    <span class="badge bg-${['danger','warning','secondary'][i]} rounded-pill fs-6">${i+1}</span>
                    <div class="flex-grow-1 text-truncate">
                      <a href="#" class="fw-semibold small text-truncate d-block text-decoration-none text-body post-title-link" data-id="${p.id}">${p.title}</a>
                      <small class="text-body-secondary"><i class="bi bi-heart-fill text-danger me-1"></i>추천 ${p.likes} · 조회 ${p.views}</small>
                    </div>
                  </div>`).join('')}
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
                ${this.posts.slice(0,5).map(p=>`
                  <tr>
                    <td class="text-center text-body-secondary">${p.id}</td>
                    <td><span class="badge ${this.badgeClass(p.category)} badge-category">${p.categoryName}</span></td>
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
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.bindCardTools();
    this.renderActivityChart('dashboardActivityChart');

    // Post detail click handlers
    c.querySelectorAll('.post-title-link').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.openDetailModal(parseInt(el.getAttribute('data-id')));
      });
    });

    // Admin nav links in cards
    c.querySelectorAll('[data-admin-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.adminPage = el.getAttribute('data-admin-page');
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-admin-page="${this.adminPage}"]`)?.classList.add('active');
        this.renderAdminPage();
      });
    });
  }

  renderBoard() {
    const c = this.adminContainer;
    c.innerHTML = `
      ${this.pageHeader('게시판 관리', '게시글 실시간 CRUD, 카테고리 필터링 및 검색', '게시판 관리')}
      
      <!-- Small Boxes -->
      <div class="row g-3 mb-4">
        ${this.smallBox(this.posts.length, '전체 게시글', 'primary', 'bi-file-text-fill', 'board')}
        ${this.smallBox(this.posts.filter(p=>p.createdAt.startsWith('2026-09-22')).length, '오늘 신규 등록', 'success', 'bi-pencil-square', 'board')}
        ${this.smallBox(this.posts.reduce((s,p)=>s+(p.views||0),0).toLocaleString(), '누적 조회수', 'info', 'bi-eye-fill', 'analytics')}
        ${this.smallBox(this.posts.reduce((s,p)=>s+(p.likes||0),0).toLocaleString(), '누적 추천수', 'danger', 'bi-heart-fill', 'analytics')}
      </div>

      <div id="adminBoardCard"></div>
    `;

    this.renderBoardTable(document.getElementById('adminBoardCard'));

    c.querySelectorAll('[data-admin-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.adminPage = el.getAttribute('data-admin-page');
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-admin-page="${this.adminPage}"]`)?.classList.add('active');
        this.renderAdminPage();
      });
    });
  }

  renderMembers() {
    const c = this.adminContainer;
    const rl={admin:'관리자',editor:'에디터',member:'일반회원'}, rb={admin:'bg-danger',editor:'bg-primary',member:'bg-secondary'};
    const sl={active:'활성',inactive:'비활성',banned:'정지'}, sb={active:'bg-success',inactive:'bg-warning text-dark',banned:'bg-danger'};

    c.innerHTML = `
      ${this.pageHeader('회원 관리', '전체 회원 현황 및 권한 제어', '회원 관리')}
      
      <!-- Small Boxes -->
      <div class="row g-3 mb-4">
        ${this.smallBox(this.members.length, '전체 등록 회원', 'primary', 'bi-people-fill', 'members')}
        ${this.smallBox(this.members.filter(m=>m.status==='active').length, '현재 활동 회원', 'success', 'bi-person-check-fill', 'members')}
        ${this.smallBox(this.members.filter(m=>m.status==='inactive').length, '미접속 회원', 'warning', 'bi-person-dash-fill', 'members')}
        ${this.smallBox(this.members.filter(m=>m.status==='banned').length, '정지/제재 회원', 'danger', 'bi-person-x-fill', 'members')}
      </div>

      <!-- Member Table Card -->
      <div class="card shadow-sm border-0">
        <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0 fw-bold">
            <i class="bi bi-people me-2 text-success"></i>회원 목록 (${this.members.length}명)
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
                ${this.members.map(m=>`
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
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer bg-body border-top py-3 text-body-secondary small">
          총 ${this.members.length}명의 회원이 등록되어 있습니다.
        </div>
      </div>
    `;

    this.bindCardTools();

    c.querySelectorAll('.btn-mdel').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const id = parseInt(el.getAttribute('data-id'));
        if (!confirm('정말 이 회원을 삭제하시겠습니까?')) return;
        this.members = this.members.filter(m => m.id !== id);
        this.saveData('jboard_members', this.members);
        this.renderMembers();
        this.showToast('회원이 삭제되었습니다.', 'warning');
      });
    });

    c.querySelectorAll('[data-admin-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.adminPage = el.getAttribute('data-admin-page');
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-admin-page="${this.adminPage}"]`)?.classList.add('active');
        this.renderAdminPage();
      });
    });
  }

  renderAnalytics() {
    const c = this.adminContainer;
    const catStats = {};
    this.posts.forEach(p => {
      if (!catStats[p.categoryName]) catStats[p.categoryName] = { count:0, views:0, likes:0 };
      catStats[p.categoryName].count++;
      catStats[p.categoryName].views += p.views || 0;
      catStats[p.categoryName].likes += p.likes || 0;
    });
    const tv = this.posts.reduce((s,p)=>s+(p.views||0),0);
    const tl = this.posts.reduce((s,p)=>s+(p.likes||0),0);
    const avg = this.posts.length ? Math.round(tv / this.posts.length) : 0;
    const au = {}; this.posts.forEach(p => { au[p.author] = (au[p.author]||0) + 1; });
    const sa = Object.entries(au).sort((a,b)=>b[1]-a[1]);

    c.innerHTML = `
      ${this.pageHeader('통계 분석', '게시판 활동 및 트렌드 데이터 인터랙티브 분석', '통계 분석')}
      
      <!-- Small Boxes -->
      <div class="row g-3 mb-4">
        ${this.smallBox(this.posts.length, '총 게시글 수', 'primary', 'bi-file-earmark-bar-graph-fill', 'board')}
        ${this.smallBox(avg.toLocaleString(), '게시글 당 평균 조회', 'info', 'bi-bar-chart-line-fill', 'analytics')}
        ${this.smallBox(tl.toLocaleString(), '전체 누적 추천수', 'danger', 'bi-heart-fill', 'analytics')}
        ${this.smallBox(sa.length, '고유 작성자 수', 'success', 'bi-person-lines-fill', 'members')}
      </div>

      <!-- ApexCharts Row -->
      <div class="row g-3 mb-4">
        <div class="col-lg-8">
          <div class="card card-primary card-outline shadow-sm h-100">
            <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
              <h5 class="card-title mb-0 fw-bold">
                <i class="bi bi-graph-up me-2 text-primary"></i>주간 활동 트렌드 (조회수 및 신규 게시글)
              </h5>
              <div class="card-tools d-flex align-items-center gap-1">
                <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
                <button type="button" class="btn btn-tool" data-lte-toggle="card-remove"><i class="bi bi-x-lg"></i></button>
              </div>
            </div>
            <div class="card-body p-3">
              <div id="analyticsWeeklyChart" style="min-height: 320px;"></div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card card-info card-outline shadow-sm h-100">
            <div class="card-header bg-body border-bottom d-flex justify-content-between align-items-center py-3">
              <h6 class="card-title mb-0 fw-bold">
                <i class="bi bi-pie-chart-fill me-2 text-info"></i>카테고리별 비중 분포
              </h6>
              <div class="card-tools">
                <button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button>
              </div>
            </div>
            <div class="card-body p-3">
              <div id="analyticsCategoryChart" style="min-height: 320px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Row -->
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0 fw-bold"><i class="bi bi-trophy-fill me-2 text-warning"></i>우수 작성자 랭킹</h6>
              <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush">
                ${sa.map(([name,cnt],i)=>{
                  const m=this.members.find(m=>m.name===name);
                  return `
                    <div class="list-group-item d-flex align-items-center gap-3 py-3">
                      <span class="badge bg-${i<3?['danger','warning','info'][i]:'secondary'} rounded-circle d-flex align-items-center justify-content-center" style="width:28px;height:28px">${i+1}</span>
                      <img src="${m?.avatar||`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}" class="rounded-circle border" width="32" height="32">
                      <div class="flex-grow-1"><span class="fw-semibold">${name}</span></div>
                      <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">${cnt}건 등록</span>
                    </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0 fw-bold"><i class="bi bi-fire me-2 text-danger"></i>누적 조회수 TOP 5</h6>
              <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush">
                ${[...this.posts].sort((a,b)=>b.views-a.views).slice(0,5).map((p,i)=>`
                  <div class="list-group-item d-flex align-items-center gap-3 py-3">
                    <span class="badge bg-${i<3?['danger','warning','info'][i]:'secondary'} rounded-circle d-flex align-items-center justify-content-center" style="width:28px;height:28px">${i+1}</span>
                    <div class="flex-grow-1 text-truncate">
                      <a href="#" class="fw-semibold small text-truncate d-block text-decoration-none text-body post-title-link" data-id="${p.id}">${p.title}</a>
                      <small class="text-body-secondary">${p.author} · ${p.categoryName}</small>
                    </div>
                    <span class="badge bg-info-subtle text-info rounded-pill px-3 py-1"><i class="bi bi-eye me-1"></i>${p.views.toLocaleString()}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindCardTools();
    this.renderActivityChart('analyticsWeeklyChart');
    this.renderCategoryDonutChart('analyticsCategoryChart', catStats);

    c.querySelectorAll('.post-title-link').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.openDetailModal(parseInt(el.getAttribute('data-id')));
      });
    });

    c.querySelectorAll('[data-admin-page]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.adminPage = el.getAttribute('data-admin-page');
        document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-admin-page="${this.adminPage}"]`)?.classList.add('active');
        this.renderAdminPage();
      });
    });
  }

  // ── ApexCharts Visualizations ──
  renderActivityChart(containerId) {
    const el = document.getElementById(containerId);
    if (!el || typeof window.ApexCharts === 'undefined') return;

    if (this.charts[containerId]) {
      try { this.charts[containerId].destroy(); } catch {}
    }

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const options = {
      series: [
        { name: '일별 누적 조회수', data: [120, 180, 240, 310, 290, 420, 560] },
        { name: '신규 등록 게시글', data: [2, 4, 1, 6, 3, 5, 8] }
      ],
      chart: {
        type: 'area',
        height: 280,
        toolbar: { show: false },
        background: 'transparent'
      },
      colors: ['#0d6efd', '#20c997'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 2] },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95, 100]
        }
      },
      xaxis: {
        categories: ['9/16(월)', '9/17(화)', '9/18(수)', '9/19(목)', '9/20(금)', '9/21(토)', '9/22(일)'],
        labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } }
      },
      yaxis: [
        { title: { text: '조회수', style: { color: '#0d6efd', fontWeight: 600 } }, labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } } },
        { opposite: true, title: { text: '등록글 (건)', style: { color: '#20c997', fontWeight: 600 } }, labels: { style: { colors: isDark ? '#adb5bd' : '#6c757d' } } }
      ],
      tooltip: { theme: isDark ? 'dark' : 'light' },
      grid: { borderColor: isDark ? '#343a40' : '#e9ecef' },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: isDark ? '#f8f9fa' : '#212529' } }
    };

    const chart = new window.ApexCharts(el, options);
    chart.render();
    this.charts[containerId] = chart;
  }

  renderCategoryDonutChart(containerId, catStats) {
    const el = document.getElementById(containerId);
    if (!el || typeof window.ApexCharts === 'undefined') return;

    if (this.charts[containerId]) {
      try { this.charts[containerId].destroy(); } catch {}
    }

    const labels = Object.keys(catStats || { '공지':1, '기술':2, '질문':1, '자유':1, '정보':1 });
    const series = labels.map(k => catStats ? catStats[k].count : 1);
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    const options = {
      series: series.length ? series : [1, 2, 1, 1, 1],
      labels: labels.length ? labels : ['공지', '기술', '질문', '자유', '정보'],
      chart: {
        type: 'donut',
        height: 320,
        background: 'transparent'
      },
      colors: ['#ef4444', '#0d6efd', '#ffc107', '#6c757d', '#0dcaf0'],
      legend: {
        position: 'bottom',
        labels: { colors: isDark ? '#f8f9fa' : '#212529' }
      },
      dataLabels: { enabled: true },
      stroke: { colors: [isDark ? '#212529' : '#ffffff'], width: 2 },
      tooltip: { theme: isDark ? 'dark' : 'light' }
    };

    const chart = new window.ApexCharts(el, options);
    chart.render();
    this.charts[containerId] = chart;
  }

  // ── Card Tools Controller ──
  bindCardTools() {
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

  renderSettings() {
    const c = this.adminContainer;
    const ct = localStorage.getItem('lte-theme')||'light';
    c.innerHTML = `
      ${this.pageHeader('환경 설정', '시스템 운영 및 보안 환경설정', '환경 설정')}
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card card-primary card-outline shadow-sm mb-4">
            <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0 fw-bold"><i class="bi bi-sliders me-2 text-primary"></i>기본 시스템 설정</h5>
              <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
            </div>
            <div class="card-body p-4">
              <form id="settingsForm">
                <div class="mb-4">
                  <label class="form-label fw-semibold">플랫폼 명칭</label>
                  <input type="text" class="form-control" value="JBoard v4">
                  <div class="form-text">헤더 및 사이드바 로고에 표시되는 플랫폼 이름입니다.</div>
                </div>
                <div class="mb-4">
                  <label class="form-label fw-semibold">사이트 설명</label>
                  <textarea class="form-control" rows="2">AdminLTE 4 기반 모던 커뮤니티 및 관리자 대시보드 플랫폼</textarea>
                </div>
                <hr class="my-4">
                <h6 class="fw-bold mb-3"><i class="bi bi-shield-lock me-2 text-primary"></i>보안 및 접근 정책</h6>
                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="sett_captcha" checked>
                    <label class="form-check-label fw-medium" for="sett_captcha">회원가입 시 스팸 방지 검증</label>
                  </div>
                </div>
                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="sett_notice">
                    <label class="form-check-label fw-medium" for="sett_notice">신규 글 관리자 사전 검토제</label>
                  </div>
                </div>
                <hr class="my-4">
                <h6 class="fw-bold mb-3"><i class="bi bi-bell me-2 text-warning"></i>실시간 알림 수신</h6>
                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="sett_alert1" checked>
                    <label class="form-check-label fw-medium" for="sett_alert1">신규 댓글 등록 시 실시간 토스트 알림</label>
                  </div>
                </div>
                <div class="mb-3">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="sett_alert2" checked>
                    <label class="form-check-label fw-medium" for="sett_alert2">새 공지사항 등록 시 헤더 배지 업데이트</label>
                  </div>
                </div>
                <div class="text-end mt-4">
                  <button type="submit" class="btn btn-primary px-4 fw-semibold">
                    <i class="bi bi-check-lg me-1"></i>설정 저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card card-info card-outline shadow-sm mb-4">
            <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0 fw-bold"><i class="bi bi-palette me-2 text-info"></i>테마 스킨 설정</h6>
              <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
            </div>
            <div class="card-body p-4">
              <div class="d-grid gap-2">
                <button class="btn ${ct==='light'?'btn-warning':'btn-outline-warning'} d-flex align-items-center gap-2" data-bs-theme-value="light"><i class="bi bi-sun-fill"></i>라이트 모드</button>
                <button class="btn ${ct==='dark'?'btn-primary':'btn-outline-primary'} d-flex align-items-center gap-2" data-bs-theme-value="dark"><i class="bi bi-moon-stars-fill"></i>다크 모드</button>
                <button class="btn ${ct==='auto'?'btn-secondary':'btn-outline-secondary'} d-flex align-items-center gap-2" data-bs-theme-value="auto"><i class="bi bi-circle-half"></i>시스템 자동 설정</button>
              </div>
            </div>
          </div>

          <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-body border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0 fw-bold"><i class="bi bi-info-circle me-2 text-primary"></i>시스템 정보</h6>
              <div class="card-tools"><button type="button" class="btn btn-tool" data-lte-toggle="card-collapse"><i class="bi bi-dash-lg"></i></button></div>
            </div>
            <div class="list-group list-group-flush">
              ${[['프레임워크','AdminLTE v4.9.1'],['차트 엔진','ApexCharts v3.37'],['UI 라이브러리','Bootstrap 5.3'],['타이포그래피','Source Sans 3'],['개발 번들러','Vite v8.3'],['서비스 포트','Localhost:3000']].map(([k,v])=>`
                <div class="list-group-item d-flex justify-content-between py-2">
                  <span class="text-body-secondary small">${k}</span>
                  <span class="fw-semibold small">${v}</span>
                </div>`).join('')}
            </div>
          </div>

          <div class="card shadow-sm border-danger border-opacity-25">
            <div class="card-header bg-danger-subtle border-bottom py-3">
              <h6 class="card-title mb-0 fw-bold text-danger"><i class="bi bi-exclamation-triangle me-2"></i>데이터 초기화</h6>
            </div>
            <div class="card-body p-4">
              <p class="small text-body-secondary mb-3">모든 게시글 및 회원 데이터를 초기 데모 상태로 리셋합니다.</p>
              <button class="btn btn-outline-danger btn-sm w-100" id="dangerResetBtn">
                <i class="bi bi-arrow-counterclockwise me-1"></i>전체 데이터 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindCardTools();
    this.bindThemeButtons();

    document.getElementById('settingsForm')?.addEventListener('submit', e => {
      e.preventDefault();
      this.showToast('환경 설정이 성공적으로 저장되었습니다! ✅', 'success');
    });

    document.getElementById('dangerResetBtn')?.addEventListener('click', () => {
      if (!confirm('모든 데이터를 초기 상태로 리셋하시겠습니까?')) return;
      this.posts = structuredClone(DEFAULT_POSTS);
      this.members = structuredClone(DEFAULT_MEMBERS);
      this.saveData('jboard_posts', this.posts);
      this.saveData('jboard_members', this.members);
      this.showToast('데이터가 초기화되었습니다.', 'warning');
      this.renderSettings();
    });
  }

  // ═══════════════════════════════════════════════
  // QUILL & DROPZONE & POST CRUD
  // ═══════════════════════════════════════════════
  initQuillEditor() {
    const container = document.getElementById('quillEditorContainer');
    if (!container) return;
    container.innerHTML = '';

    this.quill = new Quill(container, {
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

    // Clipboard paste handler for images (e.g. Snipping Tool screenshots or copied web images)
    this.quill.root.addEventListener('paste', async (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      for (const item of clipboardData.items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            this.showToast('클립보드 이미지를 업로드하고 있습니다... ⏳', 'info');
            try {
              const uploaded = await api.uploadFile(file);
              const range = this.quill.getSelection(true) || { index: this.quill.getLength() };
              this.quill.insertEmbed(range.index, 'image', uploaded.url);
              this.quill.setSelection(range.index + 1);
              this.showToast('이미지가 본문에 성공적으로 삽입되었습니다! 🖼️', 'success');
            } catch (err) {
              console.error('Image paste upload error:', err);
              this.showToast('이미지 업로드에 실패했습니다.', 'danger');
            }
          }
        }
      }
    });

    // Custom toolbar image button handler
    const toolbar = this.quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (file) {
          this.showToast('이미지 업로드 중... ⏳', 'info');
          try {
            const uploaded = await api.uploadFile(file);
            const range = this.quill.getSelection(true) || { index: this.quill.getLength() };
            this.quill.insertEmbed(range.index, 'image', uploaded.url);
            this.quill.setSelection(range.index + 1);
            this.showToast('이미지가 본문에 삽입되었습니다.', 'success');
          } catch (err) {
            this.showToast('이미지 업로드 실패', 'danger');
          }
        }
      };
      fileInput.click();
    });
  }

  setupDropzone() {
    const dropzone = document.getElementById('multiFileDropzone');
    const fileInput = document.getElementById('multiFileInput');
    if (!dropzone || !fileInput) return;

    dropzone.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
      this.addFilesToQueue(Array.from(e.target.files));
      fileInput.value = '';
    };

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.addFilesToQueue(files);
      }
    });
  }

  addFilesToQueue(files) {
    files.forEach(file => {
      if (!this.attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.attachedFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'ready'
        });
      }
    });
    this.renderAttachedFilesList();
    this.showToast(`${files.length}개 파일이 첨부 큐에 추가되었습니다.`, 'info');
  }

  renderAttachedFilesList() {
    const container = document.getElementById('attachedFilesList');
    const countBadge = document.getElementById('dropzoneCountBadge');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = `${this.attachedFiles.length}개 첨부됨`;
      countBadge.className = this.attachedFiles.length > 0 ? 'badge bg-primary' : 'badge bg-secondary-subtle text-secondary';
    }

    if (this.attachedFiles.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.attachedFiles.map((item, idx) => {
      let icon = 'bi-file-earmark';
      if (item.type?.startsWith('image/')) icon = 'bi-file-earmark-image text-primary';
      else if (item.type?.includes('pdf')) icon = 'bi-file-earmark-pdf text-danger';
      else if (item.type?.includes('zip') || item.type?.includes('compressed')) icon = 'bi-file-earmark-zip text-warning';
      else if (item.type?.includes('word') || item.type?.includes('document')) icon = 'bi-file-earmark-word text-info';

      const formattedSize = this.formatFileSize(item.size);

      return `
        <div class="attached-file-item" data-index="${idx}">
          <div class="attached-file-info">
            <i class="bi ${icon} fs-5"></i>
            <span class="attached-file-name" title="${this.escapeHtml(item.name)}">${this.escapeHtml(item.name)}</span>
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
        this.attachedFiles.splice(idx, 1);
        this.renderAttachedFilesList();
      };
    });
  }

  openPostWriteModal() {
    const authorInput = document.getElementById('postAuthor');
    if (authorInput) {
      authorInput.value = this.currentUser ? this.currentUser.name : (authorInput.value || '관리자');
    }
    const modalEl = document.getElementById('postWriteModal');
    if (!modalEl) return;

    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();

    setTimeout(() => {
      this.initQuillEditor();
      this.attachedFiles = [];
      this.renderAttachedFilesList();
      this.setupDropzone();
    }, 150);
  }

  async handleCreatePost() {
    const title = document.getElementById('postTitle').value.trim();
    const author = document.getElementById('postAuthor').value.trim();
    const cat = document.getElementById('postCategory').value;
    const catN = document.getElementById('postCategory').selectedOptions[0].text;
    const notice = document.getElementById('postIsNotice').checked;

    const content = this.quill ? this.quill.root.innerHTML : document.getElementById('postContent').value.trim();
    const textContent = this.quill ? this.quill.getText().trim() : content;

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
      // 1. Upload any pending attachments to Vercel Blob
      const finalAttachments = [];
      for (const item of this.attachedFiles) {
        if (item.url) {
          finalAttachments.push({ name: item.name, size: item.size, type: item.type, url: item.url });
        } else if (item.file) {
          const uploaded = await api.uploadFile(item.file);
          finalAttachments.push(uploaded);
        }
      }

      const finalTitle = notice ? `📢 ${title}` : title;
      const authorEmail = this.currentUser ? this.currentUser.email : 'guest@jboard.local';

      // 2. Call Serverless API (Neon DB or fallback)
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

      const newId = newPostData ? newPostData.id : (this.posts.length ? Math.max(...this.posts.map(p => p.id)) + 1 : 1);
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
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        isNotice: notice
      };

      this.posts.unshift(newPost);
      this.saveData('jboard_posts', this.posts);

      document.getElementById('postWriteForm').reset();
      if (this.quill) this.quill.setContents([]);
      this.attachedFiles = [];
      this.renderAttachedFilesList();

      bootstrap.Modal.getInstance(document.getElementById('postWriteModal'))?.hide();
      this.refreshCurrentBoard();
      this.showToast('새 글이 성공적으로 등록되었습니다! 🎉', 'success');
    } catch (err) {
      console.error('Post creation error:', err);
      this.showToast(err.message || '게시글 등록 중 오류가 발생했습니다.', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '게시글 등록';
      }
    }
  }

  async openDetailModal(id) {
    let p = this.posts.find(x => x.id === id);
    try {
      const res = await api.getPost(id);
      if (res.post) {
        p.views = res.post.views;
        p.likes = res.post.likes;
        p.comments = (res.comments || []).map(c => ({
          author: c.author,
          date: (c.created_at || '').replace('T', ' ').substring(0, 16),
          content: c.content
        }));
        if (res.post.attachments) {
          p.attachments = typeof res.post.attachments === 'string' ? JSON.parse(res.post.attachments) : res.post.attachments;
        }
      }
    } catch (e) {
      p.views = (p.views || 0) + 1;
    }

    this.saveData('jboard_posts', this.posts);
    this.refreshCurrentBoard();

    document.getElementById('detailTitle').textContent = p.title;
    document.getElementById('detailMeta').innerHTML = `
      <div class="d-flex align-items-center gap-3 text-muted small">
        <span class="d-flex align-items-center gap-1">
          <img src="${p.authorAvatar}" width="22" height="22" class="rounded-circle border">
          <strong class="text-body">${this.escapeHtml(p.author)}</strong>
        </span>
        <span><i class="bi bi-calendar3 me-1"></i>${p.createdAt}</span>
        <span><i class="bi bi-eye me-1"></i>${p.views}</span>
        <span><i class="bi bi-heart me-1 text-danger"></i>${p.likes}</span>
      </div>
    `;

    // Render Rich Content (supports HTML from Quill)
    const isHtml = p.content.includes('<p>') || p.content.includes('<div>') || p.content.includes('<img');
    document.getElementById('detailContent').innerHTML = isHtml ? p.content : p.content.replace(/\n/g, '<br>');

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

        const formattedSize = this.formatFileSize(att.size);
        return `
          <a href="${att.url}" target="_blank" download="${this.escapeHtml(att.name)}" class="detail-attachment-badge" title="다운로드/열기">
            <i class="bi ${icon}"></i>
            <span>${this.escapeHtml(att.name)}</span>
            <span class="badge bg-secondary-subtle text-secondary small">${formattedSize}</span>
            <i class="bi bi-download ms-1 opacity-75"></i>
          </a>
        `;
      }).join('');
    } else {
      attachContainer.classList.add('d-none');
    }

    document.getElementById('detailLikeBtn').onclick = async () => {
      try { await api.likePost(id); } catch {}
      p.likes++;
      this.saveData('jboard_posts', this.posts);
      this.refreshCurrentBoard();
      this.openDetailModal(id);
      this.showToast('추천! ❤️');
    };

    const comments = p.comments || [];
    document.getElementById('detailCommentCount').textContent = `댓글 (${comments.length})`;
    document.getElementById('commentsList').innerHTML = !comments.length
      ? '<p class="text-muted small my-2">첫 댓글을 남겨보세요!</p>'
      : comments.map(c => `
        <div class="border-bottom py-2">
          <div class="d-flex justify-content-between text-muted small mb-1">
            <strong>${this.escapeHtml(c.author)}</strong>
            <span>${c.date}</span>
          </div>
          <div class="small">${this.escapeHtml(c.content)}</div>
        </div>
      `).join('');

    document.getElementById('commentAddForm').onsubmit = async (e) => {
      e.preventDefault();
      const a = document.getElementById('commentAuthor').value.trim() || '익명';
      const t = document.getElementById('commentText').value.trim();
      if (!t) return;
      try {
        await api.addComment({ post_id: id, author: a, author_email: '', content: t });
      } catch {}
      p.comments.push({ author: a, date: new Date().toISOString().replace('T', ' ').substring(0, 16), content: t });
      this.saveData('jboard_posts', this.posts);
      document.getElementById('commentText').value = '';
      this.refreshCurrentBoard();
      this.openDetailModal(id);
      this.showToast('댓글이 등록되었습니다.');
    };

    const el = document.getElementById('postDetailModal');
    (bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el)).show();
  }

  async deletePost(id) {
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.deletePost(id);
    } catch (e) {
      console.warn('API delete error, deleting locally:', e);
    }
    this.posts = this.posts.filter(p => p.id !== id);
    this.saveData('jboard_posts', this.posts);
    this.refreshCurrentBoard();
    this.showToast('삭제됨', 'warning');
  }

  // ═══════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════
  showToast(msg, type='primary') {
    const ct=document.getElementById('toastContainer');if(!ct)return;
    const id='t_'+Date.now();
    ct.insertAdjacentHTML('beforeend',`<div id="${id}" class="toast align-items-center text-bg-${type} border-0 shadow" role="alert"><div class="d-flex"><div class="toast-body"><i class="bi bi-info-circle-fill me-2"></i>${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`);
    const el=document.getElementById(id);new bootstrap.Toast(el,{delay:3000}).show();el.addEventListener('hidden.bs.toast',()=>el.remove());
  }
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => { window.jboardApp = new JBoardApp(); });
