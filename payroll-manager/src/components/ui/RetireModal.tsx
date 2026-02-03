'use client';

import { useState } from 'react';
import { CodeSelect } from './CodeSelect';

interface RetireModalProps {
  workerName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leaveDate: string, leaveReason: string) => void;
}

export function RetireModal({ workerName, isOpen, onClose, onConfirm }: RetireModalProps) {
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('11'); // 기본값: 개인사정 자진퇴사

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!leaveDate) {
      alert('퇴사일을 입력하세요.');
      return;
    }
    if (!leaveReason) {
      alert('퇴사사유를 선택하세요.');
      return;
    }
    onConfirm(leaveDate, leaveReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl border border-white/10 w-full max-w-md mx-4">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-1">퇴사 처리</h3>
          <p className="text-white/60 text-sm mb-6">
            <span className="text-blue-400 font-medium">{workerName}</span> 님의 퇴사 정보를 입력하세요
          </p>

          <div className="space-y-4">
            {/* 퇴사일 */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                퇴사일 *
              </label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full input-glass px-4 py-3"
              />
            </div>

            {/* 퇴사사유 */}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                퇴사사유 * (고용보험 상실신고용)
              </label>
              <CodeSelect
                type="leaveReason"
                value={leaveReason}
                onChange={setLeaveReason}
                placeholder="퇴사사유 선택"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            퇴사 처리
          </button>
        </div>
      </div>
    </div>
  );
}
