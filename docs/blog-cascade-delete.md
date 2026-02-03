# 데이터 정합성을 지키는 Cascade 삭제 패턴 구현기

## 문제 상황

급여 관리 시스템에서 **사업장 → 고용관계 → 급여** 구조로 데이터가 연결되어 있었다.

```
Business (사업장)
    └── Employment (고용관계)
            └── MonthlyWage (월급여)
```

그런데 사업장이나 근로자를 삭제하면 **고아 데이터**가 남는 문제가 발생했다.

```javascript
// 기존 코드 - 단순 삭제
deleteBusiness: (id) => {
  set((state) => ({
    businesses: state.businesses.filter((b) => b.id !== id),
  }));
  firestore.deleteBusiness(id);
}
// 문제: Employment, MonthlyWage는 그대로 남음!
```

## 해결: Cascade 삭제 구현

### 1. Firestore 삭제 함수 추가

```typescript
// firestore.ts
export async function deleteMonthlyWagesByEmployments(employmentIds: string[]): Promise<number> {
  if (employmentIds.length === 0) return 0;

  let totalDeleted = 0;
  // Firestore 'in' 쿼리는 최대 30개까지만 지원
  const idChunks = chunkArray(employmentIds, 30);

  for (const idChunk of idChunks) {
    const q = query(
      collection(db, COLLECTIONS.monthlyWages),
      where('employmentId', 'in', idChunk)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docChunks = chunkArray(snapshot.docs, BATCH_LIMIT);
      for (const docChunk of docChunks) {
        const batch = writeBatch(db);
        docChunk.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
      totalDeleted += snapshot.size;
    }
  }
  return totalDeleted;
}
```

**핵심 포인트:**
- Firestore `in` 쿼리는 30개 제한 → chunk 처리
- `writeBatch`는 500개 제한 → 이중 chunk 처리

### 2. Store에서 Cascade 삭제

```typescript
// useStore.ts
deleteBusiness: async (id) => {
  const state = get();

  // 1. 관련 데이터 찾기
  const businessEmployments = state.employments.filter((e) => e.businessId === id);
  const employmentIds = businessEmployments.map((e) => e.id);

  // 2. Store에서 한 번에 삭제 (낙관적 업데이트)
  set((state) => ({
    businesses: state.businesses.filter((b) => b.id !== id),
    employments: state.employments.filter((e) => e.businessId !== id),
    monthlyWages: state.monthlyWages.filter((mw) => !employmentIds.includes(mw.employmentId)),
    retirementCalculations: state.retirementCalculations.filter((r) => r.businessId !== id),
    excelMappings: state.excelMappings.filter((m) => m.businessId !== id),
  }));

  // 3. Firestore에서 병렬 삭제
  try {
    await Promise.all([
      firestore.deleteMonthlyWagesByEmployments(employmentIds),
      firestore.deleteEmploymentsByBusiness(id),
      firestore.deleteRetirementCalculationsByBusiness(id),
      firestore.deleteExcelMapping(id).catch(() => {}),
      firestore.deleteBusiness(id),
    ]);
  } catch (error) {
    console.error('사업장 cascade 삭제 실패:', error);
  }
}
```

**삭제 순서:**
1. 먼저 Store 상태를 즉시 업데이트 (UI 반응성)
2. Firestore는 비동기로 병렬 삭제 (성능)

## 보너스: 데이터 정합성 검증 도구

이미 생성된 고아 데이터를 찾아서 정리하는 도구도 추가했다.

```typescript
const checkDataIntegrity = () => {
  const workerIds = new Set(store.workers.map(w => w.id));
  const businessIds = new Set(store.businesses.map(b => b.id));
  const employmentIds = new Set(store.employments.map(e => e.id));

  // 고아 Employment 찾기
  const orphanedEmployments = store.employments.filter(
    emp => !workerIds.has(emp.workerId) || !businessIds.has(emp.businessId)
  );

  // 고아 급여 찾기
  const orphanedWages = store.monthlyWages.filter(
    mw => !employmentIds.has(mw.employmentId)
  );

  return { orphanedEmployments, orphanedWages };
};
```

설정 페이지에서 버튼 하나로 검증하고 정리할 수 있다.

## Import 매칭 실패 원인 표시

급여 엑셀 Import 시 매칭 실패하면 **왜 실패했는지** 명확히 표시하도록 개선했다.

```typescript
// 매칭 상태 판단
let matchStatus: 'matched' | 'no_worker' | 'no_employment';
let matchReason: string;

if (matchedEmp) {
  matchStatus = 'matched';
  matchReason = '매칭 성공';
} else if (!matchedWorker) {
  matchStatus = 'no_worker';
  matchReason = `미등록 근로자 (주민번호: ${residentNo.slice(0, 6)}-*******)`;
} else {
  matchStatus = 'no_employment';
  matchReason = `다른 사업장 소속 (${matchedWorker.name})`;
}
```

UI에서는 요약과 상세 모두 표시:

```
⚠ 매칭 실패 원인:
● 미등록 근로자: 3명 → 근로자 등록 필요
● 다른 사업장 소속: 1명 → 고용관계 확인 필요
```

## 결과

| Before | After |
|--------|-------|
| 삭제 후 고아 데이터 남음 | Cascade로 완전 삭제 |
| Import 실패 원인 불명 | 명확한 실패 원인 표시 |
| 정합성 검증 수동 | 버튼 하나로 검증/정리 |

## 교훈

1. **관계형 데이터는 Cascade 삭제 필수** - NoSQL이라도 참조 무결성은 직접 관리해야 한다
2. **낙관적 업데이트 + 비동기 저장** - UI 반응성과 데이터 일관성 둘 다 챙기기
3. **검증 도구는 미리 만들어두자** - 문제 생기면 원인 파악이 어렵다

---

*급여관리 시스템 개발 중 - Claude Code와 함께*
