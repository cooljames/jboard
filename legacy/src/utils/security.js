// ═══════════════════════════════════════════════════════════
// Security & Cryptographic Utilities
// ═══════════════════════════════════════════════════════════

export async function sha256Hex(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('jboard-local$' + str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null; // For insecure contexts or environments without Web Crypto subtle
  }
}

export async function hashLocalPassword(password) {
  const hex = await sha256Hex(password);
  return hex ? `sha256:${hex}` : `plain:${password}`;
}

export async function verifyLocalPassword(inputPw, stored) {
  if (!stored) return { ok: false, needsRehash: false };
  if (stored.startsWith('sha256:')) {
    const hex = await sha256Hex(inputPw);
    return { ok: hex !== null && stored === `sha256:${hex}`, needsRehash: false };
  }
  if (stored.startsWith('plain:')) {
    const ok = inputPw === stored.slice(6);
    return { ok, needsRehash: ok };
  }
  // Legacy plain text store
  return { ok: inputPw === stored, needsRehash: inputPw === stored };
}

export function upgradeLocalPasswordStore(users, saveData) {
  (async () => {
    let changed = false;
    for (const u of users) {
      if (u.password && !u.password.startsWith('sha256:')) {
        const raw = u.password.startsWith('plain:') ? u.password.slice(6) : u.password;
        u.password = await hashLocalPassword(raw);
        changed = true;
      }
    }
    if (changed) saveData('jboard_users', users);
  })();
}
