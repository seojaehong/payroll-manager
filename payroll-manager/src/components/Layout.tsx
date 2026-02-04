'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Toast } from './ui/Toast';
import AIChatButton from './ai/AIChatButton';

// 간소화된 네비게이션 (2개 메뉴)
const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initializeData = useStore((state) => state.initializeData);
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

  return (
    <div className="min-h-screen">
      <Toast />

      {/* 헤더 - 심플 */}
      <header className="fixed top-0 left-72 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center px-8">
        {/* 현재 페이지 경로 표시 */}
        <div className="text-white/40 text-sm">
          {pathname === '/' && '전체 사업장 현황'}
          {pathname.startsWith('/businesses/') && pathname !== '/businesses' && '사업장 상세'}
          {pathname === '/businesses' && '사업장 관리'}
          {pathname === '/settings' && '설정'}
        </div>

        {/* 우측 정보 */}
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-white/30">
            {businesses.length}개 사업장 관리 중
          </span>
        </div>
      </header>

      {/* 사이드바 - Liquid Glass */}
      <aside className="fixed left-0 top-0 h-full w-72 sidebar-glass z-50">
        <div className="p-8 border-b border-white/5">
          <Link href="/">
            <h1 className="text-2xl font-semibold text-white tracking-tight hover:text-white/80 transition-colors">
              급여관리
            </h1>
            <p className="text-sm text-white/40 mt-1 font-light">Payroll Manager</p>
          </Link>
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
            사업장 관리 (추가/삭제)
          </Link>
          <p className="text-xs text-white/30 text-center mt-2">
            Winners Payroll v1.0
          </p>
        </div>
      </aside>

      {/* AI 챗 버튼 */}
      <AIChatButton />

      {/* 메인 콘텐츠 - 항상 렌더링 */}
      <main className="ml-72 pt-16 p-10 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
