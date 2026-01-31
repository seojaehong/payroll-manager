'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Business } from '@/types';

export default function SettingsPage() {
  const store = useStore();
  const [importPreview, setImportPreview] = useState<Partial<Business>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadBusinessTemplate = () => {
    const templateData = [
      ['사업장명', '사업자등록번호', '통합관리번호', '고용산재관리번호', '산재관리번호', '국민연금관리번호', '건강보험관리번호', '주소', '전화번호', '기본직종코드', '기본근무시간'],
      ['[작성예시] 쿠우쿠우 부평점', '630-40-91109', '79516010160', '79516010160', '79516010160', '20008864199', '77588907', '인천 부평구 부흥로 264, 9층', '010-9959-2647', '532', '40'],
      ['', '', '', '', '', '', '', '', '', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '사업장목록');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '사업장_추가_템플릿.xlsx';
    a.click();
  };

  const handleBusinessImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      const businesses: Partial<Business>[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0] || row[0].startsWith('[작성예시]')) continue;

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
          tel: String(row[8] || ''),
          defaultJikjong: String(row[9] || '532'),
          defaultWorkHours: Number(row[10]) || 40,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (businesses.length > 0) {
        setImportPreview(businesses);
        setShowPreview(true);
      } else {
        alert('가져올 데이터가 없습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const confirmBusinessImport = () => {
    const existingNames = new Set(store.businesses.map((b) => b.name));
    let added = 0, skipped = 0;

    importPreview.forEach((biz) => {
      if (biz.name && !existingNames.has(biz.name)) {
        store.addBusiness(biz as Business);
        existingNames.add(biz.name);
        added++;
      } else {
        skipped++;
      }
    });

    alert(`사업장 ${added}개 추가, ${skipped}개 중복/스킵`);
    setShowPreview(false);
    setImportPreview([]);
  };

  const handleExportData = () => {
    const data = {
      businesses: store.businesses,
      workers: store.workers,
      employments: store.employments,
      reports: store.reports,
      excelMappings: store.excelMappings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        if (confirm(`백업 데이터를 불러오시겠습니까?\n- 사업장: ${data.businesses?.length || 0}개\n- 근로자: ${data.workers?.length || 0}명\n\n기존 데이터가 덮어씌워집니다.`)) {
          data.businesses?.forEach((b: unknown) => store.addBusiness(b as Parameters<typeof store.addBusiness>[0]));
          data.workers?.forEach((w: unknown) => store.addWorker(w as Parameters<typeof store.addWorker>[0]));
          data.employments?.forEach((e: unknown) => store.addEmployment(e as Parameters<typeof store.addEmployment>[0]));
          data.reports?.forEach((r: unknown) => store.addReport(r as Parameters<typeof store.addReport>[0]));
          data.excelMappings?.forEach((m: unknown) => store.setExcelMapping(m as Parameters<typeof store.setExcelMapping>[0]));

          alert('백업 데이터를 불러왔습니다.');
          window.location.reload();
        }
      } catch {
        alert('잘못된 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('payroll-manager-storage');
      window.location.reload();
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">설정</h1>
      <p className="text-white/40 mb-8">데이터 백업 및 관리</p>

      <div className="space-y-6 max-w-2xl">
        {/* 데이터 현황 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">데이터 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-white/60">사업장</span>
              <span className="font-medium text-white">{store.businesses.length}개</span>
            </div>
            <div className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-white/60">근로자</span>
              <span className="font-medium text-white">{store.workers.length}명</span>
            </div>
            <div className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-white/60">고용관계</span>
              <span className="font-medium text-white">{store.employments.length}건</span>
            </div>
            <div className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-white/60">신고이력</span>
              <span className="font-medium text-white">{store.reports.length}건</span>
            </div>
          </div>
        </div>

        {/* 사업장 일괄 추가 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">사업장 일괄 추가 (Excel/CSV)</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button onClick={downloadBusinessTemplate} className="btn-secondary">
                템플릿 다운로드
              </button>
              <label className="block">
                <span className="btn-primary cursor-pointer inline-block">
                  Excel 파일 불러오기
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBusinessImport}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-white/40">
              템플릿을 다운로드하여 사업장 정보를 입력 후 업로드하세요.
            </p>

            {showPreview && importPreview.length > 0 && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white font-medium mb-3">가져올 사업장 ({importPreview.length}개)</h3>
                <div className="max-h-48 overflow-y-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/60">
                        <th className="text-left px-2 py-1">사업장명</th>
                        <th className="text-left px-2 py-1">사업자번호</th>
                        <th className="text-left px-2 py-1">관리번호</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((biz, i) => (
                        <tr key={i} className="text-white/80">
                          <td className="px-2 py-1">{biz.name}</td>
                          <td className="px-2 py-1">{biz.bizNo || '-'}</td>
                          <td className="px-2 py-1">{biz.gwanriNo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button onClick={confirmBusinessImport} className="btn-primary">
                    확인 (추가하기)
                  </button>
                  <button onClick={() => { setShowPreview(false); setImportPreview([]); }} className="btn-secondary">
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 백업/복원 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">백업 / 복원</h2>
          <div className="space-y-6">
            <div>
              <button
                onClick={handleExportData}
                className="btn-primary"
              >
                데이터 백업 (JSON 다운로드)
              </button>
              <p className="mt-3 text-sm text-white/40">
                모든 데이터를 JSON 파일로 다운로드합니다.
              </p>
            </div>
            <div>
              <label className="block">
                <span className="btn-secondary cursor-pointer inline-block">
                  백업 파일 불러오기
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <p className="mt-3 text-sm text-white/40">
                백업 JSON 파일에서 데이터를 복원합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 데이터 초기화 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">데이터 초기화</h2>
          <button
            onClick={handleClearData}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/20"
          >
            모든 데이터 삭제
          </button>
          <p className="mt-3 text-sm text-white/40">
            주의: 이 작업은 되돌릴 수 없습니다. 백업을 먼저 하세요.
          </p>
        </div>

        {/* Firebase 클라우드 동기화 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Firebase 클라우드 동기화</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${store.syncing ? 'bg-yellow-400 animate-pulse' : store.syncError ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className="text-white/60">
                {store.syncing ? '동기화 중...' : store.syncError ? `오류: ${store.syncError}` : store.lastSyncAt ? `마지막 동기화: ${new Date(store.lastSyncAt).toLocaleString('ko-KR')}` : '동기화 필요'}
              </span>
            </div>

            <div className="flex gap-4">
              <button
                onClick={async () => {
                  try {
                    await store.loadFromCloud();
                    alert('클라우드에서 데이터를 불러왔습니다.');
                  } catch (e) {
                    alert('불러오기 실패: ' + String(e));
                  }
                }}
                disabled={store.syncing}
                className="btn-secondary disabled:opacity-50"
              >
                클라우드에서 불러오기
              </button>
              <button
                onClick={async () => {
                  try {
                    await store.syncToCloud();
                    alert('클라우드에 저장되었습니다.');
                  } catch (e) {
                    alert('저장 실패: ' + String(e));
                  }
                }}
                disabled={store.syncing}
                className="btn-primary disabled:opacity-50"
              >
                클라우드에 저장하기
              </button>
            </div>

            <p className="text-sm text-white/40">
              Firebase Firestore를 사용하여 데이터를 클라우드에 저장합니다.
              <br />데이터 변경 시 자동으로 동기화됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
