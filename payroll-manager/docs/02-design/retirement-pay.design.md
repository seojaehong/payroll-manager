# 퇴직금 계산 기능 설계

## 1. 개요

퇴사자 중 1년 이상 근속자를 대상으로 퇴직금 및 퇴직소득세를 자동 계산하고, PDF 명세서를 생성하는 기능.

### 참조 파일
- `퇴직금(송탄).xls` - 퇴직금 계산 로직 및 명세서 양식
- `2025년 퇴직소득 세액계산 프로그램.xlsx` - 퇴직소득세 계산 로직

---

## 2. 데이터 흐름

```
[퇴사자 선택]
    ↓
[조건 검증: 근속 1년 이상]
    ↓
[급여 데이터 조회: 최근 3개월]
    ↓
[평균임금 계산]
    ↓
[퇴직금 계산]
    ↓
[퇴직소득세 계산]
    ↓
[PDF 명세서 생성]
```

---

## 3. 계산 로직

### 3.1 대상자 조건

```typescript
// 1년 이상 근속자만 대상
const isEligible = (employment: Employment): boolean => {
  const joinDate = new Date(employment.joinDate);
  const leaveDate = new Date(employment.leaveDate!);
  const diffDays = (leaveDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 365;
};
```

### 3.2 평균임금 계산

**산정 기간**: 퇴사일 이전 3개월

```typescript
interface WageData {
  period: string;       // "2025-10" ~ "2026-01"
  days: number;         // 해당 월 일수
  wage: number;         // 임금총액
  bonus?: number;       // 상여금 (연간 ÷ 12 × 3)
  annualLeave?: number; // 연월차수당 (연간 ÷ 12 × 3)
}

const calculateAverageWage = (
  wages: WageData[],
  annualBonus: number,    // 1년간 상여금 총액
  annualLeaveWage: number // 1년간 연월차수당 총액
): number => {
  const totalWage = wages.reduce((sum, w) => sum + w.wage, 0);
  const totalDays = wages.reduce((sum, w) => sum + w.days, 0);

  // 상여금/연월차: 3개월분 환산
  const bonusPortion = (annualBonus / 12) * 3;
  const leavePortion = (annualLeaveWage / 12) * 3;

  const grandTotal = totalWage + bonusPortion + leavePortion;

  return grandTotal / totalDays; // 1일 평균임금
};
```

### 3.3 퇴직금 계산

```typescript
const calculateRetirementPay = (
  averageWage: number,  // 1일 평균임금
  serviceDays: number   // 근속일수
): number => {
  // 퇴직금 = 평균임금 × 30일 × 근속일수/365
  return averageWage * 30 * (serviceDays / 365);
};
```

### 3.4 퇴직소득세 계산

#### 3.4.1 근속연수공제

| 근속연수 | 공제액 |
|---------|--------|
| 5년 이하 | 30만원 × 근속연수 |
| 10년 이하 | 150만원 + 50만원 × (근속연수 - 5) |
| 20년 이하 | 400만원 + 80만원 × (근속연수 - 10) |
| 20년 초과 | 1,200만원 + 120만원 × (근속연수 - 20) |

```typescript
const getServiceYearDeduction = (years: number): number => {
  if (years <= 5) return 300000 * years;
  if (years <= 10) return 1500000 + 500000 * (years - 5);
  if (years <= 20) return 4000000 + 800000 * (years - 10);
  return 12000000 + 1200000 * (years - 20);
};
```

#### 3.4.2 환산급여 및 환산급여공제

```typescript
const calculateConvertedSalary = (
  retirementPay: number,
  serviceYearDeduction: number,
  serviceYears: number
): number => {
  // 환산급여 = (퇴직소득 - 근속연수공제) × 12 / 근속연수
  return (retirementPay - serviceYearDeduction) * 12 / serviceYears;
};

const getConvertedSalaryDeduction = (convertedSalary: number): number => {
  // 환산급여별 차등공제
  if (convertedSalary <= 8000000) {
    return convertedSalary; // 100%
  }
  if (convertedSalary <= 70000000) {
    return 8000000 + (convertedSalary - 8000000) * 0.6; // 60%
  }
  if (convertedSalary <= 100000000) {
    return 45200000 + (convertedSalary - 70000000) * 0.55; // 55%
  }
  if (convertedSalary <= 300000000) {
    return 61700000 + (convertedSalary - 100000000) * 0.45; // 45%
  }
  return 151700000 + (convertedSalary - 300000000) * 0.35; // 35%
};
```

