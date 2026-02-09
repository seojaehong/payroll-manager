# 빠른 시작 가이드

EDI 자동화 도구를 5분 안에 설정하고 실행하는 방법입니다.

## 1단계: 설치 (2분)

### Python 설치 확인
```bash
python --version
```
Python 3.8 이상이 필요합니다.

### 프로젝트 디렉토리로 이동
```bash
cd edi-automation
```

### 가상환경 생성 및 활성화
```bash
python -m venv venv
venv\Scripts\activate
```

### 패키지 설치
```bash
pip install -r requirements.txt
```

## 2단계: 설정 (1분)

### 환경변수 파일 생성
```bash
copy .env.example .env
```

### 인증서 비밀번호 설정
메모장으로 `.env` 파일을 열고 인증서 비밀번호를 입력합니다:
```
CERT_PASSWORD=your_password_here
```

## 3단계: 로그인 테스트 (2분)

```bash
python main.py test-login
```

브라우저가 열리고 EDI 사이트로 이동합니다.
공동인증서 선택 창이 나타나면 인증서를 선택하세요.

## 완료!

이제 다음과 같은 작업을 수행할 수 있습니다:

### 이번 달 청구 데이터 다운로드
```bash
python main.py download --month 2026-01
```

### 보고서 생성
```bash
python main.py report --month 2026-01 --types "청구현황"
```

### 전체 백업
```bash
python main.py backup
```

### 정기 백업 스케줄러 실행
```bash
python main.py scheduler
```

## 다음 단계

자세한 사용법은 [README.md](README.md)를 참조하세요.

## 문제 해결

### 로그인이 안 돼요
1. `.env` 파일의 비밀번호를 확인하세요
2. 공동인증서가 만료되지 않았는지 확인하세요
3. Chrome 브라우저가 최신 버전인지 확인하세요

### 요소를 찾을 수 없다는 오류가 나요
EDI 사이트의 구조가 변경되었을 수 있습니다. 수동으로 한 번 로그인해보세요.

### 다운로드가 안 돼요
`config/config.yaml`에서 다운로드 경로를 확인하세요.

## 도움이 필요하신가요?

`logs/` 폴더의 로그 파일을 확인하거나 관리자에게 문의하세요.
