// ═══════════════════════════════════════════════════════════
// Auth Views: Login & Registration Pages
// ═══════════════════════════════════════════════════════════
import { showToast } from '../utils/ui-helpers.js';

export function renderLogin(app) {
  app.appRoot.innerHTML = `
  <div class="auth-wrapper bg-body-tertiary">
    <div class="auth-card fade-in">
      <div class="text-center mb-4">
        <a href="#" class="text-decoration-none d-flex align-items-center justify-content-center gap-2 mb-3" data-nav="home">
          <i class="bi bi-kanban-fill fs-3" style="color:var(--jb-primary)"></i>
          <span class="auth-logo">J뉴스보드</span>
        </a>
        <p class="text-body-secondary small">로그인하거나 무료 회원가입 후 시작하세요</p>
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
        <a href="#" class="small fw-semibold text-decoration-none ms-1" style="color:var(--jb-primary)" data-nav="signup">무료 회원가입</a>
      </div>

      <div class="mt-4 p-3 rounded-3 text-start" style="background:var(--bs-tertiary-bg)">
        <small class="text-body-secondary d-block mb-2 fw-semibold"><i class="bi bi-info-circle me-1"></i>테스트 계정 선택</small>
        <div class="d-flex flex-column gap-2 small">
          <div class="d-flex align-items-center justify-content-between">
            <div><span class="badge bg-danger me-1">관리자</span> <code>admin@jboard.co.kr</code> / <code>admin1234</code></div>
            <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" id="fillAdminBtn" style="font-size:0.78rem">선택</button>
          </div>
          <div class="d-flex align-items-center justify-content-between">
            <div><span class="badge bg-primary me-1">일반회원</span> <code>user@jboard.co.kr</code> / <code>user1234</code></div>
            <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2" id="fillUserBtn" style="font-size:0.78rem">선택</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  app.bindNavLinks();

  // Quick fill buttons
  document.getElementById('fillAdminBtn')?.addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'admin@jboard.co.kr';
    document.getElementById('loginPassword').value = 'admin1234';
  });
  document.getElementById('fillUserBtn')?.addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'user@jboard.co.kr';
    document.getElementById('loginPassword').value = 'user1234';
  });

  // Toggle password visibility
  document.getElementById('toggleLoginPw')?.addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    const icon = document.querySelector('#toggleLoginPw i');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    icon.className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
  });

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>로그인 중...';
    }
    const result = await app.login(email, pw);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>로그인';
    }
    if (result.ok) {
      showToast(`${app.currentUser.name}님, 환영합니다! 🎉`, 'success');
      if (app.currentUser.role === 'admin') {
        app.navigate('admin');
      } else {
        app.navigate('home');
      }
    } else {
      const err = document.getElementById('loginError');
      err.textContent = result.msg;
      err.classList.remove('d-none');
    }
  });
}

export function renderSignup(app) {
  app.appRoot.innerHTML = `
  <div class="auth-wrapper bg-body-tertiary">
    <div class="auth-card fade-in">
      <div class="text-center mb-4">
        <a href="#" class="text-decoration-none d-flex align-items-center justify-content-center gap-2 mb-3" data-nav="home">
          <i class="bi bi-kanban-fill fs-3" style="color:var(--jb-primary)"></i>
          <span class="auth-logo">J뉴스보드</span>
        </a>
        <p class="text-body-secondary small">무료 계정을 만들고 시작하세요</p>
      </div>

      <div id="signupError" class="alert alert-danger d-none py-2 small" role="alert"></div>
      <div id="signupSuccess" class="alert alert-success d-none py-2 small" role="alert"></div>

      <form id="signupForm">
        <div class="mb-3">
          <label for="signupName" class="form-label small fw-semibold">닉네임</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input type="text" class="form-control" id="signupName" placeholder="게시판에 표시될 닉네임" maxlength="20" required autofocus />
          </div>
          <div class="form-text small">실명 대신 사용할 별명을 2~20자로 입력하세요.</div>
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
            <a href="#" class="text-decoration-none" id="termsLink" style="color:var(--jb-primary)">이용약관</a> 및
            <a href="#" class="text-decoration-none" id="privacyLink" style="color:var(--jb-primary)">개인정보처리방침</a>에 동의합니다
          </label>
        </div>
        <button type="submit" class="btn w-100 text-white fw-semibold py-2" style="background:var(--jb-gradient);border:none;border-radius:10px">
          <i class="bi bi-person-plus-fill me-1"></i>무료 회원가입
        </button>
      </form>

      <div class="auth-divider">또는</div>

      <div class="text-center">
        <span class="text-body-secondary small">이미 계정이 있으신가요?</span>
        <a href="#" class="small fw-semibold text-decoration-none ms-1" style="color:var(--jb-primary)" data-nav="login">로그인</a>
      </div>
    </div>
  </div>

  <!-- ═══ 이용약관 및 개인정보처리방침 모달 ═══ -->
  <div class="modal fade" id="termsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title fw-bold"><i class="bi bi-file-text me-2"></i>이용약관 및 개인정보처리방침</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
          <ul class="nav nav-tabs px-3 pt-3" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active small fw-semibold" id="termsTabBtn" data-bs-toggle="tab" data-bs-target="#termsTabPane" type="button" role="tab">이용약관</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link small fw-semibold" id="privacyTabBtn" data-bs-toggle="tab" data-bs-target="#privacyTabPane" type="button" role="tab">개인정보처리방침</button>
            </li>
          </ul>
          <div class="tab-content p-4 small lh-lg">
            <div class="tab-pane fade show active" id="termsTabPane" role="tabpanel">
              <h6 class="fw-bold mb-2">제1조 (목적)</h6>
              <p class="text-body-secondary mb-3">이 약관은 J뉴스보드 커뮤니티 및 실시간 뉴스 서비스의 이용 조건과 운영 원칙을 정합니다.</p>
              <h6 class="fw-bold mb-2">제2조 (계정 관리)</h6>
              <p class="text-body-secondary mb-3">이메일 1개당 1개의 계정을 만들 수 있으며, 비밀번호 관리 책임은 회원 본인에게 있습니다.</p>
              <h6 class="fw-bold mb-2">제3조 (금지 행위)</h6>
              <p class="text-body-secondary mb-3">타인 비방·욕설, 불법·음란물 게시, 광고 도배, 타인 계정 도용을 금지합니다. 위반 게시물은 사전 안내 없이 삭제·차단될 수 있습니다.</p>
              <h6 class="fw-bold mb-2">제4조 (서비스 변경)</h6>
              <p class="text-body-secondary mb-0">운영상 필요에 따라 기능을 변경하거나 중단할 수 있습니다. (시행일: 2026년 9월 23일)</p>
            </div>
            <div class="tab-pane fade" id="privacyTabPane" role="tabpanel">
              <h6 class="fw-bold mb-2">1. 수집 항목</h6>
              <p class="text-body-secondary mb-3">닉네임, 이메일 주소, 비밀번호(암호화하여 저장), 작성한 게시글·댓글을 수집합니다.</p>
              <h6 class="fw-bold mb-2">2. 이용 목적</h6>
              <p class="text-body-secondary mb-3">회원 식별, 로그인 인증, 커뮤니티 운영 목적으로만 이용합니다.</p>
              <h6 class="fw-bold mb-2">3. 보관 및 파기</h6>
              <p class="text-body-secondary mb-3">회원 탈퇴 시 계정 정보는 즉시 삭제합니다. 작성한 게시글은 커뮤니티 기록 유지를 위해 남을 수 있습니다.</p>
              <h6 class="fw-bold mb-2">4. 제3자 제공</h6>
              <p class="text-body-secondary mb-0">수집한 개인정보를 제3자에게 제공하거나 외부에 위탁하지 않습니다.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer bg-body-tertiary">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">닫기</button>
          <button type="button" class="btn btn-primary fw-semibold" id="agreeTermsBtn"><i class="bi bi-check-lg me-1"></i>동의합니다</button>
        </div>
      </div>
    </div>
  </div>`;

  app.bindNavLinks();

  document.getElementById('toggleSignupPw')?.addEventListener('click', () => {
    const inp = document.getElementById('signupPassword');
    const icon = document.querySelector('#toggleSignupPw i');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    icon.className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
  });

  // 약관 모달 열기 (이용약관 / 개인정보처리방침 탭 선택)
  const openTermsModal = (tab) => {
    const modalEl = document.getElementById('termsModal');
    if (!modalEl) return;
    const tabEl = document.getElementById(tab === 'privacy' ? 'privacyTabBtn' : 'termsTabBtn');
    if (tabEl) new window.bootstrap.Tab(tabEl).show();
    const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
    modal.show();
  };
  document.getElementById('termsLink')?.addEventListener('click', e => {
    e.preventDefault();
    openTermsModal('terms');
  });
  document.getElementById('privacyLink')?.addEventListener('click', e => {
    e.preventDefault();
    openTermsModal('privacy');
  });
  document.getElementById('agreeTermsBtn')?.addEventListener('click', () => {
    document.getElementById('agreeTerms').checked = true;
    window.bootstrap.Modal.getInstance(document.getElementById('termsModal'))?.hide();
    showToast('약관에 동의했습니다.', 'success');
  });

  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pw = document.getElementById('signupPassword').value;
    const pw2 = document.getElementById('signupPasswordConfirm').value;
    const errEl = document.getElementById('signupError');
    const sucEl = document.getElementById('signupSuccess');
    errEl.classList.add('d-none');
    sucEl.classList.add('d-none');

    if (name.length < 2 || name.length > 20) {
      errEl.textContent = '닉네임은 2~20자로 입력해 주세요.';
      errEl.classList.remove('d-none');
      return;
    }
    if (pw !== pw2) {
      errEl.textContent = '비밀번호가 일치하지 않습니다.';
      errEl.classList.remove('d-none');
      return;
    }
    if (pw.length < 4) {
      errEl.textContent = '비밀번호는 4자 이상이어야 합니다.';
      errEl.classList.remove('d-none');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>가입 처리 중...';
    }
    const result = await app.signup(name, email, pw);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-person-plus-fill me-1"></i>무료 회원가입';
    }
    if (!result.ok) {
      errEl.textContent = result.msg;
      errEl.classList.remove('d-none');
      return;
    }

    sucEl.textContent = '🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...';
    sucEl.classList.remove('d-none');
    setTimeout(() => app.navigate('login'), 1500);
  });
}
