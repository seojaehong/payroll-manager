'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { MonthlyWage, Worker, Employment, Business, ExcelMapping, FieldGroups } from '@/types';
import { useExcelImport, parseExcelNumber, indexToColumnLetter, normalizeResidentNo } from '@/hooks/useExcelImport';
import { getYearRange, getDefaultMonthlyWage, DEFAULTS } from '@/lib/constants';
import { cleanUndefined } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';

interface WagesTabProps {
  businessId: string;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  addMonthlyWages: (wages: MonthlyWage[]) => void;
  excelMappings: ExcelMapping[];
  workers: Worker[];
  setExcelMapping: (mapping: ExcelMapping) => void;
  addWorkers: (workers: Worker[]) => void;
  addEmployments: (employments: Employment[]) => void;
  business: Business;
}

// 엑셀 행에서 MonthlyWage 빌드 (중복 코드 통합)
function buildWageFromRow(
  fm: Record<string, number | null>,
  row: unknown[],
  employmentId: string,
  yearMonth: string,
  totalWage: number,
): MonthlyWage {
  return cleanUndefined({
    id: `${employmentId}-${yearMonth}`,
    employmentId,
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
  }) as MonthlyWage;
}

// 엑셀 날짜 파싱 (숫자/문자열 모두 지원)
function parseExcelDate(val: unknown): string {
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
}

// 미리보기 행 타입 (any 제거)
interface WagePreviewRow {
  name: string;
  residentNo: string;
  joinDate?: string;
  matched: boolean;
  matchStatus: MatchStatus;
  matchReason: string;
  totalWage: number;
  basicWage?: number;
  overtimeWeekday?: number;
  overtimeWeekend?: number;
  nightWage?: number;
  holidayWage?: number;
  annualLeaveWage?: number;
  bonusWage?: number;
  mealAllowance?: number;
  carAllowance?: number;
  otherWage?: number;
  incomeTax?: number;
  localTax?: number;
  nps?: number;
  nhic?: number;
  ltc?: number;
  ei?: number;
  advancePayment?: number;
  otherDeduction?: number;
  totalDeduction?: number;
  netWage?: number;
  workDays?: number;
  deductionDays?: number;
  deductionHours?: number;
}

// 매칭 상태 타입
type MatchStatus = 'matched' | 'no_worker' | 'no_employment';

