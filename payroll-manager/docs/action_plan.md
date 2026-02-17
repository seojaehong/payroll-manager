# 🚀 payroll-manager 듀얼 AI 에이전트 개발 환경 구축 실행 계획
# 작성일: 2026-02-17 | 대상: 서재홍 노무사

---

## 📊 현재 상태 → 목표 상태

### AS-IS (현재)
- Claude Code + b-kit v1.4.7 단일 도구 사용
- CLAUDE.md 140줄 (최적화 완료)
- 코드 품질 58→85점 개선 이력
- Cowork VM 정상화 완료 (서브넷 충돌 해결)
- Codex CLI 설치 완료, 아직 실전 미적용

### TO-BE (목표)
- Claude Code (메인) + Codex CLI (보조) 듀얼 체제
- AGENTS.md (범용) + CLAUDE.md (Claude 전용) 계층 구조
- 자동화 hooks로 품질 관문 강제
- 병렬 에이전트 작업 가능한 Git 워크트리 환경
- 예상 비용: Claude Pro $20 + ChatGPT Plus $20 = 월 $40

---

## 🔧 Phase 1: 기반 환경 구축 (1일차, 약 2시간)

### Step 1-1. 파일 구조 배치
```
payroll-manager/
├── AGENTS.md                    # ← 새로 생성 (범용, 모든 AI 에이전트용)
├── CLAUDE.md                    # ← 기존 파일 리팩터 (Claude 전용으로 경량화)
├── .claude/
│   ├── hooks.json               # ← 새로 생성 (자동 품질 관문)
│   └── commands/                # 슬래시 커맨드 (기존 유지)
├── .codex/
│   └── config.toml              # ← 새로 생성 (Codex 프로젝트 설정)
├── agent_docs/                  # ← 새로 생성 (도메인 지식 분리)
│   ├── korean_payroll_calculations.md
│   ├── firestore_schema.md
│   └── excel_import_spec.md
└── .codex/skills/               # ← 새로 생성 (Codex 커스텀 스킬)
    └── payroll-review/
        └── SKILL.md
```

### Step 1-2. package.json 스크립트 추가
```json
{
  "scripts": {
    "ai:quick": "tsc --noEmit && eslint . --max-warnings 0",
    "ai:check": "pnpm ai:quick && vitest run && prettier --check .",
    "ai:compliance": "pnpm ai:check && firebase emulators:exec 'vitest run --config vitest.rules.config.ts'"
  }
}
```

### Step 1-3. Codex CLI 프로필 확인
```bash
# 기본 모드 (일상 작업)
codex "엑셀 임포트 시 빈 셀 처리 로직 추가해줘"

# 안전 모드 (코드 리뷰)
codex -p review "현재 PR의 변경사항을 리뷰해줘"

# 자율 모드 (단순 반복 작업)
codex -p auto "모든 컴포넌트에 JSDoc 주석 추가"
```

### Step 1-4. Git 워크트리 설정 (병렬 작업용)
```bash
# 메인 디렉토리에서
cd payroll-manager

# Claude Code용 워크트리 (복잡한 로직)
git worktree add ../payroll-claude feature/excel-import-v2

# Codex CLI용 워크트리 (병렬 작업)
git worktree add ../payroll-codex feature/ui-improvements

# 각 워크트리에서 독립적으로 AI 에이전트 실행
# 터미널 1: cd ../payroll-claude && claude
# 터미널 2: cd ../payroll-codex && codex "..."
```

---

## 🎯 Phase 2: 작업 분배 전략 (즉시 적용)

### Claude Code 담당 (70% — 복잡한 핵심 로직)
| 작업 유형 | 예시 | 이유 |
|-----------|------|------|
| 급여 계산 로직 | 4대보험 자동계산, 소득세 산출 | 도메인 지식 + 정확한 계산 필수 |
| 엑셀 임포트 개선 | 파싱/매핑/검증 파이프라인 | 다중 파일 리팩터링 |
| Firestore 스키마 변경 | 컬렉션 구조 재설계 | 아키텍처 이해 필요 |
| 디버깅 | 계산 오차, 상태 버그 추적 | 깊은 컨텍스트 추론 |
| 테스트 작성 (TDD) | 단위 테스트 → 구현 사이클 | 서브에이전트 분리 가능 |
| 리팩터링 | 코드 구조 개선, 타입 강화 | 전체 코드베이스 파악 능력 |

