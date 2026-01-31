import { Business, Worker, Employment, MonthlyWage } from '@/types';

// 쿠우쿠우 부평점 초기 데이터
export const initialBusinesses: Business[] = [
  {
    id: 'biz-kukuku-bupyeong',
    name: '쿠우쿠우 부평점',
    bizNo: '630-40-91109',
    gwanriNo: '79516010160',
    gyGwanriNo: '79516010160',
    sjGwanriNo: '79516010160',
    npsGwanriNo: '20008864199',
    nhicGwanriNo: '77588907',
    address: '인천 부평구 부흥로 264, 9층 (부평동, 동아웰빙타운)',
    tel: '010-9959-2647',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 테스트용 샘플 퇴사자 데이터
export const sampleTestWorker: Worker = {
  id: 'worker-test-retirement',
  name: '김퇴직',
  residentNo: '8501011234567',
  phone: '010-1234-5678',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const sampleTestEmployment: Employment = {
  id: 'emp-test-retirement',
  workerId: 'worker-test-retirement',
  businessId: 'biz-kukuku-bupyeong',
  status: 'INACTIVE',
  joinDate: '2023-01-15',  // 2023년 1월 입사
  leaveDate: '2025-12-31', // 2025년 12월 퇴사 (약 3년 근무)
  leaveReason: '11',       // 자진퇴사
  monthlyWage: 2500000,
  jikjongCode: '532',
  workHours: 40,
  isContract: false,
  isRepresentative: false,
  gyYn: true,
  sjYn: true,
  npsYn: true,
  nhicYn: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// 테스트용 급여 데이터 (2025년 10월~12월)
export const sampleTestWages: MonthlyWage[] = [
  {
    id: 'wage-test-202510',
    employmentId: 'emp-test-retirement',
    yearMonth: '2025-10',
    totalWage: 2500000,
    nps: 112500,
    nhic: 89000,
    ltc: 12900,
    ei: 22500,
    incomeTax: 35000,
    localTax: 3500,
    netWage: 2224600,
    createdAt: new Date(),
  },
  {
    id: 'wage-test-202511',
    employmentId: 'emp-test-retirement',
    yearMonth: '2025-11',
    totalWage: 2500000,
    nps: 112500,
    nhic: 89000,
    ltc: 12900,
    ei: 22500,
    incomeTax: 35000,
    localTax: 3500,
    netWage: 2224600,
    createdAt: new Date(),
  },
  {
    id: 'wage-test-202512',
    employmentId: 'emp-test-retirement',
    yearMonth: '2025-12',
    totalWage: 2500000,
    nps: 112500,
    nhic: 89000,
    ltc: 12900,
    ei: 22500,
    incomeTax: 35000,
    localTax: 3500,
    netWage: 2224600,
    createdAt: new Date(),
  },
];
