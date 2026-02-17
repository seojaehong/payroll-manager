# Codex CLI vs Claude Code 빠른 비교 치트시트
# payroll-manager 프로젝트 기준 | 2026-02-17

## ⚡ 핵심 차이 한눈에

| 항목 | Claude Code | Codex CLI |
|------|-------------|-----------|
| **제작사** | Anthropic | OpenAI (오픈소스) |
| **모델** | Sonnet 4.5 / Opus 4.5-4.6 | codex-mini / gpt-5-codex |
| **컨텍스트** | 190K 토큰 (Opus 4.6: 1M) | 요청마다 전체 전송 (캐싱) |
| **설정 파일** | CLAUDE.md (독점) | AGENTS.md (개방 표준) |
| **플러그인** | 플러그인 마켓 (b-kit 등) | Skills 시스템 |
| **MCP 지원** | ✅ 클라이언트 | ✅ 클라이언트 + 서버 |
| **샌드박스** | 앱 레벨 (권한 요청) | OS 레벨 (Seatbelt/Landlock) |
| **서브에이전트** | ✅ Agent Teams | ❌ (외부 오케스트레이션) |
| **토큰 효율** | 보통 (234K/작업) | 우수 (72K/작업, 3.2배 절약) |
| **가격 (월)** | $20 Pro / $100-200 Max | $20 Plus / $200 Pro |
| **Windows** | ✅ (WSL) | ✅ (WSL) |
| **라이선스** | 독점 | Apache 2.0 |

## 🏆 각 도구가 더 잘하는 것

### Claude Code 우위 (payroll-manager 기준)
✅ 다중 파일 리팩터링 (엑셀 임포트 파이프라인 재구성)
✅ 아키텍처 추론 (Firestore 스키마 설계)
✅ 디버깅 (계산 오차 추적, 상태 버그)
✅ TDD 서브에이전트 (TestAgent → ImplAgent 분리)
✅ 긴 대화형 세션 (설계 토론 → 구현 → 검증)
✅ 한국어 코멘트/에러 메시지 품질

### Codex CLI 우위 (payroll-manager 기준)
✅ PR 리뷰 품질 (인라인 버그 탐지 최고 수준)
✅ 자율 실행 ("fire and forget" 단순 작업)
✅ 토큰 비용 효율 (동일 작업 2-4배 저렴)
✅ UI 프로토타이핑 (Tailwind 컴포넌트 빠른 생성)
✅ 문서/주석 일괄 생성
✅ CI/CD 워크플로우 구성

## 🔑 커맨드 비교

| 작업 | Claude Code | Codex CLI |
|------|-------------|-----------|
| 시작 | `claude` | `codex "프롬프트"` |
| 자율 모드 | `claude --dangerously-skip-permissions` | `codex --approval-mode never` |
| 리뷰 모드 | `/review` | `codex -p review "리뷰해줘"` |
| 계획 수립 | `/plan` | `$plan` |
| 파일 참조 | `@파일명` | 자동 감지 |
| 이미지 입력 | `claude 이미지경로` | `codex "이미지 설명"` (제한적) |
| 대화 계속 | `--continue` | `codex --continue` |
| 비대화 모드 | `claude -p "작업"` | `codex "작업"` (기본) |
| MCP 추가 | `claude mcp add` | `config.toml [mcp_servers]` |

## 🔄 듀얼 사용 패턴

```
[복잡한 피처 개발]
Claude Code: 설계 → TDD → 핵심 구현 → 디버깅
Codex CLI:   UI보조 → 문서화 → PR 리뷰

[버그 수정]
Claude Code: 원인 분석 → 수정 → 회귀 테스트
Codex CLI:   관련 테스트 보강

[리팩터링]
Claude Code: 구조 변경 → 마이그레이션
Codex CLI:   변경 후 전체 리뷰

[신규 페이지]
Codex CLI:   스캐폴딩 → UI 구현
Claude Code: 비즈니스 로직 + Firestore 연동
```

## ⚠️ 주의사항

1. **Codex 네트워크**: 기본 비활성 → Firebase 연동 테스트 불가
   → 로컬 목 데이터로 테스트하거나 `sandbox = "danger-full-access"` 사용
2. **AGENTS.md 크기**: 32KB 제한 → 도메인 지식은 agent_docs/로 분리
3. **Codex Windows**: WSL 필수 (Cowork과 동일 환경)
4. **동시 Git 작업**: 반드시 워크트리로 분리 (같은 브랜치 동시 수정 금지)
