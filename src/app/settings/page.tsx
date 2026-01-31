'use client';

import { useStore } from '@/store/useStore';

export default function SettingsPage() {
  const store = useStore();

  const handleExportData = () => {
    const data = {
      businesses: store.businesses,
      workers: store.workers,
      employments: store.employments,
      reports: store.reports,
      monthlyWages: store.monthlyWages,
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

        if (confirm(`백업 데이터를 불러오시겠습니까?\n- 사업장: ${data.businesses?.length || 0}개\n- 근로자: ${data.workers?.length || 0}명\n- 월별 급여: ${data.monthlyWages?.length || 0}건\n\n기존 데이터가 덮어씌워집니다.`)) {
          data.businesses?.forEach((b: unknown) => store.addBusiness(b as Parameters<typeof store.addBusiness>[0]));
          data.workers?.forEach((w: unknown) => store.addWorker(w as Parameters<typeof store.addWorker>[0]));
          data.employments?.forEach((e: unknown) => store.addEmployment(e as Parameters<typeof store.addEmployment>[0]));
          data.reports?.forEach((r: unknown) => store.addReport(r as Parameters<typeof store.addReport>[0]));
          if (data.monthlyWages?.length) {
            store.addMonthlyWages(data.monthlyWages as Parameters<typeof store.addMonthlyWages>[0]);
          }
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

        {/* bkend.ai 연동 (향후) */}
        <div className="glass p-6 opacity-60">
          <h2 className="text-lg font-semibold text-white mb-4">bkend.ai 연동 (준비 중)</h2>
          <p className="text-sm text-white/40">
            클라우드 동기화 기능은 추후 지원 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
