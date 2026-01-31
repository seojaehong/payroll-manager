# 엑셀의 마법: 30개 사업장의 다른 양식을 하나로

> **TL;DR**: 사업장마다 다른 엑셀 양식을 처리하기 위해 유연한 매핑 시스템을 구축했습니다. xlsx 라이브러리 활용법, 날짜/주민번호/금액 파싱의 함정, 그리고 한 번 설정으로 반복 사용 가능한 매핑 저장 방식을 공유합니다.

---

## 들어가며: 30개의 다른 양식

가장 큰 도전은 **사업장마다 급여대장 양식이 다르다**는 것이었습니다.

```
A사업장: 이름=B열(2), 주민번호=D열(4), 입사일=E열(5)
B사업장: 이름=C열(3), 주민번호=E열(5), 입사일=F열(6)
C사업장: 시트 이름도 "급여대장"이고 헤더 행도 3행
```

만약 양식을 통일하라고 하면? 사업장에서 반발이 옵니다. 수년간 써온 양식을 바꾸고 싶어하는 사람은 없으니까요.

**해결책**: 양식을 바꾸지 않고, **시스템이 적응**하도록 만들자.

---

## xlsx 라이브러리 선택

JavaScript에서 엑셀을 다루는 라이브러리는 여러 개가 있습니다.

| 라이브러리 | 장점 | 단점 |
|-----------|------|------|
| **xlsx (SheetJS)** | 가장 널리 사용, 읽기/쓰기 모두 지원 | 번들 크기 큼 |
| exceljs | 스타일링 강력 | API 복잡 |
| xlsx-populate | 가벼움 | 기능 제한 |

**xlsx**를 선택했어요. 커뮤니티가 크고 문서가 풍부해서, 문제가 생겨도 해결책을 찾기 쉽습니다.

```bash
npm install xlsx file-saver
npm install -D @types/file-saver
```

---

## 엑셀 파일 읽기: 기본 구조

```typescript
import * as XLSX from 'xlsx';

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const data = event.target?.result;
    const workbook = XLSX.read(data, { type: 'binary' });

    // 시트 목록 확인
    console.log(workbook.SheetNames); // ["임금대장", "Sheet2", ...]

    // 특정 시트 선택
    const sheet = workbook.Sheets['임금대장'];

    // JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  };

  reader.readAsBinaryString(file);
};
```

### 실제 데이터 구조

`sheet_to_json(sheet, { header: 1 })`은 2차원 배열을 반환합니다.

```javascript
[
  [],                                          // 행 1 (빈 행)
  [],                                          // 행 2
  [],                                          // 행 3
  [null, "이름", "부서", "주민등록번호", ...],  // 행 4 (헤더)
  [],                                          // 행 5
  [1, "김**", "홀", "9501011234567", ...],     // 행 6 (데이터 시작)
  [2, "이**", "주방", "8805152345678", ...],
  ...
]
```

배열 인덱스가 곧 행 번호예요. 빈 행도 포함되어 있어서, 실제 데이터 위치를 정확히 알 수 있습니다.

---

## 컬럼 매핑 시스템

### 문제 재정의

각 사업장마다:
- **시트 이름**이 다름 ("임금대장", "급여대장", "월급명세")
- **헤더 행**이 다름 (3행, 4행, 5행...)
- **데이터 시작 행**이 다름
- **열 위치**가 다름 (이름이 B열? C열?)

### 해결: 매핑 인터페이스

```typescript
interface ExcelMapping {
  businessId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columns: {
    name: number;
    residentNo: number;
    joinDate: number;
    leaveDate: number;
    wage: number;
  };
}
```

### 매핑 UI 구현

