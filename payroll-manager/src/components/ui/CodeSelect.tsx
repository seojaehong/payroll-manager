'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { JikjongCode, LeaveReasonCode } from '@/types';
import {
  JIKJONG_CODES,
  LEAVE_REASON_CODES,
  getSortedJikjongCodes,
  getJikjongByCode,
  getLeaveReasonByCode,
} from '@/lib/codes';

interface CodeSelectProps<T extends JikjongCode | LeaveReasonCode> {
  type: 'jikjong' | 'leaveReason';
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CodeSelect<T extends JikjongCode | LeaveReasonCode>({
  type,
  value,
  onChange,
  disabled = false,
  placeholder,
  className = '',
}: CodeSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 코드 목록
  const codes = useMemo(() => {
    if (type === 'jikjong') {
      return getSortedJikjongCodes();
    }
    return LEAVE_REASON_CODES;
  }, [type]);

  // 검색 필터링
  const filteredCodes = useMemo(() => {
    if (!search) return codes;
    const lower = search.toLowerCase();
    return codes.filter(
      (c) =>
        c.code.includes(search) ||
        c.name.toLowerCase().includes(lower)
    );
  }, [codes, search]);

  // 선택된 코드 표시
  const selectedCode = useMemo(() => {
    if (!value) return null;
    if (type === 'jikjong') {
      return getJikjongByCode(value);
    }
    return getLeaveReasonByCode(value);
  }, [type, value]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 선택
  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  // 플레이스홀더
  const defaultPlaceholder = type === 'jikjong' ? '직종 선택' : '퇴사사유 선택';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 선택된 값 표시 / 트리거 */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left text-sm rounded-md border
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-400 cursor-pointer'}
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}
        `}
      >
        {selectedCode ? (
          <span>
            <span className="font-mono text-gray-500 mr-2">{selectedCode.code}</span>
            {selectedCode.name}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder || defaultPlaceholder}</span>
        )}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          {/* 검색창 */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="코드 또는 이름 검색..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 옵션 목록 */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCodes.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredCodes.map((code) => {
                const isSelected = code.code === value;
                const isLeaveReason = 'description' in code;
                return (
                  <button
                    key={code.code}
                    type="button"
                    onClick={() => handleSelect(code.code)}
                    className={`
                      w-full px-4 py-2 text-left text-sm hover:bg-blue-50
                      ${isSelected ? 'bg-blue-100 text-blue-700' : ''}
                    `}
                  >
                    <span className="font-mono text-gray-500 mr-2">{code.code}</span>
                    {code.name}
                    {isLeaveReason && (code as LeaveReasonCode).description && (
                      <span className="block text-xs text-gray-400 ml-10">
                        {(code as LeaveReasonCode).description}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* 선택 해제 */}
          {value && (
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleSelect('')}
                className="w-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                선택 해제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 간단한 직종 표시 컴포넌트
export function JikjongDisplay({ code }: { code: string }) {
  const jikjong = getJikjongByCode(code);
  if (!jikjong) return <span className="text-gray-400">{code || '-'}</span>;
  return (
    <span title={`${jikjong.code} - ${jikjong.name}`}>
      {jikjong.name}
    </span>
  );
}

// 간단한 퇴사사유 표시 컴포넌트
export function LeaveReasonDisplay({ code }: { code: string }) {
  const reason = getLeaveReasonByCode(code);
  if (!reason) return <span className="text-gray-400">{code || '-'}</span>;
  return (
    <span title={reason.description || reason.name}>
      {reason.name}
    </span>
  );
}
