'use client';

import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Worker, Employment } from '@/types';
import { CodeSelect } from '@/components/ui/CodeSelect';
import { useToast } from '@/components/ui/Toast';
import { getDefaultMonthlyWage, DEFAULTS } from '@/lib/constants';

export default function NewWorkerPage() {
  const router = useRouter();
  const toast = useToast();
  const addWorker = useStore((state) => state.addWorker);
  const addEmployment = useStore((state) => state.addEmployment);
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);
  const businesses = useStore((state) => state.businesses);

  // 선택된 사업장 정보
  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  const [form, setForm] = useState({
    name: '',
    residentNo: '',
    phone: '',
    nationality: DEFAULTS.NATIONALITY as string,
    joinDate: new Date().toISOString().slice(0, 10),
    monthlyWage: getDefaultMonthlyWage(),
    jikjongCode: DEFAULTS.JIKJONG_CODE as string,
    workHours: 40,
    isContract: false,
    contractEndDate: '',
    gyYn: true,
    sjYn: true,
    npsYn: true,
    nhicYn: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBusinessId) {
      toast.show('사업장을 선택해주세요.', 'error');
      return;
    }

    if (!form.name || !form.residentNo) {
      toast.show('이름, 주민등록번호는 필수입니다.', 'error');
      return;
    }

    const cleanResidentNo = form.residentNo.replace(/-/g, '');
    if (cleanResidentNo.length !== 13) {
      toast.show('주민등록번호는 13자리입니다.', 'error');
      return;
    }

    const workerId = crypto.randomUUID();
    const employmentId = crypto.randomUUID();

    const newWorker: Worker = {
      id: workerId,
      name: form.name,
      residentNo: cleanResidentNo,
      nationality: form.nationality,
      phone: form.phone || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newEmployment: Employment = {
      id: employmentId,
      workerId,
      businessId: selectedBusinessId,
      status: 'ACTIVE',
      joinDate: form.joinDate,
      monthlyWage: form.monthlyWage,
      jikjongCode: form.jikjongCode,
      workHours: form.workHours,
      isContract: form.isContract,
      contractEndDate: form.isContract ? form.contractEndDate : undefined,
      gyYn: form.gyYn,
      sjYn: form.sjYn,
      npsYn: form.npsYn,
      nhicYn: form.nhicYn,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addWorker(newWorker);
    addEmployment(newEmployment);
    router.push('/workers');
  };

  return (
    <div>
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <Link href="/workers" className="hover:text-white transition-colors">
          근로자 관리
        </Link>
        <span>›</span>
        <span className="text-white">새 근로자</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">근로자 추가</h1>
          <p className="text-white/40 mt-1">새로운 근로자를 등록합니다</p>
        </div>
        <Link href="/workers" className="btn-secondary">
          ← 목록으로
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="glass p-8 space-y-8">
          {/* 기본 정보 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">주민등록번호 *</label>
                <input
                  type="text"
                  value={form.residentNo}
                  onChange={(e) => setForm({ ...form, residentNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="950526-2401425"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">연락처</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">국적</label>
                <select
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                >
                  <option value="100">한국</option>
                  <option value="200">중국</option>
                  <option value="300">베트남</option>
                  <option value="999">기타</option>
                </select>
              </div>
            </div>
          </div>

          {/* 고용 정보 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">고용 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">사업장</label>
                <div className="w-full input-glass px-4 py-3 bg-white/5 text-white">
                  {selectedBusiness?.name || '사업장을 먼저 선택하세요'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">입사일 *</label>
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">월평균보수</label>
                <input
                  type="number"
                  value={form.monthlyWage}
                  onChange={(e) => setForm({ ...form, monthlyWage: parseInt(e.target.value) || 0 })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">직종코드</label>
                <CodeSelect
                  type="jikjong"
                  value={form.jikjongCode}
                  onChange={(code) => setForm({ ...form, jikjongCode: code })}
                  className="[&_button]:input-glass [&_button]:px-4 [&_button]:py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">주소정근로시간</label>
                <input
                  type="number"
                  value={form.workHours}
                  onChange={(e) => setForm({ ...form, workHours: parseInt(e.target.value) || 40 })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isContract}
                    onChange={(e) => setForm({ ...form, isContract: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-white/80">계약직</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4대보험 */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">4대보험 가입</h2>
            <div className="flex gap-8">
              {[
                { key: 'gyYn', label: '고용보험' },
                { key: 'sjYn', label: '산재보험' },
                { key: 'npsYn', label: '국민연금' },
                { key: 'nhicYn', label: '건강보험' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-white/80">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button type="submit" className="btn-primary">저장</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">취소</button>
        </div>
      </form>
    </div>
  );
}
