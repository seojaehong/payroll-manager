# Offline-First 전략: 인터넷 없어도 작동하는 앱

> **TL;DR**: 인터넷이 끊겨도 작동하고, 민감한 데이터가 외부 서버로 나가지 않으며, 서버 비용이 0원인 앱을 만들었습니다. Zustand + localStorage persist 미들웨어로 구현한 오프라인 우선 아키텍처와 백업/복원 기능을 공유합니다.

---

## 들어가며: 왜 오프라인 우선인가?

노무사 사무실의 현실입니다.

- **인터넷이 끊길 때가 있다**: 건물 네트워크 점검, 통신사 장애 등
- **서버 비용을 아끼고 싶다**: 소규모 사무실 예산 한계
- **민감한 데이터가 많다**: 주민등록번호, 급여 정보 등
- **빠르게 동작해야 한다**: 월초 신고 마감 시 속도가 생명

처음에는 당연히 서버를 두려고 했어요. 하지만 생각해보니...

> "로컬에서 완전히 동작하면 이 문제들이 다 해결되잖아?"

---

## 상태 관리 라이브러리 선택

### 후보들

| 라이브러리 | 특징 | 적합도 |
|-----------|------|:------:|
| **Redux** | 강력하지만 보일러플레이트 많음 | △ |
| **Recoil** | Facebook 제작, atom 기반 | ○ |
| **Jotai** | 가벼운 atom 기반 | ○ |
| **Zustand** | 초간단, 보일러플레이트 최소 | ◎ |

### Zustand 선택 이유

```bash
npm install zustand
```

- **설정이 거의 없음**: Redux처럼 action, reducer 분리 필요 없음
- **TypeScript 지원 우수**: 타입 추론이 잘 됨
- **persist 미들웨어**: localStorage 연동이 한 줄로 끝
- **번들 크기 작음**: ~1KB (gzipped)

---

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
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;

  addEmployment: (employment: Employment) => void;
  updateEmployment: (id: string, data: Partial<Employment>) => void;

  // ... 기타 액션
}
```

### 핵심은 persist 미들웨어

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

**`persist` 미들웨어**가 상태 변경을 감지해서 자동으로 localStorage에 저장합니다.

---

## 데이터 흐름

### 사용자가 데이터를 저장할 때

```
사용자 액션 (버튼 클릭)
      ↓
Zustand 액션 호출 (addBusiness 등)
      ↓
상태 업데이트 (set 함수)
      ↓
persist 미들웨어가 감지
      ↓
localStorage에 자동 저장
      ↓
컴포넌트 리렌더링
```

### 새로고침/재방문 시

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

**새로고침해도 데이터가 유지됩니다.** 별도 코드 작성 없이요.

---

## 컴포넌트에서 사용하기

```tsx
// 사업장 목록 페이지
'use client';

import { useStore } from '@/store/useStore';

export default function BusinessesPage() {
  // 필요한 것만 가져오기 (선택적 구독)
  const businesses = useStore((state) => state.businesses);
  const deleteBusiness = useStore((state) => state.deleteBusiness);

  return (
    <div className="space-y-4">
      {businesses.map((business) => (
        <div key={business.id} className="glass p-4 flex justify-between">
          <div>
            <h3 className="text-white font-semibold">{business.name}</h3>
            <p className="text-white/60">{business.bizNo}</p>
          </div>
          <button
            onClick={() => deleteBusiness(business.id)}
            className="btn-secondary text-red-400"
          >
            삭제
          </button>
        </div>
      ))}
    </div>
  );
}
```

**선택적 구독**: `useStore((state) => state.businesses)`처럼 필요한 부분만 가져오면, 해당 데이터가 변경될 때만 리렌더링됩니다.

---

## 초기 데이터 설정

테스트를 위해 기본 사업장 데이터를 넣어두고 싶었어요.

### 초기 데이터 정의

```typescript
// src/lib/initialData.ts
import { Business, ExcelMapping } from '@/types';

