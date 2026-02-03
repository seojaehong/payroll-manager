'use client';

import { useStore } from '@/store/useStore';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CodeSelect } from '@/components/ui/CodeSelect';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export default function EditWorkerPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const workerId = params.id as string;

  const workers = useStore((state) => state.workers);
  const employments = useStore((state) => state.employments);
  const updateWorker = useStore((state) => state.updateWorker);
  const updateEmployment = useStore((state) => state.updateEmployment);
  const selectedBusinessId = useStore((state) => state.selectedBusinessId);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    residentNo: '',
    phone: '',
    email: '',
    nationality: '100',
    joinDate: '',
    leaveDate: '',
    monthlyWage: 0,
    jikjongCode: '532',
    workHours: 40,
    isContract: false,
    contractEndDate: '',
    gyYn: true,
    sjYn: true,
    npsYn: true,
    nhicYn: true,
  });

  // 근로자 및 고용 정보 로드
  const worker = workers.find((w) => w.id === workerId);
  const employment = employments.find(
    (e) => e.workerId === workerId && e.businessId === selectedBusinessId
  );

  useEffect(() => {
    if (worker && employment) {
      setForm({
        name: worker.name,
        residentNo: worker.residentNo,
        phone: worker.phone || '',
        email: worker.email || '',
        nationality: worker.nationality || '100',
        joinDate: employment.joinDate || '',
        leaveDate: employment.leaveDate || '',
        monthlyWage: employment.monthlyWage || 0,
        jikjongCode: employment.jikjongCode || '532',
        workHours: employment.workHours || 40,
        isContract: employment.isContract || false,
        contractEndDate: employment.contractEndDate || '',
        gyYn: employment.gyYn ?? true,
        sjYn: employment.sjYn ?? true,
        npsYn: employment.npsYn ?? true,
        nhicYn: employment.nhicYn ?? true,
      });
      setLoading(false);
    } else if (workers.length > 0) {
      // 데이터 로드됐는데 근로자를 찾을 수 없음
      setLoading(false);
    }
  }, [worker, employment, workers.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!worker || !employment) {
      toast.show('근로자 정보를 찾을 수 없습니다.', 'error');
      return;
    }

    if (!form.name || !form.residentNo) {
      toast.show('이름, 주민등록번호는 필수입니다.', 'error');
      return;
    }

    // 근로자 정보 업데이트
    updateWorker(workerId, {
      name: form.name,
      residentNo: form.residentNo.replace(/-/g, ''),
      phone: form.phone || undefined,
      email: form.email || undefined,
      nationality: form.nationality,
      updatedAt: new Date(),
    });

    // 고용 정보 업데이트
    updateEmployment(employment.id, {
      joinDate: form.joinDate,
      leaveDate: form.leaveDate || undefined,
      monthlyWage: form.monthlyWage,
      jikjongCode: form.jikjongCode,
      workHours: form.workHours,
      isContract: form.isContract,
      contractEndDate: form.isContract ? form.contractEndDate : undefined,
      gyYn: form.gyYn,
      sjYn: form.sjYn,
      npsYn: form.npsYn,
      nhicYn: form.nhicYn,
      updatedAt: new Date(),
    });

    toast.show('저장되었습니다.', 'success');
    router.push('/workers');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/40">로딩 중...</p>
      </div>
    );
  }

  if (!worker || !employment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-6xl mb-6">😕</div>
        <h2 className="text-2xl font-semibold text-white mb-2">근로자를 찾을 수 없습니다</h2>
        <p className="text-white/40 mb-6">해당 근로자가 현재 사업장에 존재하지 않습니다.</p>
        <div className="flex gap-4">
          <button onClick={() => router.back()} className="btn-secondary">
            ← 이전 페이지
          </button>
          <Link href="/workers" className="btn-primary">
            근로자 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <Link href="/workers" className="hover:text-white transition-colors">
          근로자 관리
        </Link>
        <span>›</span>
        <span className="text-white">{worker.name}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">근로자 수정</h1>
          <p className="text-white/40 mt-1">{worker.name}님의 정보를 수정합니다</p>
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">주민등록번호 *</label>
                <input
                  type="text"
                  value={form.residentNo}
                  onChange={(e) => setForm({ ...form, residentNo: e.target.value })}
                  className="w-full input-glass px-4 py-3"
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
                <label className="block text-sm font-medium text-white/60 mb-2">이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                  placeholder="example@email.com"
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
                <label className="block text-sm font-medium text-white/60 mb-2">입사일</label>
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                  className="w-full input-glass px-4 py-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">퇴사일</label>
                <input
                  type="date"
                  value={form.leaveDate}
                  onChange={(e) => setForm({ ...form, leaveDate: e.target.value })}
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
