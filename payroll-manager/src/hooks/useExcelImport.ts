'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// 공통 타입 정의
export interface HeaderInfo {
  index: number;  // 0-indexed
  name: string;
}

export interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];  // 대체 이름들
}

export interface ExcelImportState {
  workbook: XLSX.WorkBook | null;
  sheetNames: string[];
  selectedSheet: string;
  headers: HeaderInfo[];
  headerRow: number;
  dataStartRow: number;
  fieldMapping: Record<string, number | null>;
}

interface UseExcelImportOptions {
  defaultHeaderRow?: number;
  defaultDataStartRow?: number;
  defaultSheetKeyword?: string;
}

/**
 * 자동 매핑용 필드 별칭 정의
 */
const FIELD_ALIASES: Record<string, string[]> = {
  name: ['이름', '성명', '근로자명', '사원명', '직원명'],
  residentNo: ['주민번호', '주민등록번호', '생년월일'],
  joinDate: ['입사일', '입사일자', '채용일'],
  leaveDate: ['퇴사일', '퇴사일자', '퇴직일'],
  phone: ['전화번호', '연락처', '핸드폰', '휴대폰', '휴대전화'],
  email: ['이메일', '메일', 'E-mail', 'email'],
  basicWage: ['기본급', '기본급여', '월급', '급여'],
  overtimeWeekday: ['연장근로', '연장수당', '연장근로수당', '시간외수당', '평일연장'],
  overtimeWeekend: ['주말연장', '휴일연장', '주말근로'],
  nightWage: ['야간근로', '야간수당', '야간근로수당'],
  holidayWage: ['휴일근로', '휴일수당', '휴일근로수당'],
  annualLeaveWage: ['연차수당', '연차미사용', '연차미사용수당'],
  bonusWage: ['상여금', '상여', '보너스'],
  mealAllowance: ['식대', '식비', '중식대'],
  carAllowance: ['차량유지비', '자가운전', '차량비'],
  otherWage: ['기타수당', '기타지급', '기타'],
  wage: ['임금총액', '지급총액', '지급합계', '총지급액', '급여총액', '총액'],
  incomeTax: ['소득세', '근로소득세', '갑근세'],
  localTax: ['주민세', '지방소득세', '지방세'],
  nps: ['국민연금', '연금'],
  nhic: ['건강보험', '건보'],
  ltc: ['장기요양', '장기요양보험', '노인장기'],
  ei: ['고용보험', '실업급여'],
  advancePayment: ['기지급액', '가불금', '선지급'],
  otherDeduction: ['기타공제', '기타', '공제기타'],
  totalDeduction: ['공제액계', '공제합계', '총공제액', '공제총액'],
  netWage: ['실지급액', '실수령액', '차인지급액', '실지급', '수령액'],
  workDays: ['근무일수', '출근일수', '근무일'],
  deductionDays: ['공제일수', '결근일수'],
  deductionHours: ['공제시간', '결근시간'],
};

/**
 * 엑셀 임포트 공통 훅
 * - 헤더 추출 (2행 병합 지원, 병합 셀 처리)
 * - 자동 매핑
 * - 시트 선택
 * - 필드 매핑
 */
