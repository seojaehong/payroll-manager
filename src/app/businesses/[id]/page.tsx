'use client';

import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MonthlyWage, Worker, Employment } from '@/types';

type TabType = 'workers' | 'wages' | 'reports' | 'import';

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const {
    businesses, workers, employments, monthlyWages, reports, excelMappings,
    addWorker, addEmployment, addMonthlyWages, addReport,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('workers');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);

  const business = businesses.find((b) => b.id === businessId);

  // 해당 사업장 근로자
  const businessEmployments = useMemo(() => {
    return employments
      .filter((e) => e.businessId === businessId)
      .map((e) => ({
        employment: e,
        worker: workers.find((w) => w.id === e.workerId)!,
      }))
      .filter(({ worker }) => worker);
  }, [employments, workers, businessId]);

  const activeWorkers = businessEmployments.filter(({ employment }) => employment.status === 'ACTIVE');
  const inactiveWorkers = businessEmployments.filter(({ employment }) => employment.status === 'INACTIVE');

  if (!business) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 text-lg mb-4">사업장을 찾을 수 없습니다</p>
        <Link href="/" className="btn-primary">대시보드로 이동</Link>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'workers', label: '근로자', icon: '👥' },
    { id: 'wages', label: '급여 이력', icon: '💰' },
    { id: 'reports', label: '신고서', icon: '📝' },
    { id: 'import', label: 'Import', icon: '📥' },
  ];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-white/50 hover:text-white">
          ← 대시보드
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-white">{business.name}</h1>
          <p className="text-white/40">{business.bizNo} | 관리번호: {business.gwanriNo || '-'}</p>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">재직 중</p>
          <p className="text-2xl font-bold text-green-400">{activeWorkers.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">퇴사</p>
          <p className="text-2xl font-bold text-white/60">{inactiveWorkers.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 입사</p>
          <p className="text-2xl font-bold text-blue-400">
            {businessEmployments.filter(({ employment }) =>
              employment.joinDate?.startsWith(new Date().toISOString().slice(0, 7)) && employment.status === 'ACTIVE'
            ).length}
          </p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 퇴사</p>
          <p className="text-2xl font-bold text-red-400">
            {businessEmployments.filter(({ employment }) =>
              employment.leaveDate?.startsWith(new Date().toISOString().slice(0, 7))
            ).length}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="glass p-6">
        {activeTab === 'workers' && (
          <WorkersTab
            businessEmployments={businessEmployments}
            businessId={businessId}
          />
        )}
        {activeTab === 'wages' && (
          <WagesTab
            businessId={businessId}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            addMonthlyWages={addMonthlyWages}
            excelMappings={excelMappings}
            workers={workers}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab
            businessId={businessId}
            business={business}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
            reports={reports}
            addReport={addReport}
          />
        )}
        {activeTab === 'import' && (
          <ImportTab
            businessId={businessId}
            business={business}
            workers={workers}
            excelMappings={excelMappings}
            addWorker={addWorker}
            addEmployment={addEmployment}
          />
        )}
      </div>
    </div>
  );
}

