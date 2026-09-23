# 📋 JnewsBoard Vercel 배포 & 클라우드 스택 리팩토링 계획서

> **문서명**: `refatory.md`  
> **프로젝트**: JnewsBoard (AdminLTE v4 커뮤니티 & 관리자 플랫폼)  
> **작성일시**: 2026-09-22  
> **상태**: 🟡 계획 수립 완료 (사용자 승인 대기 / 코딩 대기 중)

---

## 1. 리팩토링 목적 및 핵심 요구사항 분석

본 계획서는 기존의 브라우저 로컬 스토리지(`localStorage`) 기반 SPA 구조를 탈피하여, **Vercel 프로덕션 배포**, **Neon Serverless Postgres(텍스트/데이터)**, **Vercel Blob(이미지/파일 스토리지)**, **유명 리치 에디터(Quill.js 이미지 복사/붙여넣기)**, **멀티 파일 드래그 앤 드롭 첨부 시스템**을 도입하기 위한 종합 기술 설계서입니다.

### 5대 핵심 요구사항 및 기술 솔루션 매핑

| 번호 | 요구사항 | 기술 스택 및 구현 솔루션 | 상세 설명 |
| :---: | :--- | :--- | :--- |
| **1** | **Vercel 배포** | Vercel Serverless Functions + `vercel.json` | Vite 번들러 빌드(`dist/`)와 Vercel API 라우트(`/api/*`)를 결합한 모던 풀스택 배포 구조 수립 |
| **2** | **Vercel DB (Neon)** | **Neon Postgres** (`@neondatabase/serverless`) | HTTP 기반 Neon Serverless 드라이버로 커넥션 풀 고갈 없이 초고속 쿼리 실행 및 관계형 DB 구축 |
| **3** | **이미지/파일 스토리지** | **Vercel Blob** (`@vercel/blob`) | Vercel 고성능 글로벌 Edge 스토리지로 본문 이미지 및 첨부파일 영구 보관 및 CDN 서빙 |
| **4** | **이미지 복사/붙여넣기** | **Quill.js** 리치 텍스트 에디터 (v2 / v1.3.7) | AdminLTE v4 공식 권장 유명 위지윅 에디터 탑재. 클립보드 캡처 이미지 즉시 감지 및 Blob 자동 업로드/임베드 |
| **5** | **멀티 드래그 앤 드롭 첨부** | 전용 Multi-File Dropzone UI 컴포넌트 | 복수 파일 동시 드래그앤드롭, 파일 유형별 아이콘, 크기 표시, 업로드 진행률, 취소 및 개별 삭제 지원 |

---

## 2. 시스템 아키텍처 다이어그램

```mermaid
flowchart TD
    subgraph Client["Frontend Client (AdminLTE v4 + Vite SPA)"]
        UI["AdminLTE v4 Dashboard & Board"]
        Quill["Quill.js Rich Editor\n(이미지 클립보드 Paste 감지)"]
        Dropzone["Multi-file Dropzone\n(드래그 앤 드롭 다중 첨부)"]
        ClientAPI["src/api.js (REST API 클라이언트)"]
    end

    subgraph Vercel["Vercel Cloud Platform"]
        Router["vercel.json (Route Rewrites)"]
        StaticCDN["Edge CDN (Static Assets: dist/)"]
        
        subgraph Serverless["Vercel Serverless Functions (/api)"]
            APIPosts["/api/posts.js\n(게시글 CRUD & 통계)"]
            APIUpload["/api/upload.js\n(Vercel Blob 업로더)"]
            APIAuth["/api/auth.js\n(회원가입/로그인/RBAC)"]
            APIDB["/api/_db.js\n(Neon SQL 커넥터 & Auto DDL)"]
        end
    end

    subgraph CloudServices["Cloud Data & Storage"]
        NeonDB[("Neon Postgres Database\n(users, posts, comments, attachments)")]
        VercelBlob[("Vercel Blob Storage\n(CDN: *.public.blob.vercel-storage.com)")]
    end

    UI --> ClientAPI
    Quill -- "이미지 붙여넣기" --> ClientAPI
    Dropzone -- "다중 파일 드롭" --> ClientAPI
    
    ClientAPI --> Router
    Router --> StaticCDN
    Router --> Serverless
    
    APIPosts --> APIDB --> NeonDB
    APIAuth --> APIDB --> NeonDB
    APIUpload --> VercelBlob
```

---

## 3. 상세 리팩토링 단계별 로드맵 (Phases)

