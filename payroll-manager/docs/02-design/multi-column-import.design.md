# 다중 컬럼 급여 임포트 기능 설계

## 1. 개요

현재 급여 임포트는 `totalWage(세전급여)` 1개 컬럼만 저장하지만,
4대보험 정산 및 퇴직소득세 계산을 위해 다음 컬럼들을 추가로 임포트한다:

- 세전급여 (임금총액)
- 국민연금
- 건강보험
- 장기요양보험
- 고용보험
- 소득세
- 지방소득세

---

## 2. 데이터 모델 변경

### 2.1 MonthlyWage 확장

```typescript
// 기존
export interface MonthlyWage {
  id: string;
  employmentId: string;
  yearMonth: string;
  totalWage: number;
  workDays?: number;
  createdAt: Date;
}

// 확장
export interface MonthlyWage {
  id: string;
  employmentId: string;
  yearMonth: string;

  // 급여
  totalWage: number;      // 임금총액 (세전)
  netWage?: number;       // 실지급액 (세후)

  // 4대보험
  nps?: number;           // 국민연금 (National Pension Service)
  nhic?: number;          // 건강보험 (National Health Insurance)
  ltc?: number;           // 장기요양보험 (Long-term Care)
  ei?: number;            // 고용보험 (Employment Insurance)

  // 세금
  incomeTax?: number;     // 소득세
  localTax?: number;      // 지방소득세 (주민세)

  workDays?: number;
  createdAt: Date;
}
```

### 2.2 ExcelMapping 확장

```typescript
// 기존
export interface ExcelMapping {
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

// 확장
export interface ExcelMapping {
  businessId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columns: {
    // 필수
    name: number;
    residentNo: number;
    joinDate: number;
    leaveDate: number;
    wage: number;           // 임금총액 (세전)

    // 선택 (4대보험)
    nps?: number;           // 국민연금
    nhic?: number;          // 건강보험
    ltc?: number;           // 장기요양보험
    ei?: number;            // 고용보험

    // 선택 (세금)
    incomeTax?: number;     // 소득세
    localTax?: number;      // 지방소득세

    // 선택 (기타)
    netWage?: number;       // 실지급액
  };
}
```

---

## 3. 샘플 엑셀 컬럼 분석

### 올웨이즈샤브 임금대장(직원) 시트

| 열 인덱스 | 컬럼명 | 매핑 필드 |
|----------|--------|-----------|
| 1 | 이름 | name |
| 3 | 주민등록번호 | residentNo |
| 4 | 입사일 | joinDate |
| 5 | 퇴사일 | leaveDate |
| 20 | 임금총액 | wage |
| 25 | 소득세 | incomeTax |
| 26 | 주민세 | localTax |
| 27 | 국민연금 | nps |
| 28 | 건강보험 | nhic |
| 29 | 장기요양보험 | ltc |
| 30 | 고용보험료 | ei |
| 34 | 실지급액 | netWage |

---

## 4. UI 설계

### 4.1 매핑 설정 화면 변경

현재 필수 컬럼만 매핑하는 방식에서, 선택적 컬럼도 매핑할 수 있도록 확장.

```
┌─────────────────────────────────────────────────────────────┐
│ 컬럼 매핑 설정                                               │
├─────────────────────────────────────────────────────────────┤
│ [필수 컬럼]                                                  │
│   이름:        [1열 ▼]                                      │
│   주민등록번호: [3열 ▼]                                      │
│   입사일:      [4열 ▼]                                      │
│   퇴사일:      [5열 ▼]                                      │
│   임금총액:    [20열 ▼]                                     │
├─────────────────────────────────────────────────────────────┤
│ [선택 컬럼] ☑ 4대보험/세금 정보 임포트                        │
│   국민연금:    [27열 ▼]                                     │
│   건강보험:    [28열 ▼]                                     │
│   장기요양:    [29열 ▼]                                     │
│   고용보험:    [30열 ▼]                                     │
│   소득세:      [25열 ▼]                                     │
│   지방소득세:  [26열 ▼]                                     │
│   실지급액:    [34열 ▼]                                     │
├─────────────────────────────────────────────────────────────┤
│                              [매핑 저장] [임포트 실행]        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 급여이력 탭 표시 변경

4대보험 정보가 있는 경우 표시 확장:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 급여이력 (12개월)                                               [엑셀 ↓]  │
├────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
│    │ 2025-07 │ 2025-08 │ 2025-09 │ 2025-10 │ 2025-11 │ 2025-12 │  합계   │
├────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│세전│ 3,500   │ 3,500   │ 3,600   │ 3,600   │ 3,600   │ 4,020   │ 21,820  │
│국민│   157   │   157   │   162   │   162   │   162   │   180   │    980  │
│건강│   125   │   125   │   128   │   128   │   128   │   142   │    776  │
│장기│    16   │    16   │    17   │    17   │    17   │    18   │    101  │
│고용│    32   │    32   │    32   │    32   │    32   │    36   │    196  │
│소득│   180   │   180   │   185   │   185   │   185   │   198   │  1,113  │
│지방│    18   │    18   │    19   │    19   │    19   │    20   │    113  │
├────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│실수│ 2,972   │ 2,972   │ 3,057   │ 3,057   │ 3,057   │ 3,424   │ 18,539  │
└────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                                                              (단위: 천원)
```

---

## 5. 임포트 워크플로우 통합

