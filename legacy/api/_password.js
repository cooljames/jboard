import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// scrypt 기반 패스워드 해시 (외부 의존성 없음, Vercel Serverless 호환)
// 저장 형식: scrypt$N$r$p$saltHex$keyHex
const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(String(password), salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;
}

export function isHashFormat(stored) {
  return typeof stored === 'string' && stored.startsWith('scrypt$');
}

// { ok, needsRehash } — 레거시 평문과 일치하면 needsRehash=true (로그인 시 자동 마이그레이션용)
export function verifyPassword(password, stored) {
  if (!password || !stored) return { ok: false, needsRehash: false };

  if (!isHashFormat(stored)) {
    const a = Buffer.from(String(password));
    const b = Buffer.from(String(stored));
    const ok = a.length === b.length && timingSafeEqual(a, b);
    return { ok, needsRehash: ok };
  }

  try {
    const parts = stored.split('$');
    if (parts.length !== 6) return { ok: false, needsRehash: false };
    const [, Ns, rs, ps, salt, keyHex] = parts;
    const key = scryptSync(String(password), salt, KEYLEN, { N: Number(Ns), r: Number(rs), p: Number(ps) });
    const expected = Buffer.from(keyHex, 'hex');
    const ok = key.length === expected.length && timingSafeEqual(key, expected);
    return { ok, needsRehash: false };
  } catch {
    return { ok: false, needsRehash: false };
  }
}