사용자가 한 번만 설정하면 되는 UI를 만들었습니다.

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>시트 이름</label>
    <select value={selectedSheet} onChange={handleSheetChange}>
      {workbook.SheetNames.map((s) => (
        <option key={s}>{s}</option>
      ))}
    </select>
  </div>

  <div>
    <label>헤더 행</label>
    <input
      type="number"
      value={mapping.headerRow}
      onChange={(e) => updateMapping('headerRow', e.target.value)}
    />
  </div>

  <div>
    <label>데이터 시작 행</label>
    <input
      type="number"
      value={mapping.dataStartRow}
      onChange={(e) => updateMapping('dataStartRow', e.target.value)}
    />
  </div>

  <div>
    <label>이름 열 (예: B열=2)</label>
    <input
      type="number"
      value={mapping.columns.name}
      onChange={(e) => updateColumn('name', e.target.value)}
    />
  </div>

  {/* ... 주민번호, 입사일, 퇴사일, 급여 */}
</div>
```

**[캡처 필요 #1]**: 엑셀 매핑 설정 UI 전체 화면 - 시트 선택, 행/열 설정

---

## 데이터 파싱의 함정들

엑셀 데이터를 읽을 때 예상치 못한 문제들이 있었어요.

### 1. 날짜 처리의 함정

엑셀에서 날짜는 **숫자**로 저장됩니다.

```javascript
// 엑셀 내부값: 45678 (1900년 1월 1일부터 일수)
// 우리가 원하는 값: "2025-01-15"
```

이걸 모르고 그냥 읽으면 "45678"이라는 숫자가 나와요.

```typescript
const parseDate = (val: unknown): string => {
  if (!val) return '';

  // 숫자인 경우 (엑셀 날짜 시리얼)
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // 문자열인 경우
  const str = String(val);
  if (str.includes('-')) return str;  // "2025-01-15" 형식
  if (str.length === 8) {             // "20250115" 형식
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }

  return str;
};
```

### 2. 주민등록번호 처리

```javascript
// 문제: 엑셀에서 0으로 시작하는 숫자는 잘림
// 원본: "0501011234567"
// 읽은 값: 501011234567 (앞의 0이 사라짐!)
```

00년대생, 10년대생의 주민번호는 0으로 시작해요. 엑셀이 숫자로 인식하면 앞자리가 날아갑니다.

```typescript
let residentNo = String(row[mapping.residentNoCol - 1] || '')
  .replace(/-/g, '')  // 하이픈 제거 (950101-1234567 → 9501011234567)
  .trim();

// 13자리 미만이면 앞에 0 채우기
if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
  residentNo = residentNo.padStart(13, '0');
}
```

### 3. 금액 처리

```javascript
// 원본: "2,060,740" 또는 2060740
const wageRaw = row[mapping.wageCol - 1];

const wage = typeof wageRaw === 'number'
  ? wageRaw
  : parseInt(String(wageRaw).replace(/,/g, '')) || 0;
```

쉼표가 포함된 문자열 금액과, 순수 숫자 모두 처리해야 해요.

---

## 신고용 엑셀 생성

근로복지공단 양식에 맞는 엑셀을 생성합니다. 무려 38개 컬럼이에요.

```typescript
const generateAcquireExcel = () => {
  const header = [
    '*주민등록번호', '*성명', '*대표자여부', '영문성명', '국적', '체류자격',
    '*소득월액', '*자격취득일', '*취득월납부', '*취득부호', '특수직종', '상이사유', '직역연금',
    '*피부양자', '*보수월액', '*자격취득일', '*취득부호', '감면부호', '회계명', '직종명',
    '*월평균보수', '*자격취득일', '*직종부호', '*근로시간', '부과구분', '부과사유', '*계약직', '종료일',
    '*월평균보수', '*자격취득일', '직종부호', '근로시간', '부과구분', '부과사유', '계약직', '종료일',
    '오류메세지', '경고메세지'
  ];

  const dataRows = targetWorkers.map(({ worker, employment }) => {
    const dt = employment.joinDate.replace(/-/g, '');  // "20250115"

    return [
      worker.residentNo,
      worker.name,
      employment.isRepresentative ? 'Y' : 'N',
      worker.englishName || '',
      worker.nationality || '100',
      worker.stayStatus || '',

      // 국민연금
      employment.npsYn ? employment.monthlyWage : '',
      employment.npsYn ? dt : '',
      employment.npsYn ? '1' : '',
      employment.npsYn ? '1' : '',
      '', '', '0',

      // 건강보험
      employment.nhicYn ? 'N' : '',
      employment.nhicYn ? employment.monthlyWage : '',
      employment.nhicYn ? dt : '',
      employment.nhicYn ? '00' : '',
      '', '', '',

      // 고용보험
      employment.gyYn ? employment.monthlyWage : '',
      employment.gyYn ? dt : '',
      employment.gyYn ? employment.jikjongCode : '',
      employment.gyYn ? employment.workHours : '',
      '', '',
      employment.isContract ? '1' : '2',
      employment.isContract ? employment.contractEndDate?.replace(/-/g, '') : '',

      // 산재보험
      employment.sjYn ? employment.monthlyWage : '',
      employment.sjYn ? dt : '',
      '', '', '', '', '', '',

      '', ''  // 오류/경고 메시지
    ];
  });

  // 엑셀 생성
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '취득신고');

  // 다운로드
  const fileName = `취득신고_${business.name}_${targetMonth}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout]), fileName);
};
```

