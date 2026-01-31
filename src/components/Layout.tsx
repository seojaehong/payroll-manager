'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/businesses', label: '사업장 관리', icon: '🏢' },
  { href: '/workers', label: '근로자 관리', icon: '👥' },
  { href: '/wages', label: '급여 이력', icon: '💰' },
  { href: '/reports', label: '신고서 생성', icon: '📝' },
  { href: '/import', label: '엑셀 Import', icon: '📥' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initializeData = useStore((state) => state.initializeData);

  // 앱 시작 시 초기 데이터 로드
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return (
    <div className="min-h-screen">
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
                    pathname === item.href
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
          <p className="text-xs text-white/30 text-center">
            Winners Payroll v1.0
          </p>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-72 p-10 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
