'use client';

import { useStore } from '@/store/useStore';
import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Worker, Employment } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { normalizeResidentNo } from '@/hooks/useExcelImport';
import { getDefaultMonthlyWage, DEFAULTS } from '@/lib/constants';
import type { HeaderInfo } from '@/types';

interface ImportRow {
  name: string;
  residentNo: string;
  joinDate: string;
  leaveDate?: string;
  wage: number;
  phone?: string;   // 명세서 발송용
  email?: string;   // 명세서 발송용
}

// 필드 그룹 정의
const FIELD_GROUPS = {
  기본정보: [
    { key: 'name', label: '이름', required: true },
    { key: 'residentNo', label: '주민번호', required: true },
    { key: 'joinDate', label: '입사일', required: false },
    { key: 'leaveDate', label: '퇴사일', required: false },
    { key: 'phone', label: '전화번호', required: false },
    { key: 'email', label: '이메일', required: false },
  ],
  지급항목: [
    { key: 'basicWage', label: '기본급', required: false },
    { key: 'overtimeWage', label: '연장근로수당', required: false },
    { key: 'nightWage', label: '야간근로수당', required: false },
    { key: 'holidayWage', label: '휴일근로수당', required: false },
    { key: 'annualLeaveWage', label: '연차수당', required: false },
    { key: 'bonusWage', label: '상여금', required: false },
    { key: 'mealAllowance', label: '식대', required: false },
    { key: 'carAllowance', label: '차량유지비', required: false },
    { key: 'otherWage', label: '기타수당', required: false },
    { key: 'wage', label: '임금총액(세전)', required: false },
  ],
  공제항목: [
    { key: 'nps', label: '국민연금', required: false },
    { key: 'nhic', label: '건강보험', required: false },
    { key: 'ltc', label: '장기요양보험', required: false },
    { key: 'ei', label: '고용보험', required: false },
    { key: 'incomeTax', label: '소득세', required: false },
    { key: 'localTax', label: '지방소득세', required: false },
    { key: 'otherDeduction', label: '기타공제', required: false },
    { key: 'totalDeduction', label: '공제액합계', required: false },
    { key: 'advancePayment', label: '기지급액', required: false },
  ],
  결과: [
    { key: 'netWage', label: '실지급액', required: false },
    { key: 'workDays', label: '근무일수', required: false },
    { key: 'deductionDays', label: '공제일수', required: false },
    { key: 'deductionHours', label: '공제시간', required: false },
  ],
};

