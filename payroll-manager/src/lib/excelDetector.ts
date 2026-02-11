/**
 * Excel 데이터 패턴 기반 자동 감지 엔진
 *
 * 헤더명이 아닌 실제 데이터 패턴으로 컬럼 타입을 자동 식별:
 * - 주민번호: 13자리 숫자 (6+7)
 * - 이름: 한글 2~4글자, 주민번호 인접
 * - 날짜: 엑셀 시리얼 또는 날짜 문자열
 * - 금액: 10만 이상 숫자
 */
import * as XLSX from 'xlsx';

// ─── 타입 정의 ───

export type ColumnType =
  | 'RESIDENT_NO'
  | 'KOREAN_NAME'
  | 'DATE'
  | 'LARGE_NUMBER'   // >= 100,000 (급여급)
  | 'SMALL_NUMBER'   // < 100,000 (보험료/세금급)
  | 'PHONE'
  | 'TEXT'
  | 'EMPTY';

export interface ColumnDetection {
  colIndex: number;       // 0-indexed
  dominantType: ColumnType;
  confidence: number;     // 0~1
  sampleValues: string[]; // 최대 3개
  headerHint?: string;    // 감지된 헤더 텍스트 (있으면)
}

export interface DetectionResult {
  headerRow: number;      // 1-indexed (사용자에게 보여줄 값)
  dataStartRow: number;   // 1-indexed
  columns: ColumnDetection[];
  // 필드 매핑 추천
  mapping: {
    name: number | null;
    residentNo: number | null;
    joinDate: number | null;
    leaveDate: number | null;
    wage: number | null;
    phone: number | null;
    // 추가 감지된 급여/공제 컬럼
    numberColumns: { colIndex: number; headerHint?: string }[];
  };
  sheetName: string;
}

// ─── 패턴 판별 함수들 ───

/** 주민번호 패턴 (13자리 숫자, 또는 6-7 하이픈 구분) */
function isResidentNo(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  const str = String(val).trim();
  // 숫자만 추출
  const digits = str.replace(/[^0-9]/g, '');
  if (digits.length === 13) {
    // 앞 2자리: 연도 (00~99), 3~4자리: 월 (01~12), 5~6자리: 일 (01~31)
    const month = parseInt(digits.slice(2, 4));
    const day = parseInt(digits.slice(4, 6));
    return month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }
  return false;
}

/** 한글 이름 패턴 (2~4글자 한글) */
function isKoreanName(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  const str = String(val).trim();
  return /^[가-힣]{2,4}$/.test(str);
}

/** 날짜 패턴 (엑셀 시리얼 또는 문자열) */
function isDateValue(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;

  // 엑셀 시리얼 날짜 (1900~2100년 범위: 대략 1 ~ 73050)
  if (typeof val === 'number') {
    return val >= 1 && val <= 73050;
  }

  const str = String(val).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return true;
  // YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    const m = parseInt(str.slice(4, 6));
    return m >= 1 && m <= 12;
  }
  // YY.MM.DD
  if (/^\d{2}\.\d{1,2}\.\d{1,2}$/.test(str)) return true;
  // YYYY/MM/DD or YYYY.MM.DD
  if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(str)) return true;

  return false;
}

/** 큰 숫자 (급여 범위: 10만 이상) */
function isLargeNumber(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return !isNaN(num) && num >= 100_000;
}

/** 작은 숫자 (보험료/세금 범위: 1 이상, 10만 미만) */
function isSmallNumber(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return !isNaN(num) && num >= 1 && num < 100_000;
}

/** 전화번호 패턴 */
function isPhone(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  const digits = String(val).replace(/[^0-9]/g, '');
  return /^01[016789]\d{7,8}$/.test(digits);
}

/** 셀 값의 타입 판별 (우선순위: 주민번호 > 날짜 > 전화번호 > 이름 > 큰숫자 > 작은숫자 > 텍스트) */
function classifyCell(val: unknown): ColumnType {
  if (val === undefined || val === null || val === '') return 'EMPTY';
  if (isResidentNo(val)) return 'RESIDENT_NO';
  if (isPhone(val)) return 'PHONE';
  if (isKoreanName(val)) return 'KOREAN_NAME';
  // 날짜는 숫자보다 먼저 체크 (엑셀 시리얼)
  if (isDateValue(val)) return 'DATE';
  if (isLargeNumber(val)) return 'LARGE_NUMBER';
  if (isSmallNumber(val)) return 'SMALL_NUMBER';
  return 'TEXT';
}

// ─── 헤더 힌트 키워드 ───

