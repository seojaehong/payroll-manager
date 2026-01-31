'use client';

import { useStore } from '@/store/useStore';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function ReportsPage() {
  const { businesses, workers, employments, addReport } = useStore();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  // 전체 근로자 목록 (선택 가능)
  const allWorkers = useMemo(() => {
    if (!selectedBusiness) return [];
    const businessEmployments = employments.filter((e) => e.businessId === selectedBusiness);
    return businessEmployments.map((e) => ({
      employment: e,
      worker: workers.find((w) => w.id === e.workerId)!,
    })).filter(({ worker }) => worker);
  }, [selectedBusiness, employments, workers]);

  // 자동 필터된 대상자 (기존 로직)
  const autoFilteredWorkers = useMemo(() => {
    if (!selectedBusiness) return [];
    const businessEmployments = employments.filter((e) => e.businessId === selectedBusiness);

    if (reportType === 'ACQUIRE') {
      return businessEmployments
        .filter((e) => e.joinDate && e.joinDate.startsWith(targetMonth) && e.status === 'ACTIVE')
        .map((e) => ({ employment: e, worker: workers.find((w) => w.id === e.workerId)! }))
        .filter(({ worker }) => worker);
    } else {
      return businessEmployments
        .filter((e) => e.leaveDate?.startsWith(targetMonth))
        .map((e) => ({ employment: e, worker: workers.find((w) => w.id === e.workerId)! }))
        .filter(({ worker }) => worker);
    }
  }, [selectedBusiness, employments, workers, reportType, targetMonth]);

  // 표시할 근로자 목록
  const displayWorkers = showAllWorkers ? allWorkers : autoFilteredWorkers;

  // 선택된 근로자만 필터
  const targetWorkers = displayWorkers.filter(({ worker }) => selectedWorkerIds.has(worker.id));

  // 자동 필터 적용 시 선택 초기화
  const handleFilterChange = () => {
    const newSelected = new Set(autoFilteredWorkers.map(({ worker }) => worker.id));
    setSelectedWorkerIds(newSelected);
  };

  // 사업장/유형/월 변경 시 자동 선택
  const handleBusinessChange = (bizId: string) => {
    setSelectedBusiness(bizId);
    setSelectedWorkerIds(new Set());
    setShowAllWorkers(false);
  };

  const handleTypeChange = (type: 'ACQUIRE' | 'LOSE') => {
    setReportType(type);
    setTimeout(handleFilterChange, 0);
  };

  const handleMonthChange = (month: string) => {
    setTargetMonth(month);
    setTimeout(handleFilterChange, 0);
  };

  // 체크박스 토글
  const toggleWorker = (workerId: string) => {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (selectedWorkerIds.size === displayWorkers.length) {
      setSelectedWorkerIds(new Set());
    } else {
      setSelectedWorkerIds(new Set(displayWorkers.map(({ worker }) => worker.id)));
    }
  };

  const generateAcquireExcel = () => {
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business || targetWorkers.length === 0) return alert('대상 근로자가 없습니다.');

    const header = [
      '*주민등록번호', '*성명', '*대표자여부', '영문성명', '국적', '체류자격',
      '*소득월액', '*자격취득일', '*취득월납부', '*취득부호', '특수직종', '상이사유', '직역연금',
      '*피부양자', '*보수월액', '*자격취득일', '*취득부호', '감면부호', '회계명', '직종명',
      '*월평균보수', '*자격취득일', '*직종부호', '*근로시간', '부과구분', '부과사유', '*계약직', '종료일',
      '*월평균보수', '*자격취득일', '직종부호', '근로시간', '부과구분', '부과사유', '계약직', '종료일',
      '오류메세지', '경고메세지'
    ];

    const dataRows = targetWorkers.map(({ worker, employment }) => {
      const dt = employment.joinDate.replace(/-/g, '');
      return [
        worker.residentNo, worker.name, employment.isRepresentative ? 'Y' : 'N',
        worker.englishName || '', worker.nationality || '100', worker.stayStatus || '',
        employment.npsYn ? employment.monthlyWage : '', employment.npsYn ? dt : '',
        employment.npsYn ? '1' : '', employment.npsYn ? '1' : '', '', '', '0',
        employment.nhicYn ? 'N' : '', employment.nhicYn ? employment.monthlyWage : '',
        employment.nhicYn ? dt : '', employment.nhicYn ? '00' : '', '', '', '',
        employment.gyYn ? employment.monthlyWage : '', employment.gyYn ? dt : '',
        employment.gyYn ? employment.jikjongCode : '', employment.gyYn ? employment.workHours : '',
        '', '', employment.isContract ? '1' : '2', employment.isContract ? employment.contractEndDate?.replace(/-/g, '') : '',
        employment.sjYn ? employment.monthlyWage : '', employment.sjYn ? dt : '', '', '', '', '', '', '', '', ''
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '취득신고');

    const fileName = `취득신고_${business.name}_${targetMonth.replace('-', '')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    addReport({
      id: crypto.randomUUID(), businessId: selectedBusiness, type: 'ACQUIRE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: targetWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  const generateLoseExcel = () => {
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business || targetWorkers.length === 0) return alert('대상 근로자가 없습니다.');

    const header = [
      '성명', '주민등록번호', '지역번호', '국번', '뒷번호',
      '연금상실일', '연금상실부호', '납부여부',
      '건강상실일', '건강상실부호', '당해보수총액', '당해근무월수', '전년보수총액', '전년근무월수',
      '고용상실일', '상실사유코드', '구체적사유', '당해보수총액', '전년보수총액',
      '산재상실일', '당해보수총액', '전년보수총액'
    ];

    const dataRows = targetWorkers.map(({ worker, employment }) => {
      const dt = employment.leaveDate?.replace(/-/g, '') || '';
      const phone = worker.phone?.split('-') || ['', '', ''];
      const jY = parseInt(employment.joinDate.slice(0, 4));
      const lY = parseInt(employment.leaveDate?.slice(0, 4) || new Date().getFullYear().toString());
      const jM = parseInt(employment.joinDate.slice(5, 7));
      const lM = parseInt(employment.leaveDate?.slice(5, 7) || (new Date().getMonth() + 1).toString());
      const months = Math.min((lY - jY) * 12 + (lM - jM) + 1, 12);
      const wage = employment.monthlyWage * months;

      return [
        worker.name, worker.residentNo, phone[0], phone[1], phone[2],
        employment.npsYn ? dt : '', employment.npsYn ? (employment.leaveReason || '11') : '', '',
        employment.nhicYn ? dt : '', employment.nhicYn ? (employment.leaveReason || '11') : '',
        employment.nhicYn ? wage : '', employment.nhicYn ? months : '', '', '',
        employment.gyYn ? dt : '', employment.gyYn ? (employment.leaveReason || '11') : '', '',
        employment.gyYn ? wage : '', '',
        employment.sjYn ? dt : '', employment.sjYn ? wage : '', ''
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상실신고');

    const fileName = `상실신고_${business.name}_${targetMonth.replace('-', '')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    addReport({
      id: crypto.randomUUID(), businessId: selectedBusiness, type: 'LOSE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: targetWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  const handleGenerate = () => {
    if (reportType === 'ACQUIRE') generateAcquireExcel();
    else generateLoseExcel();
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">신고서 생성</h1>
      <p className="text-white/40 mb-8">취득/상실 신고 엑셀을 생성합니다</p>

      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">신고 유형</label>
            <select
              value={reportType}
              onChange={(e) => handleTypeChange(e.target.value as 'ACQUIRE' | 'LOSE')}
              className="w-full input-glass px-4 py-3"
            >
              <option value="ACQUIRE">취득신고 (입사)</option>
              <option value="LOSE">상실신고 (퇴사)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">대상 월</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full input-glass px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">사업장</label>
            <select
              value={selectedBusiness}
              onChange={(e) => handleBusinessChange(e.target.value)}
              className="w-full input-glass px-4 py-3"
            >
              <option value="">사업장 선택</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={handleGenerate}
            disabled={!selectedBusiness || targetWorkers.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reportType === 'ACQUIRE' ? '취득' : '상실'}신고 엑셀 생성 ({targetWorkers.length}명)
          </button>
          <label className="flex items-center gap-2 text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllWorkers}
              onChange={(e) => setShowAllWorkers(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20"
            />
            <span className="text-sm">전체 근로자 표시</span>
          </label>
        </div>
      </div>

      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {showAllWorkers ? '전체' : '대상'} 근로자 ({displayWorkers.length}명)
            {selectedWorkerIds.size > 0 && <span className="text-blue-400 ml-2">/ 선택: {selectedWorkerIds.size}명</span>}
          </h2>
          {displayWorkers.length > 0 && (
            <button onClick={toggleAll} className="btn-secondary text-sm">
              {selectedWorkerIds.size === displayWorkers.length ? '전체 해제' : '전체 선택'}
            </button>
          )}
        </div>
        {!selectedBusiness ? (
          <p className="text-white/40 text-center py-12">사업장을 선택하세요</p>
        ) : displayWorkers.length === 0 ? (
          <p className="text-white/40 text-center py-12">
            {showAllWorkers ? '등록된 근로자가 없습니다' : `${targetMonth}에 ${reportType === 'ACQUIRE' ? '입사' : '퇴사'}한 근로자가 없습니다`}
          </p>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full table-glass">
              <thead className="sticky top-0 bg-black/50">
                <tr className="text-left">
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedWorkerIds.size === displayWorkers.length && displayWorkers.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded bg-white/10 border-white/20"
                    />
                  </th>
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">주민등록번호</th>
                  <th className="px-4 py-3">입사일</th>
                  <th className="px-4 py-3">퇴사일</th>
                  <th className="px-4 py-3">월평균보수</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {displayWorkers.map(({ worker, employment }) => {
                  const isSelected = selectedWorkerIds.has(worker.id);
                  const isAutoTarget = autoFilteredWorkers.some(({ worker: w }) => w.id === worker.id);
                  return (
                    <tr
                      key={worker.id}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                      onClick={() => toggleWorker(worker.id)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWorker(worker.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded bg-white/10 border-white/20"
                        />
                      </td>
                      <td className="px-4 py-3 text-white">
                        {worker.name}
                        {isAutoTarget && <span className="ml-2 text-xs text-green-400">(자동)</span>}
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
