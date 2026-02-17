# Import Phase 2 — Codex Handoff Document

> **Owner**: Codex (구현) / Claude Code (리뷰)
> **Date**: 2026-02-17
> **Status**: Ready for Implementation
> **Base Branch**: master

---

## Context

payroll-manager의 엑셀 Import 기능은 Phase 1(감지 엔진)이 완료된 상태.
현재 `import/page.tsx`(623줄)에 UI + 감지 + 상태 + Import 로직이 모두 섞여 있고,
`useExcelImport` 훅은 존재하지만 page.tsx에서 사용하지 않는 상태.

**기술 스택**: Next.js 16, TypeScript, Tailwind CSS, Zustand, xlsx 라이브러리

**핵심 파일 (반드시 읽고 시작)**:
- `src/lib/excelDetector.ts` (518줄) — 데이터 패턴 기반 감지 엔진 (수정 금지)
- `src/hooks/useExcelImport.ts` (438줄) — 리팩토링 대상
- `src/app/import/page.tsx` (623줄) — 리팩토링 대상
- `src/types/index.ts` — ExcelMapping, HeaderInfo 타입 정의
- `src/store/useStore.ts` — excelMappings, setExcelMapping 스토어

---

## PR 1: useExcelImport 훅 통합 리팩토링

### 목표

`import/page.tsx`의 비즈니스 로직을 `useExcelImport` 훅으로 이동.
페이지는 순수 UI만 담당하게 만든다.

### 범위

| 파일 | 작업 |
|------|------|
| `src/hooks/useExcelImport.ts` | excelDetector 통합, page.tsx의 상태/로직 흡수 |
| `src/app/import/page.tsx` | 훅 사용으로 전환, UI만 남기기 |

### 비범위

- `src/lib/excelDetector.ts` 수정 금지
- 새 파일 생성 금지 (이 2개 파일만 수정)
- 감지 알고리즘 변경 없음
- 새 기능 추가 없음

### 설계 상세

#### useExcelImport 훅 인터페이스 (최종)

```typescript
interface UseExcelImportReturn {
  // 상태
  workbook: XLSX.WorkBook | null;
  sheetNames: string[];
  selectedSheet: string;
  headers: HeaderInfo[];
  headerRow: number;
  dataStartRow: number;
  fieldMapping: Record<string, number | null>;
  detection: DetectionResult | null;
  usingSavedMapping: boolean;
  previewData: ImportRow[];
  fileName: string;

  // 액션
  handleFileUpload: (file: File, businessId: string | null) => void;
  handleSheetChange: (sheetName: string) => void;
  handleHeaderRowChange: (newRow: number) => void;
  setDataStartRow: (row: number) => void;
  updateFieldMapping: (key: string, value: number | null) => void;
  loadPreview: () => { success: boolean; message?: string };
  saveMapping: (businessId: string) => void;
  handleImport: (params: ImportParams) => Promise<ImportResult>;
  reset: () => void;
}

interface ImportParams {
  businessId: string;
  overwriteMode: boolean;
  workers: Worker[];
  business: Business | undefined;
  // store actions (훅 내부에서 store 직접 접근하지 않고 파라미터로 받음)
  addWorkers: (workers: Worker[]) => void;
  addEmployments: (employments: Employment[]) => void;
  deleteEmploymentsByBusiness: (id: string) => Promise<number>;
}

interface ImportResult {
  success: boolean;
  message: string;
}
```

#### 이동할 로직 (page.tsx → 훅)

1. `extractHeaders` 함수 → 훅의 기존 것을 detector 호환으로 교체
2. `tryLoadSavedMapping` → 훅 내부로 이동 (excelMappings는 파라미터로 받기)
3. `handleFileUpload` → 훅 내부 (detector 호출 + 저장매핑 로드 포함)
4. `handleSheetChange` → 훅 내부 (재감지 포함)
5. `loadPreview` → 훅 내부
6. `saveMapping` → 훅 내부
7. 상태: workbook, sheets, selectedSheet, detection, headerRow, dataStartRow, fieldMapping, headers, previewData, fileName, usingSavedMapping

#### page.tsx에 남길 것 (UI only)

