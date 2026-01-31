'use client';

import { useStore } from '@/store/useStore';
import { useState, useMemo, useCallback } from 'react';
import { MonthlyWage } from '@/types';
import * as XLSX from 'xlsx';

export default function WagesPage() {
  const { businesses, workers, employments, monthlyWages, addMonthlyWages, excelMappings } = useStore();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1); // 기본 전년도
  const [editingWages, setEditingWages] = useState<Record<string, Record<string, number>>>({});
  const [importMonth, setImportMonth] = useState('');
  const [importPreview, setImportPreview] = useState<{ name: string; residentNo: string; wage: number; matched: boolean }[]>([]);;

  // 선택된 사업장의 근로자 목록
  const businessWorkers = useMemo(() => {
    if (!selectedBusiness) return [];
    return employments
      .filter((e) => e.businessId === selectedBusiness)
      .map((e) => ({
        employment: e,
        worker: workers.find((w) => w.id === e.workerId)!,
      }))
      .filter(({ worker }) => worker);
  }, [selectedBusiness, employments, workers]);

  // 해당 년도 월 목록 (1~12월)
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    return `${selectedYear}-${month}`;
  });

  // 기존 급여 데이터 로드
  const getWageValue = (employmentId: string, yearMonth: string): number | undefined => {
    // 수정 중인 값 우선
    if (editingWages[employmentId]?.[yearMonth] !== undefined) {
      return editingWages[employmentId][yearMonth];
    }
    // 저장된 값
    const saved = monthlyWages.find(
      (mw) => mw.employmentId === employmentId && mw.yearMonth === yearMonth
    );
    return saved?.totalWage;
  };

  // 값 변경
  const handleWageChange = (employmentId: string, yearMonth: string, value: string) => {
    const numValue = parseInt(value.replace(/,/g, '')) || 0;
    setEditingWages((prev) => ({
      ...prev,
      [employmentId]: {
        ...(prev[employmentId] || {}),
        [yearMonth]: numValue,
      },
    }));
  };

  // 저장
  const handleSave = () => {
    const newWages: MonthlyWage[] = [];

    Object.entries(editingWages).forEach(([employmentId, monthData]) => {
      Object.entries(monthData).forEach(([yearMonth, totalWage]) => {
        if (totalWage > 0) {
          newWages.push({
            id: `${employmentId}-${yearMonth}`,
            employmentId,
            yearMonth,
            totalWage,
            createdAt: new Date(),
          });
        }
      });
    });

    if (newWages.length > 0) {
      addMonthlyWages(newWages);
      setEditingWages({});
      alert(`${newWages.length}건의 급여 데이터가 저장되었습니다.`);
    }
  };

  // 엑셀 임포트 핸들러
  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBusiness) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });

      // 매핑 설정 가져오기
      const mapping = excelMappings.find((m) => m.businessId === selectedBusiness);
      const sheetName = mapping?.sheetName || '임금대장';
      const dataStartRow = mapping?.dataStartRow || 6;
      const nameCol = mapping?.columns.name || 2;
      const residentNoCol = mapping?.columns.residentNo || 4;
      const wageCol = 20; // 임금총액 열 (고정)

      const ws = wb.Sheets[sheetName];
      if (!ws) {
        alert(`'${sheetName}' 시트를 찾을 수 없습니다.`);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      // 파일명에서 년월 추출 시도 (예: 쿠우쿠우부평점_202501.xlsx)
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
          // 근로자 매칭
          const matchedWorker = workers.find((w) => w.residentNo === residentNo);
          preview.push({
            name,
            residentNo,
            wage,
            matched: !!matchedWorker,
          });
        }
      }

      setImportPreview(preview);
    };

    reader.readAsBinaryString(file);
    e.target.value = ''; // 같은 파일 다시 선택 가능하도록
  }, [selectedBusiness, excelMappings, workers]);

  // 임포트 실행
  const executeImport = () => {
    if (!importMonth || importPreview.length === 0) {
      alert('임포트할 월을 선택하고 데이터를 확인하세요.');
      return;
    }

    const newWages: MonthlyWage[] = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    importPreview.forEach((row) => {
      const worker = workers.find((w) => w.residentNo === row.residentNo);
      if (!worker) {
        unmatchedCount++;
        return;
      }

      const employment = employments.find(
        (e) => e.workerId === worker.id && e.businessId === selectedBusiness
      );
      if (!employment) {
        unmatchedCount++;
        return;
      }

      newWages.push({
        id: `${employment.id}-${importMonth}`,
        employmentId: employment.id,
        yearMonth: importMonth,
        totalWage: row.wage,
        createdAt: new Date(),
      });
      matchedCount++;
    });

    if (newWages.length > 0) {
      addMonthlyWages(newWages);
      alert(`임포트 완료!\n- 성공: ${matchedCount}명\n- 미매칭: ${unmatchedCount}명`);
      setImportPreview([]);
      setImportMonth('');
    } else {
      alert('매칭된 근로자가 없습니다. 먼저 [엑셀 Import]에서 근로자를 등록하세요.');
    }
  };

  // 입사/퇴사일 기준으로 해당 월에 근무했는지 확인
  const isWorkedMonth = (employment: typeof businessWorkers[0]['employment'], yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const joinDate = employment.joinDate ? new Date(employment.joinDate) : null;
    const leaveDate = employment.leaveDate ? new Date(employment.leaveDate) : null;

    // 입사 전이면 X
    if (joinDate && joinDate > monthEnd) return false;
    // 퇴사 후면 X
    if (leaveDate && leaveDate < monthStart) return false;

    return true;
  };

  // 변경사항 있는지 확인
  const hasChanges = Object.keys(editingWages).length > 0;

  // 통계
  const stats = useMemo(() => {
    let totalRecords = 0;
    let missingRecords = 0;

    businessWorkers.forEach(({ employment }) => {
      months.forEach((yearMonth) => {
        if (isWorkedMonth(employment, yearMonth)) {
          totalRecords++;
          if (!getWageValue(employment.id, yearMonth)) {
            missingRecords++;
          }
        }
      });
    });

    return { totalRecords, missingRecords, completedRecords: totalRecords - missingRecords };
  }, [businessWorkers, months, monthlyWages, editingWages]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">월별 급여 이력</h1>
      <p className="text-white/40 mb-8">상실신고 보수총액 계산을 위한 실제 급여 데이터를 입력합니다</p>

      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">사업장</label>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full input-glass px-4 py-3"
            >
              <option value="">사업장 선택</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full input-glass px-4 py-3"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              저장 {hasChanges && `(${Object.values(editingWages).reduce((a, b) => a + Object.keys(b).length, 0)}건)`}
            </button>
          </div>
        </div>

        {selectedBusiness && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="glass p-4">
              <p className="text-white/40 text-sm">전체</p>
              <p className="text-2xl font-bold text-white">{stats.totalRecords}</p>
            </div>
            <div className="glass p-4">
              <p className="text-white/40 text-sm">입력 완료</p>
              <p className="text-2xl font-bold text-green-400">{stats.completedRecords}</p>
            </div>
            <div className="glass p-4">
              <p className="text-white/40 text-sm">미입력</p>
              <p className="text-2xl font-bold text-red-400">{stats.missingRecords}</p>
            </div>
          </div>
        )}
      </div>

      {/* 엑셀 임포트 섹션 */}
      {selectedBusiness && (
        <div className="glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">엑셀에서 급여 임포트</h2>
          <div className="grid grid-cols-4 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-white/60 mb-2">급여대장 엑셀 파일</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
                className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">적용 월</label>
              <input
                type="month"
                value={importMonth}
                onChange={(e) => setImportMonth(e.target.value)}
                className="w-full input-glass px-4 py-3"
              />
            </div>
            <div>
              <button
                onClick={executeImport}
                disabled={importPreview.length === 0 || !importMonth}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                임포트 실행 ({importPreview.filter((p) => p.matched).length}명)
              </button>
            </div>
          </div>

          {importPreview.length > 0 && (
            <div className="mt-4 max-h-48 overflow-auto">
              <table className="w-full table-glass text-sm">
                <thead className="sticky top-0 bg-black/80">
                  <tr>
                    <th className="px-3 py-2 text-left">이름</th>
                    <th className="px-3 py-2 text-left">주민번호</th>
                    <th className="px-3 py-2 text-right">급여</th>
                    <th className="px-3 py-2 text-center">매칭</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => (
                    <tr key={i} className={row.matched ? '' : 'opacity-50'}>
                      <td className="px-3 py-2 text-white">{row.name}</td>
                      <td className="px-3 py-2 text-white/60 font-mono">{row.residentNo.slice(0, 6)}-***</td>
                      <td className="px-3 py-2 text-right text-white/80">{row.wage.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        {row.matched ? (
                          <span className="text-green-400">O</span>
                        ) : (
                          <span className="text-red-400">X</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedBusiness && (
        <div className="glass p-6 overflow-x-auto max-w-full">
          <table className="table-glass text-sm min-w-max">
            <thead className="sticky top-0 bg-black/80">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-black/80 z-10">이름</th>
                <th className="px-3 py-2 text-left sticky left-[80px] bg-black/80 z-10">입사일</th>
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 text-center min-w-[100px]">
                    {m.split('-')[1]}월
                  </th>
                ))}
                <th className="px-3 py-2 text-right">합계</th>
              </tr>
            </thead>
            <tbody>
              {businessWorkers.map(({ worker, employment }) => {
                const yearTotal = months.reduce((sum, m) => {
                  if (!isWorkedMonth(employment, m)) return sum;
                  return sum + (getWageValue(employment.id, m) || 0);
                }, 0);

                return (
                  <tr key={worker.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-white sticky left-0 bg-black/50">{worker.name}</td>
                    <td className="px-3 py-2 text-white/60 sticky left-[80px] bg-black/50 text-xs">
                      {employment.joinDate || '-'}
                    </td>
                    {months.map((yearMonth) => {
                      const worked = isWorkedMonth(employment, yearMonth);
                      const value = getWageValue(employment.id, yearMonth);
                      const isEdited = editingWages[employment.id]?.[yearMonth] !== undefined;

                      return (
                        <td key={yearMonth} className="px-1 py-1">
                          {worked ? (
                            <input
                              type="text"
                              value={value?.toLocaleString() || ''}
                              onChange={(e) => handleWageChange(employment.id, yearMonth, e.target.value)}
                              placeholder="0"
                              className={`w-full px-2 py-1 text-right text-sm rounded bg-white/5 border ${
                                isEdited
                                  ? 'border-blue-500/50 bg-blue-500/10'
                                  : value
                                  ? 'border-green-500/30'
                                  : 'border-red-500/30'
                              } focus:outline-none focus:border-blue-500`}
                            />
                          ) : (
                            <span className="text-white/20 text-center block">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-white font-medium">
                      {yearTotal > 0 ? yearTotal.toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
