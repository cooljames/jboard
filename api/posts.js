import { getDb, initDb } from './_db.js';

// In-memory fallback if DATABASE_URL is not set
let fallbackPosts = [
  {
    id: 1,
    title: '[공지] JBoard AdminLTE v4 및 Vercel 클라우드 시스템 오픈',
    category: 'notice',
    author: '관리자',
    author_email: 'admin@jboard.local',
    content: '<p>안녕하세요! <strong>JBoard v4</strong>에 오신 것을 환영합니다.</p><p>Neon Postgres 및 Vercel Blob 스토리지, Quill 리치 텍스트 에디터가 연동된 정통 엔터프라이즈 게시판입니다.</p>',
    views: 128,
    likes: 15,
    comments_count: 2,
    attachments: [],
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 2,
    title: 'Vercel Blob과 Neon Postgres를 활용한 모던 아키텍처',
    category: 'tech',
    author: '일반회원',
    author_email: 'user@jboard.local',
    content: '<p>서버리스 환경에서 빠른 쿼리와 안정적인 이미지 업로드 파이프라인을 구축하는 팁을 공유합니다.</p>',
    views: 85,
    likes: 9,
    comments_count: 1,
    attachments: [],
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 3,
    title: 'Quill 에디터에서 스크린샷 이미지 붙여넣기 팁',
    category: 'info',
    author: '관리자',
    author_email: 'admin@jboard.local',
    content: '<p>에디터 본문에서 캡처한 이미지를 <code>Ctrl + V</code>로 바로 붙여넣으면 고성능 Blob CDN에 실시간 업로드됩니다.</p>',
    views: 64,
    likes: 7,
    comments_count: 0,
    attachments: [],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

  try {
    // ----------------------------------------------------
    // GET: Fetch Posts or Single Post
    // ----------------------------------------------------
    if (method === 'GET') {
      const postId = query.id ? parseInt(query.id, 10) : null;

      if (postId) {
        if (sql) {
          // Increment views
          await sql`UPDATE posts SET views = views + 1 WHERE id = ${postId}`;
          const rows = await sql`SELECT * FROM posts WHERE id = ${postId}`;
          if (rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
          }
          const comments = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;
          return res.status(200).json({ post: rows[0], comments });
        } else {
          // Fallback
          const post = fallbackPosts.find((p) => p.id === postId);
          if (!post) return res.status(404).json({ error: 'Post not found' });
          post.views += 1;
          return res.status(200).json({ post, comments: [] });
        }
      }

      // List query
      const category = query.category || 'all';
      const search = query.search ? query.search.toLowerCase() : '';
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '10', 10);
      const offset = (page - 1) * limit;

      if (sql) {
        let posts;
        let totalCountRow;

        if (category !== 'all' && search) {
          posts = await sql`
            SELECT * FROM posts 
            WHERE category = ${category} AND (LOWER(title) LIKE ${'%' + search + '%'} OR LOWER(content) LIKE ${'%' + search + '%'})
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
          `;
          totalCountRow = await sql`
            SELECT COUNT(*) as count FROM posts 
            WHERE category = ${category} AND (LOWER(title) LIKE ${'%' + search + '%'} OR LOWER(content) LIKE ${'%' + search + '%'})
          `;
        } else if (category !== 'all') {
          posts = await sql`
            SELECT * FROM posts 
            WHERE category = ${category} 
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
          `;
          totalCountRow = await sql`SELECT COUNT(*) as count FROM posts WHERE category = ${category}`;
        } else if (search) {
          posts = await sql`
            SELECT * FROM posts 
            WHERE LOWER(title) LIKE ${'%' + search + '%'} OR LOWER(content) LIKE ${'%' + search + '%'}
            ORDER BY created_at DESC 
            LIMIT ${limit} OFFSET ${offset}
          `;
          totalCountRow = await sql`
            SELECT COUNT(*) as count FROM posts 
            WHERE LOWER(title) LIKE ${'%' + search + '%'} OR LOWER(content) LIKE ${'%' + search + '%'}
          `;
        } else {
          posts = await sql`SELECT * FROM posts ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
          totalCountRow = await sql`SELECT COUNT(*) as count FROM posts`;
        }

        const total = parseInt(totalCountRow[0].count, 10);
        return res.status(200).json({
          posts,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1
        });
      } else {
        // Fallback filter
        let filtered = [...fallbackPosts];
        if (category !== 'all') {
          filtered = filtered.filter((p) => p.category === category);
        }
        if (search) {
          filtered = filtered.filter(
            (p) => p.title.toLowerCase().includes(search) || p.content.toLowerCase().includes(search)
          );
        }
        const total = filtered.length;
        const posts = filtered.slice(offset, offset + limit);
        return res.status(200).json({
          posts,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
          isLocalFallback: true
        });
      }
    }

    // ----------------------------------------------------
    // POST: Create Post or Like or Comment
    // ----------------------------------------------------
    if (method === 'POST') {
      const action = query.action;

      if (action === 'like') {
        const postId = parseInt(query.id || body.id, 10);
        if (sql) {
          await sql`UPDATE posts SET likes = likes + 1 WHERE id = ${postId}`;
          const row = await sql`SELECT likes FROM posts WHERE id = ${postId}`;
          return res.status(200).json({ success: true, likes: row[0]?.likes || 0 });
        } else {
          const post = fallbackPosts.find((p) => p.id === postId);
          if (post) post.likes += 1;
          return res.status(200).json({ success: true, likes: post ? post.likes : 0 });
        }
      }

      if (action === 'comment') {
        const { post_id, author, author_email, content } = body || {};
        if (sql) {
          const inserted = await sql`
            INSERT INTO comments (post_id, author, author_email, content)
            VALUES (${post_id}, ${author || '익명'}, ${author_email || ''}, ${content})
            RETURNING *
          `;
          await sql`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ${post_id}`;
          return res.status(201).json({ success: true, comment: inserted[0] });
        } else {
          const post = fallbackPosts.find((p) => p.id === parseInt(post_id, 10));
          if (post) post.comments_count += 1;
          return res.status(201).json({
            success: true,
            comment: { id: Date.now(), post_id, author, content, created_at: new Date().toISOString() }
          });
        }
      }

      // Create new post
      const { title, category, author, author_email, content, attachments } = body || {};
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      const postAttachments = Array.isArray(attachments) ? attachments : [];

      if (sql) {
        const inserted = await sql`
          INSERT INTO posts (title, category, author, author_email, content, attachments)
          VALUES (
            ${title}, 
            ${category || 'free'}, 
            ${author || '익명'}, 
            ${author_email || 'guest@jboard.local'}, 
            ${content}, 
            ${JSON.stringify(postAttachments)}::jsonb
          )
          RETURNING *
        `;
        return res.status(201).json({ success: true, post: inserted[0] });
      } else {
        const newPost = {
          id: Date.now(),
          title,
          category: category || 'free',
          author: author || '익명',
          author_email: author_email || 'guest@jboard.local',
          content,
          views: 0,
          likes: 0,
          comments_count: 0,
          attachments: postAttachments,
          created_at: new Date().toISOString()
        };
        fallbackPosts.unshift(newPost);
        return res.status(201).json({ success: true, post: newPost, isLocalFallback: true });
      }
    }

    // ----------------------------------------------------
    // PUT: Update Post
    // ----------------------------------------------------
    if (method === 'PUT') {
      const { id, title, category, content, attachments } = body || {};
      const postId = parseInt(id || query.id, 10);
      if (!postId) return res.status(400).json({ error: 'Post ID required' });

      if (sql) {
        const updated = await sql`
          UPDATE posts 
          SET title = ${title}, category = ${category}, content = ${content}, attachments = ${JSON.stringify(attachments || [])}::jsonb
          WHERE id = ${postId}
          RETURNING *
        `;
        return res.status(200).json({ success: true, post: updated[0] });
      } else {
        const idx = fallbackPosts.findIndex((p) => p.id === postId);
        if (idx !== -1) {
          fallbackPosts[idx] = { ...fallbackPosts[idx], title, category, content, attachments: attachments || [] };
          return res.status(200).json({ success: true, post: fallbackPosts[idx] });
        }
        return res.status(404).json({ error: 'Post not found' });
      }
    }

    // ----------------------------------------------------
    // DELETE: Remove Post
    // ----------------------------------------------------
    if (method === 'DELETE') {
      const postId = parseInt(query.id || body?.id, 10);
      if (!postId) return res.status(400).json({ error: 'Post ID required' });

      if (sql) {
        await sql`DELETE FROM posts WHERE id = ${postId}`;
        return res.status(200).json({ success: true, message: 'Deleted' });
      } else {
        fallbackPosts = fallbackPosts.filter((p) => p.id !== postId);
        return res.status(200).json({ success: true, message: 'Deleted' });
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('[Posts API Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}
