'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  PenTool, 
  ThumbsUp, 
  Eye, 
  Clock, 
  Pin, 
  X, 
  Send, 
  Tag, 
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Post {
  id: number;
  title: string;
  category: string;
  author: string;
  content: string;
  views: number;
  likes: number;
  isNotice: boolean;
  tags?: string[];
  createdAt: string;
}

const CATEGORIES = ['전체', '공지사항', '퀀트전략', '매매일지', '종목토론', '자유게시판', 'Q&A'];

export default function BoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Write form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('자유게시판');
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comments for selected post
  const [comments, setComments] = useState<{ author: string; text: string; time: string }[]>([
    { author: '퀀트초보', text: '좋은 정보 감사합니다! 많은 도움이 되었습니다.', time: '10분 전' },
    { author: '시스템트레이더', text: '변동성 돌파 로직에서 슬리피지 감안 수치가 궁금하네요.', time: '5분 전' },
  ]);
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== '전체') params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const res = await fetch(`/api/board?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 본문을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          author: newAuthor || '투자자',
          content: newContent,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setWriteModalOpen(false);
        setNewTitle('');
        setNewContent('');
        setNewTags('');
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || '게시글 작성에 실패했습니다.');
      }
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPost = (post: Post) => {
    setSelectedPost(post);
    // increment view count
    fetch('/api/board', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, action: 'view' }),
    }).catch(() => {});
  };

  const handleLikePost = async () => {
    if (!selectedPost) return;
    try {
      await fetch('/api/board', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPost.id, action: 'like' }),
      });
      setSelectedPost({ ...selectedPost, likes: selectedPost.likes + 1 });
      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, likes: p.likes + 1 } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setComments([
      ...comments,
      { author: '익명 트레이더', text: commentInput.trim(), time: '방금 전' },
    ]);
    setCommentInput('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-blue-500" />
            커뮤니티 게시판
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            퀀트 알고리즘 연구, KIS 실시간 매매 전략 일지 및 자유로운 투자 의견을 나눕니다.
          </p>
        </div>

        <button
          onClick={() => setWriteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          <PenTool className="w-4 h-4" />
          새 글 작성
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative min-w-[260px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 내용 또는 작성자 검색..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Posts Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center font-medium">분류</th>
                <th className="py-3.5 px-4 font-medium">제목</th>
                <th className="py-3.5 px-4 w-28 font-medium">작성자</th>
                <th className="py-3.5 px-4 w-28 text-center font-medium">작성일</th>
                <th className="py-3.5 px-3 w-16 text-center font-medium">조회</th>
                <th className="py-3.5 px-3 w-16 text-center font-medium">추천</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    게시글을 불러오는 중입니다...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    등록된 게시글이 없습니다. 첫 글을 작성해보세요!
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => handleOpenPost(post)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-center">
                      {post.isNotice ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <Pin className="w-2.5 h-2.5" />
                          공지
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-400 border border-slate-700/60">
                          {post.category}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium group-hover:text-blue-400 transition-colors ${post.isNotice ? 'text-white font-semibold' : 'text-slate-200'}`}>
                          {post.title}
                        </span>
                        {post.tags && post.tags.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1">
                            {post.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-[10px] text-blue-400/80 bg-blue-500/10 px-1.5 py-0.2 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {post.author}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-500 text-xs font-mono">
                      {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400 text-xs font-mono">
                      {post.views}
                    </td>
                    <td className="py-3.5 px-3 text-center text-blue-400 text-xs font-mono font-medium">
                      {post.likes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedPost.category}
                  </span>
                  <span className="text-xs text-slate-400">작성자: {selectedPost.author}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(selectedPost.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white leading-snug">
                  {selectedPost.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              <div>{selectedPost.content}</div>

              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-4 border-t border-slate-800">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  {selectedPost.tags.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Like Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLikePost}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 font-medium text-xs transition-all cursor-pointer"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>추천하기</span>
                  <span className="font-bold font-mono">({selectedPost.likes})</span>
                </button>
              </div>

              {/* Comments Section */}
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  댓글 ({comments.length})
                </h3>

                <div className="space-y-2.5">
                  {comments.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-300">{c.author}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{c.time}</span>
                      </div>
                      <p className="text-slate-200">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="건전한 투자 토론 댓글을 남겨보세요..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    등록
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write Post Modal */}
      {writeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-500" />
                게시글 작성
              </h2>
              <button
                onClick={() => setWriteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    카테고리
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    작성자 닉네임
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="예: 퀀트마스터"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  본문 내용
                </label>
                <textarea
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="퀀트 매매 전략, 주가 분석, 질문 등 내용을 자유롭게 작성하세요..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="예: KIS, 변동성돌파, 삼성전자"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? '등록 중...' : '게시글 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
