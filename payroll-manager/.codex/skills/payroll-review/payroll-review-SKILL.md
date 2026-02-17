---
name: payroll-review
description: 급여관리 시스템 PR 리뷰 — 4대보험 계산 정확성, 소수점 처리, 타입 안전성 검증
author: winners-labor
version: 1.0.0
---

# 급여관리 PR 리뷰 스킬

## 리뷰 수행 시 다음 항목을 반드시 검증:

### 1. 급여 계산 정확성
- 4대보험 요율이 최신값과 일치하는지
- 상한/하한 처리가 올바른지
- 소수점 처리: 보험료는 Math.floor, 수당은 Math.round

### 2. TypeScript 타입 안전성
- Firestore 데이터에 타입 가드 적용 여부
- any 타입 사용 여부 (금지)
- 급여 관련 숫자는 number 타입 (string → number 변환 주의)

### 3. Next.js 16 호환성
- async params/searchParams 패턴 사용 여부
- Server/Client Component 경계 적절성
- Zustand 스토어가 Server Component에서 사용되지 않는지

### 4. 보안
- Firestore 보안 규칙과 클라이언트 쿼리 일치 여부
- 급여 데이터 접근 권한 검증
- 환경변수 노출 여부

### 5. 테스트
- 새 계산 로직에 단위 테스트 포함 여부
- 경계값(상한/하한/0원/마이너스) 테스트 케이스 존재 여부
- 기존 테스트 깨짐 여부

## 리뷰 결과 형식
```
## 리뷰 결과

### ✅ 통과 항목
- (목록)

### ⚠️ 개선 권고
- (목록 + 구체적 수정 제안)

### ❌ 반드시 수정
- (목록 + 이유 + 수정 코드)

### 💡 선택적 개선
- (목록)
```
