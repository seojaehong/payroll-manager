'use client';

import { useStore } from '@/store/useStore';
import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Worker, Employment } from '@/types';

interface ImportRow {
  name: string;
  residentNo: string;
  joinDate: string;
  leaveDate?: string;
  wage: number;
}

export default function ImportPage() {
  const { businesses, workers, employments, addWorkers, addEmployments, deleteEmploymentsByBusiness, excelMappings, setExcelMapping } = useStore();
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [mapping, setMapping] = useState({
    sheetName: '임금대장',
    headerRow: 4,
    dataStartRow: 6,
    nameCol: 2,
    residentNoCol: 4,
    joinDateCol: 5,
    leaveDateCol: 6,
    wageCol: 7,
  });

  const business = businesses.find((b) => b.id === selectedBusiness);

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

      const existingMapping = excelMappings.find((m) => m.businessId === selectedBusiness);
      if (existingMapping) {
        setMapping({
          sheetName: existingMapping.sheetName,
          headerRow: existingMapping.headerRow,
          dataStartRow: existingMapping.dataStartRow,
          nameCol: existingMapping.columns.name,
          residentNoCol: existingMapping.columns.residentNo,
          joinDateCol: existingMapping.columns.joinDate,
          leaveDateCol: existingMapping.columns.leaveDate,
          wageCol: existingMapping.columns.wage,
        });
        setSelectedSheet(existingMapping.sheetName);
      } else if (wb.SheetNames.includes('임금대장')) {
        setSelectedSheet('임금대장');
      } else {
        setSelectedSheet(wb.SheetNames[0]);
      }
    };

    reader.readAsBinaryString(file);
  }, [selectedBusiness, excelMappings]);

  const loadPreview = () => {
    if (!workbook || !selectedSheet) return;

    const ws = workbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

    const rows: ImportRow[] = [];

    for (let i = mapping.dataStartRow - 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || !row[mapping.nameCol - 1]) continue;

      const name = String(row[mapping.nameCol - 1] || '').trim();
      let residentNo = String(row[mapping.residentNoCol - 1] || '').replace(/-/g, '').trim();

      if (residentNo.length < 13 && !isNaN(Number(residentNo))) {
        residentNo = residentNo.padStart(13, '0');
      }

      const joinDateRaw = row[mapping.joinDateCol - 1];
      const leaveDateRaw = row[mapping.leaveDateCol - 1];
      const wageRaw = row[mapping.wageCol - 1];

      const parseDate = (val: unknown): string => {
        if (!val) return '';
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        const str = String(val);
        if (str.includes('-')) return str;
        if (str.length === 8) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
        return str;
      };

      const joinDate = parseDate(joinDateRaw);
      const leaveDate = parseDate(leaveDateRaw);
      const wage = typeof wageRaw === 'number' ? wageRaw : parseInt(String(wageRaw).replace(/,/g, '')) || 0;

      if (name && residentNo.length >= 6) {
        rows.push({ name, residentNo, joinDate, leaveDate: leaveDate || undefined, wage });
      }
    }

    setPreviewData(rows);
  };

  const saveMapping = () => {
    if (!selectedBusiness) return;
    setExcelMapping({
      businessId: selectedBusiness,
      sheetName: selectedSheet,
      headerRow: mapping.headerRow,
      dataStartRow: mapping.dataStartRow,
      columns: {
        name: mapping.nameCol,
        residentNo: mapping.residentNoCol,
        joinDate: mapping.joinDateCol,
        leaveDate: mapping.leaveDateCol,
        wage: mapping.wageCol,
      },
    });
    alert('매핑 설정이 저장되었습니다.');
  };

  const handleImport = async () => {
    if (!selectedBusiness || previewData.length === 0) {
      alert('사업장을 선택하고 데이터를 미리보기하세요.');
      return;
    }

    setIsImporting(true);
    let deletedCount = 0;

    try {
      // 덮어쓰기 모드: 기존 Employment 삭제
      if (overwriteMode) {
        deletedCount = await deleteEmploymentsByBusiness(selectedBusiness);
        console.log(`덮어쓰기 모드: 기존 ${deletedCount}개 Employment 삭제`);
      }

      // 근로자 주민번호 -> Worker 맵 (O(1) 조회)
      const workerByResidentNo = new Map(workers.map((w) => [w.residentNo, w]));

      // 해당 사업장의 기존 Employment (덮어쓰기 모드면 비어있음)
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
        // 근로자는 이미 존재 → 이 사업장에 Employment가 있는지 확인
        if (existingEmploymentWorkerIds.has(existingWorker.id)) {
          // 이 사업장에 이미 고용관계 있음 → 스킵
          skippedCount++;
          return;
        }

        // 이 사업장에는 고용관계 없음 → Employment만 새로 생성
        const employmentId = crypto.randomUUID();
        newEmployments.push({
          id: employmentId,
          workerId: existingWorker.id,
          businessId: selectedBusiness,
          status: row.leaveDate ? 'INACTIVE' : 'ACTIVE',
          joinDate: row.joinDate || new Date().toISOString().slice(0, 10),
          leaveDate: row.leaveDate,
          monthlyWage: row.wage || business?.defaultWorkHours || 2060740,
          jikjongCode: business?.defaultJikjong || '532',
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
        // 새 근로자 → Worker + Employment 모두 생성
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
          monthlyWage: row.wage || business?.defaultWorkHours || 2060740,
          jikjongCode: business?.defaultJikjong || '532',
          workHours: business?.defaultWorkHours || 40,
          gyYn: true,
          sjYn: true,
          npsYn: true,
          nhicYn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 중복 방지를 위해 Map에 추가
        workerByResidentNo.set(row.residentNo, { id: workerId } as Worker);
        existingEmploymentWorkerIds.add(workerId);
        newWorkerCount++;
      }
    });

    // 배치로 한번에 저장
    if (newWorkers.length > 0) {
      addWorkers(newWorkers);
    }
    if (newEmployments.length > 0) {
      addEmployments(newEmployments);
    }

      const resultMsg = overwriteMode
        ? `Import 완료!\n- 기존 삭제: ${deletedCount}명\n- 신규 근로자: ${newWorkerCount}명\n- 고용관계 추가: ${newEmploymentCount}명`
        : `Import 완료!\n- 신규 근로자: ${newWorkerCount}명\n- 고용관계 추가: ${newEmploymentCount}명\n- 중복 스킵: ${skippedCount}명`;
      alert(resultMsg);
      setPreviewData([]);
    } catch (error) {
      console.error('Import 에러:', error);
      alert('Import 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">엑셀 Import</h1>
      <p className="text-white/40 mb-8">급여대장에서 근로자 정보를 가져옵니다</p>

      <div className="grid grid-cols-2 gap-6">
        {/* 설정 패널 */}
        <div className="space-y-6">
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-white mb-4">1. 사업장 선택</h2>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full input-glass px-4 py-3"
            >
              <option value="">사업장 선택</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-white mb-4">2. 급여대장 파일</h2>
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
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-white mb-4">3. 컬럼 매핑</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">시트</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-full input-glass px-4 py-3"
                  >
                    {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'headerRow', label: '헤더 행' },
                    { key: 'dataStartRow', label: '데이터 시작 행' },
                    { key: 'nameCol', label: '이름 열' },
                    { key: 'residentNoCol', label: '주민번호 열' },
                    { key: 'joinDateCol', label: '입사일 열' },
                    { key: 'leaveDateCol', label: '퇴사일 열' },
                    { key: 'wageCol', label: '보수 열' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-white/60 mb-2">{label}</label>
                      <input
                        type="number"
                        value={mapping[key as keyof typeof mapping]}
                        onChange={(e) => setMapping({ ...mapping, [key]: parseInt(e.target.value) || 1 })}
                        className="w-full input-glass px-4 py-3"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 pt-2">
                  <button onClick={loadPreview} className="btn-secondary">미리보기</button>
                  <button onClick={saveMapping} className="btn-secondary">매핑 저장</button>
                </div>
              </div>
            </div>
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
                  기존 고용관계 삭제 후 재등록
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
              <p className="text-white/40">파일을 업로드하고 매핑 설정 후</p>
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
                      <td className="px-3 py-2 text-white/60">{row.joinDate}</td>
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
