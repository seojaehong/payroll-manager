# 상실신고의 핵심: 당해보수와 전년보수 분리

> 4대보험 상실신고에서 가장 중요한 것은 정확한 보수 데이터다.

## 문제 상황

기존 급여관리 프로그램들의 가장 큰 문제점:
- **추정치 사용**: 월평균보수 × 근무월수로 계산
- **실제 데이터 무시**: 실제 받은 급여와 다른 금액 신고
- **감사 리스크**: 4대보험 감사 시 불일치 발견

## 해결 방안: MonthlyWage 엔티티

```typescript
interface MonthlyWage {
  id: string;
  employmentId: string;
  yearMonth: string;  // "2025-01" 형식
  totalWage: number;  // 해당 월 실제 보수총액
  workDays?: number;
  createdAt: Date;
}
```

월별 실제 급여 데이터를 저장하여:
- 당해년도 보수총액 = 1월~퇴사월까지 실제 급여 합산
- 전년도 보수총액 = 전년 1월~12월 실제 급여 합산

## 구현 로직

```typescript
const calculateWages = (employmentId: string, leaveDate: string, joinDate: string) => {
  const leaveYear = parseInt(leaveDate.slice(0, 4));
  const leaveMonth = parseInt(leaveDate.slice(5, 7));
  const prevYear = leaveYear - 1;

  // 당해년도 보수
  let currentYearTotal = 0, currentYearMonths = 0;
  for (let m = 1; m <= leaveMonth; m++) {
    const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
    const wage = empWages.find(w => w.yearMonth === ym);
    if (wage) { currentYearTotal += wage.totalWage; currentYearMonths++; }
  }

  // 전년도 보수
  let prevYearTotal = 0, prevYearMonths = 0;
  for (let m = 1; m <= 12; m++) {
    const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
    const wage = empWages.find(w => w.yearMonth === ym);
    if (wage) { prevYearTotal += wage.totalWage; prevYearMonths++; }
  }

  return { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths };
};
```

## 급여 데이터 누락 방지

신고서 생성 전 급여 데이터 검증:

```typescript
const getMissingWageData = (employmentId: string, leaveDate: string, joinDate: string) => {
  const missing: string[] = [];
  // 필요한 월 중 데이터 없는 월 체크
  // 누락 시 "급여 이력 탭에서 먼저 입력하세요" 안내
  return missing;
};
```

## 결과

- **정확한 신고**: 추정치가 아닌 실제 급여 기반
- **감사 대비**: 원천징수영수증과 일치하는 데이터
- **자동 검증**: 누락 데이터 사전 확인

---

*"급여 데이터가 없으면 추정하지 말고, 입력을 요청하라"*
