'use client';

import { useStore } from '@/store/useStore';
import { useState, useMemo, useCallback, useRef } from 'react';
import { MonthlyWage } from '@/types';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';

export default function WagesPage() {
  const workers = useStore((state) => state.workers);
  const employments = useStore((state) => state.employments);
  const monthlyWages = useStore((state) => state.monthlyWages);
  const addMonthlyWages = useStore((state) => state.addMonthlyWages);
  const excelMappings = useStore((state) => state.excelMappings);
  const setExcelMapping = useStore((state) => state.setExcelMapping);
  const selectedBusiness = useStore((state) => state.selectedBusinessId);
  const toast = useToast();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1); // 기본 전년도
  const [editingWages, setEditingWages] = useState<Record<string, Record<string, number>>>({});
  const [importMonth, setImportMonth] = useState('');
  const [importPreview, setImportPreview] = useState<{ name: string; residentNo: string; wage: number; matched: boolean }[]>([]);
  const [bulkImportFiles, setBulkImportFiles] = useState<{ file: File; yearMonth: string; preview: { name: string; residentNo: string; wage: number; matched: boolean }[] }[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [sortBy, setSortBy] = useState<'joinDate' | 'name'>('joinDate');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // 시트 선택 관련 상태
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 선택된 사업장의 근로자 목록
  const businessWorkers = useMemo(() => {
    if (!selectedBusiness) return [];
    let result = employments
      .filter((e) => e.businessId === selectedBusiness)
      .map((e) => ({
        employment: e,
        worker: workers.find((w) => w.id === e.workerId)!,
      }))
      .filter(({ worker }) => worker);

    // 상태 필터
    if (statusFilter === 'ACTIVE') {
      result = result.filter(({ employment }) => employment.status === 'ACTIVE');
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter(({ employment }) => employment.status === 'INACTIVE');
    }

    // 정렬
    result = [...result].sort((a, b) => {
      if (sortBy === 'joinDate') {
        return (b.employment.joinDate || '').localeCompare(a.employment.joinDate || '');
      }
      return a.worker.name.localeCompare(b.worker.name, 'ko');
    });

    return result;
  }, [selectedBusiness, employments, workers, statusFilter, sortBy]);

  // 전체 인원 수 (필터 전)
  const totalCounts = useMemo(() => {
    if (!selectedBusiness) return { active: 0, inactive: 0 };
    const bizEmps = employments.filter(e => e.businessId === selectedBusiness);
    return {
      active: bizEmps.filter(e => e.status === 'ACTIVE').length,
      inactive: bizEmps.filter(e => e.status === 'INACTIVE').length,
    };
  }, [selectedBusiness, employments]);

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

  // 시트에서 데이터 추출하는 함수
  const extractDataFromSheet = useCallback((wb: XLSX.WorkBook, sheetName: string, file: File, showSheetSelectOnFail = false) => {
    const mapping = excelMappings.find((m) => m.businessId === selectedBusiness);
    const dataStartRow = mapping?.dataStartRow || 6;
    const nameCol = mapping?.columns.name || 2;
    const residentNoCol = mapping?.columns.residentNo || 4;
    // 급여 컬럼: 매핑에서 가져오기 (wage = 임금총액)
    const wageCol = mapping?.columns.wage || 21;

    console.log('[급여 업로드] 매핑 정보:', {
      sheetName,
      dataStartRow,
      nameCol,
      residentNoCol,
      wageCol,
      mappingExists: !!mapping,
    });

    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.error('[급여 업로드] 시트를 찾을 수 없음:', sheetName);
      return;
    }

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    console.log('[급여 업로드] 총 행 수:', jsonData.length, '데이터 시작:', dataStartRow);

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
        preview.push({ name, residentNo, wage, matched: !!matchedWorker });
      }
    }

    console.log('[급여 업로드] 추출 결과:', preview.length, '건');

    // 0건 로드 시 다른 시트 선택 옵션 제공
    if (preview.length === 0) {
      const otherSheets = wb.SheetNames.filter(s => s !== sheetName);
      if (otherSheets.length > 0 && showSheetSelectOnFail) {
        toast.show(`${sheetName}에서 데이터를 찾을 수 없습니다. 다른 시트를 선택하세요.`, 'error');
        setAvailableSheets(wb.SheetNames);
        setSelectedSheet(otherSheets[0]);
        setPendingWorkbook(wb);
        setPendingFile(file);
        return;
      } else if (otherSheets.length > 0) {
        // 자동 진행했는데 실패 → 시트 선택 UI 표시
        toast.show(`${sheetName}에서 데이터 없음. 시트를 선택하세요.`, 'info');
        setAvailableSheets(wb.SheetNames);
        setSelectedSheet(sheetName);
        setPendingWorkbook(wb);
        setPendingFile(file);
        return;
      }
    }

    setImportPreview(preview);
    setAvailableSheets([]);
    setPendingWorkbook(null);
    setPendingFile(null);

    // 시트 선택 저장 (성공 시에만)
    if (preview.length > 0 && selectedBusiness && mapping) {
      setExcelMapping({ ...mapping, sheetName });
      toast.show(`${sheetName}에서 ${preview.length}건 로드`, 'success');
    } else if (preview.length > 0) {
      toast.show(`${sheetName}에서 ${preview.length}건 로드`, 'success');
    } else if (preview.length === 0) {
      toast.show(`데이터를 찾을 수 없습니다. [엑셀 Import]에서 매핑을 확인하세요.`, 'error');
    }
  }, [selectedBusiness, excelMappings, workers, setExcelMapping, toast]);

  // 시트 선택 핸들러
  const handleSheetSelect = useCallback((sheetName: string) => {
    setSelectedSheet(sheetName);
    if (pendingWorkbook && pendingFile) {
      extractDataFromSheet(pendingWorkbook, sheetName, pendingFile, true);
    }
  }, [pendingWorkbook, pendingFile, extractDataFromSheet]);

  // 엑셀 임포트 핸들러
  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBusiness) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const mapping = excelMappings.find((m) => m.businessId === selectedBusiness);

      // 1. "임금대장" 포함 시트 찾기
      const wageSheets = wb.SheetNames.filter((s: string) => s.includes('임금대장'));

      // 2. 저장된 시트명이 있고 존재하면 시도 (실패 시 시트 선택 UI 표시)
      if (mapping?.sheetName && wb.SheetNames.includes(mapping.sheetName)) {
        extractDataFromSheet(wb, mapping.sheetName, file, true);
        return;
      }

      // 3. 임금대장 시트가 1개면 자동 진행 (실패 시 시트 선택 UI 표시)
      if (wageSheets.length === 1) {
        extractDataFromSheet(wb, wageSheets[0], file, true);
        return;
      }

      // 4. 임금대장 시트가 여러 개 또는 없으면 선택 UI 표시
      if (wageSheets.length > 1) {
        setAvailableSheets(wageSheets);
        setSelectedSheet(wageSheets[0]);
      } else {
        // 임금대장 시트가 없으면 전체 시트 목록 표시
        setAvailableSheets(wb.SheetNames);
        setSelectedSheet(wb.SheetNames[0]);
      }

      setPendingWorkbook(wb);
      setPendingFile(file);

      // 파일명에서 년월 추출
      const fileNameMatch = file.name.match(/(\d{4})(\d{2})/);
      if (fileNameMatch) {
        setImportMonth(`${fileNameMatch[1]}-${fileNameMatch[2]}`);
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedBusiness, excelMappings, extractDataFromSheet]);

  // 다중 파일 일괄 업로드 핸들러
  const handleBulkImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedBusiness) return;

    setBulkImporting(true);
    const mapping = excelMappings.find((m) => m.businessId === selectedBusiness);
    let baseSheetName = mapping?.sheetName || '임금대장';
    const dataStartRow = mapping?.dataStartRow || 6;
    const nameCol = mapping?.columns.name || 2;
    const residentNoCol = mapping?.columns.residentNo || 4;
    // 급여 컬럼: 매핑에서 가져오기 (wage = 임금총액)
    const wageCol = mapping?.columns.wage || 21;

    console.log('[일괄 업로드] 매핑:', { baseSheetName, dataStartRow, nameCol, residentNoCol, wageCol });

    const processedFiles: typeof bulkImportFiles = [];

    for (const file of Array.from(files)) {
      // 파일명에서 년월 추출 (예: 쿠우쿠우부평점_202501.xlsx)
      const fileNameMatch = file.name.match(/(\d{4})(\d{2})/);
      if (!fileNameMatch) continue;

      const yearMonth = `${fileNameMatch[1]}-${fileNameMatch[2]}`;

      const data = await new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });

      const wb = XLSX.read(data, { type: 'array' });
      // 시트 찾기: 저장된 시트명 → "임금대장" 포함 시트 → 첫 번째 시트
      let sheetName = baseSheetName;
      let ws = wb.Sheets[sheetName];
      if (!ws) {
        const fallbackSheet = wb.SheetNames.find((s: string) => s.includes('임금대장')) || wb.SheetNames[0];
        if (fallbackSheet) {
          sheetName = fallbackSheet;
          ws = wb.Sheets[sheetName];
        }
      }
      if (!ws) continue;

      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
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
        const wage = typeof wageRaw === 'number' ? Math.round(wageRaw) : parseInt(String(wageRaw).replace(/,/g, '')) || 0;

        if (name && wage > 0) {
          const matchedWorker = workers.find((w) => w.residentNo === residentNo);
          preview.push({ name, residentNo, wage, matched: !!matchedWorker });
        }
      }

      if (preview.length > 0) {
        processedFiles.push({ file, yearMonth, preview });
      }
    }

    setBulkImportFiles(processedFiles.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)));
    setBulkImporting(false);
    e.target.value = '';
  }, [selectedBusiness, excelMappings, workers]);

  // 다중 파일 일괄 임포트 실행
  const executeBulkImport = () => {
    if (bulkImportFiles.length === 0) return;

    const newWages: MonthlyWage[] = [];
    let totalMatched = 0;
    let totalUnmatched = 0;

    bulkImportFiles.forEach(({ yearMonth, preview }) => {
      preview.forEach((row) => {
        const worker = workers.find((w) => w.residentNo === row.residentNo);
        if (!worker) {
          totalUnmatched++;
          return;
        }

        const employment = employments.find(
          (e) => e.workerId === worker.id && e.businessId === selectedBusiness
        );
        if (!employment) {
          totalUnmatched++;
          return;
        }

        newWages.push({
          id: `${employment.id}-${yearMonth}`,
          employmentId: employment.id,
          yearMonth,
          totalWage: row.wage,
          createdAt: new Date(),
        });
        totalMatched++;
      });
    });

    if (newWages.length > 0) {
      addMonthlyWages(newWages);
      alert(`일괄 임포트 완료!\n- 파일 수: ${bulkImportFiles.length}개\n- 성공: ${totalMatched}건\n- 미매칭: ${totalUnmatched}건`);
      setBulkImportFiles([]);
    } else {
      alert('매칭된 데이터가 없습니다.');
    }
  };

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

  // 페이지네이션 계산
  const totalPages = Math.ceil(businessWorkers.length / PAGE_SIZE);
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return businessWorkers.slice(start, start + PAGE_SIZE);
  }, [businessWorkers, currentPage]);

  // 페이지 변경 시 첫 페이지로 리셋
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedBusiness, statusFilter]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '급여 이력' }]}
        title="월별 급여 이력"
        description="상실신고 보수총액 계산을 위한 실제 급여 데이터를 입력합니다"
      />

      <div className="glass p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
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

      {/* 다중 파일 일괄 업로드 섹션 */}
      {selectedBusiness && (
        <div className="glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">다중 파일 일괄 업로드</h2>
          <p className="text-white/40 text-sm mb-4">파일명에 년월 포함 필수 (예: 쿠우쿠우부평점_202501.xlsx)</p>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-white/60 mb-2">급여대장 엑셀 파일 (다중 선택)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleBulkImport}
                disabled={bulkImporting}
                className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30 disabled:opacity-50"
              />
            </div>
            <div>
              <button
                onClick={executeBulkImport}
                disabled={bulkImportFiles.length === 0}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkImporting ? '처리 중...' : `일괄 임포트 (${bulkImportFiles.length}개 파일)`}
              </button>
            </div>
          </div>

          {bulkImportFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {bulkImportFiles.map(({ file, yearMonth, preview }) => (
                <div key={yearMonth} className="glass p-3 text-sm">
                  <p className="text-white font-medium">{yearMonth}</p>
                  <p className="text-white/60 text-xs truncate">{file.name}</p>
                  <p className="text-green-400">{preview.filter(p => p.matched).length}명 매칭</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 단일 파일 임포트 섹션 */}
      {selectedBusiness && (
        <div className="glass p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">단일 파일 임포트</h2>
          <div className="grid grid-cols-4 gap-4 items-end">
            <div className={availableSheets.length > 0 ? 'col-span-1' : 'col-span-2'}>
              <label className="block text-sm font-medium text-white/60 mb-2">급여대장 엑셀 파일</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
                className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
              />
            </div>

            {/* 시트 선택 - 여러 시트가 있을 때만 표시 */}
            {availableSheets.length > 0 && (
              <div className="col-span-1 animate-fade-in">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  시트 선택 <span className="text-blue-400">({availableSheets.length}개)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="flex-1 input-glass px-4 py-3"
                  >
                    {availableSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSheetSelect(selectedSheet)}
                    className="px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

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
          {/* 필터 및 정렬 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              <span className="text-blue-400">{selectedYear}년</span> 급여 목록
              <span className="text-white/50 font-normal ml-2">({businessWorkers.length}명)</span>
            </h3>
            <div className="flex items-center gap-4">
              {/* 상태 필터 */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    statusFilter === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  재직 ({totalCounts.active})
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    statusFilter === 'INACTIVE' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  퇴사 ({totalCounts.inactive})
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    statusFilter === 'ALL' ? 'bg-blue-500/20 text-blue-400' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  전체
                </button>
              </div>
              {/* 정렬 */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('joinDate')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    sortBy === 'joinDate' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  입사일순
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    sortBy === 'name' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  이름순
                </button>
              </div>
            </div>
          </div>

          <table className="table-glass text-sm min-w-max">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-20">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-slate-900/95 z-10">
                  <span className="text-white font-semibold">근로자</span>
                </th>
                {months.map((m, idx) => (
                  <th key={m} className="px-2 py-3 text-center min-w-[90px]">
                    <span className={`text-sm font-medium ${idx === new Date().getMonth() ? 'text-blue-400' : 'text-white/70'}`}>
                      {parseInt(m.split('-')[1])}월
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right">
                  <span className="text-white/70 font-medium">연간합계</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedWorkers.map(({ worker, employment }) => {
                const yearTotal = months.reduce((sum, m) => {
                  if (!isWorkedMonth(employment, m)) return sum;
                  return sum + (getWageValue(employment.id, m) || 0);
                }, 0);

                return (
                  <tr key={worker.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-slate-900/80 backdrop-blur-sm z-10">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{worker.name}</span>
                        <span className="text-white/40 text-xs">
                          {employment.joinDate?.slice(5).replace('-', '/')} 입사
                          {employment.status === 'INACTIVE' && (
                            <span className="ml-1 text-red-400/70">· 퇴사</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {months.map((yearMonth) => {
                      const worked = isWorkedMonth(employment, yearMonth);
                      const value = getWageValue(employment.id, yearMonth);
                      const isEdited = editingWages[employment.id]?.[yearMonth] !== undefined;

                      return (
                        <td key={yearMonth} className="px-1 py-2">
                          {worked ? (
                            <input
                              type="text"
                              value={value?.toLocaleString() || ''}
                              onChange={(e) => handleWageChange(employment.id, yearMonth, e.target.value)}
                              placeholder="미입력"
                              className={`w-full px-2 py-2 text-right text-sm rounded-lg transition-all ${
                                isEdited
                                  ? 'border-2 border-blue-500/60 bg-blue-500/15 text-blue-100 shadow-sm shadow-blue-500/20'
                                  : value
                                  ? 'border border-white/10 bg-white/5 text-white'
                                  : 'border border-dashed border-white/20 bg-transparent text-white/30 placeholder:text-white/20'
                              } focus:outline-none focus:border-blue-500 focus:bg-blue-500/10`}
                            />
                          ) : (
                            <div className="px-2 py-2 text-center">
                              <span className="text-white/10">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      {yearTotal > 0 ? (
                        <span className="text-white font-semibold">{yearTotal.toLocaleString()}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <p className="text-white/50 text-sm">
                {businessWorkers.length}명 중 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, businessWorkers.length)}명 표시
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  처음
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="px-4 py-1 text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  다음
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  마지막
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
