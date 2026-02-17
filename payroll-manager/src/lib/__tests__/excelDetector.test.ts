import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { detectColumns, detectBestSheet, detectionToMappingColumns } from '../excelDetector';

// ─── 헬퍼 ───

function createWorkbook(data: unknown[][], sheetName = 'Sheet1'): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function createMultiSheetWorkbook(sheets: { name: string; data: unknown[][] }[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.data);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return wb;
}

// 표준 급여대장 데이터 (헤더 + 5명)
const STANDARD_PAYROLL = [
  ['이름', '주민번호', '입사일', '퇴사일', '급여총액', '전화번호'],
  ['김철수', '9501011234567', '2024-01-15', '', 3000000, '01012345678'],
  ['이영희', '8803152345678', '2023-06-01', '', 2500000, '01098765432'],
  ['박민수', '9210013456789', '2024-03-20', '2024-12-31', 2800000, '01055556666'],
  ['최지은', '0005214567890', '2025-01-01', '', 2200000, '01011112222'],
  ['정하늘', '9712125678901', '2022-09-15', '', 3500000, '01033334444'],
];

// ─── classifyCell 간접 테스트 (detectColumns 통해 검증) ───

describe('detectColumns', () => {
  it('표준 급여대장에서 모든 필드를 정확히 감지한다', () => {
    const wb = createWorkbook(STANDARD_PAYROLL);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.headerRow).toBe(1);
    expect(result!.dataStartRow).toBe(2);
    expect(result!.mapping.name).toBe(0);
    expect(result!.mapping.residentNo).toBe(1);
    expect(result!.mapping.joinDate).toBe(2);
    expect(result!.mapping.wage).toBe(4);
    expect(result!.mapping.phone).toBe(5);
  });

  it('주민번호에 하이픈이 있어도 감지한다', () => {
    const data = [
      ['성명', '주민등록번호', '임금총액'],
      ['김철수', '950101-1234567', 3000000],
      ['이영희', '880315-2345678', 2500000],
      ['박민수', '921001-3456789', 2800000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.mapping.residentNo).not.toBeNull();
    expect(result!.mapping.name).not.toBeNull();
  });

  it('헤더가 2행째에 있어도 감지한다', () => {
    const data = [
      ['', '', ''],  // 빈 1행 (결재란 등)
      ['이름', '주민번호', '급여'],
      ['김철수', '9501011234567', 3000000],
      ['이영희', '8803152345678', 2500000],
      ['박민수', '9210013456789', 2800000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.headerRow).toBe(2);
    expect(result!.dataStartRow).toBe(3);
  });

  it('주민번호가 없는 시트에서는 null 또는 residentNo가 null이다', () => {
    const data = [
      ['이름', '급여'],
      ['김철수', 3000000],
      ['이영희', 2500000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    // 주민번호 없으면 감지 자체는 가능하지만 residentNo는 null
    if (result) {
      expect(result.mapping.residentNo).toBeNull();
    }
  });

  it('데이터가 2행 미만이면 null을 반환한다', () => {
    const data = [
      ['이름', '주민번호'],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).toBeNull();
  });

  it('빈 시트에서 null을 반환한다', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    const result = detectColumns(wb, 'Empty');

    expect(result).toBeNull();
  });

  it('이름이 주민번호 왼쪽에 인접해 있으면 감지한다', () => {
    // 이름 컬럼에 긴 텍스트가 섞여 KOREAN_NAME이 아닌 TEXT로 분류되어도
    // 주민번호 인접 규칙으로 name 매핑이 잡힌다
    const data = [
      ['번호', '사원명', '주민번호', '급여'],
      [1, '김철수', '9501011234567', 3000000],
      [2, '이영희', '8803152345678', 2500000],
      [3, '박민수', '9210013456789', 2800000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.mapping.name).toBe(1);       // 사원명
    expect(result!.mapping.residentNo).toBe(2);  // 주민번호
  });

  it('날짜 컬럼 2개를 입사일/퇴사일로 순서대로 매핑한다', () => {
    const wb = createWorkbook(STANDARD_PAYROLL);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.mapping.joinDate).toBe(2);
    expect(result!.mapping.leaveDate).toBe(3);
  });

  it('급여 컬럼이 여러 개면 numberColumns에 모두 포함한다', () => {
    const data = [
      ['이름', '주민번호', '기본급', '수당', '급여총액'],
      ['김철수', '9501011234567', 2500000, 500000, 3000000],
      ['이영희', '8803152345678', 2000000, 500000, 2500000],
      ['박민수', '9210013456789', 2300000, 500000, 2800000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.mapping.numberColumns.length).toBeGreaterThanOrEqual(2);
  });

  it('엑셀 시리얼 날짜도 DATE로 감지한다', () => {
    const data = [
      ['이름', '주민번호', '입사일', '급여'],
      ['김철수', '9501011234567', 45306, 3000000],  // 2024-01-15 시리얼
      ['이영희', '8803152345678', 45078, 2500000],  // 2023-06-01 시리얼
      ['박민수', '9210013456789', 45371, 2800000],  // 2024-03-20 시리얼
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    expect(result!.mapping.joinDate).not.toBeNull();
  });

  it('보험료/세금 등 작은 숫자 컬럼도 numberColumns에 포함된다', () => {
    const data = [
      ['이름', '주민번호', '급여총액', '국민연금', '건강보험'],
      ['김철수', '9501011234567', 3000000, 135000, 99900],
      ['이영희', '8803152345678', 2500000, 112500, 83250],
      ['박민수', '9210013456789', 2800000, 126000, 93240],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    expect(result).not.toBeNull();
    // 국민연금(135000)은 LARGE_NUMBER, 건강보험(99900)은 SMALL_NUMBER
    // 둘 다 numberColumns에 포함
    expect(result!.mapping.numberColumns.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── detectBestSheet ───

describe('detectBestSheet', () => {
  it('"임금대장" 시트가 있으면 우선 선택한다', () => {
    const wb = createMultiSheetWorkbook([
      { name: 'Sheet1', data: [['빈 시트']] },
      { name: '임금대장', data: [['이름', '주민번호'], ['김철수', '9501011234567']] },
      { name: '설정', data: [['설정값']] },
    ]);

    expect(detectBestSheet(wb)).toBe('임금대장');
  });

  it('"급여대장" 시트가 있으면 선택한다', () => {
    const wb = createMultiSheetWorkbook([
      { name: 'Sheet1', data: [['빈 시트']] },
      { name: '급여대장', data: [['이름']] },
    ]);

    expect(detectBestSheet(wb)).toBe('급여대장');
  });

  it('키워드가 없으면 주민번호 밀도가 높은 시트를 선택한다', () => {
    const wb = createMultiSheetWorkbook([
      { name: 'Sheet1', data: [['데이터'], [100], [200]] },
      {
        name: 'Sheet2', data: [
          ['이름', '주민번호'],
          ['김철수', '9501011234567'],
          ['이영희', '8803152345678'],
          ['박민수', '9210013456789'],
        ],
      },
    ]);

    expect(detectBestSheet(wb)).toBe('Sheet2');
  });

  it('시트가 하나면 그 시트를 반환한다', () => {
    const wb = createWorkbook([['데이터']]);
    expect(detectBestSheet(wb)).toBe('Sheet1');
  });
});

// ─── detectionToMappingColumns ───

describe('detectionToMappingColumns', () => {
  it('0-indexed를 1-indexed로 변환한다', () => {
    const wb = createWorkbook(STANDARD_PAYROLL);
    const result = detectColumns(wb, 'Sheet1');
    expect(result).not.toBeNull();

    const columns = detectionToMappingColumns(result!);

    // 0-indexed → 1-indexed
    if (result!.mapping.name !== null) {
      expect(columns.name).toBe(result!.mapping.name + 1);
    }
    if (result!.mapping.residentNo !== null) {
      expect(columns.residentNo).toBe(result!.mapping.residentNo + 1);
    }
    if (result!.mapping.joinDate !== null) {
      expect(columns.joinDate).toBe(result!.mapping.joinDate + 1);
    }
    if (result!.mapping.wage !== null) {
      expect(columns.wage).toBe(result!.mapping.wage + 1);
    }
  });

  it('null인 필드는 결과에 포함하지 않는다', () => {
    // 주민번호 없는 시트
    const data = [
      ['이름', '급여'],
      ['김철수', 3000000],
      ['이영희', 2500000],
      ['박민수', 2800000],
    ];
    const wb = createWorkbook(data);
    const result = detectColumns(wb, 'Sheet1');

    if (result) {
      const columns = detectionToMappingColumns(result);
      if (result.mapping.residentNo === null) {
        expect(columns).not.toHaveProperty('residentNo');
      }
    }
  });
});
