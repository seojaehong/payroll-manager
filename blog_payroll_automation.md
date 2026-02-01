# 급여 관리 시스템 자동화 구축기

> Next.js + Firebase로 노무사 업무 자동화 시스템을 만들면서 배운 것들

## 왜 만들었나

노무사 사무실에서 매달 반복되는 작업들:
- 엑셀에서 급여 데이터 복사 → 시스템에 입력
- 취득/상실 신고서 수작업 작성
- 급여명세서 개별 발송

**"이거 자동화하면 엄청 편하겠다"** 에서 시작했다.

---

## 구현한 핵심 기능

### 1. 엑셀 급여 일괄 임포트

사업장마다 급여 엑셀 양식이 다르다. A사는 헤더가 4행, B사는 6행. 컬럼 위치도 제각각.

```typescript
// 사업장별 매핑 저장
const mapping = {
  businessId: 'biz001',
  sheetName: '임금대장',
  headerRow: 4,
  dataStartRow: 6,
  columns: {
    name: 2,        // B열
    residentNo: 3,  // C열
    totalWage: 15,  // O열
    // ...
  }
};
```

**핵심 로직:**
- 첫 번째 임포트 시 컬럼 매핑 설정
- 매핑 저장 → 다음부터 자동 적용
- 주민번호로 근로자 자동 매칭

### 2. 다중 파일 일괄 업로드

12개월치 급여를 한 번에 올리고 싶었다.

```typescript
// 파일명에서 년월 자동 추출
const match = file.name.match(/(\d{4})[-_]?(\d{2})/);
// "202501_급여.xlsx" → "2025-01"
// "급여대장_2025_02.xlsx" → "2025-02"
```

**사용법:**
1. Ctrl + 클릭으로 여러 파일 선택
2. 첫 번째 파일로 매핑 확인
3. "일괄 임포트" 클릭 → 12개월 한 번에 처리

### 3. 취득/상실 신고 자동화

**취득신고:**
- 해당 월 입사자 자동 필터링
- 4대보험 가입 여부에 따라 각 기관 양식 자동 생성
- 국민연금, 건강보험, 고용보험, 산재보험 한 번에 출력

**상실신고:**
- 퇴사자 자동 필터링
- **급여 데이터 누락 체크** (이게 핵심)
- 누락 시 자동 채우기 옵션 제공

```typescript
// 상실신고 전 급여 데이터 검증
const missing = getMissingWageData(employmentId, leaveDate, joinDate);
if (missing.length > 0) {
  // 자동 채우기 모달 표시
  // 옵션: 평균보수로 채우기 / 0원으로 채우기
}
```

---

## 삽질 포인트

### 1. 엑셀 헤더 2행 병합

실무 엑셀은 헤더가 2행에 걸쳐 있는 경우가 많다.

```
| 지급내역       |          |          |
| 기본급 | 연장 | 야간 | 휴일 |
```

처음엔 1행만 읽어서 "기본급, 연장, 야간..."만 나왔다.

**해결:**
```typescript
const h1 = jsonData[hRow - 2]?.[c];  // 상위 행
const h2 = jsonData[hRow - 1]?.[c];  // 하위 행
const name = [h1, h2].filter(Boolean).join(' ');
// → "지급내역 기본급", "지급내역 연장"...
```

### 2. 인덱스 혼란 (0 vs 1)

- 엑셀 컬럼: A=1, B=2, C=3... (1-indexed)
- 자바스크립트 배열: [0], [1], [2]... (0-indexed)

저장할 땐 +1, 불러올 땐 -1 해야 하는데 이게 섞이면 지옥.

**해결:** 공통 훅에서 일관되게 처리
```typescript
// 저장 시
columns[key] = value + 1;

// 로드 시
mapping[key] = value - 1;
```

### 3. 비동기 상태 함정

```typescript
setHeaderRow(4);
extractHeaders(workbook, sheet, headerRow);  // 아직 이전 값!
```

setState 후 바로 사용하면 이전 값이 들어간다.

**해결:** 값을 직접 전달
```typescript
const newRow = 4;
setHeaderRow(newRow);
extractHeaders(workbook, sheet, newRow);  // 새 값 사용
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16, TypeScript, Tailwind CSS |
| 상태관리 | Zustand |
| 데이터베이스 | Firebase Firestore |
| 엑셀 처리 | SheetJS (xlsx) |
| 파일 다운로드 | file-saver |

---

## 코드 구조

```
src/
├── hooks/
│   └── useExcelImport.ts    # 공통 엑셀 임포트 훅
├── app/
│   └── businesses/[id]/
│       └── components/
│           ├── WagesTab.tsx      # 급여 임포트
│           └── ReportsTab.tsx    # 취득/상실 신고
└── types/
    └── index.ts              # 타입 정의
```

---

## 결과

| Before | After |
|--------|-------|
| 급여 입력 30분/사업장 | 5분 (일괄 업로드) |
| 신고서 작성 15분/건 | 1분 (자동 생성) |
| 급여 누락 수작업 확인 | 자동 체크 + 채우기 |

**총 시간 절약: 월 4시간 이상** (사업장 10개 기준)

---

## 다음 할 일

- [ ] 급여명세서 PDF 생성
- [ ] 이메일/카카오톡 자동 발송
- [ ] 퇴직금 계산 고도화

---

*이 글은 Claude Code와 함께 작성되었습니다.*