1. store 셀렉터 (businesses, workers, selectedBusinessId 등)
2. `overwriteMode`, `isImporting` 로컬 상태
3. `ConfidenceBadge` 컴포넌트
4. `CORE_FIELDS` 상수
5. JSX 렌더링 전체
6. toast 호출 (훅의 리턴값 메시지 기반)

#### 주의사항

- **Zustand 패턴**: `useStore((s) => s.field)` 개별 셀렉터 사용 (destructuring 금지)
- **훅 내부에서 useStore 직접 사용 금지**: store 데이터는 page.tsx에서 훅에 전달
  - 이유: 훅의 재사용성 + 테스트 용이성
  - `excelMappings`는 `handleFileUpload` 호출 시 파라미터로 전달
- **기존 import/export 유지**: `parseExcelDate`, `normalizeResidentNo`, `indexToColumnLetter`는 useExcelImport.ts에서 계속 export
- **`ImportRow` 인터페이스**: 훅 파일로 이동하고 export

### 완료 조건

- [ ] `import/page.tsx`가 `useExcelImport()` 훅만 호출하여 동작
- [ ] page.tsx에 `XLSX` 직접 호출 없음 (훅을 통해서만)
- [ ] page.tsx에 `detectColumns`, `detectBestSheet` import 없음
- [ ] `extractHeaders` 함수가 page.tsx에서 제거됨 (훅 내부만)
- [ ] 기존 동작 100% 동일:
  - 파일 업로드 → 자동감지 → 매핑 표시
  - 저장된 매핑 우선 로드
  - 시트/헤더행 변경 시 재감지
  - 미리보기 → Import 실행
  - 매핑 저장
- [ ] page.tsx 300줄 이하
- [ ] `npm run build` 에러 없음

---

## PR 2: 자동 미리보기 + 에러 UX

> **선행**: PR 1 머지 후 진행

### 목표

감지 완료 시 자동 미리보기 실행 + 필수 필드 미감지 시 인라인 가이드.

### 범위

| 파일 | 작업 |
|------|------|
| `src/hooks/useExcelImport.ts` | 감지 완료 후 자동 미리보기 로직 추가 |
| `src/app/import/page.tsx` | 에러 상태 UI 표시 |

### 비범위

- `src/lib/excelDetector.ts` 수정 금지
- 새 파일/컴포넌트 생성 금지
- 감지 알고리즘 변경 없음

### 설계 상세

#### 자동 미리보기

```
파일 업로드
  → 감지 실행
  → fieldMapping.name !== null && fieldMapping.residentNo !== null
    → 자동으로 loadPreview() 호출
    → 실패 시 토스트만 (블로킹 아님)
```

- 시트 변경 시에도 재감지 후 조건 충족하면 자동 미리보기
- 저장된 매핑 로드 시에도 자동 미리보기
- 수동 "미리보기" 버튼은 유지 (사용자가 매핑 수정 후 재실행용)

#### 에러 UX

필수 필드(`name`, `residentNo`) 미감지 시:
```tsx
{colIdx === null && required && (
  <span className="text-xs text-red-400 ml-1">수동 선택 필요</span>
)}
```

- 기존 `border-red-500/30` 스타일 활용 (이미 있음)
- 토스트가 아닌 인라인 텍스트
- 감지 실패 시 전체 안내 메시지 추가:
```tsx
{!detection && sheets.length > 0 && !usingSavedMapping && (
  <p className="text-sm text-yellow-400 mb-3">
    자동 감지에 실패했습니다. 아래 드롭다운에서 직접 컬럼을 선택해주세요.
  </p>
)}
```

### 완료 조건

- [ ] 이름+주민번호 모두 감지 시 자동 미리보기 실행됨
- [ ] 저장된 매핑 로드 시에도 자동 미리보기 실행됨
- [ ] 필수 필드 미감지 시 "수동 선택 필요" 텍스트 표시
- [ ] 감지 실패 시 안내 메시지 표시
- [ ] 기존 수동 "미리보기" 버튼 유지
- [ ] `npm run build` 에러 없음

---

## PR 3: excelDetector 유닛 테스트

