// 급여 관련 상수
export const DEFAULTS = {
  // 2026년 기준 최저시급 기반 월평균보수 (시급 10,030 × 209시간)
  MONTHLY_WAGE_2026: 2_096_270,
  // 2025년 기준
  MONTHLY_WAGE_2025: 2_060_740,
  // 기본 직종코드 (음식서비스종사자)
  JIKJONG_CODE: '532',
  // 기본 국적 (한국)
  NATIONALITY: '100',
  // 기본 주소정근로시간
  WORK_HOURS: 40,
} as const;

// 현재 연도 기준 기본 월평균보수
export function getDefaultMonthlyWage(year?: number): number {
  const y = year || new Date().getFullYear();
  if (y >= 2026) return DEFAULTS.MONTHLY_WAGE_2026;
  return DEFAULTS.MONTHLY_WAGE_2025;
}

// 4대보험 요율 (2026년 기준)
// 보험별 공제 방식:
//   국민연금: 고정형 (기준소득월액 × 요율, 다음해 6월까지 고정)
//   건강보험: 고지 방식(보수월액 고정, 4월 정산) 또는 요율 방식(매월 급여 × 요율) 선택
//   고용보험: 요율 방식만 (매월 급여 × 요율, 정산 없음)
//   산재보험: 사업주 전액 부담 (급여 공제 없음)
export const INSURANCE_RATES_2026 = {
  // 국민연금
  NPS_EMPLOYEE: 0.0475,
  NPS_EMPLOYER: 0.0475,
  NPS_UPPER_LIMIT: 6_170_000, // 기준소득월액 상한 (2026년 공단 고시 확인 필요)
  NPS_LOWER_LIMIT: 390_000, // 기준소득월액 하한

  // 건강보험
  NHIC_EMPLOYEE: 0.03595,
  NHIC_EMPLOYER: 0.03595,
  LTC_RATE: 0.1314, // 장기요양보험 (건강보험료의 %)

  // 고용보험
  EI_EMPLOYEE: 0.009,
  EI_EMPLOYER_BASE: 0.009,
  // 사업주 추가 (고용안정/직업능력개발)
  EI_EMPLOYER_UNDER_150: 0.0025,
  EI_EMPLOYER_150_PRIORITY: 0.0045,
  EI_EMPLOYER_150_TO_1000: 0.0065,
  EI_EMPLOYER_OVER_1000: 0.0085,
} as const;

// 2025년 요율 (이전 연도 참조용)
export const INSURANCE_RATES_2025 = {
  NPS_EMPLOYEE: 0.045,
  NPS_EMPLOYER: 0.045,
  NPS_UPPER_LIMIT: 6_170_000,
  NPS_LOWER_LIMIT: 390_000,
  NHIC_EMPLOYEE: 0.03545,
  NHIC_EMPLOYER: 0.03545,
  LTC_RATE: 0.1295,
  EI_EMPLOYEE: 0.009,
  EI_EMPLOYER_BASE: 0.009,
  EI_EMPLOYER_UNDER_150: 0.0025,
  EI_EMPLOYER_150_PRIORITY: 0.0045,
  EI_EMPLOYER_150_TO_1000: 0.0065,
  EI_EMPLOYER_OVER_1000: 0.0085,
} as const;

// 연도별 요율 조회
export function getInsuranceRates(year?: number) {
  const y = year || new Date().getFullYear();
  if (y >= 2026) return INSURANCE_RATES_2026;
  return INSURANCE_RATES_2025;
}

// 연도 범위 생성 (동적)
export function getYearRange(fromOffset = -3, toOffset = 0): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + fromOffset; y <= currentYear + toOffset; y++) {
    years.push(y);
  }
  return years;
}