```mermaid
flowchart LR
    P1["Phase 1: Vercel 배포 및 API 환경 구성"] --> P2["Phase 2: Neon Postgres DB 연동 및 스키마"]
    P2 --> P3["Phase 3: Vercel Blob 업로드 엔드포인트"]
    P3 --> P4["Phase 4: Quill.js 이미지 붙여넣기 에디터"]
    P4 --> P5["Phase 5: 멀티 드래그 앤 드롭 첨부파일"]
    P5 --> P6["Phase 6: 프론트엔드 연동 & E2E 검증"]
```

---

### Phase 1: Vercel 배포 환경 및 서버리스 API 기반 구축
1. **의존성 패키지 설치 (`package.json`)**:
   - `@neondatabase/serverless`: Neon Postgres HTTP 쿼리 클라이언트
   - `@vercel/blob`: Vercel Blob 스토리지 SDK
   - `quill`: 정통 위지윅 리치 텍스트 에디터 라이브러리
2. **Vercel 설정 파일 (`vercel.json`) 작성**:
   - 정적 파일 빌드 및 SPA 라우팅을 위한 rewrite 규칙 정의:
     ```json
     {
       "buildCommand": "npm run build",
       "outputDirectory": "dist",
       "framework": "vite",
       "rewrites": [
         { "source": "/api/(.*)", "destination": "/api/$1" },
         { "source": "/(.*)", "destination": "/index.html" }
       ]
     }
     ```
3. **로컬 개발 환경(`npm run dev`) API 연동 프록시 구성 (`vite.config.js`)**:
   - 로컬 Vite 개발 서버에서 `/api/*` 요청을 로컬 모의 핸들러 또는 Vercel CLI(`vercel dev`) 환경과 완벽히 호환되도록 미들웨어 구성.
   - 환경변수(`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`)가 없더라도 로컬 개발이 멈추지 않도록 **Graceful Fallback(로컬 목업/임시 인메모리 저장소)** 자동 지원.

---

### Phase 2: Neon Postgres 데이터베이스 연동 & 스키마 구축

#### 2.1. 데이터베이스 DDL 스키마 (`api/_db.js`)
Neon 데이터베이스 최초 연결 시 자동으로 테이블을 생성(`CREATE TABLE IF NOT EXISTS`)하는 안전 마이그레이션 로직 구현:

