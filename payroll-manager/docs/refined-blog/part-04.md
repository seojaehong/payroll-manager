# 상실신고의 핵심: 전년도/당해년도 보수 자동 계산

> **TL;DR**: 4대보험 상실신고에서 가장 중요한 것은 정확한 보수 데이터입니다. 기존 프로그램들은 추정치를 사용하지만, 우리 시스템은 월별 실제 급여 데이터를 기반으로 당해년도/전년도 보수를 정확하게 계산합니다. 감사 리스크를 줄이는 노무 전문성 중심 설계입니다.

---

## 들어가며: 왜 보수 데이터가 그렇게 중요한가?

4대보험 상실신고를 해보신 분들은 아실 거예요. 신고서에 **전년도 보수총액**과 **당해년도 보수총액**을 입력해야 합니다.

이 숫자가 중요한 이유:
- **실업급여 산정 기준**이 됨
- **연말정산**과 일치해야 함
- **4대보험 감사** 시 검토 대상

만약 잘못 신고하면? 과태료는 물론, 정정 신고에 시간을 뺏기게 됩니다.

---

## 기존 방식의 문제점

많은 급여관리 프로그램들이 이렇게 처리해요.

```
보수총액 = 월평균보수 × 근무월수
```

예를 들어:
- 월평균보수: 200만원
- 근무월수: 6개월
- 보수총액: 1,200만원

**문제는 실제와 다르다는 것**입니다.

### 현실의 급여

```
1월: 180만원 (수습)
2월: 180만원 (수습)
3월: 200만원 (정규)
4월: 200만원 (정규)
5월: 220만원 (야근수당)
6월: 200만원 (정규)
─────────────────
실제 합계: 1,180만원

추정 합계: 200만원 × 6개월 = 1,200만원

차이: 20만원!
```

**원천징수영수증**에는 1,180만원으로 나오는데, 상실신고에는 1,200만원?

감사 나오면 설명하기 곤란해집니다.

---

## 해결책: MonthlyWage 엔티티

**"추정하지 말고, 실제 데이터를 저장하자"**

```typescript
interface MonthlyWage {
  id: string;
  employmentId: string;
  yearMonth: string;  // "2025-01" 형식
  totalWage: number;  // 해당 월 실제 보수총액
  workDays?: number;  // 근무일수 (선택)
  createdAt: Date;
}
```

이 테이블에 월별 실제 급여를 저장하면:

| yearMonth | totalWage |
|-----------|-----------|
| 2025-01 | 1,800,000 |
| 2025-02 | 1,800,000 |
| 2025-03 | 2,000,000 |
| 2025-04 | 2,000,000 |
| 2025-05 | 2,200,000 |
| 2025-06 | 2,000,000 |

당해년도 보수총액 = **정확히 1,180만원**

---

## 보수 계산 로직 구현

### 당해년도 보수 계산

퇴사일 기준, 해당 연도 1월부터 퇴사월까지의 실제 급여를 합산합니다.

```typescript
const calculateCurrentYearWages = (
  employmentId: string,
  leaveDate: string,
  monthlyWages: MonthlyWage[]
) => {
  const leaveYear = parseInt(leaveDate.slice(0, 4));
  const leaveMonth = parseInt(leaveDate.slice(5, 7));

  // 해당 고용관계의 급여 데이터만 필터링
  const empWages = monthlyWages.filter(w => w.employmentId === employmentId);

  let totalWage = 0;
  let monthCount = 0;

  for (let m = 1; m <= leaveMonth; m++) {
    const yearMonth = `${leaveYear}-${String(m).padStart(2, '0')}`;
    const wage = empWages.find(w => w.yearMonth === yearMonth);

    if (wage) {
      totalWage += wage.totalWage;
      monthCount++;
    }
  }

  return { totalWage, monthCount };
};
```

### 전년도 보수 계산

퇴사일 기준, 전년도 1월~12월의 실제 급여를 합산합니다.

```typescript
const calculatePreviousYearWages = (
  employmentId: string,
  leaveDate: string,
  monthlyWages: MonthlyWage[]
) => {
  const leaveYear = parseInt(leaveDate.slice(0, 4));
  const prevYear = leaveYear - 1;

  const empWages = monthlyWages.filter(w => w.employmentId === employmentId);

  let totalWage = 0;
  let monthCount = 0;

  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${prevYear}-${String(m).padStart(2, '0')}`;
    const wage = empWages.find(w => w.yearMonth === yearMonth);

    if (wage) {
      totalWage += wage.totalWage;
      monthCount++;
    }
  }

  return { totalWage, monthCount };
};
```

---

## 데이터 누락 방지

상실신고서 생성 전, 필요한 급여 데이터가 모두 있는지 검증합니다.

```typescript
const getMissingWageMonths = (
  employmentId: string,
  joinDate: string,
  leaveDate: string,
  monthlyWages: MonthlyWage[]
) => {
  const missing: string[] = [];

  const startDate = new Date(joinDate);
  const endDate = new Date(leaveDate);
  const empWages = monthlyWages.filter(w => w.employmentId === employmentId);

  // 입사월부터 퇴사월까지 순회
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    const yearMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

    const hasWage = empWages.some(w => w.yearMonth === yearMonth);
    if (!hasWage) {
      missing.push(yearMonth);
    }

    current.setMonth(current.getMonth() + 1);
  }

  return missing;
};
```

### 누락 시 사용자에게 알림

```tsx
{missingMonths.length > 0 && (
  <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4">
    <h4 className="font-semibold text-yellow-400">
      ⚠️ 급여 데이터 누락
    </h4>
    <p className="text-white/70 mt-2">
      다음 월의 급여 데이터가 없습니다:
    </p>
    <ul className="list-disc list-inside mt-2">
      {missingMonths.map(month => (
        <li key={month}>{month}</li>
      ))}
    </ul>
    <p className="text-white/60 mt-3">
      '급여이력' 탭에서 먼저 입력해주세요.
    </p>
  </div>
)}
```

**[캡처 필요 #1]**: 급여 데이터 누락 경고 화면 - 어떤 월의 데이터가 없는지 표시

---

## 급여이력 입력 UI

월별 급여를 입력하는 화면을 만들었습니다.

```tsx
<div className="space-y-4">
  <h3>월별 급여 입력</h3>

  <div className="grid grid-cols-4 gap-4">
    {monthsToShow.map(yearMonth => (
      <div key={yearMonth} className="glass p-3">
        <label className="text-white/60 text-sm">{yearMonth}</label>
        <input
          type="number"
          className="input-glass w-full mt-1"
          value={wageData[yearMonth] || ''}
          onChange={(e) => updateWage(yearMonth, e.target.value)}
          placeholder="0"
        />
      </div>
    ))}
  </div>

  <button
    onClick={saveWages}
    className="btn-primary"
  >
    저장
  </button>
