# AI와 함께 하룻밤에 급여관리 시스템 만들기

> Claude Code로 30개 사업장 4대보험 신고 자동화 시스템을 개발한 경험

## 문제 상황

노무사 사무실에서 30개 이상의 사업장을 관리하고 있습니다. 매달 반복되는 업무:

- 각 사업장 급여대장에서 입/퇴사자 확인
- 근로복지공단 사이트에서 취득/상실 신고
- 사업장마다 조금씩 다른 급여대장 양식 대응

기존에는 근로복지공단의 엑셀 일괄신고 기능을 사용했지만, 급여대장에서 데이터를 수작업으로 옮기는 과정이 번거로웠습니다.

## 해결 방안

**급여대장 → 신고용 엑셀** 자동 변환 시스템을 만들기로 했습니다.

### 핵심 기능

1. **사업장별 급여대장 Import**
   - 각 사업장마다 다른 엑셀 양식 대응
   - 컬럼 매핑 설정 저장 (한 번 설정하면 계속 사용)

2. **근로자 DB 관리**
   - 입사/퇴사 이력 추적
   - 4대보험 가입 여부 관리

3. **신고 엑셀 자동 생성**
   - 취득신고: 해당 월 입사자 → 근로복지공단 양식
   - 상실신고: 해당 월 퇴사자 → 근로복지공단 양식

## 기술 스택

```
Frontend: Next.js 16 + TypeScript + Tailwind CSS
상태관리: Zustand + localStorage (오프라인 우선)
Excel: xlsx 라이브러리
디자인: 리퀴드 글라스 다크모드 (Apple 스타일)
```

## 개발 과정

### 1. 요구사항 분석 (30분)

실제 급여대장 파일을 분석하고, 근로복지공단 취득신고 API 페이로드를 캡처해서 필요한 데이터 구조를 파악했습니다.

```typescript
// 핵심 데이터 구조
interface Worker {
  name: string;
  residentNo: string;  // 주민등록번호
  nationality: string;
}

interface Employment {
  workerId: string;
  businessId: string;
  joinDate: string;    // 입사일
  leaveDate?: string;  // 퇴사일
  monthlyWage: number; // 월평균보수
  gyYn: boolean;       // 고용보험
  sjYn: boolean;       // 산재보험
  npsYn: boolean;      // 국민연금
  nhicYn: boolean;     // 건강보험
}
```

### 2. 급여대장 매핑 시스템

사업장마다 급여대장 양식이 다릅니다:
- A사업장: 이름이 B열, 주민번호가 D열
- B사업장: 이름이 C열, 주민번호가 E열

이를 해결하기 위해 **컬럼 매핑 설정**을 사업장별로 저장:

```typescript
interface ExcelMapping {
  businessId: string;
  sheetName: string;      // "임금대장"
  headerRow: number;      // 4
  dataStartRow: number;   // 6
  columns: {
    name: number;         // 이름 열 번호
    residentNo: number;   // 주민번호 열 번호
    joinDate: number;     // 입사일 열 번호
    leaveDate: number;    // 퇴사일 열 번호
    wage: number;         // 보수 열 번호
  };
}
```

### 3. 신고 엑셀 생성

근로복지공단 양식에 맞춰 38개 컬럼의 취득신고 엑셀을 자동 생성:

```typescript
const header = [
  '*주민등록번호', '*성명', '*대표자여부', '영문성명', '국적', '체류자격',
  '*소득월액', '*자격취득일', '*취득월납부', '*취득부호', // ... 38개 컬럼
];

const dataRows = targetWorkers.map(({ worker, employment }) => {
  const dt = employment.joinDate.replace(/-/g, '');
  return [
    worker.residentNo,
    worker.name,
    employment.isRepresentative ? 'Y' : 'N',
    // ... 나머지 데이터 매핑
  ];
});
```

### 4. 리퀴드 글라스 UI

어두운 배경에 반투명 유리 효과를 적용한 모던한 디자인:

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}
```

## 프로젝트 구조

```
payroll-manager/
├── src/
│   ├── app/
│   │   ├── businesses/     # 사업장 관리
│   │   ├── workers/        # 근로자 관리
│   │   ├── import/         # 급여대장 Import
│   │   ├── reports/        # 신고서 생성
│   │   └── settings/       # 설정 (백업/복원)
│   ├── store/
│   │   └── useStore.ts     # Zustand 상태관리
│   └── types/
│       └── index.ts        # 타입 정의
└── docs/
    └── 01-plan/
        └── schema.md       # 데이터 스키마
```

## 사용 방법

1. **사업장 등록** (최초 1회)
   - 사업장명, 사업자번호, 4대보험 관리번호 입력

2. **컬럼 매핑 설정** (최초 1회)
   - 급여대장 파일 업로드
   - 이름/주민번호/입사일 등 컬럼 위치 지정
   - 매핑 저장

3. **월별 Import**
   - 해당 월 급여대장 업로드
   - 미리보기 확인 후 Import

4. **신고서 생성**
   - 대상 월/사업장 선택
   - 취득 또는 상실 선택
   - 엑셀 다운로드 → 근로복지공단 업로드

## 개발 소감

Claude Code와 대화하며 개발하니 실제로 하룻밤 만에 MVP가 완성되었습니다. 특히:

- **실제 데이터로 검증**: 쿠우쿠우 부평점 급여대장으로 바로 테스트
- **반복적인 개선**: "다크모드로 해줘", "글씨가 안 보여" 같은 피드백 즉시 반영
- **도메인 지식 활용**: 근로복지공단 API 구조, 4대보험 신고 양식 등 실무 지식 적용

다음 단계:
- [ ] 30개 사업장 실제 테스트
- [ ] bkend.ai 클라우드 동기화
- [ ] 근로복지공단 API 직접 연동 (Chrome 확장프로그램)

---

*이 프로젝트는 Claude Code(Claude Opus 4.5)와 페어 프로그래밍으로 개발되었습니다.*