#### 3.4.3 퇴직소득세 산출

```typescript
// 세율표 (2025년 기준)
const TAX_BRACKETS = [
  { limit: 14000000, rate: 0.06, deduction: 0 },
  { limit: 50000000, rate: 0.15, deduction: 1260000 },
  { limit: 88000000, rate: 0.24, deduction: 5760000 },
  { limit: 150000000, rate: 0.35, deduction: 15440000 },
  { limit: 300000000, rate: 0.38, deduction: 19940000 },
  { limit: 500000000, rate: 0.40, deduction: 25940000 },
  { limit: 1000000000, rate: 0.42, deduction: 35940000 },
  { limit: Infinity, rate: 0.45, deduction: 65940000 },
];

const calculateRetirementTax = (
  retirementPay: number,
  serviceYears: number
): { incomeTax: number; localTax: number; totalTax: number } => {
  // 1. 근속연수공제
  const serviceDeduction = getServiceYearDeduction(serviceYears);

  // 2. 환산급여
  const convertedSalary = Math.max(0,
    (retirementPay - serviceDeduction) * 12 / serviceYears
  );

  // 3. 환산급여공제
  const convertedDeduction = getConvertedSalaryDeduction(convertedSalary);

  // 4. 과세표준
  const taxBase = Math.max(0, convertedSalary - convertedDeduction);

  // 5. 환산산출세액
  let convertedTax = 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxBase <= bracket.limit) {
      convertedTax = taxBase * bracket.rate - bracket.deduction;
      break;
    }
  }

  // 6. 퇴직소득 산출세액
  const incomeTax = Math.floor(convertedTax * serviceYears / 12);

  // 7. 지방소득세 (10%)
  const localTax = Math.floor(incomeTax * 0.1);

  return {
    incomeTax,
    localTax,
    totalTax: incomeTax + localTax,
  };
};
```

---

## 4. 데이터 모델

### 4.1 RetirementCalculation (신규)

```typescript
interface RetirementCalculation {
  id: string;
  employmentId: string;

  // 기본 정보
  workerName: string;
  workerResidentNo: string;
  businessName: string;

  // 근무 기간
  joinDate: string;
  leaveDate: string;
  serviceDays: number;
  serviceYears: number;  // 근속연수 (월 단위 반올림)

  // 급여 산정 (3개월)
  wageMonth1: number;  // 퇴사 3월전
  wageMonth2: number;  // 퇴사 2월전
  wageMonth3: number;  // 퇴사 1월전
  wageMonthLeave: number; // 퇴사당월 (일할)
  totalDays: number;

  // 추가 급여
  annualBonus: number;      // 연간 상여금
  annualLeaveWage: number;  // 연간 연월차수당

  // 계산 결과
  averageWage: number;      // 1일 평균임금
  retirementPay: number;    // 퇴직금

  // 세금 계산
  serviceYearDeduction: number;   // 근속연수공제
  convertedSalary: number;        // 환산급여
  convertedDeduction: number;     // 환산급여공제
  taxBase: number;                // 과세표준
  incomeTax: number;              // 소득세
  localTax: number;               // 지방소득세
  totalTax: number;               // 총 세금

  // 실수령액
  netPay: number;           // 퇴직금 - 총세금

  // 메타
  calculatedAt: Date;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID';
}
```

---

## 5. UI 설계

### 5.1 퇴직금 탭 추가 (사업장 상세 페이지)

```
[탭] 근로자 | 급여이력 | 신고서 | 퇴직금 | Import
```

### 5.2 퇴직금 탭 화면 구성

```
┌─────────────────────────────────────────────────┐
│ 퇴직금 계산                                      │
├─────────────────────────────────────────────────┤
│ [대상자 선택] ▼  [기간 필터] 2026-01 ▼         │
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ □ 김철수  퇴사: 2026-01-15  근속: 2년 3개월  ││
│ │ □ 이영희  퇴사: 2026-01-20  근속: 1년 8개월  ││
│ │ ✗ 박민수  퇴사: 2026-01-25  근속: 8개월 (미달)││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ [퇴직금 계산] [PDF 다운로드]                    │
└─────────────────────────────────────────────────┘
```