// 모든 필드 키 배열 (초기화용)
const ALL_FIELD_KEYS = Object.values(FIELD_GROUPS).flat().map(f => f.key);

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

  // 헤더 정보
  const [headers, setHeaders] = useState<HeaderInfo[]>([]);
  const [headerRow, setHeaderRow] = useState(4);
  const [dataStartRow, setDataStartRow] = useState(6);

  // 필드별 선택된 헤더 인덱스 (null = 선택 안함)
  const [fieldMapping, setFieldMapping] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    ALL_FIELD_KEYS.forEach(key => { initial[key] = null; });
    return initial;
  });

  const business = businesses.find((b) => b.id === selectedBusiness);

  // 사업장 변경 시 상태 초기화
  useEffect(() => {
    setPreviewData([]);
    setFileName('');
    setSheets([]);
    setSelectedSheet('');
    setWorkbook(null);
    setHeaders([]);
  }, [selectedBusiness]);

  // 헤더 추출 (지정된 행 + 이전 행 병합 시도)
  const extractHeaders = useCallback((wb: XLSX.WorkBook, sheetName: string, hRow: number): HeaderInfo[] => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];

    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    const result: HeaderInfo[] = [];

    // 지정된 헤더 행 (1-indexed → 0-indexed)
    const headerRowIdx = hRow - 1;
    const prevRowIdx = hRow - 2;

    for (let c = 0; c < 60; c++) {
      // 지정 행의 헤더
      const mainHeader = jsonData[headerRowIdx]?.[c];
      // 이전 행 (병합 헤더가 있을 수 있음)
      const prevHeader = prevRowIdx >= 0 ? jsonData[prevRowIdx]?.[c] : null;

      // 병합: 이전 행 + 현재 행
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

  // 기존 매핑 로드 - headerRow 값도 반환
  const loadExistingMapping = useCallback((businessId: string): { sheetName: string | null; headerRow: number } => {
    const existing = excelMappings.find((m) => m.businessId === businessId);
    if (existing) {
      const hRow = existing.headerRow || 4;
      setHeaderRow(hRow);
      setDataStartRow(existing.dataStartRow || 6);
      // columns는 1-indexed로 저장되어 있으므로 0-indexed로 변환
      const cols = existing.columns as Record<string, number | undefined>;
      const loaded: Record<string, number | null> = {};
      ALL_FIELD_KEYS.forEach(key => {
        loaded[key] = cols[key] != null ? cols[key]! - 1 : null;
      });
      setFieldMapping(loaded);
      return { sheetName: existing.sheetName, headerRow: hRow };
    }
    return { sheetName: null, headerRow: 4 };
  }, [excelMappings]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      setWorkbook(wb);
      setSheets(wb.SheetNames);

      // 기존 매핑 로드 (동기적으로 headerRow 값 받아옴)
      const { sheetName: savedSheet, headerRow: savedHeaderRow } = selectedBusiness
        ? loadExistingMapping(selectedBusiness)
        : { sheetName: null, headerRow: 4 };

      // 시트 선택
      let autoSheet = savedSheet || '';
      if (!autoSheet || !wb.SheetNames.includes(autoSheet)) {
        autoSheet = wb.SheetNames.find((s: string) => s.includes('임금대장')) || wb.SheetNames[0];
      }
      setSelectedSheet(autoSheet);

      // 헤더 추출 (저장된 headerRow 값 사용)
      const extractedHeaders = extractHeaders(wb, autoSheet, savedHeaderRow);
      setHeaders(extractedHeaders);
    };

    reader.readAsBinaryString(file);
  }, [selectedBusiness, loadExistingMapping, extractHeaders]);

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

  // 미리보기
  const loadPreview = () => {
    if (!workbook || !selectedSheet) return;

    const nameIdx = fieldMapping.name;
    const residentNoIdx = fieldMapping.residentNo;

    if (nameIdx === null || residentNoIdx === null) {
      toast.show('이름과 주민번호 헤더를 선택해주세요.', 'error');
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
      // 전화번호/이메일 추출 (명세서 발송용)
      const phoneRaw = fieldMapping.phone !== null ? row[fieldMapping.phone] : null;
      const emailRaw = fieldMapping.email !== null ? row[fieldMapping.email] : null;

      const parseDate = (val: unknown): string => {
        if (!val) return '';
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        const str = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        if (/^\d{8}$/.test(str)) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
        const dotMatch = str.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
        if (dotMatch) {
          const [, yy, mm, dd] = dotMatch;
          const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`;
          return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        return str;
      };

      const joinDate = parseDate(joinDateRaw);
      const leaveDate = parseDate(leaveDateRaw);
      const wage = typeof wageRaw === 'number' ? wageRaw : parseInt(String(wageRaw).replace(/,/g, '')) || 0;
      // 전화번호 정규화 (숫자만 추출 후 포맷)
      const phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, '') : undefined;
      const email = emailRaw ? String(emailRaw).trim() : undefined;

      if (name && residentNo.length >= 6) {
        rows.push({ name, residentNo, joinDate, leaveDate: leaveDate || undefined, wage, phone, email });
      }
    }

    setPreviewData(rows);
  };

  // 매핑 저장 (undefined 값 제외 - Firebase 호환)
  const saveMapping = () => {
    if (!selectedBusiness) return;

    // 0-indexed를 1-indexed로 변환하여 저장
    // Firebase는 undefined 값을 허용하지 않으므로 필터링
    const columns: Record<string, number> = {
      // 필수 필드는 기본값 1
      name: fieldMapping.name !== null ? fieldMapping.name + 1 : 1,
      residentNo: fieldMapping.residentNo !== null ? fieldMapping.residentNo + 1 : 1,
      joinDate: fieldMapping.joinDate !== null ? fieldMapping.joinDate + 1 : 1,
      leaveDate: fieldMapping.leaveDate !== null ? fieldMapping.leaveDate + 1 : 1,
      wage: fieldMapping.wage !== null ? fieldMapping.wage + 1 : 1,
    };

    // 선택 필드는 값이 있을 때만 추가 (undefined 방지)
    ALL_FIELD_KEYS.forEach(key => {
      if (!['name', 'residentNo', 'joinDate', 'leaveDate', 'wage'].includes(key)) {
        if (fieldMapping[key] !== null) {
          columns[key] = fieldMapping[key]! + 1;
        }
      }
    });

    setExcelMapping({
      businessId: selectedBusiness,
      sheetName: selectedSheet,
      headerRow,
      dataStartRow,
      columns: columns as typeof columns & {
        name: number;
        residentNo: number;
        joinDate: number;
        leaveDate: number;
        wage: number;
      },
    });
    toast.show('매핑 설정이 저장되었습니다.', 'success');
  };

  // Import 실행
  const handleImport = async () => {
    if (!selectedBusiness || previewData.length === 0) {
      toast.show('사업장을 선택하고 데이터를 미리보기하세요.', 'error');
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

        if (existingWorker) {
          if (existingEmploymentWorkerIds.has(existingWorker.id)) {
            skippedCount++;
            return;
          }

          const employmentId = crypto.randomUUID();
          newEmployments.push({
            id: employmentId,
            workerId: existingWorker.id,
            businessId: selectedBusiness,
            status: row.leaveDate ? 'INACTIVE' : 'ACTIVE',
            joinDate: row.joinDate || new Date().toISOString().slice(0, 10),
            leaveDate: row.leaveDate,
            monthlyWage: row.wage || getDefaultMonthlyWage(),
            jikjongCode: business?.defaultJikjong || DEFAULTS.JIKJONG_CODE,
            workHours: business?.defaultWorkHours || 40,
            gyYn: true,
            sjYn: true,
            npsYn: true,
            nhicYn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          existingEmploymentWorkerIds.add(existingWorker.id);
          newEmploymentCount++;
        } else {
          const workerId = crypto.randomUUID();
          const employmentId = crypto.randomUUID();

          newWorkers.push({
            id: workerId,
            name: row.name,
            residentNo: row.residentNo,
            nationality: '100',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          newEmployments.push({
            id: employmentId,
            workerId,
            businessId: selectedBusiness,
            status: row.leaveDate ? 'INACTIVE' : 'ACTIVE',
            joinDate: row.joinDate || new Date().toISOString().slice(0, 10),
            leaveDate: row.leaveDate,
            monthlyWage: row.wage || getDefaultMonthlyWage(),
            jikjongCode: business?.defaultJikjong || DEFAULTS.JIKJONG_CODE,
            workHours: business?.defaultWorkHours || 40,
            gyYn: true,
            sjYn: true,
            npsYn: true,
            nhicYn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

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
        description="급여대장에서 근로자 정보를 가져옵니다 (사업장별 1회 설정 후 자동 적용)"
      />

      <div className="grid grid-cols-2 gap-6">
        {/* 설정 패널 */}
        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-white mb-4">1. 급여대장 파일</h2>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={!selectedBusiness}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 disabled:opacity-50"
            />
            {fileName && <p className="mt-2 text-sm text-white/60">선택됨: {fileName}</p>}
          </div>

          {sheets.length > 0 && (
            <>
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">2. 시트 및 행 설정</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">시트</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full input-glass px-4 py-3"
                    >
                      {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">헤더 행</label>
                      <input
                        type="number"
                        value={headerRow}
                        onChange={(e) => handleHeaderRowChange(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">데이터 시작 행</label>
                      <input
                        type="number"
                        value={dataStartRow}
                        onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-4 py-3"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {headers.length > 0 && (
                <div className="glass p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">3. 헤더 매핑</h2>
                  <p className="text-sm text-white/40 mb-4">각 필드에 해당하는 엑셀 헤더를 선택하세요 (급여명세서 생성에 사용됩니다)</p>
                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                    {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                      <div key={groupName}>
                        <h3 className="text-sm font-medium text-white/60 mb-3 sticky top-0 bg-slate-800/90 py-1">{groupName}</h3>
                        <div className="space-y-2">
                          {fields.map(({ key, label, required }) => (
                            <div key={key} className="flex items-center gap-3">
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
                                <option value="">-- 선택 안함 --</option>
                                {headers.map((h) => {
                                  const colLetter = h.index < 26
                                    ? String.fromCharCode(65 + h.index)
                                    : String.fromCharCode(64 + Math.floor(h.index / 26)) + String.fromCharCode(65 + (h.index % 26));
                                  return (
                                    <option key={h.index} value={h.index}>
                                      {colLetter}: {h.name}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-6 pt-4 border-t border-white/10">
                    <button onClick={loadPreview} className="btn-secondary flex-1">미리보기</button>
                    <button onClick={saveMapping} className="btn-primary flex-1">매핑 저장</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 미리보기 패널 */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">미리보기 ({previewData.length}명)</h2>
            {previewData.length > 0 && (
              <div className="flex items-center gap-4">
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
              <p className="text-white/40">파일을 업로드하고 헤더를 매핑한 후</p>
              <p className="text-white/40">&quot;미리보기&quot; 버튼을 클릭하세요</p>
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
                    <th className="px-3 py-2">보수</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-white">{row.name}</td>
                      <td className="px-3 py-2 text-white/60 font-mono">{row.residentNo.slice(0, 6)}-***</td>
                      <td className="px-3 py-2 text-white/60">{row.joinDate || '-'}</td>
                      <td className="px-3 py-2 text-white/60">{row.leaveDate || '-'}</td>
                      <td className="px-3 py-2 text-white/60">{row.wage.toLocaleString()}</td>
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
