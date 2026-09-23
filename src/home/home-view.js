// ═══════════════════════════════════════════════════════════
// Public Homepage & Public News Landing Views
// ═══════════════════════════════════════════════════════════
import { NewsDeskController } from '../news/news-view.js';

export function renderPublicLanding(app) {
  const totalPosts = app.posts.length;
  const totalMembers = app.members.length;
  const totalViews = app.posts.reduce((s, p) => s + (p.views || 0), 0);
  const recentPosts = app.posts.slice(0, 6);

  app.appRoot.innerHTML = `
  <!-- ═══ Navbar ═══ -->
  <nav class="pub-navbar">
    <div class="container-fluid px-3 px-xl-5">
      <div class="d-flex align-items-center justify-content-between py-2">
        <a href="#" class="d-flex align-items-center gap-2 text-decoration-none" data-nav="home">
          <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
          <span class="fw-bold fs-5 text-body">J뉴스보드</span>
        </a>
        <div class="d-none d-md-flex align-items-center gap-1">
          <a href="#" class="nav-link text-body fw-semibold d-flex align-items-center gap-1" data-nav="news">
            <i class="bi bi-newspaper text-danger"></i>실시간 뉴스 <span class="badge bg-danger rounded-pill px-1 text-xs">AI</span>
          </a>
          <a href="#updates" class="nav-link text-body-secondary">최신 업데이트</a>
          <a href="#posts" class="nav-link text-body-secondary">최신 소식</a>
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

          <a href="#" class="btn btn-sm btn-primary rounded-pill px-3" data-nav="login">로그인 / 무료 회원가입</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- ═══ Latest Updates (What's New) ═══ -->
  <section class="feature-section bg-body-tertiary" id="updates">
    <div class="container-fluid px-3 px-xl-5">
      <div class="text-center mb-5">
        <span class="section-label mb-3"><i class="bi bi-sparkles"></i> What's New</span>
        <h2 class="section-title mt-3">최신 업데이트</h2>
        <p class="text-body-secondary mx-auto" style="max-width:600px">실시간 뉴스 AI 분석과 클라우드 백엔드, 에디터 개선까지 — 새로 추가된 기능을 메인 홈페이지에서 바로 확인하세요.</p>
      </div>
      <div class="row g-4">
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-danger rounded-pill px-2 py-1 text-xs">NEW</span>
              <small class="text-body-secondary">실시간 뉴스 데스크</small>
            </div>
            <div class="feature-icon bg-danger-subtle text-danger"><i class="bi bi-newspaper"></i></div>
            <h5 class="fw-bold mb-2">실시간 AI 뉴스 수집 · 분석</h5>
            <p class="text-body-secondary small mb-3">구글 뉴스 RSS를 국가·카테고리·기간별로 수집하고, 시간대 필터(1시간~이번주)와 검색 모드(OR/AND)로 원하는 기사만 골라봅니다.</p>
            <a href="#" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)" data-nav="news">뉴스 데스크 바로가기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-danger rounded-pill px-2 py-1 text-xs">NEW</span>
              <small class="text-body-secondary">Gemini AI 브리핑</small>
            </div>
            <div class="feature-icon bg-primary-subtle text-primary"><i class="bi bi-robot"></i></div>
            <h5 class="fw-bold mb-2">Gemini 심층 브리핑 리포트</h5>
            <p class="text-body-secondary small mb-3">선택한 기사를 5·7·10줄 요약으로 분석하고, HTML 다운로드·새 탭 열기·게시판 바로 등록까지 한 번에 처리합니다.</p>
            <a href="#" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)" data-nav="news">AI 브리핑 체험하기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-success rounded-pill px-2 py-1 text-xs">UPDATE</span>
              <small class="text-body-secondary">한글 번역</small>
            </div>
            <div class="feature-icon bg-success-subtle text-success"><i class="bi bi-translate"></i></div>
            <h5 class="fw-bold mb-2">영문 뉴스 한글 자동 번역</h5>
            <p class="text-body-secondary small mb-3">미국 뉴스 선택 시 한글 번역을 자동으로 켜고, 원문·번역문을 버튼 하나로 전환할 수 있습니다.</p>
            <a href="#" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)" data-nav="news">번역 기능 보기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-success rounded-pill px-2 py-1 text-xs">UPDATE</span>
              <small class="text-body-secondary">리치 에디터</small>
            </div>
            <div class="feature-icon bg-warning-subtle text-warning"><i class="bi bi-pencil-square"></i></div>
            <h5 class="fw-bold mb-2">Quill 에디터 이미지 붙여넣기</h5>
            <p class="text-body-secondary small mb-3">스크린샷을 복사해 본문에 Ctrl+V로 붙여넣으면 Vercel Blob CDN에 자동 업로드되고 이미지가 바로 삽입됩니다.</p>
            <a href="#posts" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)">게시판에서 써보기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-success rounded-pill px-2 py-1 text-xs">UPDATE</span>
              <small class="text-body-secondary">첨부파일</small>
            </div>
            <div class="feature-icon bg-info-subtle text-info"><i class="bi bi-cloud-arrow-up"></i></div>
            <h5 class="fw-bold mb-2">멀티 파일 드래그앤드롭 첨부</h5>
            <p class="text-body-secondary small mb-3">여러 파일을 끌어다 놓으면 유형별 아이콘·용량 표시와 함께 첨부 큐에 담기고, 개별 삭제 후 게시글과 함께 저장됩니다.</p>
            <a href="#posts" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)">첨부 기능 보기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
        <div class="col-md-6 col-lg-4">
          <div class="feature-card h-100">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-success rounded-pill px-2 py-1 text-xs">UPDATE</span>
              <small class="text-body-secondary">클라우드 백엔드</small>
            </div>
            <div class="feature-icon bg-secondary-subtle text-secondary"><i class="bi bi-database-check"></i></div>
            <h5 class="fw-bold mb-2">Neon Postgres + Vercel 백엔드</h5>
            <p class="text-body-secondary small mb-3">게시글·회원·통계를 Neon DB에 영구 저장하고, /api/rss·/api/translate 프록시로 뉴스와 번역을 안정적으로 제공합니다.</p>
            <a href="#posts" class="small fw-semibold text-decoration-none" style="color:var(--jb-primary)" data-nav="login">로그인하고 확인하기 <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ Recent Posts Preview ═══ -->
  <section class="posts-section" id="posts">
    <div class="container-fluid px-3 px-xl-5">
      <div class="text-center mb-5">
        <span class="section-label mb-3"><i class="bi bi-file-earmark-text-fill"></i> Community</span>
        <h2 class="section-title mt-3">최신 소식</h2>
        <p class="text-body-secondary">활발한 커뮤니티에서 최신 정보를 만나보세요. 로그인 또는 무료 회원가입 시 전체 글을 볼 수 있습니다.</p>
      </div>
      <div class="row g-3">
        ${recentPosts
          .map(
            p => `
          <div class="col-md-6 col-lg-4">
            <div class="post-preview-card h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge ${app.badgeClass(p.category)} badge-category">${p.categoryName}</span>
                <small class="text-body-secondary">${p.createdAt.split(' ')[0]}</small>
              </div>
              <h6 class="fw-bold mb-2 text-truncate">${p.title}</h6>
              <p class="text-body-secondary small mb-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${(p.content || '').replace(/<[^>]*>?/gm, '')}</p>
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
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <!-- ═══ CTA ═══ -->
  <section class="cta-section" id="contact">
    <div class="container-fluid px-3 px-xl-5">
      <div class="cta-box text-center">
        <h2 class="fw-bold mb-3" style="font-size:clamp(1.5rem,3vw,2.2rem)">지금 바로 J뉴스보드를 시작하세요</h2>
        <p class="opacity-75 mb-4 mx-auto" style="max-width:500px">무료로 가입하고 실시간 AI 뉴스와 활발한 커뮤니티 소통을 경험해 보세요.</p>
        <div class="d-flex flex-wrap justify-content-center gap-3">
          <a href="#" class="hero-cta" style="background:#fff;color:var(--jb-primary);border:2px solid #fff" data-nav="login">
            <i class="bi bi-rocket-takeoff-fill"></i> 로그인 / 무료 회원가입
          </a>
        </div>
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
            <span class="fw-bold fs-5">J뉴스보드</span>
          </div>
          <p class="text-body-secondary small">AdminLTE 4 기반의 차세대 커뮤니티 플랫폼. AI 뉴스 분석, 게시판, 회원을 효율적으로 운영하세요.</p>
        </div>
        <div class="col-md-2">
          <h6 class="fw-bold mb-3">메뉴</h6>
          <ul class="list-unstyled small">
            <li class="mb-2"><a href="#updates" class="text-body-secondary text-decoration-none">최신 업데이트</a></li>
            <li class="mb-2"><a href="#posts" class="text-body-secondary text-decoration-none">최신 소식</a></li>
          </ul>
        </div>
        <div class="col-md-2">
          <h6 class="fw-bold mb-3">계정</h6>
          <ul class="list-unstyled small">
            <li class="mb-2"><a href="#" class="text-body-secondary text-decoration-none" data-nav="login">로그인 / 무료 회원가입</a></li>
          </ul>
        </div>
        <div class="col-md-4">
          <h6 class="fw-bold mb-3">기술 스택</h6>
          <div class="d-flex flex-wrap gap-2">
            ${['AdminLTE 4', 'Bootstrap 5', 'Vite', 'Neon Postgres', 'Vercel Blob', 'Gemini AI', 'Quill'].map(t => `<span class="badge bg-body-secondary text-body-secondary rounded-pill px-2 py-1">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <hr class="my-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center">
        <small class="text-body-secondary">© 2026 J뉴스보드 Project. All rights reserved.</small>
        <div class="d-flex gap-3">
          <a href="#" class="text-body-secondary"><i class="bi bi-github fs-5"></i></a>
          <a href="#" class="text-body-secondary"><i class="bi bi-twitter-x fs-5"></i></a>
        </div>
      </div>
    </div>
  </footer>
  `;

  app.bindNavLinks();
  app.bindThemeButtons();
}

export function renderPublicNews(app) {
  app.appRoot.innerHTML = `
  <!-- ═══ Public Navbar ═══ -->
  <nav class="pub-navbar">
    <div class="container-fluid px-3 px-xl-5">
      <div class="d-flex align-items-center justify-content-between py-2">
        <div class="d-flex align-items-center gap-3">
          <a href="#" class="d-flex align-items-center gap-2 text-decoration-none" data-nav="home">
            <i class="bi bi-kanban-fill fs-4" style="color:var(--jb-primary)"></i>
            <span class="fw-bold fs-5 text-body">J뉴스보드</span>
          </a>
          <div class="btn-group p-1 bg-body-tertiary rounded-pill border ms-1" role="group">
            <button type="button" class="btn btn-sm btn-primary rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 shadow-none" data-nav="news">
              <i class="bi bi-newspaper"></i><span>실시간 뉴스</span>
              <span class="badge bg-danger rounded-pill px-1.5 py-0 text-xs">AI</span>
            </button>
            <button type="button" class="btn btn-sm btn-light border-0 rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 shadow-none" data-nav="home">
              <i class="bi bi-house"></i><span>홈으로</span>
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
          <a href="#" class="btn btn-sm btn-primary rounded-pill px-3" data-nav="login">로그인 / 무료 회원가입</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="pub-main-container">
    <div class="container-fluid px-3 px-xl-5">
      <div id="publicNewsContainer"></div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="pub-footer bg-body border-top py-4 mt-4">
    <div class="container-fluid px-3 px-xl-5 text-center text-body-secondary small">
      © 2026 J뉴스보드 Project. 실시간 구글 뉴스 & Gemini AI 에이전트.
    </div>
  </footer>
  `;

  app.bindNavLinks();
  app.bindThemeButtons();
  const container = document.getElementById('publicNewsContainer');
  if (container) {
    app.newsController = new NewsDeskController(app, container);
  }
}
