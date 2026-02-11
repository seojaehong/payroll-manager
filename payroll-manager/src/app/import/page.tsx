'use client';

import { useStore } from '@/store/useStore';
import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Worker, Employment } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { normalizeResidentNo, parseExcelDate, indexToColumnLetter } from '@/hooks/useExcelImport';
import { getDefaultMonthlyWage, DEFAULTS } from '@/lib/constants';
import { detectColumns, detectBestSheet, detectionToMappingColumns } from '@/lib/excelDetector';
import type { DetectionResult, ColumnDetection } from '@/lib/excelDetector';
import type { HeaderInfo } from '@/types';

interface ImportRow {
  name: string;
  residentNo: string;
  joinDate: string;
  leaveDate?: string;
  wage: number;
  phone?: string;
  email?: string;
}

// 핵심 5필드 정의
const CORE_FIELDS = [
  { key: 'name', label: '이름', required: true },
  { key: 'residentNo', label: '주민번호', required: true },
  { key: 'joinDate', label: '입사일', required: false },
  { key: 'leaveDate', label: '퇴사일', required: false },
  { key: 'wage', label: '급여(총액)', required: false },
  { key: 'phone', label: '전화번호', required: false },
] as const;

// 신뢰도 뱃지
function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) return <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-400">높음</span>;
  if (confidence >= 0.5) return <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">중간</span>;
  return <span className="px-1.5 py-0.5 text-xs rounded bg-red-500/20 text-red-400">낮음</span>;
}

