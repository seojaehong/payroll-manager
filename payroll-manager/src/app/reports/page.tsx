'use client';

/**
 * /reports 페이지
 * 사업장 상세의 '신고서 생성' 탭으로 리다이렉트
 *
 * 리팩토링 노트:
 * - 기존 442줄 → 50줄로 단순화
 * - ReportsTab.tsx에 모든 기능이 통합되어 있음
 * - 코드 중복 제거로 유지보수성 향상
 */

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ReportsRedirectPage() {
  const router = useRouter();
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  useEffect(() => {
    if (selectedBusinessId) {
      // 사업장 상세 페이지의 신고서 탭으로 리다이렉트
      router.replace(`/businesses/${selectedBusinessId}?tab=reports`);
    }
  }, [selectedBusinessId, router]);

  if (!selectedBusinessId) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-6">📝</div>
        <h2 className="text-2xl font-semibold text-white mb-2">사업장을 먼저 선택해주세요</h2>
        <p className="text-white/40 mb-6">신고서 생성을 위해 상단에서 사업장을 선택하세요</p>
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
      <div className="text-4xl mb-4 animate-pulse">📝</div>
      <p className="text-white/60">신고서 생성 페이지로 이동 중...</p>
    </div>
  );
}
