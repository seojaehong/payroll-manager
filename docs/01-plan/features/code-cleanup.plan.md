# Plan: Code Cleanup Refactoring

> PDCA Phase: Plan
> Created: 2026-02-04
> Feature: code-cleanup

## 1. Overview

### Background
종합 UX 검토 결과, 다음 HIGH 우선순위 개선 항목이 식별됨:
- 코드 중복 약 2500줄 (/wages, /reports)
- 일관성 없는 사용자 피드백 (alert vs toast)
- 분산된 상태 관리 (SendHistory localStorage 직접 사용)

### Goals
1. /wages, /reports 페이지를 ImportTab 패턴으로 리팩토링하여 중복 제거
2. 모든 alert()를 toast.show()로 교체하여 UX 일관성 확보
3. SendHistory를 store에 통합하여 상태 관리 일원화

### Success Criteria
- [ ] /wages 페이지가 /businesses/[id] WagesTab으로 리다이렉트
- [ ] /reports 페이지가 /businesses/[id] ReportsTab으로 리다이렉트
- [ ] alert() 사용 0건 (confirm 제외)
- [ ] SendHistory가 useStore에서 관리됨
- [ ] 빌드 성공 (npm run build)

## 2. Scope

### In Scope
| 항목 | 파일 | 예상 변경량 |
|------|------|------------|
| 코드 중복 제거 | /wages/page.tsx, /reports/page.tsx | -2500줄 |
| alert 교체 | 9개 파일 | 약 30개 교체 |
| Store 통합 | useStore.ts, PayslipTab.tsx | +50줄, -30줄 |

### Out of Scope
- 새로운 기능 추가
- 사업장 탭 구조 변경 (MEDIUM 우선순위)
- useStore 도메인 분리 (LOW 우선순위)

## 3. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| 리다이렉트 후 기존 UX 손실 | High | WagesTab/ReportsTab의 모든 기능 확인 |
| Toast 메시지 길이 제한 | Low | 긴 메시지는 요약 처리 |
| Store 마이그레이션 | Medium | localStorage 기존 데이터 호환 |

## 4. Implementation Order

### Phase 1: 코드 중복 제거 (HIGH)
1. /wages/page.tsx → ImportTab 패턴 적용
2. /reports/page.tsx → ImportTab 패턴 적용
3. 빌드 검증

### Phase 2: alert → toast 전환 (HIGH)
1. WagesTab.tsx
2. PayslipTab.tsx
3. ReportsTab.tsx
4. RetirementTab.tsx
5. RetireModal.tsx
6. payslip-pdf.ts
7. retirement-pdf.ts
8. reports/page.tsx (리팩토링 전)
9. wages/page.tsx (리팩토링 전)

### Phase 3: Store 통합 (HIGH)
1. SendHistory 타입을 store에 추가
2. PayslipTab에서 localStorage 대신 store 사용
3. Firebase 동기화 로직 추가

## 5. Dependencies

- 현재 상태: /settings/page.tsx의 alert 이미 toast로 교체됨
- 필요 조건: Toast 컴포넌트가 이미 존재함 (ui/Toast.tsx)

## 6. Timeline

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | 코드 중복 제거 | 1 session |
| 2 | alert 전환 | 1 session |
| 3 | Store 통합 | 1 session |
| - | Gap Analysis | 자동 |

---
*Plan approved by: Pending*
