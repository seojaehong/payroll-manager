# 설치 완료!

## ✅ 설치된 항목

- [x] Python 3.13.3
- [x] 가상환경 (venv/)
- [x] 모든 필수 패키지 (Selenium, Pandas, Loguru 등)
- [x] .env 환경 설정 파일
- [x] 프로젝트 구조 및 소스 코드

## 📝 다음 해야 할 일

### 1. 인증서 비밀번호 설정 (필수) ⚠️

`.env` 파일을 열어서 공동인증서 비밀번호를 입력하세요:

**Windows 메모장으로 열기:**
```bash
notepad edi-automation\.env
```

**VSCode로 열기:**
```bash
code edi-automation\.env
```

**수정할 내용:**
```env
# 이 줄을 찾아서
CERT_PASSWORD=your_certificate_password_here

# 실제 비밀번호로 변경
CERT_PASSWORD=실제비밀번호
```

저장 후 파일을 닫으세요.

---

## 🧪 설치 테스트

### 1. 가상환경 활성화

**Git Bash:**
```bash
cd edi-automation
source venv/Scripts/activate
```

**CMD:**
```cmd
cd edi-automation
venv\Scripts\activate
```

**PowerShell:**
```powershell
cd edi-automation
venv\Scripts\Activate.ps1
```

가상환경이 활성화되면 프롬프트 앞에 `(venv)`가 표시됩니다.

### 2. 로그인 테스트 실행

```bash
python main.py test-login
```

**예상 결과:**
- Chrome 브라우저가 자동으로 열림
- EDI 사이트로 이동
- 공동인증서 선택 창이 나타남 (수동으로 선택)
- 로그인 성공 메시지

**⚠️ 중요:**
- 처음 실행 시 ChromeDriver가 자동으로 다운로드됩니다
- 공동인증서 선택 창이 나타나면 수동으로 인증서를 선택해야 할 수 있습니다
- 브라우저 확장 프로그램 설치를 요구할 수 있습니다

---

## 🎯 다음 단계: 기본 사용법

### 청구 데이터 다운로드

```bash
# 이번 달 청구 데이터
python main.py download --month 2026-01

# 특정 기간
python main.py download --start-date 2026-01-01 --end-date 2026-01-31
```

### 보고서 생성

```bash
# 여러 보고서 생성
python main.py report --month 2026-01 --types "청구현황" "심사결과"
```

### 전체 백업

```bash
python main.py backup
```

### 정기 백업 스케줄러 실행

```bash
python main.py scheduler
```

---

## 📚 도움말 및 문서

- **빠른 시작**: [QUICKSTART.md](QUICKSTART.md)
- **상세 가이드**: [README.md](README.md)
- **실행 흐름**: [EXECUTION_FLOW.md](EXECUTION_FLOW.md)
- **작업 흐름**: [WORKFLOW.md](WORKFLOW.md)
- **예제 코드**: [examples/example_usage.py](examples/example_usage.py)

---

## ❓ 문제 해결

### 문제: "ChromeDriver를 찾을 수 없습니다"
**해결:** 자동으로 다운로드되니 잠시 기다리세요.

### 문제: "로그인 실패"
**해결:**
1. `.env` 파일의 비밀번호 확인
2. 공동인증서 유효기간 확인
3. 인증서 선택 창에서 수동으로 선택

### 문제: "요소를 찾을 수 없습니다"
**해결:**
1. `config/config.yaml`에서 `headless: false` 설정
2. 브라우저 화면 보면서 진행
3. 로그 파일 확인: `logs/`

### 문제: 한글이 깨집니다
**해결:** Python 환경의 인코딩 문제일 수 있습니다. 로그는 UTF-8로 저장됩니다.

---

## 🎉 설치 완료!

이제 EDI 업무 자동화를 시작할 수 있습니다!

**첫 실행 명령:**
```bash
python main.py test-login
```

궁금한 점이 있으면 로그 파일을 확인하거나 문서를 참조하세요.
