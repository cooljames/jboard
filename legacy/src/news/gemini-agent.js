// ═══════════════════════════════════════════════════════════
// Gemini AI News Analysis Agent
// ═══════════════════════════════════════════════════════════
import { GEMINI_MODELS } from './constants.js';

export async function generateNewsAnalysis({
  apiKey,
  articles,
  summaryLines = '5줄',
  country = '🇰🇷 한국',
  modelId = 'gemini-3.1-flash-lite',
  onProgress = null,
}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. [뉴스 설정]에서 API 키를 입력해 주세요.');
  }

  const selectedArticles = articles.filter((a) => a.selected);
  if (selectedArticles.length === 0) {
    throw new Error('분석할 기사를 하나 이상 선택해 주세요.');
  }

  const lineCountMatch = summaryLines.match(/\d+/);
  const nLinesNum = lineCountMatch ? parseInt(lineCountMatch[0], 10) : 5;
  const targetCharCount = nLinesNum * 100;
  const nArticles = selectedArticles.length;

  // Format articles text for prompt
  const articlesText = selectedArticles
    .map((a, i) => `[기사 ${i + 1}]\n제목: ${a.translatedTitle || a.title}\n출처: ${a.source}\n일시: ${a.displayDate}\n링크: ${a.link}\n내용요약: ${a.description}\n`)
    .join('\n----------------------------------------\n\n');

  const systemInstruction = `당신은 ${country} 시장 및 글로벌 정세에 정통한 수석 경제·산업 분석가이자 전문 에디터입니다.
주어진 ${nArticles}개의 뉴스 기사 **전체**를 면밀히 분석하여 메인 제목, 각 기사별 심층 분석 항목, 태그 목록을 생성하세요.

■ 작성 규칙 (반드시 100% 준수):
1. **[한국어 작성 필수] 원본 기사 내용이 영문(미국 뉴스 등)이더라도, 반환하는 모든 결과(메인 제목 title, 소제목 title, 심층 분석 본문 analysis, 태그 tags)는 100% 매끄럽고 자연스러운 한국어로 번역 및 작성하세요.**
2. **선택된 총 ${nArticles}개의 뉴스 기사 각각에 대해 1:1로 대응하여 정확히 ${nArticles}개의 분석 항목(analyses)을 작성하세요.**
   - 절대로 기사를 누락하거나 일부만 선택하여 요약하지 마세요. 전달받은 ${nArticles}개의 기사가 하나도 빠짐없이 모두 포함되어야 합니다.
   - analyses 배열의 길이(항목 개수)는 반드시 정확히 ${nArticles}개이어야 합니다.
3. 각 분석 항목의 title은 해당 기사의 핵심 주제를 꿰뚫는 명확한 한국어 소제목으로 작성하세요.
4. **[분석 글자 수 분량 엄수 - 선택 옵션: ${summaryLines} (${nLinesNum}줄 ➔ 최소 약 ${targetCharCount}자 이상)]**
   - 각 기사별 분석(analysis)의 작성 분량은 **반드시 선택한 줄 수(${nLinesNum}줄) × 100자 ➔ 공백 포함 최소 약 ${targetCharCount}자 이상의 매우 풍부하고 완성도 높은 심층 분석 글**이어야 합니다.
   - 분량 가이드라인:
     * 3줄 선택 ➔ 최소 약 300자 이상
     * 5줄 선택 ➔ 최소 약 500자 이상
     * 7줄 선택 ➔ 최소 약 700자 이상
     * 10줄 선택 ➔ 최소 약 1,000자 이상의 대용량 고품질 원인·배경·영향·전망 심층 분석!
   - 단순히 기사 결과만 2~3문장으로 짧게 축약하지 말고 사건 발생 원인, 구체적 배경 이유, 시장과 관련 업계 영향, 향후 전망까지 논리적 복문으로 상세히 풀어써서 목표 글자 수(${targetCharCount}자 이상)를 반드시 충족하세요.
   - 전체 글은 연관 논리와 주제 흐름에 따라 **2~4개의 개별 문단(<p> 태그)**으로 명확히 구획을 나누어 작성하세요.
5. 접속사(한편, 이에 따라, 특히, 다만 등)를 활용하여 자연스럽게 연결된 복문으로 작성하세요.
6. 기사에 언급된 **구체적인 회사명, 국가명, 인물명은 반드시 실명으로 인용**하세요.
7. 기사에 언급된 **구체적인 수치, 통계, 퍼센트, 금액**이 있으면 반드시 포함하고 다음 색상을 적용하세요:
   - 양수/상승/증가 값 → <span style='color:#E53935;font-weight:bold;'>+3.5%</span> (빨간색)
   - 음수/하락/감소 값 → <span style='color:#1E88E5;font-weight:bold;'>-2.1%</span> (파란색)
   - 중립적 수치(절대값, 총액 등) → <span style='font-weight:bold;'>1,200억원</span> (굵게만)
8. **[JSON 문법 필수 준수] 본문(analysis) 내 인용구는 쌍따옴표(") 대신 홑따옴표(')나 꺾쇠(「」)를 사용하고, HTML 속성에도 반드시 홑따옴표(')를 사용하세요.**
9. **tags 배열의 해시태그에는 공백문자(띄어쓰기)를 절대로 넣지 마세요.** (예: "금리인하", "반도체수출")
`;

  const requestBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: articlesText }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          analyses: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                analysis: { type: 'STRING' },
              },
              required: ['title', 'analysis'],
            },
          },
          tags: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['title', 'analyses', 'tags'],
      },
      temperature: 0.3,
      maxOutputTokens: 65536,
    },
  };

  const modelInfo = GEMINI_MODELS.find(m => m.id === modelId);
  const fallbackModel = modelInfo?.apiFallback || 'gemini-2.5-flash';
  const modelsToTry = [modelId];
  if (fallbackModel && fallbackModel !== modelId && !modelsToTry.includes(fallbackModel)) {
    modelsToTry.push(fallbackModel);
  }

  onProgress?.(10, `선택된 ${nArticles}개 기사 Gemini AI 모델(${modelId})에 분석 요청 중...`);

  let fullText = '';

  for (const currentModel of modelsToTry) {
    // 1. Try stream endpoint first for real-time progress
    try {
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?key=${apiKey}&alt=sse`;
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let progressPercent = 20;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const chunk = JSON.parse(dataStr);
                const partText = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
                if (partText) {
                  fullText += partText;
                  if (progressPercent < 90) {
                    progressPercent += 5;
                    onProgress?.(progressPercent, `AI 심층 분석 리포트 생성 중 (${progressPercent}%)...`);
                  }
                }
              } catch (e) {
                // skip parse err
              }
            }
          }
        }
        if (fullText) break;
      }
    } catch (err) {
      console.warn(`Gemini stream error on ${currentModel}:`, err);
    }

    // 2. Fallback to standard generateContent if streaming didn't produce fullText
    if (!fullText) {
      onProgress?.(40, `Gemini 표준 API로 생성 요청 중 (${currentModel})...`);
      try {
        const standardUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const resp = await fetch(standardUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (resp.ok) {
          const data = await resp.json();
          fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (fullText) break;
        } else if (resp.status === 404 && modelsToTry.length > 1) {
          console.warn(`Model ${currentModel} returned 404, attempting fallback...`);
          continue;
        } else {
          const errText = await resp.text();
          let errorMsg = `Gemini API 오류 (${resp.status})`;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error?.message) errorMsg = errJson.error.message;
          } catch {}
          throw new Error(errorMsg);
        }
      } catch (e) {
        if (modelsToTry.indexOf(currentModel) === modelsToTry.length - 1) {
          throw e;
        }
      }
    }
  }

  onProgress?.(95, `분석 데이터 파싱 및 스타일 포맷팅 중...`);

  let parsed = null;
  try {
    parsed = JSON.parse(fullText.trim());
  } catch (err) {
    // If wrapped in markdown code fence
    const match = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error('AI 분석 결과 JSON 파싱에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  onProgress?.(100, `완료되었습니다!`);

  return {
    title: parsed.title || `${country} 주요 뉴스 AI 심층 분석 브리핑`,
    analyses: (parsed.analyses || []).map((a) => [a.title, a.analysis]),
    tags: parsed.tags || [],
    articles: selectedArticles,
    createdAt: new Date(),
  };
}