// 필드 정의 - 지급내역, 공제내역 포함
const FIELD_GROUPS: FieldGroups = {
  '기본정보': [
    { key: 'name', label: '이름', required: true },
    { key: 'residentNo', label: '주민번호', required: true },
    { key: 'joinDate', label: '입사일' },
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
    { key: 'wage', label: '임금총액', required: true },
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
  addWorkers,
  addEmployments,
  business,
}: WagesTabProps) {
  const toast = useToast();
  const [importMonth, setImportMonth] = useState('');
  const [importPreview, setImportPreview] = useState<WagePreviewRow[]>([]);
  const [showMappingModal, setShowMappingModal] = useState(false);

  // 다중 파일 일괄 업로드
  const [batchFiles, setBatchFiles] = useState<{ file: File; yearMonth: string }[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // 공통 훅 사용
  const excel = useExcelImport({ defaultHeaderRow: 4, defaultDataStartRow: 6 });

  const months = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);

  // 월 경계 사전 계산 (Date 객체 12개만 생성)
  const monthBoundaries = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      ym: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
      start: new Date(selectedYear, i, 1),
      end: new Date(selectedYear, i + 1, 0),
    })),
    [selectedYear]
  );

  // 급여 인덱스 (O(1) 조회용)
  const wageIndex = useMemo(() => {
    const idx = new Set<string>();
    for (const mw of monthlyWages) {
      idx.add(`${mw.employmentId}-${mw.yearMonth}`);
    }
    return idx;
  }, [monthlyWages]);

  // 급여 데이터 현황
  const wageStats = useMemo(() => {
    let total = 0;
    let filled = 0;

    businessEmployments.forEach(({ employment }) => {
      const joinDate = employment.joinDate ? new Date(employment.joinDate) : null;
      const leaveDate = employment.leaveDate ? new Date(employment.leaveDate) : null;

      for (const { ym, start, end } of monthBoundaries) {
        if (joinDate && joinDate > end) continue;
        if (leaveDate && leaveDate < start) continue;

        total++;
        if (wageIndex.has(`${employment.id}-${ym}`)) {
          filled++;
        }
      }
    });

    return { total, filled, percent: total > 0 ? Math.round((filled / total) * 100) : 100 };
  }, [businessEmployments, monthBoundaries, wageIndex]);

  // 정규화된 주민번호 → Worker 매핑 (중복 생성 방지)
  const workerByNormalizedRN = useMemo(() =>
    new Map(workers.map(w => [normalizeResidentNo(w.residentNo), w])),
    [workers]
  );

  // 미등록 근로자 일괄 등록 (Worker + Employment 생성)
  const handleAutoRegisterWorkers = () => {
    const noWorkerRows = importPreview.filter(p => p.matchStatus === 'no_worker');
    if (noWorkerRows.length === 0) return;

    const newWorkers: Worker[] = [];
    const newEmployments: Employment[] = [];
    const fallbackDate = importMonth ? `${importMonth}-01` : new Date().toISOString().slice(0, 10);

    for (const row of noWorkerRows) {
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
        businessId,
        status: 'ACTIVE' as const,
        joinDate: row.joinDate || fallbackDate,
        monthlyWage: row.totalWage || getDefaultMonthlyWage(),
        jikjongCode: business.defaultJikjong || DEFAULTS.JIKJONG_CODE,
        workHours: business.defaultWorkHours || 40,
        gyYn: true,
        sjYn: true,
        npsYn: true,
        nhicYn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    addWorkers(newWorkers);
    addEmployments(newEmployments);

    // 미리보기 재매칭: 등록된 근로자들을 매칭 성공으로 업데이트
    const registeredRNs = new Set(noWorkerRows.map(r => normalizeResidentNo(r.residentNo)));
    setImportPreview(prev => prev.map(row => {
      if (registeredRNs.has(normalizeResidentNo(row.residentNo)) && row.matchStatus === 'no_worker') {
        return { ...row, matched: true, matchStatus: 'matched' as MatchStatus, matchReason: '자동 등록 완료' };
      }
      return row;
    }));

    toast.show(`미등록 근로자 ${noWorkerRows.length}명이 자동 등록되었습니다.`, 'success');
  };

  // 타사업장 소속 근로자 → 이 사업장 고용관계 추가
  const handleAddEmployments = () => {
    const noEmpRows = importPreview.filter(p => p.matchStatus === 'no_employment');
    if (noEmpRows.length === 0) return;

    const newEmployments: Employment[] = [];
    const fallbackDate = importMonth ? `${importMonth}-01` : new Date().toISOString().slice(0, 10);

    for (const row of noEmpRows) {
      const matchedWorker = workerByNormalizedRN.get(normalizeResidentNo(row.residentNo));
      if (!matchedWorker) continue;

      const employmentId = crypto.randomUUID();
      newEmployments.push({
        id: employmentId,
        workerId: matchedWorker.id,
        businessId,
        status: 'ACTIVE' as const,
        joinDate: row.joinDate || fallbackDate,
        monthlyWage: row.totalWage || getDefaultMonthlyWage(),
        jikjongCode: business.defaultJikjong || DEFAULTS.JIKJONG_CODE,
        workHours: business.defaultWorkHours || 40,
        gyYn: true,
        sjYn: true,
        npsYn: true,
        nhicYn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    addEmployments(newEmployments);

    // 미리보기 재매칭
    const addedRNs = new Set(noEmpRows.map(r => normalizeResidentNo(r.residentNo)));
    setImportPreview(prev => prev.map(row => {
      if (addedRNs.has(normalizeResidentNo(row.residentNo)) && row.matchStatus === 'no_employment') {
        return { ...row, matched: true, matchStatus: 'matched' as MatchStatus, matchReason: '고용관계 추가 완료' };
      }
      return row;
    }));

    toast.show(`${noEmpRows.length}명의 고용관계가 추가되었습니다.`, 'success');
  };

  // 기존 매핑 로드 (workbook을 직접 전달하여 비동기 상태 문제 해결)
  const loadExistingMapping = (wb?: XLSX.WorkBook) => {
    const existing = excelMappings.find((m) => m.businessId === businessId);
    if (existing) {
      excel.applyMapping({
        sheetName: existing.sheetName,
        headerRow: existing.headerRow,
        dataStartRow: existing.dataStartRow,
        columns: existing.columns,
      }, wb);  // workbook 직접 전달
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
        excel.handleFileUpload(batch[0].file, (wb) => {
          loadExistingMapping(wb);  // workbook 직접 전달
          setShowMappingModal(true);
        });
      } else {
        toast.show('파일명에서 년월을 추출할 수 없습니다. (예: 202501_급여.xlsx)', 'error');
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
        const savedSheet = loadExistingMapping(wb);  // workbook 직접 전달
        if (savedSheet && wb.SheetNames.includes(savedSheet)) {
          excel.handleSheetChange(savedSheet);
        }
        setShowMappingModal(true);
      });
    }

    e.target.value = '';
  };

  // 다중 파일 일괄 처리 (미등록 근로자 자동 등록 포함)
  const executeBatchImport = async () => {
    if (batchFiles.length === 0) return;

    setBatchProcessing(true);
    let totalImported = 0;
    // 가장 이른 파일의 yearMonth 1일을 취득일로 사용
    const earliestYM = batchFiles[0]?.yearMonth || new Date().toISOString().slice(0, 7);
    const batchJoinDate = `${earliestYM}-01`;

    // 1단계: 모든 파일에서 미등록 근로자 수집 (중복 제거)
    const unmatchedByRN = new Map<string, { name: string; residentNo: string; totalWage: number; joinDate: string }>();
    const noEmpByRN = new Map<string, { residentNo: string; totalWage: number; joinDate: string }>();
    const allFileData: { yearMonth: string; jsonData: unknown[][]; }[] = [];

    const fm = excel.fieldMapping;
    const nameIdx = fm.name;
    const residentNoIdx = fm.residentNo;

    if (nameIdx == null || residentNoIdx == null) {
      setBatchProcessing(false);
      toast.show('이름과 주민번호 매핑이 필요합니다.', 'error');
      return;
    }

    for (const { file, yearMonth } of batchFiles) {
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsBinaryString(file);
      });

      const wb = XLSX.read(data, { type: 'binary' });
      const savedSheet = excelMappings.find((m) => m.businessId === businessId)?.sheetName || wb.SheetNames[0];
      const ws = wb.Sheets[savedSheet];
      if (!ws) { allFileData.push({ yearMonth, jsonData: [] }); continue; }

      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      allFileData.push({ yearMonth, jsonData });

      for (let i = excel.dataStartRow - 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || !row[nameIdx]) continue;

        const name = String(row[nameIdx] || '').trim();
        const residentNo = normalizeResidentNo(String(row[residentNoIdx] || ''));
        const totalWage = parseExcelNumber(row[fm.wage!]) || 0;
        if (!name || totalWage === 0) continue;

        const joinDateRaw = fm.joinDate != null ? row[fm.joinDate] : null;
        const joinDate = parseExcelDate(joinDateRaw) || batchJoinDate;

        const matchedWorker = workerByNormalizedRN.get(residentNo);
        if (!matchedWorker) {
          if (!unmatchedByRN.has(residentNo)) {
            unmatchedByRN.set(residentNo, { name, residentNo, totalWage, joinDate });
          }
        } else if (!businessEmployments.find(({ worker }) => worker.id === matchedWorker.id)) {
          if (!noEmpByRN.has(residentNo)) {
            noEmpByRN.set(residentNo, { residentNo, totalWage, joinDate });
          }
        }
      }
    }

    // 2단계: 미등록 근로자 자동 등록
    const newWorkers: Worker[] = [];
    const newEmployments: Employment[] = [];
    // 로컬 매칭용 임시 맵 (workerByNormalizedRN은 memo이므로 즉시 갱신 안됨)
    const localWorkerMap = new Map(workerByNormalizedRN);
    const localEmpWorkerIds = new Set(businessEmployments.map(({ worker }) => worker.id));

    for (const [rn, info] of unmatchedByRN) {
      const workerId = crypto.randomUUID();
      const employmentId = crypto.randomUUID();
      newWorkers.push({
        id: workerId, name: info.name, residentNo: info.residentNo,
        nationality: '100', createdAt: new Date(), updatedAt: new Date(),
      });
      newEmployments.push({
        id: employmentId, workerId, businessId, status: 'ACTIVE' as const,
        joinDate: info.joinDate, monthlyWage: info.totalWage || getDefaultMonthlyWage(),
        jikjongCode: business.defaultJikjong || DEFAULTS.JIKJONG_CODE,
        workHours: business.defaultWorkHours || 40,
        gyYn: true, sjYn: true, npsYn: true, nhicYn: true,
        createdAt: new Date(), updatedAt: new Date(),
      });
      localWorkerMap.set(rn, { id: workerId, name: info.name, residentNo: info.residentNo, nationality: '100', createdAt: new Date(), updatedAt: new Date() });
      localEmpWorkerIds.add(workerId);
    }

    // 타사업장 근로자 고용관계 추가
    for (const [rn, info] of noEmpByRN) {
      const existingWorker = localWorkerMap.get(rn);
      if (!existingWorker) continue;
      const employmentId = crypto.randomUUID();
      newEmployments.push({
        id: employmentId, workerId: existingWorker.id, businessId, status: 'ACTIVE' as const,
        joinDate: info.joinDate, monthlyWage: info.totalWage || getDefaultMonthlyWage(),
        jikjongCode: business.defaultJikjong || DEFAULTS.JIKJONG_CODE,
        workHours: business.defaultWorkHours || 40,
        gyYn: true, sjYn: true, npsYn: true, nhicYn: true,
        createdAt: new Date(), updatedAt: new Date(),
      });
      localEmpWorkerIds.add(existingWorker.id);
    }

    if (newWorkers.length > 0) addWorkers(newWorkers);
    if (newEmployments.length > 0) addEmployments(newEmployments);

    // 3단계: employmentId 매핑 (새로 등록된 것 포함)
    const allEmployments = [...businessEmployments.map(be => be), ...newEmployments.map(emp => {
      const w = localWorkerMap.get(normalizeResidentNo(
        newWorkers.find(nw => nw.id === emp.workerId)?.residentNo || ''
      )) || localWorkerMap.get(
        [...localWorkerMap.entries()].find(([, w]) => w.id === emp.workerId)?.[0] || ''
      );
      return w ? { employment: emp, worker: w } : null;
    }).filter(Boolean)] as { employment: Employment; worker: Worker }[];

    // 4단계: 모든 파일에서 급여 임포트
    for (const { yearMonth, jsonData } of allFileData) {
      if (jsonData.length === 0) continue;

      const newWages: MonthlyWage[] = [];
      for (let i = excel.dataStartRow - 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || !row[nameIdx]) continue;

        const name = String(row[nameIdx] || '').trim();
        const residentNo = normalizeResidentNo(String(row[residentNoIdx] || ''));
        const totalWage = parseExcelNumber(row[fm.wage!]) || 0;
        if (!name || totalWage === 0) continue;

        const matchedWorker = localWorkerMap.get(residentNo);
        if (!matchedWorker) continue;

        const matchedEmp = allEmployments.find(({ worker }) => worker.id === matchedWorker.id);
        if (!matchedEmp) continue;

        newWages.push(buildWageFromRow(fm, row, matchedEmp.employment.id, yearMonth, totalWage));
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

    const autoRegCount = unmatchedByRN.size + noEmpByRN.size;
    let message = `일괄 임포트 완료! ${batchFiles.length}개 파일, ${totalImported}건 성공`;
    if (autoRegCount > 0) message += ` (자동 등록 ${autoRegCount}명)`;
    toast.show(message, 'success');
  };

  // 미리보기 로드
  const loadPreview = () => {
    if (!excel.workbook || !excel.selectedSheet) return;

    const nameIdx = excel.fieldMapping.name;
    const residentNoIdx = excel.fieldMapping.residentNo;
    const wageIdx = excel.fieldMapping.wage;

    if (nameIdx == null || residentNoIdx == null) {
      toast.show('이름과 주민번호 헤더를 선택해주세요.', 'error');
      return;
    }

    const ws = excel.workbook.Sheets[excel.selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    const preview: WagePreviewRow[] = [];
    const fm = excel.fieldMapping;

    for (let i = excel.dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[];
      if (!row || !row[nameIdx]) continue;

      const name = String(row[nameIdx] || '').trim();
      const residentNo = normalizeResidentNo(String(row[residentNoIdx] || ''));

      const totalWage = parseExcelNumber(row[wageIdx!]) || 0;
      if (!name || totalWage === 0) continue;

      // 입사일 파싱
      const joinDateRaw = fm.joinDate != null ? row[fm.joinDate] : null;
      const joinDate = parseExcelDate(joinDateRaw);

      // 매칭 상태 판단 (정규화된 주민번호로 비교)
      const matchedWorker = workerByNormalizedRN.get(residentNo);
      const matchedEmp = matchedWorker
        ? businessEmployments.find(({ worker }) => worker.id === matchedWorker.id)
        : null;

      let matchStatus: MatchStatus;
      let matchReason: string;

      if (matchedEmp) {
        matchStatus = 'matched';
        matchReason = '매칭 성공';
      } else if (!matchedWorker) {
        matchStatus = 'no_worker';
        matchReason = `미등록 근로자 (주민번호: ${residentNo.slice(0, 6)}-*******)`;
      } else {
        matchStatus = 'no_employment';
        matchReason = `다른 사업장 소속 (${matchedWorker.name})`;
      }

      preview.push({
        name,
        residentNo,
        joinDate: joinDate || undefined,
        matched: matchStatus === 'matched',
        matchStatus,
        matchReason,
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
    } as ExcelMapping);
    toast.show('매핑 저장 완료! 다음부터 자동 적용됩니다.', 'success');
  };

  // Import 실행
  const executeImport = () => {
    if (!importMonth || importPreview.length === 0) {
      toast.show('임포트할 월을 선택하고 데이터를 확인하세요.', 'error');
      return;
    }

    const newWages: MonthlyWage[] = [];
    let matchedCount = 0;

    importPreview.forEach((row) => {
      const matchedWorker = workerByNormalizedRN.get(normalizeResidentNo(row.residentNo));
      if (!matchedWorker) return;

      const matchedEmp = businessEmployments.find(({ worker }) => worker.id === matchedWorker.id);
      if (!matchedEmp) return;

      newWages.push(cleanUndefined({
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
      }) as MonthlyWage);
      matchedCount++;
    });

    if (newWages.length > 0) {
      addMonthlyWages(newWages);
      toast.show(`임포트 완료! ${matchedCount}명의 급여가 저장되었습니다.`, 'success');
      setImportPreview([]);
      setImportMonth('');
    } else {
      toast.show('저장할 데이터가 없습니다.', 'info');
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
          {getYearRange(-3, 0).map((y) => (
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
              <span className="text-white/60 text-sm">
                미리보기 ({importPreview.length}명)
                {importPreview.filter(p => !p.matched).length > 0 && (
                  <span className="ml-2 text-yellow-400">
                    ⚠ 매칭 실패 {importPreview.filter(p => !p.matched).length}명
                  </span>
                )}
              </span>
              <button
                onClick={() => setShowMappingModal(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                매핑 다시 설정
              </button>
            </div>

            {/* 매칭 실패 요약 + 자동등록 버튼 */}
            {importPreview.filter(p => !p.matched).length > 0 && (
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                <div className="text-yellow-400 font-medium mb-2">매칭 실패 원인:</div>
                <div className="space-y-2 text-white/70">
                  {importPreview.filter(p => p.matchStatus === 'no_worker').length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">●</span>
                        <span>미등록 근로자: {importPreview.filter(p => p.matchStatus === 'no_worker').length}명</span>
                      </div>
                      <button
                        onClick={handleAutoRegisterWorkers}
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs transition-all"
                      >
                        일괄 등록 ({importPreview.filter(p => p.matchStatus === 'no_worker').length}명)
                      </button>
                    </div>
                  )}
                  {importPreview.filter(p => p.matchStatus === 'no_employment').length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400">●</span>
                        <span>다른 사업장 소속: {importPreview.filter(p => p.matchStatus === 'no_employment').length}명</span>
                      </div>
                      <button
                        onClick={handleAddEmployments}
                        className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-xs transition-all"
                      >
                        고용관계 추가 ({importPreview.filter(p => p.matchStatus === 'no_employment').length}명)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-auto">
            <table className="w-full table-glass text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">이름</th>
                  <th className="px-3 py-2 text-right">임금총액</th>
                  <th className="px-3 py-2 text-right">공제액</th>
                  <th className="px-3 py-2 text-right">실지급액</th>
                  <th className="px-3 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row, i) => (
                  <tr key={i} className={row.matched ? '' : 'bg-red-500/5'}>
                    <td className="px-3 py-2 text-white">{row.name}</td>
                    <td className="px-3 py-2 text-right text-white/80">{row.totalWage?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2 text-right text-red-400">{row.totalDeduction?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2 text-right text-green-400">{row.netWage?.toLocaleString() || 0}</td>
                    <td className="px-3 py-2">
                      {row.matched ? (
                        <span className="text-green-400">✓ 매칭</span>
                      ) : (
                        <span className={row.matchStatus === 'no_worker' ? 'text-red-400' : 'text-orange-400'} title={row.matchReason}>
                          ✗ {row.matchStatus === 'no_worker' ? '미등록' : '타사업장'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* 연도 하드코딩 → 동적 생성은 CRITICAL #5에서 처리 */}

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
              임금총액={excel.fieldMapping.wage != null ? `${excel.fieldMapping.wage}번째 열` : '미선택'}
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
                    onClick={() => excel.runAutoMapping()}
                    className="btn-secondary flex-1 text-green-400"
                  >
                    자동 매핑
                  </button>
                  <button
                    onClick={() => excel.setFullFieldMapping({})}
                    className="btn-secondary flex-1 text-yellow-400"
                  >
                    초기화
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
