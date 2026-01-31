# 실시간 동기화: 하이브리드 저장소

> localStorage + Firestore = 오프라인 우선 + 클라우드 백업

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                    앱 (React)                    │
├─────────────────────────────────────────────────┤
│                 Zustand Store                    │
│  ┌──────────────┐    ┌──────────────┐           │
│  │ localStorage │ ←→ │  Firestore   │           │
│  │   (빠른)     │    │  (영구)      │           │
│  └──────────────┘    └──────────────┘           │
└─────────────────────────────────────────────────┘
```

## 동기화 전략

### 1. 로컬 우선 (Optimistic Update)

```typescript
addBusiness: (business) => {
  // 1. 즉시 로컬에 저장 (UI 반응성)
  set((state) => ({ businesses: [...state.businesses, business] }));

  // 2. 비동기로 Firebase에 저장
  firestore.saveBusiness(business).catch(console.error);
},
```

### 2. 클라우드에서 불러오기

```typescript
loadFromCloud: async () => {
  set({ syncing: true, syncError: null });

  try {
    const data = await firestore.syncAllData();

    if (data.businesses.length > 0) {
      // 클라우드 데이터로 로컬 덮어쓰기
      set({
        businesses: data.businesses,
        workers: data.workers,
        // ...
        syncing: false,
        lastSyncAt: new Date(),
      });
    } else {
      // 클라우드가 비어있으면 로컬 → 클라우드 업로드
      await get().syncToCloud();
    }
  } catch (error) {
    set({ syncing: false, syncError: String(error) });
  }
},
```

### 3. 클라우드에 저장하기

```typescript
syncToCloud: async () => {
  const state = get();
  set({ syncing: true });

  const savePromises = [];

  // 모든 데이터를 Firebase에 저장
  state.businesses.forEach(biz => {
    savePromises.push(firestore.saveBusiness(biz));
  });

  if (state.workers.length > 0) {
    savePromises.push(firestore.saveWorkers(state.workers));
  }

  // ...

  await Promise.all(savePromises);
  set({ syncing: false, lastSyncAt: new Date() });
},
```

## UI 피드백

```tsx
<div className="sync-status">
  {/* 상태 표시등 */}
  <div className={`indicator ${
    syncing ? 'yellow animate-pulse' :
    syncError ? 'red' : 'green'
  }`} />

  {/* 상태 텍스트 */}
  <span>
    {syncing ? '동기화 중...' :
     syncError ? `오류: ${syncError}` :
     lastSyncAt ? `마지막: ${lastSyncAt.toLocaleString()}` :
     '동기화 필요'}
  </span>
</div>

{/* 수동 동기화 버튼 */}
<button onClick={loadFromCloud} disabled={syncing}>
  클라우드에서 불러오기
</button>
<button onClick={syncToCloud} disabled={syncing}>
  클라우드에 저장하기
</button>
```

## Date 변환 이슈 해결

localStorage는 Date를 문자열로 저장:

```typescript
// Firestore 저장 시 문자열도 처리
const toTimestamp = (date: Date | string) => {
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
};
```

## 결과

- **즉각 반응**: 로컬 저장으로 UI 지연 없음
- **데이터 안전**: 백그라운드로 클라우드 동기화
- **오프라인 지원**: 인터넷 없어도 작업 가능
- **복구 가능**: 클라우드에서 언제든 복원

---

*"빠른 것은 로컬에서, 안전한 것은 클라우드에서"*
