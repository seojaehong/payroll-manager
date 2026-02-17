# payroll-manager AGENTS.md
# 이 파일은 Codex CLI, Claude Code, Cursor, Gemini CLI 등 모든 AI 코딩 에이전트가 읽습니다.
# 마지막 업데이트: 2026-02-17

## 프로젝트 개요
한국 기업용 급여관리 시스템. 4대보험(국민연금/건강보험/고용보험/산재보험) 자동계산,
급여명세서 생성, 엑셀 임포트/엑스포트를 핵심 기능으로 한다.

## 기술 스택
- **프레임워크**: Next.js 16 (App Router) + TypeScript 5.x (strict mode)
- **스타일링**: Tailwind CSS 4
- **상태관리**: Zustand (클라이언트 전용 — Server Component에서 절대 사용 금지)
- **DB**: Firebase Firestore
- **인증**: Firebase Auth
- **패키지매니저**: npm
- **테스트**: Vitest (설정 진행 중)
- **린터**: ESLint

## Next.js 16 필수 규칙
- params, searchParams, cookies(), headers()는 **비동기** → 반드시 await
- proxy.ts 사용 (middleware.ts 폐기됨)
- Server Component가 기본 → 'use client'는 상호작용 필요 시에만
- 캐싱은 명시적 opt-in (cache() 디렉티브)

## 프로젝트 구조
```
src/
├── app/                    # Next.js 16 App Router 페이지
│   ├── api/                # API 라우트
│   ├── businesses/         # 사업장 관리
│   ├── import/             # 엑셀 임포트
│   ├── payslip/            # 급여명세서
│   ├── reports/            # 보고서
│   ├── settings/           # 설정
│   ├── wages/              # 급여 관리
│   ├── workers/            # 근로자 관리
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 대시보드
├── components/
│   ├── ui/                 # 공통 UI 컴포넌트
│   ├── ai/                 # AI 관련 컴포넌트
│   ├── BusinessSelector.tsx
│   └── Layout.tsx          # 레이아웃 컴포넌트
├── lib/
│   ├── firebase.ts         # Firebase 설정
│   ├── firestore.ts        # Firestore CRUD
│   ├── format.ts           # formatNumber, cleanUndefined 등
│   ├── excelDetector.ts    # 엑셀 컬럼 자동 감지
│   ├── retirement.ts       # 퇴직금 계산
│   ├── constants.ts        # 4대보험 요율 등 상수
│   └── payslip-pdf.ts      # 급여명세서 PDF 생성
├── store/
│   └── useStore.ts         # Zustand 통합 스토어
├── types/
│   └── index.ts            # 전체 타입 정의
└── hooks/
    └── useExcelImport.ts   # 엑셀 임포트 훅
```

## 빌드/테스트/린트 커맨드
```bash
npm run dev           # 개발 서버 (Turbopack)
npm run build         # 프로덕션 빌드
npm run lint          # ESLint
npx tsc --noEmit      # 타입 체크
npx vitest            # 단위 테스트 (설정 진행 중)
```

## 코딩 컨벤션
1. **함수 컴포넌트만** 사용 (클래스 컴포넌트 금지)
2. **Named export** 우선 (default export는 페이지 컴포넌트만)
3. **Zustand 셀렉터 패턴**: `const field = useStore(s => s.field)` (구조분해 금지)
4. **Firestore 쓰기**: 반드시 `cleanUndefined()` 적용 (undefined 거부)
5. **급여 계산**: 보험료 Math.floor, 수당 Math.round (원 미만 처리)
6. **한국어 변수명 금지**: 주석은 한국어 허용, 변수/함수명은 영어
7. **에러 처리**: try-catch + 사용자 친화적 에러 메시지 (한국어)

## Git 워크플로우
- master 브랜치에서 작업 (feature 브랜치는 필요 시 생성)
- 커밋 메시지: Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- PR 전 `npm run build` 통과 필수

## 도메인 지식 참조
급여 계산, 4대보험 요율, 세금 계산 등 도메인 로직은 `agent_docs/` 디렉토리 참조:
- `agent_docs/korean_payroll_calculations.md` — 급여 계산 공식 및 4대보험 요율
