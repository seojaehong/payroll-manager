# CLAUDE.md — payroll-manager
# Claude Code 전용 설정. 범용 규칙은 @AGENTS.md 참조.

## 핵심 행동 규칙
- **Think Before Coding**: 코드 작성 전 영향받는 파일 목록과 접근법을 먼저 설명
- **Simplicity First**: 가장 단순한 해결책 우선. 과도한 추상화 금지
- **Surgical Changes**: 최소 변경 원칙. 관련 없는 파일 수정 금지
- **TDD 필수**: 새 기능 → 실패 테스트 작성 → 실패 확인 → 구현 → 통과 확인 → 리팩터

## 자동 실행 규칙
- 파일 수정 후 자동 prettier + eslint (hooks.json으로 강제)
- PR 생성 전 `npm run build` 통과 확인
- Firestore 보안 규칙 변경 시 에뮬레이터 테스트 필수
- 급여 계산 로직 변경 시 기존 테스트 케이스 전부 통과 확인

## 서브에이전트 전략
복잡한 작업 시 다음과 같이 분리:
- **TestAgent**: 요구사항만 보고 실패 테스트 작성
- **ImplAgent**: 테스트만 보고 통과 코드 작성  
- **ReviewAgent**: 코드 품질, 타입 안전성, 성능 검토

## 슬래시 커맨드
- `/plan` — 작업 계획 수립 (PDCA Plan 단계)
- `/review` — 현재 변경사항 셀프 리뷰
- `/test` — 관련 테스트 실행 및 커버리지 확인
- `/schema` — Firestore 스키마 확인 (@agent_docs/firestore_schema.md)
- `/calc` — 급여 계산 로직 확인 (@agent_docs/korean_payroll_calculations.md)

## 품질 체크리스트 (매 작업 완료 시)
□ TypeScript strict 에러 없음
□ 새 함수에 JSDoc 주석
□ Zustand 스토어는 셀렉터 패턴 사용
□ Server Component에서 클라이언트 전용 코드 없음
□ 급여 계산은 소수점 처리 (원 단위 절사/반올림 규칙 준수)
□ 한국어 에러 메시지 포함
