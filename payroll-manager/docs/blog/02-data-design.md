# [2편] 근로복지공단 API 까보기 - 데이터 설계의 시작

> AI와 노무사가 만드는 4대보험 자동화 시리즈 (2/9)

## 역설계의 시작

만들려는 시스템의 최종 목적지는 **근로복지공단 취득/상실 신고**다. 그렇다면 근로복지공단이 원하는 데이터 형식을 먼저 파악해야 한다.

브라우저 개발자 도구(F12)를 열고 실제 신고를 해봤다. Network 탭에서 API 요청을 캡처했다.

## 취득신고 API 분석

```
POST /api/v1/total/gaip/wp/saveGeunrojaGySingo
```

### Request Payload (일부)

```json
{
  "jobSeCode": "I",
  "aplcnYmd": "20250130",
  "selAplcnWonbGwanriNo": "XXXXXXXXXXX",
  "inpAplcnDtl": [
    {
      "ihidnum": "XXXXXXXXXXXXX",
      "nm": "홍길동",
      "hnglNm": "Hong Gil Dong",
      "rprsntYn": "N",
      "ntltyCode": "100",
      "soukWlfrm": "2060740",
      "soukJgtkYmd": "20250115",
      "soukJgtkMnth": "1",
      "soukJgtkBuho": "1",
      "gyWlfrm": "2060740",
      "gyJgtkYmd": "20250115",
      "gyJikjong": "532",
      "gyGnmuwkTm": "40",
      ...
    }
  ]
}
```

38개 이상의 필드. 이 중 필수(`*`) 필드만 추려보면:

| 필드 | 설명 | 예시 |
|------|------|------|
| ihidnum | 주민등록번호 | 9501011234567 |
| nm | 성명 | 홍길동 |
| rprsntYn | 대표자여부 | N |
| soukWlfrm | 국민연금 소득월액 | 2060740 |
| soukJgtkYmd | 국민연금 취득일 | 20250115 |
| gyWlfrm | 고용보험 월평균보수 | 2060740 |
| gyJgtkYmd | 고용보험 취득일 | 20250115 |
| gyJikjong | 직종코드 | 532 |
| gyGnmuwkTm | 주소정근로시간 | 40 |

## 급여대장 분석

실제 사업장의 급여대장을 열어봤다. (정보는 가림)

```
[임금대장] 시트

행1: (빈 행)
행2: (빈 행)
행3: (빈 행)
행4: | 순번 | 이름 | 부서 | 주민등록번호 | 입사일 | 퇴사일 | 계약임금 | ...
행5: (빈 행)
행6: | 1 | 김** | 홀 | 950101-1****** | 2024-03-15 | | 2,200,000 | ...
행7: | 2 | 이** | 주방 | 880515-2****** | 2025-01-10 | | 2,060,740 | ...
...
```

핵심 정보 위치:
- 시트명: `임금대장`
- 헤더 행: 4행
- 데이터 시작: 6행
- 이름: B열 (2번째)
- 주민등록번호: D열 (4번째)
- 입사일: E열 (5번째)
- 퇴사일: F열 (6번째)
- 보수: G열 (7번째)

**문제는 이게 사업장마다 다 다르다는 것.**

## 데이터 모델 설계

세 가지 핵심 엔티티가 필요하다:

### 1. 사업장 (Business)

```typescript
interface Business {
  id: string;
  name: string;           // "OO식당 XX점"
  bizNo: string;          // 사업자등록번호 "123-45-67890"

  // 4대보험 관리번호
  gwanriNo?: string;      // 고용산재 통합 관리번호
  npsGwanriNo?: string;   // 국민연금 관리번호
  nhicGwanriNo?: string;  // 건강보험 관리번호

  // 기본값 (신규 근로자 등록 시 사용)
  defaultJikjong?: string;    // 기본 직종코드 "532"
  defaultWorkHours?: number;  // 기본 근로시간 40
}
```

### 2. 근로자 (Worker)

```typescript
interface Worker {
  id: string;
  name: string;           // 성명
  residentNo: string;     // 주민등록번호 (13자리)
  nationality?: string;   // 국적코드 "100"=한국
  phone?: string;         // 연락처
}
```

### 3. 고용관계 (Employment)

한 근로자가 여러 사업장에서 일할 수 있고, 입퇴사를 반복할 수 있다.

```typescript
interface Employment {
  id: string;
  workerId: string;       // 근로자 FK
  businessId: string;     // 사업장 FK

  status: 'ACTIVE' | 'INACTIVE';
  joinDate: string;       // 입사일 "2025-01-15"
  leaveDate?: string;     // 퇴사일
  leaveReason?: string;   // 상실사유코드

  monthlyWage: number;    // 월평균보수
  jikjongCode: string;    // 직종코드
  workHours: number;      // 주소정근로시간

  // 4대보험 가입여부
  gyYn: boolean;          // 고용보험
  sjYn: boolean;          // 산재보험
  npsYn: boolean;         // 국민연금
  nhicYn: boolean;        // 건강보험

  isContract?: boolean;   // 계약직 여부
  contractEndDate?: string;
}
```

### 4. 엑셀 매핑 (ExcelMapping)

사업장별로 급여대장 양식이 다르므로, 매핑 정보를 저장한다.

```typescript
interface ExcelMapping {
  businessId: string;
  sheetName: string;      // "임금대장"
  headerRow: number;      // 4
  dataStartRow: number;   // 6
  columns: {
    name: number;         // 이름 열 번호 (2)
    residentNo: number;   // 주민번호 열 번호 (4)
    joinDate: number;     // 입사일 열 번호 (5)
    leaveDate: number;    // 퇴사일 열 번호 (6)
    wage: number;         // 보수 열 번호 (7)
  };
}
```

## ER 다이어그램

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Business   │       │ Employment  │       │   Worker    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ businessId  │       │ id (PK)     │
│ name        │       │ workerId    │──────►│ name        │
│ bizNo       │       │ status      │       │ residentNo  │
│ gwanriNo    │       │ joinDate    │       │ nationality │
│ ...         │       │ leaveDate   │       │ phone       │
└─────────────┘       │ monthlyWage │       └─────────────┘
                      │ 4대보험 Y/N │
      ┌───────────────│ ...         │
      │               └─────────────┘
      │
      ▼
┌─────────────┐
│ ExcelMapping│
├─────────────┤
│ businessId  │
│ sheetName   │
│ headerRow   │
│ columns     │
└─────────────┘
```

## 왜 이렇게 설계했나

### 근로자와 고용관계를 분리한 이유

```
김철수 ──┬── A식당 (2023.01 ~ 2023.12) 퇴사
         └── B식당 (2024.01 ~ 현재) 재직중
```

같은 사람이 여러 곳에서 일하거나, 퇴사 후 재입사하는 경우가 흔하다.

### 엑셀 매핑을 별도로 둔 이유

처음 Import할 때 한 번만 설정하면, 다음부터는 자동으로 인식한다. 30개 사업장 × 매달 반복 = 설정 한 번이 수백 번의 수작업을 줄인다.

## 다음 편 예고

설계는 끝났다. 이제 구현이다.

- xlsx 라이브러리로 엑셀 파일 읽기
- 사업장별 매핑 설정 UI
- 데이터 파싱의 함정들 (날짜, 주민번호, 숫자)

---

*다음 편: [3편] 엑셀의 마법 - xlsx 라이브러리와 컬럼 매핑 시스템*
