'use client';

import { useState, useRef, useEffect } from 'react';

interface MonthPickerProps {
  value: string; // "YYYY-MM" format
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function MonthPicker({ value, onChange, className = '' }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const year = value ? parseInt(value.slice(0, 4)) : new Date().getFullYear();
    return year;
  });
  const ref = useRef<HTMLDivElement>(null);

  // 현재 선택된 년/월
  const selectedYear = value ? parseInt(value.slice(0, 4)) : null;
  const selectedMonth = value ? parseInt(value.slice(5, 7)) : null;

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthClick = (month: number) => {
    const monthStr = month.toString().padStart(2, '0');
    onChange(`${viewYear}-${monthStr}`);
    setIsOpen(false);
  };

  const handlePrevYear = () => setViewYear((y) => y - 1);
  const handleNextYear = () => setViewYear((y) => y + 1);

  // 이전달/다음달 퀵 버튼
  const handlePrevMonth = () => {
    if (!value) return;
    const date = new Date(selectedYear!, selectedMonth! - 1, 1);
    date.setMonth(date.getMonth() - 1);
    const newValue = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    onChange(newValue);
  };

  const handleNextMonth = () => {
    if (!value) return;
    const date = new Date(selectedYear!, selectedMonth! - 1, 1);
    date.setMonth(date.getMonth() + 1);
    const newValue = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    onChange(newValue);
  };

  // 표시용 텍스트
  const displayText = value
    ? `${selectedYear}년 ${selectedMonth}월`
    : '월 선택';

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* 메인 버튼 영역 */}
      <div className="flex items-center gap-1">
        {/* 이전달 */}
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={!value}
          className="px-3 py-3 input-glass hover:bg-white/10 transition-colors disabled:opacity-30"
          title="이전 달"
        >
          ‹
        </button>

        {/* 현재 선택된 월 (클릭하면 피커 열림) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 input-glass px-4 py-3 text-left flex items-center justify-between min-w-[140px]"
        >
          <span className={value ? 'text-white' : 'text-white/40'}>{displayText}</span>
          <span className="text-white/40 ml-2">{isOpen ? '▲' : '▼'}</span>
        </button>

        {/* 다음달 */}
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={!value}
          className="px-3 py-3 input-glass hover:bg-white/10 transition-colors disabled:opacity-30"
          title="다음 달"
        >
          ›
        </button>
      </div>

      {/* 드롭다운 피커 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass p-4 z-50 animate-fade-in">
          {/* 년도 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevYear}
              className="px-3 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              ‹‹
            </button>
            <span className="text-white font-semibold text-lg">{viewYear}년</span>
            <button
              type="button"
              onClick={handleNextYear}
              className="px-3 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              ››
            </button>
          </div>

          {/* 월 그리드 (4x3) */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((label, index) => {
              const month = index + 1;
              const isSelected = selectedYear === viewYear && selectedMonth === month;
              const isCurrentMonth =
                new Date().getFullYear() === viewYear && new Date().getMonth() + 1 === month;

              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthClick(month)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-lg'
                      : isCurrentMonth
                      ? 'bg-white/10 text-blue-400 ring-1 ring-blue-400/50'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 오늘 버튼 */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const newValue = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                setViewYear(now.getFullYear());
                onChange(newValue);
                setIsOpen(false);
              }}
              className="w-full py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              이번 달로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
