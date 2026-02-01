# 엑셀 임포트 기능 리팩토링 삽질기

> Next.js + TypeScript 프로젝트에서 중복 코드를 공통 훅으로 추출하면서 겪은 시행착오

## 문제 상황

급여관리 시스템을 개발하다 보니 엑셀 임포트 기능이 **두 곳**에서 필요해졌다.

1. **근로자 등록 페이지** (`/import`) - 이름, 주민번호, 입사일 등 기본정보 임포트
2. **급여 이력 탭** (`WagesTab`) - 지급내역, 공제내역 등 월별 급여 상세 임포트

처음엔 복붙으로 빠르게 만들었는데, 나중에 보니 **300줄 이상의 코드가 중복**되어 있었다.

## 발견한 중복 코드

```typescript
// 똑같은 코드가 두 파일에...
const extractHeaders = useCallback((wb, sheetName, hRow) => {
  const ws = wb.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // ... 60열까지 스캔, 2행 병합 처리
});

const handleSheetChange = (sheetName) => { /* 동일 */ };
const handleHeaderRowChange = (newRow) => { /* 동일 */ };
```

게다가 `HeaderInfo`, `FieldDef` 같은 타입도 각각 정의되어 있었다.

## 삽질 1: 타입 에러와의 싸움

리팩토링 중 빌드 에러가 터졌다.

```
Type error: Property 'required' does not exist on type
'{ key: string; label: string; required: boolean; } | { key: string; label: string; }'
```

원인은 `FIELD_GROUPS`에서 일부 필드만 `required` 속성을 가지고 있었던 것.

```typescript
// 문제의 코드
const FIELD_GROUPS = {
  '기본정보': [
    { key: 'name', label: '이름', required: true },  // required 있음
  ],
  '지급내역': [
    { key: 'basicWage', label: '기본급' },  // required 없음!
    { key: 'totalWage', label: '임금총액', required: true },
  ],
};
```

TypeScript가 union 타입으로 추론하면서 `required` 속성이 있는 타입과 없는 타입을 구분해버렸다.

### 해결: 타입 명시 + 기본값

```typescript
interface FieldDef {
  key: string;
  label: string;
  required?: boolean;  // optional로 명시
}

const FIELD_GROUPS: Record<string, FieldDef[]> = { ... };

// 사용 시 기본값
{fields.map(({ key, label, required = false }) => (
```

## 삽질 2: 인덱싱 혼란

저장할 때는 1-indexed, 내부에서는 0-indexed를 쓰고 있었는데, 이게 섞이면서 컬럼 매핑이 꼬였다.

```typescript
// 저장할 때
columns[key] = value != null ? value + 1 : undefined;

// 불러올 때
mapping[key] = value != null ? value - 1 : null;
```

이게 두 파일에서 각각 구현되어 있으니, 하나는 +1 빼먹고 하나는 -1 빼먹고...

### 해결: 공통 훅에서 일관되게 처리

```typescript
// useExcelImport.ts
const getMappingForSave = useCallback(() => {
  const columns = {};
  Object.entries(fieldMapping).forEach(([key, value]) => {
    columns[key] = value != null ? value + 1 : undefined;  // 저장 시 1-indexed
  });
  return { sheetName: selectedSheet, headerRow, dataStartRow, columns };
}, [...]);

const applyMapping = useCallback((mapping) => {
  if (mapping.columns) {
    const converted = {};
    Object.entries(mapping.columns).forEach(([key, value]) => {
      converted[key] = value != null ? value - 1 : null;  // 로드 시 0-indexed
    });
    setFieldMapping(converted);
  }
}, [...]);
```

## 삽질 3: 사업장별 설정 충돌

A 사업장은 헤더가 4행에, B 사업장은 6행에 있었다. 근데 매핑을 불러올 때 헤더 행 정보를 같이 안 불러와서 엉뚱한 헤더가 추출됐다.

```typescript
// 문제: headerRow를 먼저 세팅하지 않고 extractHeaders 호출
const { sheetName } = loadExistingMapping(businessId);
const headers = extractHeaders(wb, sheetName, headerRow);  // 기본값 4 사용!
```

### 해결: 매핑 로드 시 모든 값 동기적으로 반환

```typescript
const loadExistingMapping = useCallback((): {
  sheetName: string | null;
  headerRow: number;  // 추가!
  dataStartRow: number;  // 추가!
} => {
  // ...
  return { sheetName, headerRow: hRow, dataStartRow: dRow };
}, []);

// 사용
const { sheetName, headerRow: savedHeaderRow } = loadExistingMapping();
const headers = extractHeaders(wb, sheetName, savedHeaderRow);
```

## 최종 구조

```
src/
├── hooks/
│   └── useExcelImport.ts     # 공통 훅 (200줄)
│       ├── extractHeaders()
│       ├── handleSheetChange()
│       ├── handleHeaderRowChange()
│       ├── applyMapping()
│       ├── getMappingForSave()
│       └── 유틸 함수들
├── types/
│   └── index.ts
│       ├── HeaderInfo
│       ├── FieldDef
│       └── FieldGroups
```

## 배운 점

1. **복붙은 빚이다** - 당장은 빠르지만 나중에 두 배로 갚아야 한다
2. **TypeScript 엄격 모드는 친구** - 귀찮지만 버그를 미리 잡아준다
3. **인덱싱 규칙은 명확하게** - 0-indexed vs 1-indexed 혼용 금지
4. **비동기 상태 주의** - setState 후 바로 쓰면 이전 값이 나온다

## 다음 할 일

- [ ] 기존 컴포넌트에서 useExcelImport 훅 실제 적용
- [ ] 공통 UI 컴포넌트 (ExcelFieldMapping) 추출
- [ ] 에러 처리 강화 (파일 형식 검증, 빈 데이터 처리)

---

*이 글은 Claude Code와 함께 작성되었습니다.*