### 5.3 계산 결과 화면

```
┌─────────────────────────────────────────────────┐
│ 퇴직금 계산 결과 - 김철수                        │
├─────────────────────────────────────────────────┤
│ 근무 기간: 2023-10-15 ~ 2026-01-15 (823일)      │
│ 근속연수: 2년 3개월                              │
├─────────────────────────────────────────────────┤
│ 평균임금 산정                                    │
│   2025-10: 3,200,000원 (31일)                   │
│   2025-11: 3,200,000원 (30일)                   │
│   2025-12: 3,200,000원 (31일)                   │
│   상여금 가산: 500,000원                         │
│   총계: 10,100,000원 / 92일 = 109,783원/일       │
├─────────────────────────────────────────────────┤
│ 퇴직금: 109,783 × 30 × 823/365 = 7,426,850원    │
├─────────────────────────────────────────────────┤
│ 퇴직소득세                                       │
│   근속연수공제: 690,000원                        │
│   환산급여: 38,608,000원                         │
│   과세표준: 24,164,800원                         │
│   소득세: 78,240원                               │
│   지방소득세: 7,824원                            │
├─────────────────────────────────────────────────┤
│ 실수령액: 7,340,786원                            │
└─────────────────────────────────────────────────┘
```

---

## 6. PDF 명세서 양식

**퇴직금(송탄).xls의 '퇴직금계산' 시트 양식 재현**

```
┌─────────────────────────────────────────────────┐
│        평균임금 및 퇴직금 산정서                  │
├─────────────────────────────────────────────────┤
│ 사업장명: ㈜코지(쿠우쿠우 양주옥정점)            │
│ 근로자성명: 김철수       생년월일: 1990-08-06   │
│ 산정사유발생일: 2026-01-15  채용일: 2023-10-15  │
├─────────────────────────────────────────────────┤
│ [산정내역]                                       │
│ 계산기간     | 10/1~10/31 | 11/1~11/30 | 12/1~12/31│
│ 총일수       |    31      |    30      |    31    │
│ 월급여       | 3,200,000  | 3,200,000  | 3,200,000│
│ 계           | 3,200,000  | 3,200,000  | 3,200,000│
├─────────────────────────────────────────────────┤
│ 상여금: 2,000,000 × 3/12 = 500,000              │
│ 연월차수당: 0                                    │
├─────────────────────────────────────────────────┤
│ 평균임금: 10,100,000 / 92 = 109,783원/일         │
│ 퇴직금: 109,783 × 30 × 823/365 = 7,426,850원    │
├─────────────────────────────────────────────────┤
│ [퇴직소득세]                                     │
│ 소득세: 78,240원  지방소득세: 7,824원            │
│ 공제액 합계: 86,064원                            │
├─────────────────────────────────────────────────┤
│ 실수령액: 7,340,786원                            │
└─────────────────────────────────────────────────┘
```

---

## 7. 구현 순서

### Phase 1: 기본 계산 로직
1. `lib/retirement.ts` - 계산 함수 구현
2. 단위 테스트 작성

### Phase 2: UI 구현
1. 사업장 상세 페이지에 '퇴직금' 탭 추가
2. 대상자 목록 및 선택 UI
3. 계산 결과 표시

### Phase 3: PDF 생성
1. `lib/pdf-generator.ts` - PDF 생성 함수
2. 명세서 템플릿 구현
3. 다운로드 기능

### Phase 4: 데이터 저장
1. `RetirementCalculation` 타입 추가
2. Firestore 저장/조회
3. 이력 관리

---

## 8. 의존성

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",        // PDF 생성
    "jspdf-autotable": "^3.8.1" // 테이블 생성
  }
}
```

---

## 9. 참고 법령

- 근로기준법 제34조 (퇴직급여 지급)
- 소득세법 제22조 (퇴직소득)
- 소득세법 시행령 제42조의2 (퇴직소득공제)

---

*설계 완료: 2026-01-31*
*Co-Authored-By: Claude Opus 4.5*
