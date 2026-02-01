# Neuro-Coach 프로젝트

노무사 업무 자동화 및 급여 관리 시스템

---

## 자동 실행 규칙

### 허용된 자동 작업
- 파일 읽기/쓰기/수정 - 확인 없이 실행
- Git 작업 (add, commit, push) - 요청 시 자동 실행
- npm/node 명령어 - 자동 실행
- Python 스크립트 - 자동 실행
- 빌드 및 테스트 - 자동 실행

### 자기 개선 루프
작업 완료 시:
1. 작업 실행
2. 결과 자체 검토
3. 개선점 발견 시 즉시 수정
4. 완료 후 요약 및 다음 단계 제안

### 에러 처리
- 빌드 에러 → 자동 수정 시도
- 린트 에러 → 자동 수정
- 타입 에러 → 자동 수정

---

## 프로젝트 구조

```
neuro-coach/
├── payroll-manager/        # 급여 관리 시스템 (Next.js + TypeScript + Firebase)
├── tistory_uploader.py     # 티스토리 자동 발행 시스템 (Selenium)
├── comwel-auto-extension/  # 근로복지공단 자동화 Chrome 확장
├── edi-automation/         # EDI 자동화 도구
├── labor-automation/       # 노무 업무 자동화 도구
├── legal-automation/       # 법률 자동화 도구
├── docs/                   # PDCA 문서 및 스냅샷
└── res/                    # 리소스 파일
```

---

## 핵심 시스템

### 1. payroll-manager (급여 관리 시스템) - 우선순위 1
| 항목 | 값 |
|------|-----|
| 기술 | Next.js 16, TypeScript, Tailwind CSS, Firebase |
| 상태관리 | zustand |
| 경로 | `payroll-manager/` |

**기능:**
- 사업장/근로자 관리
- 급여 계산 및 명세서 생성
- 퇴직금 계산 (2025/2026년 세법)
- 4대보험 신고서 생성

**명령어:**
```bash
cd payroll-manager && npm run dev    # 개발 서버
cd payroll-manager && npm run build  # 프로덕션 빌드
```

**주요 파일:**
- `src/store/useStore.ts` - 상태 관리
- `src/lib/retirement.ts` - 퇴직금 계산
- `src/lib/firestore.ts` - Firebase 연동
- `src/types/index.ts` - 타입 정의

### 2. 티스토리 자동 발행
```bash
python tistory_uploader.py           # GUI 실행
python tistory_post.py 파일.md       # CLI 발행
```

### 3. Chrome 확장 (comwel-auto-extension/)
- 근로복지공단 업무 자동화
- 별도 git repo

### 4. 자동화 도구들
| 폴더 | 용도 | 기술 |
|------|------|------|
| edi-automation/ | EDI 자동화 | Python |
| labor-automation/ | 노무 자동화 | Google Apps Script |
| legal-automation/ | 법률 자동화 | Python + Selenium |

---

## 코딩 컨벤션

### TypeScript/React
- 함수형 컴포넌트 사용
- Tailwind CSS 스타일링
- zustand 상태 관리
- Firebase Firestore 데이터 저장

### Python
- UTF-8 인코딩
- Selenium WebDriver 브라우저 자동화
- 쿠키 기반 세션 유지

### 파일 명명
| 유형 | 규칙 | 예시 |
|------|------|------|
| React 컴포넌트 | PascalCase | `Layout.tsx` |
| 유틸리티 | camelCase | `firestore.ts` |
| Python | snake_case | `tistory_uploader.py` |

---

## Git 워크플로우

### 커밋 메시지
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
refactor: 코드 리팩토링
style: 포맷팅, 세미콜론 등
chore: 빌드, 설정 변경
```

### 커밋 시 자동 포함
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## 환경 설정 파일

| 파일 | 용도 | gitignore |
|------|------|-----------|
| `payroll-manager/.env.local` | Firebase 설정 | O |
| `tistory_config.json` | 블로그 설정 | X |
| `tistory_cookies.pkl` | 로그인 쿠키 | O |

---

## 페이지 구조 (payroll-manager)

| 경로 | 설명 |
|------|------|
| `/` | 대시보드 |
| `/businesses` | 사업장 목록 |
| `/businesses/new` | 사업장 등록 |
| `/businesses/[id]` | 사업장 상세 |
| `/workers` | 근로자 목록 |
| `/workers/new` | 근로자 등록 |
| `/wages` | 급여 관리 |
| `/reports` | 보고서 |
| `/import` | 데이터 가져오기 |
| `/settings` | 설정 |

---

## 참고 자료

### 세금 계산
- `2024년_근로소득_간이세액표*.xlsx/pdf`
- `payroll-manager/2025년 퇴직소득 세액계산 프로그램.xlsx`
- `payroll-manager/(상반기/하반기)2026년 귀속 퇴직소득 세액계산 프로그램*.xlsx`

### 급여 데이터
- `payroll-manager/payroll_structure.json`

---

## 빠른 명령어

```bash
# === payroll-manager ===
cd payroll-manager && npm run dev     # 개발 서버
cd payroll-manager && npm run build   # 빌드

# === 티스토리 ===
python tistory_uploader.py            # GUI 실행
python tistory_post.py --login        # 로그인

# === Git ===
git status                            # 상태 확인
git add . && git commit -m "feat: 기능" && git push

# === Python 환경 ===
python -m venv venv
venv/Scripts/activate
pip install selenium webdriver-manager markdown openpyxl
```

---

## 작업 우선순위

1. **payroll-manager** - 급여 관리 핵심 시스템
2. **tistory** - 블로그 자동 발행
3. **comwel-auto-extension** - 근복 자동화
4. **legal-automation** - 법률 자동화
5. **labor-automation** - 노무 자동화
6. **edi-automation** - EDI 자동화
