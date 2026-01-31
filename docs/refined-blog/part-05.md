# 15개 사업장 대시보드: 사업장 중심 UI로 업무 동선 50% 단축

> **TL;DR**: "기능 → 사업장" 순서가 아니라 "사업장 → 기능" 순서로 UI를 재설계했습니다. 15개 사업장을 한눈에 보는 대시보드, 탭 기반 상세 페이지, 엑셀 템플릿 기반 일괄 추가 기능까지. 클릭 수 50% 감소, 사업장 혼동 방지 효과를 얻었습니다.

---

## 들어가며: 15개 사업장의 현실

실제 관리하는 사업장 목록입니다.

- 쿠우쿠우 12개 지점 (부평, 강동, 검단, 고덕, 마산, 분당, 상봉, 송탄, 양주, 연신내, 춘천, 의정부)
- 다이닝원
- 블루레일 (건대/의정부)
- 올웨이즈샤브

**총 15개 사업장**, 각각의 근로자와 급여 데이터를 관리해야 합니다.

---

## 기존 구조의 문제점

처음에는 이렇게 설계했어요.

```
기존: 기능 중심 구조
├── /workers (전체 근로자)
├── /wages (전체 급여)
├── /reports (전체 신고서)
└── 사업장 선택은 각 화면에서
```

### 문제점

1. **매번 사업장 필터링 필요**
   - 근로자 페이지에서 "어떤 사업장이지?" 확인
   - 급여 페이지에서 또 사업장 선택
   - 신고서 페이지에서 또...

2. **사업장 혼동 위험**
   - "쿠우쿠우 부평점"과 "쿠우쿠우 분당점" 헷갈림
   - 잘못된 사업장에 데이터 입력하는 실수

3. **전체 현황 파악 어려움**
   - 15개 사업장 중 어디에 입퇴사가 있는지 한눈에 안 보임
   - 급여 입력이 덜 된 사업장을 찾으려면 하나씩 확인

---

## 새로운 구조: 사업장 중심

```
신규: 사업장 중심 구조
├── / (대시보드: 모든 사업장 카드)
└── /businesses/[id] (사업장 상세)
    ├── 근로자 탭
    ├── 급여이력 탭
    ├── 신고서 탭
    └── Import 탭
```

### 핵심 변화

- **대시보드**: 15개 사업장을 한눈에
- **상세 페이지**: 선택한 사업장 안에서 모든 작업 완결
- **탭 구조**: 페이지 이동 없이 기능 전환

---

## 대시보드 설계