> **선행**: 없음 (PR 1/2와 병렬 가능)

### 목표

감지 엔진의 핵심 로직에 대한 유닛 테스트 작성.

### 범위

| 파일 | 작업 |
|------|------|
| `src/lib/__tests__/excelDetector.test.ts` | 신규 생성 |
| `package.json` | jest/vitest 설정 필요 시 추가 (최소한으로) |

### 비범위

- `excelDetector.ts` 코드 수정 금지
- 통합 테스트 / E2E 테스트 없음
- 훅 테스트 없음

### 설계 상세

#### 테스트 구조

```
describe('classifyCell')
  - 주민번호 패턴: '9501011234567' → RESIDENT_NO
  - 주민번호 하이픈: '950101-1234567' → RESIDENT_NO
  - 한글 이름: '김철수' → KOREAN_NAME
  - 5자 이상 한글: '김철수입니다' → TEXT (이름 아님)
  - 날짜 문자열: '2024-01-15' → DATE
  - 엑셀 시리얼: 45000 → DATE
  - 큰 숫자: 2500000 → LARGE_NUMBER
  - 작은 숫자: 50000 → SMALL_NUMBER
  - 전화번호: '01012345678' → PHONE
  - 빈 값: null/undefined/'' → EMPTY

describe('detectColumns')
  - 모의 WorkBook 생성하여 통합 테스트
  - 기본 케이스: 이름/주민번호/입사일/급여 컬럼이 있는 시트
  - 헤더 행 자동 감지 확인
  - 데이터 시작 행 자동 감지 확인
  - mapping.name, mapping.residentNo 등 정확히 매핑되는지 확인

describe('detectBestSheet')
  - 시트명 '임금대장' 포함 시 우선 선택
  - 주민번호 밀도 기반 선택

describe('detectionToMappingColumns')
  - 0-indexed → 1-indexed 변환 정확성
```

#### 모의 데이터 헬퍼

```typescript
// xlsx WorkBook 모의 생성 헬퍼
function createMockWorkbook(data: unknown[][], sheetName = 'Sheet1'): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}
```

#### 테스트 프레임워크

- 프로젝트에 테스트 프레임워크가 없으면 `vitest` 추가 (Next.js 호환 최적)
- `package.json`에 `"test": "vitest run"` 스크립트 추가
- `vitest.config.ts` 최소 설정:
  ```typescript
  import { defineConfig } from 'vitest/config';
  import path from 'path';
  export default defineConfig({
    test: { globals: true },
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  });
  ```

### 완료 조건

- [ ] `classifyCell` 패턴별 테스트 최소 10개
- [ ] `detectColumns` 통합 테스트 최소 2개 (정상 시트, 주민번호 없는 시트)
- [ ] `detectBestSheet` 테스트 최소 2개
- [ ] `detectionToMappingColumns` 변환 테스트 1개
- [ ] `npm run test` (또는 `npx vitest run`) 전체 통과
- [ ] `npm run build` 에러 없음

---

## 운영 규칙

1. **한 PR = 한 오너** — Codex가 작업 중인 파일은 Claude Code가 동시 수정하지 않음
2. **PR 단위 전달** — 커밋 단위 전달 금지, PR 생성 후 리뷰 요청
3. **빌드 통과 필수** — PR 생성 전 `npm run build` 성공 확인
4. **기존 스타일 준수**:
   - Zustand: `useStore((s) => s.field)` 개별 셀렉터
   - Firestore: `cleanUndefined()` 필수 (이번 PR에서 해당 없음)
   - Tailwind 클래스: 기존 `glass`, `input-glass`, `btn-primary`, `btn-secondary` 패턴 유지
5. **회귀 테스트**: PR 1/2 완료 후 Claude Code가 수동 검증 (파일 업로드 → 감지 → Import 전체 흐름)

## 실행 순서

```
PR 3 (테스트) ──────────────────────────────┐
                                             ├─ Claude Code 리뷰
PR 1 (훅 리팩토링) → PR 2 (자동 미리보기) ──┘
```

PR 1과 PR 3은 병렬 진행 가능. PR 2는 PR 1 머지 후 시작.