// 근로자 탭
function WorkersTab({
  businessEmployments,
  businessId,
}: {
  businessEmployments: { employment: Employment; worker: Worker }[];
  businessId: string;
}) {
  const [showInactive, setShowInactive] = useState(false);

  const filtered = showInactive
    ? businessEmployments
    : businessEmployments.filter(({ employment }) => employment.status === 'ACTIVE');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          근로자 목록 ({filtered.length}명)
        </h3>
        <label className="flex items-center gap-2 text-white/60 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm">퇴사자 포함</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-white/40 py-12">등록된 근로자가 없습니다</p>
      ) : (
        <table className="w-full table-glass">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">주민번호</th>
              <th className="px-4 py-3">입사일</th>
              <th className="px-4 py-3">퇴사일</th>
              <th className="px-4 py-3">월평균보수</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ worker, employment }) => (
              <tr key={employment.id}>
                <td className="px-4 py-3 text-white">{worker.name}</td>
                <td className="px-4 py-3 text-white/60 font-mono">{worker.residentNo.slice(0, 6)}-*******</td>
                <td className="px-4 py-3 text-white/60">{employment.joinDate || '-'}</td>
                <td className="px-4 py-3 text-white/60">{employment.leaveDate || '-'}</td>
                <td className="px-4 py-3 text-white/60">{employment.monthlyWage.toLocaleString()}원</td>
                <td className="px-4 py-3">
                  <span className={`badge ${employment.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>
                    {employment.status === 'ACTIVE' ? '재직' : '퇴사'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// 급여 이력 탭 (간소화 - 상세 기능은 /wages 페이지)
function WagesTab({
  businessId,
  businessEmployments,
  monthlyWages,
  selectedYear,
  setSelectedYear,
  addMonthlyWages,
  excelMappings,
  workers,
}: {
  businessId: string;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  addMonthlyWages: (wages: MonthlyWage[]) => void;
  excelMappings: any[];
  workers: Worker[];
}) {
  const [importMonth, setImportMonth] = useState('');
  const [importPreview, setImportPreview] = useState<{ name: string; residentNo: string; wage: number; matched: boolean; duplicate: boolean }[]>([]);

  const months = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);

  // 급여 데이터 현황
  const wageStats = useMemo(() => {
    let total = 0;
    let filled = 0;

    businessEmployments.forEach(({ employment }) => {
      months.forEach((ym) => {
        const [year, month] = ym.split('-').map(Number);
        const monthEnd = new Date(year, month, 0);
        const monthStart = new Date(year, month - 1, 1);

        const joinDate = employment.joinDate ? new Date(employment.joinDate) : null;
        const leaveDate = employment.leaveDate ? new Date(employment.leaveDate) : null;

        if (joinDate && joinDate > monthEnd) return;
        if (leaveDate && leaveDate < monthStart) return;

        total++;
        if (monthlyWages.find((mw) => mw.employmentId === employment.id && mw.yearMonth === ym)) {
          filled++;
        }
      });
    });

    return { total, filled, percent: total > 0 ? Math.round((filled / total) * 100) : 100 };
  }, [businessEmployments, months, monthlyWages]);

  // 엑셀 임포트 핸들러 (개선된 버전)
  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });

      const mapping = excelMappings.find((m) => m.businessId === businessId);
      const sheetName = mapping?.sheetName || '임금대장';
      const dataStartRow = mapping?.dataStartRow || 6;
      const nameCol = mapping?.columns?.name || 2;
      const residentNoCol = mapping?.columns?.residentNo || 4;
      const wageCol = 20;

      const ws = wb.Sheets[sheetName];
      if (!ws) {
        alert(`'${sheetName}' 시트를 찾을 수 없습니다.`);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      // 파일명에서 년월 추출
      const fileNameMatch = file.name.match(/(\d{4})(\d{2})/);
      if (fileNameMatch) {
        setImportMonth(`${fileNameMatch[1]}-${fileNameMatch[2]}`);
      }

      const preview: typeof importPreview = [];
      for (let i = dataStartRow - 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[nameCol - 1]) continue;

        const name = String(row[nameCol - 1] || '').trim();
        let residentNo = String(row[residentNoCol - 1] || '').replace(/-/g, '').trim();
        if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
          residentNo = residentNo.padStart(13, '0');
        }
        const wageRaw = row[wageCol - 1];
        const wage = typeof wageRaw === 'number'
          ? Math.round(wageRaw)
          : parseInt(String(wageRaw).replace(/,/g, '')) || 0;

        if (name && wage > 0) {
          const matchedWorker = workers.find((w) => w.residentNo === residentNo);
          const matchedEmp = matchedWorker
            ? businessEmployments.find(({ worker }) => worker.id === matchedWorker.id)
            : null;

          // 중복 체크
          const isDuplicate = matchedEmp
            ? !!monthlyWages.find((mw) => mw.employmentId === matchedEmp.employment.id && mw.yearMonth === importMonth)
            : false;

          preview.push({
            name,
            residentNo,
            wage,
            matched: !!matchedEmp,
            duplicate: isDuplicate,
          });
        }
      }

      setImportPreview(preview);
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  }, [businessId, excelMappings, workers, businessEmployments, monthlyWages, importMonth]);

  // 임포트 실행
  const executeImport = () => {
    if (!importMonth || importPreview.length === 0) {
      alert('임포트할 월을 선택하고 데이터를 확인하세요.');
      return;
    }

    const duplicates = importPreview.filter((p) => p.duplicate && p.matched);
    if (duplicates.length > 0) {
      if (!confirm(`${duplicates.length}건의 기존 데이터가 있습니다. 덮어쓸까요?`)) {
        return;
      }
    }

    const newWages: MonthlyWage[] = [];
    let matchedCount = 0;

    importPreview.forEach((row) => {
      const matchedWorker = workers.find((w) => w.residentNo === row.residentNo);
      if (!matchedWorker) return;

      const matchedEmp = businessEmployments.find(({ worker }) => worker.id === matchedWorker.id);
      if (!matchedEmp) return;

      // 기간 검증
      const [year, month] = importMonth.split('-').map(Number);
      const monthEnd = new Date(year, month, 0);
      const monthStart = new Date(year, month - 1, 1);
      const joinDate = matchedEmp.employment.joinDate ? new Date(matchedEmp.employment.joinDate) : null;
      const leaveDate = matchedEmp.employment.leaveDate ? new Date(matchedEmp.employment.leaveDate) : null;

      if (joinDate && joinDate > monthEnd) {
        console.log(`${row.name}: 입사 전 기간 스킵`);
        return;
      }
      if (leaveDate && leaveDate < monthStart) {
        console.log(`${row.name}: 퇴사 후 기간 스킵`);
        return;
      }

      newWages.push({
        id: `${matchedEmp.employment.id}-${importMonth}`,
        employmentId: matchedEmp.employment.id,
        yearMonth: importMonth,
        totalWage: row.wage,
        createdAt: new Date(),
      });
      matchedCount++;
    });

    if (newWages.length > 0) {
      addMonthlyWages(newWages);
      alert(`임포트 완료! ${matchedCount}명의 급여가 저장되었습니다.`);
      setImportPreview([]);
      setImportMonth('');
    } else {
      alert('저장할 데이터가 없습니다.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">급여 이력</h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="input-glass px-4 py-2"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* 현황 */}
      <div className="glass p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white/50">{selectedYear}년 급여 입력 현황</span>
          <span className={wageStats.percent === 100 ? 'text-green-400' : 'text-yellow-400'}>
            {wageStats.filled} / {wageStats.total} ({wageStats.percent}%)
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${wageStats.percent === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${wageStats.percent}%` }}
          />
        </div>
      </div>

      {/* 임포트 */}
      <div className="glass p-4 mb-6">
        <h4 className="text-white font-medium mb-3">엑셀에서 급여 임포트</h4>
        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="col-span-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400"
            />
          </div>
          <div>
            <input
              type="month"
              value={importMonth}
              onChange={(e) => setImportMonth(e.target.value)}
              className="w-full input-glass px-4 py-3"
              placeholder="적용 월"
            />
          </div>
          <button
            onClick={executeImport}
            disabled={importPreview.length === 0 || !importMonth}
            className="btn-primary disabled:opacity-50"
          >
            임포트 ({importPreview.filter((p) => p.matched).length}명)
          </button>
        </div>

        {importPreview.length > 0 && (
          <div className="mt-4 max-h-40 overflow-auto">
            <table className="w-full table-glass text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-right">급여</th>
                  <th className="px-3 py-2 text-center">매칭</th>
                  <th className="px-3 py-2 text-center">중복</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row, i) => (
                  <tr key={i} className={row.matched ? '' : 'opacity-50'}>
                    <td className="px-3 py-2 text-white">{row.name}</td>
                    <td className="px-3 py-2 text-right text-white/80">{row.wage.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      {row.matched ? <span className="text-green-400">O</span> : <span className="text-red-400">X</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.duplicate && <span className="text-yellow-400">기존</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세 편집 링크 */}
      <Link href="/wages" className="btn-secondary inline-block">
        상세 편집 (전체 사업장)
      </Link>
    </div>
  );
}

// 신고서 탭
function ReportsTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
  reports,
  addReport,
}: {
  businessId: string;
  business: any;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  reports: any[];
  addReport: (report: any) => void;
}) {
  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 대상자 필터
  const targetWorkers = useMemo(() => {
    if (reportType === 'ACQUIRE') {
      return businessEmployments.filter(({ employment }) =>
        employment.joinDate?.startsWith(targetMonth) && employment.status === 'ACTIVE'
      );
    } else {
      return businessEmployments.filter(({ employment }) =>
        employment.leaveDate?.startsWith(targetMonth)
      );
    }
  }, [businessEmployments, reportType, targetMonth]);

  // 자동 선택
  useMemo(() => {
    setSelectedIds(new Set(targetWorkers.map(({ worker }) => worker.id)));
  }, [targetWorkers]);

  const selectedWorkers = businessEmployments.filter(({ worker }) => selectedIds.has(worker.id));

  const toggleWorker = (workerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  // 간소화된 신고서 생성 (상세 기능은 /reports 페이지)
  const handleGenerate = () => {
    if (selectedWorkers.length === 0) {
      alert('대상자를 선택하세요.');
      return;
    }
    // /reports 페이지로 이동하거나 여기서 직접 생성
    alert(`${selectedWorkers.length}명의 ${reportType === 'ACQUIRE' ? '취득' : '상실'}신고를 생성합니다.\n상세 기능은 [신고서 생성] 메뉴를 이용하세요.`);
  };

  const bizReports = reports.filter((r) => r.businessId === businessId);

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-white/60 mb-2">신고 유형</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'ACQUIRE' | 'LOSE')}
            className="w-full input-glass px-4 py-3"
          >
            <option value="ACQUIRE">취득신고</option>
            <option value="LOSE">상실신고</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">대상 월</label>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full input-glass px-4 py-3"
          />
        </div>
        <div className="flex items-end">
          <Link href="/reports" className="btn-primary w-full text-center">
            신고서 생성 페이지로 →
          </Link>
        </div>
      </div>

      <h4 className="text-white font-medium mb-3">대상자 ({targetWorkers.length}명)</h4>
      {targetWorkers.length === 0 ? (
        <p className="text-white/40 text-center py-8">해당 월에 {reportType === 'ACQUIRE' ? '입사' : '퇴사'}한 근로자가 없습니다</p>
      ) : (
        <table className="w-full table-glass text-sm mb-6">
          <thead>
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === targetWorkers.length}
                  onChange={() => {
                    if (selectedIds.size === targetWorkers.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(targetWorkers.map(({ worker }) => worker.id)));
                    }
                  }}
                />
              </th>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">{reportType === 'ACQUIRE' ? '입사일' : '퇴사일'}</th>
              <th className="px-3 py-2 text-right">월평균보수</th>
            </tr>
          </thead>
          <tbody>
            {targetWorkers.map(({ worker, employment }) => (
              <tr key={worker.id} className="cursor-pointer hover:bg-white/5" onClick={() => toggleWorker(worker.id)}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedIds.has(worker.id)} onChange={() => {}} />
                </td>
                <td className="px-3 py-2 text-white">{worker.name}</td>
                <td className="px-3 py-2 text-white/60">
                  {reportType === 'ACQUIRE' ? employment.joinDate : employment.leaveDate}
                </td>
                <td className="px-3 py-2 text-right text-white/60">{employment.monthlyWage.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 최근 신고 이력 */}
      <h4 className="text-white font-medium mb-3 mt-8">최근 신고 이력</h4>
      {bizReports.length === 0 ? (
        <p className="text-white/40 text-center py-8">신고 이력이 없습니다</p>
      ) : (
        <table className="w-full table-glass text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">날짜</th>
              <th className="px-3 py-2 text-left">유형</th>
              <th className="px-3 py-2 text-right">인원</th>
              <th className="px-3 py-2 text-left">파일</th>
            </tr>
          </thead>
          <tbody>
            {bizReports.slice(0, 5).map((report) => (
              <tr key={report.id}>
                <td className="px-3 py-2 text-white/60">{report.reportDate}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${report.type === 'ACQUIRE' ? 'badge-success' : 'badge-danger'}`}>
                    {report.type === 'ACQUIRE' ? '취득' : '상실'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-white/60">{report.workerCount}명</td>
                <td className="px-3 py-2 text-white/40 text-sm">{report.fileName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Import 탭
function ImportTab({
  businessId,
  business,
  workers,
  excelMappings,
  addWorker,
  addEmployment,
}: {
  businessId: string;
  business: any;
  workers: Worker[];
  excelMappings: any[];
  addWorker: (worker: Worker) => void;
  addEmployment: (employment: Employment) => void;
}) {
  return (
    <div>
      <div className="text-center py-8">
        <p className="text-white/60 mb-4">
          <span className="text-2xl mr-2">📥</span>
          {business.name}에 근로자를 등록합니다
        </p>
        <Link href="/import" className="btn-primary">
          엑셀 Import 페이지로 →
        </Link>
      </div>
      <div className="glass p-4 mt-4">
        <h4 className="text-white font-medium mb-2">현재 매핑 설정</h4>
        {(() => {
          const mapping = excelMappings.find((m) => m.businessId === businessId);
          if (!mapping) return <p className="text-white/40 text-sm">매핑 설정 없음</p>;
          return (
            <div className="text-white/60 text-sm">
              <p>시트: {mapping.sheetName}</p>
              <p>데이터 시작: {mapping.dataStartRow}행</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
