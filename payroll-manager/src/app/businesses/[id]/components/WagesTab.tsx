'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { MonthlyWage, Worker, Employment, FieldGroups } from '@/types';
import { useExcelImport, parseExcelNumber, indexToColumnLetter } from '@/hooks/useExcelImport';

interface WagesTabProps {
  businessId: string;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  addMonthlyWages: (wages: MonthlyWage[]) => void;
  excelMappings: any[];
  workers: Worker[];
  setExcelMapping: (mapping: any) => void;
}

// 필드 정의 - 지급내역, 공제내역 포함
const FIELD_GROUPS: FieldGroups = {
  '기본정보': [
    { key: 'name', label: '이름', required: true },
    { key: 'residentNo', label: '주민번호', required: true },
  ],
  '지급내역': [
    { key: 'basicWage', label: '기본급' },
    { key: 'overtimeWeekday', label: '연장근로(평일)' },
    { key: 'overtimeWeekend', label: '연장근로(주말)' },
    { key: 'nightWage', label: '야간근로' },
    { key: 'holidayWage', label: '휴일근로' },
    { key: 'annualLeaveWage', label: '연차수당' },
    { key: 'bonusWage', label: '상여금' },
    { key: 'mealAllowance', label: '식대' },
    { key: 'carAllowance', label: '차량유지비' },
    { key: 'otherWage', label: '기타수당' },
    { key: 'totalWage', label: '임금총액', required: true },
  ],
  '공제내역': [
    { key: 'incomeTax', label: '소득세' },
    { key: 'localTax', label: '주민세' },
    { key: 'nps', label: '국민연금' },
    { key: 'nhic', label: '건강보험' },
    { key: 'ltc', label: '장기요양보험' },
    { key: 'ei', label: '고용보험' },
    { key: 'advancePayment', label: '기지급액' },
    { key: 'otherDeduction', label: '기타공제' },
    { key: 'totalDeduction', label: '공제액계' },
    { key: 'netWage', label: '실지급액' },
  ],
  '근무정보': [
    { key: 'workDays', label: '근무일수' },
    { key: 'deductionDays', label: '공제일수' },
    { key: 'deductionHours', label: '공제시간' },
  ],
};

