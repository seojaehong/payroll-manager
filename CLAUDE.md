# Neuro-Coach 프로젝트

노무사 업무 자동화 및 급여 관리 시스템

---

## 행동 규칙 (Behavioral Guidelines)

LLM 코딩 실수를 줄이기 위한 행동 지침.
Tradeoff: 속도보다 신중함. 사소한 작업은 판단에 맡긴다.

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- **Never silently switch approaches** — if your plan changes, explain the pivot.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated issues, don't fix them — report with `[Observation]` at end of response.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]

**If your fix needs a fix, STOP.** Don't pile code on broken code. Rollback and try an alternative approach, or ask for guidance.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 자동 실행 규칙

- 파일 읽기/쓰기/수정, npm/node, Python, 빌드/테스트 — 확인 없이 자동 실행
- Git 작업 (add, commit, push) — 요청 시 자동 실행
- 빌드/린트/타입 에러 → 자동 수정 시도
- 작업 완료 시: 실행 → 자체 검토 → 개선 → 요약 및 다음 단계 제안

---

## 품질 검토 체크리스트

**구현 전:**
- [ ] 기존에 같은/비슷한 기능이 있는지 코드베이스 검색
- [ ] 기존 코드 수정 vs 신규 생성 판단

**구현 후:**
- [ ] 중복 페이지/기능 없음
- [ ] 저장 → 로드 → 표시 정상 동작
- [ ] 타입 일치 확인 (any 남용 없음)
- [ ] 에러 핸들링 + 피드백 (Toast/로딩) 제공
- [ ] 새로고침 / 메뉴 이동 후 복귀 시 데이터 유지

**UI 자문: "조너선 아이브가 이걸 보면?"**
→ 불필요한 요소 제거, 직관적, 일관성, 시각적 계층

---

## 프로젝트 구조

```
neuro-coach/
├── payroll-manager/        # 급여 관리 (Next.js 16 + TS + Tailwind + Firebase + Zustand)
├── tistory_uploader.py     # 티스토리 자동 발행 (Selenium)
├── comwel-auto-extension/  # 근로복지공단 자동화 Chrome 확장 (별도 repo)
├── edi-automation/         # EDI 자동화 (Python)
├── labor-automation/       # 노무 자동화 (Google Apps Script)
├── legal-automation/       # 법률 자동화 (Python + Selenium, 별도 repo)
└── docs/                   # PDCA 문서
```

---

## payroll-manager (우선순위 1)

| 항목 | 값 |
|------|-----|
| 기술 | Next.js 16, TypeScript, Tailwind CSS, Firebase, Zustand |
| 개발 | `cd payroll-manager && npm run dev` |
| 빌드 | `cd payroll-manager && npm run build` |

**주요 파일:**
- `src/store/useStore.ts` — 상태 관리
- `src/lib/retirement.ts` — 퇴직금 계산
- `src/lib/firestore.ts` — Firebase 연동
- `src/types/index.ts` — 타입 정의

**페이지:**
`/` 대시보드 · `/businesses` 사업장 · `/workers` 근로자 · `/wages` 급여 · `/reports` 보고서 · `/import` 가져오기 · `/settings` 설정

---

## 코딩 컨벤션

| 영역 | 규칙 |
|------|------|
| React | 함수형 컴포넌트, Tailwind CSS, Zustand 상태관리 |
| 파일명 | 컴포넌트 PascalCase, 유틸 camelCase, Python snake_case |
| Firestore | `cleanUndefined()` 필수 (undefined 거부) |
| 상태 셀렉터 | `useStore((s) => s.field)` 개별 셀렉터 (destructuring 금지) |

---

## Git 워크플로우

커밋 메시지: `feat:` / `fix:` / `docs:` / `refactor:` / `style:` / `chore:`

커밋 시 자동 포함:
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## 환경 설정

| 파일 | 용도 | gitignore |
|------|------|-----------|
| `payroll-manager/.env.local` | Firebase 설정 | O |
| `tistory_config.json` | 블로그 설정 | X |
| `tistory_cookies.pkl` | 로그인 쿠키 | O |

---

## 작업 우선순위

1. **payroll-manager** — 급여 관리 핵심
2. **tistory** — 블로그 자동 발행
3. **comwel-auto-extension** — 근복 자동화
4. **legal-automation** — 법률 자동화
5. **labor-automation** — 노무 자동화
6. **edi-automation** — EDI 자동화
