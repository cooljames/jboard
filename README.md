# 📊 J뉴스보드 - AdminLTE v4 기반 커뮤니티 & 관리자 플랫폼

> **AdminLTE v4** 최신 표준 규격과 **ApexCharts**를 적용한 반응형 커뮤니티 게시판 및 관리자 대시보드 웹 애플리케이션입니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 👥 3단계 역할 기반 접근 제어 (RBAC)
- **비로그인 방문자 (Guest)**:
  - 반응형 단일 와이드 안내 홈페이지 (Hero 섹션, 최신 업데이트, 최신글 미리보기)
  - 관리자 대시보드 직접 접근 시 보안 가드 작동 및 차단 안내 토스트
- **일반회원 (`role: 'member'`)**:
  - 관리자 사이드바가 배제된 **게시판 전용 풀위드 화면**
  - 게시글 작성/수정/삭제, 댓글 작성, 추천 기능
  - 관리자 대시보드 권한 격리 및 보호
- **관리자 (`role: 'admin'`)**:
  - **AdminLTE v4 공식 레이아웃** 통합 대시보드
  - 게시판 관리 (카테고리 필터링, 검색, 상태 관리)
  - 회원 관리 (회원 목록, 권한 변경, 모니터링)
  - 통계 분석 (ApexCharts 기반 트렌드 및 점유율 시각화)
  - 환경 설정 (보안, 테마, 데이터 초기화)

### 2. 🎨 AdminLTE v4 공식 디자인 가이드라인 준수
- **Source Sans 3** & **Inter** 공식 타이포그래피 적용
- 시그니처 **4색 Small-Box 위젯** (`text-bg-primary`, `success`, `info`, `warning`)
- 정통 **`.user-menu`** 드롭다운 (`.user-header`, `.user-body`, `.user-footer`)
- 카드 인터랙션 **`.card-tools`** (접기/펼치기 및 닫기 제어)
- 헤더 편의 기능: **전체화면 토글(Fullscreen)**, **알림 센터(3건 배지)**, **빠른 글쓰기 모달**

### 3. 📈 ApexCharts 인터랙티브 데이터 시각화
- **주간 트렌드 차트 (Spline Area Chart)**: 일별 신규 게시글 및 누적 조회수 추이 시각화
- **카테고리별 비중 차트 (Donut Chart)**: 공지/기술/질문/자유/정보 점유율 시각화
- **다크/라이트 모드 실시간 동기화**: 테마 전환 시 ApexCharts 배경 및 축 색상 실시간 자동 갱신

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), CSS3 (Custom Properties)
- **UI Framework**: [AdminLTE v4](https://adminlte.io/themes/v4/index.html) (`admin-lte@4`), [Bootstrap 5.3](https://getbootstrap.com/)
- **Icons**: [Bootstrap Icons](https://icons.getbootstrap.com/)
- **Charts**: [ApexCharts v3.37.1](https://apexcharts.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 시작하기 (Getting Started)

### 1. 설치 (Installation)
```bash
npm install
```

### 2. 로컬 실행 (Development Server)
```bash
npm run dev
```
브라우저에서 `http://localhost:3000/`으로 접속합니다.

---

## 🔑 테스트 계정 안내

로그인 화면 하단의 **[선택]** 버튼을 클릭하면 원클릭으로 자동 입력됩니다:
- **관리자 계정**: `admin@jboard.co.kr` / `admin1234`
- **일반회원 계정**: `user@jboard.co.kr` / `user1234`
