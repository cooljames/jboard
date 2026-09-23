// ═══════════════════════════════════════════════════
// News Analysis View & Actions (Board Post, Export HTML)
// ═══════════════════════════════════════════════════
import { buildHtmlDocument, downloadHtmlFile } from './html-builder.js';
import { formatDateTime } from './news-service.js';

export function renderProgress(controller) {
  const bar = document.getElementById('aiProgressBar');
  const msg = document.getElementById('aiProgressMessage');
  const container = document.getElementById('aiProgressContainer');
  if (!container) return;

  if (controller.isAnalyzing) {
    container.classList.remove('d-none');
    if (bar) {
      bar.style.width = `${controller.analysisProgress.percent}%`;
      bar.setAttribute('aria-valuenow', controller.analysisProgress.percent);
    }
    if (msg) msg.textContent = controller.analysisProgress.message;
  } else {
    container.classList.add('d-none');
  }
}

export function renderAnalysisCardHtml(controller) {
  if (!controller.latestAnalysis) return '';
  const { title, analyses, tags, articles, createdAt } = controller.latestAnalysis;

  const analysesHtml = analyses
    .map(([subTitle, content]) => {
      let formatted = content;
      if (!formatted.includes('<p>') && !formatted.includes('<P>')) {
        formatted = formatted
          .split(/\n\n+/)
          .map((para) => `<p class="mb-2 text-body-secondary lh-lg">${para.trim().replace(/\n/g, '<br/>')}</p>`)
          .join('');
      }
      return `
        <div class="mb-4">
          <h5 class="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-bookmark-check-fill"></i> ${subTitle}
          </h5>
          <div class="analysis-body ps-2 border-start border-2 border-primary-subtle">${formatted}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card shadow border-0 mb-4 bg-body rounded-4" id="aiAnalysisResultCard">
      <div class="card-header bg-primary text-white py-3 px-4 rounded-top-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <span class="badge bg-warning text-dark me-2"><i class="bi bi-star-fill me-1"></i>AI Report</span>
          <span class="small opacity-75">${formatDateTime(createdAt)} 생성</span>
          <h4 class="fw-bold mb-0 mt-1">${title}</h4>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-warning btn-sm text-dark fw-bold rounded-pill px-3 shadow-sm d-flex align-items-center gap-1" id="postToJBoardBtn">
            <i class="bi bi-send-check-fill"></i><span>게시판에 등록</span>
          </button>
          <button type="button" class="btn btn-light btn-sm rounded-pill px-3 shadow-sm d-flex align-items-center gap-1" id="downloadHtmlBtn">
            <i class="bi bi-download"></i><span>HTML 다운로드</span>
          </button>
          <button type="button" class="btn btn-outline-light btn-sm rounded-pill px-3 d-flex align-items-center gap-1" id="viewNewTabBtn">
            <i class="bi bi-box-arrow-up-right"></i><span>새 탭 열기</span>
          </button>
        </div>
      </div>
      <div class="card-body p-4">
        ${analysesHtml}
        <hr class="my-4">
        <div class="small text-muted mb-2 fw-semibold">분석 대상 참고 기사 (${articles.length}건):</div>
        <ul class="small text-muted mb-3 ps-3">
          ${articles.map((art) => `<li><a href="${art.link}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">${art.translatedTitle || art.title}</a> (${art.source})</li>`).join('')}
        </ul>
        ${tags && tags.length > 0 ? `
          <div class="d-flex flex-wrap gap-1">
            ${tags.map((t) => `<span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">#${t.replace(/^#+/, '')}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function postToJBoard(controller) {
  if (!controller.latestAnalysis) return;
  const { title, analyses, tags, articles } = controller.latestAnalysis;

  const analysesHtml = analyses
    .map(([subTitle, content]) => {
      let formatted = content;
      if (!formatted.includes('<p>') && !formatted.includes('<P>')) {
        formatted = formatted
          .split(/\n\n+/)
          .map((para) => `<p>${para.trim().replace(/\n/g, '<br/>')}</p>`)
          .join('');
      }
      return `
        <div style="margin-bottom: 24px;">
          <h4 style="color:#0d6efd;font-weight:700;margin-bottom:10px;"><i class="bi bi-bookmark-check-fill me-1"></i>${subTitle}</h4>
          <div style="font-size:1.02rem;line-height:1.8;">${formatted}</div>
        </div>
      `;
    })
    .join('');

  const sourceListHtml = articles
    .map((a) => `<li><a href="${a.link}" target="_blank" rel="noopener noreferrer">${a.translatedTitle || a.title}</a> <span class="text-muted small">(${a.source} · ${a.displayDate})</span></li>`)
    .join('');

  const tagsHtml = (tags || [])
    .map((t) => `<span class="badge bg-primary-subtle text-primary border me-1">#${t.replace(/^#+/, '')}</span>`)
    .join(' ');

  const fullPostHtml = `
    <div class="news-briefing-post">
      <div class="alert alert-info py-2 px-3 mb-4 rounded-3 d-flex align-items-center justify-content-between">
        <span><i class="bi bi-robot me-1 text-primary"></i> <strong>J뉴스보드 AI 뉴스 분석 에이전트</strong>에 의해 발행된 심층 브리핑입니다.</span>
        <span class="badge bg-secondary-subtle text-secondary small">${controller.country} · ${controller.category}</span>
      </div>
      <div class="news-content mb-4">${analysesHtml}</div>
      <hr class="my-4">
      <div class="news-sources mb-3">
        <h6 class="fw-bold text-secondary mb-2"><i class="bi bi-newspaper me-1"></i>참고 기사 출처 (${articles.length}건)</h6>
        <ul class="small ps-3 mb-0">${sourceListHtml}</ul>
      </div>
      ${tags ? `<div class="news-tags mt-3">${tagsHtml}</div>` : ''}
    </div>
  `;

  controller.app?.openPostWriteModal?.(null, {
    title: `[AI 브리핑] ${title}`,
    content: fullPostHtml,
    category: 'info',
  });
  controller.app?.showToast?.('AI 뉴스 브리핑이 게시글 작성 폼에 자동 입력되었습니다. 확인 후 등록하세요!', 'info');
}

export function downloadReport(controller) {
  if (!controller.latestAnalysis) return;
  const { title, analyses, tags, articles } = controller.latestAnalysis;
  const nowDisplay = formatDateTime(new Date());
  const html = buildHtmlDocument(title, nowDisplay, analyses, articles, tags);
  const fileName = `J뉴스보드_News_${Date.now()}.html`;
  downloadHtmlFile(html, fileName);
  controller.app?.showToast?.('리포트 파일이 다운로드되었습니다.', 'success');
}

export function openReportInNewTab(controller) {
  if (!controller.latestAnalysis) {
    controller.app?.showToast?.('먼저 [선택된 기사 분석하여 파일 저장]을 실행해 주세요.', 'warning');
    return;
  }
  const { title, analyses, tags, articles } = controller.latestAnalysis;
  const nowDisplay = formatDateTime(new Date());
  const html = buildHtmlDocument(title, nowDisplay, analyses, articles, tags);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
