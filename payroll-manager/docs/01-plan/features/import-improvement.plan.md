# Import Improvement Planning Document

> **Summary**: 데이터 패턴 기반 자동감지로 Excel 임포트 개선 - 사업장별 다른 양식 자동 처리
>
> **Project**: payroll-manager
> **Version**: 0.1.0
> **Author**: AI + User
> **Date**: 2026-02-10
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 Excel 임포트가 사업장마다 다른 급여대장 양식(헤더 위치, 컬럼명, 시트 구조) 때문에 실용성이 떨어짐.
헤더명 문자열 매칭 대신 **데이터 패턴 자동감지**로 전환하여, 어떤 양식이든 업로드만 하면 자동으로 필드를 잡아주는 것이 목표.

### 1.2 Background

**현재 문제점:**
1. `import/page.tsx`가 29개 필드를 수동 드롭다운으로 매핑 → 비현실적
2. `useExcelImport.ts`에 `autoMapFields()`가 있지만 헤더명 별칭 비교라 업체별 다른 헤더에 대응 불가
3. 심지어 `import/page.tsx`는 `useExcelImport` 훅을 사용하지 않음 (별도 구현)
4. 헤더 행 위치, 데이터 시작 행도 업체마다 다름

**핵심 인사이트:**
- 헤더명은 업체마다 다르지만, **데이터 패턴은 동일**
- 주민번호(13자리 숫자), 이름(한글 2~4자), 날짜, 금액 → 패턴으로 100% 구분 가능
- 주민번호 컬럼만 잡으면 이름은 인접 컬럼에서 찾을 수 있음

### 1.3 Related Documents

- 기존 코드: `src/app/import/page.tsx` (597줄)
- 기존 훅: `src/hooks/useExcelImport.ts` (439줄)
- 신고서: `src/app/businesses/[id]/components/ReportsTab.tsx`

---

## 2. Scope

### 2.1 In Scope

- [x] 데이터 패턴 기반 자동 컬럼 감지 엔진
- [x] 헤더 행 / 데이터 시작 행 자동 감지
- [x] 감지 결과 확인 UI (사용자가 보정 가능)
- [x] 기존 매핑 저장/로드 호환 유지
- [x] 신고서에 필요한 핵심 필드 우선 (이름, 주민번호, 입사일, 퇴사일, 급여)

### 2.2 Out of Scope

- LLM/AI API 호출 기반 매핑 (비용, 지연)
- 급여 항목 세부 분류 자동화 (기본급/연장수당 등 구분)
- 새 타입/엔티티 추가 (Worker, Employment 구조 변경 없음)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Excel 업로드 시 데이터 스캔으로 헤더 행 자동 감지 | High | Pending |
| FR-02 | 주민번호 컬럼 자동 감지 (13자리/6-7 숫자 패턴) | High | Pending |
| FR-03 | 이름 컬럼 자동 감지 (한글 2~4자 패턴, 주민번호 인접) | High | Pending |
| FR-04 | 입사일/퇴사일 컬럼 자동 감지 (날짜 패턴) | High | Pending |
| FR-05 | 급여 컬럼 자동 감지 (큰 숫자 패턴 + 헤더 힌트) | Medium | Pending |
| FR-06 | 감지 결과를 시각적으로 보여주고 사용자 보정 허용 | High | Pending |
| FR-07 | 확인된 매핑을 사업장별로 저장 (기존 호환) | Medium | Pending |
| FR-08 | 보험료 컬럼 자동 감지 (4대보험 패턴) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 감지 1초 이내 (1000행 기준) | 콘솔 시간 측정 |
| UX | 업로드 → 결과 확인 2단계 이내 | 사용자 클릭 수 |
| 호환성 | 기존 저장된 매핑 깨지지 않음 | 기존 사업장 재임포트 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 아무 급여대장 Excel 올리면 이름/주민번호/입사일 자동 감지
- [ ] 감지 신뢰도 표시 (높음/중간/낮음)
- [ ] 사용자가 잘못된 감지를 1클릭으로 수정 가능
- [ ] 기존 매핑 저장 시스템과 호환
- [ ] 빌드 에러 없음

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 최소 3개 다른 양식 Excel에서 정상 감지

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 일부 양식에서 주민번호가 마스킹(***) 처리됨 | Medium | Low | 부분 패턴 매칭 (앞 6자리만으로도 감지) |
| 병합 셀로 헤더 구조 파악 어려움 | Medium | Medium | 데이터 행에서 패턴 감지 (헤더 무시) |
| 이름 컬럼과 다른 한글 컬럼(부서명 등) 혼동 | Low | Medium | 주민번호 인접 + 글자 수 제한(2~4자) |
| 기존 매핑과 충돌 | High | Low | 자동감지는 매핑 없을 때만 동작, 기존 매핑 우선 |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Dynamic** (기존 프로젝트 레벨 유지)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 감지 위치 | 클라이언트 / 서버 | 클라이언트 | 서버 불필요, xlsx 라이브러리 이미 클라이언트에 있음 |
| 감지 엔진 | 별도 유틸 / 훅 내장 | `useExcelImport` 훅 확장 | 기존 훅 활용, 코드 중복 방지 |
| UI | 기존 페이지 수정 / 새 페이지 | 기존 `import/page.tsx` 수정 | 경로 유지 |

### 6.3 데이터 패턴 감지 알고리즘

```
1. Excel 전체 스캔 (최대 50행 x 60열)
2. 각 열의 데이터 패턴 분류:
   - RESIDENT_NO: /^\d{13}$/ 또는 /^\d{6}[-\s]?\d{7}$/
   - KOREAN_NAME: /^[가-힣]{2,4}$/
   - DATE: 날짜 시리얼 또는 YYYY-MM-DD/YYYYMMDD/YY.MM.DD
   - LARGE_NUMBER: 숫자 >= 100,000
   - SMALL_NUMBER: 숫자 < 100,000
   - PHONE: /^01[016789]\d{7,8}$/
   - TEXT: 기타 문자열

3. 패턴 빈도로 컬럼 타입 결정:
   - 50% 이상 RESIDENT_NO → 주민번호 컬럼
   - 주민번호 좌측 인접 + KOREAN_NAME → 이름 컬럼
   - DATE 패턴 컬럼 중 헤더에 "입사" 포함 → 입사일 (없으면 첫번째 DATE)
   - LARGE_NUMBER + 마지막 또는 헤더에 "총" → 급여

4. 헤더 행 자동 감지:
   - 데이터 패턴이 시작되는 행의 바로 위 = 헤더 행
   - 연속으로 데이터 패턴이 나타나기 시작하는 행 = 데이터 시작 행
```

---

## 7. Implementation Order

### Phase 1: 감지 엔진 (핵심)
1. `src/lib/excelDetector.ts` 신규 생성 - 패턴 감지 유틸리티
2. 헤더행/데이터행 자동 감지
3. 주민번호 → 이름 → 날짜 → 금액 순서로 감지

### Phase 2: UI 통합
4. `import/page.tsx`가 `useExcelImport` 훅 사용하도록 리팩토링
5. 자동감지 결과 표시 UI (감지된 컬럼 하이라이트)
6. 사용자 보정 UI (드롭다운 대신 컬럼 클릭 방식)

### Phase 3: 검증
7. 미리보기 자동 생성 (감지 즉시)
8. 기존 매핑 호환 테스트
9. 다양한 양식 테스트

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`import-improvement.design.md`)
2. [ ] 감지 엔진 구현
3. [ ] UI 통합 및 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-10 | Initial draft | AI + User |
