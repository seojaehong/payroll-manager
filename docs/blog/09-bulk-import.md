# 사업장 일괄 추가: Excel 템플릿 활용

> 관리번호 15개를 하나씩 입력하는 건 비효율적이다.

## 문제

- 사업장마다 6개 관리번호 (사업자번호, 통합관리번호, 고용산재, 산재, 국민연금, 건강보험)
- 15개 사업장 × 6개 = 90개 필드 수동 입력?
- 오타 위험, 시간 낭비

## 해결: Excel 템플릿 기반 일괄 추가

### 템플릿 다운로드

```typescript
const downloadBusinessTemplate = () => {
  const templateData = [
    ['사업장명', '사업자등록번호', '통합관리번호', '고용산재관리번호',
     '산재관리번호', '국민연금관리번호', '건강보험관리번호',
     '주소', '전화번호', '기본직종코드', '기본근무시간'],
    ['[작성예시] 쿠우쿠우 부평점', '630-40-91109', '79516010160', ...],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '사업장목록');

  // 다운로드
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout]), '사업장_추가_템플릿.xlsx');
};
```

### 파일 업로드 및 파싱

```typescript
const handleBusinessImport = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const data = new Uint8Array(event.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    const businesses: Business[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || row[0].startsWith('[작성예시]')) continue;

      businesses.push({
        id: `biz-import-${Date.now()}-${i}`,
        name: String(row[0] || ''),
        bizNo: String(row[1] || ''),
        gwanriNo: String(row[2] || ''),
        // ... 나머지 필드
      });
    }

    setImportPreview(businesses);
  };

  reader.readAsArrayBuffer(file);
};
```

### 미리보기 및 확인

```tsx
{showPreview && (
  <div className="preview-table">
    <h3>가져올 사업장 ({importPreview.length}개)</h3>
    <table>
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

    <button onClick={confirmBusinessImport}>확인 (추가하기)</button>
    <button onClick={() => setShowPreview(false)}>취소</button>
  </div>
)}
```

### 중복 체크

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
};
```

## 결과

- **작업 시간**: 90개 필드 → 파일 1개 업로드
- **오류 방지**: 복사/붙여넣기로 정확한 관리번호
- **재사용**: 템플릿 보관 후 다른 프로젝트에도 활용

---

*"반복 작업은 자동화의 신호다"*
