/**
 * BusinessPayrollConfig - 사업장별 급여 설정
 *
 * 기존 ExcelMapping의 상위 호환 타입으로,
 * 엑셀 구조 + 임금 분류 + 상여금 + 기본값을 하나의 config에 통합.
 * JSON 파일로 저장하여 Python/TypeScript 양쪽에서 공유.
 */

// ─── 비과세 항목 ───

export interface TaxExemptItem {
  field: string;       // MonthlyWage 필드키 (예: "mealAllowance")
  label: string;       // 표시명 (예: "식대")
  monthlyLimit: number; // 월 비과세 한도 (원)
}

// ─── 상여금 정보 ───

export type BonusCycle = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'custom';

export interface BonusInfo {
  cycle: BonusCycle;
  months?: number[];            // custom일 때 지급월 (1~12)
  rate?: number;                // 지급률 (% of basicWage)
  includeInOrdinaryWage: boolean; // 통상임금 포함 여부
}

// ─── 엑셀 구조 설정 ───

export interface ExcelStructure {
  filePattern?: string;         // 파일명 패턴 (예: "쿠우쿠우부평점_*.xlsx")
  sheetName: string;            // 기본 시트명
  sheetKeywords?: string[];     // 시트 자동 선택 키워드
  headerRow: number;            // 1-indexed
  dataStartRow: number;         // 1-indexed
  columns: Record<string, number | undefined>; // 필드키 → 1-indexed 컬럼번호
  fieldAliases?: Record<string, string[]>;     // 사업장별 별칭 오버라이드
}

// ─── 임금 분류 ───

export interface WageClassification {
  ordinaryWageItems: string[];  // 통상임금 항목 (예: ["basicWage", "mealAllowance"])
  taxExemptItems: TaxExemptItem[];
}

// ─── 메인 Config ───

export interface BusinessPayrollConfig {
  // 식별
  businessId: string;
  businessName: string;
  version: number;              // 스키마 버전 (현재 1)
  updatedAt: string;            // ISO 8601

  // 엑셀 구조
  excel: ExcelStructure;

  // 임금 분류
  wageClassification: WageClassification;

  // 상여금
  bonus?: BonusInfo;

  // 사업장 기본값
  defaults?: {
    jikjongCode?: string;       // 기본 직종코드
    workHours?: number;         // 기본 주소정근로시간
    nationality?: string;       // 기본 국적코드
  };
}

// ─── 기본값 (새 config 생성 시) ───

export const DEFAULT_WAGE_CLASSIFICATION: WageClassification = {
  ordinaryWageItems: ['basicWage'],
  taxExemptItems: [
    { field: 'mealAllowance', label: '식대', monthlyLimit: 200_000 },
    { field: 'carAllowance', label: '차량유지비', monthlyLimit: 200_000 },
  ],
};

export const CONFIG_VERSION = 1;
