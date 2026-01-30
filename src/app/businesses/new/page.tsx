'use client';

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Business } from '@/types';

export default function NewBusinessPage() {
  const router = useRouter();
  const { addBusiness } = useStore();

  const [form, setForm] = useState({
    name: '',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.bizNo) {
      alert('사업장명과 사업자번호는 필수입니다.');
      return;
    }

    const newBusiness: Business = {
      id: crypto.randomUUID(),
      name: form.name,
      bizNo: form.bizNo,
      gwanriNo: form.gwanriNo || undefined,
      gyGwanriNo: form.gyGwanriNo || undefined,
      sjGwanriNo: form.sjGwanriNo || undefined,
      npsGwanriNo: form.npsGwanriNo || undefined,
      nhicGwanriNo: form.nhicGwanriNo || undefined,
      address: form.address || undefined,
      tel: form.tel || undefined,
      defaultJikjong: form.defaultJikjong || undefined,
      defaultWorkHours: form.defaultWorkHours || 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addBusiness(newBusiness);
    router.push('/businesses');
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white mb-2">사업장 추가</h1>
      <p className="text-white/40 mb-8">새로운 사업장을 등록합니다</p>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="glass p-8 space-y-8">
          {/* 기본 정보 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  사업장명 *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="쿠우쿠우 부평점"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  사업자등록번호 *
                </label>
                <input
                  type="text"
                  value={form.bizNo}
                  onChange={(e) => setForm({ ...form, bizNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="123-45-67890"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-white/60 mb-2">주소</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="인천 부평구 부흥로 264"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">전화번호</label>
                <input
                  type="text"
                  value={form.tel}
                  onChange={(e) => setForm({ ...form, tel: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="032-123-4567"
                />
              </div>
            </div>
          </div>

          {/* 관리번호 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">4대보험 관리번호</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">통합 관리번호</label>
                <input
                  type="text"
                  value={form.gwanriNo}
                  onChange={(e) => setForm({ ...form, gwanriNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="79516010160"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">고용보험</label>
                <input
                  type="text"
                  value={form.gyGwanriNo}
                  onChange={(e) => setForm({ ...form, gyGwanriNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">산재보험</label>
                <input
                  type="text"
                  value={form.sjGwanriNo}
                  onChange={(e) => setForm({ ...form, sjGwanriNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">국민연금</label>
                <input
                  type="text"
                  value={form.npsGwanriNo}
                  onChange={(e) => setForm({ ...form, npsGwanriNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">건강보험</label>
                <input
                  type="text"
                  value={form.nhicGwanriNo}
                  onChange={(e) => setForm({ ...form, nhicGwanriNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
            </div>
          </div>

          {/* 기본 설정 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">기본 설정</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">기본 직종코드</label>
                <select
                  value={form.defaultJikjong}
                  onChange={(e) => setForm({ ...form, defaultJikjong: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                >
                  <option value="532">532 - 식당 서비스원</option>
                  <option value="531">531 - 주방장 및 조리사</option>
                  <option value="941">941 - 건물 청소원</option>
                  <option value="312">312 - 경리 사무원</option>
                  <option value="999">999 - 기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">기본 주소정근로시간</label>
                <input
                  type="number"
                  value={form.defaultWorkHours}
                  onChange={(e) => setForm({ ...form, defaultWorkHours: parseInt(e.target.value) || 40 })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 mt-6">
          <button type="submit" className="btn-primary">
            저장
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
