'use client';

import { useStore } from '@/store/useStore';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function ReportsPage() {
  const { businesses, workers, employments, addReport } = useStore();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));

  const getTargetWorkers = () => {
    if (!selectedBusiness) return [];
    const businessEmployments = employments.filter((e) => e.businessId === selectedBusiness);

    if (reportType === 'ACQUIRE') {
      return businessEmployments
        .filter((e) => e.joinDate.startsWith(targetMonth) && e.status === 'ACTIVE')
        .map((e) => ({ employment: e, worker: workers.find((w) => w.id === e.workerId)! }));
    } else {
      return businessEmployments
        .filter((e) => e.leaveDate?.startsWith(targetMonth))
        .map((e) => ({ employment: e, worker: workers.find((w) => w.id === e.workerId)! }));
    }
  };

  const targetWorkers = getTargetWorkers();

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
              onChange={(e) => setReportType(e.target.value as 'ACQUIRE' | 'LOSE')}
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
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full input-glass px-4 py-3"
            />
          </div>
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
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={!selectedBusiness || targetWorkers.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reportType === 'ACQUIRE' ? '취득' : '상실'}신고 엑셀 생성
          </button>
        </div>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          대상 근로자 ({targetWorkers.length}명)
        </h2>
        {!selectedBusiness ? (
          <p className="text-white/40 text-center py-12">사업장을 선택하세요</p>
        ) : targetWorkers.length === 0 ? (
          <p className="text-white/40 text-center py-12">
            {targetMonth}에 {reportType === 'ACQUIRE' ? '입사' : '퇴사'}한 근로자가 없습니다
          </p>
        ) : (
          <table className="w-full table-glass">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">주민등록번호</th>
                <th className="px-4 py-3">{reportType === 'ACQUIRE' ? '입사일' : '퇴사일'}</th>
                <th className="px-4 py-3">월평균보수</th>
                <th className="px-4 py-3">4대보험</th>
              </tr>
            </thead>
            <tbody>
              {targetWorkers.map(({ worker, employment }) => (
                <tr key={worker.id}>
                  <td className="px-4 py-3 text-white">{worker.name}</td>
                  <td className="px-4 py-3 text-white/60 font-mono">{worker.residentNo.slice(0, 6)}-*******</td>
                  <td className="px-4 py-3 text-white/60">
                    {reportType === 'ACQUIRE' ? employment.joinDate : employment.leaveDate}
                  </td>
                  <td className="px-4 py-3 text-white/60">{employment.monthlyWage.toLocaleString()}원</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {employment.gyYn && <span className="badge badge-info">고용</span>}
                      {employment.sjYn && <span className="badge badge-warning">산재</span>}
                      {employment.npsYn && <span className="badge badge-success">연금</span>}
                      {employment.nhicYn && <span className="badge" style={{background: 'rgba(168,85,247,0.2)', color: '#a855f7'}}>건강</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
