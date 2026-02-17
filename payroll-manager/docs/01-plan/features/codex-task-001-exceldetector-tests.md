# Codex Task #001: excelDetector 유닛 테스트 구축

## Task Summary

`payroll-manager/src/lib/excelDetector.ts`의 현재 동작을 테스트로 고정한다.
이후 Import Phase 2 리팩토링 시 회귀를 막는 안전망이 목적이다.

## Confirmed Decisions

- Vitest 신규 도입
- 커버리지 기준 미적용 (이번 PR에서는)
- excelDetector.ts 프로덕션 로직 수정 금지

---

## Step 1: Vitest 설치 및 설정

### 1-1. 패키지 설치

```bash
cd payroll-manager
npm install -D vitest
```

### 1-2. vitest.config.ts 생성

`payroll-manager/vitest.config.ts` 파일을 생성한다:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### 1-3. package.json 스크립트 추가

기존 scripts에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

기존 scripts (변경하지 말 것):
```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint"
```

---

## Step 2: 테스트 유틸 생성

`payroll-manager/src/lib/__tests__/excelTestFactory.ts` 생성:

```typescript
import * as XLSX from 'xlsx';

/**
 * 2D 배열로 모의 WorkBook 생성
 * data[0]은 보통 헤더, data[1:]은 데이터 행
 */
export function createMockWorkbook(
  data: unknown[][],
  sheetName = 'Sheet1'
): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

/**
 * 여러 시트를 가진 WorkBook 생성
 */
export function createMultiSheetWorkbook(
  sheets: { name: string; data: unknown[][] }[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return wb;
}

/**
 * 표준 급여대장 모의 데이터 (헤더 3행 + 데이터)
 * headerRow=3, dataStartRow=4
 */
export function createStandardPayrollData(): unknown[][] {
  return [
    // row 0: 상위 헤더 (결재란 등)
    ['2026년 1월 임금대장', null, null, null, null, null, null],
    // row 1: 빈 행
    [null, null, null, null, null, null, null],
    // row 2: 컬럼 헤더
    ['번호', '이름', '주민번호', '입사일', '퇴사일', '기본급', '지급총액'],
    // row 3~: 데이터
    [1, '김철수', '9501011234567', '2020-03-01', null, 2500000, 3000000],
    [2, '이영희', '8812152345678', '2019-06-15', null, 2800000, 3200000],
    [3, '박민수', '9203033456789', '2021-01-10', '2025-12-31', 2300000, 2700000],
    [4, '최수진', '9905054567890', '2022-08-01', null, 2100000, 2500000],
    [5, '정대한', '8507075678901', '2018-02-20', null, 3000000, 3500000],
  ];
}

/**
 * 주민번호 없는 시트 데이터 (숫자 fallback 테스트용)
 */
export function createNoResidentNoData(): unknown[][] {
  return [
    ['항목', '값1', '값2', '값3'],
    ['매출', 1500000, 2300000, 1800000],
    ['비용', 800000, 900000, 750000],
    ['이익', 700000, 1400000, 1050000],
  ];
}

/**
 * 3행 미만 데이터 (null 반환 테스트용)
 */
export function createTooFewRowsData(): unknown[][] {
  return [
    ['헤더1', '헤더2'],
    ['값1', '값2'],
  ];
}
```

---

## Step 3: 테스트 파일 작성

`payroll-manager/src/lib/__tests__/excelDetector.test.ts` 생성.

### 필수 테스트 시나리오 12개

아래 시나리오를 모두 포함해야 한다. 각 시나리오에 대한 검증 기준을 함께 서술한다.

#### 시나리오 1: 행 수 3 미만 시 null 반환

```
입력: 2행짜리 시트
기대: detectColumns() === null
```

#### 시나리오 2: 주민번호 기반 dataStartRow 감지

```
입력: createStandardPayrollData() (row 0~2=헤더, row 3~=데이터)
기대: result.dataStartRow === 4 (1-indexed)
주민번호 '9501011234567'이 row index 3에 있으므로 dataStartRow = 3+1 = 4
```

#### 시나리오 3: 주민번호 없을 때 숫자 3개 이상 행 fallback

```
입력: createNoResidentNoData()
기대: dataStartRow가 숫자 3개 이상인 첫 행 (row index 1 → dataStartRow=2)
```

