/**
 * 코드 테이블
 * 4대보험 신고 시 사용하는 표준 코드들
 */

import { JikjongCode, LeaveReasonCode } from '@/types';

// 직종코드 (고용보험/산재보험 신고용)
// 한국표준직업분류(KSCO) 기반
export const JIKJONG_CODES: JikjongCode[] = [
  // 관리직
  { code: '111', name: '의회의원·고위공무원 및 공공단체임원' },
  { code: '112', name: '기업고위임원' },
  { code: '120', name: '행정 및 경영지원 관리자' },
  { code: '131', name: '연구·교육 및 법률 관련 관리자' },
  { code: '132', name: '보험 및 금융 관리자' },
  { code: '133', name: '문화·예술·디자인·영상 관련 관리자' },
  { code: '134', name: '정보통신 관련 관리자' },
  { code: '135', name: '기타 전문서비스 관리자' },
  { code: '141', name: '건설·전기 및 생산 관련 관리자' },
  { code: '149', name: '기타 건설·전기 및 생산 관련 관리자' },
  { code: '151', name: '판매 및 운송 관리자' },
  { code: '152', name: '숙박·여행·오락 및 스포츠 관련 관리자' },
  { code: '153', name: '음식서비스 관련 관리자' },
  { code: '159', name: '환경·청소 및 경비 관련 관리자' },

  // 전문가 및 관련 종사자
  { code: '211', name: '생명과학 전문가' },
  { code: '212', name: '자연과학 전문가' },
  { code: '213', name: '사회과학 전문가' },
  { code: '221', name: '컴퓨터 하드웨어·통신공학 전문가' },
  { code: '222', name: '컴퓨터시스템 전문가' },
  { code: '223', name: '소프트웨어 개발자' },
  { code: '224', name: '데이터·네트워크 및 시스템 운영 전문가' },
  { code: '231', name: '건축·토목공학 전문가' },
  { code: '232', name: '화학공학 전문가' },
  { code: '233', name: '금속·재료공학 전문가' },
  { code: '234', name: '전기·전자공학 전문가' },
  { code: '235', name: '기계·로봇공학 전문가' },
  { code: '239', name: '기타 공학 전문가' },
  { code: '241', name: '의료 전문가' },
  { code: '242', name: '약사 및 한약사' },
  { code: '243', name: '간호사' },
  { code: '244', name: '영양사' },
  { code: '245', name: '치료·재활사 및 의료기사' },
  { code: '246', name: '수의사' },
  { code: '251', name: '대학교수' },
  { code: '252', name: '학교교사' },
  { code: '253', name: '유치원교사' },
  { code: '254', name: '문리·기술 및 예능 강사' },
  { code: '259', name: '기타 교육 전문가' },
  { code: '261', name: '법률 전문가' },
  { code: '262', name: '행정 전문가' },
  { code: '271', name: '인사 및 경영 전문가' },
  { code: '272', name: '회계·세무 및 감정 전문가' },
  { code: '273', name: '광고·홍보 전문가' },
  { code: '274', name: '기획·마케팅 전문가' },
  { code: '281', name: '작가 및 언론 관련 전문가' },
  { code: '282', name: '학예사·사서 및 기록물관리사' },
  { code: '283', name: '연극·영화 및 영상 전문가' },
  { code: '284', name: '화가·사진작가 및 공연예술가' },
  { code: '285', name: '디자이너' },

  // 사무 종사자
  { code: '311', name: '경영 관련 사무원' },
  { code: '312', name: '무역·운송 사무원' },
  { code: '313', name: '회계 및 경리 사무원' },
  { code: '314', name: '비서 및 사무 보조원' },
  { code: '320', name: '금융 사무원' },
  { code: '330', name: '법률·감사 사무원' },
  { code: '391', name: '통계·설문 사무원' },
  { code: '392', name: '여행·안내 및 접수 사무원' },
  { code: '399', name: '고객상담 및 기타 사무원' },

  // 서비스 종사자
  { code: '411', name: '경찰·소방 및 보안 관련 종사자' },
  { code: '412', name: '경호 및 보안 관련 종사자' },
  { code: '421', name: '돌봄서비스 종사자(간병·요양)' },
  { code: '422', name: '보육교사 및 육아도우미' },
  { code: '423', name: '장례 관련 종사자' },
  { code: '429', name: '기타 돌봄·보건서비스 종사자' },
  { code: '431', name: '이용사·미용사' },
  { code: '432', name: '피부·체형관리사' },
  { code: '433', name: '메이크업·네일아티스트' },
  { code: '441', name: '결혼·장례 등 행사 서비스 종사자' },
  { code: '442', name: '여행·숙박·오락 서비스 종사자' },
  { code: '510', name: '영업 종사자' },
  { code: '521', name: '매장 판매 종사자' },
  { code: '522', name: '방문·노점 및 통신 판매 종사자' },
  { code: '531', name: '주방장 및 조리사' },
  { code: '532', name: '식당서비스원' },
  { code: '533', name: '주점 및 음료서비스원' },

  // 농림어업 숙련 종사자
  { code: '610', name: '농업 숙련 종사자' },
  { code: '620', name: '임업 숙련 종사자' },
  { code: '630', name: '어업 숙련 종사자' },

  // 기능원 및 관련 기능 종사자
  { code: '710', name: '식품가공 관련 기능 종사자' },
  { code: '721', name: '섬유 관련 기능 종사자' },
  { code: '722', name: '의복 제조 관련 기능 종사자' },
  { code: '730', name: '목재·가구·악기 관련 기능 종사자' },
  { code: '741', name: '금형·공작기계 조작원' },
  { code: '742', name: '금속가공 관련 기능 종사자' },
  { code: '743', name: '자동차 정비원' },
  { code: '751', name: '전기·전자기기 설치·수리원' },
  { code: '752', name: '전기공' },
  { code: '761', name: '건설 구조 관련 기능 종사자' },
  { code: '762', name: '건축 마감 관련 기능 종사자' },
  { code: '771', name: '배관공' },
  { code: '791', name: '영상·통신장비 관련 설치·수리원' },
  { code: '792', name: '방송·통신 관련 설치·수리원' },

  // 장치·기계 조작 및 조립 종사자
  { code: '811', name: '식품·음료 기계 조작원' },
  { code: '812', name: '섬유·신발 기계 조작원' },
  { code: '813', name: '화학·고무·플라스틱 기계 조작원' },
  { code: '814', name: '금속·비금속 기계 조작원' },
  { code: '815', name: '기계 제조 관련 조작원' },
  { code: '816', name: '전기·전자 기계 조작원' },
  { code: '819', name: '기타 기계 조작원' },
  { code: '821', name: '철도·전동차 기관사' },
  { code: '822', name: '화물차·특수차 운전원' },
  { code: '823', name: '택시·버스 운전원' },
  { code: '824', name: '택배·배달원' },
  { code: '825', name: '크레인·호이스트 운전원' },
  { code: '826', name: '건설·채굴 기계 운전원' },
  { code: '831', name: '자동차 조립원' },
  { code: '832', name: '전기·전자 부품 조립원' },

  // 단순노무 종사자
  { code: '910', name: '건설·광업 단순종사자' },
  { code: '920', name: '운송 관련 단순종사자' },
  { code: '930', name: '제조 관련 단순종사자' },
  { code: '941', name: '청소원 및 환경미화원' },
  { code: '942', name: '경비원 및 검표원' },
  { code: '951', name: '가사·음식 관련 단순종사자' },
  { code: '952', name: '판매 관련 단순종사자' },
  { code: '953', name: '농림어업 관련 단순종사자' },
  { code: '999', name: '기타 서비스 관련 단순종사자' },
];

