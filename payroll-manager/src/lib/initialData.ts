import { Business, Worker, Employment, MonthlyWage, ExcelMapping } from '@/types';
import { DEFAULTS } from './constants';

// 사업장 생성 팩토리 함수
function createBusiness(id: string, name: string, overrides?: Partial<Business>): Business {
  return {
    id,
    name,
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: DEFAULTS.JIKJONG_CODE,
    defaultWorkHours: DEFAULTS.WORK_HOURS,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// 초기 사업장 데이터 (상세 정보는 앱에서 직접 입력)
export const initialBusinesses: Business[] = [
  createBusiness('biz-kukuku-bupyeong', '쿠우쿠우 부평점'),
  createBusiness('biz-kukuku-gangdong', '쿠우쿠우 강동점'),
  createBusiness('biz-kukuku-geomdan', '쿠우쿠우 검단점'),
  createBusiness('biz-kukuku-godeok', '쿠우쿠우 고덕점'),
  createBusiness('biz-kukuku-masan', '쿠우쿠우 마산점'),
  createBusiness('biz-kukuku-bundang', '쿠우쿠우 분당점 (유빛)'),
  createBusiness('biz-kukuku-sangbong', '쿠우쿠우 상봉점 (누리에프앤비)'),
  createBusiness('biz-kukuku-songtan', '쿠우쿠우 송탄점'),
  createBusiness('biz-kukuku-yangju', '쿠우쿠우 양주옥정점'),
  createBusiness('biz-kukuku-yeonsinne', '쿠우쿠우 연신내점'),
  createBusiness('biz-kukuku-chuncheon', '쿠우쿠우 춘천점'),
  createBusiness('biz-kukuku-uijeongbu', '쿠우쿠우 의정부민락점'),
  createBusiness('biz-diningone', '다이닝원'),
  createBusiness('biz-bluerail', '블루레일 (건대/의정부)'),
  createBusiness('biz-always-shabu', '올웨이즈샤브'),
];

// 엑셀 매핑 초기 데이터
export const initialMappings: ExcelMapping[] = [
  {
    businessId: 'biz-kukuku-bupyeong',
    sheetName: '임금대장',
    headerRow: 4,
    dataStartRow: 6,
    columns: {
      name: 2,
      residentNo: 4,
      joinDate: 5,
      leaveDate: 6,
      wage: 7,
    },
  },
];

// 테스트 데이터 (개발 환경에서만 사용)
export function getTestData(): {
  worker: Worker;
  employment: Employment;
  wages: MonthlyWage[];
} | null {
  if (process.env.NODE_ENV !== 'development') return null;

  const worker: Worker = {
    id: 'worker-test-retirement',
    name: '김퇴직(테스트)',
    residentNo: '8501011234567',
    phone: '010-0000-0000',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const employment: Employment = {
    id: 'emp-test-retirement',
    workerId: 'worker-test-retirement',
    businessId: 'biz-kukuku-bupyeong',
    status: 'INACTIVE',
    joinDate: '2023-01-15',
    leaveDate: '2025-12-31',
    leaveReason: '11',
    monthlyWage: 2500000,
    jikjongCode: DEFAULTS.JIKJONG_CODE,
    workHours: DEFAULTS.WORK_HOURS,
    isContract: false,
    isRepresentative: false,
    gyYn: true,
    sjYn: true,
    npsYn: true,
    nhicYn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const wageBase = {
    employmentId: 'emp-test-retirement',
    totalWage: 2500000,
    nps: 112500,
    nhic: 89000,
    ltc: 12900,
    ei: 22500,
    incomeTax: 35000,
    localTax: 3500,
    netWage: 2224600,
    createdAt: new Date(),
  };

  const wages: MonthlyWage[] = [
    { ...wageBase, id: 'wage-test-202510', yearMonth: '2025-10' },
    { ...wageBase, id: 'wage-test-202511', yearMonth: '2025-11' },
    { ...wageBase, id: 'wage-test-202512', yearMonth: '2025-12' },
  ];

  return { worker, employment, wages };
}
