'use client';

/**
 * /payslip 페이지
 * 사업장 상세의 '명세서 발송' 탭으로 리다이렉트
 */

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PayslipRedirectPage() {
  const router = useRouter();
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  useEffect(() => {
    if (selectedBusinessId) {
      // 사업장 상세 페이지의 급여 관리 탭 > 명세서 발송 서브탭으로 리다이렉트
      router.replace(`/businesses/${selectedBusinessId}?tab=payslip`);
    }
  }, [selectedBusinessId, router]);

  if (!selectedBusinessId) {
    return (
      <div className="text-center py-20">
        <p className="text-white/60 text-lg mb-4">사업장을 먼저 선택해주세요</p>
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
      <p className="text-white/60">사업장 상세 페이지로 이동 중...</p>
    </div>
  );
}