</div>
```

**[캡처 필요 #2]**: 월별 급여 입력 UI - 그리드 형태로 12개월 급여 입력

---

## 상실신고서 생성 시 적용

상실신고서 엑셀 생성 시, 계산된 보수 데이터를 사용합니다.

```typescript
const generateLossExcel = (worker: Worker, employment: Employment) => {
  // 당해년도/전년도 보수 계산
  const { totalWage: currentYearWage, monthCount: currentMonths } =
    calculateCurrentYearWages(employment.id, employment.leaveDate!, monthlyWages);

  const { totalWage: prevYearWage, monthCount: prevMonths } =
    calculatePreviousYearWages(employment.id, employment.leaveDate!, monthlyWages);

  // 상실신고 엑셀 데이터
  const row = [
    worker.residentNo,
    worker.name,
    employment.leaveDate?.replace(/-/g, ''),  // 상실일
    employment.leaveReason || '11',            // 상실사유코드

    // 당해년도 보수
    currentYearWage,
    currentMonths,

    // 전년도 보수
    prevYearWage,
    prevMonths,

    // ... 기타 필드
  ];

  return row;
};
```

---

## 감사 대비: 원천징수영수증과 일치

이 시스템의 가장 큰 장점은 **감사 대비**입니다.

| 항목 | 기존 방식 | 우리 시스템 |
|------|----------|------------|
| 보수 계산 | 추정치 | 실제 급여 합산 |
| 원천징수영수증 일치 | ❌ 불일치 가능 | ✅ 정확히 일치 |
| 감사 시 설명 | 복잡함 | 명확함 |
| 정정 신고 | 자주 필요 | 거의 없음 |

---

## 노무사 업무 관점에서

이 기능을 만들면서 노무사로서의 전문성이 도움이 됐습니다.

### 알아야 할 것들

1. **상실사유코드**: 자발적 퇴사(11), 계약만료(23), 권고사직(26) 등
2. **보수 산정 기준**: 비과세 제외, 연장근로수당 포함 등
3. **취득일/상실일 기준**: 입사일 다음날 / 퇴사일 다음날

### 시스템에 반영한 것들

```typescript
// 상실사유코드 목록
const leaveReasonCodes = [
  { code: '11', label: '자발적 이직 (자진퇴사)' },
  { code: '12', label: '사업장 이전 등에 따른 자발적 이직' },
  { code: '22', label: '폐업, 도산' },
  { code: '23', label: '계약기간 만료' },
  { code: '26', label: '피보험자의 귀책사유에 의한 징계해고, 권고사직' },
  { code: '31', label: '정년' },
  { code: '32', label: '60세 이상인 자로서 이직일 현재 계속 고용된 기간 3년 미만' },
  // ...
];
```

**[캡처 필요 #3]**: 상실사유코드 선택 UI - 드롭다운으로 적절한 코드 선택

---

## 마치며: 정확함이 가치다

"대충 추정해도 되지 않나요?"

**아니요.** 노무사 업무에서 정확함은 기본입니다.

- 실업급여가 잘못 산정되면 근로자 손해
- 감사에서 불일치 발견되면 사업장 과태료
- 정정 신고는 시간 낭비

**"추정하지 말고 실제 데이터를 쓰자"**는 원칙이 시스템 전체를 관통합니다.

다음 편에서는 15개 사업장을 한눈에 관리하는 **사업장 중심 UI 설계**를 다룹니다.

---

### 다음 편 예고

**[5편] 15개 사업장 대시보드: 사업장 중심 UI 설계**
- 기능 중심 vs 데이터 중심 UI
- 한 화면에서 모든 작업 완결
- 일괄 사업장 추가 기능

---

**관련 키워드**: 4대보험 상실신고, 보수총액 계산, 노무사 업무 자동화, 급여관리 시스템, 실업급여 산정, 원천징수영수증

---

*이 글이 도움이 되셨다면 공유 부탁드립니다. 질문이나 의견은 댓글로 남겨주세요!*