#### 시나리오 4: 헤더 상단 3행 스캔에서 키워드 hit 최대 행 선택

```
입력: createStandardPayrollData()
기대: headerRow === 3 (1-indexed)
row 2에 '이름', '주민번호', '입사일', '퇴사일', '지급총액' 등 키워드 hit가 최대
```

#### 시나리오 5: 헤더 힌트 + 데이터타입 일치 시 confidence 가중

```
입력: 표준 데이터
기대: 주민번호 컬럼의 confidence > 기본 비율값 (headerHint '주민번호' + RESIDENT_NO 패턴 일치 → +0.2 보너스)
확인: confidence <= 1.0
```

#### 시나리오 6: 이름 미감지 시 주민번호 좌측 fallback

```
입력: ['번호', 'NAME', '주민번호', ...] 처럼 이름 헤더가 영문이고 데이터가 한글 2~4자가 아닌 경우
또는: 이름 컬럼이 KOREAN_NAME이 아닌 TEXT로 분류되는 경우
기대: mapping.name이 주민번호 colIndex - 1 또는 -2 로 설정됨
```

#### 시나리오 7: 날짜 컬럼에서 joinDate/leaveDate 힌트 우선

```
입력: 헤더에 '입사일', '퇴사일' 키워드가 있는 표준 데이터
기대: mapping.joinDate === 입사일 컬럼 index, mapping.leaveDate === 퇴사일 컬럼 index
```

#### 시나리오 8: 날짜 힌트 없으면 순서 fallback

```
입력: 헤더가 '날짜1', '날짜2'인 시트 (키워드 매칭 안 됨)
기대: mapping.joinDate === 첫번째 DATE 컬럼, mapping.leaveDate === 두번째 DATE 컬럼
```

#### 시나리오 9: 급여 컬럼 - wage 힌트 우선, 없으면 마지막 LARGE_NUMBER

```
입력 A: 헤더에 '지급총액' 있음 → wage 힌트 매칭
기대 A: mapping.wage === 해당 컬럼

입력 B: 헤더에 급여 관련 키워드 없고 LARGE_NUMBER 컬럼 여러 개
기대 B: mapping.wage === 마지막 LARGE_NUMBER 컬럼
```

#### 시나리오 10: detectBestSheet - 키워드 시트 우선

```
입력: 시트명 ['요약', '임금대장', '기타']
기대: detectBestSheet() === '임금대장'
```

#### 시나리오 11: detectBestSheet - 키워드 없으면 주민번호 밀도

```
입력: 시트 A는 주민번호 0개, 시트 B는 주민번호 5개
기대: detectBestSheet() === 시트 B 이름
```

#### 시나리오 12: detectionToMappingColumns 인덱스 변환

```
입력: mapping.name=1 (0-indexed), mapping.residentNo=2 (0-indexed)
기대: result.name === 2 (1-indexed), result.residentNo === 3 (1-indexed)
null인 필드는 결과에 포함되지 않음
```

---

## Step 4: 실행 및 검증

```bash
cd payroll-manager
npm run test
```

모든 테스트 통과를 확인한다.

```bash
npm run build
```

빌드에도 영향 없음을 확인한다.

---

## Constraints (반드시 준수)

1. **excelDetector.ts 수정 금지**: 테스트가 실패하면 테스트 코드를 수정하라. 프로덕션 로직을 맞추지 말 것.
2. **변경 파일 제한**: 아래 파일만 생성/수정 허용:
   - `payroll-manager/vitest.config.ts` (신규)
   - `payroll-manager/package.json` (scripts + devDependencies만)
   - `payroll-manager/src/lib/__tests__/excelDetector.test.ts` (신규)
   - `payroll-manager/src/lib/__tests__/excelTestFactory.ts` (신규)
3. **기존 코드 import 방식**: `@/lib/excelDetector`로 import (tsconfig paths alias 사용)
4. **lint**: 기존 프로젝트에 lint 에러 41개가 있음. 새로 작성하는 테스트 파일에서 lint 에러를 만들지 않으면 됨. 전체 lint 통과는 요구하지 않음.

---

## PR 작성 가이드

### 제목
```
test: excelDetector 유닛 테스트 12개 시나리오 추가
```

### 본문 템플릿

