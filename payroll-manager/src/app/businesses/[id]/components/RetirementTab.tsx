'use client';

import { useState, useMemo } from 'react';
import { MonthlyWage, Worker, Employment, RetirementCalculation, Business } from '@/types';
import { calculateFullRetirement, formatCurrency, isEligible } from '@/lib/retirement';
import { downloadRetirementPDF } from '@/lib/retirement-pdf';

export interface RetirementTabProps {
  businessId: string;
  business: Business;
  businessEmployments: { employment: Employment; worker: Worker }[];
  monthlyWages: MonthlyWage[];
  workers: Worker[];
  retirementCalculations: RetirementCalculation[];
  addRetirementCalculation: (calculation: RetirementCalculation) => void;
}

export function RetirementTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
  workers,
  retirementCalculations,
  addRetirementCalculation,
}: RetirementTabProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<RetirementCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string>('');

  // 퇴사자 목록 (퇴직금 대상)
  const leavedWorkers = useMemo(() => {
    return businessEmployments.filter(({ employment }) =>
      employment.status === 'INACTIVE' && employment.leaveDate
    );
  }, [businessEmployments]);

  // 기존 계산 결과
  const existingCalculations = useMemo(() => {
    return retirementCalculations.filter((r) => r.businessId === businessId);
  }, [retirementCalculations, businessId]);

  // 퇴직금 계산 실행
  const handleCalculate = () => {
    if (!selectedWorkerId) {
      setError('퇴사자를 선택하세요.');
      return;
    }

    setCalculating(true);
    setError('');

    const selected = leavedWorkers.find(({ worker }) => worker.id === selectedWorkerId);
    if (!selected) {
      setError('선택된 근로자를 찾을 수 없습니다.');
      setCalculating(false);
      return;
    }

    const { worker, employment } = selected;

    // 1년 미만 체크
    if (!isEligible(employment.joinDate, employment.leaveDate!)) {
      setError('1년 미만 근무로 퇴직금 수급 자격이 없습니다.');
      setCalculating(false);
      return;
    }

    // 급여 데이터 확인
    const empWages = monthlyWages.filter((mw) => mw.employmentId === employment.id);
    if (empWages.length === 0) {
      setError('급여 데이터가 없습니다. 급여 이력 탭에서 먼저 입력해주세요.');
      setCalculating(false);
      return;
    }

    // 퇴직금 계산
    const result = calculateFullRetirement(employment, worker, monthlyWages);

    if (!result) {
      setError('퇴직금 계산에 실패했습니다.');
      setCalculating(false);
      return;
    }

    setCalculationResult(result);
    setCalculating(false);
  };

  // 계산 결과 저장
  const handleSaveCalculation = () => {
    if (!calculationResult) return;
    addRetirementCalculation(calculationResult);
    alert('퇴직금 계산 결과가 저장되었습니다.');
  };

  // PDF 다운로드
  const handleDownloadPDF = async () => {
    if (!calculationResult) return;

    const selected = leavedWorkers.find(({ worker }) => worker.id === selectedWorkerId);
    if (!selected) return;

    await downloadRetirementPDF(calculationResult, selected.worker, business, monthlyWages);
  };

  // 저장된 계산 결과 보기
  const viewSavedCalculation = (calc: RetirementCalculation) => {
    setCalculationResult(calc);
    setSelectedWorkerId(calc.workerId);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">퇴직금 계산</h3>
      </div>

      {/* 퇴사자 선택 및 계산 */}
      <div className="glass p-4 mb-6">
        <h4 className="text-white font-medium mb-4">퇴직금 계산하기</h4>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-2">퇴사자 선택</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => {
                setSelectedWorkerId(e.target.value);
                setCalculationResult(null);
                setError('');
              }}
              className="w-full input-glass px-4 py-3"
            >
              <option value="">-- 선택하세요 --</option>
              {leavedWorkers.map(({ worker, employment }) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} (퇴사: {employment.leaveDate})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCalculate}
            disabled={!selectedWorkerId || calculating}
            className="btn-primary disabled:opacity-50"
          >
            {calculating ? '계산 중...' : '퇴직금 계산'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* 계산 결과 */}
      {calculationResult && (
        <div className="glass p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-medium text-lg">퇴직금 계산 결과</h4>
            <div className="flex gap-2">
              <button onClick={handleSaveCalculation} className="btn-secondary text-sm">
                저장
              </button>
              <button onClick={handleDownloadPDF} className="btn-primary text-sm">
                PDF 다운로드
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 근무 정보 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">근무 정보</h5>
              <div className="flex justify-between">
                <span className="text-white/50">입사일</span>
                <span className="text-white">{calculationResult.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴사일</span>
                <span className="text-white">{calculationResult.leaveDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">총 근속일수</span>
                <span className="text-white">{calculationResult.totalDays.toLocaleString()}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">근속연수</span>
                <span className="text-white">{calculationResult.totalYears.toFixed(2)}년</span>
              </div>
            </div>

            {/* 평균임금 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">평균임금 계산</h5>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직 전 3개월 급여</span>
                <span className="text-white">{formatCurrency(calculationResult.last3MonthsWages)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직 전 3개월 일수</span>
                <span className="text-white">{calculationResult.last3MonthsDays}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">평균임금 (일당)</span>
                <span className="text-white font-medium">{formatCurrency(calculationResult.averageDailyWage)}</span>
              </div>
            </div>

            {/* 퇴직금 계산 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">퇴직금 계산</h5>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직금 (세전)</span>
                <span className="text-white font-medium">{formatCurrency(calculationResult.retirementPay)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">= 평균임금 x 30일 x (근속일수/365)</span>
              </div>
            </div>

            {/* 세금 계산 */}
            <div className="space-y-3">
              <h5 className="text-white/60 text-sm font-medium border-b border-white/10 pb-2">퇴직소득세</h5>
              <div className="flex justify-between">
                <span className="text-white/50">근속연수공제</span>
                <span className="text-white/60">{formatCurrency(calculationResult.serviceYearDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">퇴직소득세</span>
                <span className="text-red-400">-{formatCurrency(calculationResult.retirementTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">지방소득세 (10%)</span>
                <span className="text-red-400">-{formatCurrency(calculationResult.localRetirementTax)}</span>
              </div>
            </div>
          </div>

          {/* 실수령액 */}
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-green-400 font-medium text-lg">실수령 퇴직금</span>
              <span className="text-green-400 font-bold text-2xl">{formatCurrency(calculationResult.netRetirementPay)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 저장된 계산 이력 */}
      {existingCalculations.length > 0 && (
        <div className="glass p-4">
          <h4 className="text-white font-medium mb-4">저장된 계산 이력</h4>
          <table className="w-full table-glass text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">이름</th>
                <th className="px-3 py-2 text-left">퇴사일</th>
                <th className="px-3 py-2 text-right">퇴직금</th>
                <th className="px-3 py-2 text-right">실수령액</th>
                <th className="px-3 py-2 text-center">계산일</th>
                <th className="px-3 py-2 text-center">액션</th>
              </tr>
            </thead>
            <tbody>
              {existingCalculations.map((calc) => {
                const worker = workers.find((w) => w.id === calc.workerId);
                return (
                  <tr key={calc.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-white">{worker?.name || '-'}</td>
                    <td className="px-3 py-2 text-white/60">{calc.leaveDate}</td>
                    <td className="px-3 py-2 text-right text-white/60">{formatCurrency(calc.retirementPay)}</td>
                    <td className="px-3 py-2 text-right text-green-400">{formatCurrency(calc.netRetirementPay)}</td>
                    <td className="px-3 py-2 text-center text-white/40 text-xs">
                      {new Date(calc.calculatedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => viewSavedCalculation(calc)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 */}
      {leavedWorkers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/40 text-lg mb-2">퇴사자가 없습니다</p>
          <p className="text-white/30 text-sm">퇴직금 계산은 퇴사 처리된 근로자만 가능합니다.</p>
        </div>
      )}
    </div>
  );
}
