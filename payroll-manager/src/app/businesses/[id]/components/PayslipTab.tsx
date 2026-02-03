'use client';

/**
 * 급여명세서 발송 탭 컴포넌트
 */

import { useState, useMemo } from 'react';
import { downloadPayslipPDF } from '@/lib/payslip-pdf';
import { SendHistoryList } from '@/components/ui/SendHistoryList';
import type { PayslipData, SendChannel, MonthlyWage, Worker, Employment, Business } from '@/types';

interface BusinessEmployment {
  employment: Employment;
  worker: Worker;
}

interface PayslipTabProps {
  businessId: string;
  business: Business;
  businessEmployments: BusinessEmployment[];
  monthlyWages: MonthlyWage[];
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

interface WorkerSendState {
  status: SendStatus;
  message?: string;
  channels?: SendChannel[];
}

export function PayslipTab({
  businessId,
  business,
  businessEmployments,
  monthlyWages,
}: PayslipTabProps) {
  // 상태
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<SendChannel>>(new Set(['email']));
  const [attachPdf, setAttachPdf] = useState(true);
  const [includeLink, setIncludeLink] = useState(true);
  const [sendStates, setSendStates] = useState<Record<string, WorkerSendState>>({});
  const [isBulkSending, setIsBulkSending] = useState(false);

  // 해당 월의 급여 데이터가 있는 근로자 목록
  const workersWithWages = useMemo(() => {
    return businessEmployments
      .filter(({ employment }) => {
        // 해당 월에 재직 중이었던 근로자만
        const yearMonth = selectedYearMonth;
        const joinYM = employment.joinDate?.slice(0, 7) || '';
        const leaveYM = employment.leaveDate?.slice(0, 7) || '9999-12';
        return joinYM <= yearMonth && yearMonth <= leaveYM;
      })
      .map(({ employment, worker }) => {
        const wage = monthlyWages.find(
          (w) => w.employmentId === employment.id && w.yearMonth === selectedYearMonth
        );
        return { employment, worker, wage };
      })
      .filter(({ wage }) => wage); // 급여 데이터가 있는 경우만
  }, [businessEmployments, monthlyWages, selectedYearMonth]);

  // 급여명세서 데이터 생성
  const createPayslipData = (
    worker: Worker,
    wage: MonthlyWage
  ): PayslipData => {
    // 공제 합계 계산
    const totalDeduction =
      (wage.nps || 0) +
      (wage.nhic || 0) +
      (wage.ltc || 0) +
      (wage.ei || 0) +
      (wage.incomeTax || 0) +
      (wage.localTax || 0) +
      (wage.otherDeduction || 0);

    // 연장근로 합산 (평일 + 주말)
    const overtimeTotal = (wage.overtimeWage || 0) + (wage.overtimeWeekday || 0) + (wage.overtimeWeekend || 0);

    // 기타수당 계산 (식대 + 차량유지비 + 연차수당 + otherWage)
    const otherWageTotal = (wage.mealAllowance || 0) + (wage.carAllowance || 0) + (wage.annualLeaveWage || 0) + (wage.otherWage || 0);

    return {
      businessName: business.name,
      businessBizNo: business.bizNo,
      workerName: worker.name,
      yearMonth: wage.yearMonth,
      // 지급 항목 (값이 있는 항목은 모두 전달)
      basicWage: wage.basicWage ?? wage.totalWage, // 기본급이 없으면 총액 사용
      overtimeWage: overtimeTotal || undefined,
      nightWage: wage.nightWage || undefined,
      holidayWage: wage.holidayWage || undefined,
      bonusWage: wage.bonusWage || undefined,
      otherWage: otherWageTotal || undefined,
      totalWage: wage.totalWage,
      // 공제 항목
      nps: wage.nps || 0,
      nhic: wage.nhic || 0,
      ltc: wage.ltc || 0,
      ei: wage.ei || 0,
      incomeTax: wage.incomeTax || 0,
      localTax: wage.localTax || 0,
      otherDeduction: wage.otherDeduction,
      totalDeduction,
      // 실수령액
      netWage: wage.netWage || wage.totalWage - totalDeduction,
      workDays: wage.workDays,
      generatedAt: new Date(),
    };
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedWorkers.size === workersWithWages.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(workersWithWages.map(({ worker }) => worker.id)));
    }
  };

  // 개별 선택
  const toggleSelectWorker = (workerId: string) => {
    const newSet = new Set(selectedWorkers);
    if (newSet.has(workerId)) {
      newSet.delete(workerId);
    } else {
      newSet.add(workerId);
    }
    setSelectedWorkers(newSet);
  };

  // 채널 선택
  const toggleChannel = (channel: SendChannel) => {
    const newSet = new Set(selectedChannels);
    if (newSet.has(channel)) {
      newSet.delete(channel);
    } else {
      newSet.add(channel);
    }
    setSelectedChannels(newSet);
  };

  // PDF 다운로드
  const handleDownloadPdf = async (worker: Worker, wage: MonthlyWage) => {
    const payslipData = createPayslipData(worker, wage);
    await downloadPayslipPDF(payslipData, `급여명세서_${worker.name}_${wage.yearMonth}`);
  };

  // 개별 발송
  const handleSendToWorker = async (
    worker: Worker,
    employment: Employment,
    wage: MonthlyWage
  ) => {
    if (selectedChannels.size === 0) {
      alert('발송 채널을 선택해주세요.');
      return;
    }

    // 이메일/전화번호 확인
    const channels = Array.from(selectedChannels);
    if (channels.includes('email') && !worker.email) {
      alert(`${worker.name}의 이메일 정보가 없습니다.`);
      return;
    }
    if ((channels.includes('sms') || channels.includes('kakao')) && !worker.phone) {
      alert(`${worker.name}의 전화번호 정보가 없습니다.`);
      return;
    }

    setSendStates((prev) => ({
      ...prev,
      [worker.id]: { status: 'sending', channels },
    }));

    try {
      const payslipData = createPayslipData(worker, wage);

      const response = await fetch('/api/send-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payslipData,
          channels,
          recipient: {
            email: worker.email,
            phone: worker.phone,
          },
          attachPdf,
          includeLink,
          businessId,
          workerId: worker.id,
          employmentId: employment.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSendStates((prev) => ({
          ...prev,
          [worker.id]: {
            status: 'success',
            message: `${result.summary.success}/${result.summary.total} 발송 성공`,
            channels,
          },
        }));
      } else {
        setSendStates((prev) => ({
          ...prev,
          [worker.id]: {
            status: 'error',
            message: result.error || '발송 실패',
            channels,
          },
        }));
      }
    } catch (error) {
      setSendStates((prev) => ({
        ...prev,
        [worker.id]: {
          status: 'error',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          channels,
        },
      }));
    }
  };

  // 일괄 발송
  const handleBulkSend = async () => {
    if (selectedWorkers.size === 0) {
      alert('발송할 근로자를 선택해주세요.');
      return;
    }
    if (selectedChannels.size === 0) {
      alert('발송 채널을 선택해주세요.');
      return;
    }

    const confirm = window.confirm(
      `${selectedWorkers.size}명에게 급여명세서를 발송하시겠습니까?`
    );
    if (!confirm) return;

    setIsBulkSending(true);

    // 선택된 근로자들에게 순차 발송
    for (const item of workersWithWages) {
      if (selectedWorkers.has(item.worker.id) && item.wage) {
        await handleSendToWorker(item.worker, item.employment, item.wage);
        // 발송 간격 (rate limit 방지)
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsBulkSending(false);
    alert('일괄 발송이 완료되었습니다.');
  };

  // 연월 선택 옵션 생성
  const yearMonthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return options;
  }, []);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">급여명세서 발송</h2>
        <div className="flex items-center gap-4">
          {/* 연월 선택 */}
          <select
            value={selectedYearMonth}
            onChange={(e) => setSelectedYearMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
          >
            {yearMonthOptions.map((ym) => (
              <option key={ym} value={ym} className="bg-gray-800">
                {ym.replace('-', '년 ')}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 발송 설정 */}
      <div className="bg-white/5 rounded-lg p-4 mb-6">
        <h3 className="text-white/80 text-sm font-medium mb-3">발송 채널</h3>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedChannels.has('email')}
              onChange={() => toggleChannel('email')}
              className="rounded"
            />
            <span className="text-white/80">📧 이메일</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedChannels.has('sms')}
              onChange={() => toggleChannel('sms')}
              className="rounded"
            />
            <span className="text-white/80">📱 문자 (SMS)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedChannels.has('kakao')}
              onChange={() => toggleChannel('kakao')}
              className="rounded"
            />
            <span className="text-white/80">💬 카카오톡</span>
          </label>
        </div>

        {selectedChannels.has('email') && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="rounded"
              />
              <span className="text-white/60">PDF 첨부</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLink}
                onChange={(e) => setIncludeLink(e.target.checked)}
                className="rounded"
              />
              <span className="text-white/60">웹 링크 포함</span>
            </label>
          </div>
        )}
      </div>

      {/* 근로자 목록 */}
      {workersWithWages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40">
            {selectedYearMonth.replace('-', '년 ')}월 급여 데이터가 없습니다.
          </p>
          <p className="text-white/30 text-sm mt-2">
            &apos;급여 이력&apos; 탭에서 급여 데이터를 먼저 업로드해주세요.
          </p>
        </div>
      ) : (
        <>
          {/* 일괄 작업 버튼 */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedWorkers.size === workersWithWages.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="text-white/60 text-sm">
                전체 선택 ({selectedWorkers.size}/{workersWithWages.length})
              </span>
            </label>
            <button
              onClick={handleBulkSend}
              disabled={selectedWorkers.size === 0 || isBulkSending}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedWorkers.size === 0 || isBulkSending
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isBulkSending ? '발송 중...' : `선택 발송 (${selectedWorkers.size}명)`}
            </button>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-white/50 text-sm border-b border-white/10">
                  <th className="pb-3 w-10"></th>
                  <th className="pb-3">근로자</th>
                  <th className="pb-3 text-right">지급액</th>
                  <th className="pb-3 text-right">공제액</th>
                  <th className="pb-3 text-right">실수령액</th>
                  <th className="pb-3 text-center">상태</th>
                  <th className="pb-3 text-center">작업</th>
                </tr>
              </thead>
              <tbody>
                {workersWithWages.map(({ worker, employment, wage }) => {
                  const state = sendStates[worker.id];
                  return (
                    <tr key={worker.id} className="border-b border-white/5">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={selectedWorkers.has(worker.id)}
                          onChange={() => toggleSelectWorker(worker.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-white font-medium">{worker.name}</p>
                          <p className="text-white/40 text-xs">
                            {worker.email || worker.phone || '연락처 없음'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 text-right text-white/80">
                        {wage?.totalWage.toLocaleString()}원
                      </td>
                      <td className="py-3 text-right text-red-400">
                        {wage
                          ? (
                              (wage.nps || 0) +
                              (wage.nhic || 0) +
                              (wage.ltc || 0) +
                              (wage.ei || 0) +
                              (wage.incomeTax || 0) +
                              (wage.localTax || 0)
                            ).toLocaleString()
                          : 0}
                        원
                      </td>
                      <td className="py-3 text-right text-green-400 font-medium">
                        {wage?.netWage?.toLocaleString() ||
                          (wage
                            ? (
                                wage.totalWage -
                                ((wage.nps || 0) +
                                  (wage.nhic || 0) +
                                  (wage.ltc || 0) +
                                  (wage.ei || 0) +
                                  (wage.incomeTax || 0) +
                                  (wage.localTax || 0))
                              ).toLocaleString()
                            : 0)}
                        원
                      </td>
                      <td className="py-3 text-center">
                        {state?.status === 'sending' && (
                          <span className="text-yellow-400 text-sm">발송 중...</span>
                        )}
                        {state?.status === 'success' && (
                          <span className="text-green-400 text-sm">✓ {state.message}</span>
                        )}
                        {state?.status === 'error' && (
                          <span className="text-red-400 text-sm" title={state.message}>
                            ✕ 실패
                          </span>
                        )}
                        {!state && <span className="text-white/30 text-sm">-</span>}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => wage && handleDownloadPdf(worker, wage)}
                            className="text-white/50 hover:text-white text-sm"
                            title="PDF 다운로드"
                          >
                            📥
                          </button>
                          <button
                            onClick={() =>
                              wage && handleSendToWorker(worker, employment, wage)
                            }
                            disabled={state?.status === 'sending'}
                            className={`text-sm ${
                              state?.status === 'sending'
                                ? 'text-white/30'
                                : 'text-blue-400 hover:text-blue-300'
                            }`}
                            title="발송"
                          >
                            📤
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-blue-400 font-medium mb-2">📋 발송 안내</h4>
        <ul className="text-white/60 text-sm space-y-1">
          <li>• 이메일: SMTP 설정이 필요합니다 (.env.local)</li>
          <li>• 문자(SMS): CoolSMS API 키가 필요합니다</li>
          <li>• 카카오톡: 카카오 비즈니스 채널 및 알림톡 템플릿 승인이 필요합니다</li>
          <li>• 웹 링크는 7일간 유효하며, 최대 5회 조회 가능합니다</li>
        </ul>
      </div>

      {/* 발송 이력 */}
      <SendHistoryList businessId={businessId} yearMonth={selectedYearMonth} />
    </div>
  );
}