const HEADER_HINTS: Record<string, string[]> = {
  name: ['이름', '성명', '근로자명', '사원명', '직원명'],
  residentNo: ['주민번호', '주민등록번호', '생년월일', '주민번호'],
  joinDate: ['입사일', '입사일자', '채용일', '취득일'],
  leaveDate: ['퇴사일', '퇴사일자', '퇴직일', '상실일'],
  wage: ['임금총액', '지급총액', '지급합계', '총지급액', '급여총액', '총액', '합계'],
  phone: ['전화번호', '연락처', '핸드폰', '휴대폰'],
};

/**
 * 헤더 텍스트 정규화: 공백·특수문자·괄호 모두 제거 후 순수 한글/영문만 비교
 */
function normalizeHeader(text: string): string {
  return text
    .replace(/[\s\t\r\n]+/g, '')       // 모든 공백류 제거
    .replace(/[\[\]\(\)\.\,\/\-\_]+/g, '') // 특수문자 제거
    .toLowerCase();
}

function matchHeaderHint(headerText: string): string | null {
  const normalized = normalizeHeader(headerText);
  for (const [field, keywords] of Object.entries(HEADER_HINTS)) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) return field;
    }
  }
  return null;
}

// ─── 메인 감지 함수 ───

/**
 * Excel 워크북에서 데이터 패턴을 분석하여 컬럼 타입을 자동 감지
 */
