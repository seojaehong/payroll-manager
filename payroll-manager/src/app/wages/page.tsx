'use client';

/**
 * /wages 페이지
 * 사업장 상세의 '급여 관리' 탭으로 리다이렉트
 *
 * 리팩토링 노트:
 * - 기존 871줄 → 50줄로 단순화
 * - WagesTab.tsx에 모든 기능이 통합되어 있음
 * - 코드 중복 제거로 유지보수성 향상
 */

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WagesRedirectPage() {
  const router = useRouter();
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  useEffect(() => {
    if (selectedBusinessId) {
      // 사업장 상세 페이지의 급여 탭으로 리다이렉트
      router.replace(`/businesses/${selectedBusinessId}?tab=wages`);
    }
  }, [selectedBusinessId, router]);

  if (!selectedBusinessId) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-6">💰</div>
        <h2 className="text-2xl font-semibold text-white mb-2">사업장을 먼저 선택해주세요</h2>
        <p className="text-white/40 mb-6">급여 관리를 위해 상단에서 사업장을 선택하세요</p>
        <button
          onClick={() => router.push('/businesses')}
          className="btn-primary"
        >
          사업장 목록으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4 animate-pulse">💰</div>
      <p className="text-white/60">급여 관리 페이지로 이동 중...</p>
    </div>
  );
}
