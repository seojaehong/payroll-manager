'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { BusinessSelector } from './BusinessSelector';
import { Toast } from './ui/Toast';

// 사업장 컨텍스트 기반 네비게이션
const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/workers', label: '근로자 관리', icon: '👥' },
  { href: '/wages', label: '급여 관리', icon: '💰' },
  { href: '/reports', label: '신고서 생성', icon: '📝' },
  { href: '/payslip', label: '명세서 발송', icon: '📧' },
  { href: '/import', label: '엑셀 Import', icon: '📥' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initializeData = useStore((state) => state.initializeData);
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);
  const businesses = useStore((state) => state.businesses);

  // 앱 시작 시 초기 데이터 로드
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // 현재 경로가 활성화되어 있는지 확인 (하위 경로 포함)
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // 사업장 선택이 필요 없는 페이지 (전역 관리 페이지)
  const isGlobalPage = pathname.startsWith('/businesses') || pathname.startsWith('/settings') || pathname.startsWith('/payslip/');

  return (
    <div className="min-h-screen">
      <Toast />
      {/* 헤더 - 사업장 선택기 */}
      <header className="fixed top-0 left-72 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center px-8">
        <BusinessSelector />

        {/* 우측 정보 */}
        <div className="ml-auto flex items-center gap-4">
          {selectedBusinessId && (
            <span className="text-xs text-white/30">
              {businesses.length}개 사업장 관리 중
            </span>
          )}
        </div>
      </header>

      {/* 사이드바 - Liquid Glass */}
      <aside className="fixed left-0 top-0 h-full w-72 sidebar-glass z-50">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            급여관리
          </h1>
          <p className="text-sm text-white/40 mt-1 font-light">Payroll Manager</p>
        </div>
        <nav className="p-4 mt-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
                    isActive(item.href)
                      ? 'bg-white/10 text-white font-medium shadow-lg shadow-black/20'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[15px]">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 하단 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/5">
          <Link
            href="/businesses"
            className="block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            사업장 관리
          </Link>
          <p className="text-xs text-white/30 text-center mt-2">
            Winners Payroll v1.0
          </p>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-72 pt-16 p-10 animate-fade-in">
        {/* 전역 페이지이거나 사업장이 선택된 경우 컨텐츠 표시 */}
        {isGlobalPage || selectedBusinessId ? (
          children
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-6xl mb-6">📋</div>
            <h2 className="text-2xl font-semibold text-white mb-2">사업장을 등록하세요</h2>
            <p className="text-white/40 mb-6">급여관리를 시작하려면 먼저 사업장을 등록해주세요</p>
            <Link href="/businesses/new" className="btn-primary">
              사업장 등록하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-6xl mb-6">🏢</div>
            <h2 className="text-2xl font-semibold text-white mb-2">사업장을 선택하세요</h2>
            <p className="text-white/40 mb-6">상단의 사업장 선택기에서 작업할 사업장을 선택해주세요</p>
          </div>
        )}
      </main>
    </div>
  );
}
