// ═══════════════════════════════════════════════════════════
// News & AI Agent Configuration Modal
// ═══════════════════════════════════════════════════════════
import { GEMINI_MODELS, SUMMARY_LINES_OPTIONS, COUNTRY_PRESETS, SOURCE_CATEGORIES } from './constants.js';

export function openNewsConfigModal(controller) {
  let modalEl = document.getElementById('newsConfigModal');
  if (!modalEl) {
    const modalHtml = `
    <div class="modal fade" id="newsConfigModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow border-0">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title fw-bold"><i class="bi bi-gear-wide-connected me-2"></i>뉴스 & AI 에이전트 맞춤 설정</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="alert alert-light border small mb-3">
              <i class="bi bi-shield-check text-success me-1"></i>
              설정 및 API 키는 회원의 브라우저에 안전하게 보관되며 외부 서버로 전송되지 않습니다.
              <br />API 키는 로그인 계정별로 따로 저장되어 다른 계정과 공유되지 않습니다.
            </div>

            <div class="mb-3">
              <label for="cfgApiKey" class="form-label fw-semibold small">
                Google Gemini API Key <span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-key-fill"></i></span>
                <input type="password" id="cfgApiKey" class="form-control" placeholder="AI Studio에서 발급받은 API 키 입력" />
                <button type="button" class="btn btn-outline-secondary" id="toggleApiKeyVisible">
                  <i class="bi bi-eye"></i>
                </button>
              </div>
              <div class="form-text small">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio에서 무료 API 키 발급받기 <i class="bi bi-box-arrow-up-right"></i></a>
              </div>
            </div>

            <div class="mb-3">
              <label for="cfgModel" class="form-label fw-semibold small">Gemini 모델 선택</label>
              <select id="cfgModel" class="form-select">
                ${GEMINI_MODELS.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}
              </select>
            </div>

            <div class="mb-3">
              <label for="cfgSummaryLines" class="form-label fw-semibold small">기본 요약 분량</label>
              <select id="cfgSummaryLines" class="form-select">
                ${SUMMARY_LINES_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}
              </select>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <label for="cfgDefaultCountry" class="form-label fw-semibold small">기본 국가</label>
                <select id="cfgDefaultCountry" class="form-select">
                  ${Object.keys(COUNTRY_PRESETS).map((c) => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div class="col-6">
                <label for="cfgDefaultCategory" class="form-label fw-semibold small">기본 카테고리</label>
                <select id="cfgDefaultCategory" class="form-select">
                  ${Object.keys(SOURCE_CATEGORIES).map((c) => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer bg-body-tertiary">
            <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">닫기</button>
            <button type="button" class="btn btn-primary btn-sm px-4 fw-semibold" id="saveNewsConfigBtn">
              <i class="bi bi-check-lg me-1"></i>설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modalEl = document.getElementById('newsConfigModal');
  }

  // Populate values
  const apiKeyInput = document.getElementById('cfgApiKey');
  const modelSelect = document.getElementById('cfgModel');
  const linesSelect = document.getElementById('cfgSummaryLines');
  const countrySelect = document.getElementById('cfgDefaultCountry');
  const catSelect = document.getElementById('cfgDefaultCategory');

  if (apiKeyInput) apiKeyInput.value = controller.apiKey || '';
  if (modelSelect) modelSelect.value = controller.modelId;
  if (linesSelect) linesSelect.value = controller.summaryLines;
  if (countrySelect) countrySelect.value = controller.country;
  if (catSelect) catSelect.value = controller.category;

  // Password toggle
  document.getElementById('toggleApiKeyVisible')?.addEventListener('click', () => {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  // Save button
  document.getElementById('saveNewsConfigBtn').onclick = () => {
    controller.apiKey = apiKeyInput.value.trim();
    controller.modelId = modelSelect.value;
    controller.summaryLines = linesSelect.value;
    controller.country = countrySelect.value;
    controller.category = catSelect.value;

    controller.saveConfig();
    window.bootstrap.Modal.getInstance(modalEl)?.hide();
    controller.app?.showToast?.('뉴스 및 AI 설정이 저장되었습니다.', 'success');
    controller.render();
    controller.loadArticles();
  };

  const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
  modal.show();
}
