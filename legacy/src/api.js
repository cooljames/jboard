// JnewsBoard REST API Client for Vercel Serverless + Neon Postgres + Vercel Blob

const BASE_URL = '/api';

export const api = {
  // ----------------------------------------------------
  // Posts
  // ----------------------------------------------------
  async getPosts({ category = 'all', search = '', page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    params.append('page', page);
    params.append('limit', limit);

    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`);
    if (!res.ok) throw new Error(`게시글 목록 조회 실패 (${res.status})`);
    return await res.json();
  },

  async getPost(id) {
    const res = await fetch(`${BASE_URL}/posts?id=${id}`);
    if (!res.ok) throw new Error(`게시글 조회 실패 (${res.status})`);
    return await res.json();
  },

  async createPost({ title, category, author, author_email, content, attachments = [] }) {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, author, author_email, content, attachments })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '게시글 작성에 실패했습니다.');
    }
    return await res.json();
  },

  async updatePost({ id, title, category, content, attachments = [] }) {
    const res = await fetch(`${BASE_URL}/posts?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, category, content, attachments })
    });
    if (!res.ok) throw new Error('게시글 수정에 실패했습니다.');
    return await res.json();
  },

  async deletePost(id, signal) {
    const res = await fetch(`${BASE_URL}/posts?id=${id}`, {
      method: 'DELETE',
      ...(signal ? { signal } : {})
    });
    if (!res.ok) throw new Error('게시글 삭제에 실패했습니다.');
    return await res.json();
  },

  async likePost(id) {
    const res = await fetch(`${BASE_URL}/posts?id=${id}&action=like`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('추천 처리에 실패했습니다.');
    return await res.json();
  },

  async addComment({ post_id, author, author_email, content }) {
    const res = await fetch(`${BASE_URL}/posts?action=comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id, author, author_email, content })
    });
    if (!res.ok) throw new Error('댓글 작성에 실패했습니다.');
    return await res.json();
  },

  // ----------------------------------------------------
  // File Upload to Vercel Blob
  // ----------------------------------------------------
  async uploadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const res = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              base64
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || '파일 업로드에 실패했습니다.');
          }
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            url: data.url,
            pathname: data.pathname
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('파일 읽기 오류'));
      reader.readAsDataURL(file);
    });
  },

  // ----------------------------------------------------
  // Auth & Users
  // ----------------------------------------------------
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/auth?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || '로그인에 실패했습니다.');
    }
    return data.user;
  },

  async register(name, email, password) {
    const res = await fetch(`${BASE_URL}/auth?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || '회원가입에 실패했습니다.');
    }
    return data.user;
  },

  async withdraw(email, password) {
    const res = await fetch(`${BASE_URL}/auth?action=withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || '탈퇴 처리에 실패했습니다.');
    }
    return data;
  },

  async getUsers() {
    const res = await fetch(`${BASE_URL}/auth?action=users`);
    if (!res.ok) throw new Error('회원 목록 조회 실패');
    const data = await res.json();
    return data.users || [];
  },

  async updateUserRole(email, role) {
    const res = await fetch(`${BASE_URL}/auth?action=updateRole`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || '권한 변경에 실패했습니다.');
    }
    return data;
  },

  // ----------------------------------------------------
  // Analytics
  // ----------------------------------------------------
  async getAnalytics() {
    const res = await fetch(`${BASE_URL}/analytics`);
    if (!res.ok) throw new Error('통계 데이터 조회 실패');
    return await res.json();
  }
};
