import { getDb, initDb } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDb();
  if (sql) {
    await initDb();
  }

  try {
    if (sql) {
      const totalPostsRow = await sql`SELECT COUNT(*) as count, COALESCE(SUM(views), 0) as total_views FROM posts`;
      const todayPostsRow = await sql`
        SELECT COUNT(*) as count FROM posts 
        WHERE created_at >= CURRENT_DATE
      `;
      const totalUsersRow = await sql`SELECT COUNT(*) as count FROM jboard_users`;

      const categoryRows = await sql`
        SELECT category, COUNT(*) as count FROM posts GROUP BY category
      `;

      const catMap = { '공지': 0, '기술': 0, '질문': 0, '자유': 0, '정보': 0 };
      categoryRows.forEach((r) => {
        catMap[r.category] = parseInt(r.count, 10);
      });

      return res.status(200).json({
        totalPosts: parseInt(totalPostsRow[0].count, 10),
        todayPosts: parseInt(todayPostsRow[0].count, 10),
        totalViews: parseInt(totalPostsRow[0].total_views, 10),
        totalUsers: parseInt(totalUsersRow[0].count, 10),
        categoryDistribution: {
          labels: Object.keys(catMap),
          series: Object.values(catMap)
        }
      });
    } else {
      // Fallback stats
      return res.status(200).json({
        totalPosts: 3,
        todayPosts: 1,
        totalViews: 277,
        totalUsers: 2,
        categoryDistribution: {
          labels: ['공지', '기술', '질문', '자유', '정보'],
          series: [1, 1, 0, 0, 1]
        }
      });
    }
  } catch (error) {
    console.error('[Analytics API Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}
