'use client';

/**
 * 급여명세서 발송 탭 컴포넌트
 * - 명세서 미리보기
 * - PDF 다운로드
 * - 이메일/SMS/카카오 발송
 */

import { useState, useMemo } from 'react';
import { downloadPayslipPDF } from '@/lib/payslip-pdf';
import { SendHistoryList } from '@/components/ui/SendHistoryList';
import { useToast } from '@/components/ui/Toast';
import type { PayslipData, SendChannel, MonthlyWage, Worker, Employment, Business } from '@/types';
import { formatNumber } from '@/lib/format';

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
  const toast = useToast();

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

  // 미리보기 상태
  const [previewData, setPreviewData] = useState<PayslipData | null>(null);

  // 급여 인덱스 (O(1) 조회)
  const wageByKey = useMemo(() => {
    const idx = new Map<string, MonthlyWage>();
    for (const mw of monthlyWages) {
      idx.set(`${mw.employmentId}-${mw.yearMonth}`, mw);
    }
    return idx;
  }, [monthlyWages]);

  // 해당 월의 급여 데이터가 있는 근로자 목록
  const workersWithWages = useMemo(() => {
    return businessEmployments
      .filter(({ employment }) => {
        const yearMonth = selectedYearMonth;
        const joinYM = employment.joinDate?.slice(0, 7) || '';
        const leaveYM = employment.leaveDate?.slice(0, 7) || '9999-12';
        return joinYM <= yearMonth && yearMonth <= leaveYM;
      })
      .map(({ employment, worker }) => {
        const wage = wageByKey.get(`${employment.id}-${selectedYearMonth}`);
        return { employment, worker, wage };
      })
      .filter(({ wage }) => wage);
  }, [businessEmployments, wageByKey, selectedYearMonth]);

  // 급여명세서 데이터 생성
  const createPayslipData = (worker: Worker, wage: MonthlyWage): PayslipData => {
    const totalDeduction =
      (wage.nps || 0) +
      (wage.nhic || 0) +
      (wage.ltc || 0) +
      (wage.ei || 0) +
      (wage.incomeTax || 0) +
      (wage.localTax || 0) +
      (wage.otherDeduction || 0);

    const overtimeTotal = (wage.overtimeWage || 0) + (wage.overtimeWeekday || 0) + (wage.overtimeWeekend || 0);
    const otherWageTotal = (wage.mealAllowance || 0) + (wage.carAllowance || 0) + (wage.annualLeaveWage || 0) + (wage.otherWage || 0);

    return {
      businessName: business.name,
      businessBizNo: business.bizNo,
      workerName: worker.name,
      yearMonth: wage.yearMonth,
      basicWage: wage.basicWage ?? wage.totalWage,
      overtimeWage: overtimeTotal || undefined,
      nightWage: wage.nightWage || undefined,
      holidayWage: wage.holidayWage || undefined,
      bonusWage: wage.bonusWage || undefined,
      otherWage: otherWageTotal || undefined,
      totalWage: wage.totalWage,
      nps: wage.nps || 0,
      nhic: wage.nhic || 0,
      ltc: wage.ltc || 0,
      ei: wage.ei || 0,
      incomeTax: wage.incomeTax || 0,
      localTax: wage.localTax || 0,
      otherDeduction: wage.otherDeduction,
      totalDeduction,
      netWage: wage.netWage || wage.totalWage - totalDeduction,
      workDays: wage.workDays,
      generatedAt: new Date(),
    };
  };

  // 미리보기 열기
  const handlePreview = (worker: Worker, wage: MonthlyWage) => {
    const data = createPayslipData(worker, wage);
    setPreviewData(data);
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
  const handleSendToWorker = async (worker: Worker, employment: Employment, wage: MonthlyWage) => {
    if (selectedChannels.size === 0) {
      toast.show('발송 채널을 선택해주세요.', 'error');
      return;
    }

    const channels = Array.from(selectedChannels);
    if (channels.includes('email') && !worker.email) {
      toast.show(`${worker.name}의 이메일 정보가 없습니다.`, 'error');
      return;
    }
    if ((channels.includes('sms') || channels.includes('kakao')) && !worker.phone) {
      toast.show(`${worker.name}의 전화번호 정보가 없습니다.`, 'error');
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
          recipient: { email: worker.email, phone: worker.phone },
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
          [worker.id]: { status: 'error', message: result.error || '발송 실패', channels },
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
      toast.show('발송할 근로자를 선택해주세요.', 'error');
      return;
    }
    if (selectedChannels.size === 0) {
      toast.show('발송 채널을 선택해주세요.', 'error');
      return;
    }

    const confirm = window.confirm(`${selectedWorkers.size}명에게 급여명세서를 발송하시겠습니까?`);
    if (!confirm) return;

    setIsBulkSending(true);

    for (const item of workersWithWages) {
      if (selectedWorkers.has(item.worker.id) && item.wage) {
        await handleSendToWorker(item.worker, item.employment, item.wage);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsBulkSending(false);
    toast.show('일괄 발송이 완료되었습니다.', 'success');
  };

  // 연월 옵션
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
        <div>
          <h2 className="text-xl font-semibold text-white">급여명세서</h2>
          <p className="text-white/40 text-sm mt-1">
            {workersWithWages.length}명의 급여 데이터
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const [y, m] = selectedYearMonth.split('-').map(Number);
              const prev = new Date(y, m - 2, 1);
              setSelectedYearMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            ←
          </button>
          <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
            <select
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-transparent text-white font-semibold text-lg focus:outline-none cursor-pointer"
            >
              {yearMonthOptions.map((ym) => {
                const [y, m] = ym.split('-');
                return (
                  <option key={ym} value={ym} className="bg-slate-800">
                    {y}년 {parseInt(m)}월
                  </option>
                );
              })}
            </select>
          </div>
          <button
            onClick={() => {
              const [y, m] = selectedYearMonth.split('-').map(Number);
              const next = new Date(y, m, 1);
              const nextYm = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
              if (yearMonthOptions.includes(nextYm)) {
                setSelectedYearMonth(nextYm);
              }
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            →
          </button>
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
            <span className="text-white/80">📱 문자</span>
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
              <input type="checkbox" checked={attachPdf} onChange={(e) => setAttachPdf(e.target.checked)} className="rounded" />
              <span className="text-white/60">PDF 첨부</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeLink} onChange={(e) => setIncludeLink(e.target.checked)} className="rounded" />
              <span className="text-white/60">웹 링크 포함</span>
            </label>
          </div>
        )}
      </div>

      {/* 근로자 목록 */}
      {workersWithWages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40">{selectedYearMonth.replace('-', '년 ')}월 급여 데이터가 없습니다.</p>
          <p className="text-white/30 text-sm mt-2">&apos;급여 이력&apos; 탭에서 급여 데이터를 먼저 업로드해주세요.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedWorkers.size === workersWithWages.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="text-white/60 text-sm">전체 선택 ({selectedWorkers.size}/{workersWithWages.length})</span>
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

          <div className="space-y-2">
            {workersWithWages.map(({ worker, employment, wage }) => {
              const state = sendStates[worker.id];
              const totalDeduction = wage
                ? (wage.nps || 0) + (wage.nhic || 0) + (wage.ltc || 0) + (wage.ei || 0) + (wage.incomeTax || 0) + (wage.localTax || 0)
                : 0;
              const netWage = wage?.netWage || (wage ? wage.totalWage - totalDeduction : 0);
              const hasContact = worker.email || worker.phone;

              return (
                <div
                  key={worker.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    selectedWorkers.has(worker.id)
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : 'bg-white/5 border border-transparent hover:bg-white/8'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkers.has(worker.id)}
                    onChange={() => toggleSelectWorker(worker.id)}
                    className="w-5 h-5 rounded-md bg-white/10 border-white/20 text-blue-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{worker.name}</span>
                      {!hasContact && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">연락처 없음</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {worker.email && <span className="text-white/50">✉ {worker.email}</span>}
                      {worker.phone && <span className="text-white/50">☎ {worker.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-white/40 text-xs">지급</p>
                      <p className="text-white font-medium">{wage?.totalWage.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">공제</p>
                      <p className="text-red-400/80">-{totalDeduction.toLocaleString()}</p>
                    </div>
                    <div className="pl-4 border-l border-white/10">
                      <p className="text-white/40 text-xs">실수령</p>
                      <p className="text-green-400 font-bold text-lg">{netWage.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="w-24 text-center">
                    {state?.status === 'sending' && <span className="text-yellow-400 text-sm">발송중...</span>}
                    {state?.status === 'success' && <span className="text-green-400 text-sm">✓ 완료</span>}
                    {state?.status === 'error' && <span className="text-red-400 text-sm" title={state.message}>✕ 실패</span>}
                    {!state && <span className="text-white/20 text-sm">대기</span>}
                  </div>

                  {/* 작업 버튼 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => wage && handlePreview(worker, wage)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                      title="명세서 보기"
                    >
                      👁
                    </button>
                    <button
                      onClick={() => wage && handleDownloadPdf(worker, wage)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                      title="PDF 다운로드"
                    >
                      📥
                    </button>
                    <button
                      onClick={() => wage && handleSendToWorker(worker, employment, wage)}
                      disabled={state?.status === 'sending' || !hasContact}
                      className={`p-2.5 rounded-lg transition-all ${
                        state?.status === 'sending' || !hasContact
                          ? 'bg-white/5 text-white/20 cursor-not-allowed'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                      }`}
                      title={hasContact ? '발송' : '연락처 없음'}
                    >
                      📤
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 안내 */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-blue-400 font-medium mb-2">📋 안내</h4>
        <ul className="text-white/60 text-sm space-y-1">
          <li>• 👁 명세서 보기: 발송 전 미리보기</li>
          <li>• 📥 PDF 다운로드: 로컬에 PDF 저장</li>
          <li>• 📤 발송: 이메일/SMS/카카오톡 전송</li>
        </ul>
      </div>

      <SendHistoryList businessId={businessId} yearMonth={selectedYearMonth} />

      {/* 명세서 미리보기 모달 */}
      {previewData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            {/* 명세서 내용 */}
            <div className="p-8">
              {/* 헤더 */}
              <div className="text-center mb-6 pb-4 border-b-4 border-blue-600">
                <h1 className="text-3xl font-bold text-blue-600">급여명세서</h1>
                <p className="text-gray-600 mt-2">{previewData.yearMonth.replace('-', '년 ')}월</p>
              </div>

              {/* 기본 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">사업장</span>
                    <p className="font-semibold text-gray-900">{previewData.businessName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">사업자번호</span>
                    <p className="text-gray-700">{previewData.businessBizNo}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">성명</span>
                    <p className="font-bold text-xl text-gray-900">{previewData.workerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">귀속연월</span>
                    <p className="text-gray-700">{previewData.yearMonth}</p>
                  </div>
                </div>
              </div>

              {/* 지급/공제 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* 지급 내역 */}
                <div>
                  <h3 className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-2 mb-3">지급 내역</h3>
                  <div className="space-y-2">
                    {previewData.basicWage != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">기본급</span>
                        <span className="font-medium">{formatNumber(previewData.basicWage)}원</span>
                      </div>
                    )}
                    {previewData.overtimeWage != null && previewData.overtimeWage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">연장근로수당</span>
                        <span className="font-medium">{formatNumber(previewData.overtimeWage)}원</span>
                      </div>
                    )}
                    {previewData.nightWage != null && previewData.nightWage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">야간근로수당</span>
                        <span className="font-medium">{formatNumber(previewData.nightWage)}원</span>
                      </div>
                    )}
                    {previewData.holidayWage != null && previewData.holidayWage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">휴일근로수당</span>
                        <span className="font-medium">{formatNumber(previewData.holidayWage)}원</span>
                      </div>
                    )}
                    {previewData.bonusWage != null && previewData.bonusWage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">상여금</span>
                        <span className="font-medium">{formatNumber(previewData.bonusWage)}원</span>
                      </div>
                    )}
                    {previewData.otherWage != null && previewData.otherWage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">기타수당</span>
                        <span className="font-medium">{formatNumber(previewData.otherWage)}원</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t bg-blue-50 p-2 rounded -mx-2">
                      <span className="font-bold text-blue-700">지급 합계</span>
                      <span className="font-bold text-blue-700">{formatNumber(previewData.totalWage)}원</span>
                    </div>
                  </div>
                </div>

                {/* 공제 내역 */}
                <div>
                  <h3 className="font-semibold text-red-600 border-b-2 border-red-600 pb-2 mb-3">공제 내역</h3>
                  <div className="space-y-2">
                    {previewData.nps > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">국민연금</span>
                        <span className="font-medium">{formatNumber(previewData.nps)}원</span>
                      </div>
                    )}
                    {previewData.nhic > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">건강보험</span>
                        <span className="font-medium">{formatNumber(previewData.nhic)}원</span>
                      </div>
                    )}
                    {previewData.ltc > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">장기요양보험</span>
                        <span className="font-medium">{formatNumber(previewData.ltc)}원</span>
                      </div>
                    )}
                    {previewData.ei > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">고용보험</span>
                        <span className="font-medium">{formatNumber(previewData.ei)}원</span>
                      </div>
                    )}
                    {previewData.incomeTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">소득세</span>
                        <span className="font-medium">{formatNumber(previewData.incomeTax)}원</span>
                      </div>
                    )}
                    {previewData.localTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">지방소득세</span>
                        <span className="font-medium">{formatNumber(previewData.localTax)}원</span>
                      </div>
                    )}
                    {previewData.otherDeduction != null && previewData.otherDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">기타공제</span>
                        <span className="font-medium">{formatNumber(previewData.otherDeduction)}원</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t bg-red-50 p-2 rounded -mx-2">
                      <span className="font-bold text-red-700">공제 합계</span>
                      <span className="font-bold text-red-700">{formatNumber(previewData.totalDeduction)}원</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 실수령액 */}
              <div className="bg-blue-600 text-white p-6 rounded-xl flex justify-between items-center">
                <span className="text-xl font-semibold">실수령액</span>
                <span className="text-3xl font-bold">{formatNumber(previewData.netWage)}원</span>
              </div>

              {/* 근무정보 */}
              {previewData.workDays && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  근무일수: <strong>{previewData.workDays}일</strong>
                </div>
              )}
            </div>

            {/* 모달 버튼 */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => downloadPayslipPDF(previewData, `급여명세서_${previewData.workerName}_${previewData.yearMonth}`)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                📥 PDF 다운로드
              </button>
              <button
                onClick={() => setPreviewData(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