```markdown
## Summary
- Vitest 도입 및 excelDetector.ts 유닛 테스트 구축
- Phase 2 리팩토링 전 회귀 방지 안전망 확보

## Changes
- `vitest.config.ts`: Vitest 설정 (node 환경, @ alias)
- `package.json`: test/test:watch 스크립트, vitest devDependency 추가
- `src/lib/__tests__/excelTestFactory.ts`: 모의 WorkBook 생성 헬퍼
- `src/lib/__tests__/excelDetector.test.ts`: 12개 시나리오 테스트

## Test Results
- Total: NN tests
- Passed: NN
- Failed: 0

## Verified Scenarios
1. 행 수 3 미만 → null
2. 주민번호 기반 dataStartRow 감지
3. 숫자 fallback dataStartRow 감지
4. 키워드 hit 기반 headerRow 선택
5. confidence 가중 (+0.2, max 1.0)
6. 이름 주민번호 좌측 fallback
7. joinDate/leaveDate 힌트 우선
8. 날짜 순서 fallback
9. wage 힌트/마지막 LARGE_NUMBER fallback
10. detectBestSheet 키워드 우선
11. detectBestSheet 밀도 기반
12. detectionToMappingColumns 인덱스 변환

## Residual Risks
- (3줄 이내로 작성)

## Next Steps
- Phase 2 리팩토링 시 보호되는 동작 목록:
  - (테스트로 고정된 동작 나열)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Reference: excelDetector.ts 핵심 구조

테스트 작성 시 참고할 프로덕션 코드의 핵심 구조:

### Export 함수 3개

```typescript
// 1. 메인 감지 함수
export function detectColumns(wb: XLSX.WorkBook, sheetName: string): DetectionResult | null

// 2. 최적 시트 선택
export function detectBestSheet(wb: XLSX.WorkBook): string

// 3. 매핑 포맷 변환 (0-indexed → 1-indexed)
export function detectionToMappingColumns(result: DetectionResult): Record<string, number>
```

### DetectionResult 타입

```typescript
interface DetectionResult {
  headerRow: number;      // 1-indexed
  dataStartRow: number;   // 1-indexed
  columns: ColumnDetection[];
  mapping: {
    name: number | null;        // 0-indexed
    residentNo: number | null;
    joinDate: number | null;
    leaveDate: number | null;
    wage: number | null;
    phone: number | null;
    numberColumns: { colIndex: number; headerHint?: string }[];
  };
  sheetName: string;
}
```

### 내부 로직 요약 (테스트 기대값 산출용)

1. **dataStartRow 감지**: 주민번호(13자리, 월 1~12, 일 1~31) 최초 발견 행. 없으면 숫자 3개 이상 행. 최후 폴백 row index 2.
2. **headerRow 감지**: dataStartRow 위로 최대 3행 스캔, HEADER_HINTS 키워드 hit가 가장 많은 행. 기본값은 dataStartRow 바로 위 행.
3. **confidence**: (해당 타입 셀 수 / 비어있지 않은 셀 수). 헤더 힌트 + 데이터 패턴 일치 시 +0.2 (max 1.0).
4. **이름 fallback**: KOREAN_NAME 미감지 시 주민번호 colIndex - 1, - 2에서 TEXT 또는 KOREAN_NAME 탐색.
5. **날짜 매핑**: 헤더 힌트 'joinDate'/'leaveDate' 우선. 없으면 첫 DATE=입사일, 둘째 DATE=퇴사일.
6. **급여 매핑**: 헤더 힌트 'wage' 우선. 없으면 LARGE_NUMBER 중 마지막.
7. **detectBestSheet**: 키워드 ['임금대장', '급여대장', '급여', '임금', '급여현황', '급여명세'] 순서 매칭. 없으면 주민번호 밀도 최대 시트.
8. **detectionToMappingColumns**: 각 필드가 null이 아니면 +1, null이면 결과에서 제외.

### HEADER_HINTS (키워드 사전)

```typescript
{
  name: ['이름', '성명', '근로자명', '사원명', '직원명'],
  residentNo: ['주민번호', '주민등록번호', '생년월일', '주민번호'],
  joinDate: ['입사일', '입사일자', '채용일', '취득일'],
  leaveDate: ['퇴사일', '퇴사일자', '퇴직일', '상실일'],
  wage: ['임금총액', '지급총액', '지급합계', '총지급액', '급여총액', '총액', '합계'],
  phone: ['전화번호', '연락처', '핸드폰', '휴대폰'],
}
```
