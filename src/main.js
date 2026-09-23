// ═══════════════════════════════════════════════════════════
// JnewsBoard — Main Application Controller & Router
// ═══════════════════════════════════════════════════════════
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'admin-lte/dist/css/adminlte.min.css';
import * as bootstrap from 'bootstrap';
import './style.css';
import Quill from 'quill';

// Mock Data
import { DEFAULT_POSTS, DEFAULT_MEMBERS, DEFAULT_USERS, DEFAULT_CATEGORIES } from './data/mock-data.js';

// Utilities
import { upgradeLocalPasswordStore } from './utils/security.js';
import { showToast, escapeHtml, formatFileSize, formatLocalTime, badgeClass, pageHeader, smallBox } from './utils/ui-helpers.js';

// Auth Manager
import { syncWithBackend, signup, login, touchMemberLogin, loginLocal, logout, openWithdrawModal, handleWithdraw } from './auth/auth-manager.js';

// Views
import { renderPublicLanding, renderPublicNews } from './home/home-view.js';
import { renderLogin, renderSignup } from './auth/auth-views.js';
import { renderMemberBoard, renderBoardTable, refreshCurrentBoard } from './board/member-view.js';
import { initQuillEditor, setupDropzone, addFilesToQueue, renderAttachedFilesList, openPostWriteModal, handleCreatePost } from './board/post-write-modal.js';
import { openDetailModal, deletePost } from './board/post-detail-modal.js';
import { renderAdmin, renderAdminPage, renderNewsDesk, buildNotifications, refreshNotifications, markNotificationsSeen } from './admin/admin-layout.js';
import { renderDashboard } from './admin/admin-dashboard.js';
import { renderBoard, openCategoryModal, deleteCategory } from './admin/admin-board.js';
import { renderMembers } from './admin/admin-members.js';
import { renderAnalytics, renderActivityChart, renderCategoryDonutChart, renderSettings } from './admin/admin-analytics.js';

window.bootstrap = bootstrap;
window.Quill = Quill;

export { DEFAULT_CATEGORIES };

class JBoardApp {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.posts = this.loadData('jboard_posts', DEFAULT_POSTS);
    this.members = this.loadData('jboard_members', DEFAULT_MEMBERS);
    this.users = this.loadData('jboard_users', DEFAULT_USERS);
    this.categories = this.loadData('jboard_categories', DEFAULT_CATEGORIES);

    // 기존 테스트 계정 이메일 마이그레이션 (@jboard.local → @jboard.co.kr)
    const emailMigration = {
      'admin@jboard.local': 'admin@jboard.co.kr',
      'user@jboard.local': 'user@jboard.co.kr'
    };
    let migrated = false;
    this.users.forEach(u => {
      if (u && emailMigration[u.email]) {
        u.email = emailMigration[u.email];
        migrated = true;
      }
    });
    if (migrated) this.saveData('jboard_users', this.users);

    // Ensure default users exist
    DEFAULT_USERS.forEach(du => {
      if (!this.users.some(u => u.email === du.email)) {
        this.users.push(du);
        this.saveData('jboard_users', this.users);
      }
    });

    upgradeLocalPasswordStore(this.users, (k, d) => this.saveData(k, d));

    this.currentUser = this.loadData('jboard_currentUser', null);
    // 로그인 유지 중인 계정도 새 이메일로 동기화
    if (this.currentUser) {
      const emailMigration = {
        'admin@jboard.local': 'admin@jboard.co.kr',
        'user@jboard.local': 'user@jboard.co.kr'
      };
      if (emailMigration[this.currentUser.email]) {
        this.currentUser.email = emailMigration[this.currentUser.email];
        this.saveData('jboard_currentUser', this.currentUser);
      }
    }
    this.currentPage = 'home';
    this.adminPage = 'dashboard';
    this.memberTab = 'news';
    this.newsController = null;
    this.boardCategory = 'all';
    this.boardSearch = '';
    this.boardPage = 1;
    this.boardPageSize = 15;
    this.adminBoardTab = 'posts';
    this.charts = {};
    this.attachedFiles = [];
    this.quill = null;

    this.initTheme();

    if (!this.currentUser) {
      this.navigate('home');
    } else if (this.currentUser.role === 'admin') {
      this.navigate('admin');
    } else {
      this.navigate('home');
    }

    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.pub-navbar');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    });

    this.syncWithBackend();

    if (!this.notifTimer) {
      this.notifTimer = setInterval(() => {
        if (document.getElementById('notifList')) this.refreshNotifications();
      }, 30000);
    }

