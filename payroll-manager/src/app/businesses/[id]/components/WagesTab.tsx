'use client';

import { useState, useMemo } from 'react';
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

// 급여 이력 탭 (간소화 - 상세 기능은 /wages 페이지)
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
  const [importPreview, setImportPreview] = useState<{
    name: string;
    residentNo: string;
    wage: number;
    matched: boolean;
    duplicate: boolean;
    oldWage?: number;
    diff?: number;
    // 4대보험 + 세금
    nps?: number;
    nhic?: number;
    ltc?: number;
    ei?: number;
    incomeTax?: number;
    localTax?: number;
    netWage?: number;
  }[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [tempHeaders, setTempHeaders] = useState<string[]>([]);
  const [aiMappingResult, setAiMappingResult] = useState<Record<string, { column: number | null; headerName: string | null }> | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [tempWorkbook, setTempWorkbook] = useState<any>(null);

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

  // Step 1: 파일 업로드 - 시트 목록만 표시
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('파일 없음');
      return;
    }
    console.log('파일 선택됨:', file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('파일 읽기 완료');
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });

      console.log('시트 목록:', wb.SheetNames);
      // 시트 목록 저장
      setSheetNames(wb.SheetNames);
      setTempWorkbook(wb);
      setImportPreview([]);

      // 파일명에서 년월 추출
      const fileNameMatch = file.name.match(/(\d{4})(\d{2})/);
      if (fileNameMatch) {
        setImportMonth(`${fileNameMatch[1]}-${fileNameMatch[2]}`);
      }

      // 저장된 매핑이 있으면 그 시트, 없으면 임금대장 포함 시트 자동 선택
      const mapping = excelMappings.find((m: any) => m.businessId === businessId);
      let autoSheet = mapping?.sheetName || '';
      if (!autoSheet || !wb.SheetNames.includes(autoSheet)) {
        autoSheet = wb.SheetNames.find((s: string) => s.includes('임금대장')) || wb.SheetNames[0];
      }
      setSelectedSheet(autoSheet);

      // 자동 선택된 시트로 데이터 로드
      loadSheetData(wb, autoSheet);
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Step 2: 시트 데이터 로드
  const loadSheetData = (wb: any, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const mapping = excelMappings.find((m: any) => m.businessId === businessId);

    // 헤더 추출 (AI 분석용)
    const headerRow = mapping?.headerRow || 4;
    const headers: string[] = [];
    for (let c = 0; c < 50; c++) {
      const h1 = jsonData[headerRow - 2]?.[c];
      const h2 = jsonData[headerRow - 1]?.[c];
      const name = ((h1 ? String(h1) : '') + ' ' + (h2 ? String(h2) : '')).replace(/\r?\n/g, ' ').trim();
      headers.push(name);
    }
    setTempHeaders(headers);

    // 데이터 파싱
    const dataStartRow = mapping?.dataStartRow || 6;
    const nameCol = mapping?.columns?.name || 2;
    const residentNoCol = mapping?.columns?.residentNo || 4;
    const wageCol = mapping?.columns?.wage || 21;
    const npsCol = mapping?.columns?.nps;
    const nhicCol = mapping?.columns?.nhic;
    const ltcCol = mapping?.columns?.ltc;
    const eiCol = mapping?.columns?.ei;
    const incomeTaxCol = mapping?.columns?.incomeTax;
    const localTaxCol = mapping?.columns?.localTax;
    const netWageCol = mapping?.columns?.netWage;

    const parseNum = (row: any[], colIdx: number | undefined) => {
      if (colIdx === undefined) return undefined;
      const val = row[colIdx - 1];
      if (val === undefined || val === null || val === '') return undefined;
      return typeof val === 'number' ? Math.round(val) : parseInt(String(val).replace(/,/g, '')) || 0;
    };

    const preview: typeof importPreview = [];
    for (let i = dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
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

        preview.push({
          name,
          residentNo,
          wage,
          matched: !!matchedEmp,
          duplicate: false,
          nps: parseNum(row, npsCol),
          nhic: parseNum(row, nhicCol),
          ltc: parseNum(row, ltcCol),
          ei: parseNum(row, eiCol),
          incomeTax: parseNum(row, incomeTaxCol),
          localTax: parseNum(row, localTaxCol),
          netWage: parseNum(row, netWageCol),
        });
      }
    }
    setImportPreview(preview);
  };

  // 임포트 실행
  const executeImport = () => {
    if (!importMonth || importPreview.length === 0) {
      alert('임포트할 월을 선택하고 데이터를 확인하세요.');
      return;
    }

    const duplicates = importPreview.filter((p) => p.duplicate && p.matched);
    if (duplicates.length > 0) {
      const increased = duplicates.filter(d => d.diff && d.diff > 0).length;
      const decreased = duplicates.filter(d => d.diff && d.diff < 0).length;
      const unchanged = duplicates.filter(d => d.diff === 0).length;
      const msg = `${duplicates.length}건의 기존 데이터가 있습니다.\n\n` +
        `- 증가: ${increased}건\n` +
        `- 감소: ${decreased}건\n` +
        `- 변동없음: ${unchanged}건\n\n` +
        `덮어쓸까요?`;
      if (!confirm(msg)) {
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
        // 4대보험 + 세금
        nps: row.nps,
        nhic: row.nhic,
        ltc: row.ltc,
        ei: row.ei,
        incomeTax: row.incomeTax,
        localTax: row.localTax,
        netWage: row.netWage,
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

  // AI 컬럼 분석
  const analyzeWithAI = async () => {
    if (tempHeaders.length === 0) {
      alert('먼저 엑셀 파일을 업로드하세요.');
      return;
    }
    setAiAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: tempHeaders }),
      });
      const data = await res.json();
      if (data.success) {
        setAiMappingResult(data.mapping);
        setShowMappingModal(true);
      } else {
        alert('AI 분석 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('API 호출 실패: ' + String(err));
    } finally {
      setAiAnalyzing(false);
    }
  };

  // AI 매핑 결과 저장
  const saveAiMapping = () => {
    if (!aiMappingResult) return;
    const mapping = excelMappings.find((m) => m.businessId === businessId);
    const newMapping = {
      businessId,
      sheetName: selectedSheet || mapping?.sheetName || '임금대장(직원)',
      headerRow: mapping?.headerRow || 4,
      dataStartRow: mapping?.dataStartRow || 6,
      columns: {
        name: aiMappingResult.name?.column ?? mapping?.columns?.name ?? 2,
        residentNo: aiMappingResult.residentNo?.column ?? mapping?.columns?.residentNo ?? 4,
        joinDate: aiMappingResult.joinDate?.column ?? mapping?.columns?.joinDate ?? 5,
        leaveDate: aiMappingResult.leaveDate?.column ?? mapping?.columns?.leaveDate ?? 6,
        wage: aiMappingResult.wage?.column ?? mapping?.columns?.wage ?? 20,
        nps: aiMappingResult.nps?.column ?? undefined,
        nhic: aiMappingResult.nhic?.column ?? undefined,
        ltc: aiMappingResult.ltc?.column ?? undefined,
        ei: aiMappingResult.ei?.column ?? undefined,
        incomeTax: aiMappingResult.incomeTax?.column ?? undefined,
        localTax: aiMappingResult.localTax?.column ?? undefined,
        netWage: aiMappingResult.netWage?.column ?? undefined,
      },
    };
    setExcelMapping(newMapping);
    setShowMappingModal(false);
    alert('매핑 설정이 저장되었습니다!');
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
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-white font-medium">엑셀에서 급여 임포트</h4>
          <button
            onClick={analyzeWithAI}
            disabled={tempHeaders.length === 0 || aiAnalyzing}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {aiAnalyzing ? '🔄 AI 분석 중...' : '🤖 AI 자동 매핑'}
          </button>
        </div>
        {/* 시트 선택 (파일 업로드 후 표시) */}
        {sheetNames.length > 0 && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-blue-400 text-sm">📑 시트 선택:</span>
              <select
                value={selectedSheet}
                onChange={(e) => {
                  const newSheet = e.target.value;
                  setSelectedSheet(newSheet);
                  if (tempWorkbook) {
                    loadSheetData(tempWorkbook, newSheet);
                  }
                }}
                className="input-glass px-4 py-2 text-sm flex-1"
              >
                {sheetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <span className="text-white/40 text-xs">
                {sheetNames.length}개 시트 발견
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="col-span-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ opacity: 1, pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 10 }}
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
          <button
            onClick={executeImport}
            disabled={importPreview.length === 0 || !importMonth}
            className="btn-primary disabled:opacity-50"
          >
            임포트 ({importPreview.filter((p) => p.matched).length}명)
          </button>
        </div>

        {importPreview.length > 0 && (
          <div className="mt-4">
            {/* 변경 요약 */}
            {importPreview.some(p => p.duplicate) && (
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium mb-2">
                  기존 데이터 {importPreview.filter(p => p.duplicate).length}건 발견 - 재업로드 시 변경사항:
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-400">
                    증가: {importPreview.filter(p => p.diff && p.diff > 0).length}건
                  </span>
                  <span className="text-red-400">
                    감소: {importPreview.filter(p => p.diff && p.diff < 0).length}건
                  </span>
                  <span className="text-white/50">
                    변동없음: {importPreview.filter(p => p.diff === 0).length}건
                  </span>
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-auto">
              <table className="w-full table-glass text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">이름</th>
                    <th className="px-3 py-2 text-right">기존 급여</th>
                    <th className="px-3 py-2 text-right">새 급여</th>
                    <th className="px-3 py-2 text-right">변경</th>
                    <th className="px-3 py-2 text-center">매칭</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => (
                    <tr key={i} className={row.matched ? '' : 'opacity-50'}>
                      <td className="px-3 py-2 text-white">{row.name}</td>
                      <td className="px-3 py-2 text-right text-white/50">
                        {row.oldWage !== undefined ? row.oldWage.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-white/80">{row.wage.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        {row.diff !== undefined ? (
                          <span className={row.diff > 0 ? 'text-green-400' : row.diff < 0 ? 'text-red-400' : 'text-white/30'}>
                            {row.diff > 0 ? '+' : ''}{row.diff.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-blue-400 text-xs">신규</span>
                        )}
                      </td>
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

      {/* AI 매핑 결과 모달 */}
      {showMappingModal && aiMappingResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold text-white mb-4">🤖 AI 컬럼 매핑 결과</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(aiMappingResult).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/70">
                    {key === 'name' && '이름'}
                    {key === 'residentNo' && '주민등록번호'}
                    {key === 'joinDate' && '입사일'}
                    {key === 'leaveDate' && '퇴사일'}
                    {key === 'wage' && '임금총액'}
                    {key === 'nps' && '국민연금'}
                    {key === 'nhic' && '건강보험'}
                    {key === 'ltc' && '장기요양보험'}
                    {key === 'ei' && '고용보험'}
                    {key === 'incomeTax' && '소득세'}
                    {key === 'localTax' && '지방소득세'}
                    {key === 'netWage' && '실지급액'}
                  </span>
                  <span className={value.column !== null ? 'text-green-400' : 'text-white/30'}>
                    {value.column !== null ? `${value.column}열 (${value.headerName})` : '찾지 못함'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveAiMapping} className="btn-primary flex-1">
                이 매핑으로 저장
              </button>
              <button onClick={() => setShowMappingModal(false)} className="btn-secondary flex-1">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
