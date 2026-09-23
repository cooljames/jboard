// ═══════════════════════════════════════════════════
// News Analysis View & Actions (Board Post, Export HTML)
// ═══════════════════════════════════════════════════
import { buildHtmlDocument } from './html-builder.js';
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

  const analysesHtml = (analyses || [])
    .map(([subTitle, content]) => {
      const formatted = normalizeAnalysisHtml(content);
      if (!formatted) return '';
      return `
        <div class="mb-4">
          <h5 class="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
            <i class="bi bi-bookmark-check-fill"></i> ${subTitle || '심층 분석'}
          </h5>
          <div class="analysis-body ps-2 border-start border-2 border-primary-subtle">${formatted}</div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="card shadow border-0 mb-4 bg-body rounded-4 notranslate" translate="no" id="aiAnalysisResultCard">
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
          <button type="button" class="btn btn-outline-light btn-sm rounded-pill px-3 d-flex align-items-center gap-1" id="viewNewTabBtn">
            <i class="bi bi-box-arrow-up-right"></i><span>새 탭으로 열기</span>
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

// 분석 본문 정규화: 코드펜스 제거 → 문단(<p>) 구조 보장 → 줄간격 1.8 적용
export function normalizeAnalysisHtml(text) {
  let t = (text || '').trim();
  if (!t) return '';
  t = t.replace(/```(?:html)?\s*([\s\S]*?)\s*```/g, '$1').trim();
  if (/<p[\s>]/i.test(t)) return t;
  return t
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => `<p style="line-height:1.8;margin-bottom:1rem;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export function postToJBoard(controller) {
  if (!controller.latestAnalysis) return;
  const { title, analyses, tags, articles } = controller.latestAnalysis;

  let analysesHtml = (analyses || [])
    .map(([subTitle, content]) => {
      const formatted = normalizeAnalysisHtml(content);
      if (!formatted) return '';
      return `
        <div style="margin-bottom: 24px;">
          <h4 style="color:#0d6efd;font-weight:700;margin-bottom:0;">${subTitle || '심층 분석'}</h4>
          <div style="font-size:1.02rem;line-height:1.8;">${formatted}</div>
        </div>
      `;
    })
    .join('');

  // 분석 본문이 비어 있으면 참고 기사 목록으로 폴백 (빈 본문 등록 방지)
  if (!analysesHtml.trim() && (articles || []).length > 0) {
    analysesHtml = `
      <div style="margin-bottom: 24px;">
        <h4 style="color:#0d6efd;font-weight:700;margin-bottom:0;">참고 기사 요약</h4>
        ${(articles || [])
          .map(
            (a) => `
          <p style="line-height:1.8;margin-bottom:1rem;">
            <strong>${a.translatedTitle || a.title}</strong><br/>
            <span style="color:#6c757d;">${a.source || ''} · ${a.displayDate || ''}</span><br/>
            ${(a.description || '').trim()}<br/>
            <a href="${a.link}" target="_blank" rel="noopener noreferrer">원문 보기</a>
          </p>`
          )
          .join('')}
      </div>
    `;
  }

  const sourceListHtml = articles
    .map((a) => `<li><a href="${a.link}" target="_blank" rel="noopener noreferrer">${a.translatedTitle || a.title}</a> <span class="text-muted small">(${a.source} · ${a.displayDate})</span></li>`)
    .join('');

  const tagsHtml = (tags || [])
    .map((t) => `<span class="badge bg-primary-subtle text-primary border me-1">#${t.replace(/^#+/, '')}</span>`)
    .join(' ');

  // 소제목(h4)과 문단(p) 아래에 빈줄 1개씩 (연속 빈줄은 1개로 압축)
  analysesHtml = analysesHtml
    // 1) 기존 빈 문단을 표준형으로 통일
    .replace(/<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '<p><br></p>')
    // 2) 소제목·문단 뒤에 빈줄 삽입
    .replace(/<\/h4>/gi, '</h4><p><br></p>')
    .replace(/<\/p>/gi, '</p><p><br></p>')
    // 3) 연속된 빈줄은 1개로 압축 (AI 원문에 빈줄이 섞여 있어도 2줄 방지)
    .replace(/(<p><br><\/p>)(\s*<p><br><\/p>)+/gi, '<p><br></p>');

  const fullPostHtml = `
    <div class="news-briefing-post">
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
    title: `${title}`,
    content: fullPostHtml,
    category: 'info',
  });
  controller.app?.showToast?.('AI 뉴스 브리핑이 게시글 작성 폼에 자동 입력되었습니다. 확인 후 등록하세요!', 'info');
}

export function openReportInNewTab(controller) {
  if (!controller.latestAnalysis) {
    controller.app?.showToast?.('먼저 [선택된 기사 분석하기]를 실행해 주세요.', 'warning');
    return;
  }
  const { title, analyses, tags, articles } = controller.latestAnalysis;
  const nowDisplay = formatDateTime(new Date());
  const html = buildHtmlDocument(title, nowDisplay, analyses, articles, tags);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // 팝업 차단 대응: window.open → 실패 시 임시 링크 클릭 방식
  let opened = null;
  try {
    opened = window.open(blobUrl, '_blank', 'noopener');
  } catch {}
  if (!opened) {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      opened = true;
    } catch {}
  }
  if (!opened) {
    controller.app?.showToast?.('새 탭이 차단되었습니다. 브라우저 팝업을 허용한 뒤 다시 시도해 주세요.', 'danger');
    return;
  }
  // 메모리 정리 (탭 로드 후 여유 있게 해제)
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}