export const initialBusinesses: Business[] = [
  {
    id: 'biz-kukuku-bupyeong',
    name: '쿠우쿠우 부평점',
    bizNo: '630-40-91109',
    gwanriNo: '79516010160',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // ... 나머지 14개 사업장
];

export const initialMappings: ExcelMapping[] = [
  {
    businessId: 'biz-kukuku-bupyeong',
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
  },
  // ...
];
```

### 스토어 초기화 시 체크

```typescript
// 스토어 내부
initializeData: () => {
  const state = get();

  // 이미 데이터가 있으면 스킵
  if (state.businesses.length > 0) {
    console.log('기존 데이터 존재, 초기화 스킵');
    return;
  }

  // 초기 데이터 추가
  set({
    businesses: initialBusinesses,
    excelMappings: initialMappings,
  });

  console.log('초기 데이터 로드 완료');
},
```

### 앱 시작 시 호출

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
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

**[캡처 필요 #1]**: 개발자 도구 Application > Local Storage - 저장된 데이터 확인

---

## 백업과 복원 기능

localStorage에만 저장되면 **브라우저 데이터 삭제 시 날아갑니다**. 백업 기능은 필수예요.

### 백업 (JSON 다운로드)

```typescript
const handleExportData = () => {
  const state = useStore.getState();

  const data = {
    businesses: state.businesses,
    workers: state.workers,
    employments: state.employments,
    reports: state.reports,
    excelMappings: state.excelMappings,
    monthlyWages: state.monthlyWages,
    exportedAt: new Date().toISOString(),
    version: '1.0',
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
  URL.revokeObjectURL(url);
};
```

### 복원 (JSON 업로드)

```typescript
const handleImportData = (file: File) => {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);

      // 버전 체크 (선택적)
      if (data.version !== '1.0') {
        alert('호환되지 않는 백업 파일입니다.');
        return;
      }

      // 기존 데이터 덮어쓰기 확인
      if (!confirm('현재 데이터를 백업 데이터로 덮어쓰시겠습니까?')) {
        return;
      }

      // 데이터 복원
      const store = useStore.getState();

      if (data.businesses) {
        store.setBusinesses(data.businesses);
      }
      if (data.workers) {
        store.setWorkers(data.workers);
      }
      if (data.employments) {
        store.setEmployments(data.employments);
      }
      // ... 기타 데이터

      alert('백업 복원 완료!');
    } catch (error) {
      alert('백업 파일을 읽는데 실패했습니다.');
      console.error(error);
    }
  };

  reader.readAsText(file);
};
```

### UI

```tsx
<div className="glass p-6">
  <h3 className="text-lg font-semibold text-white mb-4">데이터 백업</h3>

  <div className="flex gap-4">
    <button onClick={handleExportData} className="btn-primary">
      백업 다운로드
    </button>

    <label className="btn-secondary cursor-pointer">
      백업 복원
      <input
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportData(file);
        }}
      />
    </label>
  </div>

  <p className="text-white/40 text-sm mt-4">
    주기적으로 백업을 권장합니다. 브라우저 데이터 삭제 시 복원이 필요합니다.
  </p>
</div>
```

**[캡처 필요 #2]**: 백업/복원 UI 화면

---

## localStorage 용량 한계

localStorage는 보통 **5~10MB** 제한이 있어요.

### 예상 데이터 크기

```
15개 사업장 × 평균 20명 근로자 = 300명
300명 × 약 500바이트 = 약 150KB
월별 급여 데이터 1년치 = 약 200KB
엑셀 매핑, 신고 이력 등 = 약 50KB
─────────────────────────────
총 예상: 약 400KB
```

**5MB 제한에 충분한 여유**가 있습니다.

### 더 커지면?

만약 사업장이 100개, 근로자가 5,000명이 된다면:
- **IndexedDB** 사용 고려 (용량 제한 거의 없음)
- 또는 **클라우드 동기화** 도입 (다음 편에서 다룸)

---

## 오프라인 우선의 장단점

### 장점

| 항목 | 설명 |
|------|------|
| **빠르다** | 네트워크 지연 없음, 즉각 반응 |
| **안정적** | 인터넷 끊겨도 작동 |
| **비용 없음** | 서버 비용 0원 |
| **프라이버시** | 민감 데이터가 로컬에만 존재 |

### 단점

| 항목 | 해결책 |
|------|--------|
| 기기 간 동기화 안 됨 | Firebase 연동 (다음 편) |
| 브라우저 데이터 삭제 위험 | 백업 기능으로 해결 |
| 용량 제한 | IndexedDB 또는 클라우드 |

---

## 마치며: 오프라인이 기본이다

많은 웹앱이 "인터넷이 있어야 작동"하는 것을 당연하게 생각해요.

하지만 **로컬 우선**으로 설계하면:
- 빠르고
- 안정적이고
- 비용도 절감됩니다

나중에 클라우드 동기화를 추가해도, 로컬 우선 원칙은 유지하는 게 좋아요.

다음 편에서는 **Firebase Firestore**를 연동해 **하이브리드 저장소**를 완성합니다.

---

### 다음 편 예고

**[8편] Firebase로 완성한 하이브리드 워크플로우**
- localStorage + Firestore 조합
- 실시간 동기화 전략
- 클라우드 백업의 안전성
- 최종 아키텍처 정리 및 회고

---

**관련 키워드**: Zustand 상태관리, localStorage persist, 오프라인 우선 아키텍처, PWA, 웹앱 데이터 저장, 백업 복원 기능

---

*이 글이 도움이 되셨다면 공유 부탁드립니다. 질문이나 의견은 댓글로 남겨주세요!*
