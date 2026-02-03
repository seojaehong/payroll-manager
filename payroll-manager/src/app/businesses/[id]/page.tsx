'use client';

import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { WorkersTab } from './components/WorkersTab';
import { WagesTab } from './components/WagesTab';
import { ReportsTab } from './components/ReportsTab';
import { ImportTab } from './components/ImportTab';
import { RetirementTab } from './components/RetirementTab';
import { PayslipTab } from './components/PayslipTab';

type TabType = 'workers' | 'wages' | 'payslip' | 'reports' | 'import' | 'retirement';

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

  const handleSave = useCallback(() => {
    if (business) {
      updateBusiness(business.id, {
        ...editForm,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    }
  }, [business, editForm, updateBusiness]);

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
    { id: 'payslip', label: '명세서 발송', icon: '📨' },
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
        {activeTab === 'payslip' && (
          <PayslipTab
            businessId={businessId}
            business={business}
            businessEmployments={businessEmployments}
            monthlyWages={monthlyWages}
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
            addMonthlyWages={addMonthlyWages}
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
