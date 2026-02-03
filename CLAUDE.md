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

## 품질 검토 원칙

### 디자인 검토 (Jonathan Ive & Steve Jobs 관점)

모든 UI/UX 기능 개발 및 수정 시 다음을 자문하라:

**"조너선 아이브와 스티브 잡스가 이걸 보면 뭐라고 할까?"**

1. **단순함 (Simplicity)**
   - 불필요한 요소는 모두 제거했는가?
   - 사용자가 생각할 필요 없이 직관적인가?
   - 한 가지 기능에 두 가지 경로가 있지 않은가? (중복 제거)

2. **일관성 (Consistency)**
   - 같은 기능은 같은 방식으로 동작하는가?
   - 색상, 간격, 타이포그래피가 통일되어 있는가?
   - 버튼 스타일과 상호작용이 일관적인가?

3. **명확성 (Clarity)**
   - 라벨과 텍스트가 명확한가?
   - 사용자가 다음 행동을 알 수 있는가?
   - 에러 메시지가 해결 방법을 제시하는가?

4. **피드백 (Feedback)**
   - 모든 액션에 즉각적인 피드백이 있는가?
   - 로딩 상태가 표시되는가?
   - 성공/실패가 명확히 전달되는가?

5. **계층 (Hierarchy)**
   - 중요한 정보가 눈에 먼저 들어오는가?
   - 시각적 우선순위가 논리적인가?
   - 공간 활용이 효율적인가?

### 개발 검토 (최고 수준 개발자 관점)

모든 기능 개발 완료 시 다음을 검토하라:

**"세계 최고 개발자가 이 코드를 보면 어떤 문제를 지적할까?"**

1. **기능 충돌 검사**
   - 새 기능이 기존 기능을 깨뜨리지 않는가?
   - 중복된 코드나 함수가 없는가?
   - 같은 데이터를 다른 방식으로 처리하는 곳이 없는가?

2. **데이터 흐름 검증**
   - 저장 → 로드 → 표시 경로가 정상 작동하는가?
   - undefined/null 처리가 되어 있는가?
   - 비동기 상태 업데이트가 올바른가?

3. **엣지 케이스 처리**
   - 빈 데이터 상태에서 정상 동작하는가?
   - 대량 데이터에서도 성능이 괜찮은가?
   - 네트워크 오류 시 적절히 처리하는가?

4. **타입 안전성**
   - TypeScript 타입이 정확한가?
   - any 타입 남용이 없는가?
   - 타입 불일치 (예: `totalWage` vs `wage`) 없는가?

5. **테스트 시나리오**
   - 새 기능을 실제로 테스트했는가?
   - 관련 기능도 같이 테스트했는가?
   - 다른 메뉴 갔다가 돌아와도 데이터가 유지되는가?

### 검토 체크리스트

기능 완료 시 반드시 확인:

```
[ ] 디자인: 중복 페이지/기능 없음
[ ] 디자인: 버튼과 액션이 직관적
[ ] 디자인: 피드백 (Toast/로딩) 제공
[ ] 개발: 저장/로드/표시 정상 동작
[ ] 개발: 타입 일치 확인
[ ] 개발: 에러 핸들링 포함
[ ] 테스트: 새로고침 후에도 데이터 유지
[ ] 테스트: 다른 메뉴 이동 후 복귀 시 정상
```

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
