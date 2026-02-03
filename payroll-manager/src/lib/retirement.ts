import { MonthlyWage, RetirementCalculation, Employment, Worker } from '@/types';

/**
 * 퇴직금 계산 모듈
 * 근로자퇴직급여보장법에 따른 퇴직금 계산
 */

// 퇴직금 수급 자격 확인 (1년 이상 근속)
export function isEligible(joinDate: string, leaveDate: string): boolean {
  const join = new Date(joinDate);
  const leave = new Date(leaveDate);
  const diffTime = leave.getTime() - join.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 365;
}

// 총 근속일수 계산
export function getTotalDays(joinDate: string, leaveDate: string): number {
  const join = new Date(joinDate);
  const leave = new Date(leaveDate);
  const diffTime = leave.getTime() - join.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 퇴사일 포함
}

// 근속연수 계산 (년 단위, 소수점)
export function getServiceYears(joinDate: string, leaveDate: string): number {
  const totalDays = getTotalDays(joinDate, leaveDate);
  return totalDays / 365;
}

// 퇴직 전 3개월 급여 합계 및 일수 계산
export function getLast3MonthsData(
  monthlyWages: MonthlyWage[],
  leaveDate: string
): { wages: number; days: number } {
  const leave = new Date(leaveDate);
  const leaveYear = leave.getFullYear();
  const leaveMonth = leave.getMonth() + 1;
  const leaveDay = leave.getDate();

  // 퇴직일이 속한 달과 그 이전 2개월
  const targetMonths: string[] = [];
  for (let i = 0; i < 3; i++) {
    let year = leaveYear;
    let month = leaveMonth - i;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    targetMonths.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  let totalWages = 0;
  let totalDays = 0;

  targetMonths.forEach((ym, index) => {
    const wage = monthlyWages.find((mw) => mw.yearMonth === ym);
    if (wage) {
      totalWages += wage.totalWage;
    }

    // 일수 계산
    const [year, month] = ym.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    if (index === 0) {
      // 퇴직월: 퇴직일까지만
      totalDays += leaveDay;
    } else {
      totalDays += daysInMonth;
    }
  });

  return { wages: totalWages, days: totalDays };
}

// 평균임금 계산 (일당)
export function calculateAverageWage(
  monthlyWages: MonthlyWage[],
  leaveDate: string
): number {
  const { wages, days } = getLast3MonthsData(monthlyWages, leaveDate);
  if (days === 0) return 0;
  return Math.round(wages / days);
}

// 퇴직금 계산 (30일분의 평균임금 × 근속연수)
export function calculateRetirementPay(
  averageDailyWage: number,
  totalDays: number
): number {
  // 퇴직금 = (평균임금 × 30일) × (총 근속일수 / 365)
  const retirementPay = averageDailyWage * 30 * (totalDays / 365);
  return Math.round(retirementPay);
}

// 10원 단위 절사 (국고금관리법 제47조)
export function truncateTo10(amount: number): number {
  return Math.floor(amount / 10) * 10;
}

// 근속연수공제 계산 (2026년 기준, 소득세법 시행령 별표2)
// 주의: 근속연수 1년 미만은 1년으로 올림 (소득세법 제48조)
export function getServiceYearDeduction(serviceYears: number): number {
  const years = Math.ceil(serviceYears); // 1년 미만 올림 처리

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

// 환산급여 계산 ((퇴직소득 - 근속연수공제) × 12 ÷ 근속연수)
// 근속연수는 올림 적용
export function getConvertedIncome(afterDeduction: number, serviceYears: number): number {
  const years = Math.ceil(serviceYears);
  if (years === 0) return 0;
  return Math.round((afterDeduction * 12) / years);
}

// 환산급여 기준 소득세율표 (2025년 기준, 소득세법 제55조)
function getTaxRate(convertedIncome: number): { rate: number; deduction: number } {
  if (convertedIncome <= 14000000) {
    return { rate: 0.06, deduction: 0 };
  } else if (convertedIncome <= 50000000) {
    return { rate: 0.15, deduction: 1260000 };
  } else if (convertedIncome <= 88000000) {
    return { rate: 0.24, deduction: 5760000 };
  } else if (convertedIncome <= 150000000) {
    return { rate: 0.35, deduction: 15440000 };
  } else if (convertedIncome <= 300000000) {
    return { rate: 0.38, deduction: 19940000 };
  } else if (convertedIncome <= 500000000) {
    return { rate: 0.40, deduction: 25940000 };
  } else if (convertedIncome <= 1000000000) {
    return { rate: 0.42, deduction: 35940000 };
  } else {
    return { rate: 0.45, deduction: 65940000 };
  }
}

// 퇴직소득세 계산 (2026년 기준)
export function calculateRetirementTax(
  retirementPay: number,
  serviceYears: number
): { retirementTax: number; localTax: number; taxableIncome: number; convertedIncome: number; convertedDeduction: number } {
  // 근속연수 올림 처리
  const years = Math.ceil(serviceYears);

  // 1. 근속연수공제
  const serviceYearDeduction = getServiceYearDeduction(serviceYears);

  // 2. 환산급여 = (퇴직소득 - 근속연수공제) × 12 ÷ 근속연수
  const afterDeduction = Math.max(0, retirementPay - serviceYearDeduction);
  const convertedIncome = getConvertedIncome(afterDeduction, serviceYears);

  // 3. 환산급여공제
  let convertedDeduction = 0;
  if (convertedIncome <= 8000000) {
    convertedDeduction = convertedIncome;
  } else if (convertedIncome <= 70000000) {
    convertedDeduction = 8000000 + (convertedIncome - 8000000) * 0.6;
  } else if (convertedIncome <= 100000000) {
    convertedDeduction = 45200000 + (convertedIncome - 70000000) * 0.55;
  } else if (convertedIncome <= 300000000) {
    convertedDeduction = 61700000 + (convertedIncome - 100000000) * 0.45;
  } else {
    convertedDeduction = 151700000 + (convertedIncome - 300000000) * 0.35;
  }

  // 4. 과세표준 = 환산급여 - 환산급여공제
  const taxableIncome = Math.max(0, convertedIncome - convertedDeduction);

  // 5. 환산산출세액 (세율표 적용)
  const { rate, deduction } = getTaxRate(taxableIncome);
  const convertedTax = Math.max(0, taxableIncome * rate - deduction);

  // 6. 퇴직소득세 = 환산산출세액 × 근속연수 ÷ 12 (10원 미만 절사)
  const retirementTax = truncateTo10((convertedTax * years) / 12);

  // 7. 지방소득세 = 퇴직소득세 × 10% (10원 미만 절사)
  const localTax = truncateTo10(retirementTax * 0.1);

  return { retirementTax, localTax, taxableIncome, convertedIncome, convertedDeduction };
}

// 전체 퇴직금 계산
export function calculateFullRetirement(
  employment: Employment,
  worker: Worker,
  monthlyWages: MonthlyWage[]
): RetirementCalculation | null {
  if (!employment.leaveDate) {
    return null;
  }

  const joinDate = employment.joinDate;
  const leaveDate = employment.leaveDate;

  // 1년 미만 체크
  if (!isEligible(joinDate, leaveDate)) {
    return null;
  }

  // 근속 계산
  const totalDays = getTotalDays(joinDate, leaveDate);
  const totalYears = getServiceYears(joinDate, leaveDate);

  // 평균임금 계산
  const empWages = monthlyWages.filter((mw) => mw.employmentId === employment.id);
  const { wages: last3MonthsWages, days: last3MonthsDays } = getLast3MonthsData(empWages, leaveDate);
  const averageDailyWage = calculateAverageWage(empWages, leaveDate);

  // 퇴직금 계산
  const retirementPay = calculateRetirementPay(averageDailyWage, totalDays);

  // 퇴직소득세 계산
  const serviceYearDeduction = getServiceYearDeduction(totalYears);
  const { retirementTax, localTax, taxableIncome, convertedIncome, convertedDeduction } = calculateRetirementTax(retirementPay, totalYears);

  // 실수령액
  const netRetirementPay = retirementPay - retirementTax - localTax;

  return {
    id: `ret-${employment.id}`,
    employmentId: employment.id,
    workerId: worker.id,
    businessId: employment.businessId,

    joinDate,
    leaveDate,
    totalDays,
    totalYears,

    last3MonthsWages,
    last3MonthsDays,
    averageDailyWage,

    retirementPay,

    serviceYearDeduction,
    convertedIncome,
    convertedDeduction,
    taxableIncome,
    retirementTax,
    localRetirementTax: localTax,

    netRetirementPay,

    calculatedAt: new Date(),
  };
}

// 금액 포맷팅
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

// 날짜 포맷팅
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}