각 사업장 카드에 핵심 정보를 표시합니다.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {businessStats.map(({ business, activeCount, thisMonthJoins, thisMonthLeaves, wageProgress }) => (
    <Link key={business.id} href={`/businesses/${business.id}`}>
      <div className="glass p-6 hover:bg-white/10 transition cursor-pointer">
        {/* 사업장 정보 */}
        <h3 className="text-xl font-semibold text-white">
          {business.name}
        </h3>
        <p className="text-white/60">{business.bizNo}</p>

        {/* 재직 현황 */}
        <div className="mt-4">
          <span className="text-2xl font-bold text-white">{activeCount}</span>
          <span className="text-white/60 ml-1">명 재직 중</span>
        </div>

        {/* 이번달 입퇴사 */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="badge-success">입사</span>
            <span className="text-white">{thisMonthJoins}명</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-warning">퇴사</span>
            <span className="text-white">{thisMonthLeaves}명</span>
          </div>
        </div>

        {/* 급여 입력률 */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/60">급여 입력률</span>
            <span className="text-white">{wageProgress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${wageProgress}%` }}
            />
          </div>
        </div>

        {/* 신고 필요 알림 */}
        {(thisMonthJoins > 0 || thisMonthLeaves > 0) && (
          <div className="mt-4 flex gap-2">
            {thisMonthJoins > 0 && (
              <span className="badge-info">취득신고 필요</span>
            )}
            {thisMonthLeaves > 0 && (
              <span className="badge-warning">상실신고 필요</span>
            )}
          </div>
        )}
      </div>
    </Link>
  ))}
</div>
```

**[캡처 필요 #1]**: 대시보드 전체 화면 - 15개 사업장 카드가 그리드로 배치된 모습

---

## 탭 기반 상세 페이지

사업장 하나를 선택하면, 그 안에서 모든 작업을 완료할 수 있어요.

```tsx
const tabs = ['근로자', '급여이력', '신고서', 'Import'];

<div className="flex gap-4 border-b border-white/10">
  {tabs.map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`pb-3 px-4 transition
        ${activeTab === tab
          ? 'text-white border-b-2 border-blue-500'
          : 'text-white/60 hover:text-white'
        }`}
    >
      {tab}
    </button>
  ))}
</div>

<div className="mt-6">
  {activeTab === '근로자' && <WorkersTab businessId={business.id} />}
  {activeTab === '급여이력' && <WagesTab businessId={business.id} />}
  {activeTab === '신고서' && <ReportsTab businessId={business.id} />}
  {activeTab === 'Import' && <ImportTab businessId={business.id} />}
</div>
```

### 각 탭의 역할

| 탭 | 기능 |
|----|------|
| **근로자** | 근로자 목록, 추가, 수정, 삭제 |
| **급여이력** | 월별 급여 입력 |
| **신고서** | 취득/상실 신고서 생성 및 다운로드 |
| **Import** | 급여대장 엑셀 업로드 |

**[캡처 필요 #2]**: 사업장 상세 페이지 - 탭 구조와 각 탭 내용

---

## 사업장 일괄 추가 기능

15개 사업장을 하나씩 등록하면 시간이 너무 오래 걸려요. 각 사업장마다 6개 관리번호가 있으니까요.

- 사업자등록번호
- 통합관리번호
- 고용산재관리번호
- 산재관리번호
- 국민연금관리번호
- 건강보험관리번호

**15개 × 6개 = 90개 필드**를 수동 입력?

### 해결: 엑셀 템플릿 기반 일괄 추가

#### 1단계: 템플릿 다운로드

```typescript
const downloadBusinessTemplate = () => {
  const templateData = [
    // 헤더 행
    [
      '사업장명', '사업자등록번호', '통합관리번호', '고용산재관리번호',
      '산재관리번호', '국민연금관리번호', '건강보험관리번호',
      '주소', '전화번호', '기본직종코드', '기본근무시간'
    ],
    // 예시 행
    [
      '[작성예시] 쿠우쿠우 부평점', '630-40-91109', '79516010160',
      '79516010160', '', 'NPS123456', 'NHIC789012',
      '인천시 부평구...', '032-123-4567', '532', '40'
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '사업장목록');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout]), '사업장_추가_템플릿.xlsx');
};
```

#### 2단계: 엑셀 작성 후 업로드

사용자가 템플릿에 15개 사업장 정보를 채워서 업로드합니다.

```typescript
const handleBusinessImport = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const data = new Uint8Array(event.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    const businesses: Business[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // 예시 행 스킵
      if (!row[0] || row[0].startsWith('[작성예시]')) continue;

      businesses.push({
        id: `biz-import-${Date.now()}-${i}`,
        name: String(row[0] || ''),
        bizNo: String(row[1] || ''),
        gwanriNo: String(row[2] || ''),
        gyGwanriNo: String(row[3] || ''),
        sjGwanriNo: String(row[4] || ''),
        npsGwanriNo: String(row[5] || ''),
        nhicGwanriNo: String(row[6] || ''),
        address: String(row[7] || ''),
        phone: String(row[8] || ''),
        defaultJikjong: String(row[9] || '532'),
        defaultWorkHours: parseInt(String(row[10])) || 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    setImportPreview(businesses);
  };

  reader.readAsArrayBuffer(file);
};
```

#### 3단계: 미리보기 및 확인

```tsx
{showPreview && (
  <div className="glass p-6">
    <h3 className="text-xl font-semibold text-white mb-4">
      가져올 사업장 ({importPreview.length}개)
    </h3>

    <table className="table-glass w-full">
      <thead>
        <tr>
          <th>사업장명</th>
          <th>사업자번호</th>
          <th>관리번호</th>
        </tr>
      </thead>
      <tbody>
        {importPreview.map((biz, i) => (
          <tr key={i}>
            <td>{biz.name}</td>
            <td>{biz.bizNo || '-'}</td>
            <td>{biz.gwanriNo || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex gap-4 mt-6">
      <button
        onClick={confirmBusinessImport}
        className="btn-primary"
      >
        확인 (추가하기)
      </button>
      <button
        onClick={() => setShowPreview(false)}
        className="btn-secondary"
      >
        취소
      </button>
    </div>
  </div>
)}
```

#### 4단계: 중복 체크 후 추가

```typescript
const confirmBusinessImport = () => {
  const existingNames = new Set(store.businesses.map(b => b.name));
  let added = 0, skipped = 0;

  importPreview.forEach((biz) => {
    if (biz.name && !existingNames.has(biz.name)) {
      store.addBusiness(biz);
      existingNames.add(biz.name);
      added++;
    } else {
      skipped++;
    }
  });

  alert(`사업장 ${added}개 추가, ${skipped}개 중복/스킵`);
  setShowPreview(false);
};
```

**[캡처 필요 #3]**: 사업장 일괄 추가 미리보기 화면 - 15개 사업장 목록 확인

---

## 결과: 업무 동선 50% 단축

### Before (기능 중심)

```
1. 근로자 페이지 이동
2. 사업장 필터 선택
3. 근로자 확인
4. 급여 페이지 이동
5. 사업장 필터 선택 (또!)
6. 급여 입력
7. 신고서 페이지 이동
8. 사업장 필터 선택 (또또!)
9. 신고서 생성
```

### After (사업장 중심)

```
1. 대시보드에서 사업장 클릭
2. 근로자 탭 → 확인
3. 급여이력 탭 → 입력
4. 신고서 탭 → 생성
```

**페이지 이동 없음, 사업장 재선택 없음!**

---

## 주요 개선 효과

| 항목 | Before | After |
|------|--------|-------|
| 페이지 이동 | 매 작업마다 | 없음 |
| 사업장 선택 | 매 페이지마다 | 최초 1회 |
| 클릭 수 | 약 10회 | 약 5회 |
| 사업장 혼동 | 발생 가능 | 불가능 |
| 전체 현황 파악 | 어려움 | 대시보드에서 즉시 |

---

## 마치며: 데이터 중심 사고

**"기능 중심"** 설계는 개발자 입장에서 쉬워요. CRUD 기능별로 페이지를 나누면 되니까요.

하지만 **사용자 입장**에서는 **"데이터 중심"**이 자연스럽습니다.

- "쿠우쿠우 부평점의 이번 달 입퇴사를 처리하고 싶어"
- "다이닝원 급여 데이터를 입력해야 해"

사용자가 생각하는 단위는 **사업장**이에요. UI도 그에 맞춰야 합니다.

다음 편에서는 UI/UX를 한 단계 업그레이드한 **Liquid Glass 디자인**을 다룹니다.

---

### 다음 편 예고

**[6편] Liquid Glass UI: 업무용 툴도 아름다워야 한다**
- 애플 감성 다크모드 구현
- Tailwind CSS로 글래스모피즘 효과
- 어두운 배경에서 눈이 편한 UI

---

**관련 키워드**: UI/UX 설계, 대시보드 디자인, 사업장 관리 시스템, Next.js 라우팅, 탭 기반 인터페이스, 노무사 업무 효율화

---

*이 글이 도움이 되셨다면 공유 부탁드립니다. 질문이나 의견은 댓글로 남겨주세요!*
