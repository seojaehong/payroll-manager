'use client';

import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';
import { Worker, Employment } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import {
  useExcelImportWithDetection,
  indexToColumnLetter,
} from '@/hooks/useExcelImport';
import type { ImportRow } from '@/hooks/useExcelImport';
import { getDefaultMonthlyWage, DEFAULTS } from '@/lib/constants';

const CORE_FIELDS = [
  { key: 'name', label: '이름', required: true },
  { key: 'residentNo', label: '주민번호', required: true },
  { key: 'joinDate', label: '입사일', required: false },
  { key: 'leaveDate', label: '퇴사일', required: false },
  { key: 'wage', label: '급여(총액)', required: false },
  { key: 'phone', label: '전화번호', required: false },
] as const;

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

  const [overwriteMode, setOverwriteMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const excel = useExcelImportWithDetection();
  const business = businesses.find((b) => b.id === selectedBusiness);

  // 사업장 변경 시 초기화
  useEffect(() => {
    excel.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness]);

  const colLetter = (idx: number) => indexToColumnLetter(idx);

  // 파일 업로드
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    excel.handleFileUpload(file, selectedBusiness, excelMappings, (result) => {
      toast.show(result.message, result.type === 'detection-failed' ? 'info' : 'success');
    });
  };

  // 미리보기
  const onLoadPreview = () => {
    const result = excel.loadPreview();
    if (!result.success && result.message) {
      toast.show(result.message, 'error');
    }
  };

  // 매핑 저장
  const onSaveMapping = () => {
    if (!selectedBusiness) return;
    const mappingData = excel.getMappingForSave();
    setExcelMapping({
      businessId: selectedBusiness,
      ...mappingData,
      columns: mappingData.columns as typeof mappingData.columns & {
        name: number; residentNo: number; joinDate: number; leaveDate: number; wage: number;
      },
    });
    toast.show('매핑이 저장되었습니다. 다음부터 자동 적용됩니다.', 'success');
  };

  // Import 실행
  const handleImport = async () => {
    if (!selectedBusiness || excel.previewData.length === 0) {
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

      excel.previewData.forEach((row: ImportRow) => {
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
      excel.loadPreview(); // 미리보기 클리어 (빈 결과)
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
              onChange={onFileChange}
              disabled={!selectedBusiness}
              className="w-full input-glass px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 disabled:opacity-50"
            />
            {excel.fileName && <p className="mt-2 text-sm text-white/60">선택됨: {excel.fileName}</p>}
            {!selectedBusiness && (
              <p className="mt-2 text-sm text-yellow-400">좌측 메뉴에서 사업장을 먼저 선택하세요.</p>
            )}
          </div>

          {/* 2. 감지 결과 + 매핑 조정 */}
          {excel.sheetNames.length > 0 && (
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">
                  2. 감지 결과
                  {excel.usingSavedMapping && (
                    <span className="ml-2 text-xs text-blue-400 font-normal">(저장된 매핑)</span>
                  )}
                </h2>
                {excel.detection && !excel.usingSavedMapping && (
                  <span className="text-xs text-green-400">자동 감지됨</span>
                )}
              </div>

              {/* 시트 & 행 설정 */}
              <details className="mb-4">
                <summary className="text-sm text-white/50 cursor-pointer hover:text-white/70">
                  시트: {excel.selectedSheet} / 헤더 {excel.headerRow}행 / 데이터 {excel.dataStartRow}행
                  <span className="ml-1 text-white/30">(수정하려면 클릭)</span>
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">시트</label>
                    <select
                      value={excel.selectedSheet}
                      onChange={(e) => excel.handleSheetChange(e.target.value)}
                      className="w-full input-glass px-3 py-2 text-sm"
                    >
                      {excel.sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-white/60 mb-1">헤더 행</label>
                      <input
                        type="number"
                        value={excel.headerRow}
                        onChange={(e) => excel.handleHeaderRowChange(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">데이터 시작 행</label>
                      <input
                        type="number"
                        value={excel.dataStartRow}
                        onChange={(e) => excel.setDataStartRow(parseInt(e.target.value) || 1)}
                        className="w-full input-glass px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* 핵심 필드 매핑 */}
              <div className="space-y-2">
                {CORE_FIELDS.map(({ key, label, required }) => {
                  const colIdx = excel.fieldMapping[key];
                  const confidence = excel.getConfidence(colIdx);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-20 text-sm text-white/70 shrink-0">
                        {label}
                        {required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      <select
                        value={colIdx ?? ''}
                        onChange={(e) => excel.updateFieldMapping(
                          key, e.target.value === '' ? null : parseInt(e.target.value),
                        )}
                        className={`flex-1 input-glass px-2 py-1.5 text-sm ${
                          colIdx !== null ? 'border-green-500/30' : required ? 'border-red-500/30' : ''
                        }`}
                      >
                        <option value="">-- 선택 안함 --</option>
                        {excel.headers.map((h) => (
                          <option key={h.index} value={h.index}>
                            {colLetter(h.index)}: {h.name}
                          </option>
                        ))}
                      </select>
                      {colIdx !== null && !excel.usingSavedMapping && (
                        <ConfidenceBadge confidence={confidence} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 감지된 추가 컬럼 요약 */}
              {excel.detection && excel.detection.mapping.numberColumns.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                    감지된 숫자 컬럼 {excel.detection.mapping.numberColumns.length}개 (급여/공제 항목)
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {excel.detection.mapping.numberColumns.map(nc => (
                      <span key={nc.colIndex} className="px-2 py-0.5 text-xs bg-white/5 rounded text-white/50">
                        {colLetter(nc.colIndex)}: {nc.headerHint || `열${nc.colIndex + 1}`}
                      </span>
                    ))}
                  </div>
                </details>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3 mt-4 pt-3 border-t border-white/10">
                <button onClick={onLoadPreview} className="btn-secondary flex-1">미리보기</button>
                <button onClick={onSaveMapping} className="btn-primary flex-1">매핑 저장</button>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 미리보기 */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">미리보기 ({excel.previewData.length}명)</h2>
            {excel.previewData.length > 0 && (
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

          {excel.previewData.length === 0 ? (
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
                  {excel.previewData.map((row, i) => (
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
