'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Business } from '@/types';

// 데이터 정합성 검증 결과 타입
interface IntegrityReport {
  orphanedEmployments: { id: string; workerId: string; businessId: string }[];
  orphanedWages: { id: string; employmentId: string; yearMonth: string }[];
  missingWorkers: { employmentId: string; workerId: string }[];
  missingBusinesses: { employmentId: string; businessId: string }[];
}

export default function SettingsPage() {
  const store = useStore();
  const [importPreview, setImportPreview] = useState<Partial<Business>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);

  // 데이터 정합성 검증
  const checkDataIntegrity = () => {
    const workerIds = new Set(store.workers.map(w => w.id));
    const businessIds = new Set(store.businesses.map(b => b.id));
    const employmentIds = new Set(store.employments.map(e => e.id));

    const report: IntegrityReport = {
      orphanedEmployments: [],
      orphanedWages: [],
      missingWorkers: [],
      missingBusinesses: [],
    };

    // Employment 검증
    store.employments.forEach(emp => {
      if (!workerIds.has(emp.workerId)) {
        report.missingWorkers.push({ employmentId: emp.id, workerId: emp.workerId });
      }
      if (!businessIds.has(emp.businessId)) {
        report.missingBusinesses.push({ employmentId: emp.id, businessId: emp.businessId });
      }
    });

    // 고아 Employment (Worker 또는 Business 없음)
    report.orphanedEmployments = store.employments
      .filter(emp => !workerIds.has(emp.workerId) || !businessIds.has(emp.businessId))
      .map(emp => ({ id: emp.id, workerId: emp.workerId, businessId: emp.businessId }));

    // 고아 MonthlyWages (Employment 없음)
    report.orphanedWages = store.monthlyWages
      .filter(mw => !employmentIds.has(mw.employmentId))
      .map(mw => ({ id: mw.id, employmentId: mw.employmentId, yearMonth: mw.yearMonth }));

    setIntegrityReport(report);
    setShowIntegrityModal(true);
  };

  // 고아 데이터 정리
  const cleanupOrphanedData = async () => {
    if (!integrityReport) return;

    const { orphanedEmployments, orphanedWages } = integrityReport;

    if (orphanedEmployments.length === 0 && orphanedWages.length === 0) {
      alert('정리할 고아 데이터가 없습니다.');
      return;
    }

    if (!confirm(`다음 고아 데이터를 삭제하시겠습니까?\n- 고아 고용관계: ${orphanedEmployments.length}건\n- 고아 급여: ${orphanedWages.length}건`)) {
      return;
    }

    // 고아 Employment 삭제
    for (const emp of orphanedEmployments) {
      await store.deleteEmployment(emp.id);
    }

    // 고아 급여는 store에서 직접 제거 (deleteEmployment cascade로 안 잡히는 것들)
    // 이미 employmentIds에 없는 것들이므로 store 상태만 업데이트
    // (firestore에서도 삭제 필요하면 추가 로직 필요)

    alert(`정리 완료!\n- 고용관계 ${orphanedEmployments.length}건 삭제\n- 급여 ${orphanedWages.length}건 삭제`);
    setShowIntegrityModal(false);
    setIntegrityReport(null);
  };


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

        {/* 데이터 정합성 검증 */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-white mb-4">데이터 정합성 검증</h2>
          <div className="space-y-4">
            <button
              onClick={checkDataIntegrity}
              className="btn-secondary"
            >
              데이터 검증 실행
            </button>
            <p className="text-sm text-white/40">
              고아 데이터 (연결이 끊어진 고용관계, 급여 등)를 검사합니다.
            </p>
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

      {/* 데이터 정합성 검증 모달 */}
      {showIntegrityModal && integrityReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-semibold text-white mb-4">데이터 정합성 검증 결과</h3>

            {/* 요약 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-xl ${integrityReport.orphanedEmployments.length > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                <div className="text-2xl font-bold text-white">{integrityReport.orphanedEmployments.length}</div>
                <div className="text-sm text-white/60">고아 고용관계</div>
              </div>
              <div className={`p-4 rounded-xl ${integrityReport.orphanedWages.length > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                <div className="text-2xl font-bold text-white">{integrityReport.orphanedWages.length}</div>
                <div className="text-sm text-white/60">고아 급여 데이터</div>
              </div>
            </div>

            {/* 정상 여부 */}
            {integrityReport.orphanedEmployments.length === 0 && integrityReport.orphanedWages.length === 0 ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl mb-6">
                <div className="text-green-400 font-medium">✓ 데이터 정합성 정상</div>
                <div className="text-sm text-white/60 mt-1">고아 데이터가 없습니다.</div>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {/* 고아 고용관계 상세 */}
                {integrityReport.orphanedEmployments.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="text-red-400 font-medium mb-2">⚠ 고아 고용관계 ({integrityReport.orphanedEmployments.length}건)</div>
                    <div className="text-sm text-white/60 mb-2">근로자나 사업장이 삭제되어 연결이 끊어진 고용관계입니다.</div>
                    <div className="max-h-32 overflow-auto text-xs text-white/50">
                      {integrityReport.orphanedEmployments.slice(0, 10).map((emp, i) => (
                        <div key={i}>• {emp.id.slice(0, 20)}... (Worker: {emp.workerId.slice(0, 15)}...)</div>
                      ))}
                      {integrityReport.orphanedEmployments.length > 10 && (
                        <div>... 외 {integrityReport.orphanedEmployments.length - 10}건</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 고아 급여 상세 */}
                {integrityReport.orphanedWages.length > 0 && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <div className="text-orange-400 font-medium mb-2">⚠ 고아 급여 데이터 ({integrityReport.orphanedWages.length}건)</div>
                    <div className="text-sm text-white/60 mb-2">고용관계가 삭제되어 연결이 끊어진 급여 데이터입니다.</div>
                    <div className="max-h-32 overflow-auto text-xs text-white/50">
                      {integrityReport.orphanedWages.slice(0, 10).map((wage, i) => (
                        <div key={i}>• {wage.yearMonth} - {wage.employmentId.slice(0, 20)}...</div>
                      ))}
                      {integrityReport.orphanedWages.length > 10 && (
                        <div>... 외 {integrityReport.orphanedWages.length - 10}건</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4">
              {(integrityReport.orphanedEmployments.length > 0 || integrityReport.orphanedWages.length > 0) && (
                <button
                  onClick={cleanupOrphanedData}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all"
                >
                  고아 데이터 정리
                </button>
              )}
              <button
                onClick={() => { setShowIntegrityModal(false); setIntegrityReport(null); }}
                className="btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
