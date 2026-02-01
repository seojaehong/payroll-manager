'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MonthlyWage, Worker, Employment } from '@/types';

export interface ReportsTabProps {
  businessId: string;
  business: any;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  reports: any[];
  addReport: (report: any) => void;
}

export function ReportsTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
  reports,
  addReport,
}: ReportsTabProps) {
  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  // 자동 필터 대상자
  const autoFilteredWorkers = useMemo(() => {
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

  // 표시할 대상자 (전체 or 자동필터)
  const displayWorkers = showAllWorkers ? businessEmployments : autoFilteredWorkers;

  // 자동 선택 (필터 변경 시)
  useMemo(() => {
    setSelectedIds(new Set(autoFilteredWorkers.map(({ worker }) => worker.id)));
  }, [autoFilteredWorkers]);

  const selectedWorkers = businessEmployments.filter(({ worker }) => selectedIds.has(worker.id));

  const toggleWorker = (workerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === displayWorkers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayWorkers.map(({ worker }) => worker.id)));
    }
  };

  // 보수 계산 함수
  const calculateWages = (employmentId: string, leaveDate: string, joinDate: string) => {
    const leaveYear = parseInt(leaveDate.slice(0, 4));
    const leaveMonth = parseInt(leaveDate.slice(5, 7));
    const joinYear = parseInt(joinDate.slice(0, 4));
    const joinMonth = parseInt(joinDate.slice(5, 7));
    const prevYear = leaveYear - 1;

    const empWages = monthlyWages.filter((mw) => mw.employmentId === employmentId);

    let currentYearTotal = 0, currentYearMonths = 0;
    for (let m = 1; m <= leaveMonth; m++) {
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      const wage = empWages.find((w) => w.yearMonth === ym);
      if (wage) { currentYearTotal += wage.totalWage; currentYearMonths++; }
    }

    let prevYearTotal = 0, prevYearMonths = 0;
    if (joinYear <= prevYear) {
      const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        const wage = empWages.find((w) => w.yearMonth === ym);
        if (wage) { prevYearTotal += wage.totalWage; prevYearMonths++; }
      }
    }

    return { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths };
  };

  // 급여 데이터 누락 확인
  const getMissingWageData = (employmentId: string, leaveDate: string, joinDate: string) => {
    const leaveYear = parseInt(leaveDate.slice(0, 4));
    const leaveMonth = parseInt(leaveDate.slice(5, 7));
    const joinYear = parseInt(joinDate.slice(0, 4));
    const joinMonth = parseInt(joinDate.slice(5, 7));
    const prevYear = leaveYear - 1;

    const missing: string[] = [];
    const empWages = monthlyWages.filter((mw) => mw.employmentId === employmentId);

    for (let m = 1; m <= leaveMonth; m++) {
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      if (!empWages.find((w) => w.yearMonth === ym)) missing.push(ym);
    }

    if (joinYear <= prevYear) {
      const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        if (!empWages.find((w) => w.yearMonth === ym)) missing.push(ym);
      }
    }

    return missing;
  };

  // 취득신고 생성
  const generateAcquireExcel = () => {
    if (selectedWorkers.length === 0) return alert('대상자를 선택하세요.');

    const header = [
      '*주민등록번호', '*성명', '*대표자여부', '영문성명', '국적', '체류자격',
      '*소득월액', '*자격취득일', '*취득월납부', '*취득부호', '특수직종', '상이사유', '직역연금',
      '*피부양자', '*보수월액', '*자격취득일', '*취득부호', '감면부호', '회계명', '직종명',
      '*월평균보수', '*자격취득일', '*직종부호', '*근로시간', '부과구분', '부과사유', '*계약직', '종료일',
      '*월평균보수', '*자격취득일', '직종부호', '근로시간', '부과구분', '부과사유', '계약직', '종료일',
    ];

    const dataRows = selectedWorkers.map(({ worker, employment }) => {
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
        employment.sjYn ? employment.monthlyWage : '', employment.sjYn ? dt : '', '', '', '', '', '', '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '취득신고');

    const fileName = `취득신고_${business.name}_${targetMonth.replace('-', '')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    addReport({
      id: crypto.randomUUID(), businessId, type: 'ACQUIRE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: selectedWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  // 상실신고 생성
  const generateLoseExcel = () => {
    if (selectedWorkers.length === 0) return alert('대상자를 선택하세요.');

    // 급여 데이터 누락 확인
    const missingData: { name: string; missing: string[] }[] = [];
    selectedWorkers.forEach(({ worker, employment }) => {
      if (!employment.leaveDate || !employment.joinDate) return;
      const missing = getMissingWageData(employment.id, employment.leaveDate, employment.joinDate);
      if (missing.length > 0) missingData.push({ name: worker.name, missing });
    });

    if (missingData.length > 0) {
      const msg = missingData.map(({ name, missing }) =>
        `${name}: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` 외 ${missing.length - 3}건` : ''}`
      ).join('\n');
      alert(`급여 데이터가 누락되었습니다.\n[급여 이력] 탭에서 먼저 입력해주세요.\n\n${msg}`);
      return;
    }

    const header = [
      '성명', '주민등록번호', '지역번호', '국번', '뒷번호',
      '연금상실일', '연금상실부호', '납부여부',
      '건강상실일', '건강상실부호', '당해보수총액', '당해근무월수', '전년보수총액', '전년근무월수',
      '고용상실일', '상실사유코드', '구체적사유', '당해보수총액', '전년보수총액',
      '산재상실일', '당해보수총액', '전년보수총액'
    ];

    const dataRows = selectedWorkers.map(({ worker, employment }) => {
      const dt = employment.leaveDate?.replace(/-/g, '') || '';
      const phone = worker.phone?.split('-') || ['', '', ''];
      const { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths } =
        calculateWages(employment.id, employment.leaveDate!, employment.joinDate);

      return [
        worker.name, worker.residentNo, phone[0], phone[1], phone[2],
        employment.npsYn ? dt : '', employment.npsYn ? (employment.leaveReason || '11') : '', '',
        employment.nhicYn ? dt : '', employment.nhicYn ? (employment.leaveReason || '11') : '',
        employment.nhicYn ? currentYearTotal : '', employment.nhicYn ? currentYearMonths : '',
        employment.nhicYn ? prevYearTotal : '', employment.nhicYn ? prevYearMonths : '',
        employment.gyYn ? dt : '', employment.gyYn ? (employment.leaveReason || '11') : '', '',
        employment.gyYn ? currentYearTotal : '', employment.gyYn ? prevYearTotal : '',
        employment.sjYn ? dt : '', employment.sjYn ? currentYearTotal : '', employment.sjYn ? prevYearTotal : ''
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상실신고');

    const fileName = `상실신고_${business.name}_${targetMonth.replace('-', '')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    addReport({
      id: crypto.randomUUID(), businessId, type: 'LOSE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: selectedWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  const handleGenerate = () => {
    if (reportType === 'ACQUIRE') generateAcquireExcel();
    else generateLoseExcel();
  };

  const bizReports = reports.filter((r) => r.businessId === businessId);

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
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
          <label className="flex items-center gap-2 text-white/60 cursor-pointer h-[50px]">
            <input
              type="checkbox"
              checked={showAllWorkers}
              onChange={(e) => setShowAllWorkers(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">전체 표시</span>
          </label>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={selectedWorkers.length === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {reportType === 'ACQUIRE' ? '취득' : '상실'}신고 생성 ({selectedWorkers.length}명)
          </button>
        </div>
      </div>

      <h4 className="text-white font-medium mb-3">대상자 ({displayWorkers.length}명)</h4>
      {displayWorkers.length === 0 ? (
        <p className="text-white/40 text-center py-8">해당 월에 {reportType === 'ACQUIRE' ? '입사' : '퇴사'}한 근로자가 없습니다</p>
      ) : (
        <table className="w-full table-glass text-sm mb-6">
          <thead>
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === displayWorkers.length && displayWorkers.length > 0}
                  onChange={() => {
                    if (selectedIds.size === displayWorkers.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(displayWorkers.map(({ worker }) => worker.id)));
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
            {displayWorkers.map(({ worker, employment }) => (
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
