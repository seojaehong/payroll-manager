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
 * 엑셀 임포트 공통 훅
 * - 헤더 추출 (2행 병합 지원)
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
   * 헤더 추출 (2행 병합)
   * hRow 기준으로 hRow-1, hRow 두 행을 합쳐서 헤더명 생성
   * 빈 헤더도 열 문자로 표시 (선택 가능하게)
   */
  const extractHeaders = useCallback((wb: XLSX.WorkBook, sheetName: string, hRow: number): HeaderInfo[] => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const result: HeaderInfo[] = [];

    // 데이터가 있는 마지막 열 찾기
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const maxCol = Math.min(range.e.c + 1, 100); // 최대 100열

    for (let c = 0; c < maxCol; c++) {
      const h1 = jsonData[hRow - 2]?.[c];
      const h2 = jsonData[hRow - 1]?.[c];
      const name = [h1, h2]
        .filter(Boolean)
        .map(v => String(v).replace(/\r?\n/g, ' ').trim())
        .join(' ')
        .trim();

      // 빈 헤더도 포함 (열 문자로 표시)
      const colLetter = c < 26
        ? String.fromCharCode(65 + c)
        : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));

      result.push({
        index: c,
        name: name || `(${colLetter}열 - 빈 헤더)`
      });
    }

    return result;
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

      onLoaded?.(wb, autoSheet);
    };

    reader.readAsBinaryString(file);
  }, [defaultSheetKeyword, headerRow, extractHeaders]);

  /**
   * 기존 매핑 적용
   */
  const applyMapping = useCallback((mapping: {
    sheetName?: string;
    headerRow?: number;
    dataStartRow?: number;
    columns?: Record<string, number | undefined>;
  }) => {
    if (mapping.headerRow) setHeaderRow(mapping.headerRow);
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
    if (mapping.sheetName && workbook) {
      setSelectedSheet(mapping.sheetName);
      const hRow = mapping.headerRow || defaultHeaderRow;
      const extractedHeaders = extractHeaders(workbook, mapping.sheetName, hRow);
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
