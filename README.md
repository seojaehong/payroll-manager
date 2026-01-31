# Neuro-Coach (급여 관리 시스템)

노무사 업무 자동화 및 급여 관리 시스템

## 프로젝트 구조

```
neuro-coach/
├── payroll-manager/        # 급여 관리 시스템 (Next.js + TypeScript)
├── tistory_uploader.py     # 티스토리 자동 발행 (Selenium)
├── comwel-auto-extension/  # 근로복지공단 Chrome 확장
└── docs/                   # 문서
```

## payroll-manager

급여 관리 핵심 시스템

```bash
cd payroll-manager
npm install
npm run dev
```

### 주요 기능
- 사업장/근로자 관리
- 급여 계산 및 명세서 생성
- 퇴직금 계산 (2025/2026년 세법)
- 엑셀 임포트 (사업장별 컬럼 매핑 저장)
- 4대보험 신고서 생성

---

## 티스토리 자동 발행

```bash
pip install selenium webdriver-manager markdown
python tistory_post.py --login  # 최초 로그인
python tistory_post.py 내글.md --title "제목" --category "AI"
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--title`, `-t` | 글 제목 |
| `--category`, `-c` | 카테고리명 |
| `--tags` | 태그 (쉼표 구분) |
| `--private` | 비공개 발행 |
| `--login` | 로그인만 (쿠키 저장) |

---

## 개발 환경

- Node.js 18+
- Python 3.10+
- Firebase (Firestore)

---

*Built with Claude Code*
