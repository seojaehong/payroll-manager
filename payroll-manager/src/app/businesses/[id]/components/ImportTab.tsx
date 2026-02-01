'use client';

import Link from 'next/link';
import { Worker, Employment } from '@/types';

interface ImportTabProps {
  businessId: string;
  business: any;
  workers: Worker[];
  excelMappings: any[];
  addWorker: (worker: Worker) => void;
  addEmployment: (employment: Employment) => void;
}

export function ImportTab({
  businessId,
  business,
  workers,
  excelMappings,
  addWorker,
  addEmployment,
}: ImportTabProps) {
  return (
    <div>
      <div className="text-center py-8">
        <p className="text-white/60 mb-4">
          <span className="text-2xl mr-2">📥</span>
          {business.name}에 근로자를 등록합니다
        </p>
        <Link href="/import" className="btn-primary">
          엑셀 Import 페이지로 →
        </Link>
      </div>
      <div className="glass p-4 mt-4">
        <h4 className="text-white font-medium mb-2">현재 매핑 설정</h4>
        {(() => {
          const mapping = excelMappings.find((m) => m.businessId === businessId);
          if (!mapping) return <p className="text-white/40 text-sm">매핑 설정 없음</p>;
          return (
            <div className="text-white/60 text-sm">
              <p>시트: {mapping.sheetName}</p>
              <p>데이터 시작: {mapping.dataStartRow}행</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