    const writeForm = document.getElementById('postWriteForm');
    if (writeForm) {
      writeForm.onsubmit = (e) => {
        e.preventDefault();
        this.handleCreatePost();
      };
    }
  }

  // Storage
  loadData(k, fallback) {
    try { const d = localStorage.getItem(k); if (d) return JSON.parse(d); } catch {}
    if (fallback !== null) localStorage.setItem(k, JSON.stringify(fallback));
    return fallback ? structuredClone(fallback) : null;
  }
  saveData(k, d) { localStorage.setItem(k, JSON.stringify(d)); }

  // Theme
  initTheme() { this.applyTheme(localStorage.getItem('lte-theme') || 'light'); }
  applyTheme(theme) {
    const resolved = theme === 'auto' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : theme;
    document.documentElement.setAttribute('data-bs-theme', resolved);
    localStorage.setItem('lte-theme', theme);
    if (this.currentPage === 'admin' && (this.adminPage === 'dashboard' || this.adminPage === 'analytics')) {
      setTimeout(() => this.renderAdminPage(), 50);
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

  // Helpers
  escapeHtml(str) { return escapeHtml(str); }
  formatFileSize(b) { return formatFileSize(b); }
  formatLocalTime(i) { return formatLocalTime(i); }
  badgeClass(cat) { return badgeClass(cat, this.categories); }
  pageHeader(t, s, b) { return pageHeader(t, s, b); }
  smallBox(v, l, c, i, t, f) { return smallBox(v, l, c, i, t, f); }
  showToast(m, t) { showToast(m, t); }
  getCategoryName(cat) {
    const found = this.categories?.find(c => c.id === cat);
    if (found) return found.name;
    const map = { tech: '기술', notice: '공지', qna: '질문', free: '자유', info: '정보', '기술': '기술', '공지': '공지', '질문': '질문', '자유': '자유', '정보': '정보' };
    return map[cat] || cat || '자유';
  }
  get adminContainer() { return document.getElementById('pageContainer'); }

  // Auth delegators
  async syncWithBackend() { return syncWithBackend(this); }
  async signup(name, email, password) { return signup(this, name, email, password); }
  async login(email, password) { return login(this, email, password); }
  touchMemberLogin(email) { touchMemberLogin(this, email); }
  async loginLocal(email, password) { return loginLocal(this, email, password); }
  logout() { logout(this); }
  openWithdrawModal() { openWithdrawModal(this); }
  async handleWithdraw() { return handleWithdraw(this); }

  // Router
  navigate(page) {
    this.currentPage = page;
    window.scrollTo(0, 0);
    const body = document.body;
    body.className = '';

    switch(page) {
      case 'home':
        if (!this.currentUser) {
          this.renderPublicLanding();
        } else if (this.currentUser.role === 'admin') {
          body.className = 'layout-fixed sidebar-expand-lg bg-body-tertiary';
          this.renderAdmin();
        } else {
          this.renderMemberBoard();
        }
        break;
      case 'landing':
        this.renderPublicLanding();
        break;
      case 'news':
        if (!this.currentUser) {
          this.renderPublicNews();
        } else if (this.currentUser.role === 'admin') {
          body.className = 'layout-fixed sidebar-expand-lg bg-body-tertiary';
          this.adminPage = 'news';
          this.renderAdmin();
        } else {
          this.memberTab = 'news';
          this.renderMemberBoard();
        }
        break;
      case 'board':
        if (!this.currentUser) {
          this.showToast('로그인이 필요합니다.', 'info');
          this.navigate('login');
          return;
        }
        if (this.currentUser.role === 'admin') {
          body.className = 'layout-fixed sidebar-expand-lg bg-body-tertiary';
          this.adminPage = 'board';
          this.renderAdmin();
        } else {
          this.memberTab = 'board';
          this.renderMemberBoard();
        }
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

  bindNavLinks() {
    this.appRoot.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); this.navigate(el.getAttribute('data-nav')); });
    });
  }

  // Views delegation
  renderPublicLanding() { renderPublicLanding(this); }
  renderPublicNews() { renderPublicNews(this); }
  renderLogin() { renderLogin(this); }
  renderSignup() { renderSignup(this); }
  renderMemberBoard() { renderMemberBoard(this); }
  renderBoardTable(container) { renderBoardTable(this, container); }
  refreshCurrentBoard() { refreshCurrentBoard(this); }

  // Post Modals delegation
  initQuillEditor() { initQuillEditor(this); }
  setupDropzone() { setupDropzone(this); }
  addFilesToQueue(files) { addFilesToQueue(this, files); }
  renderAttachedFilesList() { renderAttachedFilesList(this); }
  openPostWriteModal(editId = null, initialData = null) { openPostWriteModal(this, editId, initialData); }
  async handleCreatePost() { return handleCreatePost(this); }
  async openDetailModal(id) { return openDetailModal(this, id); }
  async deletePost(id) { return deletePost(this, id); }

  // Admin delegation
  renderAdmin() { renderAdmin(this); }
  renderAdminPage() { renderAdminPage(this); }
  renderNewsDesk() { renderNewsDesk(this); }
  buildNotifications() { return buildNotifications(this); }
  refreshNotifications() { refreshNotifications(this); }
  markNotificationsSeen() { markNotificationsSeen(this); }
  renderDashboard() { renderDashboard(this); }
  renderBoard() { renderBoard(this); }
  openCategoryModal(catId = null) { openCategoryModal(this, catId); }
  deleteCategory(catId) { deleteCategory(this, catId); }
  renderMembers() { renderMembers(this); }
  renderAnalytics() { renderAnalytics(this); }
  renderActivityChart(containerId) { renderActivityChart(this, containerId); }
  renderCategoryDonutChart(containerId, catStats) { renderCategoryDonutChart(this, containerId, catStats); }
  renderSettings() { renderSettings(this); }
}

document.addEventListener('DOMContentLoaded', () => { window.jboardApp = new JBoardApp(); });