### 5.1 현재 문제점

1. `/import` 페이지: 신규 근로자 추가 + 급여 임포트
2. 사업장 > 급여이력 탭: 기존 근로자 급여 업데이트

→ 두 경로가 분리되어 혼란 발생

### 5.2 통합 방안

**하나의 임포트 플로우로 통합:**

1. 사업장 선택 후 엑셀 업로드
2. 시스템이 자동 분석:
   - 기존 근로자: 급여 데이터 업데이트
   - 신규 근로자: 신규 등록 + 급여 데이터 추가
   - 퇴사자: 퇴사 처리 (퇴사일이 있는 경우)
3. 결과 요약 표시:
   ```
   ✓ 급여 업데이트: 15명
   ✓ 신규 등록: 2명
   ✓ 퇴사 처리: 1명
   ✗ 매칭 실패: 0명
   ```

### 5.3 데이터 누적 방식

```
[최신 급여대장 업로드]
        ↓
[주민번호로 근로자 매칭]
        ↓
   ┌────┴────┐
   │         │
[매칭 성공] [매칭 실패]
   │         │
   ↓         ↓
[기존 Employment  [신규 Worker +
 업데이트]         Employment 생성]
   │
   ↓
[MonthlyWage 추가/업데이트]
   │
   ↓
[퇴사일 있으면 status='INACTIVE']
```

---

## 6. AI 자동 컬럼 매핑

### 6.1 문제점

- 사업장마다 엑셀 양식이 다름
- 컬럼 순서, 이름이 제각각
- 수동 매핑은 번거롭고 오류 발생 가능

### 6.2 해결 방안: Gemini API 자동 매핑

엑셀 헤더를 Gemini에게 보내서 자동으로 컬럼 매핑을 추천받는다.

```typescript
// API Route: /api/analyze-columns
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeColumns(headers: string[]): Promise<ColumnMapping> {
  const prompt = `급여대장 엑셀의 헤더 목록입니다:
${headers.map((h, i) => `${i}: ${h || '빈칸'}`).join('\n')}

위 목록에서 다음 필드에 해당하는 열 번호(숫자)를 찾아주세요:
- name: 이름/성명
- residentNo: 주민등록번호
- joinDate: 입사일
- leaveDate: 퇴사일
- wage: 임금총액 (계약임금X, 실제 총지급액)
- nps: 국민연금
- nhic: 건강보험
- ltc: 장기요양보험
- ei: 고용보험
- incomeTax: 소득세
- localTax: 주민세/지방소득세
- netWage: 실지급액

JSON만 출력:`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch[0]);
}
```

### 6.3 UI 플로우

```
┌─────────────────────────────────────────────────────────────┐
│ 급여대장 업로드                                              │
├─────────────────────────────────────────────────────────────┤
│ [파일 선택] 올웨이즈샤브_202512.xlsx                         │
│                                                              │
│ [시트 선택] 임금대장(직원) ▼                                 │
│                                                              │
│ [🤖 AI 자동 매핑] [수동 매핑]                                │
├─────────────────────────────────────────────────────────────┤
│ AI 분석 결과:                                                │
│                                                              │
│   ✓ 이름: 1열 (이름)                                        │
│   ✓ 주민등록번호: 3열 (주민등록번호)                         │
│   ✓ 입사일: 4열 (입사일)                                    │
│   ✓ 퇴사일: 5열 (퇴사일)                                    │
│   ✓ 임금총액: 20열 (임금총액)                               │
│   ✓ 국민연금: 27열 (국민연금)                               │
│   ✓ 건강보험: 28열 (건강보험)                               │
│   ✓ 장기요양: 29열 (장기요양보험)                           │
│   ✓ 고용보험: 30열 (고용보험료)                             │
│   ✓ 소득세: 25열 (소득세)                                   │
│   ✓ 지방소득세: 26열 (주민세)                               │
│   ✓ 실지급액: 34열 (실지급액)                               │
│                                                              │
│ [매핑 수정] [이 매핑 저장] [임포트 실행]                     │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 구현 고려사항

1. **API 키 관리**: 서버 사이드에서 Claude API 호출
2. **비용 최적화**: Haiku 모델 사용 (빠르고 저렴)
3. **캐싱**: 동일 양식은 매핑 저장 후 재사용
4. **폴백**: AI 실패 시 수동 매핑으로 전환

---

## 7. 구현 순서

### Phase 1: 타입 확장
1. `types/index.ts` - MonthlyWage, ExcelMapping 확장
2. Firestore 스키마 호환성 유지 (기존 데이터 마이그레이션 불필요)

### Phase 2: 매핑 UI 확장
1. 선택적 컬럼 매핑 UI 추가
2. 매핑 저장/로드 로직 확장

### Phase 3: 임포트 로직 확장
1. 다중 컬럼 파싱 로직
2. MonthlyWage 저장 시 추가 필드 포함

### Phase 4: 급여이력 UI 확장
1. 4대보험 정보 표시 (접기/펼치기)
2. 월별 상세 보기

---

## 7. 하위 호환성

- 기존 MonthlyWage 데이터는 그대로 유지
- 새 필드들은 모두 optional이므로 기존 데이터와 호환
- 기존 매핑 설정도 그대로 동작 (필수 컬럼만 있어도 OK)

---

*설계 완료: 2026-01-31*
*Co-Authored-By: Claude Opus 4.5*