### Codex CLI 담당 (30% — 자율적 병렬 작업)
| 작업 유형 | 예시 | 이유 |
|-----------|------|------|
| UI 컴포넌트 구현 | 급여명세서 UI, 테이블 정렬 | 빠른 프로토타이핑 |
| PR 리뷰 | 코드 리뷰 + 인라인 코멘트 | Codex 리뷰가 업계 최고 수준 |
| 문서화 | JSDoc, README, 주석 | 자율 모드로 일괄 처리 |
| 스타일링 | Tailwind 클래스 최적화 | 토큰 효율적 |
| 보일러플레이트 | 새 페이지/컴포넌트 스캐폴딩 | 반복적 구조 생성 |
| CI/CD | GitHub Actions 워크플로우 | 스킬 기반 자동 생성 |

### 실전 워크플로우 예시: "엑셀 임포트 개선" 피처

```
[오전] Claude Code — 핵심 로직
  1. /plan → 엑셀 임포트 개선 계획 수립
  2. TDD: 파싱 실패 케이스 테스트 작성
  3. 엑셀 파싱 → Firestore 매핑 로직 구현
  4. 검증 파이프라인 (빈 셀, 중복, 형식 오류)
  5. Zustand 스토어 업데이트

[동시 진행] Codex CLI — 병렬 작업
  Terminal 2: codex "엑셀 임포트 진행 상태 프로그레스바 UI 만들어줘"
  Terminal 3: codex "엑셀 임포트 에러 메시지 한국어 다국어 파일 생성"

[오후] Codex CLI — PR 리뷰
  codex -p review "오늘 작업한 변경사항 전체 리뷰"
  → 계산 정확성, 타입 안전성, 엣지 케이스 자동 검출

[마무리] Claude Code — 피드백 반영
  리뷰에서 발견된 이슈 수정 + 최종 테스트
```

---

## 🔀 Phase 3: Claude Code 기존 환경 개선점

### 3-1. b-kit 사용 방식 최적화
현재 b-kit v1.4.7의 PDCA 사이클은 유지하되, 다음을 개선:

**개선 1: hooks.json으로 강제성 확보**
b-kit의 QCHECK은 Claude가 "스킵"할 수 있음 → hooks로 강제:
- PostToolUse 훅: 매 파일 수정 후 자동 포맷+린트
- Stop 훅: 매 응답 후 TypeScript 체크
- PreToolUse 훅: 위험 커맨드 차단

**개선 2: agent_docs 분리로 컨텍스트 효율화**
- CLAUDE.md에 도메인 지식 직접 넣지 않음
- `@agent_docs/korean_payroll_calculations.md` 온디맨드 로딩
- Claude가 급여 작업 시에만 참조 → 190K 토큰 컨텍스트 절약

**개선 3: claudekit 보완 검토**
- b-kit과 함께 claudekit 설치 고려
- 6-에이전트 병렬 코드 리뷰 (security, performance, architecture 등)
- file-guard: 보호 파일 목록 정의 (config 파일 실수 방지)

### 3-2. CLAUDE.md 구조 개선 (140줄 → ~80줄)
현재 140줄에서 AGENTS.md로 범용 규칙을 분리하면:
- AGENTS.md: ~80줄 (기술 스택, 빌드 커맨드, 프로젝트 구조, 컨벤션)
- CLAUDE.md: ~50줄 (행동 규칙, 서브에이전트, 슬래시 커맨드, 체크리스트)
- 총량은 비슷하지만, 각 파일의 역할이 명확해지고 Codex도 규칙 공유

### 3-3. MCP 서버 추가 권장
현재 Kapture + Desktop Commander 외에:
```bash
# Firebase MCP — Firestore 직접 조회/수정 가능
claude mcp add firebase npx -y @anthropic/firebase-mcp

# Context7 — Next.js 16, Zustand 등 최신 문서 참조
claude mcp add context7 npx -y @upstash/context7-mcp@latest

# next-devtools-mcp — Next.js 16 내장 (dev 서버 실행 중 자동)
# localhost:3000/_next/mcp 에서 자동 제공

# Playwright — E2E 테스트 자동화
claude mcp add playwright npx -y @anthropic/playwright-mcp
```

---

## 📦 Phase 4: Codex CLI 에코시스템 세팅

### 4-1. 글로벌 설정 (~/.codex/config.toml)
```toml
model = "codex-mini"
approval_policy = "on-request"
project_doc_fallback_filenames = ["CLAUDE.md"]
```

