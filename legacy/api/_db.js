import { neon } from '@neondatabase/serverless';
import { hashPassword } from './_password.js';

let sqlClient = null;
let initialized = false;

export function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }
  if (!sqlClient) {
    sqlClient = neon(dbUrl);
  }
  return sqlClient;
}

export async function initDb() {
  const sql = getDb();
  if (!sql || initialized) {
    return;
  }

  try {
    // 1. users table (jboard_ prefix: Neon DB를 타 프로젝트와 공유하므로 충돌 방지)
    await sql`
      CREATE TABLE IF NOT EXISTS jboard_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        avatar TEXT,
        status VARCHAR(50) DEFAULT 'active',
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // 기존 테이블에 last_login이 없으면 추가 (마이그레이션)
    await sql`ALTER TABLE jboard_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE jboard_users ADD COLUMN IF NOT EXISTS avatar TEXT`;
    await sql`ALTER TABLE jboard_users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`;

    // 2. posts table
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        author VARCHAR(100) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. comments table
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Seed default users if empty (패스워드는 해시로 저장)
    const userCount = await sql`SELECT COUNT(*) as count FROM jboard_users`;
    if (parseInt(userCount[0].count, 10) === 0) {
      await sql`
        INSERT INTO jboard_users (name, email, password, role, status)
        VALUES
          ('관리자', 'admin@jboard.co.kr', ${hashPassword('admin1234')}, 'admin', 'active'),
          ('일반회원', 'user@jboard.co.kr', ${hashPassword('user1234')}, 'member', 'active');
      `;
    }

    // Seed default sample posts if empty
    const postCount = await sql`SELECT COUNT(*) as count FROM posts`;
    if (parseInt(postCount[0].count, 10) === 0) {
      await sql`
        INSERT INTO posts (title, category, author, author_email, content, views, likes, comments_count, attachments)
        VALUES 
          ('[공지] JnewsBoard AdminLTE v4 및 Vercel 클라우드 시스템 오픈', '공지', '관리자', 'admin@jboard.co.kr', '<p>안녕하세요! <strong>JnewsBoard v4</strong>에 오신 것을 환영합니다.</p><p>Neon Postgres 및 Vercel Blob 스토리지, Quill 리치 텍스트 에디터가 연동된 정통 엔터프라이즈 게시판입니다.</p>', 128, 15, 2, '[]'::jsonb),
          ('Vercel Blob과 Neon Postgres를 활용한 모던 아키텍처', '기술', '일반회원', 'user@jboard.co.kr', '<p>서버리스 환경에서 빠른 쿼리와 안정적인 이미지 업로드 파이프라인을 구축하는 팁을 공유합니다.</p>', 85, 9, 1, '[]'::jsonb),
          ('Quill 에디터에서 스크린샷 이미지 붙여넣기 팁', '정보', '관리자', 'admin@jboard.co.kr', '<p>에디터 본문에서 캡처한 이미지를 <code>Ctrl + V</code>로 바로 붙여넣으면 고성능 Blob CDN에 실시간 업로드됩니다.</p>', 64, 7, 0, '[]'::jsonb);
      `;
    }

    initialized = true;
  } catch (err) {
    console.error('[DB Init Error]:', err);
  }
}
