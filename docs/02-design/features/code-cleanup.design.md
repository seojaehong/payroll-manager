# Design: Code Cleanup Refactoring

> PDCA Phase: Design
> Created: 2026-02-04
> Feature: code-cleanup
> Plan Reference: docs/01-plan/features/code-cleanup.plan.md

## 1. Architecture Overview

### Current State (Before)
```
/wages/page.tsx (871 lines) ──────┐
                                  ├── 중복 코드
WagesTab.tsx (761 lines) ─────────┘

/reports/page.tsx (442 lines) ────┐
                                  ├── 중복 코드
ReportsTab.tsx (471 lines) ───────┘

PayslipTab.tsx ── localStorage.getItem('sendHistory')
```

### Target State (After)
```
/wages/page.tsx (50 lines) → Redirect to /businesses/[id] (WagesTab)
/reports/page.tsx (50 lines) → Redirect to /businesses/[id] (ReportsTab)

useStore.ts ── sendHistory: SendHistory[]
PayslipTab.tsx ── useStore((s) => s.sendHistory)
```

## 2. Component Design

### 2.1 /wages/page.tsx (Refactored)

패턴: ImportTab.tsx 참조

```typescript
// Target: ~50 lines
'use client';

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WagesRedirectPage() {
  const router = useRouter();
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  useEffect(() => {
    if (selectedBusinessId) {
      router.replace(`/businesses/${selectedBusinessId}?tab=wages`);
    }
  }, [selectedBusinessId, router]);

  if (!selectedBusinessId) {
    return (
      <div className="text-center py-20">
        <p className="text-white/60 text-lg mb-4">사업장을 먼저 선택해주세요</p>
        <button
          onClick={() => router.push('/businesses')}
          className="btn-primary"
        >
          사업장 목록으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <p className="text-white/60">급여 관리 페이지로 이동 중...</p>
    </div>
  );
}
```

### 2.2 /reports/page.tsx (Refactored)

동일 패턴 적용 (`?tab=reports`)

### 2.3 /businesses/[id]/page.tsx 수정

URL query param으로 기본 탭 지정 지원:

```typescript
// 추가할 로직
const searchParams = useSearchParams();
const defaultTab = searchParams.get('tab');

// tabs 초기값 설정
const [activeTab, setActiveTab] = useState(
  defaultTab && ['workers', 'wages', 'payslip', 'retirement', 'reports', 'import'].includes(defaultTab)
    ? defaultTab
    : 'workers'
);
```

## 3. Store Design

### 3.1 SendHistory State 추가

```typescript
// types/index.ts - 이미 존재함
export interface SendHistory {
  id: string;
  businessId: string;
  workerId: string;
  employmentId: string;
  yearMonth: string;
  channel: SendChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  errorMessage?: string;
  tokenId?: string;
  sentAt: Date;
  deliveredAt?: Date;
}

// store/useStore.ts 추가
interface AppState {
  // ... existing

  // 발송 이력
  sendHistories: SendHistory[];
  addSendHistory: (history: SendHistory) => void;
  getSendHistoriesByBusiness: (businessId: string) => SendHistory[];
}
```

### 3.2 Firebase 동기화

```typescript
// lib/firestore.ts 추가
export async function saveSendHistory(history: SendHistory): Promise<void>;
export async function getSendHistoriesByBusiness(businessId: string): Promise<SendHistory[]>;
```

## 4. alert() → toast.show() Mapping

### 변환 규칙

| alert 유형 | toast 타입 | 예시 |
|-----------|-----------|------|
| 성공 메시지 | 'success' | toast.show('저장 완료', 'success') |
| 에러 메시지 | 'error' | toast.show('저장 실패', 'error') |
| 정보 메시지 | 'info' | toast.show('데이터 없음', 'info') |
| confirm 대화 | 유지 | confirm()은 그대로 사용 |

### 파일별 변환 목록

| 파일 | alert 수 | 변환 대상 |
|------|---------|----------|
| WagesTab.tsx | 3 | 모두 |
| PayslipTab.tsx | 2 | 모두 |
| ReportsTab.tsx | 2 | 모두 |
| RetirementTab.tsx | 1 | 모두 |
| RetireModal.tsx | 1 | 모두 |
| payslip-pdf.ts | 1 | 모두 (return 필요) |
| retirement-pdf.ts | 1 | 모두 (return 필요) |

## 5. Migration Strategy

### 5.1 SendHistory 마이그레이션

기존 localStorage 데이터 호환:
```typescript
// PayslipTab.tsx 초기화 시
useEffect(() => {
  // 기존 localStorage 데이터 마이그레이션
  const legacyData = localStorage.getItem('sendHistory');
  if (legacyData) {
    const histories = JSON.parse(legacyData) as SendHistory[];
    histories.forEach(h => addSendHistory(h));
    localStorage.removeItem('sendHistory'); // 마이그레이션 후 제거
  }
}, []);
```

## 6. Testing Checklist

### Phase 1: 코드 중복 제거
- [ ] /wages → /businesses/[id]?tab=wages 리다이렉트 동작
- [ ] /reports → /businesses/[id]?tab=reports 리다이렉트 동작
- [ ] 사업장 미선택 시 안내 메시지 표시
- [ ] URL param으로 탭 직접 접근 가능

### Phase 2: alert 전환
- [ ] 모든 성공/에러 피드백이 toast로 표시
- [ ] toast 메시지가 3초 후 자동 닫힘
- [ ] confirm()은 정상 동작 유지

### Phase 3: Store 통합
- [ ] 발송 이력이 store에 저장됨
- [ ] 새로고침 후에도 발송 이력 유지
- [ ] Firebase 동기화 동작

## 7. File Changes Summary

| 작업 | 파일 | 변경 유형 |
|------|------|----------|
| Refactor | /wages/page.tsx | 871줄 → 50줄 |
| Refactor | /reports/page.tsx | 442줄 → 50줄 |
| Modify | /businesses/[id]/page.tsx | +10줄 (URL param) |
| Modify | store/useStore.ts | +30줄 (SendHistory) |
| Modify | PayslipTab.tsx | alert→toast, store 사용 |
| Modify | WagesTab.tsx | alert→toast |
| Modify | ReportsTab.tsx | alert→toast |
| Modify | RetirementTab.tsx | alert→toast |
| Modify | RetireModal.tsx | alert→toast |
| Modify | payslip-pdf.ts | alert→toast |
| Modify | retirement-pdf.ts | alert→toast |

---
*Design approved by: Pending*
