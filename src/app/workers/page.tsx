'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useState } from 'react';

export default function WorkersPage() {
  const { workers, businesses, employments, updateEmployment } = useStore();
  const [search, setSearch] = useState('');
  const [filterBusiness, setFilterBusiness] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const workersWithEmployment = workers.map((worker) => {
    const employment = employments.find((e) => e.workerId === worker.id);
    const business = employment ? businesses.find((b) => b.id === employment.businessId) : null;
    return { worker, employment, business };
  });

  const filtered = workersWithEmployment.filter(({ worker, employment, business }) => {
    const matchSearch =
      worker.name.includes(search) ||
      worker.residentNo.includes(search) ||
      business?.name.includes(search);
    const matchBusiness = !filterBusiness || employment?.businessId === filterBusiness;
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && employment?.status === 'ACTIVE') ||
      (filterStatus === 'INACTIVE' && employment?.status === 'INACTIVE');
    return matchSearch && matchBusiness && matchStatus;
  });

  const handleRetire = (employmentId: string, workerName: string) => {
    const leaveDate = prompt(`${workerName}의 퇴사일을 입력하세요 (YYYY-MM-DD):`, new Date().toISOString().slice(0, 10));
    if (leaveDate) {
      updateEmployment(employmentId, {
        status: 'INACTIVE',
        leaveDate,
        leaveReason: '11',
      });
    }
  };

  const formatResidentNo = (no: string) => {
    if (no.length === 13) return `${no.slice(0, 6)}-${no.slice(6, 7)}******`;
    return no;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">근로자 관리</h1>
          <p className="text-white/40 mt-1">근로자 정보를 관리합니다</p>
        </div>
        <Link href="/workers/new" className="btn-primary">
          + 근로자 추가
        </Link>
      </div>

      {/* 필터 */}
      <div className="glass p-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="이름, 주민번호, 사업장으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 input-glass px-4 py-3"
          />
          <select
            value={filterBusiness}
            onChange={(e) => setFilterBusiness(e.target.value)}
            className="input-glass px-4 py-3 min-w-[180px]"
          >
            <option value="">전체 사업장</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
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
                <th className="px-6 py-4">사업장</th>
                <th className="px-6 py-4">입사일</th>
                <th className="px-6 py-4">월평균보수</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ worker, employment, business }) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 text-white font-medium">{worker.name}</td>
                  <td className="px-6 py-4 text-white/60 font-mono text-sm">
                    {formatResidentNo(worker.residentNo)}
                  </td>
                  <td className="px-6 py-4 text-white/60">{business?.name || '-'}</td>
                  <td className="px-6 py-4 text-white/60">{employment?.joinDate || '-'}</td>
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
                          onClick={() => handleRetire(employment.id, worker.name)}
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
        전체 {workers.length}명 | 재직 {employments.filter((e) => e.status === 'ACTIVE').length}명 | 퇴사 {employments.filter((e) => e.status === 'INACTIVE').length}명
      </div>
    </div>
  );
}