export function detectColumns(
  wb: XLSX.WorkBook,
  sheetName: string
): DetectionResult | null {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) return null;

  const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  if (jsonData.length < 3) return null;

  const range = XLSX.utils.decode_range(ws['!ref']!);
  const maxCol = Math.min(range.e.c + 1, 100);
  const maxRow = Math.min(jsonData.length, 100); // 최대 100행 스캔

  // Step 1: 데이터 시작 행 감지 (주민번호가 처음 나타나는 행)
  let dataStartRowIdx = -1; // 0-indexed
  for (let r = 0; r < maxRow; r++) {
    const row = jsonData[r];
    if (!row) continue;
    for (let c = 0; c < maxCol; c++) {
      if (isResidentNo(row[c])) {
        dataStartRowIdx = r;
        break;
      }
    }
    if (dataStartRowIdx >= 0) break;
  }

  // 주민번호를 못 찾으면 대안: 연속 숫자 데이터가 시작되는 행
  if (dataStartRowIdx < 0) {
    for (let r = 0; r < maxRow; r++) {
      const row = jsonData[r];
      if (!row) continue;
      let numericCount = 0;
      for (let c = 0; c < maxCol; c++) {
        if (typeof row[c] === 'number') numericCount++;
      }
      // 행에 숫자가 3개 이상이면 데이터 행으로 추정
      if (numericCount >= 3) {
        dataStartRowIdx = r;
        break;
      }
    }
  }

  if (dataStartRowIdx < 0) dataStartRowIdx = 2; // 최후 폴백

  // 헤더 행 탐색: 데이터 시작 위로 최대 3줄 스캔, 키워드 매칭이 가장 많은 행 선정
  // (급여대장은 결재란 때문에 헤더가 3~4번째 줄에 있는 경우가 많음)
  let headerRowIdx = Math.max(0, dataStartRowIdx - 1);
  {
    let bestHitCount = 0;
    const scanStart = Math.max(0, dataStartRowIdx - 3);
    for (let r = scanStart; r < dataStartRowIdx; r++) {
      const row = jsonData[r];
      if (!row) continue;
      let hitCount = 0;
      for (let c = 0; c < maxCol; c++) {
        const val = row[c];
        if (val === undefined || val === null || val === '') continue;
        const text = String(val).trim();
        if (text && matchHeaderHint(text)) hitCount++;
      }
      if (hitCount > bestHitCount) {
        bestHitCount = hitCount;
        headerRowIdx = r;
      }
    }
  }

  // Step 2: 데이터 행에서 각 컬럼 패턴 분석
  const scanRows = Math.min(dataStartRowIdx + 30, maxRow); // 최대 30행 샘플
  const columnStats: Map<number, Map<ColumnType, number>> = new Map();
  const columnSamples: Map<number, string[]> = new Map();

  for (let c = 0; c < maxCol; c++) {
    const typeCounts: Map<ColumnType, number> = new Map();
    const samples: string[] = [];

    for (let r = dataStartRowIdx; r < scanRows; r++) {
      const val = jsonData[r]?.[c];
      const type = classifyCell(val);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

      if (type !== 'EMPTY' && samples.length < 3) {
        samples.push(String(val).substring(0, 20));
      }
    }

    columnStats.set(c, typeCounts);
    columnSamples.set(c, samples);
  }

  // Step 3: 각 컬럼의 지배적 타입 결정
  const detections: ColumnDetection[] = [];

  for (let c = 0; c < maxCol; c++) {
    const stats = columnStats.get(c);
    if (!stats) continue;

    const totalNonEmpty = Array.from(stats.entries())
      .filter(([t]) => t !== 'EMPTY')
      .reduce((sum, [, count]) => sum + count, 0);

    if (totalNonEmpty === 0) continue; // 빈 컬럼 스킵

    // 가장 많은 타입
    let dominant: ColumnType = 'TEXT';
    let maxCount = 0;
    for (const [type, count] of stats.entries()) {
      if (type === 'EMPTY') continue;
      if (count > maxCount) {
        maxCount = count;
        dominant = type;
      }
    }

    const confidence = totalNonEmpty > 0 ? maxCount / totalNonEmpty : 0;

    // 헤더 힌트 추출 (병합 셀 대응: 빈 셀이면 왼쪽/위쪽 상속)
    let headerHint = '';
    {
      let hVal = jsonData[headerRowIdx]?.[c];
      // 병합 셀: 현재 위치가 비어있으면 왼쪽에서 상속
      if (hVal === undefined || hVal === null || hVal === '') {
        for (let lc = c - 1; lc >= 0; lc--) {
          const leftVal = jsonData[headerRowIdx]?.[lc];
          if (leftVal !== undefined && leftVal !== null && leftVal !== '') {
            hVal = leftVal;
            break;
          }
        }
      }
      // 그래도 없으면 위쪽 행에서 상속
      if (hVal === undefined || hVal === null || hVal === '') {
        for (let ur = headerRowIdx - 1; ur >= Math.max(0, headerRowIdx - 2); ur--) {
          const upVal = jsonData[ur]?.[c];
          if (upVal !== undefined && upVal !== null && upVal !== '') {
            hVal = upVal;
            break;
          }
        }
      }
      // 헤더행 위 행도 포함해서 조합
      const aboveVal = jsonData[Math.max(0, headerRowIdx - 1)]?.[c];
      const parts = [aboveVal, hVal]
        .filter(v => v !== undefined && v !== null && v !== '')
        .map(v => String(v).replace(/\r?\n/g, ' ').trim());
      headerHint = [...new Set(parts)].join(' ').trim();
    }

    // 신뢰도 보강: 헤더 텍스트 + 데이터 패턴이 둘 다 일치하면 가중치
    let adjustedConfidence = confidence;
    if (headerHint) {
      const hintField = matchHeaderHint(headerHint);
      if (hintField) {
        // 헤더가 가리키는 필드와 데이터 패턴이 일치하는지 확인
        const fieldTypeMap: Record<string, ColumnType[]> = {
          name: ['KOREAN_NAME', 'TEXT'],
          residentNo: ['RESIDENT_NO'],
          joinDate: ['DATE'],
          leaveDate: ['DATE'],
          wage: ['LARGE_NUMBER'],
          phone: ['PHONE'],
        };
        const expectedTypes = fieldTypeMap[hintField];
        if (expectedTypes && expectedTypes.includes(dominant)) {
          // 헤더 + 데이터 패턴 일치 → 신뢰도 20% 보너스 (최대 1.0)
          adjustedConfidence = Math.min(1.0, confidence + 0.2);
        }
      }
    }

    detections.push({
      colIndex: c,
      dominantType: dominant,
      confidence: adjustedConfidence,
      sampleValues: columnSamples.get(c) || [],
      headerHint: headerHint || undefined,
    });
  }

  // Step 4: 필드 매핑 추천
  const mapping = buildMapping(detections);

  return {
    headerRow: headerRowIdx + 1,       // 1-indexed
    dataStartRow: dataStartRowIdx + 1, // 1-indexed
    columns: detections,
    mapping,
    sheetName,
  };
}

/**
 * 감지된 컬럼들에서 필드 매핑 결정
 */
