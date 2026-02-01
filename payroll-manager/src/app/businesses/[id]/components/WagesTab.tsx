'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { MonthlyWage, Worker, Employment } from '@/types';

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

interface HeaderInfo {
  index: number;
  name: string;
}

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

// 필드 정의 - 지급내역, 공제내역 포함
const FIELD_GROUPS: Record<string, FieldDef[]> = {
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

  // 엑셀 관련 상태
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState<HeaderInfo[]>([]);
  const [headerRow, setHeaderRow] = useState(4);
  const [dataStartRow, setDataStartRow] = useState(6);

  // 필드 매핑 (0-indexed)
  const [fieldMapping, setFieldMapping] = useState<Record<string, number | null>>({});

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

  // 헤더 추출
  const extractHeaders = useCallback((wb: any, sheetName: string, hRow: number): HeaderInfo[] => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const result: HeaderInfo[] = [];

    for (let c = 0; c < 60; c++) {
      const h1 = jsonData[hRow - 2]?.[c];
      const h2 = jsonData[hRow - 1]?.[c];
      const name = [h1, h2]
        .filter(Boolean)
        .map(v => String(v).replace(/\r?\n/g, ' ').trim())
        .join(' ')
        .trim();

      if (name) {
        result.push({ index: c, name });
      }
    }

    return result;
  }, []);

  // 기존 매핑 로드 - headerRow, dataStartRow 값도 반환
  const loadExistingMapping = useCallback((): { sheetName: string | null; headerRow: number; dataStartRow: number } => {
    const existing = excelMappings.find((m: any) => m.businessId === businessId);
    if (existing) {
      const hRow = existing.headerRow || 4;
      const dRow = existing.dataStartRow || 6;
      setHeaderRow(hRow);
      setDataStartRow(dRow);

      // columns를 0-indexed로 변환
      const mapping: Record<string, number | null> = {};
      if (existing.columns) {
        Object.entries(existing.columns).forEach(([key, value]) => {
          mapping[key] = value != null ? (value as number) - 1 : null;
        });
      }
      setFieldMapping(mapping);

      return { sheetName: existing.sheetName, headerRow: hRow, dataStartRow: dRow };
    }
    return { sheetName: null, headerRow: 4, dataStartRow: 6 };
  }, [businessId, excelMappings]);

  // 파일 업로드
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // 파일명에서 년월 추출
      const fileNameMatch = file.name.match(/(\d{4})(\d{2})/);
      if (fileNameMatch) {
        setImportMonth(`${fileNameMatch[1]}-${fileNameMatch[2]}`);
      }

      // 기존 매핑 로드 (동기적으로 값 받아옴)
      const { sheetName: savedSheet, headerRow: savedHeaderRow } = loadExistingMapping();

      // 시트 선택
      let autoSheet = savedSheet || '';
      if (!autoSheet || !wb.SheetNames.includes(autoSheet)) {
        autoSheet = wb.SheetNames.find((s: string) => s.includes('임금대장')) || wb.SheetNames[0];
      }
      setSelectedSheet(autoSheet);

      // 헤더 추출 (저장된 headerRow 값 사용)
      const extractedHeaders = extractHeaders(wb, autoSheet, savedHeaderRow);
      setHeaders(extractedHeaders);

      // 매핑 모달 표시
      setShowMappingModal(true);
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 시트 변경
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      const extractedHeaders = extractHeaders(workbook, sheetName, headerRow);
      setHeaders(extractedHeaders);
    }
  };

  // 헤더 행 변경
  const handleHeaderRowChange = (newRow: number) => {
    setHeaderRow(newRow);
    if (workbook && selectedSheet) {
      const extractedHeaders = extractHeaders(workbook, selectedSheet, newRow);
      setHeaders(extractedHeaders);
    }
  };

  // 미리보기 로드
  const loadPreview = () => {
    if (!workbook || !selectedSheet) return;

    const nameIdx = fieldMapping.name;
    const residentNoIdx = fieldMapping.residentNo;
    const totalWageIdx = fieldMapping.totalWage;

    if (nameIdx == null || residentNoIdx == null) {
      alert('이름과 주민번호 헤더를 선택해주세요.');
      return;
    }

    const ws = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    const preview: any[] = [];

    const parseNum = (row: any[], idx: number | null | undefined): number | undefined => {
      if (idx == null) return undefined;
      const val = row[idx];
      if (val === undefined || val === null || val === '') return undefined;
      return typeof val === 'number' ? Math.round(val) : parseInt(String(val).replace(/,/g, '')) || 0;
    };

    for (let i = dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || !row[nameIdx]) continue;

      const name = String(row[nameIdx] || '').trim();
      let residentNo = String(row[residentNoIdx] || '').replace(/-/g, '').trim();
      if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
        residentNo = residentNo.padStart(13, '0');
      }

      const totalWage = parseNum(row, totalWageIdx) || 0;
      if (!name || totalWage === 0) continue;

      const matchedWorker = workers.find((w) => w.residentNo === residentNo);
      const matchedEmp = matchedWorker
        ? businessEmployments.find(({ worker }) => worker.id === matchedWorker.id)
        : null;

      preview.push({
        name,
        residentNo,
        matched: !!matchedEmp,
        totalWage,
        // 지급내역
        basicWage: parseNum(row, fieldMapping.basicWage),
        overtimeWeekday: parseNum(row, fieldMapping.overtimeWeekday),
        overtimeWeekend: parseNum(row, fieldMapping.overtimeWeekend),
        nightWage: parseNum(row, fieldMapping.nightWage),
        holidayWage: parseNum(row, fieldMapping.holidayWage),
        annualLeaveWage: parseNum(row, fieldMapping.annualLeaveWage),
        bonusWage: parseNum(row, fieldMapping.bonusWage),
        mealAllowance: parseNum(row, fieldMapping.mealAllowance),
        carAllowance: parseNum(row, fieldMapping.carAllowance),
        otherWage: parseNum(row, fieldMapping.otherWage),
        // 공제내역
        incomeTax: parseNum(row, fieldMapping.incomeTax),
        localTax: parseNum(row, fieldMapping.localTax),
        nps: parseNum(row, fieldMapping.nps),
        nhic: parseNum(row, fieldMapping.nhic),
        ltc: parseNum(row, fieldMapping.ltc),
        ei: parseNum(row, fieldMapping.ei),
        advancePayment: parseNum(row, fieldMapping.advancePayment),
        otherDeduction: parseNum(row, fieldMapping.otherDeduction),
        totalDeduction: parseNum(row, fieldMapping.totalDeduction),
        netWage: parseNum(row, fieldMapping.netWage),
        // 근무정보
        workDays: parseNum(row, fieldMapping.workDays),
        deductionDays: parseNum(row, fieldMapping.deductionDays),
        deductionHours: parseNum(row, fieldMapping.deductionHours),
      });
    }

    setImportPreview(preview);
    setShowMappingModal(false);
  };

  // 매핑 저장
  const saveMapping = () => {
    // 0-indexed를 1-indexed로 변환
    const columns: Record<string, number | undefined> = {};
    Object.entries(fieldMapping).forEach(([key, value]) => {
      columns[key] = value != null ? value + 1 : undefined;
    });

    setExcelMapping({
      businessId,
      sheetName: selectedSheet,
      headerRow,
      dataStartRow,
      columns,
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
        // 지급내역
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
        // 공제내역
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
        // 근무정보
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
        <h4 className="text-white font-medium mb-3">엑셀에서 급여 임포트</h4>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 file:cursor-pointer"
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
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full input-glass px-4 py-2"
                >
                  {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">헤더 행</label>
                <input
                  type="number"
                  value={headerRow}
                  onChange={(e) => handleHeaderRowChange(parseInt(e.target.value) || 1)}
                  className="w-full input-glass px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">데이터 시작 행</label>
                <input
                  type="number"
                  value={dataStartRow}
                  onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)}
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
                        value={fieldMapping[key] ?? ''}
                        onChange={(e) => setFieldMapping({
                          ...fieldMapping,
                          [key]: e.target.value === '' ? null : parseInt(e.target.value)
                        })}
                        className="flex-1 input-glass px-3 py-1.5 text-sm"
                      >
                        <option value="">선택 안함</option>
                        {headers.map((h) => {
                          // 0-indexed를 열 문자로 변환 (0=A, 25=Z, 26=AA)
                          const colLetter = h.index < 26
                            ? String.fromCharCode(65 + h.index)
                            : String.fromCharCode(64 + Math.floor(h.index / 26)) + String.fromCharCode(65 + (h.index % 26));
                          return (
                            <option key={h.index} value={h.index}>
                              {colLetter}열: {h.name.slice(0, 15)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 현재 매핑 상태 표시 */}
            <div className="mt-4 p-3 bg-white/5 rounded text-xs text-white/50">
              <strong>현재 매핑:</strong> 이름={fieldMapping.name !== null ? `${fieldMapping.name}번째 열` : '미선택'},
              주민번호={fieldMapping.residentNo !== null ? `${fieldMapping.residentNo}번째 열` : '미선택'},
              임금총액={fieldMapping.totalWage !== null ? `${fieldMapping.totalWage}번째 열` : '미선택'}
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 mt-6 pt-4 border-t border-white/20">
              <button onClick={loadPreview} className="btn-primary flex-1">미리보기</button>
              <button onClick={saveMapping} className="btn-secondary flex-1">매핑 저장</button>
              <button
                onClick={() => setFieldMapping({})}
                className="btn-secondary flex-1 text-yellow-400"
              >
                매핑 초기화
              </button>
              <button onClick={() => setShowMappingModal(false)} className="btn-secondary flex-1">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
