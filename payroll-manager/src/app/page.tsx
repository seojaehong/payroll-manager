'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useMemo } from 'react';

export default function Dashboard() {
  const { businesses, workers, employments, monthlyWages, reports } = useStore();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear();
  const prevYear = thisYear - 1;

  // 사업장별 현황 계산
  const businessStats = useMemo(() => {
    return businesses.map((business) => {
      const bizEmployments = employments.filter((e) => e.businessId === business.id);
      const activeCount = bizEmployments.filter((e) => e.status === 'ACTIVE').length;
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
        const joinMonth = emp.joinDate ? parseInt(emp.joinDate.slice(5, 7)) : 1;
        const leaveYear = emp.leaveDate ? parseInt(emp.leaveDate.slice(0, 4)) : 9999;
        const leaveMonth = emp.leaveDate ? parseInt(emp.leaveDate.slice(5, 7)) : 12;

        // 전년도에 근무한 월 수 계산
        for (let m = 1; m <= 12; m++) {
          const ym = `${prevYear}-${String(m).padStart(2, '0')}`;
          const monthStart = new Date(prevYear, m - 1, 1);
          const monthEnd = new Date(prevYear, m, 0);

          const empJoinDate = emp.joinDate ? new Date(emp.joinDate) : null;
          const empLeaveDate = emp.leaveDate ? new Date(emp.leaveDate) : null;

          // 해당 월에 근무했는지 확인
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

      // 신고 필요 여부 확인
      const needsAcquireReport = thisMonthJoins > 0;
      const needsLoseReport = thisMonthLeaves > 0;

      // 최근 신고
      const bizReports = reports.filter((r) => r.businessId === business.id);
      const lastReport = bizReports.sort((a, b) =>
        new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
      )[0];

      return {
        business,
        activeCount,
        thisMonthJoins,
        thisMonthLeaves,
        wageProgress,
        totalPrevYearSlots,
        filledPrevYearSlots,
        needsAcquireReport,
        needsLoseReport,
        lastReport,
      };
    });
  }, [businesses, employments, monthlyWages, reports, thisMonth, prevYear]);

  // 전체 통계
  const totalStats = useMemo(() => ({
    businesses: businesses.length,
    workers: workers.length,
    activeEmployments: employments.filter((e) => e.status === 'ACTIVE').length,
    thisMonthJoins: employments.filter((e) => e.joinDate?.startsWith(thisMonth) && e.status === 'ACTIVE').length,
    thisMonthLeaves: employments.filter((e) => e.leaveDate?.startsWith(thisMonth)).length,
  }), [businesses, workers, employments, thisMonth]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">대시보드</h1>
      <p className="text-white/40 mb-8">사업장별 현황을 한눈에 확인하세요</p>

      {/* 전체 통계 요약 */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">사업장</p>
          <p className="text-2xl font-bold text-white">{totalStats.businesses}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">전체 근로자</p>
          <p className="text-2xl font-bold text-white">{totalStats.workers}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">재직 중</p>
          <p className="text-2xl font-bold text-green-400">{totalStats.activeEmployments}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 입사</p>
          <p className="text-2xl font-bold text-blue-400">{totalStats.thisMonthJoins}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-white/50 text-xs">이번달 퇴사</p>
          <p className="text-2xl font-bold text-red-400">{totalStats.thisMonthLeaves}</p>
        </div>
      </div>

      {/* 사업장별 카드 */}
      <h2 className="text-xl font-semibold text-white mb-4">사업장 현황</h2>
      {businesses.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-white/40 text-lg mb-4">등록된 사업장이 없습니다</p>
          <Link href="/businesses/new" className="btn-primary">
            사업장 추가하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {businessStats.map(({
            business,
            activeCount,
            thisMonthJoins,
            thisMonthLeaves,
            wageProgress,
            needsAcquireReport,
            needsLoseReport,
          }) => (
            <Link key={business.id} href={`/businesses/${business.id}`}>
              <div className="glass p-6 hover:bg-white/5 transition-colors cursor-pointer group">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {business.name}
                    </h3>
                    <p className="text-white/40 text-sm">{business.bizNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{activeCount}<span className="text-sm text-white/50">명</span></p>
                    <p className="text-white/40 text-xs">재직 중</p>
                  </div>
                </div>

                {/* 이번달 입퇴사 */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 glass p-3 text-center">
                    <p className="text-blue-400 font-bold">{thisMonthJoins}</p>
                    <p className="text-white/40 text-xs">이번달 입사</p>
                  </div>
                  <div className="flex-1 glass p-3 text-center">
                    <p className="text-red-400 font-bold">{thisMonthLeaves}</p>
                    <p className="text-white/40 text-xs">이번달 퇴사</p>
                  </div>
                </div>

                {/* 급여 입력 현황 */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50">{prevYear}년 급여</span>
                    <span className={wageProgress === 100 ? 'text-green-400' : 'text-yellow-400'}>
                      {wageProgress}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        wageProgress === 100 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${wageProgress}%` }}
                    />
                  </div>
                </div>

                {/* 알림 */}
                {(needsAcquireReport || needsLoseReport) && (
                  <div className="flex gap-2">
                    {needsAcquireReport && (
                      <span className="badge badge-info text-xs">취득신고 필요</span>
                    )}
                    {needsLoseReport && (
                      <span className="badge badge-danger text-xs">상실신고 필요</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 빠른 작업 */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">빠른 작업</h2>
        <div className="grid grid-cols-4 gap-4">
          <Link href="/businesses/new" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">🏢</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">사업장 추가</span>
          </Link>
          <Link href="/workers" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👥</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">근로자 관리</span>
          </Link>
          <Link href="/wages" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">💰</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">급여 이력</span>
          </Link>
          <Link href="/reports" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📝</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">신고서 생성</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