// 퇴사사유코드 (고용보험 상실신고용)
// 고용보험법 시행규칙 기준
export const LEAVE_REASON_CODES: LeaveReasonCode[] = [
  // 자진퇴사 (11~19)
  { code: '11', name: '개인사정으로 인한 자진퇴사', description: '가사 사정, 학업, 건강 등 개인적 사유' },
  { code: '12', name: '사업장 이전, 근로조건 변동 등으로 자진퇴사', description: '전근 거부, 임금체불, 근로조건 저하 등' },

  // 회사사정 (22~26)
  { code: '22', name: '계약기간만료, 공사종료', description: '기간제 근로계약 종료, 건설공사 완료 등' },
  { code: '23', name: '경영상 필요 및 회사 불황으로 인한 권고사직, 해고', description: '권고사직, 희망퇴직, 정리해고' },
  { code: '26', name: '피보험자의 귀책사유에 의한 징계해고', description: '중징계, 해고 (실업급여 제한)' },

  // 기타 (31~41)
  { code: '31', name: '정년', description: '정년에 따른 퇴직' },
  { code: '32', name: '60세 이상인 자의 이직 또는 고용연장 종료', description: '고령자 계약 종료' },
  { code: '33', name: '자진퇴사 이외의 기타 (폐업 등)', description: '사업장 폐업, 도산 등' },
  { code: '41', name: '고용보험 비적용', description: '65세 이상, 주 15시간 미만 등' },
];

// 자주 사용하는 직종코드 (상단 노출용)
export const COMMON_JIKJONG_CODES = [
  '313', // 회계 및 경리 사무원
  '314', // 비서 및 사무 보조원
  '311', // 경영 관련 사무원
  '532', // 식당서비스원
  '531', // 주방장 및 조리사
  '521', // 매장 판매 종사자
  '421', // 돌봄서비스 종사자
  '422', // 보육교사 및 육아도우미
  '941', // 청소원 및 환경미화원
  '942', // 경비원 및 검표원
  '910', // 건설·광업 단순종사자
  '223', // 소프트웨어 개발자
];

// 코드로 직종 찾기
export function getJikjongByCode(code: string): JikjongCode | undefined {
  return JIKJONG_CODES.find((j) => j.code === code);
}

// 이름으로 직종 검색
export function searchJikjongByName(keyword: string): JikjongCode[] {
  const lower = keyword.toLowerCase();
  return JIKJONG_CODES.filter((j) => j.name.toLowerCase().includes(lower));
}

// 코드로 퇴사사유 찾기
export function getLeaveReasonByCode(code: string): LeaveReasonCode | undefined {
  return LEAVE_REASON_CODES.find((r) => r.code === code);
}

// 정렬된 직종코드 (자주 사용하는 것 먼저)
export function getSortedJikjongCodes(): JikjongCode[] {
  const commonSet = new Set(COMMON_JIKJONG_CODES);
  const common = COMMON_JIKJONG_CODES
    .map((code) => JIKJONG_CODES.find((j) => j.code === code))
    .filter(Boolean) as JikjongCode[];
  const others = JIKJONG_CODES.filter((j) => !commonSet.has(j.code));
  return [...common, ...others];
}