function buildMapping(detections: ColumnDetection[]) {
  let residentNoCol: number | null = null;
  let nameCol: number | null = null;
  let phoneCol: number | null = null;
  const dateColumns: ColumnDetection[] = [];
  const largeNumColumns: ColumnDetection[] = [];
  const numberColumns: { colIndex: number; headerHint?: string }[] = [];

  // 1차: 패턴 기반
  for (const det of detections) {
    switch (det.dominantType) {
      case 'RESIDENT_NO':
        if (residentNoCol === null || det.confidence > (detections.find(d => d.colIndex === residentNoCol)?.confidence || 0)) {
          residentNoCol = det.colIndex;
        }
        break;
      case 'KOREAN_NAME':
        if (nameCol === null) nameCol = det.colIndex;
        break;
      case 'DATE':
        dateColumns.push(det);
        break;
      case 'LARGE_NUMBER':
        largeNumColumns.push(det);
        numberColumns.push({ colIndex: det.colIndex, headerHint: det.headerHint });
        break;
      case 'SMALL_NUMBER':
        numberColumns.push({ colIndex: det.colIndex, headerHint: det.headerHint });
        break;
      case 'PHONE':
        if (phoneCol === null) phoneCol = det.colIndex;
        break;
    }
  }

  // 2차: 이름이 안 잡혔으면 주민번호 바로 왼쪽에서 찾기
  if (nameCol === null && residentNoCol !== null) {
    // 주민번호 왼쪽 1~2칸에서 TEXT 또는 KOREAN_NAME 찾기
    for (let offset = 1; offset <= 2; offset++) {
      const candidateIdx = residentNoCol - offset;
      const candidate = detections.find(d => d.colIndex === candidateIdx);
      if (candidate && (candidate.dominantType === 'TEXT' || candidate.dominantType === 'KOREAN_NAME')) {
        nameCol = candidateIdx;
        break;
      }
    }
  }

  // 3차: 날짜 컬럼 분류 (헤더 힌트 활용)
  let joinDateCol: number | null = null;
  let leaveDateCol: number | null = null;

  for (const dc of dateColumns) {
    const hint = matchHeaderHint(dc.headerHint || '');
    if (hint === 'joinDate' && joinDateCol === null) {
      joinDateCol = dc.colIndex;
    } else if (hint === 'leaveDate' && leaveDateCol === null) {
      leaveDateCol = dc.colIndex;
    }
  }

  // 헤더 힌트로 못 잡았으면 순서대로 (첫번째=입사일, 두번째=퇴사일)
  if (joinDateCol === null && dateColumns.length > 0) {
    joinDateCol = dateColumns[0].colIndex;
  }
  if (leaveDateCol === null && dateColumns.length > 1) {
    leaveDateCol = dateColumns[1].colIndex;
  }

  // 4차: 급여 컬럼 (마지막 큰 숫자 컬럼 or 헤더에 "총" 포함)
  let wageCol: number | null = null;
  for (const lc of largeNumColumns) {
    const hint = matchHeaderHint(lc.headerHint || '');
    if (hint === 'wage') {
      wageCol = lc.colIndex;
      break;
    }
  }
  // 못 찾으면 큰 숫자 중 마지막 (보통 합계가 오른쪽)
  if (wageCol === null && largeNumColumns.length > 0) {
    wageCol = largeNumColumns[largeNumColumns.length - 1].colIndex;
  }

  return {
    name: nameCol,
    residentNo: residentNoCol,
    joinDate: joinDateCol,
    leaveDate: leaveDateCol,
    wage: wageCol,
    phone: phoneCol,
    numberColumns,
  };
}

/**
 * 최적 시트 자동 선택
 * 1) '임금대장' 포함하는 시트
 * 2) 주민번호가 가장 많은 시트
 * 3) 첫번째 시트
 */
export function detectBestSheet(wb: XLSX.WorkBook): string {
  // 키워드 매칭
  const keywords = ['임금대장', '급여대장', '급여', '임금', '급여현황', '급여명세'];
  for (const kw of keywords) {
    const match = wb.SheetNames.find(s => s.includes(kw));
    if (match) return match;
  }

  // 주민번호 밀도가 가장 높은 시트
  let bestSheet = wb.SheetNames[0];
  let bestCount = 0;

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) continue;

    const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    let count = 0;
    const checkRows = Math.min(json.length, 30);
    for (let r = 0; r < checkRows; r++) {
      const row = json[r];
      if (!row) continue;
      for (let c = 0; c < Math.min(row.length, 30); c++) {
        if (isResidentNo(row[c])) count++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestSheet = name;
    }
  }

  return bestSheet;
}

/**
 * 감지 결과를 ExcelMapping columns 형식으로 변환 (1-indexed, 기존 호환)
 */
export function detectionToMappingColumns(
  result: DetectionResult
): Record<string, number> {
  const columns: Record<string, number> = {};

  if (result.mapping.name !== null) columns.name = result.mapping.name + 1;
  if (result.mapping.residentNo !== null) columns.residentNo = result.mapping.residentNo + 1;
  if (result.mapping.joinDate !== null) columns.joinDate = result.mapping.joinDate + 1;
  if (result.mapping.leaveDate !== null) columns.leaveDate = result.mapping.leaveDate + 1;
  if (result.mapping.wage !== null) columns.wage = result.mapping.wage + 1;
  if (result.mapping.phone !== null) columns.phone = result.mapping.phone + 1;

  return columns;
}
