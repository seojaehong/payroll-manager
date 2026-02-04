'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { BusinessCard } from '@/components/ui/BusinessCard';

export default function Dashboard() {
  const businesses = useStore((state) => state.businesses);
  const employments = useStore((state) => state.employments);
  const monthlyWages = useStore((state) => state.monthlyWages);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear();
  const prevYear = thisYear - 1;

  // 전체 통계
  const globalStats = useMemo(() => {
    const totalBusinesses = businesses.length;
    const totalActiveWorkers = employments.filter((e) => e.status === 'ACTIVE').length;
    const thisMonthJoins = employments.filter(
      (e) => e.joinDate?.startsWith(thisMonth) && e.status === 'ACTIVE'
    ).length;
    const thisMonthLeaves = employments.filter(
      (e) => e.leaveDate?.startsWith(thisMonth)
    ).length;

    return { totalBusinesses, totalActiveWorkers, thisMonthJoins, thisMonthLeaves };
  }, [businesses, employments, thisMonth]);

  // 각 사업장별 통계
  const businessStats = useMemo(() => {
    return businesses.map((biz) => {
      const bizEmployments = employments.filter((e) => e.businessId === biz.id);
      const activeWorkers = bizEmployments.filter((e) => e.status === 'ACTIVE').length;
      const thisMonthJoins = bizEmployments.filter(
        (e) => e.joinDate?.startsWith(thisMonth) && e.status === 'ACTIVE'
      ).length;
      const thisMonthLeaves = bizEmployments.filter(
        (e) => e.leaveDate?.startsWith(thisMonth)
      ).length;

      // 전년도 급여 입력 현황
      const prevYearWages = monthlyWages.filter((mw) => mw.yearMonth.startsWith(String(prevYear)));
      let totalPrevYearSlots = 0;
      let filledPrevYearSlots = 0;

      bizEmployments.forEach((emp) => {
        const joinYear = emp.joinDate ? parseInt(emp.joinDate.slice(0, 4)) : 9999;
        const leaveYear = emp.leaveDate ? parseInt(emp.leaveDate.slice(0, 4)) : 9999;

        for (let m = 1; m <= 12; m++) {
          const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
          const monthStart = new Date(prevYear, m - 1, 1);
          const monthEnd = new Date(prevYear, m, 0);

          const empJoinDate = emp.joinDate ? new Date(emp.joinDate) : null;
          const empLeaveDate = emp.leaveDate ? new Date(emp.leaveDate) : null;

          if (empJoinDate && empJoinDate > monthEnd) continue;
          if (empLeaveDate && empLeaveDate < monthStart) continue;
          if (joinYear > prevYear) continue;
          if (leaveYear < prevYear) continue;

          totalPrevYearSlots++;
          if (prevYearWages.find((w) => w.employmentId === emp.id && w.yearMonth === ym)) {
            filledPrevYearSlots++;
          }
        }
      });

      const wageProgress = totalPrevYearSlots > 0
        ? Math.round((filledPrevYearSlots / totalPrevYearSlots) * 100)
        : 100;

      // 신고 필요 건수
      const pendingReports = thisMonthJoins + thisMonthLeaves;

      return {
        business: biz,
        stats: {
          activeWorkers,
          thisMonthJoins,
          thisMonthLeaves,
          wageProgress,
          pendingReports,
        },
      };
    });
  }, [businesses, employments, monthlyWages, thisMonth, prevYear]);

  // 신고 필요한 사업장 수
  const businessesWithPendingReports = businessStats.filter(
    (bs) => bs.stats.pendingReports > 0
  ).length;

  // 사업장이 없을 때
  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-6xl mb-6">📋</div>
        <h2 className="text-2xl font-semibold text-white mb-2">사업장을 등록하세요</h2>
        <p className="text-white/40 mb-6">급여관리를 시작하려면 먼저 사업장을 등록해주세요</p>
        <Link href="/businesses/new" className="btn-primary">
          사업장 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '대시보드' }]}
        title="급여관리 대시보드"
        description="전체 사업장 현황을 한눈에"
        action={{ label: '+ 사업장 추가', href: '/businesses/new' }}
      />

      {/* 전체 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">총 사업장</p>
          <p className="text-4xl font-bold text-white">{globalStats.totalBusinesses}</p>
          <p className="text-white/30 text-xs mt-1">개</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">총 재직자</p>
          <p className="text-4xl font-bold text-green-400">{globalStats.totalActiveWorkers}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">이번달 입사</p>
          <p className="text-4xl font-bold text-blue-400">{globalStats.thisMonthJoins}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">이번달 퇴사</p>
          <p className="text-4xl font-bold text-red-400">{globalStats.thisMonthLeaves}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
      </div>

      {/* 전체 알림 */}
      {businessesWithPendingReports > 0 && (
        <div className="glass p-4 mb-6 border-l-4 border-yellow-500">
          <div className="flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-white font-medium">신고서 작성 필요</p>
              <p className="text-white/50 text-sm">
                {businessesWithPendingReports}개 사업장에서 신고서 작성이 필요합니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 사업장 카드 그리드 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">사업장 목록</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessStats.map(({ business, stats }) => (
            <BusinessCard key={business.id} business={business} stats={stats} />
          ))}
        </div>
      </div>

      {/* 하단 링크 */}
      <div className="text-center mt-8">
        <Link
          href="/businesses"
          className="text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          사업장 관리 (추가/삭제) →
        </Link>
      </div>
    </div>
  );
}