**[캡처 필요 #2]**: 생성된 취득신고 엑셀 파일 - 근로복지공단 양식에 맞게 변환된 모습

---

## 전체 워크플로우

```
1. 급여대장 업로드
       ↓
2. 시트/열 매핑 설정 (최초 1회)
       ↓
3. 미리보기로 데이터 확인
       ↓
4. Import 실행 → DB 저장
       ↓
5. 신고서 생성 페이지에서
       ↓
6. 대상 월/사업장/유형 선택
       ↓
7. 취득/상실 엑셀 다운로드
       ↓
8. 근로복지공단에 업로드
```

**핵심은 2번**: 한 번만 설정하면 다음부터는 1→3→4 순서로 바로 진행돼요.

---

## 매핑 설정 저장

사업장별 매핑 정보를 저장해두면, 다음 달에도 같은 설정을 사용합니다.

```typescript
// Zustand store에서 매핑 관리
interface StoreState {
  excelMappings: ExcelMapping[];

  setExcelMapping: (mapping: ExcelMapping) => void;
  getExcelMapping: (businessId: string) => ExcelMapping | undefined;
}

// 사용 예
const existingMapping = store.getExcelMapping(business.id);
if (existingMapping) {
  // 저장된 매핑 자동 적용
  applyMapping(existingMapping);
} else {
  // 새 사업장: 매핑 설정 UI 표시
  showMappingDialog();
}
```

**[캡처 필요 #3]**: 매핑 미리보기 화면 - 설정된 열에서 데이터가 제대로 추출되는지 확인

---

## 마치며: 유연함의 가치

"사업장 양식을 통일하세요"라고 하면 쉬워요. 하지만 현실에서는 불가능한 경우가 많습니다.

**시스템이 현실에 맞추는 것**이 올바른 접근이었어요.

매핑 시스템 덕분에:
- 기존 양식 유지 가능
- 새 사업장 추가 시 5분이면 설정 완료
- 양식이 바뀌어도 매핑만 수정하면 OK

다음 편에서는 상실신고의 핵심, **당해년도/전년도 보수 자동 계산**을 다룹니다.

---

### 다음 편 예고

**[4편] 상실신고의 핵심: 전년도/당해년도 보수 자동 계산**
- 상실신고에서 보수 데이터가 중요한 이유
- MonthlyWage 엔티티 설계
- 추정치 대신 실제 급여 기반 계산

---

**관련 키워드**: 엑셀 자동화, xlsx 라이브러리, 급여대장 파싱, 4대보험 신고 자동화, 노무사 업무 효율화, TypeScript 엑셀 처리

---

*이 글이 도움이 되셨다면 공유 부탁드립니다. 질문이나 의견은 댓글로 남겨주세요!*
