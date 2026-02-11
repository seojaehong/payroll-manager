/**
 * BusinessPayrollConfig 로더
 *
 * 폴백 체인: BusinessPayrollConfig → ExcelMapping → null (자동감지로)
 * - 브라우저: Firestore에서 로드
 * - 마이그레이션: ExcelMapping을 BusinessPayrollConfig로 변환
 */

import type { BusinessPayrollConfig, ExcelMapping, Business } from '@/types';
import { CONFIG_VERSION, DEFAULT_WAGE_CLASSIFICATION } from '@/types/config';

/**
 * ExcelMapping → BusinessPayrollConfig 변환 (마이그레이션)
 */
export function migrateExcelMapping(
  mapping: ExcelMapping,
  business?: Business,
): BusinessPayrollConfig {
  return {
    businessId: mapping.businessId,
    businessName: business?.name || mapping.businessId,
    version: CONFIG_VERSION,
    updatedAt: new Date().toISOString(),

    excel: {
      sheetName: mapping.sheetName,
      sheetKeywords: ['임금대장', '급여대장', '급여'],
      headerRow: mapping.headerRow,
      dataStartRow: mapping.dataStartRow,
      columns: { ...mapping.columns },
    },

    wageClassification: { ...DEFAULT_WAGE_CLASSIFICATION },

    defaults: {
      jikjongCode: business?.defaultJikjong || '532',
      workHours: business?.defaultWorkHours || 40,
      nationality: '100',
    },
  };
}

/**
 * BusinessPayrollConfig에서 ExcelMapping 호환 객체 추출
 * (기존 코드와의 호환을 위해)
 */
export function configToExcelMapping(config: BusinessPayrollConfig): ExcelMapping {
  const cols = config.excel.columns;

  // 필수 필드 보장 (spread 후 오버라이드)
  return {
    businessId: config.businessId,
    sheetName: config.excel.sheetName,
    headerRow: config.excel.headerRow,
    dataStartRow: config.excel.dataStartRow,
    columns: {
      ...cols,
      name: cols.name || 1,
      residentNo: cols.residentNo || 1,
      joinDate: cols.joinDate || 1,
      leaveDate: cols.leaveDate || 1,
      wage: cols.wage || 1,
    } as ExcelMapping['columns'],
  };
}

/**
 * 사업장 ID로 config 찾기 (폴백 체인)
 *
 * 1. businessConfigs에서 BusinessPayrollConfig 찾기
 * 2. excelMappings에서 ExcelMapping 찾아 변환
 * 3. null 반환 (자동감지로 진행)
 */
export function resolveConfig(
  businessId: string,
  businessConfigs: BusinessPayrollConfig[],
  excelMappings: ExcelMapping[],
  businesses?: Business[],
): BusinessPayrollConfig | null {
  // 1차: BusinessPayrollConfig
  const config = businessConfigs.find((c) => c.businessId === businessId);
  if (config) return config;

  // 2차: ExcelMapping → 변환
  const mapping = excelMappings.find((m) => m.businessId === businessId);
  if (mapping) {
    const business = businesses?.find((b) => b.id === businessId);
    return migrateExcelMapping(mapping, business);
  }

  // 3차: 없음
  return null;
}
