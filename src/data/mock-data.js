// ═══════════════════════════════════════════════════════════
// Mock & Initial Data for JnewsBoard
// ═══════════════════════════════════════════════════════════

export const DEFAULT_POSTS = [
  { id:1, category:'notice', categoryName:'공지', title:'📢 JnewsBoard 시스템 정기 점검 안내 (09/25)', author:'시스템 관리자', authorAvatar:'https://api.dicebear.com/7.x/bottts/svg?seed=Admin', content:'안정적인 서비스 운영을 위해 데이터베이스 정기 점검 및 서버 패치 작업이 진행될 예정입니다.\n점검 시간 동안에는 서비스 접속이 일시적으로 제한될 수 있습니다.', views:1240, likes:42, comments:[{author:'김개발',date:'2026-09-22 09:15',content:'공지 확인했습니다!'}], createdAt:'2026-09-22 09:00', isNotice:true },
  { id:2, category:'tech', categoryName:'기술', title:'AdminLTE v4 + Vite 기반 관리자 페이지 구성 팁', author:'이프론트', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Lee', content:'AdminLTE 4는 Bootstrap 5 기반으로 완전히 재설계되었습니다.\nVite와 연동하면 HMR으로 초고속 개발이 가능합니다.', views:840, likes:56, comments:[{author:'박백엔드',date:'2026-09-22 09:40',content:'유용한 자료 감사합니다!'},{author:'최디자인',date:'2026-09-22 10:02',content:'다크모드 지원이 깔끔하네요.'}], createdAt:'2026-09-21 16:30', isNotice:false },
  { id:3, category:'qna', categoryName:'질문', title:'대시보드 실시간 웹소켓 아키텍처 문의', author:'박백엔드', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Park', content:'동시 접속자가 많은 상황에서 실시간 갱신을 위한 아키텍처 추천 부탁드립니다.', views:320, likes:18, comments:[], createdAt:'2026-09-21 14:10', isNotice:false },
  { id:4, category:'free', categoryName:'자유', title:'새로운 JnewsBoard 프로젝트를 시작했습니다!', author:'최신입', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Choi', content:'사내 게시판 및 관리자 툴 통합 프로젝트를 준비하고 있습니다.\n다양한 기능 제안 환영합니다.', views:512, likes:29, comments:[], createdAt:'2026-09-20 18:05', isNotice:false },
  { id:5, category:'info', categoryName:'정보', title:'2026년 웹 접근성 및 성능 최적화 가이드라인', author:'정도움', authorAvatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Jung', content:'WCAG 2.2 표준 및 최신 브라우저 성능 측정 지표 체크리스트입니다.', views:670, likes:35, comments:[], createdAt:'2026-09-19 11:20', isNotice:false }
];

export const DEFAULT_MEMBERS = [
  { id:1, name:'김개발', email:'kim@jboard.io', role:'admin', status:'active', joinedAt:'2025-03-15', lastLogin:'2026-09-22 10:12', posts:34, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Kim' },
  { id:2, name:'이프론트', email:'lee@jboard.io', role:'editor', status:'active', joinedAt:'2025-06-22', lastLogin:'2026-09-22 09:45', posts:28, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Lee' },
  { id:3, name:'박백엔드', email:'park@jboard.io', role:'editor', status:'active', joinedAt:'2025-08-10', lastLogin:'2026-09-21 17:30', posts:19, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Park' },
  { id:4, name:'최디자인', email:'choi@jboard.io', role:'member', status:'active', joinedAt:'2025-11-01', lastLogin:'2026-09-22 08:20', posts:12, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=ChoiD' },
  { id:5, name:'정도움', email:'jung@jboard.io', role:'member', status:'active', joinedAt:'2026-01-15', lastLogin:'2026-09-20 14:50', posts:8, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Jung' },
  { id:6, name:'한초보', email:'han@jboard.io', role:'member', status:'inactive', joinedAt:'2026-04-20', lastLogin:'2026-08-10 11:00', posts:2, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Han' },
  { id:7, name:'강매니저', email:'kang@jboard.io', role:'admin', status:'active', joinedAt:'2025-01-05', lastLogin:'2026-09-22 10:30', posts:45, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Kang' },
  { id:8, name:'윤테스트', email:'yoon@jboard.io', role:'member', status:'banned', joinedAt:'2026-07-01', lastLogin:'2026-09-01 09:00', posts:0, avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Yoon' }
];

export const DEFAULT_USERS = [
  { id:1, name:'관리자', email:'admin@jboard.co.kr', password:'admin1234', role:'admin', avatar:'https://api.dicebear.com/7.x/bottts/svg?seed=Admin', createdAt:'2025-01-01' },
  { id:2, name:'일반회원', email:'user@jboard.co.kr', password:'user1234', role:'member', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=User', createdAt:'2026-01-01' }
];

export const DEFAULT_CATEGORIES = [
  { id: 'notice', name: '공지', color: 'danger', description: '중요 공지사항 및 운영 안내' },
  { id: 'tech', name: '기술', color: 'primary', description: '최신 IT 기술 및 개발 지식 공유' },
  { id: 'qna', name: '질문', color: 'warning', description: '궁금한 점 질문과 답변' },
  { id: 'free', name: '자유', color: 'secondary', description: '자유로운 일상 소통 및 대화' },
  { id: 'info', name: '정보', color: 'info', description: '유용한 팁과 뉴스 정보' }
];
