'use client';

import { useStore } from '@/store/useStore';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonthPicker } from '@/components/ui/MonthPicker';

export default function ReportsPage() {
  const businesses = useStore((state) => state.businesses);
  const workers = useStore((state) => state.workers);
  const employments = useStore((state) => state.employments);
  const monthlyWages = useStore((state) => state.monthlyWages);
  const addReport = useStore((state) => state.addReport);
  const selectedBusiness = useStore((state) => state.selectedBusinessId);

  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  // 사업장 변경 시 선택 초기화
  useEffect(() => {
    setSelectedWorkerIds(new Set());
    setShowAllWorkers(false);
  }, [selectedBusiness]);

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
    if (!selectedBusiness) return;
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business || targetWorkers.length === 0) return alert('대상 근로자가 없습니다.');

    // 그룹 헤더 (Row 0)
    const groupHeader = [
      '가입자정보', '', '', '', '', '',
      '국민연금(소득월액상이사유는 국민연금 소속 직원이 접수하는 경우에만 입력합니다.)', '', '', '', '', '', '',
      '건강보험', '', '', '', '', '', '',
      '고용보험', '', '', '', '', '', '', '',
      '산재보험', '', '', '', '', '', '', '',
      '비고', ''
    ];

    // 컬럼 헤더 (Row 1)
    const columnHeader = [
      '*주민등록번호', '*성명', '*대표자여부', '영문성명(외국인)', '국적', '체류자격',
      '*소득월액', '*자격취득일', '*취득월납부여부', '*자격취득부호', '특수직종부호', '소득월액상이사유(1.국외근로수당 , 2.사후정산)', '직역연금구분(1.직역연금가입자, 2.직역연금수급권자, 0.없음)',
      '*피부양자신청', '*보수월액', '*자격취득일', '*자격취득부호', '보험료/감면부호', '공무원/교직원(회계명)', '공무원/교직원(직종명)',
      '*월평균보수', '*자격취득일', '*직종부호', '*주소정근로시간', '보험료부과구분(부호)', '보험료부과구분(사유)', '*계약직여부', '계약종료년월',
      '*월평균보수', '*자격취득일', '직종부호', '주소정근로시간', '보험료부과구분(부호)', '보험료부과구분(사유)', '계약직여부', '계약종료년월',
      '오류메세지', '경고메세지'
    ];

    const dataRows = targetWorkers.map(({ worker, employment }) => {
      const dt = employment.joinDate.replace(/-/g, '');
      const rno = worker.residentNo.replace(/-/g, '');
      return [
        rno, worker.name, employment.isRepresentative ? 'Y' : 'N',
        worker.englishName || '', worker.nationality || '100', worker.stayStatus || '',
        employment.npsYn ? employment.monthlyWage : '', employment.npsYn ? dt : '',
        employment.npsYn ? '1' : '', employment.npsYn ? '1' : '', '', '', '0',
        employment.nhicYn ? 'N' : '', employment.nhicYn ? employment.monthlyWage : '',
        employment.nhicYn ? dt : '', employment.nhicYn ? '00' : '', '', '', '',
        employment.gyYn ? employment.monthlyWage : '', employment.gyYn ? dt : '',
        employment.gyYn ? employment.jikjongCode : '', employment.gyYn ? employment.workHours : '',
        '', '', employment.isContract ? '1' : '2', employment.isContract ? employment.contractEndDate?.replace(/-/g, '') : '',
        employment.sjYn ? employment.monthlyWage : '', employment.sjYn ? dt : '', '', '', '', '', '', '',
        '', ''
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([groupHeader, columnHeader, ...dataRows]);
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

  // 급여 데이터 누락 확인
  const getMissingWageData = (employmentId: string, leaveDate: string, joinDate: string) => {
    const leaveYear = parseInt(leaveDate.slice(0, 4));
    const leaveMonth = parseInt(leaveDate.slice(5, 7));
    const joinYear = parseInt(joinDate.slice(0, 4));
    const joinMonth = parseInt(joinDate.slice(5, 7));
    const prevYear = leaveYear - 1;

    const missing: string[] = [];
    const empWages = monthlyWages.filter((mw) => mw.employmentId === employmentId);

    // 당해년도 체크 (1월 ~ 퇴사월)
    for (let m = 1; m <= leaveMonth; m++) {
      // 입사 전 월은 제외
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      if (!empWages.find((w) => w.yearMonth === ym)) {
        missing.push(ym);
      }
    }

    // 전년도 체크 (입사월 또는 1월 ~ 12월)
    const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
    // 입사가 전년도 이전이면 전년도 전체 체크
    if (joinYear <= prevYear) {
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        if (!empWages.find((w) => w.yearMonth === ym)) {
          missing.push(ym);
        }
      }
    }

    return missing;
  };

  // 실제 보수 계산
  const calculateWages = (employmentId: string, leaveDate: string, joinDate: string) => {
    const leaveYear = parseInt(leaveDate.slice(0, 4));
    const leaveMonth = parseInt(leaveDate.slice(5, 7));
    const joinYear = parseInt(joinDate.slice(0, 4));
    const joinMonth = parseInt(joinDate.slice(5, 7));
    const prevYear = leaveYear - 1;

    const empWages = monthlyWages.filter((mw) => mw.employmentId === employmentId);

    // 당해년도 계산
    let currentYearTotal = 0;
    let currentYearMonths = 0;
    for (let m = 1; m <= leaveMonth; m++) {
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      const wage = empWages.find((w) => w.yearMonth === ym);
      if (wage) {
        currentYearTotal += wage.totalWage;
        currentYearMonths++;
      }
    }

    // 전년도 계산
    let prevYearTotal = 0;
    let prevYearMonths = 0;
    if (joinYear <= prevYear) {
      const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        const wage = empWages.find((w) => w.yearMonth === ym);
        if (wage) {
          prevYearTotal += wage.totalWage;
          prevYearMonths++;
        }
      }
    }

    return { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths };
  };

  const generateLoseExcel = () => {
    if (!selectedBusiness) return;
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business || targetWorkers.length === 0) return alert('대상 근로자가 없습니다.');

    // 급여 데이터 누락 확인
    const missingData: { name: string; missing: string[] }[] = [];
    targetWorkers.forEach(({ worker, employment }) => {
      if (!employment.leaveDate || !employment.joinDate) return;
      const missing = getMissingWageData(employment.id, employment.leaveDate, employment.joinDate);
      if (missing.length > 0) {
        missingData.push({ name: worker.name, missing });
      }
    });

    if (missingData.length > 0) {
      const msg = missingData
        .map(({ name, missing }) => `${name}: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` 외 ${missing.length - 5}건` : ''}`)
        .join('\n');
      alert(`급여 데이터가 누락되었습니다.\n[급여 이력] 메뉴에서 먼저 입력해주세요.\n\n${msg}`);
      return;
    }

    const header = [
      '성명', '주민(외국인)등록번호국내거소신고번호', '전화(지역번호)', '전화(국번)', '전화(뒷번호)',
      '국민연금상실일', '국민연금상실부호', '국민연금초일취득당월상실자납부여부',
      '건강보험상실일', '건강보험상실부호', '건강보험당해년도보수총액', '건강보험당해년도근무개월수', '건강보험전년도보수총액', '건강보험전년도근무개월수',
      '고용보험상실연월일', '고용보험상실사유구분코드', '고용보험구체적사유', '고용보험해당연도보수총액', '고용보험전년도보수총액',
      '산재보험상실연월일', '산재보험해당연도보수총액', '산재보험전년도보수총액'
    ];

    const dataRows = targetWorkers.map(({ worker, employment }) => {
      const dt = employment.leaveDate?.replace(/-/g, '') || '';
      const phone = worker.phone?.split('-') || ['', '', ''];
      const rno = worker.residentNo.replace(/-/g, '');

      const { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths } =
        calculateWages(employment.id, employment.leaveDate!, employment.joinDate);

      return [
        worker.name, rno, phone[0], phone[1], phone[2],
        // 연금
        employment.npsYn ? dt : '', employment.npsYn ? (employment.leaveReason || '11') : '', '',
        // 건강 (당해/전년 분리)
        employment.nhicYn ? dt : '', employment.nhicYn ? (employment.leaveReason || '11') : '',
        employment.nhicYn ? currentYearTotal : '', employment.nhicYn ? currentYearMonths : '',
        employment.nhicYn ? prevYearTotal : '', employment.nhicYn ? prevYearMonths : '',
        // 고용 (당해/전년 분리)
        employment.gyYn ? dt : '', employment.gyYn ? (employment.leaveReason || '11') : '', '',
        employment.gyYn ? currentYearTotal : '', employment.gyYn ? prevYearTotal : '',
        // 산재 (당해/전년 분리)
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
      <PageHeader
        breadcrumbs={[{ label: '신고서 생성' }]}
        title="신고서 생성"
        description="취득/상실 신고 엑셀을 생성합니다"
      />

      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
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
            <MonthPicker
              value={targetMonth}
              onChange={handleMonthChange}
            />
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
        {displayWorkers.length === 0 ? (
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
