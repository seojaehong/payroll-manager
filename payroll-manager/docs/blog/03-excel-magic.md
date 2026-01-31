# [3편] 엑셀의 마법 - xlsx 라이브러리와 컬럼 매핑 시스템

> AI와 노무사가 만드는 4대보험 자동화 시리즈 (3/9)

## xlsx 라이브러리 선택

JavaScript에서 엑셀을 다루는 라이브러리는 여러 개가 있다:

| 라이브러리 | 장점 | 단점 |
|-----------|------|------|
| **xlsx (SheetJS)** | 가장 널리 사용, 읽기/쓰기 모두 지원 | 번들 크기 큼 |
| exceljs | 스타일링 강력 | API 복잡 |
| xlsx-populate | 가벼움 | 기능 제한 |

**xlsx**를 선택했다. 커뮤니티가 크고 문서가 풍부하다.

```bash
npm install xlsx file-saver
npm install -D @types/file-saver
```

## 엑셀 파일 읽기

### 기본 구조

```typescript
import * as XLSX from 'xlsx';

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const data = event.target?.result;
    const workbook = XLSX.read(data, { type: 'binary' });

    // 시트 목록
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

`sheet_to_json(sheet, { header: 1 })`은 2차원 배열을 반환한다:

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

## 컬럼 매핑 시스템

### 문제: 사업장마다 양식이 다르다

```
A사업장: 이름=B열(2), 주민번호=D열(4), 입사일=E열(5)
B사업장: 이름=C열(3), 주민번호=E열(5), 입사일=F열(6)
C사업장: 시트 이름도 "급여대장"이고 헤더 행도 3행
```

### 해결: 매핑 설정 저장

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

### 매핑 UI

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>시트 이름</label>
    <select value={selectedSheet} onChange={...}>
      {sheets.map((s) => <option key={s}>{s}</option>)}
    </select>
  </div>

  <div>
    <label>헤더 행</label>
    <input type="number" value={mapping.headerRow} onChange={...} />
  </div>

  <div>
    <label>데이터 시작 행</label>
    <input type="number" value={mapping.dataStartRow} onChange={...} />
  </div>

  <div>
    <label>이름 열</label>
    <input type="number" value={mapping.nameCol} onChange={...} />
  </div>

  {/* ... 나머지 필드 */}
</div>
```

처음 한 번만 설정하면 사업장별로 저장된다. 다음에 같은 사업장 파일을 올리면 자동으로 매핑 적용.

## 데이터 파싱의 함정들

### 1. 날짜 처리

엑셀에서 날짜는 **숫자**로 저장된다.

```javascript
// 엑셀 내부값: 45678 (1900년 1월 1일부터 일수)
// 우리가 원하는 값: "2025-01-15"

const parseDate = (val: unknown): string => {
  if (!val) return '';

  // 숫자인 경우 (엑셀 날짜 시리얼)
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // 문자열인 경우
  const str = String(val);
  if (str.includes('-')) return str;  // "2025-01-15"
  if (str.length === 8) {             // "20250115"
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }

  return str;
};
```

### 2. 주민등록번호 처리

```javascript
// 문제: 엑셀에서 0으로 시작하는 숫자는 잘림
// 원본: "0501011234567"
// 읽은 값: 501011234567 (앞의 0이 사라짐)

let residentNo = String(row[mapping.residentNoCol - 1] || '')
  .replace(/-/g, '')  // 하이픈 제거
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

## 신고용 엑셀 생성

### 취득신고 엑셀 (38개 컬럼)

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

## 전체 흐름

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

## 다음 편 예고

기능은 완성됐는데... UI가 못생겼다.

- 조너선 아이브의 리퀴드 글라스 디자인이란?
- Tailwind CSS로 다크모드 + 글래스모피즘 구현
- 어두운 배경에서 눈이 편한 UI

---

*다음 편: [4편] 리퀴드 글라스 UI - 애플 감성 다크모드 만들기*
