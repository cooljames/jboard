import { getDb, initDb } from './_db.js';

let fallbackUsers = [
  {
    id: 1,
    name: '관리자',
    email: 'admin@jboard.local',
    password: 'admin1234',
    role: 'admin',
    status: 'active',
    created_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: '일반회원',
    email: 'user@jboard.local',
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
        const rows = await sql`SELECT * FROM users WHERE email = ${email} AND password = ${password}`;
        if (rows.length === 0) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        const user = { ...rows[0] };
        delete user.password;
        return res.status(200).json({ success: true, user });
      } else {
        const user = fallbackUsers.find((u) => u.email === email && u.password === password);
        if (!user) {
          return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
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
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
          return res.status(409).json({ error: '이미 존재하는 이메일 계정입니다.' });
        }
        const inserted = await sql`
          INSERT INTO users (name, email, password, role, status)
          VALUES (${name}, ${email}, ${password}, 'member', 'active')
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
          password,
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
    // LIST USERS (Admin)
    // ----------------------------------------------------
    if (action === 'users' && method === 'GET') {
      if (sql) {
        const users = await sql`SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC`;
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
