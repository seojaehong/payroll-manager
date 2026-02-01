'use client';

import { useState, useMemo } from 'react';
import { Worker, Employment } from '@/types';

interface WorkersTabProps {
  businessEmployments: { employment: Employment; worker: Worker }[];
  businessId: string;
}

export function WorkersTab({ businessEmployments, businessId }: WorkersTabProps) {
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
