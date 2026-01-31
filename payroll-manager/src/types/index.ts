// 사업장
export interface Business {
  id: string;
  name: string;
  bizNo: string;  // 사업자등록번호
  gwanriNo?: string;  // 관리번호 (근복)
  gyGwanriNo?: string;  // 고용보험 관리번호
  sjGwanriNo?: string;  // 산재보험 관리번호
  npsGwanriNo?: string;  // 국민연금 관리번호
  nhicGwanriNo?: string;  // 건강보험 관리번호
  address?: string;
  tel?: string;
  defaultJikjong?: string;  // 기본 직종코드
  defaultWorkHours?: number;  // 기본 주소정근로시간
  createdAt: Date;
  updatedAt: Date;
}

// 근로자
export interface Worker {
  id: string;
  name: string;
  residentNo: string;  // 주민등록번호
  nationality?: string;  // 국적코드 (100=한국)
  englishName?: string;  // 영문명 (외국인)
  stayStatus?: string;  // 체류자격 (외국인)
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 근로자 소속 (고용 관계)
export interface Employment {
  id: string;
  workerId: string;
  businessId: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinDate: string;  // 입사일 YYYY-MM-DD
  leaveDate?: string;  // 퇴사일
  leaveReason?: string;  // 퇴사사유코드
  monthlyWage: number;  // 월평균보수
  jikjongCode: string;  // 직종코드
  workHours: number;  // 주소정근로시간
  isContract?: boolean;  // 계약직여부
  contractEndDate?: string;  // 계약종료일
  isRepresentative?: boolean;  // 대표자여부
  gyYn: boolean;  // 고용보험 가입
  sjYn: boolean;  // 산재보험 가입
  npsYn: boolean;  // 국민연금 가입
  nhicYn: boolean;  // 건강보험 가입
  createdAt: Date;
  updatedAt: Date;
}

// 급여 변동 이력
export interface WageHistory {
  id: string;
  employmentId: string;
  effectiveDate: string;
  prevWage: number;
  newWage: number;
  reason?: string;
  createdAt: Date;
}

// 월별 급여 이력 (상실신고 보수총액 계산용)
export interface MonthlyWage {
  id: string;
  employmentId: string;
  yearMonth: string;  // YYYY-MM 형식

  // 급여
  totalWage: number;  // 임금총액 (세전)
  netWage?: number;   // 실지급액 (세후)

  // 4대보험
  nps?: number;       // 국민연금 (National Pension Service)
  nhic?: number;      // 건강보험 (National Health Insurance)
  ltc?: number;       // 장기요양보험 (Long-term Care)
  ei?: number;        // 고용보험 (Employment Insurance)

  // 세금
  incomeTax?: number;  // 소득세
  localTax?: number;   // 지방소득세 (주민세)

  workDays?: number;  // 근무일수
  createdAt: Date;
}

// 신고 이력
export interface Report {
  id: string;
  businessId: string;
  type: 'ACQUIRE' | 'LOSE';  // 취득 / 상실
  reportDate: string;
  receiptNo?: string;  // 접수번호
  fileName?: string;
  workerCount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  createdAt: Date;
}

// 엑셀 매핑 설정
export interface ExcelMapping {
  businessId: string;
  sheetName: string;
  headerRow: number;
  dataStartRow: number;
  columns: {
    // 필수
    name: number;
    residentNo: number;
    joinDate: number;
    leaveDate: number;
    wage: number;           // 임금총액 (세전)

    // 선택 (4대보험)
    nps?: number;           // 국민연금
    nhic?: number;          // 건강보험
    ltc?: number;           // 장기요양보험
    ei?: number;            // 고용보험

    // 선택 (세금)
    incomeTax?: number;     // 소득세
    localTax?: number;      // 지방소득세

    // 선택 (기타)
    netWage?: number;       // 실지급액
  };
}

// 직종 코드
export interface JikjongCode {
  code: string;
  name: string;
}

// 퇴사 사유 코드
export interface LeaveReasonCode {
  code: string;
  name: string;
  description?: string;
}

// 퇴직금 계산 결과
export interface RetirementCalculation {
  id: string;
  employmentId: string;
  workerId: string;
  businessId: string;

  // 근무 기간
  joinDate: string;
  leaveDate: string;
  totalDays: number;           // 총 근무일수
  totalYears: number;          // 근속연수 (소수점)

  // 평균임금 계산
  last3MonthsWages: number;    // 퇴직 전 3개월 급여 합계
  last3MonthsDays: number;     // 퇴직 전 3개월 일수
  averageDailyWage: number;    // 평균임금 (일당)

  // 퇴직금
  retirementPay: number;       // 퇴직금 (세전)

  // 퇴직소득세
  serviceYearDeduction: number;  // 근속연수공제
  taxableIncome: number;         // 과세표준
  retirementTax: number;         // 퇴직소득세
  localRetirementTax: number;    // 지방소득세 (10%)

  // 실수령액
  netRetirementPay: number;    // 실수령 퇴직금

  // 메타
  calculatedAt: Date;
  pdfGenerated?: boolean;
}