export default function ImportPage() {
  const businesses = useStore((state) => state.businesses);
  const workers = useStore((state) => state.workers);
  const addWorkers = useStore((state) => state.addWorkers);
  const addEmployments = useStore((state) => state.addEmployments);
  const deleteEmploymentsByBusiness = useStore((state) => state.deleteEmploymentsByBusiness);
  const excelMappings = useStore((state) => state.excelMappings);
  const setExcelMapping = useStore((state) => state.setExcelMapping);
  const selectedBusiness = useStore((state) => state.selectedBusinessId);
  const toast = useToast();

  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // 감지 결과
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [headerRow, setHeaderRow] = useState(1);
  const [dataStartRow, setDataStartRow] = useState(1);

  // 필드 매핑 (0-indexed)
  const [fieldMapping, setFieldMapping] = useState<Record<string, number | null>>({
    name: null, residentNo: null, joinDate: null, leaveDate: null, wage: null, phone: null,
  });

  // 헤더 목록 (드롭다운용)
  const [headers, setHeaders] = useState<HeaderInfo[]>([]);

  // 기존 매핑 사용 여부
  const [usingSavedMapping, setUsingSavedMapping] = useState(false);

  const business = businesses.find((b) => b.id === selectedBusiness);

  // 사업장 변경 시 초기화
  useEffect(() => {
    setPreviewData([]);
    setFileName('');
    setSheets([]);
    setSelectedSheet('');
    setWorkbook(null);
    setDetection(null);
    setHeaders([]);
    setUsingSavedMapping(false);
  }, [selectedBusiness]);

  // 헤더 추출 (감지된 headerRow 기반)
  const extractHeaders = useCallback((wb: XLSX.WorkBook, sheetName: string, hRow: number): HeaderInfo[] => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const maxCol = Math.min(range.e.c + 1, 100);
    const result: HeaderInfo[] = [];
    const headerRowIdx = hRow - 1;
    const prevRowIdx = hRow - 2;

    for (let c = 0; c < maxCol; c++) {
      const mainHeader = jsonData[headerRowIdx]?.[c];
      const prevHeader = prevRowIdx >= 0 ? jsonData[prevRowIdx]?.[c] : null;

      const name = [prevHeader, mainHeader]
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

  // 기존 매핑 로드 시도
  const tryLoadSavedMapping = useCallback((businessId: string, wb: XLSX.WorkBook): boolean => {
    const existing = excelMappings.find((m) => m.businessId === businessId);
    if (!existing) return false;

    const hRow = existing.headerRow || 1;
    const dRow = existing.dataStartRow || 2;
    setHeaderRow(hRow);
    setDataStartRow(dRow);

    // columns를 0-indexed로 변환
    const cols = existing.columns as Record<string, number | undefined>;
    const loaded: Record<string, number | null> = {};
    CORE_FIELDS.forEach(f => {
      loaded[f.key] = cols[f.key] != null ? cols[f.key]! - 1 : null;
    });
    setFieldMapping(loaded);

    // 시트 & 헤더
    const sheetName = existing.sheetName && wb.SheetNames.includes(existing.sheetName)
      ? existing.sheetName
      : wb.SheetNames[0];
    setSelectedSheet(sheetName);
    setHeaders(extractHeaders(wb, sheetName, hRow));
    setUsingSavedMapping(true);

    return true;
  }, [excelMappings, extractHeaders]);

  // 파일 업로드 → 자동 감지
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheets(wb.SheetNames);

      // 1) 기존 저장된 매핑이 있으면 우선 사용
      if (selectedBusiness && tryLoadSavedMapping(selectedBusiness, wb)) {
        toast.show('저장된 매핑을 불러왔습니다.', 'success');
        return;
      }

      // 2) 자동 감지
      const bestSheet = detectBestSheet(wb);
      setSelectedSheet(bestSheet);

      const result = detectColumns(wb, bestSheet);
      setDetection(result);

      if (result) {
        setHeaderRow(result.headerRow);
        setDataStartRow(result.dataStartRow);
        setFieldMapping({
          name: result.mapping.name,
          residentNo: result.mapping.residentNo,
          joinDate: result.mapping.joinDate,
          leaveDate: result.mapping.leaveDate,
          wage: result.mapping.wage,
          phone: result.mapping.phone,
        });
        setHeaders(extractHeaders(wb, bestSheet, result.headerRow));
        setUsingSavedMapping(false);

        const detected = [
          result.mapping.residentNo !== null && '주민번호',
          result.mapping.name !== null && '이름',
          result.mapping.joinDate !== null && '입사일',
          result.mapping.wage !== null && '급여',
        ].filter(Boolean);

        toast.show(`자동 감지: ${detected.join(', ')} (헤더 ${result.headerRow}행, 데이터 ${result.dataStartRow}행)`, 'success');
      } else {
        setHeaders(extractHeaders(wb, bestSheet, 1));
        toast.show('자동 감지 실패. 수동으로 매핑해주세요.', 'info');
      }
    };
    reader.readAsBinaryString(file);
  }, [selectedBusiness, tryLoadSavedMapping, extractHeaders, toast]);

  // 시트 변경 → 재감지
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setPreviewData([]);
    if (!workbook) return;

    const result = detectColumns(workbook, sheetName);
    setDetection(result);
    if (result) {
      setHeaderRow(result.headerRow);
      setDataStartRow(result.dataStartRow);
      setFieldMapping({
        name: result.mapping.name,
        residentNo: result.mapping.residentNo,
        joinDate: result.mapping.joinDate,
        leaveDate: result.mapping.leaveDate,
        wage: result.mapping.wage,
        phone: result.mapping.phone,
      });
      setHeaders(extractHeaders(workbook, sheetName, result.headerRow));
    } else {
      setHeaders(extractHeaders(workbook, sheetName, 1));
    }
  };

  // 헤더행 수동 변경
  const handleHeaderRowChange = (newRow: number) => {
    setHeaderRow(newRow);
    if (workbook && selectedSheet) {
      setHeaders(extractHeaders(workbook, selectedSheet, newRow));
    }
  };

  // 감지된 컬럼의 신뢰도 찾기
  const getConfidence = (colIndex: number | null): number => {
    if (colIndex === null || !detection) return 0;
    return detection.columns.find(c => c.colIndex === colIndex)?.confidence || 0;
  };

  // 컬럼 문자 (A, B, ... AA, AB)
  const colLetter = (idx: number) => indexToColumnLetter(idx);

  // 감지된 필드의 표시 텍스트
  const getMappedLabel = (colIndex: number | null): string => {
    if (colIndex === null) return '미감지';
    const header = headers.find(h => h.index === colIndex);
    return `${colLetter(colIndex)}: ${header?.name || `열 ${colIndex + 1}`}`;
  };

  // 미리보기 생성
  const loadPreview = useCallback(() => {
    if (!workbook || !selectedSheet) return;

    const nameIdx = fieldMapping.name;
    const residentNoIdx = fieldMapping.residentNo;

    if (nameIdx === null || residentNoIdx === null) {
      toast.show('이름과 주민번호를 지정해주세요.', 'error');
      return;
    }

    const ws = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const rows: ImportRow[] = [];

    for (let i = dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[nameIdx]) continue;

      const name = String(row[nameIdx] || '').trim();
      const residentNo = normalizeResidentNo(String(row[residentNoIdx] || ''));

      const joinDateRaw = fieldMapping.joinDate !== null ? row[fieldMapping.joinDate] : null;
      const leaveDateRaw = fieldMapping.leaveDate !== null ? row[fieldMapping.leaveDate] : null;
      const wageRaw = fieldMapping.wage !== null ? row[fieldMapping.wage] : 0;
      const phoneRaw = fieldMapping.phone !== null ? row[fieldMapping.phone] : null;

      const joinDate = parseExcelDate(joinDateRaw);
      const leaveDate = parseExcelDate(leaveDateRaw);
      const wage = typeof wageRaw === 'number' ? wageRaw : parseInt(String(wageRaw).replace(/,/g, '')) || 0;
      const phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, '') : undefined;

      if (name && residentNo.length >= 6) {
        rows.push({ name, residentNo, joinDate, leaveDate: leaveDate || undefined, wage, phone });
      }
    }

    setPreviewData(rows);
    if (rows.length === 0) {
      toast.show('데이터를 찾지 못했습니다. 행 설정을 확인해주세요.', 'info');
    }
  }, [workbook, selectedSheet, fieldMapping, dataStartRow, toast]);

  // 매핑 저장
  const saveMapping = () => {
    if (!selectedBusiness) return;

    const columns: Record<string, number> = {};
    CORE_FIELDS.forEach(f => {
      if (fieldMapping[f.key] !== null) {
        columns[f.key] = fieldMapping[f.key]! + 1; // 1-indexed 저장
      }
    });
    // 필수 필드 폴백
    if (!columns.name) columns.name = 1;
    if (!columns.residentNo) columns.residentNo = 1;
    if (!columns.joinDate) columns.joinDate = 1;
    if (!columns.leaveDate) columns.leaveDate = 1;
    if (!columns.wage) columns.wage = 1;

    setExcelMapping({
      businessId: selectedBusiness,
      sheetName: selectedSheet,
      headerRow,
      dataStartRow,
      columns: columns as typeof columns & {
        name: number; residentNo: number; joinDate: number; leaveDate: number; wage: number;
      },
    });
    toast.show('매핑이 저장되었습니다. 다음부터 자동 적용됩니다.', 'success');
  };

  // Import 실행
  const handleImport = async () => {
    if (!selectedBusiness || previewData.length === 0) {
      toast.show('데이터를 미리보기한 후 Import하세요.', 'error');
      return;
    }

    setIsImporting(true);
    let deletedCount = 0;

    try {
      if (overwriteMode) {
        deletedCount = await deleteEmploymentsByBusiness(selectedBusiness);
      }

      const workerByResidentNo = new Map(workers.map((w) => [w.residentNo, w]));
      const currentEmployments = useStore.getState().employments;
      const businessEmployments = currentEmployments.filter((e) => e.businessId === selectedBusiness);
      const existingEmploymentWorkerIds = new Set(businessEmployments.map((e) => e.workerId));

      const newWorkers: Worker[] = [];
      const newEmployments: Employment[] = [];
      let newWorkerCount = 0;
      let newEmploymentCount = 0;
      let skippedCount = 0;

      previewData.forEach((row) => {
        const existingWorker = workerByResidentNo.get(row.residentNo);

        const makeEmployment = (workerId: string): Employment => ({
          id: crypto.randomUUID(),
          workerId,
          businessId: selectedBusiness,
          status: row.leaveDate ? 'INACTIVE' : 'ACTIVE',
          joinDate: row.joinDate || new Date().toISOString().slice(0, 10),
          leaveDate: row.leaveDate,
          monthlyWage: row.wage || getDefaultMonthlyWage(),
          jikjongCode: business?.defaultJikjong || (DEFAULTS.JIKJONG_CODE as string),
          workHours: business?.defaultWorkHours || DEFAULTS.WORK_HOURS,
          gyYn: true,
          sjYn: true,
          npsYn: true,
          nhicYn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (existingWorker) {
          if (existingEmploymentWorkerIds.has(existingWorker.id)) {
            skippedCount++;
            return;
          }
          newEmployments.push(makeEmployment(existingWorker.id));
          existingEmploymentWorkerIds.add(existingWorker.id);
          newEmploymentCount++;
        } else {
          const workerId = crypto.randomUUID();
          newWorkers.push({
            id: workerId,
            name: row.name,
            residentNo: row.residentNo,
            nationality: DEFAULTS.NATIONALITY as string,
            phone: row.phone,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          newEmployments.push(makeEmployment(workerId));
          workerByResidentNo.set(row.residentNo, { id: workerId } as Worker);
          existingEmploymentWorkerIds.add(workerId);
          newWorkerCount++;
        }
      });

      if (newWorkers.length > 0) addWorkers(newWorkers);
      if (newEmployments.length > 0) addEmployments(newEmployments);

      const resultMsg = overwriteMode
        ? `Import 완료! 기존 삭제: ${deletedCount}명, 신규: ${newWorkerCount}명, 추가: ${newEmploymentCount}명`
        : `Import 완료! 신규: ${newWorkerCount}명, 추가: ${newEmploymentCount}명, 중복 스킵: ${skippedCount}명`;
      toast.show(resultMsg, 'success');
      setPreviewData([]);
    } catch (error) {
      console.error('Import 에러:', error);
      toast.show('Import 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '엑셀 Import' }]}
        title="엑셀 Import"
        description="급여대장을 올리면 자동으로 컬럼을 감지합니다"
      />

      <div className="grid grid-cols-2 gap-6">
        {/* 좌측: 설정 */}
        <div className="space-y-4">
          {/* 1. 파일 업로드 */}
          <div className="glass p-5">
            <h2 className="text-base font-semibold text-white mb-3">1. 급여대장 파일</h2>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={!selectedBusiness}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 disabled:opacity-50"
            />
            {fileName && <p className="mt-2 text-sm text-white/60">선택됨: {fileName}</p>}
            {!selectedBusiness && (
              <p className="mt-2 text-sm text-yellow-400">좌측 메뉴에서 사업장을 먼저 선택하세요.</p>
            )}
          </div>

          {/* 2. 감지 결과 + 매핑 조정 */}
          {sheets.length > 0 && (
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">
                  2. 감지 결과
                  {usingSavedMapping && (
                    <span className="ml-2 text-xs text-blue-400 font-normal">(저장된 매핑)</span>
                  )}
                </h2>
                {detection && !usingSavedMapping && (
                  <span className="text-xs text-green-400">자동 감지됨</span>
                )}
              </div>

              {/* 시트 & 행 설정 (접히는 영역) */}
              <details className="mb-4">
                <summary className="text-sm text-white/50 cursor-pointer hover:text-white/70">
                  시트: {selectedSheet} / 헤더 {headerRow}행 / 데이터 {dataStartRow}행
                  <span className="ml-1 text-white/30">(수정하려면 클릭)</span>
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">시트</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full input-glass px-3 py-2 text-sm"
                    >
                      {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-white/60 mb-1">헤더 행</label>
                      <input
                        type="number"
                        value={headerRow}
                        onChange={(e) => handleHeaderRowChange(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">데이터 시작 행</label>
                      <input
                        type="number"
                        value={dataStartRow}
                        onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* 핵심 필드 매핑 */}
              <div className="space-y-2">
                {CORE_FIELDS.map(({ key, label, required }) => {
                  const colIdx = fieldMapping[key];
                  const confidence = getConfidence(colIdx);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-20 text-sm text-white/70 shrink-0">
                        {label}
                        {required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      <select
                        value={colIdx ?? ''}
                        onChange={(e) => setFieldMapping({
                          ...fieldMapping,
                          [key]: e.target.value === '' ? null : parseInt(e.target.value),
                        })}
                        className={`flex-1 input-glass px-2 py-1.5 text-sm ${
                          colIdx !== null ? 'border-green-500/30' : required ? 'border-red-500/30' : ''
                        }`}
                      >
                        <option value="">-- 선택 안함 --</option>
                        {headers.map((h) => (
                          <option key={h.index} value={h.index}>
                            {colLetter(h.index)}: {h.name}
                          </option>
                        ))}
                      </select>
                      {colIdx !== null && !usingSavedMapping && (
                        <ConfidenceBadge confidence={confidence} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 감지된 추가 컬럼 요약 */}
              {detection && detection.mapping.numberColumns.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                    감지된 숫자 컬럼 {detection.mapping.numberColumns.length}개 (급여/공제 항목)
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {detection.mapping.numberColumns.map(nc => (
                      <span key={nc.colIndex} className="px-2 py-0.5 text-xs bg-white/5 rounded text-white/50">
                        {colLetter(nc.colIndex)}: {nc.headerHint || `열${nc.colIndex + 1}`}
                      </span>
                    ))}
                  </div>
                </details>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 mt-4 pt-3 border-t border-white/10">
                <button onClick={loadPreview} className="btn-secondary flex-1">미리보기</button>
                <button onClick={saveMapping} className="btn-primary flex-1">매핑 저장</button>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 미리보기 */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">미리보기 ({previewData.length}명)</h2>
            {previewData.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteMode}
                    onChange={(e) => setOverwriteMode(e.target.checked)}
                    className="w-4 h-4 rounded bg-white/10 border-white/20"
                  />
                  기존 삭제 후 재등록
                </label>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="btn-primary disabled:opacity-50"
                >
                  {isImporting ? '처리중...' : 'Import 실행'}
                </button>
              </div>
            )}
          </div>

          {previewData.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/40">파일을 업로드하면 자동으로 컬럼을 감지합니다</p>
              <p className="text-white/40 mt-1 text-sm">&quot;미리보기&quot; 버튼으로 결과를 확인하세요</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full table-glass text-sm">
                <thead className="sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2">이름</th>
                    <th className="px-3 py-2">주민번호</th>
                    <th className="px-3 py-2">입사일</th>
                    <th className="px-3 py-2">퇴사일</th>
                    <th className="px-3 py-2 text-right">보수</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-white">{row.name}</td>
                      <td className="px-3 py-2 text-white/60 font-mono">{row.residentNo.slice(0, 6)}-***</td>
                      <td className="px-3 py-2 text-white/60">{row.joinDate || '-'}</td>
                      <td className="px-3 py-2 text-white/60">{row.leaveDate || '-'}</td>
                      <td className="px-3 py-2 text-white/60 text-right">{row.wage.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
