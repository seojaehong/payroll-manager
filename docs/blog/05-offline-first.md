# [5편] 오프라인 우선 설계 - Zustand와 localStorage의 조합

> AI와 노무사가 만드는 4대보험 자동화 시리즈 (5/9)

## 왜 오프라인 우선인가

노무사 사무실 현실:

- 인터넷이 끊길 때가 있다
- 서버 비용을 아끼고 싶다
- 민감한 데이터(주민번호 등)를 외부 서버에 올리기 꺼림칙하다
- 빠르게 동작해야 한다

**로컬에서 완전히 동작하는 앱**을 만들기로 했다. 나중에 클라우드 동기화는 선택적으로.

## 상태 관리 라이브러리 선택

### 후보들

| 라이브러리 | 특징 |
|-----------|------|
| Redux | 강력하지만 보일러플레이트 많음 |
| Recoil | Facebook 제작, atom 기반 |
| Jotai | 가벼운 atom 기반 |
| **Zustand** | 초간단, 보일러플레이트 최소 |

**Zustand** 선택 이유:
- 설정이 거의 없음
- TypeScript 지원 우수
- `persist` 미들웨어로 localStorage 연동 간단
- 번들 크기 작음 (~1KB)

```bash
npm install zustand
```

## 기본 스토어 구조

```typescript
// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Business, Worker, Employment, Report, ExcelMapping } from '@/types';

interface StoreState {
  // 데이터
  businesses: Business[];
  workers: Worker[];
  employments: Employment[];
  reports: Report[];
  excelMappings: ExcelMapping[];

  // 액션
  addBusiness: (business: Business) => void;
  updateBusiness: (id: string, data: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;

  addWorker: (worker: Worker) => void;
  // ... 나머지 액션들
}
```

## persist 미들웨어

핵심은 `persist` 미들웨어다. 상태가 변경될 때마다 자동으로 localStorage에 저장한다.

```typescript
export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      businesses: [],
      workers: [],
      employments: [],
      reports: [],
      excelMappings: [],

      // 사업장 액션
      addBusiness: (business) =>
        set((state) => ({
          businesses: [...state.businesses, business],
        })),

      updateBusiness: (id, data) =>
        set((state) => ({
          businesses: state.businesses.map((b) =>
            b.id === id ? { ...b, ...data, updatedAt: new Date() } : b
          ),
        })),

      deleteBusiness: (id) =>
        set((state) => ({
          businesses: state.businesses.filter((b) => b.id !== id),
        })),

      // 근로자 액션
      addWorker: (worker) =>
        set((state) => ({
          workers: [...state.workers, worker],
        })),

      // ... 나머지 액션들
    }),
    {
      name: 'payroll-manager-storage',  // localStorage 키 이름
    }
  )
);
```

## 데이터 흐름

```
사용자 액션 (버튼 클릭)
      ↓
Zustand 액션 호출
      ↓
상태 업데이트 (set)
      ↓
persist 미들웨어가 감지
      ↓
localStorage에 자동 저장
      ↓
컴포넌트 리렌더링
```

새로고침하면?

```
페이지 로드
      ↓
Zustand 초기화
      ↓
persist가 localStorage 확인
      ↓
저장된 데이터 복원
      ↓
이전 상태 그대로!
```

## 컴포넌트에서 사용하기

```tsx
// 사업장 목록 페이지
'use client';

import { useStore } from '@/store/useStore';

export default function BusinessesPage() {
  // 필요한 것만 가져오기
  const { businesses, deleteBusiness } = useStore();

  return (
    <div>
      {businesses.map((business) => (
        <div key={business.id}>
          <h3>{business.name}</h3>
          <button onClick={() => deleteBusiness(business.id)}>
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 초기 데이터 설정

테스트를 위해 기본 사업장 데이터를 넣어두고 싶었다.

```typescript
// src/lib/initialData.ts
import { Business, ExcelMapping } from '@/types';

export const initialBusiness: Business = {
  id: 'biz-sample-001',
  name: 'OO식당 XX점',  // 실제로는 테스트용 사업장명
  bizNo: '000-00-00000',
  gwanriNo: 'XXXXXXXXXXX',
  npsGwanriNo: 'XXXXXXXXXXX',
  nhicGwanriNo: 'XXXXXXXX',
  defaultJikjong: '532',
  defaultWorkHours: 40,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const initialMapping: ExcelMapping = {
  businessId: 'biz-sample-001',
  sheetName: '임금대장',
  headerRow: 4,
  dataStartRow: 6,
  columns: {
    name: 2,
    residentNo: 4,
    joinDate: 5,
    leaveDate: 6,
    wage: 7,
  },
};
```

스토어 초기화 시 체크:

```typescript
// 스토어 내부
initializeData: () => {
  const state = get();

  // 이미 데이터가 있으면 스킵
  if (state.businesses.length > 0) return;

  // 초기 데이터 추가
  set({
    businesses: [initialBusiness],
    excelMappings: [initialMapping],
  });
},
```

앱 시작 시 호출:

```tsx
// src/app/layout.tsx
'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export default function RootLayout({ children }) {
  const initializeData = useStore((state) => state.initializeData);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## 백업과 복원

localStorage에만 저장되면 브라우저 데이터 삭제 시 날아간다. 백업 기능 필수.

```typescript
// 백업 (JSON 다운로드)
const handleExportData = () => {
  const store = useStore.getState();

  const data = {
    businesses: store.businesses,
    workers: store.workers,
    employments: store.employments,
    reports: store.reports,
    excelMappings: store.excelMappings,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
};
```

```typescript
// 복원 (JSON 업로드)
const handleImportData = (file: File) => {
  const reader = new FileReader();

  reader.onload = (event) => {
    const data = JSON.parse(event.target?.result as string);

    // 데이터 복원
    data.businesses?.forEach((b) => store.addBusiness(b));
    data.workers?.forEach((w) => store.addWorker(w));
    data.employments?.forEach((e) => store.addEmployment(e));
    // ...

    alert('백업 복원 완료!');
  };

  reader.readAsText(file);
};
```

## localStorage 용량 한계

localStorage는 보통 **5~10MB** 제한이 있다.

30개 사업장 × 평균 50명 근로자 = 1,500명
1,500명 × 약 500바이트 = 약 750KB

충분하다. 하지만 더 커지면:
- IndexedDB 사용 고려
- 또는 클라우드 동기화 도입

## 정리: 오프라인 우선의 장점

1. **빠르다**: 네트워크 지연 없음
2. **안정적**: 인터넷 끊겨도 작동
3. **비용 없음**: 서버 비용 0원
4. **프라이버시**: 민감 데이터가 로컬에만 존재

단점:
- 기기 간 동기화 안 됨 (나중에 해결 예정)
- 브라우저 데이터 삭제 시 위험 (백업으로 해결)

## 다음 편 예고

MVP 완성! 이제 실제 데이터로 테스트할 차례다.

- 진짜 급여대장으로 Import 테스트
- 신고 엑셀 생성하고 근로복지공단에 업로드
- 발견한 버그들과 수정 과정

---

*다음 편: [6편] 실전 테스트 - 실제 급여대장으로 검증하기*
