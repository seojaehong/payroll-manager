/**
 * 공통 포맷팅 및 유틸리티 함수
 */

/**
 * 숫자를 한국 형식으로 포맷 (1,234,567)
 */
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('ko-KR');
}

/**
 * undefined 필드 제거 (Firestore는 undefined 허용 안함)
 */
export function cleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}
