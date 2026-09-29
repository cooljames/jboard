// 서버 500 HTML 같은 비-JSON 응답에도 죽지 않는 fetch 래퍼.
// res.ok가 아니거나 JSON이 아니면 상태코드+본문 일부를 담은 Error를 던진다.

export class FetchJsonError extends Error {
  status: number;
  constructor(status: number, snippet: string) {
    super(`요청 실패 (HTTP ${status}): ${snippet}`);
    this.name = 'FetchJsonError';
    this.status = status;
  }
}

export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('json')) {
    const snippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    throw new FetchJsonError(res.status, snippet || res.statusText);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new FetchJsonError(res.status, 'JSON 파싱 실패');
  }
}