### 4-2. 커뮤니티 스킬 설치
```bash
# Codex 내부에서 실행
# 1. 스킬 생성기 (커스텀 스킬 개발용)
$skill-creator

# 2. PR 리뷰 스킬
$skill-installer https://github.com/ComposioHQ/awesome-codex-skills/tree/main/skills/pr-review

# 3. 커스텀 급여 리뷰 스킬
# .codex/skills/payroll-review/SKILL.md (이미 생성됨)
```

### 4-3. Codex + Claude 브릿지 (고급)
Codex CLI를 MCP 서버로 실행해서 Claude Code에서 호출:
```bash
# Codex를 MCP 서버로 시작
codex mcp

# Claude Code에서 MCP로 연결
claude mcp add codex-review -- codex mcp
```
이렇게 하면 Claude Code 세션 내에서 `/codex-review` 등으로
Codex의 리뷰 능력을 직접 호출 가능.

---

## 📅 실행 타임라인

### 즉시 (오늘)
- [ ] AGENTS.md 생성 및 payroll-manager 루트에 배치
- [ ] CLAUDE.md 리팩터 (범용 규칙을 AGENTS.md로 이관)
- [ ] hooks.json 배치 (.claude/hooks.json)
- [ ] agent_docs/ 디렉토리 생성 및 도메인 지식 파일 배치
- [ ] package.json에 ai:quick, ai:check 스크립트 추가

### 이번 주
- [ ] Codex CLI 프로젝트 설정 (.codex/config.toml)
- [ ] Codex 커스텀 스킬 (payroll-review) 테스트
- [ ] Git 워크트리 기반 병렬 작업 1회 시험
- [ ] MCP 서버 추가 (Firebase, Context7)
- [ ] 첫 번째 듀얼 에이전트 피처 개발 (엑셀 임포트 개선)

### 다음 주
- [ ] b-kit + hooks 통합 워크플로우 안정화
- [ ] Codex MCP 브릿지 설정 (Claude에서 Codex 리뷰 호출)
- [ ] 비용/시간 효율 측정 (1주차 vs 기존 방식 비교)
- [ ] 워크플로우 회고 및 AGENTS.md/CLAUDE.md 미세 조정

### 월말 목표
- [ ] 듀얼 에이전트 워크플로우 안정화
- [ ] 엑셀 임포트 개선 완료
- [ ] 코드 품질 85점 → 90점+ 달성
- [ ] AI 강의 자료에 듀얼 에이전트 전략 추가

---

## 💰 비용 최적화 전략

### 현재 예상 비용
- Claude Pro: $20/월 (기존 유지)
- ChatGPT Plus: $20/월 (Codex CLI 포함)
- **합계: $40/월**

### 비용 절감 팁
1. **Codex에 단순 작업 위임**: UI, 문서화, 보일러플레이트 → 토큰 2-4배 절약
2. **codex-mini 기본 사용**: 일상 작업은 mini, 복잡한 건 gpt-5-codex
3. **Claude Code에서 Sonnet 4.5 기본**: Opus는 아키텍처 결정 시에만
4. **agent_docs 온디맨드 로딩**: 컨텍스트 절약 → 더 긴 세션 가능

### 한도 초과 시 대응
- Claude Pro 한도 도달 → 해당 작업을 Codex로 전환
- ChatGPT Plus 한도 도달 → Claude Code로 전환
- 두 도구가 서로의 백업 역할

---

## 📝 체크리스트: 첫 듀얼 에이전트 세션

시작 전 확인:
- [ ] AGENTS.md가 프로젝트 루트에 있는가?
- [ ] .codex/config.toml이 있는가?
- [ ] hooks.json이 작동하는가? (파일 수정 후 자동 포맷 확인)
- [ ] Git 워크트리가 생성되었는가?
- [ ] 두 터미널에서 각각 Claude Code와 Codex CLI가 실행 가능한가?

첫 세션 순서:
1. Claude Code에서 `/plan` → 피처 계획 수립
2. Claude Code에서 TDD로 핵심 로직 구현
3. 동시에 Codex CLI에서 관련 UI/문서 작업
4. Codex CLI로 전체 PR 리뷰
5. Claude Code에서 리뷰 피드백 반영
6. `pnpm ai:check` 통과 확인
7. PR 생성 및 머지
