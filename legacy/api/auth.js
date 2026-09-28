import { getDb, initDb } from './_db.js';
import { hashPassword, verifyPassword } from './_password.js';

let fallbackUsers = [
  {
    id: 1,
    name: '관리자',
    email: 'admin@jboard.co.kr',
    password: 'admin1234',
    role: 'admin',
    status: 'active',
    created_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: '일반회원',
    email: 'user@jboard.co.kr',
    password: 'user1234',
    role: 'member',
    status: 'active',
    created_at: '2025-02-15T00:00:00.000Z'
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (sql) {
    await initDb();
  }

  const { method, query } = req;
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {}
  }

  const action = query.action || 'login';

  try {
    // ----------------------------------------------------
    // LOGIN
    // ----------------------------------------------------
    if (action === 'login' && method === 'POST') {
      const { email, password } = body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (sql) {
        const rows = await sql`SELECT * FROM jboard_users WHERE email = ${email}`;
        if (rows.length === 0) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        const { ok, needsRehash } = verifyPassword(password, rows[0].password);
        if (!ok) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        // 레거시 평문 저장분은 로그인 성공 시점에 해시로 자동 마이그레이션
        if (needsRehash) {
          await sql`UPDATE jboard_users SET password = ${hashPassword(password)} WHERE id = ${rows[0].id}`;
        }
        // 최근 접속 시간 갱신
        await sql`UPDATE jboard_users SET last_login = NOW() WHERE id = ${rows[0].id}`;
        const user = { ...rows[0], last_login: new Date().toISOString() };
        delete user.password;
        return res.status(200).json({ success: true, user });
      } else {
        const user = fallbackUsers.find((u) => u.email === email);
        if (!user) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        const { ok, needsRehash } = verifyPassword(password, user.password);
        if (!ok) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        if (needsRehash) {
          user.password = hashPassword(password);
        }
        user.last_login = new Date().toISOString();
        const userCopy = { ...user };
        delete userCopy.password;
        return res.status(200).json({ success: true, user: userCopy });
      }
    }

    // ----------------------------------------------------
    // REGISTER
    // ----------------------------------------------------
    if (action === 'register' && method === 'POST') {
      const { name, email, password } = body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (sql) {
        const existing = await sql`SELECT id FROM jboard_users WHERE email = ${email}`;
        if (existing.length > 0) {
          return res.status(409).json({ error: '이미 존재하는 이메일 계정입니다.' });
        }
        const inserted = await sql`
          INSERT INTO jboard_users (name, email, password, role, status)
          VALUES (${name}, ${email}, ${hashPassword(password)}, 'member', 'active')
          RETURNING id, name, email, role, status, created_at
        `;
        return res.status(201).json({ success: true, user: inserted[0] });
      } else {
        const existing = fallbackUsers.find((u) => u.email === email);
        if (existing) {
          return res.status(409).json({ error: '이미 존재하는 이메일 계정입니다.' });
        }
        const newUser = {
          id: Date.now(),
          name,
          email,
          password: hashPassword(password),
          role: 'member',
          status: 'active',
          created_at: new Date().toISOString()
        };
        fallbackUsers.push(newUser);
        const userCopy = { ...newUser };
        delete userCopy.password;
        return res.status(201).json({ success: true, user: userCopy });
      }
    }

    // ----------------------------------------------------
    // WITHDRAW (회원 탈퇴: 본인 이메일 + 비밀번호 확인 후 삭제)
    // ----------------------------------------------------
    if (action === 'withdraw' && method === 'POST') {
      const { email, password } = body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (sql) {
        const rows = await sql`SELECT * FROM jboard_users WHERE email = ${email}`;
        if (rows.length === 0) {
          return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
        const { ok } = verifyPassword(password, rows[0].password);
        if (!ok) {
          return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
        await sql`DELETE FROM jboard_users WHERE email = ${email}`;
        return res.status(200).json({ success: true, message: 'Withdrawn' });
      } else {
        const idx = fallbackUsers.findIndex((u) => u.email === email);
        if (idx === -1) {
          return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
        const { ok } = verifyPassword(password, fallbackUsers[idx].password);
        if (!ok) {
          return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
        }
        fallbackUsers.splice(idx, 1);
        return res.status(200).json({ success: true, message: 'Withdrawn' });
      }
    }

    // ----------------------------------------------------
    // UPDATE ROLE (Admin: 관리자/에디터/일반회원 권한 변경)
    // ----------------------------------------------------
    if (action === 'updateRole' && method === 'POST') {
      const { email, role, requester_email } = body || {};
      if (!email || !['admin', 'editor', 'member'].includes(role)) {
        return res.status(400).json({ error: '유효한 이메일과 권한(admin/editor/member)이 필요합니다.' });
      }

      // 관리자 권한 검증: 요청자가 admin인지 확인
      if (sql) {
        if (requester_email) {
          const requesterRows = await sql`SELECT role FROM jboard_users WHERE email = ${requester_email}`;
          if (requesterRows.length === 0 || requesterRows[0].role !== 'admin') {
            return res.status(403).json({ error: '관리자만 권한을 변경할 수 있습니다.' });
          }
        }
        const rows = await sql`SELECT id FROM jboard_users WHERE email = ${email}`;
        if (rows.length === 0) {
          return res.status(404).json({ error: '해당 이메일의 계정을 찾을 수 없습니다.' });
        }
        await sql`UPDATE jboard_users SET role = ${role} WHERE email = ${email}`;
        return res.status(200).json({ success: true, email, role });
      } else {
        const user = fallbackUsers.find((u) => u.email === email);
        if (!user) {
          return res.status(404).json({ error: '해당 이메일의 계정을 찾을 수 없습니다.' });
        }
        user.role = role;
        return res.status(200).json({ success: true, email, role });
      }
    }

    // ----------------------------------------------------
    // LIST USERS (Admin)
    // ----------------------------------------------------
    if (action === 'users' && method === 'GET') {
      if (sql) {
        const users = await sql`SELECT id, name, email, role, status, avatar, last_login, created_at FROM jboard_users ORDER BY created_at DESC`;
        return res.status(200).json({ users });
      } else {
        const users = fallbackUsers.map((u) => {
          const c = { ...u };
          delete c.password;
          return c;
        });
        return res.status(200).json({ users });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('[Auth API Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}