export function useExcelImport(options: UseExcelImportOptions = {}) {
  const {
    defaultHeaderRow = 4,
    defaultDataStartRow = 6,
    defaultSheetKeyword = '임금대장',
  } = options;

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState<HeaderInfo[]>([]);
  const [headerRow, setHeaderRow] = useState(defaultHeaderRow);
  const [dataStartRow, setDataStartRow] = useState(defaultDataStartRow);
  const [fieldMapping, setFieldMapping] = useState<Record<string, number | null>>({});

  /**
   * 병합 셀 정보 추출
   */
  const getMergedCellValue = useCallback((
    ws: XLSX.WorkSheet,
    jsonData: unknown[][],
    rowIdx: number,
    colIdx: number
  ): unknown => {
    // 직접 값이 있으면 반환
    const directValue = jsonData[rowIdx]?.[colIdx];
    if (directValue !== undefined && directValue !== null && directValue !== '') {
      return directValue;
    }

    // 병합 셀 체크
    const merges = ws['!merges'] || [];
    for (const merge of merges) {
      // 현재 셀이 병합 범위 내에 있는지 확인
      if (
        rowIdx >= merge.s.r && rowIdx <= merge.e.r &&
        colIdx >= merge.s.c && colIdx <= merge.e.c
      ) {
        // 병합의 시작 셀 값 반환
        return jsonData[merge.s.r]?.[merge.s.c];
      }
    }

    return directValue;
  }, []);

  /**
   * 헤더 추출 (2행 병합 + 병합 셀 처리)
   * hRow 기준으로 hRow-1, hRow 두 행을 합쳐서 헤더명 생성
   */
  const extractHeaders = useCallback((wb: XLSX.WorkBook, sheetName: string, hRow: number): HeaderInfo[] => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const result: HeaderInfo[] = [];

    // 데이터가 있는 마지막 열 찾기
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const maxCol = Math.min(range.e.c + 1, 100); // 최대 100열

    // 첫 번째 헤더 행 (상위 그룹) - 병합 셀 값 전파
    let lastH1Value = '';
    const h1Values: string[] = [];
    for (let c = 0; c < maxCol; c++) {
      const val = getMergedCellValue(ws, jsonData, hRow - 2, c);
      if (val !== undefined && val !== null && val !== '') {
        lastH1Value = String(val).replace(/\r?\n/g, ' ').trim();
      }
      h1Values[c] = lastH1Value;
    }

    for (let c = 0; c < maxCol; c++) {
      const h1 = h1Values[c];
      const h2 = getMergedCellValue(ws, jsonData, hRow - 1, c);

      const parts = [];
      if (h1) parts.push(h1);
      if (h2 !== undefined && h2 !== null && h2 !== '') {
        const h2Str = String(h2).replace(/\r?\n/g, ' ').trim();
        // h1과 h2가 같지 않을 때만 추가
        if (h2Str && h2Str !== h1) {
          parts.push(h2Str);
        } else if (!h1 && h2Str) {
          parts.push(h2Str);
        }
      }

      const name = parts.join(' ').trim();

      // 빈 헤더도 포함 (열 문자로 표시)
      const colLetter = indexToColumnLetter(c);

      result.push({
        index: c,
        name: name || `(${colLetter}열 - 빈 헤더)`
      });
    }

    return result;
  }, [getMergedCellValue]);

  /**
   * 헤더명으로 필드 자동 매핑
   */
  const autoMapFields = useCallback((extractedHeaders: HeaderInfo[], fieldKeys?: string[]): Record<string, number | null> => {
    const mapping: Record<string, number | null> = {};
    const keysToMatch = fieldKeys || Object.keys(FIELD_ALIASES);

    for (const key of keysToMatch) {
      const aliases = FIELD_ALIASES[key] || [key];
      let matched = false;

      for (const header of extractedHeaders) {
        const headerName = header.name.toLowerCase().replace(/\s+/g, '');

        for (const alias of aliases) {
          const aliasNorm = alias.toLowerCase().replace(/\s+/g, '');

          // 정확히 일치하거나 포함하면 매칭
          if (headerName === aliasNorm || headerName.includes(aliasNorm)) {
            mapping[key] = header.index;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        mapping[key] = null;
      }
    }

    return mapping;
  }, []);

  /**
   * 시트 변경 핸들러
   */
  const handleSheetChange = useCallback((sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const extractedHeaders = extractHeaders(workbook, sheetName, headerRow);
      setHeaders(extractedHeaders);
    }
  }, [workbook, headerRow, extractHeaders]);

  /**
   * 헤더 행 변경 핸들러
   */
  const handleHeaderRowChange = useCallback((newRow: number) => {
    setHeaderRow(newRow);
    if (workbook && selectedSheet) {
      const extractedHeaders = extractHeaders(workbook, selectedSheet, newRow);
      setHeaders(extractedHeaders);
    }
  }, [workbook, selectedSheet, extractHeaders]);

  /**
   * 파일 업로드 처리
   */
  const handleFileUpload = useCallback((
    file: File,
    onLoaded?: (wb: XLSX.WorkBook, autoSheet: string) => void
  ) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // 시트 자동 선택
      const autoSheet = wb.SheetNames.find((s: string) => s.includes(defaultSheetKeyword)) || wb.SheetNames[0];
      setSelectedSheet(autoSheet);

      // 헤더 추출
      const extractedHeaders = extractHeaders(wb, autoSheet, headerRow);
      setHeaders(extractedHeaders);

      // 자동 매핑 적용
      const autoMapping = autoMapFields(extractedHeaders);
      setFieldMapping(autoMapping);

      onLoaded?.(wb, autoSheet);
    };

    reader.readAsBinaryString(file);
  }, [defaultSheetKeyword, headerRow, extractHeaders, autoMapFields]);

  /**
   * 기존 매핑 적용
   */
  const applyMapping = useCallback((
    mapping: {
      sheetName?: string;
      headerRow?: number;
      dataStartRow?: number;
      columns?: Record<string, number | undefined>;
    },
    wb?: XLSX.WorkBook
  ) => {
    const targetWorkbook = wb || workbook;
    const hRow = mapping.headerRow || defaultHeaderRow;

    if (mapping.headerRow) setHeaderRow(hRow);
    if (mapping.dataStartRow) setDataStartRow(mapping.dataStartRow);

    // columns를 0-indexed로 변환 (저장은 1-indexed)
    if (mapping.columns) {
      const converted: Record<string, number | null> = {};
      Object.entries(mapping.columns).forEach(([key, value]) => {
        converted[key] = value != null ? value - 1 : null;
      });
      setFieldMapping(converted);
    }

    // 시트 선택
    if (mapping.sheetName && targetWorkbook) {
      setSelectedSheet(mapping.sheetName);
      const extractedHeaders = extractHeaders(targetWorkbook, mapping.sheetName, hRow);
      setHeaders(extractedHeaders);
    }
  }, [workbook, defaultHeaderRow, extractHeaders]);

  /**
   * 매핑 저장용 데이터 생성 (1-indexed로 변환)
   */
  const getMappingForSave = useCallback(() => {
    const columns: Record<string, number | undefined> = {};
    Object.entries(fieldMapping).forEach(([key, value]) => {
      columns[key] = value != null ? value + 1 : undefined;
    });

    return {
      sheetName: selectedSheet,
      headerRow,
      dataStartRow,
      columns,
    };
  }, [selectedSheet, headerRow, dataStartRow, fieldMapping]);

  /**
   * 필드 매핑 업데이트
   */
  const updateFieldMapping = useCallback((key: string, value: number | null) => {
    setFieldMapping(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * 전체 필드 매핑 설정
   */
  const setFullFieldMapping = useCallback((mapping: Record<string, number | null>) => {
    setFieldMapping(mapping);
  }, []);

  /**
   * 자동 매핑 재실행
   */
  const runAutoMapping = useCallback((fieldKeys?: string[]) => {
    if (headers.length > 0) {
      const autoMapping = autoMapFields(headers, fieldKeys);
      setFieldMapping(autoMapping);
    }
  }, [headers, autoMapFields]);

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaders([]);
    setHeaderRow(defaultHeaderRow);
    setDataStartRow(defaultDataStartRow);
    setFieldMapping({});
  }, [defaultHeaderRow, defaultDataStartRow]);

  return {
    // 상태
    workbook,
    sheetNames,
    selectedSheet,
    headers,
    headerRow,
    dataStartRow,
    fieldMapping,

    // 핸들러
    handleFileUpload,
    handleSheetChange,
    handleHeaderRowChange,
    updateFieldMapping,
    setFullFieldMapping,
    setDataStartRow,

    // 유틸리티
    extractHeaders,
    applyMapping,
    getMappingForSave,
    autoMapFields,
    runAutoMapping,
    reset,
  };
}

/**
 * 엑셀 날짜 파싱 유틸
 */
export function parseExcelDate(val: unknown): string {
  if (!val) return '';

  // 엑셀 시리얼 날짜
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  const str = String(val).trim();

  // YYYY-MM-DD 형식
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // YYYYMMDD 형식
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }

  // YY.MM.DD 형식
  const dotMatch = str.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (dotMatch) {
    const [, yy, mm, dd] = dotMatch;
    const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`;
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  return str;
}

/**
 * 숫자 파싱 유틸 (콤마 제거)
 */
export function parseExcelNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return Math.round(val);
  return parseInt(String(val).replace(/,/g, '')) || 0;
}

/**
 * 컬럼 인덱스를 엑셀 문자로 변환 (0=A, 25=Z, 26=AA)
 */
export function indexToColumnLetter(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  return String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
}
