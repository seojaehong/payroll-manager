'use client';

import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { MonthlyWage, Worker, Employment, RetirementCalculation, Business } from '@/types';
import { calculateFullRetirement, formatCurrency, isEligible } from '@/lib/retirement';
import { downloadRetirementPDF } from '@/lib/retirement-pdf';

type TabType = 'workers' | 'wages' | 'reports' | 'import' | 'retirement';

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const {
    businesses, workers, employments, monthlyWages, reports, excelMappings,
    retirementCalculations, addRetirementCalculation,
    addWorker, addEmployment, addMonthlyWages, addReport, updateBusiness, setExcelMapping,
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('workers');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
  });

  const business = businesses.find((b) => b.id === businessId);

  // 수정 모드 시작
  const handleEdit = useCallback(() => {
    if (business) {
      setEditForm({
        name: business.name,
        bizNo: business.bizNo,
        gwanriNo: business.gwanriNo || '',
        gyGwanriNo: business.gyGwanriNo || '',
        sjGwanriNo: business.sjGwanriNo || '',
        npsGwanriNo: business.npsGwanriNo || '',
        nhicGwanriNo: business.nhicGwanriNo || '',
        address: business.address || '',
        tel: business.tel || '',
        defaultJikjong: business.defaultJikjong || '532',
        defaultWorkHours: business.defaultWorkHours || 40,
      });
      setIsEditing(true);
    }
  }, [business]);

  // 수정 저장
  const handleSave = useCallback(() => {
    if (business) {
      updateBusiness(business.id, {
        ...editForm,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    }
  }, [business, editForm, updateBusiness]);

  // 해당 사업장 근로자
  const businessEmployments = useMemo(() => {
    return employments
      .filter((e) => e.businessId === businessId)
      .map((e) => ({
        employment: e,
        worker: workers.find((w) => w.id === e.workerId)!,
      }))
      .filter(({ worker }) => worker);
  }, [employments, workers, businessId]);

  const activeWorkers = businessEmployments.filter(({ employment }) => employment.status === 'ACTIVE');
  const inactiveWorkers = businessEmployments.filter(({ employment }) => employment.status === 'INACTIVE');

  if (!business) {
    return (
      <div className="text-center py-20">
        <p className="text-white/40 text-lg mb-4">사업장을 찾을 수 없습니다</p>
        <Link href="/" className="btn-primary">대시보드로 이동</Link>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'workers', label: '근로자', icon: '👥' },
    { id: 'wages', label: '급여 이력', icon: '💰' },
    { id: 'retirement', label: '퇴직금', icon: '💼' },
    { id: 'reports', label: '신고서', icon: '📝' },
    { id: 'import', label: 'Import', icon: '📥' },
  ];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-white/50 hover:text-white">
            ← 대시보드
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-white">{business.name}</h1>
            <p className="text-white/40">{business.bizNo} | 관리번호: {business.gwanriNo || '-'}</p>
          </div>
        </div>
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-all"
        >
          수정
        </button>
      </div>

      {/* 수정 모달 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">사업장 정보 수정</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">사업장명</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">사업자번호</label>
                <input
                  type="text"
                  value={editForm.bizNo}
                  onChange={(e) => setEditForm({ ...editForm, bizNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">관리번호</label>
                <input
                  type="text"
                  value={editForm.gwanriNo}
                  onChange={(e) => setEditForm({ ...editForm, gwanriNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">고용보험 관리번호</label>
                <input
                  type="text"
                  value={editForm.gyGwanriNo}
                  onChange={(e) => setEditForm({ ...editForm, gyGwanriNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">산재보험 관리번호</label>
                <input
                  type="text"
                  value={editForm.sjGwanriNo}
                  onChange={(e) => setEditForm({ ...editForm, sjGwanriNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">국민연금 관리번호</label>
                <input
                  type="text"
                  value={editForm.npsGwanriNo}
                  onChange={(e) => setEditForm({ ...editForm, npsGwanriNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">건강보험 관리번호</label>
                <input
                  type="text"
                  value={editForm.nhicGwanriNo}
                  onChange={(e) => setEditForm({ ...editForm, nhicGwanriNo: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">기본 직종코드</label>
                <input
                  type="text"
                  value={editForm.defaultJikjong}
                  onChange={(e) => setEditForm({ ...editForm, defaultJikjong: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-white/60 text-sm mb-1">주소</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">전화번호</label>
                <input
                  type="text"
                  value={editForm.tel}
                  onChange={(e) => setEditForm({ ...editForm, tel: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">기본 근무시간</label>
                <input
                  type="number"
                  value={editForm.defaultWorkHours}
                  onChange={(e) => setEditForm({ ...editForm, defaultWorkHours: parseInt(e.target.value) || 40 })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-white/60 hover:text-white transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-all"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 통계 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">재직 중</p>
          <p className="text-2xl font-bold text-green-400">{activeWorkers.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">퇴사</p>
          <p className="text-2xl font-bold text-white/60">{inactiveWorkers.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 입사</p>
          <p className="text-2xl font-bold text-blue-400">
            {businessEmployments.filter(({ employment }) =>
              employment.joinDate?.startsWith(new Date().toISOString().slice(0, 7)) && employment.status === 'ACTIVE'
            ).length}
          </p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 퇴사</p>
          <p className="text-2xl font-bold text-red-400">
            {businessEmployments.filter(({ employment }) =>
              employment.leaveDate?.startsWith(new Date().toISOString().slice(0, 7))
            ).length}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="glass p-6">
        {activeTab === 'workers' && (
          <WorkersTab
            businessEmployments={businessEmployments}
            businessId={businessId}
          />
        )}
        {activeTab === 'wages' && (
          <WagesTab
            businessId={businessId}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            addMonthlyWages={addMonthlyWages}
            excelMappings={excelMappings}
            workers={workers}
            setExcelMapping={setExcelMapping}
          />
        )}
        {activeTab === 'retirement' && (
          <RetirementTab
            businessId={businessId}
            business={business}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
            workers={workers}
            retirementCalculations={retirementCalculations}
            addRetirementCalculation={addRetirementCalculation}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab
            businessId={businessId}
            business={business}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
            reports={reports}
            addReport={addReport}
          />
        )}
        {activeTab === 'import' && (
          <ImportTab
            businessId={businessId}
            business={business}
            workers={workers}
            excelMappings={excelMappings}
            addWorker={addWorker}
            addEmployment={addEmployment}
          />
        )}
      </div>
    </div>
  );
}

// 근로자 탭
function WorkersTab({
  businessEmployments,
  businessId,
}: {
  businessEmployments: { employment: Employment; worker: Worker }[];
  businessId: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [sortBy, setSortBy] = useState<'joinDate' | 'name'>('joinDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = businessEmployments;

    // 상태 필터
    if (statusFilter === 'ACTIVE') {
      result = result.filter(({ employment }) => employment.status === 'ACTIVE');
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter(({ employment }) => employment.status === 'INACTIVE');
    }

    // 정렬
    result = [...result].sort((a, b) => {
      let compare = 0;
      if (sortBy === 'joinDate') {
        const dateA = a.employment.joinDate || '';
        const dateB = b.employment.joinDate || '';
        compare = dateA.localeCompare(dateB);
      } else {
        compare = a.worker.name.localeCompare(b.worker.name, 'ko');
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

    return result;
  }, [businessEmployments, statusFilter, sortBy, sortOrder]);

  const activeCount = businessEmployments.filter(({ employment }) => employment.status === 'ACTIVE').length;
  const inactiveCount = businessEmployments.filter(({ employment }) => employment.status === 'INACTIVE').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          근로자 목록 ({filtered.length}명)
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
              재직 ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                statusFilter === 'INACTIVE' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              퇴사 ({inactiveCount})
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
              onClick={() => { setSortBy('joinDate'); setSortOrder('desc'); }}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                sortBy === 'joinDate' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              입사일순
            </button>
            <button
              onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                sortBy === 'name' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              이름순
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-white/40 py-12">
          {statusFilter === 'ACTIVE' ? '재직 중인 근로자가 없습니다' :
           statusFilter === 'INACTIVE' ? '퇴사한 근로자가 없습니다' : '등록된 근로자가 없습니다'}
        </p>
      ) : (
        <table className="w-full table-glass">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">주민번호</th>
              <th className="px-4 py-3">입사일</th>
              <th className="px-4 py-3">퇴사일</th>
              <th className="px-4 py-3">월평균보수</th>
              <th className="px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ worker, employment }) => (
              <tr key={employment.id}>
                <td className="px-4 py-3 text-white">{worker.name}</td>
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// 급여 이력 탭 (간소화 - 상세 기능은 /wages 페이지)
function WagesTab({
  businessId,
  businessEmployments,
  monthlyWages,
  selectedYear,
  setSelectedYear,
  addMonthlyWages,
  excelMappings,
  workers,
  setExcelMapping,
}: {
  businessId: string;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  addMonthlyWages: (wages: MonthlyWage[]) => void;
  excelMappings: any[];
  workers: Worker[];
  setExcelMapping: (mapping: any) => void;
}) {
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

// 신고서 탭
function ReportsTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
  reports,
  addReport,
}: {
  businessId: string;
  business: any;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  reports: any[];
  addReport: (report: any) => void;
}) {
  const [reportType, setReportType] = useState<'ACQUIRE' | 'LOSE'>('ACQUIRE');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAllWorkers, setShowAllWorkers] = useState(false);

  // 자동 필터 대상자
  const autoFilteredWorkers = useMemo(() => {
    if (reportType === 'ACQUIRE') {
      return businessEmployments.filter(({ employment }) =>
        employment.joinDate?.startsWith(targetMonth) && employment.status === 'ACTIVE'
      );
    } else {
      return businessEmployments.filter(({ employment }) =>
        employment.leaveDate?.startsWith(targetMonth)
      );
    }
  }, [businessEmployments, reportType, targetMonth]);

  // 표시할 대상자 (전체 or 자동필터)
  const displayWorkers = showAllWorkers ? businessEmployments : autoFilteredWorkers;

  // 자동 선택 (필터 변경 시)
  useMemo(() => {
    setSelectedIds(new Set(autoFilteredWorkers.map(({ worker }) => worker.id)));
  }, [autoFilteredWorkers]);

  const selectedWorkers = businessEmployments.filter(({ worker }) => selectedIds.has(worker.id));

  const toggleWorker = (workerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === displayWorkers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayWorkers.map(({ worker }) => worker.id)));
    }
  };

  // 보수 계산 함수
  const calculateWages = (employmentId: string, leaveDate: string, joinDate: string) => {
    const leaveYear = parseInt(leaveDate.slice(0, 4));
    const leaveMonth = parseInt(leaveDate.slice(5, 7));
    const joinYear = parseInt(joinDate.slice(0, 4));
    const joinMonth = parseInt(joinDate.slice(5, 7));
    const prevYear = leaveYear - 1;

    const empWages = monthlyWages.filter((mw) => mw.employmentId === employmentId);

    let currentYearTotal = 0, currentYearMonths = 0;
    for (let m = 1; m <= leaveMonth; m++) {
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      const wage = empWages.find((w) => w.yearMonth === ym);
      if (wage) { currentYearTotal += wage.totalWage; currentYearMonths++; }
    }

    let prevYearTotal = 0, prevYearMonths = 0;
    if (joinYear <= prevYear) {
      const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        const wage = empWages.find((w) => w.yearMonth === ym);
        if (wage) { prevYearTotal += wage.totalWage; prevYearMonths++; }
      }
    }

    return { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths };
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

    for (let m = 1; m <= leaveMonth; m++) {
      if (leaveYear === joinYear && m < joinMonth) continue;
      const ym = `${leaveYear}-${String(m).padStart(2, '0')}`;
      if (!empWages.find((w) => w.yearMonth === ym)) missing.push(ym);
    }

    if (joinYear <= prevYear) {
      const prevStartMonth = prevYear === joinYear ? joinMonth : 1;
      for (let m = prevStartMonth; m <= 12; m++) {
        const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
        if (!empWages.find((w) => w.yearMonth === ym)) missing.push(ym);
      }
    }

    return missing;
  };

  // 취득신고 생성
  const generateAcquireExcel = () => {
    if (selectedWorkers.length === 0) return alert('대상자를 선택하세요.');

    const header = [
      '*주민등록번호', '*성명', '*대표자여부', '영문성명', '국적', '체류자격',
      '*소득월액', '*자격취득일', '*취득월납부', '*취득부호', '특수직종', '상이사유', '직역연금',
      '*피부양자', '*보수월액', '*자격취득일', '*취득부호', '감면부호', '회계명', '직종명',
      '*월평균보수', '*자격취득일', '*직종부호', '*근로시간', '부과구분', '부과사유', '*계약직', '종료일',
      '*월평균보수', '*자격취득일', '직종부호', '근로시간', '부과구분', '부과사유', '계약직', '종료일',
    ];

    const dataRows = selectedWorkers.map(({ worker, employment }) => {
      const dt = employment.joinDate.replace(/-/g, '');
      return [
        worker.residentNo, worker.name, employment.isRepresentative ? 'Y' : 'N',
        worker.englishName || '', worker.nationality || '100', worker.stayStatus || '',
        employment.npsYn ? employment.monthlyWage : '', employment.npsYn ? dt : '',
        employment.npsYn ? '1' : '', employment.npsYn ? '1' : '', '', '', '0',
        employment.nhicYn ? 'N' : '', employment.nhicYn ? employment.monthlyWage : '',
        employment.nhicYn ? dt : '', employment.nhicYn ? '00' : '', '', '', '',
        employment.gyYn ? employment.monthlyWage : '', employment.gyYn ? dt : '',
        employment.gyYn ? employment.jikjongCode : '', employment.gyYn ? employment.workHours : '',
        '', '', employment.isContract ? '1' : '2', employment.isContract ? employment.contractEndDate?.replace(/-/g, '') : '',
        employment.sjYn ? employment.monthlyWage : '', employment.sjYn ? dt : '', '', '', '', '', '', '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '취득신고');

    const fileName = `취득신고_${business.name}_${targetMonth.replace('-', '')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    addReport({
      id: crypto.randomUUID(), businessId, type: 'ACQUIRE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: selectedWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  // 상실신고 생성
  const generateLoseExcel = () => {
    if (selectedWorkers.length === 0) return alert('대상자를 선택하세요.');

    // 급여 데이터 누락 확인
    const missingData: { name: string; missing: string[] }[] = [];
    selectedWorkers.forEach(({ worker, employment }) => {
      if (!employment.leaveDate || !employment.joinDate) return;
      const missing = getMissingWageData(employment.id, employment.leaveDate, employment.joinDate);
      if (missing.length > 0) missingData.push({ name: worker.name, missing });
    });

    if (missingData.length > 0) {
      const msg = missingData.map(({ name, missing }) =>
        `${name}: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` 외 ${missing.length - 3}건` : ''}`
      ).join('\n');
      alert(`급여 데이터가 누락되었습니다.\n[급여 이력] 탭에서 먼저 입력해주세요.\n\n${msg}`);
      return;
    }

    const header = [
      '성명', '주민등록번호', '지역번호', '국번', '뒷번호',
      '연금상실일', '연금상실부호', '납부여부',
      '건강상실일', '건강상실부호', '당해보수총액', '당해근무월수', '전년보수총액', '전년근무월수',
      '고용상실일', '상실사유코드', '구체적사유', '당해보수총액', '전년보수총액',
      '산재상실일', '당해보수총액', '전년보수총액'
    ];

    const dataRows = selectedWorkers.map(({ worker, employment }) => {
      const dt = employment.leaveDate?.replace(/-/g, '') || '';
      const phone = worker.phone?.split('-') || ['', '', ''];
      const { currentYearTotal, currentYearMonths, prevYearTotal, prevYearMonths } =
        calculateWages(employment.id, employment.leaveDate!, employment.joinDate);

      return [
        worker.name, worker.residentNo, phone[0], phone[1], phone[2],
        employment.npsYn ? dt : '', employment.npsYn ? (employment.leaveReason || '11') : '', '',
        employment.nhicYn ? dt : '', employment.nhicYn ? (employment.leaveReason || '11') : '',
        employment.nhicYn ? currentYearTotal : '', employment.nhicYn ? currentYearMonths : '',
        employment.nhicYn ? prevYearTotal : '', employment.nhicYn ? prevYearMonths : '',
        employment.gyYn ? dt : '', employment.gyYn ? (employment.leaveReason || '11') : '', '',
        employment.gyYn ? currentYearTotal : '', employment.gyYn ? prevYearTotal : '',
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
      id: crypto.randomUUID(), businessId, type: 'LOSE',
      reportDate: new Date().toISOString().slice(0, 10), fileName,
      workerCount: selectedWorkers.length, status: 'DRAFT', createdAt: new Date(),
    });

    alert(`${fileName} 파일이 생성되었습니다.`);
  };

  const handleGenerate = () => {
    if (reportType === 'ACQUIRE') generateAcquireExcel();
    else generateLoseExcel();
  };

  const bizReports = reports.filter((r) => r.businessId === businessId);

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm text-white/60 mb-2">신고 유형</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'ACQUIRE' | 'LOSE')}
            className="w-full input-glass px-4 py-3"
          >
            <option value="ACQUIRE">취득신고</option>
            <option value="LOSE">상실신고</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">대상 월</label>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full input-glass px-4 py-3"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-white/60 cursor-pointer h-[50px]">
            <input
              type="checkbox"
              checked={showAllWorkers}
              onChange={(e) => setShowAllWorkers(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">전체 표시</span>
          </label>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={selectedWorkers.length === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {reportType === 'ACQUIRE' ? '취득' : '상실'}신고 생성 ({selectedWorkers.length}명)
          </button>
        </div>
      </div>

      <h4 className="text-white font-medium mb-3">대상자 ({displayWorkers.length}명)</h4>
      {displayWorkers.length === 0 ? (
        <p className="text-white/40 text-center py-8">해당 월에 {reportType === 'ACQUIRE' ? '입사' : '퇴사'}한 근로자가 없습니다</p>
      ) : (
        <table className="w-full table-glass text-sm mb-6">
          <thead>
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === displayWorkers.length && displayWorkers.length > 0}
                  onChange={() => {
                    if (selectedIds.size === displayWorkers.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(displayWorkers.map(({ worker }) => worker.id)));
                    }
                  }}
                />
              </th>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">{reportType === 'ACQUIRE' ? '입사일' : '퇴사일'}</th>
              <th className="px-3 py-2 text-right">월평균보수</th>
            </tr>
          </thead>
          <tbody>
            {displayWorkers.map(({ worker, employment }) => (
              <tr key={worker.id} className="cursor-pointer hover:bg-white/5" onClick={() => toggleWorker(worker.id)}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedIds.has(worker.id)} onChange={() => {}} />
                </td>
                <td className="px-3 py-2 text-white">{worker.name}</td>
                <td className="px-3 py-2 text-white/60">
                  {reportType === 'ACQUIRE' ? employment.joinDate : employment.leaveDate}
                </td>
                <td className="px-3 py-2 text-right text-white/60">{employment.monthlyWage.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 최근 신고 이력 */}
      <h4 className="text-white font-medium mb-3 mt-8">최근 신고 이력</h4>
      {bizReports.length === 0 ? (
        <p className="text-white/40 text-center py-8">신고 이력이 없습니다</p>
      ) : (
        <table className="w-full table-glass text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">날짜</th>
              <th className="px-3 py-2 text-left">유형</th>
              <th className="px-3 py-2 text-right">인원</th>
              <th className="px-3 py-2 text-left">파일</th>
            </tr>
          </thead>
          <tbody>
            {bizReports.slice(0, 5).map((report) => (
              <tr key={report.id}>
                <td className="px-3 py-2 text-white/60">{report.reportDate}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${report.type === 'ACQUIRE' ? 'badge-success' : 'badge-danger'}`}>
                    {report.type === 'ACQUIRE' ? '취득' : '상실'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-white/60">{report.workerCount}명</td>
                <td className="px-3 py-2 text-white/40 text-sm">{report.fileName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Import 탭
function ImportTab({
  businessId,
  business,
  workers,
  excelMappings,
  addWorker,
  addEmployment,
}: {
  businessId: string;
  business: any;
  workers: Worker[];
  excelMappings: any[];
  addWorker: (worker: Worker) => void;
  addEmployment: (employment: Employment) => void;
}) {
  return (
    <div>
      <div className="text-center py-8">
        <p className="text-white/60 mb-4">
          <span className="text-2xl mr-2">📥</span>
          {business.name}에 근로자를 등록합니다
        </p>
        <Link href="/import" className="btn-primary">
          엑셀 Import 페이지로 →
        </Link>
      </div>
      <div className="glass p-4 mt-4">
        <h4 className="text-white font-medium mb-2">현재 매핑 설정</h4>
        {(() => {
          const mapping = excelMappings.find((m) => m.businessId === businessId);
          if (!mapping) return <p className="text-white/40 text-sm">매핑 설정 없음</p>;
          return (
            <div className="text-white/60 text-sm">
              <p>시트: {mapping.sheetName}</p>
              <p>데이터 시작: {mapping.dataStartRow}행</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// 퇴직금 탭
function RetirementTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
  workers,
  retirementCalculations,
  addRetirementCalculation,
}: {
  businessId: string;
  business: Business;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  workers: Worker[];
  retirementCalculations: RetirementCalculation[];
  addRetirementCalculation: (calculation: RetirementCalculation) => void;
}) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<RetirementCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string>('');

  // 퇴사자 목록 (퇴직금 대상)
  const leavedWorkers = useMemo(() => {
    return businessEmployments.filter(({ employment }) =>
      employment.status === 'INACTIVE' && employment.leaveDate
    );
  }, [businessEmployments]);

  // 기존 계산 결과
  const existingCalculations = useMemo(() => {
    return retirementCalculations.filter((r) => r.businessId === businessId);
  }, [retirementCalculations, businessId]);

  // 퇴직금 계산 실행
  const handleCalculate = () => {
    if (!selectedWorkerId) {
      setError('퇴사자를 선택하세요.');
      return;
    }

    setCalculating(true);
    setError('');

    const selected = leavedWorkers.find(({ worker }) => worker.id === selectedWorkerId);
    if (!selected) {
      setError('선택된 근로자를 찾을 수 없습니다.');
      setCalculating(false);
      return;
    }

    const { worker, employment } = selected;

    // 1년 미만 체크
    if (!isEligible(employment.joinDate, employment.leaveDate!)) {
      setError('1년 미만 근무로 퇴직금 수급 자격이 없습니다.');
      setCalculating(false);
      return;
    }

    // 급여 데이터 확인
    const empWages = monthlyWages.filter((mw) => mw.employmentId === employment.id);
    if (empWages.length === 0) {
      setError('급여 데이터가 없습니다. 급여 이력 탭에서 먼저 입력해주세요.');
      setCalculating(false);
      return;
    }

    // 퇴직금 계산
    const result = calculateFullRetirement(employment, worker, monthlyWages);

    if (!result) {
      setError('퇴직금 계산에 실패했습니다.');
      setCalculating(false);
      return;
    }

    setCalculationResult(result);
    setCalculating(false);
  };

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!calculationResult) return;
    addRetirementCalculation(calculationResult);
    alert('퇴직금 계산 결과가 저장되었습니다.');
  };

  // PDF 다운로드
  const handleDownloadPDF = async () => {
    if (!calculationResult) return;

    const selected = leavedWorkers.find(({ worker }) => worker.id === selectedWorkerId);
    if (!selected) return;

    await downloadRetirementPDF(calculationResult, selected.worker, business, monthlyWages);
  };

  // 저장된 계산 결과 보기
  const viewSavedCalculation = (calc: RetirementCalculation) => {
    setCalculationResult(calc);
    setSelectedWorkerId(calc.workerId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">퇴직금 계산</h3>
      </div>

      {/* 퇴사자 선택 및 계산 */}
      <div className="glass p-4 mb-6">
        <h4 className="text-white font-medium mb-4">퇴직금 계산하기</h4>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-2">퇴사자 선택</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => {
                setSelectedWorkerId(e.target.value);
                setCalculationResult(null);
                setError('');
              }}
              className="w-full input-glass px-4 py-3"
            >
              <option value="">-- 선택하세요 --</option>
              {leavedWorkers.map(({ worker, employment }) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} (퇴사: {employment.leaveDate})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={!selectedWorkerId || calculating}
            className="btn-primary disabled:opacity-50"
          >
            {calculating ? '계산 중...' : '퇴직금 계산'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* 계산 결과 */}
      {calculationResult && (
        <div className="glass p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium text-lg">퇴직금 계산 결과</h4>
            <div className="flex gap-2">
              <button onClick={handleSaveCalculation} className="btn-secondary text-sm">
                저장
              </button>
              <button onClick={handleDownloadPDF} className="btn-primary text-sm">
                PDF 다운로드
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 근무 정보 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">근무 정보</h5>
              <div className="flex justify-between">
                <span className="text-white/50">입사일</span>
                <span className="text-white">{calculationResult.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴사일</span>
                <span className="text-white">{calculationResult.leaveDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">총 근속일수</span>
                <span className="text-white">{calculationResult.totalDays.toLocaleString()}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">근속연수</span>
                <span className="text-white">{calculationResult.totalYears.toFixed(2)}년</span>
              </div>
            </div>

            {/* 평균임금 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">평균임금 계산</h5>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직 전 3개월 급여</span>
                <span className="text-white">{formatCurrency(calculationResult.last3MonthsWages)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직 전 3개월 일수</span>
                <span className="text-white">{calculationResult.last3MonthsDays}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">평균임금 (일당)</span>
                <span className="text-white font-medium">{formatCurrency(calculationResult.averageDailyWage)}</span>
              </div>
            </div>

            {/* 퇴직금 계산 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">퇴직금 계산</h5>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직금 (세전)</span>
                <span className="text-white font-medium">{formatCurrency(calculationResult.retirementPay)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">= 평균임금 x 30일 x (근속일수/365)</span>
              </div>
            </div>

            {/* 세금 계산 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">퇴직소득세</h5>
              <div className="flex justify-between">
                <span className="text-white/50">근속연수공제</span>
                <span className="text-white/60">{formatCurrency(calculationResult.serviceYearDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직소득세</span>
                <span className="text-red-400">-{formatCurrency(calculationResult.retirementTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">지방소득세 (10%)</span>
                <span className="text-red-400">-{formatCurrency(calculationResult.localRetirementTax)}</span>
              </div>
            </div>
          </div>

          {/* 실수령액 */}
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-green-400 font-medium text-lg">실수령 퇴직금</span>
              <span className="text-green-400 font-bold text-2xl">{formatCurrency(calculationResult.netRetirementPay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 저장된 계산 이력 */}
      {existingCalculations.length > 0 && (
        <div className="glass p-4">
          <h4 className="text-white font-medium mb-4">저장된 계산 이력</h4>
          <table className="w-full table-glass text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">이름</th>
                <th className="px-3 py-2 text-left">퇴사일</th>
                <th className="px-3 py-2 text-right">퇴직금</th>
                <th className="px-3 py-2 text-right">실수령액</th>
                <th className="px-3 py-2 text-center">계산일</th>
                <th className="px-3 py-2 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {existingCalculations.map((calc) => {
                const worker = workers.find((w) => w.id === calc.workerId);
                return (
                  <tr key={calc.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-white">{worker?.name || '-'}</td>
                    <td className="px-3 py-2 text-white/60">{calc.leaveDate}</td>
                    <td className="px-3 py-2 text-right text-white/60">{formatCurrency(calc.retirementPay)}</td>
                    <td className="px-3 py-2 text-right text-green-400">{formatCurrency(calc.netRetirementPay)}</td>
                    <td className="px-3 py-2 text-center text-white/40 text-xs">
                      {new Date(calc.calculatedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => viewSavedCalculation(calc)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 */}
      {leavedWorkers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40 text-lg mb-2">퇴사자가 없습니다</p>
          <p className="text-white/30 text-sm">퇴직금 계산은 퇴사 처리된 근로자만 가능합니다.</p>
        </div>
      )}
    </div>
  );
}
