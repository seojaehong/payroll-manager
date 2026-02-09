'use client';

/**
 * 급여명세서 웹 뷰 페이지
 * /payslip/[token]
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { PayslipData } from '@/types';
import { formatNumber } from '@/lib/format';

// 날짜 포맷팅
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

export default function PayslipViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [data, setData] = useState<PayslipData | null>(null);
  const [accessInfo, setAccessInfo] = useState<{
    accessCount: number;
    maxAccessCount: number;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    async function fetchPayslip() {
      try {
        const response = await fetch(`/api/payslip/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || '급여명세서를 불러올 수 없습니다.');
          setErrorCode(result.code || null);
          return;
        }

        setData(result.data);
        setAccessInfo({
          accessCount: result.accessCount,
          maxAccessCount: result.maxAccessCount,
          expiresAt: result.expiresAt,
        });
      } catch {
        setError('서버 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchPayslip();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">급여명세서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {errorCode === 'TOKEN_EXPIRED'
              ? '링크가 만료되었습니다'
              : errorCode === 'MAX_ACCESS_EXCEEDED'
                ? '최대 조회 횟수를 초과했습니다'
                : errorCode === 'TOKEN_NOT_FOUND'
                  ? '유효하지 않은 링크입니다'
                  : '오류가 발생했습니다'}
          </h1>
          <p className="text-gray-600">{error}</p>
          <p className="mt-4 text-sm text-gray-500">
            급여명세서를 다시 받으시려면 담당자에게 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto">
        {/* 안내 메시지 */}
        {accessInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 mx-4">
            <p className="text-sm text-yellow-800">
              📋 이 링크는 <strong>{accessInfo.maxAccessCount}회</strong>까지 조회 가능합니다.
              (현재 {accessInfo.accessCount}회 조회)
            </p>
          </div>
        )}

        {/* 급여명세서 카드 */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mx-4">
          {/* 헤더 */}
          <div className="bg-blue-600 text-white p-6 text-center">
            <h1 className="text-2xl font-bold">급여명세서</h1>
            <p className="text-blue-100 mt-1">{formatYearMonth(data.yearMonth)}</p>
          </div>

          {/* 기본 정보 */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">사업장</p>
                <p className="font-medium">{data.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">사업자번호</p>
                <p className="font-medium">{data.businessBizNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">성명</p>
                <p className="font-medium text-lg">{data.workerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">귀속연월</p>
                <p className="font-medium">{data.yearMonth}</p>
              </div>
            </div>
          </div>

          {/* 지급 내역 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-800 mb-4">지급 내역</h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-600">기본급</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.basicWage)}원</td>
                </tr>
                {data.overtimeWage && data.overtimeWage > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">연장근로수당</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.overtimeWage)}원</td>
                  </tr>
                )}
                {data.nightWage && data.nightWage > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">야간근로수당</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.nightWage)}원</td>
                  </tr>
                )}
                {data.holidayWage && data.holidayWage > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">휴일근로수당</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.holidayWage)}원</td>
                  </tr>
                )}
                {data.bonusWage && data.bonusWage > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">상여금</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.bonusWage)}원</td>
                  </tr>
                )}
                {data.otherWage && data.otherWage > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">기타수당</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.otherWage)}원</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="py-3 font-bold text-gray-800">지급 합계</td>
                  <td className="py-3 text-right font-bold text-blue-600">{formatNumber(data.totalWage)}원</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 공제 내역 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-800 mb-4">공제 내역</h2>
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 text-gray-600">국민연금</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.nps)}원</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">건강보험</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.nhic)}원</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">장기요양보험</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.ltc)}원</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">고용보험</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.ei)}원</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">소득세</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.incomeTax)}원</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">지방소득세</td>
                  <td className="py-2 text-right font-medium">{formatNumber(data.localTax)}원</td>
                </tr>
                {data.otherDeduction && data.otherDeduction > 0 && (
                  <tr>
                    <td className="py-2 text-gray-600">기타공제</td>
                    <td className="py-2 text-right font-medium">{formatNumber(data.otherDeduction)}원</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="py-3 font-bold text-gray-800">공제 합계</td>
                  <td className="py-3 text-right font-bold text-red-600">{formatNumber(data.totalDeduction)}원</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 실수령액 */}
          <div className="p-6 bg-blue-600 text-white">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">실수령액</span>
              <span className="text-3xl font-bold">{formatNumber(data.netWage)}원</span>
            </div>
          </div>

          {/* 근무 정보 */}
          {(data.workDays || data.workHours) && (
            <div className="p-6 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-500 mb-2">근무 정보</h3>
              <div className="flex gap-6">
                {data.workDays && (
                  <p className="text-gray-700">근무일수: <strong>{data.workDays}일</strong></p>
                )}
                {data.workHours && (
                  <p className="text-gray-700">근무시간: <strong>{data.workHours}시간</strong></p>
                )}
              </div>
            </div>
          )}

          {/* 푸터 */}
          <div className="p-4 bg-gray-100 text-center text-sm text-gray-500">
            <p>본 문서는 전자적으로 생성된 급여명세서입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
