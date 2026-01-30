'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';

export default function Dashboard() {
  const { businesses, workers, employments, reports } = useStore();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthJoins = employments.filter(
    (e) => e.joinDate.startsWith(thisMonth) && e.status === 'ACTIVE'
  );
  const thisMonthLeaves = employments.filter(
    (e) => e.leaveDate?.startsWith(thisMonth)
  );

  const stats = [
    { label: '등록 사업장', value: businesses.length, gradient: 'from-blue-500/20 to-blue-600/10', icon: '🏢', href: '/businesses' },
    { label: '전체 근로자', value: workers.length, gradient: 'from-emerald-500/20 to-emerald-600/10', icon: '👥', href: '/workers' },
    { label: '재직 중', value: employments.filter((e) => e.status === 'ACTIVE').length, gradient: 'from-green-500/20 to-green-600/10', icon: '✅', href: '/workers' },
    { label: '이번 달 입사', value: thisMonthJoins.length, gradient: 'from-orange-500/20 to-orange-600/10', icon: '📈', href: '/reports' },
    { label: '이번 달 퇴사', value: thisMonthLeaves.length, gradient: 'from-red-500/20 to-red-600/10', icon: '📉', href: '/reports' },
    { label: '신고 이력', value: reports.length, gradient: 'from-purple-500/20 to-purple-600/10', icon: '📋', href: '/reports' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">대시보드</h1>
      <p className="text-white/40 mb-8">전체 현황을 한눈에 확인하세요</p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className={`stat-card bg-gradient-to-br ${stat.gradient} group cursor-pointer`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-sm font-medium">{stat.label}</p>
                  <p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
                </div>
                <div className="text-4xl opacity-50 group-hover:opacity-80 transition-opacity">
                  {stat.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 빠른 작업 */}
      <div className="glass p-8 mb-10">
        <h2 className="text-xl font-semibold text-white mb-6">빠른 작업</h2>
        <div className="grid grid-cols-4 gap-4">
          <Link href="/businesses/new" className="action-card group">
            <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">🏢</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">사업장 추가</span>
          </Link>
          <Link href="/workers/new" className="action-card group">
            <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">👤</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">근로자 추가</span>
          </Link>
          <Link href="/import" className="action-card group">
            <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">📥</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">엑셀 Import</span>
          </Link>
          <Link href="/reports" className="action-card group">
            <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">📝</span>
            <span className="text-white/70 text-sm group-hover:text-white transition-colors">신고서 생성</span>
          </Link>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="glass p-8">
        <h2 className="text-xl font-semibold text-white mb-6">최근 신고 이력</h2>
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-lg">아직 신고 이력이 없습니다</p>
            <p className="text-white/30 text-sm mt-2">신고서를 생성하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <table className="w-full table-glass">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">날짜</th>
                <th className="px-4 py-3">사업장</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">인원</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 5).map((report) => {
                const business = businesses.find((b) => b.id === report.businessId);
                return (
                  <tr key={report.id}>
                    <td className="px-4 py-4 text-white/80">{report.reportDate}</td>
                    <td className="px-4 py-4 text-white">{business?.name || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`badge ${report.type === 'ACQUIRE' ? 'badge-success' : 'badge-danger'}`}>
                        {report.type === 'ACQUIRE' ? '취득' : '상실'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white/80">{report.workerCount}명</td>
                    <td className="px-4 py-4">
                      <span className={`badge ${
                        report.status === 'COMPLETED' ? 'badge-info' :
                        report.status === 'SUBMITTED' ? 'badge-warning' : 'badge-gray'
                      }`}>
                        {report.status === 'COMPLETED' ? '완료' :
                         report.status === 'SUBMITTED' ? '제출' : '대기'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
