# 작업 현황 (Work Status)

> 마지막 업데이트: 2026-02-01

---

## 현재 상태

### payroll-manager
| 항목 | 상태 |
|------|------|
| 빌드 | ✅ 성공 |
| 개발 서버 | 준비됨 |
| Firebase | 연동됨 |

### 기타 프로젝트
| 프로젝트 | 상태 | 비고 |
|----------|------|------|
| tistory_uploader | ✅ 작동 | GUI 완성 |
| comwel-auto-extension | 🔧 개발중 | Chrome 확장 |
| legal-automation | 🔧 개발중 | Python |
| labor-automation | 📦 대기 | Apps Script |
| edi-automation | 📦 대기 | Python |

---

## 다음 작업 (TODO)

### 높음 (High Priority)
- [ ] payroll-manager 실제 데이터 테스트
- [ ] 퇴직금 계산 검증 (2026년 세법)
- [ ] 4대보험 신고서 생성 기능 완성

### 보통 (Medium Priority)
- [ ] comwel-auto-extension 테스트
- [ ] tistory 카테고리 자동 설정
- [ ] legal-automation 블로그 연동

### 낮음 (Low Priority)
- [ ] labor-automation Apps Script 배포
- [ ] edi-automation 테스트
- [ ] 전체 문서화

---

## 최근 완료 작업

- [x] payroll-manager 빌드 성공
- [x] CLAUDE.md 업데이트
- [x] settings.local.json 정리
- [x] 프로젝트 구조 정리

---

## 작업 명령어 모음

### 개발 시작
```bash
# payroll-manager 개발 서버
cd C:/dev/neuro-coach/payroll-manager && npm run dev
```

### 빌드 & 배포
```bash
# 빌드 테스트
cd C:/dev/neuro-coach/payroll-manager && npm run build
```

### Git 작업
```bash
# 전체 상태 확인
cd C:/dev/neuro-coach && git status

# 커밋 (payroll-manager 변경 시)
git add payroll-manager/
git commit -m "feat: 기능명"
git push
```

### 티스토리
```bash
# GUI 실행
cd C:/dev/neuro-coach && python tistory_uploader.py

# CLI 발행
python tistory_post.py 파일.md --title "제목" --category "카테고리"
```

---

## 이슈 & 메모

### 알려진 이슈
- 없음

### 메모
- Windows 환경 (OneDrive 동기화)
- Python 가상환경: `venv/Scripts/activate`
- Node.js npm 사용

---

## 세션 기록

### 2026-02-01
- 프로젝트 환경 재검토
- payroll-manager 빌드 확인 ✅
- CLAUDE.md, settings.local.json 정리
- WORK.md 작성
