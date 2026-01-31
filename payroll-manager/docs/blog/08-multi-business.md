# 15개 사업장을 한 번에: 다중 사업장 관리

> 쿠우쿠우 12개 지점 + 다이닝원 + 블루레일 + 올웨이즈샤브 = 15개 사업장

## 사업장 목록

```typescript
const initialBusinesses: Business[] = [
  { id: 'biz-kukuku-bupyeong', name: '쿠우쿠우 부평점', bizNo: '630-40-91109', ... },
  { id: 'biz-kukuku-gangdong', name: '쿠우쿠우 강동점' },
  { id: 'biz-kukuku-geomdan', name: '쿠우쿠우 검단점' },
  { id: 'biz-kukuku-godeok', name: '쿠우쿠우 고덕점' },
  { id: 'biz-kukuku-masan', name: '쿠우쿠우 마산점' },
  { id: 'biz-kukuku-bundang', name: '쿠우쿠우 분당점 (유빛)' },
  { id: 'biz-kukuku-sangbong', name: '쿠우쿠우 상봉점 (누리에프앤비)' },
  { id: 'biz-kukuku-songtan', name: '쿠우쿠우 송탄점' },
  { id: 'biz-kukuku-yangju', name: '쿠우쿠우 양주옥정점' },
  { id: 'biz-kukuku-yeonsinne', name: '쿠우쿠우 연신내점' },
  { id: 'biz-kukuku-chuncheon', name: '쿠우쿠우 춘천점' },
  { id: 'biz-kukuku-uijeongbu', name: '쿠우쿠우 의정부민락점' },
  { id: 'biz-diningone', name: '다이닝원' },
  { id: 'biz-bluerail', name: '블루레일 (건대/의정부)' },
  { id: 'biz-always-shabu', name: '올웨이즈샤브' },
];
```

## 초기 데이터 로드 로직

기존 사용자 데이터 보존하면서 새 사업장 추가:

```typescript
initializeData: () => {
  const state = get();
  if (!state.initialized && state.businesses.length === 0) {
    // 처음 사용자: 전체 초기 데이터 로드
    set({
      initialized: true,
      businesses: initialBusinesses,
      excelMappings: initialMappings,
    });
  } else if (!state.initialized) {
    // 기존 사용자: 새 사업장만 추가
    const existingIds = new Set(state.businesses.map(b => b.id));
    const newBusinesses = initialBusinesses.filter(b => !existingIds.has(b.id));
    if (newBusinesses.length > 0) {
      set({
        initialized: true,
        businesses: [...state.businesses, ...newBusinesses],
      });
    }
  }
},
```

## 사업장별 엑셀 매핑

각 사업장마다 다른 급여 대장 형식 지원:

```typescript
interface ExcelMapping {
  businessId: string;
  sheetName: string;      // "임금대장"
  headerRow: number;      // 헤더 행 번호
  dataStartRow: number;   // 데이터 시작 행
  columns: {
    name: number;         // 이름 열
    residentNo: number;   // 주민번호 열
    joinDate: number;     // 입사일 열
    leaveDate: number;    // 퇴사일 열
    wage: number;         // 급여 열
  };
}
```

## 대시보드 그리드

15개 사업장을 2열 그리드로 표시:

```tsx
<div className="grid grid-cols-2 gap-6">
  {businessStats.map(({ business, activeCount, ... }) => (
    <Link key={business.id} href={`/businesses/${business.id}`}>
      <BusinessCard business={business} stats={...} />
    </Link>
  ))}
</div>
```

## 결과

- **확장성**: 사업장 추가 시 배열에 항목만 추가
- **유연성**: 사업장별 설정 독립적 관리
- **일관성**: 모든 사업장 동일한 UI/UX

---

*"하나를 잘 만들면 열다섯 개도 똑같이 돌아간다"*