export function WagesTab({
  businessId,
  businessEmployments,
  monthlyWages,
  selectedYear,
  setSelectedYear,
  addMonthlyWages,
  excelMappings,
  workers,
  setExcelMapping,
}: WagesTabProps) {
  const [importMonth, setImportMonth] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // 다중 파일 일괄 업로드
  const [batchFiles, setBatchFiles] = useState<{ file: File; yearMonth: string }[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // 공통 훅 사용
  const excel = useExcelImport({ defaultHeaderRow: 4, defaultDataStartRow: 6 });

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

  // 기존 매핑 로드
  const loadExistingMapping = () => {
    const existing = excelMappings.find((m: any) => m.businessId === businessId);
    if (existing) {
      excel.applyMapping({
        sheetName: existing.sheetName,
        headerRow: existing.headerRow,
        dataStartRow: existing.dataStartRow,
        columns: existing.columns,
      });
      return existing.sheetName;
    }
    return null;
  };

  // 파일 업로드 (단일/다중)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 다중 파일인 경우
    if (files.length > 1) {
      const batch: { file: File; yearMonth: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const match = file.name.match(/(\d{4})[-_]?(\d{2})/);
        if (match) {
          batch.push({ file, yearMonth: `${match[1]}-${match[2]}` });
        }
      }
      if (batch.length > 0) {
        // 년월 순으로 정렬
        batch.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        setBatchFiles(batch);
        setBatchMode(true);
        // 첫 번째 파일로 매핑 설정
        excel.handleFileUpload(batch[0].file, () => {
          loadExistingMapping();
          setShowMappingModal(true);
        });
      } else {
        alert('파일명에서 년월을 추출할 수 없습니다. (예: 202501_급여.xlsx)');
      }
    } else {
      // 단일 파일
      const file = files[0];
      const fileNameMatch = file.name.match(/(\d{4})[-_]?(\d{2})/);
      if (fileNameMatch) {
        setImportMonth(`${fileNameMatch[1]}-${fileNameMatch[2]}`);
      }
      setBatchMode(false);
      setBatchFiles([]);

      excel.handleFileUpload(file, (wb, autoSheet) => {
        const savedSheet = loadExistingMapping();
        if (savedSheet && wb.SheetNames.includes(savedSheet)) {
          excel.handleSheetChange(savedSheet);
        }
        setShowMappingModal(true);
      });
    }

    e.target.value = '';
  };

  // 다중 파일 일괄 처리
  const executeBatchImport = async () => {
    if (batchFiles.length === 0) return;

    setBatchProcessing(true);
    let totalImported = 0;

    for (const { file, yearMonth } of batchFiles) {
      // 파일 읽기
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsBinaryString(file);
      });

      const wb = XLSX.read(data, { type: 'binary' });
      const savedSheet = excelMappings.find((m: any) => m.businessId === businessId)?.sheetName || wb.SheetNames[0];
      const ws = wb.Sheets[savedSheet];
      if (!ws) continue;

      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      const fm = excel.fieldMapping;
      const nameIdx = fm.name;
      const residentNoIdx = fm.residentNo;

      if (nameIdx == null || residentNoIdx == null) continue;

      const newWages: MonthlyWage[] = [];

      for (let i = excel.dataStartRow - 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || !row[nameIdx]) continue;

        const name = String(row[nameIdx] || '').trim();
        let residentNo = String(row[residentNoIdx] || '').replace(/-/g, '').trim();
        if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
          residentNo = residentNo.padStart(13, '0');
        }

        const totalWage = parseExcelNumber(row[fm.totalWage!]) || 0;
        if (!name || totalWage === 0) continue;

        const matchedWorker = workers.find((w) => w.residentNo === residentNo);
        if (!matchedWorker) continue;

        const matchedEmp = businessEmployments.find(({ worker }) => worker.id === matchedWorker.id);
        if (!matchedEmp) continue;

        newWages.push({
          id: `${matchedEmp.employment.id}-${yearMonth}`,
          employmentId: matchedEmp.employment.id,
          yearMonth,
          totalWage,
          basicWage: parseExcelNumber(row[fm.basicWage!]),
          overtimeWeekday: parseExcelNumber(row[fm.overtimeWeekday!]),
          overtimeWeekend: parseExcelNumber(row[fm.overtimeWeekend!]),
          nightWage: parseExcelNumber(row[fm.nightWage!]),
          holidayWage: parseExcelNumber(row[fm.holidayWage!]),
          annualLeaveWage: parseExcelNumber(row[fm.annualLeaveWage!]),
          bonusWage: parseExcelNumber(row[fm.bonusWage!]),
          mealAllowance: parseExcelNumber(row[fm.mealAllowance!]),
          carAllowance: parseExcelNumber(row[fm.carAllowance!]),
          otherWage: parseExcelNumber(row[fm.otherWage!]),
          incomeTax: parseExcelNumber(row[fm.incomeTax!]),
          localTax: parseExcelNumber(row[fm.localTax!]),
          nps: parseExcelNumber(row[fm.nps!]),
          nhic: parseExcelNumber(row[fm.nhic!]),
          ltc: parseExcelNumber(row[fm.ltc!]),
          ei: parseExcelNumber(row[fm.ei!]),
          advancePayment: parseExcelNumber(row[fm.advancePayment!]),
          otherDeduction: parseExcelNumber(row[fm.otherDeduction!]),
          totalDeduction: parseExcelNumber(row[fm.totalDeduction!]),
          netWage: parseExcelNumber(row[fm.netWage!]),
          workDays: parseExcelNumber(row[fm.workDays!]),
          deductionDays: parseExcelNumber(row[fm.deductionDays!]),
          deductionHours: parseExcelNumber(row[fm.deductionHours!]),
          createdAt: new Date(),
        });
      }

      if (newWages.length > 0) {
        addMonthlyWages(newWages);
        totalImported += newWages.length;
      }
    }

    setBatchProcessing(false);
    setBatchMode(false);
    setBatchFiles([]);
    setShowMappingModal(false);
    alert(`일괄 임포트 완료! ${batchFiles.length}개 파일, 총 ${totalImported}건 저장`);
  };

  // 미리보기 로드
  const loadPreview = () => {
    if (!excel.workbook || !excel.selectedSheet) return;

    const nameIdx = excel.fieldMapping.name;
    const residentNoIdx = excel.fieldMapping.residentNo;
    const totalWageIdx = excel.fieldMapping.totalWage;

    if (nameIdx == null || residentNoIdx == null) {
      alert('이름과 주민번호 헤더를 선택해주세요.');
      return;
    }

    const ws = excel.workbook.Sheets[excel.selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    const preview: any[] = [];

    for (let i = excel.dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || !row[nameIdx]) continue;

      const name = String(row[nameIdx] || '').trim();
      let residentNo = String(row[residentNoIdx] || '').replace(/-/g, '').trim();
      if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
        residentNo = residentNo.padStart(13, '0');
      }

      const totalWage = parseExcelNumber(row[totalWageIdx!]) || 0;
      if (!name || totalWage === 0) continue;

      const matchedWorker = workers.find((w) => w.residentNo === residentNo);
      const matchedEmp = matchedWorker
        ? businessEmployments.find(({ worker }) => worker.id === matchedWorker.id)
        : null;

      const fm = excel.fieldMapping;
      preview.push({
        name,
        residentNo,
        matched: !!matchedEmp,
        totalWage,
        // 지급내역
        basicWage: parseExcelNumber(row[fm.basicWage!]),
        overtimeWeekday: parseExcelNumber(row[fm.overtimeWeekday!]),
        overtimeWeekend: parseExcelNumber(row[fm.overtimeWeekend!]),
        nightWage: parseExcelNumber(row[fm.nightWage!]),
        holidayWage: parseExcelNumber(row[fm.holidayWage!]),
        annualLeaveWage: parseExcelNumber(row[fm.annualLeaveWage!]),
        bonusWage: parseExcelNumber(row[fm.bonusWage!]),
        mealAllowance: parseExcelNumber(row[fm.mealAllowance!]),
        carAllowance: parseExcelNumber(row[fm.carAllowance!]),
        otherWage: parseExcelNumber(row[fm.otherWage!]),
        // 공제내역
        incomeTax: parseExcelNumber(row[fm.incomeTax!]),
        localTax: parseExcelNumber(row[fm.localTax!]),
        nps: parseExcelNumber(row[fm.nps!]),
        nhic: parseExcelNumber(row[fm.nhic!]),
        ltc: parseExcelNumber(row[fm.ltc!]),
        ei: parseExcelNumber(row[fm.ei!]),
        advancePayment: parseExcelNumber(row[fm.advancePayment!]),
        otherDeduction: parseExcelNumber(row[fm.otherDeduction!]),
        totalDeduction: parseExcelNumber(row[fm.totalDeduction!]),
        netWage: parseExcelNumber(row[fm.netWage!]),
        // 근무정보
        workDays: parseExcelNumber(row[fm.workDays!]),
        deductionDays: parseExcelNumber(row[fm.deductionDays!]),
        deductionHours: parseExcelNumber(row[fm.deductionHours!]),
      });
    }

    setImportPreview(preview);
    setShowMappingModal(false);
  };

  // 매핑 저장
  const saveMapping = () => {
    const mappingData = excel.getMappingForSave();
    setExcelMapping({
      businessId,
      ...mappingData,
    });
    alert('매핑 저장 완료! 다음부터 자동 적용됩니다.');
  };

  // Import 실행
  const executeImport = () => {
    if (!importMonth || importPreview.length === 0) {
      alert('임포트할 월을 선택하고 데이터를 확인하세요.');
      return;
    }

    const newWages: MonthlyWage[] = [];
    let matchedCount = 0;

    importPreview.forEach((row) => {
      const matchedWorker = workers.find((w) => w.residentNo === row.residentNo);
      if (!matchedWorker) return;

      const matchedEmp = businessEmployments.find(({ worker }) => worker.id === matchedWorker.id);
      if (!matchedEmp) return;

      newWages.push({
        id: `${matchedEmp.employment.id}-${importMonth}`,
        employmentId: matchedEmp.employment.id,
        yearMonth: importMonth,
        totalWage: row.totalWage,
        basicWage: row.basicWage,
        overtimeWeekday: row.overtimeWeekday,
        overtimeWeekend: row.overtimeWeekend,
        nightWage: row.nightWage,
        holidayWage: row.holidayWage,
        annualLeaveWage: row.annualLeaveWage,
        bonusWage: row.bonusWage,
        mealAllowance: row.mealAllowance,
        carAllowance: row.carAllowance,
        otherWage: row.otherWage,
        incomeTax: row.incomeTax,
        localTax: row.localTax,
        nps: row.nps,
        nhic: row.nhic,
        ltc: row.ltc,
        ei: row.ei,
        advancePayment: row.advancePayment,
        otherDeduction: row.otherDeduction,
        totalDeduction: row.totalDeduction,
        netWage: row.netWage,
        workDays: row.workDays,
        deductionDays: row.deductionDays,
        deductionHours: row.deductionHours,
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
        <h4 className="text-white font-medium mb-3">
          엑셀에서 급여 임포트
          <span className="text-xs text-white/50 ml-2">(Ctrl+클릭으로 여러 파일 선택 가능)</span>
        </h4>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileUpload}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 file:cursor-pointer"
            />
          </div>
          <div>
            {batchMode ? (
              <div className="input-glass px-4 py-3 text-sm text-white/70">
                {batchFiles.length}개 파일 선택됨
                <span className="text-xs ml-2">({batchFiles.map(f => f.yearMonth.slice(5)).join(', ')}월)</span>
              </div>
            ) : (
              <input
                type="month"
                value={importMonth}
                onChange={(e) => setImportMonth(e.target.value)}
                className="w-full input-glass px-4 py-3"
                placeholder="적용 월"
              />
            )}
          </div>
          <div>
            <button
              onClick={executeImport}
              disabled={importPreview.length === 0 || !importMonth}
              className="btn-primary w-full disabled:opacity-50"
            >
              임포트 ({importPreview.filter((p) => p.matched).length}명)
            </button>
          </div>
        </div>

        {importPreview.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/60 text-sm">미리보기 ({importPreview.length}명)</span>
              <button
                onClick={() => setShowMappingModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                매핑 다시 설정
              </button>
            </div>
            <div className="max-h-60 overflow-auto">
            <table className="w-full table-glass text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-right">임금총액</th>
                  <th className="px-3 py-2 text-right">공제액</th>
                  <th className="px-3 py-2 text-right">실지급액</th>
                  <th className="px-3 py-2 text-center">매칭</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row, i) => (
                  <tr key={i} className={row.matched ? '' : 'opacity-50'}>
                    <td className="px-3 py-2 text-white">{row.name}</td>
                    <td className="px-3 py-2 text-right text-white/80">{row.totalWage?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2 text-right text-red-400">{row.totalDeduction?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2 text-right text-green-400">{row.netWage?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2 text-center">
                      {row.matched ? <span className="text-green-400">O</span> : <span className="text-red-400">X</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* 상세 편집 링크 */}
      <Link href="/wages" className="btn-secondary inline-block">
        상세 편집 (전체 사업장)
      </Link>

      {/* 매핑 모달 */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold text-white mb-4">헤더 매핑 설정</h3>

            {/* 시트 및 행 설정 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm text-white/60 mb-2">시트</label>
                <select
                  value={excel.selectedSheet}
                  onChange={(e) => excel.handleSheetChange(e.target.value)}
                  className="w-full input-glass px-4 py-2"
                >
                  {excel.sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">헤더 행</label>
                <input
                  type="number"
                  value={excel.headerRow}
                  onChange={(e) => excel.handleHeaderRowChange(parseInt(e.target.value) || 1)}
                  className="w-full input-glass px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">데이터 시작 행</label>
                <input
                  type="number"
                  value={excel.dataStartRow}
                  onChange={(e) => excel.setDataStartRow(parseInt(e.target.value) || 1)}
                  className="w-full input-glass px-4 py-2"
                />
              </div>
            </div>

            {/* 필드 매핑 */}
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                <div key={groupName} className="space-y-2">
                  <h4 className="text-white font-medium border-b border-white/20 pb-2">{groupName}</h4>
                  {fields.map(({ key, label, required = false }) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-28 text-sm text-white/70 truncate">
                        {label}
                        {required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <select
                        value={excel.fieldMapping[key] ?? ''}
                        onChange={(e) => excel.updateFieldMapping(key, e.target.value === '' ? null : parseInt(e.target.value))}
                        className="flex-1 input-glass px-3 py-1.5 text-sm"
                      >
                        <option value="">선택 안함</option>
                        {excel.headers.map((h) => (
                          <option key={h.index} value={h.index}>
                            {indexToColumnLetter(h.index)}열: {h.name.slice(0, 15)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 현재 매핑 상태 표시 */}
            <div className="mt-4 p-3 bg-white/5 rounded text-xs text-white/50">
              <strong>현재 매핑:</strong> 이름={excel.fieldMapping.name != null ? `${excel.fieldMapping.name}번째 열` : '미선택'},
              주민번호={excel.fieldMapping.residentNo != null ? `${excel.fieldMapping.residentNo}번째 열` : '미선택'},
              임금총액={excel.fieldMapping.totalWage != null ? `${excel.fieldMapping.totalWage}번째 열` : '미선택'}
            </div>

            {/* 배치 모드 파일 목록 */}
            {batchMode && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <strong className="text-blue-400 text-sm">일괄 처리 대상 ({batchFiles.length}개 파일):</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  {batchFiles.map(({ file, yearMonth }) => (
                    <span key={yearMonth} className="px-2 py-1 bg-blue-500/20 rounded text-xs text-white">
                      {yearMonth} ({file.name})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-4 mt-6 pt-4 border-t border-white/20">
              {batchMode ? (
                <>
                  <button
                    onClick={executeBatchImport}
                    disabled={batchProcessing || excel.fieldMapping.name == null || excel.fieldMapping.residentNo == null}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {batchProcessing ? '처리 중...' : `${batchFiles.length}개 파일 일괄 임포트`}
                  </button>
                  <button onClick={saveMapping} className="btn-secondary flex-1">매핑 저장</button>
                  <button
                    onClick={() => { setBatchMode(false); setBatchFiles([]); setShowMappingModal(false); }}
                    className="btn-secondary flex-1"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button onClick={loadPreview} className="btn-primary flex-1">미리보기</button>
                  <button onClick={saveMapping} className="btn-secondary flex-1">매핑 저장</button>
                  <button
                    onClick={() => excel.setFullFieldMapping({})}
                    className="btn-secondary flex-1 text-yellow-400"
                  >
                    매핑 초기화
                  </button>
                  <button onClick={() => setShowMappingModal(false)} className="btn-secondary flex-1">취소</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