```sql
-- 1. 회원 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'admin' | 'member'
  avatar TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 게시글 테이블 (posts)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  author VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,                -- Quill.js 리치 HTML 본문
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  attachments JSONB DEFAULT '[]'::jsonb, -- [{ name, size, url, type }, ...]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 댓글 테이블 (comments)
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  author VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2. 서버리스 엔드포인트 구현
- `api/posts.js`:
  - `GET /api/posts`: 카테고리 필터, 검색어, 페이지네이션 조회
  - `GET /api/posts?id=:id`: 단일 게시글 조회 (조회수 +1 자동 증가)
  - `POST /api/posts`: 신규 게시글 생성 (인증 토큰 검증, 본문 HTML 및 attachments 저장)
  - `PUT /api/posts?id=:id`: 게시글 수정
  - `DELETE /api/posts?id=:id`: 게시글 삭제 (작성자 또는 관리자 권한 확인)
  - `POST /api/posts?id=:id&action=like`: 추천 수 증가
- `api/auth.js`:
  - `POST /api/auth?action=login`: 로그인 인증
  - `POST /api/auth?action=register`: 신규 회원 가입
  - `GET /api/auth?action=me`: 현재 세션 사용자 확인
- `api/analytics.js`:
  - 대시보드 통계 지표(총 게시글, 오늘 신규글, 회원수, 주간 트렌드 데이터, 카테고리 점유율) Neon SQL 집계 반환

---

### Phase 3: Vercel Blob 기반 파일 및 이미지 업로드 API

- **엔드포인트**: `api/upload.js`
- **구현 방식**:
  - `POST /api/upload`
  - 요청 페이로드(Multipart FormData 또는 Direct Binary Stream)를 수신
  - `@vercel/blob`의 `put(filename, data, { access: 'public' })` 호출
  - 반환 객체:
    ```json
    {
      "success": true,
      "url": "https://public.blob.vercel-storage.com/jboard/image-xyz.png",
      "pathname": "jboard/image-xyz.png",
      "contentType": "image/png",
      "size": 245102
    }
    ```
  - **오프라인/로컬 Fallback 지원**: `BLOB_READ_WRITE_TOKEN` 미설정 로컬 개발 환경에서는 Base64 DataURL 또는 로컬 임시 서빙 URL을 생성하여 로컬 테스트 중단 방지.

---

### Phase 4: Quill.js 리치 텍스트 에디터 도입 (클립보드 이미지 복사/붙여넣기)

1. **에디터 선정 이유 (Quill.js)**:
   - 전 세계 수천만 사이트에서 검증된 대표적인 오픈소스 위지윅 에디터
   - AdminLTE v4 공식 데모 에디터로 채택되어 디자인 궁합 100%
   - 순수 JavaScript로 동작하여 번들 크기가 가볍고 불필요한 프레임워크 오버헤드 없음
2. **클립보드 이미지 복사/붙여넣기 (Paste Handling)**:
   - 사용자가 캡처 도구(스크린샷)로 복사하거나 웹 브라우저에서 복사한 이미지를 에디터 본문에서 `Ctrl + V` 누를 시:
     1) `paste` 이벤트 또는 Quill `clipboard` 모듈에서 `image/*` 파일 추출
     2) 백그라운드로 `/api/upload`에 비동기 전송
     3) 업로드 중 에디터에 로딩 인디케이터(스피너) 표시
     4) 반환된 Vercel Blob CDN URL을 에디터의 현재 커서 위치에 `<img src="...">`로 자동 삽입
3. **툴바 커스터마이징**:
   - 제목 헤더(`h1`, `h2`, `h3`), 굵게, 기울임, 밑줄, 취소선
   - 글머리 기호, 번호 매기기, 코드 블록(`code-block`), 인용구
   - 링크 삽입, 이미지 첨부 버튼, 정렬, 서식 지우기
   - AdminLTE 4의 다크/라이트 테마에 완벽 동기화되는 툴바 CSS 적용

---

### Phase 5: 게시글 멀티 드래그 앤 드롭 첨부파일 시스템

1. **UI 컴포넌트 설계 (Dropzone 영역)**:
   - 모달 하단에 직관적인 파일 드롭존 컨테이너 배치:
     - 점선 테두리(`.border-dashed`), 구름 업로드 아이콘(`bi-cloud-arrow-up`), 안내 문구
     - "여기로 파일을 끌어다 놓거나 클릭하여 선택하세요 (복수 파일 지원)"
     - `<input type="file" multiple ...>` 내장
2. **인터랙션 및 드래그 이벤트**:
   - `dragenter`, `dragover`: 드롭존 영역 테두리 및 배경 강조 효과 (`.drag-over`)
   - `dragleave`, `drop`: 기본 동작 방지(`e.preventDefault()`) 및 파일 목록 수집
3. **복수 파일 큐(Queue) 관리**:
   - 드롭된 모든 파일의 목록을 실시간 카드/태그 리스트로 렌더링
   - 항목별 정보 표시:
     - 파일 종류별 아이콘 (이미지: `bi-file-earmark-image`, PDF: `bi-file-earmark-pdf`, 압축: `bi-file-earmark-zip`, 문서: `bi-file-earmark-word`, 기타: `bi-file-earmark`)
     - 파일명 및 포맷팅된 용량 (예: `project-spec.pdf (2.4 MB)`)
     - 업로드 상태 뱃지 (`대기중`, `업로드중...`, `완료`)
     - 개별 취소/삭제 버튼 (`bi-x-lg`)
4. **게시글 본문과의 연계 저장**:
   - 글 저장 버튼 클릭 시 큐의 파일들을 Vercel Blob에 순차/병렬 업로드
   - 생성된 파일 메타데이터 배열을 `attachments` JSON 컬럼으로 Neon DB에 저장
5. **게시글 상세 화면에서의 다운로드 UI**:
   - 본문 하단에 `첨부파일 (N개)` 아코디언/카드 표시
   - 각 첨부파일 클릭 시 다운로드 또는 새 창 미리보기 제공

---

### Phase 6: 프론트엔드(`src/main.js`, `src/style.css`) 연동 및 검증

1. **클라이언트 API 모듈 (`src/api.js`) 분리**:
   - `fetchPosts()`, `createPost()`, `updatePost()`, `deletePost()`
   - `uploadFile()`, `login()`, `register()` 등 비동기 API 통신 추상화
2. **AdminLTE v4 뷰 연계**:
   - 비회원 홈: 최신 게시글 5건을 Neon DB에서 실시간 Fetch하여 렌더링
   - 일반회원 게시판: 페이지네이션 및 카테고리 쿼리 연동
   - 관리자 대시보드: Neon DB 집계 통계와 ApexCharts 실시간 연동
3. **스타일링 보강 (`src/style.css`)**:
   - Quill.js 에디터 다크모드/라이트모드 맞춤 테마
   - 드래그 앤 드롭 Dropzone 호버/액티브 애니메이션
   - 첨부파일 배지 및 프로그레스 바 스타일

---

## 4. 파일 변경 계획 (File Modification Matrix)

| 구분 | 파일 경로 | 변경 내용 |
| :---: | :--- | :--- |
| **NEW** | `vercel.json` | Vercel 배포 빌드 명령어, 출력 디렉토리, SPA rewrite 규칙 |
| **NEW** | `api/_db.js` | Neon Postgres 연결 풀러 및 스키마 자동 초기화 DDL |
| **NEW** | `api/posts.js` | 게시글 목록, 단일 조회, 작성, 수정, 삭제, 추천 Vercel Serverless API |
| **NEW** | `api/upload.js` | Vercel Blob 연동 이미지 및 멀티 첨부파일 업로드 API |
| **NEW** | `api/auth.js` | 사용자 로그인, 회원가입, 세션 확인 API |
| **NEW** | `api/analytics.js` | 관리자 대시보드 및 ApexCharts용 Neon 집계 통계 API |
| **NEW** | `src/api.js` | 프론트엔드 비동기 REST API 클라이언트 모듈 |
| **MODIFY** | `package.json` | `@neondatabase/serverless`, `@vercel/blob`, `quill` 의존성 추가 |
| **MODIFY** | `index.html` | Quill.js 스타일시트 및 스크립트 CDN/번들 로드 |
| **MODIFY** | `src/main.js` | Quill 에디터 마운트, 이미지 클립보드 붙여넣기 리스너, 멀티 드래그앤드롭 로직, API 연동 |
| **MODIFY** | `src/style.css` | Dropzone 스타일, Quill 에디터 다크/라이트 테마 CSS, 첨부파일 목록 UI |

---

## 5. Vercel 환경 변수 설정 가이드 (Environment Variables)

Vercel 프로젝트 대시보드(Settings → Environment Variables)에서 설정할 환경 변수 목록입니다:

| 환경 변수명 | 필수 여부 | 설명 | 예시 값 |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **필수** | Neon Postgres 연결 문자열 (Pooled Connection) | `postgresql://neondb_owner:***@ep-***.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `BLOB_READ_WRITE_TOKEN` | **필수** | Vercel Blob 스토리지 읽기/쓰기 토큰 | `vercel_blob_rw_***` (Vercel Storage 탭에서 1클릭 생성) |
| `JWT_SECRET` | 선택 | 사용자 인증 세션 토큰 서명용 키 | `jboard-secure-jwt-secret-key-2026` |

> 💡 **로컬 개발 환경 (`.env.local`)**:  
> 로컬에서도 동일한 변수를 `.env.local`에 기재하거나, 없을 경우 자동으로 로컬 목업 및 인메모리 스토리지 모드로 매끄럽게 폴백(Fallback) 동작합니다.

---

## 6. 사전 검토 사항 및 체크리스트 (Verification Plan)

### 6.1. 기능 검증 시나리오
- [ ] **Vercel 빌드 및 정적 서빙**: `npm run build` 성공 및 `dist/` 산출물 정상 생성 확인
- [ ] **Neon DB 연동**: 게시글 작성 시 Neon Postgres의 `posts` 테이블에 영구 저장 확인
- [ ] **Quill 에디터 클립보드 이미지 복사/붙여넣기**:
  - 화면 캡처 후 에디터에 `Ctrl+V` 시 이미지가 Vercel Blob에 업로드되고 CDN URL로 본문에 임베드되는가?
- [ ] **멀티 파일 드래그 앤 드롭**:
  - 3개 이상의 복수 파일(이미지, PDF, 문서 등)을 동시에 드롭존에 끌어다 놓았을 때 큐에 정상 등록되는가?
  - 각 파일의 크기, 아이콘이 올바르게 표시되고, 불필요한 파일을 개별 삭제할 수 있는가?
  - 글 등록 완료 시 첨부파일 정보가 `attachments` JSON 컬럼에 안전하게 보관되는가?
- [ ] **첨부파일 다운로드**:
  - 상세 글 보기 화면에서 첨부파일 링크 클릭 시 원본 파일이 정상적으로 다운로드/열람되는가?
- [ ] **역할 기반 권한(RBAC) 유지**:
  - 비회원(홈페이지), 일반회원(게시판 전용), 관리자(AdminLTE v4 대시보드) 권한 분기 및 가드가 DB 연동 후에도 완벽히 유지되는가?

---

> ⚠️ **대기 안내**: 사용자 요청에 따라 본 `refatory.md` 계획서 작성을 완료하였으며, **실제 코드 수정 및 파일 생성/코딩 작업은 일체 진행하지 않고 대기**합니다.  
> 본 계획서를 검토하신 후 **"진행해"** 또는 **"승인"**을 주시면 위 계획에 따라 단계별 구현 및 검증을 시작하겠습니다.
