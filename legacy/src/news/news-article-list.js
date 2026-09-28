// ═══════════════════════════════════════════════════
// News Article List & Compact Renderer (Item 3)
// Format: [언론사] [경과시간] [기사 제목] - 제목까지만 콤팩트 표시
// ═══════════════════════════════════════════════════

export function renderNewsArticleList(controller) {
  const container = document.getElementById('newsArticlesContainer');
  if (!container) return;

  if (controller.isLoading) {
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 2.5rem; height: 2.5rem;"></div>
        <p class="text-muted fw-semibold mb-0">실시간 구글 뉴스를 수집하고 있습니다...</p>
        <small class="text-muted">${controller.country} · ${controller.category}</small>
      </div>
    `;
    return;
  }

  if (!controller.articles || controller.articles.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-newspaper fs-1 text-secondary opacity-50 mb-2 d-block"></i>
        <p class="mb-1">조회된 뉴스가 없습니다.</p>
        <small>검색어나 카테고리, 기간 필터를 변경하여 다시 시도해 보세요.</small>
      </div>
    `;
    return;
  }

  const totalArticles = controller.articles.length;
  const totalPages = Math.max(1, Math.ceil(totalArticles / controller.newsPageSize));
  if (controller.newsPage > totalPages) controller.newsPage = totalPages;
  if (controller.newsPage < 1) controller.newsPage = 1;

  const startIdx = (controller.newsPage - 1) * controller.newsPageSize;
  const pageArticles = controller.articles.slice(startIdx, startIdx + controller.newsPageSize);

  const articlesHtml = `
    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle board-table mb-0">
        <colgroup>
          <col style="width: 40px">
          <col style="width: 130px">
          <col style="width: 90px">
          <col>
          <col style="width: 70px">
        </colgroup>
        <tbody>
          ${pageArticles.map((a, relIdx) => {
            const actualIdx = startIdx + relIdx;
            const titleText = a.title;

            return `
            <tr class="${a.selected ? 'table-primary' : ''}">
              <td class="text-center notranslate" translate="no">
                <div class="form-check m-0 d-inline-block">
                  <input class="form-check-input news-checkbox" type="checkbox" data-index="${actualIdx}" ${a.selected ? 'checked' : ''} id="art_chk_${actualIdx}">
                </div>
              </td>
              <td class="text-center notranslate" translate="no">
                <span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2 py-1 small fw-semibold text-truncate" style="max-width: 110px;">
                  <i class="bi bi-broadcast me-1"></i>${a.source}
                </span>
              </td>
              <td class="text-center text-muted small notranslate" translate="no">
                <i class="bi bi-clock me-1"></i>${a.timeAgo}
              </td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <label class="article-title fw-bold text-body mb-0 cursor-pointer flex-grow-1 text-truncate" for="art_chk_${actualIdx}" title="${titleText}" style="max-width: calc(100vw - 400px);">
                    ${titleText}
                  </label>
                </div>
              </td>
              <td class="text-center notranslate" translate="no">
                <a href="${a.link}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-link text-decoration-none p-0 text-muted small" title="새 창에서 원본 기사 읽기">
                  <span>원문</span> <i class="bi bi-box-arrow-up-right"></i>
                </a>
              </td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Pagination bar
  const paginationHtml = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 px-1 border-top mt-2 notranslate" translate="no">
      <div class="small text-muted">
        전체 <strong>${totalArticles}</strong>개 중 <strong>${startIdx + 1} - ${Math.min(startIdx + controller.newsPageSize, totalArticles)}</strong>개 표시 (페이지 <strong>${controller.newsPage}</strong> / <strong>${totalPages}</strong>)
      </div>
      ${totalPages > 1 ? `
      <nav aria-label="News Page Navigation">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item ${controller.newsPage === 1 ? 'disabled' : ''}">
            <a class="page-link news-page-link" href="#" data-page="${controller.newsPage - 1}">이전</a>
          </li>
          ${Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - controller.newsPage) <= 2)
            .map((p, idx, arr) => `
              ${idx > 0 && p - arr[idx - 1] > 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
              <li class="page-item ${controller.newsPage === p ? 'active' : ''}">
                <a class="page-link news-page-link" href="#" data-page="${p}">${p}</a>
              </li>
            `).join('')}
          <li class="page-item ${controller.newsPage === totalPages ? 'disabled' : ''}">
            <a class="page-link news-page-link" href="#" data-page="${controller.newsPage + 1}">다음</a>
          </li>
        </ul>
      </nav>
      ` : ''}
    </div>
  `;

  container.innerHTML = articlesHtml + paginationHtml;

  // Attach click events on checkboxes and cards
  container.querySelectorAll('.news-checkbox').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      if (controller.articles[index]) {
        controller.articles[index].selected = e.target.checked;
        const card = container.querySelector(`.news-article-card[data-index="${index}"]`);
        if (card) card.classList.toggle('selected', e.target.checked);
        controller.renderStatus();
      }
    });
  });

  // Pagination clicks
  container.querySelectorAll('.news-page-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const p = parseInt(link.getAttribute('data-page'));
      if (p >= 1 && p <= totalPages && p !== controller.newsPage) {
        controller.newsPage = p;
        renderNewsArticleList(controller);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Google 사이트 번역이 켜져 있으면 위젯이 새 목록을 자동 번역함
      }
    });
  });
}
