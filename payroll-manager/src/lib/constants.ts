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

// 연도 범위 생성 (동적)
export function getYearRange(fromOffset = -3, toOffset = 0): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + fromOffset; y <= currentYear + toOffset; y++) {
    years.push(y);
  }
  return years;
}
