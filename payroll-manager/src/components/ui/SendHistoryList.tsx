'use client';

import { useState, useEffect } from 'react';
import type { SendHistory, SendChannel } from '@/types';

interface SendHistoryListProps {
  businessId: string;
  yearMonth?: string;
}

// 채널 아이콘
const channelIcons: Record<SendChannel, string> = {
  email: '📧',
  sms: '📱',
  kakao: '💬',
};

// 채널 이름
const channelNames: Record<SendChannel, string> = {
  email: '이메일',
  sms: '문자',
  kakao: '카카오톡',
};

// 상태 뱃지
const statusBadge: Record<SendHistory['status'], { text: string; class: string }> = {
  pending: { text: '대기', class: 'bg-yellow-500/20 text-yellow-400' },
  sent: { text: '발송', class: 'bg-blue-500/20 text-blue-400' },
  delivered: { text: '수신', class: 'bg-green-500/20 text-green-400' },
  failed: { text: '실패', class: 'bg-red-500/20 text-red-400' },
};

export function SendHistoryList({ businessId, yearMonth }: SendHistoryListProps) {
  const [history, setHistory] = useState<SendHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 발송 이력 로드
  useEffect(() => {
    if (!isExpanded) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        // API route를 통해 발송 이력 조회
        const params = new URLSearchParams({ businessId });
        if (yearMonth) params.append('yearMonth', yearMonth);

        const response = await fetch(`/api/send-history?${params}`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('발송 이력 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [businessId, yearMonth, isExpanded]);

  // 수신자 마스킹
  const maskRecipient = (recipient: string) => {
    if (recipient.includes('@')) {
      const [local, domain] = recipient.split('@');
      return `${local.slice(0, 3)}***@${domain}`;
    }
    // 전화번호
    return recipient.slice(0, 7) + '****';
  };

  // 시간 포맷
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString('ko-KR');
  };

  return (
    <div className="mt-6">
      {/* 접기/펼치기 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-3"
      >
        <span className="transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        <span>발송 이력</span>
        {history.length > 0 && (
          <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{history.length}</span>
        )}
      </button>

      {isExpanded && (
        <div className="bg-white/5 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 text-center text-white/40">
              로딩 중...
            </div>
          ) : history.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">
              발송 이력이 없습니다
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="px-4 py-2">채널</th>
                  <th className="px-4 py-2">월</th>
                  <th className="px-4 py-2">수신자</th>
                  <th className="px-4 py-2">상태</th>
                  <th className="px-4 py-2">발송일</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="px-4 py-2">
                      <span title={channelNames[item.channel]}>
                        {channelIcons[item.channel]} {channelNames[item.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white/60">
                      {item.yearMonth.replace('-', '년 ')}월
                    </td>
                    <td className="px-4 py-2 text-white/60 font-mono text-xs">
                      {maskRecipient(item.recipient)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[item.status].class}`}>
                        {statusBadge[item.status].text}
                      </span>
                      {item.errorMessage && (
                        <span className="ml-2 text-red-400 text-xs" title={item.errorMessage}>
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-white/40">
                      {formatTime(item.sentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {history.length > 20 && (
            <div className="p-2 text-center text-white/40 text-xs border-t border-white/10">
              최근 20건만 표시됩니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
