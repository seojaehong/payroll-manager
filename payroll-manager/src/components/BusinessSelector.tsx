'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function BusinessSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const businesses = useStore((state) => state.businesses);
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);
  const setSelectedBusiness = useStore((state) => state.setSelectedBusiness);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedBusiness(id);
    setIsOpen(false);
  };

  if (businesses.length === 0) {
    return (
      <div className="text-white/40 text-sm">
        등록된 사업장이 없습니다
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span className="text-white/60 text-sm">현재 사업장:</span>
        <span className="text-white font-medium">
          {selectedBusiness?.name || '선택하세요'}
        </span>
        <span className="text-white/40 text-xs ml-1">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <p className="text-xs text-white/40 px-2">사업장 선택</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => handleSelect(business.id)}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
                  business.id === selectedBusinessId ? 'bg-blue-500/20 text-blue-400' : 'text-white/80'
                }`}
              >
                <div className="font-medium">{business.name}</div>
                {business.bizNo && (
                  <div className="text-xs text-white/40 mt-0.5">{business.bizNo}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
