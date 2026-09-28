// ═══════════════════════════════════════════════════════════
// News HTML Report Builder & Downloader
// ═══════════════════════════════════════════════════════════

export function buildHtmlDocument(title, nowDisplay, analyses, articles, tags) {
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
    <div class="analysis-section">
      <h3>${subTitle}</h3>
      <div class="content">${formatted}</div>
    </div>
  `;
    })
    .join('');

  const articlesHtml = articles
    .map(
      (a, i) => `
    <div class="article-item">
      <span class="idx">${i + 1}.</span>
      <a href="${a.link}" target="_blank" rel="noopener noreferrer">${a.translatedTitle || a.title}</a>
      <span class="source">[${a.source}]</span>
      <span class="date">${a.displayDate}</span>
    </div>
  `
    )
    .join('');

  const tagsHtml = (tags || [])
    .map((t) => {
      const cleanTag = t.replace(/\s+/g, '').replace(/^#+/, '');
      return cleanTag ? `<span class="tag">#${cleanTag}</span>` : '';
    })
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - JnewsBoard AI News Briefing</title>
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #0d6efd;
      --accent: #e2e8f0;
      --border: #e2e8f0;
    }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.75;
      padding: 30px 20px;
      margin: 0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      padding: 32px;
      margin-bottom: 24px;
    }
    .header-card {
      background: linear-gradient(135deg, #0d6efd 0%, #6610f2 100%);
      color: #ffffff;
      border: none;
    }
    h1 { margin-top: 0; font-size: 26px; font-weight: 800; line-height: 1.4; color: #ffffff; }
    h2 { border-bottom: 2px solid var(--border); padding-bottom: 12px; margin-top: 0; font-size: 20px; font-weight: 700; color: #1e293b; }
    .meta { font-size: 14px; opacity: 0.9; margin-top: 10px; }
    .analysis-section { margin-bottom: 30px; }
    .analysis-section:last-child { margin-bottom: 0; }
    .analysis-section h3 {
      background: #0f172a;
      color: #ffffff;
      display: inline-block;
      padding: 6px 16px;
      margin-top: 0;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
    }
    .analysis-section .content {
      margin-top: 14px;
      font-size: 15.5px;
      line-height: 1.85;
      color: #334155;
    }
    .analysis-section .content p { margin: 0 0 14px 0; }
    .article-item { margin-bottom: 10px; font-size: 14.5px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; }
    .article-item .idx { font-weight: bold; color: var(--primary); }
    .article-item a { color: #0284c7; text-decoration: none; font-weight: 600; }
    .article-item a:hover { text-decoration: underline; }
    .article-item .source { color: var(--muted); font-size: 13px; }
    .article-item .date { color: var(--muted); font-size: 13px; }
    .tags { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      background: #f1f5f9;
      color: #3b82f6;
      border: 1px solid #cbd5e1;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card header-card">
      <h1>${title}</h1>
      <div class="meta">발행일시: ${nowDisplay} | JnewsBoard AI News Agent</div>
    </div>

    <div class="card">
      <h2>📊 핵심 심층 분석</h2>
      ${analysesHtml}
    </div>

    <div class="card">
      <h2>📰 참고 기사 출처 (${articles.length}건)</h2>
      ${articlesHtml}
    </div>

    ${tagsHtml ? `
    <div class="card">
      <h2>🏷️ 관련 키워드 & 태그</h2>
      <div class="tags">${tagsHtml}</div>
    </div>` : ''}
  </div>
</body>
</html>`;
}

export function downloadHtmlFile(html, fileName = 'jnewsboard_news_briefing.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return blobUrl;
}
