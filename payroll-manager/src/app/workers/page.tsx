'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { RetireModal } from '@/components/ui/RetireModal';
import { PageHeader } from '@/components/ui/PageHeader';

export default function WorkersPage() {
  const workers = useStore((state) => state.workers);
  const employments = useStore((state) => state.employments);
  const updateEmployment = useStore((state) => state.updateEmployment);
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [retireModal, setRetireModal] = useState<{ employmentId: string; workerName: string } | null>(null);

  // 선택된 사업장의 근로자만 표시
  const workersWithEmployment = useMemo(() => {
    if (!selectedBusinessId) return [];

    return employments
      .filter((e) => e.businessId === selectedBusinessId)
      .map((employment) => {
        const worker = workers.find((w) => w.id === employment.workerId);
        return { worker, employment };
      })
      .filter(({ worker }) => worker !== undefined) as { worker: typeof workers[0]; employment: typeof employments[0] }[];
  }, [selectedBusinessId, employments, workers]);

  const filtered = workersWithEmployment.filter(({ worker, employment }) => {
    const matchSearch =
      worker.name.includes(search) ||
      worker.residentNo.includes(search);
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && employment?.status === 'ACTIVE') ||
      (filterStatus === 'INACTIVE' && employment?.status === 'INACTIVE');
    return matchSearch && matchStatus;
  });

  const handleRetire = (leaveDate: string, leaveReason: string) => {
    if (!retireModal) return;
    updateEmployment(retireModal.employmentId, {
      status: 'INACTIVE',
      leaveDate,
      leaveReason,
    });
    setRetireModal(null);
  };

  const formatResidentNo = (no: string) => {
    if (no.length === 13) return `${no.slice(0, 6)}-${no.slice(6, 7)}******`;
    return no;
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '근로자 관리' }]}
        title="근로자 관리"
        description="근로자 정보를 관리합니다"
      />
      <div className="flex justify-end mb-6">
        <Link href="/workers/new" className="btn-primary">
          + 근로자 추가
        </Link>
      </div>

      {/* 필터 */}
      <div className="glass p-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="이름, 주민번호로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 input-glass px-4 py-3"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="input-glass px-4 py-3 min-w-[120px]"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">재직</option>
            <option value="INACTIVE">퇴사</option>
          </select>
        </div>
      </div>

      {/* 근로자 목록 */}
      <div className="glass overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/40 text-lg">
              {workers.length === 0 ? (
                <>
                  등록된 근로자가 없습니다
                  <br />
                  <span className="mt-2 inline-block">
                    <Link href="/workers/new" className="text-blue-400 hover:underline">근로자를 추가</Link>
                    하거나{' '}
                    <Link href="/import" className="text-blue-400 hover:underline">엑셀로 Import</Link>
                    해보세요!
                  </span>
                </>
              ) : (
                '검색 결과가 없습니다'
              )}
            </p>
          </div>
        ) : (
          <table className="w-full table-glass">
            <thead>
              <tr className="text-left">
                <th className="px-6 py-4">이름</th>
                <th className="px-6 py-4">주민등록번호</th>
                <th className="px-6 py-4">입사일</th>
                <th className="px-6 py-4">퇴사일</th>
                <th className="px-6 py-4">월평균보수</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ worker, employment }) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 text-white font-medium">{worker.name}</td>
                  <td className="px-6 py-4 text-white/60 font-mono text-sm">
                    {formatResidentNo(worker.residentNo)}
                  </td>
                  <td className="px-6 py-4 text-white/60">{employment?.joinDate || '-'}</td>
                  <td className="px-6 py-4 text-white/60">{employment?.leaveDate || '-'}</td>
                  <td className="px-6 py-4 text-white/60">
                    {employment?.monthlyWage ? employment.monthlyWage.toLocaleString() + '원' : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${employment?.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>
                      {employment?.status === 'ACTIVE' ? '재직' : '퇴사'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        수정
                      </Link>
                      {employment?.status === 'ACTIVE' && (
                        <button
                          onClick={() => setRetireModal({ employmentId: employment.id, workerName: worker.name })}
                          className="px-3 py-1.5 text-sm text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                        >
                          퇴사처리
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 text-sm text-white/40">
        전체 {workersWithEmployment.length}명 |
        재직 {workersWithEmployment.filter(({ employment }) => employment?.status === 'ACTIVE').length}명 |
        퇴사 {workersWithEmployment.filter(({ employment }) => employment?.status === 'INACTIVE').length}명
      </div>

      {/* 퇴사 처리 모달 */}
      <RetireModal
        workerName={retireModal?.workerName || ''}
        isOpen={!!retireModal}
        onClose={() => setRetireModal(null)}
        onConfirm={handleRetire}
      />
    </div>
  );
}
