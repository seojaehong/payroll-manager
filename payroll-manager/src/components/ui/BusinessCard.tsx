'use client';

import Link from 'next/link';

interface BusinessCardProps {
  business: {
    id: string;
    name: string;
    bizNo: string;
  };
  stats: {
    activeWorkers: number;
    thisMonthJoins: number;
    thisMonthLeaves: number;
    wageProgress: number; // 0-100
    pendingReports: number; // 신고 필요 건수
  };
}

export function BusinessCard({ business, stats }: BusinessCardProps) {
  const hasAlert = stats.pendingReports > 0;

  return (
    <Link
      href={`/businesses/${business.id}`}
      className={`glass p-6 block hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer ${
        hasAlert ? 'border-l-4 border-yellow-500' : ''
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{business.name}</h3>
          <p className="text-white/40 text-sm">{business.bizNo}</p>
        </div>
        <span className="text-white/30 text-xl">→</span>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className="text-white/50 text-xs mb-1">재직</p>
          <p className="text-xl font-bold text-green-400">{stats.activeWorkers}</p>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className="text-white/50 text-xs mb-1">입사</p>
          <p className={`text-xl font-bold ${stats.thisMonthJoins > 0 ? 'text-blue-400' : 'text-white/30'}`}>
            {stats.thisMonthJoins > 0 ? `+${stats.thisMonthJoins}` : '-'}
          </p>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <p className="text-white/50 text-xs mb-1">퇴사</p>
          <p className={`text-xl font-bold ${stats.thisMonthLeaves > 0 ? 'text-red-400' : 'text-white/30'}`}>
            {stats.thisMonthLeaves > 0 ? `-${stats.thisMonthLeaves}` : '-'}
          </p>
        </div>
      </div>

      {/* 급여 입력 진행률 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>급여 입력</span>
          <span className={stats.wageProgress === 100 ? 'text-green-400' : 'text-yellow-400'}>
            {stats.wageProgress}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              stats.wageProgress === 100 ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${stats.wageProgress}%` }}
          />
        </div>
      </div>

      {/* 알림 */}
      {hasAlert && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
          <span>⚠️</span>
          <span>신고 필요 {stats.pendingReports}건</span>
        </div>
      )}
    </Link>
  );
}
