'use client';

import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function BusinessesPage() {
  const { businesses, employments, deleteBusiness } = useStore();
  const [search, setSearch] = useState('');

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bizNo.includes(search)
  );

  const getActiveWorkerCount = (businessId: string) => {
    return employments.filter(
      (e) => e.businessId === businessId && e.status === 'ACTIVE'
    ).length;
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`"${name}" 사업장을 삭제하시겠습니까?`)) {
      deleteBusiness(id);
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: '사업장 관리' }]}
        title="사업장 관리"
        description="등록된 사업장을 관리합니다"
      />
      <div className="flex justify-end mb-6">
        <Link href="/businesses/new" className="btn-primary">
          + 사업장 추가
        </Link>
      </div>

      {/* 검색 */}
      <div className="glass p-4 mb-6">
        <input
          type="text"
          placeholder="사업장명 또는 사업자번호로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full input-glass px-4 py-3"
        />
      </div>

      {/* 사업장 목록 */}
      <div className="glass overflow-hidden">
        {filteredBusinesses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/40 text-lg">
              {businesses.length === 0 ? (
                <>
                  등록된 사업장이 없습니다
                  <br />
                  <Link href="/businesses/new" className="text-blue-400 hover:underline mt-2 inline-block">
                    첫 사업장을 추가해보세요!
                  </Link>
                </>
              ) : (
                '검색 결과가 없습니다'
              )}
            </p>
          </div>
        ) : (
          <table className="w-full table-glass">
            <thead>
              <tr className="text-left">
                <th className="px-6 py-4">사업장명</th>
                <th className="px-6 py-4">사업자번호</th>
                <th className="px-6 py-4">관리번호</th>
                <th className="px-6 py-4">재직자</th>
                <th className="px-6 py-4">기본직종</th>
                <th className="px-6 py-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.map((business) => (
                <tr key={business.id}>
                  <td className="px-6 py-4 text-white font-medium">{business.name}</td>
                  <td className="px-6 py-4 text-white/60">{business.bizNo}</td>
                  <td className="px-6 py-4 text-white/60 font-mono text-sm">
                    {business.gwanriNo || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge badge-success">
                      {getActiveWorkerCount(business.id)}명
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">
                    {business.defaultJikjong || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/businesses/${business.id}`}
                        className="px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => handleDelete(business.id, business.name)}
                        className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 통계 */}
      <div className="mt-6 text-sm text-white/40">
        총 {businesses.length}개 사업장 | 전체 재직자{' '}
        {employments.filter((e) => e.status === 'ACTIVE').length}명
      </div>
    </div>
  );
}
