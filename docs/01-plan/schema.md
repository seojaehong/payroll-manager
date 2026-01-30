# 급여관리 시스템 데이터 스키마

## 엔티티 관계도

```
사업장 (Business)
    │
    ├── 1:N ── 근로자소속 (Employment)
    │              │
    │              └── N:1 ── 근로자 (Worker)
    │
    └── 1:N ── 신고이력 (Report)
```

## 1. 사업장 (Business)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | PK |
| name | string | Y | 사업장명 |
| bizNo | string | Y | 사업자등록번호 |
| gwanriNo | string | N | 관리번호 (근복) |
| gyGwanriNo | string | N | 고용보험 관리번호 |
| sjGwanriNo | string | N | 산재보험 관리번호 |
| npsGwanriNo | string | N | 국민연금 관리번호 |
| nhicGwanriNo | string | N | 건강보험 관리번호 |
| address | string | N | 주소 |
| tel | string | N | 전화번호 |
| defaultJikjong | string | N | 기본 직종코드 |
| defaultWorkHours | number | N | 기본 주소정근로시간 (40) |
| createdAt | datetime | Y | 생성일 |
| updatedAt | datetime | Y | 수정일 |

## 2. 근로자 (Worker)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | PK |
| name | string | Y | 성명 |
| residentNo | string | Y | 주민등록번호 (암호화) |
| nationality | string | N | 국적코드 (100=한국) |
| englishName | string | N | 영문명 (외국인) |
| stayStatus | string | N | 체류자격 (외국인) |
| phone | string | N | 연락처 |
| createdAt | datetime | Y | 생성일 |
| updatedAt | datetime | Y | 수정일 |

## 3. 근로자소속 (Employment)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | PK |
| workerId | string | Y | FK → Worker |
| businessId | string | Y | FK → Business |
| status | enum | Y | 상태 (ACTIVE/INACTIVE) |
| joinDate | date | Y | 입사일 (자격취득일) |
| leaveDate | date | N | 퇴사일 (자격상실일) |
| leaveReason | string | N | 퇴사사유코드 |
| monthlyWage | number | Y | 월평균보수 |
| jikjongCode | string | Y | 직종코드 |
| workHours | number | Y | 주소정근로시간 |
| isContract | boolean | N | 계약직여부 |
| contractEndDate | date | N | 계약종료일 |
| isRepresentative | boolean | N | 대표자여부 |
| gyYn | boolean | Y | 고용보험 가입 |
| sjYn | boolean | Y | 산재보험 가입 |
| npsYn | boolean | Y | 국민연금 가입 |
| nhicYn | boolean | Y | 건강보험 가입 |
| createdAt | datetime | Y | 생성일 |
| updatedAt | datetime | Y | 수정일 |

## 4. 급여변동이력 (WageHistory)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | PK |
| employmentId | string | Y | FK → Employment |
| effectiveDate | date | Y | 적용일 |
| prevWage | number | Y | 변경 전 보수 |
| newWage | number | Y | 변경 후 보수 |
| reason | string | N | 변경사유 |
| createdAt | datetime | Y | 생성일 |

## 5. 신고이력 (Report)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | string | Y | PK |
| businessId | string | Y | FK → Business |
| type | enum | Y | 유형 (ACQUIRE/LOSE) |
| reportDate | date | Y | 신고일 |
| receiptNo | string | N | 접수번호 |
| fileName | string | N | 생성된 파일명 |
| workerCount | number | Y | 신고 인원수 |
| status | enum | Y | 상태 (DRAFT/SUBMITTED/COMPLETED) |
| createdAt | datetime | Y | 생성일 |

## 코드 테이블

### 직종코드 (주요)
| 코드 | 명칭 |
|------|------|
| 532 | 식당 서비스원 |
| 941 | 건물 청소원 |
| 531 | 주방장 및 조리사 |
| 312 | 경리 사무원 |
| ... | ... |

### 퇴사사유코드
| 코드 | 명칭 |
|------|------|
| 11 | 자진퇴사 |
| 23 | 계약기간 만료 |
| 26 | 권고사직 |
| 31 | 정년퇴직 |
| ... | ... |
