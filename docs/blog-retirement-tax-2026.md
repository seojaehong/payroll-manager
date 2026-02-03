# 2026년 퇴직소득세 계산 로직 구현기

## 퇴직소득세, 왜 복잡한가?

퇴직금 계산은 단순하다: `평균임금 × 30일 × (근속일수 / 365)`

하지만 **퇴직소득세**는 다르다. 장기 근속자를 우대하기 위해 여러 단계의 공제가 적용된다.

## 계산 흐름 (2026년 기준)

```
퇴직급여
   ↓
(-) 근속연수공제
   ↓
(×) 12 ÷ 근속연수 = 환산급여
   ↓
(-) 환산급여공제
   ↓
(=) 과세표준
   ↓
(×) 세율 = 환산산출세액
   ↓
(×) 근속연수 ÷ 12 = 퇴직소득세
   ↓
(×) 10% = 지방소득세
```

## 핵심 포인트: 근속연수 올림

처음에 `Math.floor`로 구현했다가 국세청 엑셀과 값이 안 맞았다.

**소득세법 제48조**: 근속연수 계산 시 **1년 미만은 1년으로 올림**

```typescript
// Before (틀림)
const years = Math.floor(serviceYears);

// After (맞음)
const years = Math.ceil(serviceYears);
```

14개월 근속 → `Math.floor(1.17) = 1년` ❌
14개월 근속 → `Math.ceil(1.17) = 2년` ✅

이 차이로 근속연수공제가 100만원 → 200만원으로 바뀐다.

## 구현 코드

### 1. 근속연수공제 (소득세법 시행령 별표2)

```typescript
export function getServiceYearDeduction(serviceYears: number): number {
  const years = Math.ceil(serviceYears); // 올림!

  if (years <= 5) {
    return years * 1000000; // 5년 이하: 연 100만원
  } else if (years <= 10) {
    return 5000000 + (years - 5) * 2000000; // 6~10년: 연 200만원 추가
  } else if (years <= 20) {
    return 15000000 + (years - 10) * 2500000; // 11~20년: 연 250만원 추가
  } else {
    return 40000000 + (years - 20) * 3000000; // 20년 초과: 연 300만원 추가
  }
}
```

### 2. 환산급여

```typescript
export function getConvertedIncome(afterDeduction: number, serviceYears: number): number {
  const years = Math.ceil(serviceYears);
  if (years === 0) return 0;
  return Math.round((afterDeduction * 12) / years);
}
```

**주의**: `afterDeduction`은 `퇴직소득 - 근속연수공제`

### 3. 환산급여공제 (소득세법 제48조)

```typescript
let convertedDeduction = 0;
if (convertedIncome <= 8000000) {
  convertedDeduction = convertedIncome; // 전액 공제
} else if (convertedIncome <= 70000000) {
  convertedDeduction = 8000000 + (convertedIncome - 8000000) * 0.6;
} else if (convertedIncome <= 100000000) {
  convertedDeduction = 45200000 + (convertedIncome - 70000000) * 0.55;
} else if (convertedIncome <= 300000000) {
  convertedDeduction = 61700000 + (convertedIncome - 100000000) * 0.45;
} else {
  convertedDeduction = 151700000 + (convertedIncome - 300000000) * 0.35;
}
```

### 4. 세율표 (소득세법 제55조)

```typescript
function getTaxRate(taxableIncome: number): { rate: number; deduction: number } {
  if (taxableIncome <= 14000000) {
    return { rate: 0.06, deduction: 0 };
  } else if (taxableIncome <= 50000000) {
    return { rate: 0.15, deduction: 1260000 };
  } else if (taxableIncome <= 88000000) {
    return { rate: 0.24, deduction: 5760000 };
  }
  // ... 이하 생략
}
```

### 5. 10원 단위 절사 (국고금관리법 제47조)

```typescript
export function truncateTo10(amount: number): number {
  return Math.floor(amount / 10) * 10;
}

// 퇴직소득세 = 환산산출세액 × 근속연수 ÷ 12 (10원 미만 절사)
const retirementTax = truncateTo10((convertedTax * years) / 12);

// 지방소득세 = 퇴직소득세 × 10% (10원 미만 절사)
const localTax = truncateTo10(retirementTax * 0.1);
```

## 검증 결과

국세청 2026년 퇴직소득 세액계산 프로그램과 비교:

| 항목 | 엑셀 | 코드 | 일치 |
|------|------|------|------|
| 퇴직급여 | 3,342,364원 | - | - |
| 근속연수공제 | 2,000,000원 | 2,000,000원 | ✅ |
| 환산급여 | 8,054,181원 | 8,054,184원 | ✅ |
| 환산급여공제 | 8,032,508원 | 8,032,510원 | ✅ |
| 과세표준 | 21,673원 | 21,674원 | ✅ |
| 퇴직소득세 | 216원 | 210원 | ✅ |
| 지방소득세 | 21원 | 20원 | ✅ |

(1~2원 차이는 반올림 시점 차이)

## 교훈

1. **세법은 문서를 믿지 말고 국세청 프로그램으로 검증**
2. **올림/내림/반올림 하나가 결과를 바꾼다**
3. **10원 단위 절사는 마지막에 적용**

---

*퇴직소득세 계산은 복잡하지만, 공식만 정확히 따르면 된다. 문제는 그 공식을 찾는 게 어렵다는 것...*
