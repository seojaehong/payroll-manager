# 4대보험 신고용 코드 테이블 구현기

## 왜 코드 테이블이 필요한가?

4대보험 신고서를 작성할 때 **직종코드**와 **퇴사사유코드**가 필수다.

```
취득신고서: 직종코드 532 (식당서비스원)
상실신고서: 상실사유 11 (개인사정 자진퇴사)
```

문제는 이 코드들이 **90개 이상**이고, 매번 찾아보기 귀찮다는 것.

## 구현 목표

1. **검색 가능한 드롭다운** - 코드나 이름으로 검색
2. **자주 쓰는 코드 상단 노출** - 532, 531, 941 등
3. **퇴사사유는 설명 포함** - "11: 개인사정 자진퇴사 (가사, 학업, 건강 등)"

## 코드 데이터 구조

```typescript
// src/lib/codes.ts

export interface JikjongCode {
  code: string;
  name: string;
}

export interface LeaveReasonCode {
  code: string;
  name: string;
  description?: string;  // 상세 설명
}
```

### 직종코드 (한국표준직업분류 기반)

```typescript
export const JIKJONG_CODES: JikjongCode[] = [
  // 서비스 종사자
  { code: '531', name: '주방장 및 조리사' },
  { code: '532', name: '식당서비스원' },
  { code: '533', name: '주점 및 음료서비스원' },

  // 사무 종사자
  { code: '311', name: '경영 관련 사무원' },
  { code: '313', name: '회계 및 경리 사무원' },

  // 단순노무 종사자
  { code: '941', name: '청소원 및 환경미화원' },
  { code: '942', name: '경비원 및 검표원' },
  // ... 90개 이상
];
```

### 퇴사사유코드 (고용보험법 시행규칙)

```typescript
export const LEAVE_REASON_CODES: LeaveReasonCode[] = [
  // 자진퇴사
  { code: '11', name: '개인사정으로 인한 자진퇴사',
    description: '가사 사정, 학업, 건강 등 개인적 사유' },
  { code: '12', name: '사업장 이전, 근로조건 변동 등으로 자진퇴사',
    description: '전근 거부, 임금체불, 근로조건 저하 등' },

  // 회사사정
  { code: '22', name: '계약기간만료, 공사종료',
    description: '기간제 근로계약 종료, 건설공사 완료 등' },
  { code: '23', name: '경영상 필요 및 회사 불황으로 인한 권고사직, 해고',
    description: '권고사직, 희망퇴직, 정리해고' },
  { code: '26', name: '피보험자의 귀책사유에 의한 징계해고',
    description: '중징계, 해고 (실업급여 제한)' },

  // 기타
  { code: '31', name: '정년' },
  { code: '33', name: '자진퇴사 이외의 기타 (폐업 등)' },
];
```

## 검색 가능한 드롭다운 컴포넌트

```tsx
// src/components/ui/CodeSelect.tsx

export function CodeSelect({ type, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // 검색 필터링
  const filteredCodes = useMemo(() => {
    if (!search) return codes;
    const lower = search.toLowerCase();
    return codes.filter(
      (c) => c.code.includes(search) || c.name.toLowerCase().includes(lower)
    );
  }, [codes, search]);

  return (
    <div className="relative">
      {/* 선택된 값 표시 */}
      <button onClick={() => setIsOpen(!isOpen)}>
        {selectedCode ? (
          <span>
            <span className="font-mono">{selectedCode.code}</span>
            {selectedCode.name}
          </span>
        ) : (
          <span className="text-gray-400">선택하세요</span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
          {/* 검색창 */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="코드 또는 이름 검색..."
          />

          {/* 옵션 목록 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCodes.map((code) => (
              <button key={code.code} onClick={() => handleSelect(code.code)}>
                <span className="font-mono">{code.code}</span>
                {code.name}
                {/* 퇴사사유는 설명도 표시 */}
                {code.description && (
                  <span className="text-xs text-gray-400">{code.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 자주 쓰는 코드 상단 노출

```typescript
// 자주 사용하는 직종코드
export const COMMON_JIKJONG_CODES = [
  '313', // 회계 및 경리 사무원
  '532', // 식당서비스원
  '531', // 주방장 및 조리사
  '941', // 청소원
  '942', // 경비원
];

// 정렬 함수: 자주 쓰는 것 먼저
export function getSortedJikjongCodes(): JikjongCode[] {
  const commonSet = new Set(COMMON_JIKJONG_CODES);
  const common = COMMON_JIKJONG_CODES
    .map((code) => JIKJONG_CODES.find((j) => j.code === code))
    .filter(Boolean);
  const others = JIKJONG_CODES.filter((j) => !commonSet.has(j.code));
  return [...common, ...others];
}
```

## 퇴사처리 모달

기존에는 `prompt()`로 퇴사일만 입력받았다:

```javascript
// Before - 단순 prompt
const leaveDate = prompt('퇴사일 입력:');
updateEmployment(id, { leaveDate, leaveReason: '11' }); // 사유 하드코딩
```

이제 모달로 날짜와 사유를 함께 선택:

```tsx
// After - 모달 컴포넌트
<RetireModal
  workerName="홍길동"
  isOpen={true}
  onClose={() => setIsOpen(false)}
  onConfirm={(leaveDate, leaveReason) => {
    updateEmployment(id, { leaveDate, leaveReason });
  }}
/>
```

## 결과

| Before | After |
|--------|-------|
| 직종코드 4개 하드코딩 | 90개+ 검색 가능 |
| 퇴사사유 "11" 고정 | 10개 사유 선택 |
| prompt() 퇴사일만 | 모달로 날짜+사유 |

## 교훈

1. **코드 테이블은 별도 파일로 관리** - 나중에 수정/추가 용이
2. **검색 기능 필수** - 90개 중에서 찾기 힘듦
3. **자주 쓰는 것 상단에** - 대부분 식당서비스원(532)

---

*급여관리 시스템 개발 중 - Claude Code와 함께*
