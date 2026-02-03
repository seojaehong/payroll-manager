'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function Dashboard() {
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);
  const businesses = useStore((state) => state.businesses);
  const employments = useStore((state) => state.employments);
  const monthlyWages = useStore((state) => state.monthlyWages);
  const reports = useStore((state) => state.reports);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear();
  const prevYear = thisYear - 1;

  // 선택된 사업장
  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  // 선택된 사업장의 통계 계산
  const stats = useMemo(() => {
    if (!selectedBusinessId) return null;

    const bizEmployments = employments.filter((e) => e.businessId === selectedBusinessId);
    const activeCount = bizEmployments.filter((e) => e.status === 'ACTIVE').length;
    const inactiveCount = bizEmployments.filter((e) => e.status === 'INACTIVE').length;
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

    // 최근 신고 목록
    const bizReports = reports.filter((r) => r.businessId === selectedBusinessId)
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
      .slice(0, 5);

    // 최근 입사자 (최근 5명)
    const recentJoins = bizEmployments
      .filter((e) => e.status === 'ACTIVE' && e.joinDate)
      .sort((a, b) => (b.joinDate || '').localeCompare(a.joinDate || ''))
      .slice(0, 5);

    return {
      totalWorkers: bizEmployments.length,
      activeCount,
      inactiveCount,
      thisMonthJoins,
      thisMonthLeaves,
      wageProgress,
      totalPrevYearSlots,
      filledPrevYearSlots,
      needsAcquireReport: thisMonthJoins > 0,
      needsLoseReport: thisMonthLeaves > 0,
      recentReports: bizReports,
      recentJoins,
    };
  }, [selectedBusinessId, employments, monthlyWages, reports, thisMonth, prevYear]);

  if (!selectedBusiness || !stats) {
    return null; // Layout에서 사업장 미선택 안내를 표시
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '대시보드' }]}
        title={selectedBusiness.name}
        description={selectedBusiness.bizNo}
        action={{ label: '사업장 정보 수정 →', href: `/businesses/${selectedBusiness.id}` }}
      />

      {/* 주요 지표 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">재직 중</p>
          <p className="text-4xl font-bold text-green-400">{stats.activeCount}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">퇴사</p>
          <p className="text-4xl font-bold text-white/60">{stats.inactiveCount}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">이번달 입사</p>
          <p className="text-4xl font-bold text-blue-400">{stats.thisMonthJoins}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
        <div className="glass p-6 text-center">
          <p className="text-white/50 text-sm mb-2">이번달 퇴사</p>
          <p className="text-4xl font-bold text-red-400">{stats.thisMonthLeaves}</p>
          <p className="text-white/30 text-xs mt-1">명</p>
        </div>
      </div>

      {/* 알림 */}
      {(stats.needsAcquireReport || stats.needsLoseReport) && (
        <div className="glass p-4 mb-6 border-l-4 border-yellow-500">
          <div className="flex items-center gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-white font-medium">신고서 작성 필요</p>
              <div className="flex gap-2 mt-1">
                {stats.needsAcquireReport && (
                  <span className="badge badge-info text-xs">취득신고 {stats.thisMonthJoins}건</span>
                )}
                {stats.needsLoseReport && (
                  <span className="badge badge-danger text-xs">상실신고 {stats.thisMonthLeaves}건</span>
                )}
              </div>
            </div>
            <Link href="/reports" className="ml-auto btn-primary text-sm">
              신고서 작성 →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 급여 입력 현황 */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">{prevYear}년 급여 입력</h2>
            <Link href="/wages" className="text-sm text-blue-400 hover:underline">
              급여 관리 →
            </Link>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    stats.wageProgress === 100 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${stats.wageProgress}%` }}
                />
              </div>
            </div>
            <span className={`text-xl font-bold ${stats.wageProgress === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              {stats.wageProgress}%
            </span>
          </div>
          <div className="flex justify-between text-sm text-white/50">
            <span>입력: {stats.filledPrevYearSlots}건</span>
            <span>미입력: {stats.totalPrevYearSlots - stats.filledPrevYearSlots}건</span>
          </div>
        </div>

        {/* 최근 신고 */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">최근 신고</h2>
            <Link href="/reports" className="text-sm text-blue-400 hover:underline">
              전체 보기 →
            </Link>
          </div>
          {stats.recentReports.length === 0 ? (
            <p className="text-white/40 text-sm">아직 신고 이력이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentReports.map((report) => (
                <li key={report.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">
                    {report.type === 'ACQUIRE' ? '취득신고' : '상실신고'}
                  </span>
                  <span className="text-white/40">{report.reportDate}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-white mb-4">빠른 작업</h2>
        <div className="grid grid-cols-4 gap-4">
          <Link href="/workers/new" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👤</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">근로자 추가</span>
          </Link>
          <Link href="/workers" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👥</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">근로자 목록</span>
          </Link>
          <Link href="/wages" className="action-card group">
            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">💰</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">급여 관리</span>
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
