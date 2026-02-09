# EDI 자동화 도구

건강보험 EDI 시스템 업무 자동화를 위한 Python 기반 도구입니다.

## 주요 기능

- 공동인증서 기반 자동 로그인
- 청구 데이터 조회 및 다운로드
- 청구 데이터 업로드
- 보고서 및 통계 생성
- 정기 백업 스케줄링
- 오래된 백업 자동 정리

## 시스템 요구사항

- Python 3.8 이상
- Windows 10 이상 (공동인증서 지원)
- Chrome 브라우저

## 설치 방법

### 1. 저장소 클론 또는 다운로드

```bash
cd edi-automation
```

### 2. 가상환경 생성 (권장)

```bash
python -m venv venv
```

### 3. 가상환경 활성화

Windows:
```bash
venv\Scripts\activate
```

### 4. 필요한 패키지 설치

```bash
pip install -r requirements.txt
```

### 5. 환경변수 설정

`.env.example` 파일을 `.env`로 복사하고 공동인증서 비밀번호를 설정합니다.

```bash
copy .env.example .env
```

`.env` 파일을 편집하여 인증서 비밀번호를 입력합니다:
```
CERT_PASSWORD=your_certificate_password
```

### 6. 설정 파일 수정

`config/config.yaml` 파일을 열어 필요한 설정을 수정합니다.

## 사용 방법

### 로그인 테스트

먼저 로그인이 정상적으로 작동하는지 테스트합니다:

```bash
python main.py test-login
```

**중요**: 공동인증서 선택 창이 나타나면 수동으로 인증서를 선택해야 할 수 있습니다.

### 청구 데이터 다운로드

#### 기간별 다운로드
```bash
python main.py download --start-date 2026-01-01 --end-date 2026-01-31
```

#### 월별 다운로드
```bash
python main.py download --month 2026-01
```

### 청구 데이터 업로드

#### 단일 파일 업로드
```bash
python main.py upload --file "data/uploads/claim_data.xlsx"
```

#### 디렉토리 내 모든 파일 업로드
```bash
python main.py upload --directory "data/uploads"
```

### 보고서 생성

#### 단일 보고서
```bash
python main.py report --type "청구현황" --start-date 2026-01-01 --end-date 2026-01-31
```

#### 월별 여러 보고서 생성
```bash
python main.py report --month 2026-01 --types "청구현황" "심사결과" "수납현황"
```

### 데이터 백업

```bash
python main.py backup --start-date 2026-01-01 --end-date 2026-01-31
```

### 스케줄러 실행

정기 백업을 자동으로 실행합니다:

```bash
python main.py scheduler
```

스케줄 설정은 `config/config.yaml` 파일에서 수정할 수 있습니다.

## 설정 파일

### config/config.yaml

주요 설정 항목:

```yaml
# Selenium 설정
selenium:
  headless: false  # true: 브라우저 숨김, false: 브라우저 표시

# 백업 설정
backup:
  retention_days: 30  # 백업 보관 기간 (일)
  report_types:       # 백업할 보고서 유형
    - "청구현황"
    - "심사결과"
    - "수납현황"

# 스케줄러 설정
scheduler:
  daily_backup:
    enabled: true
    time: "02:00"   # 매일 새벽 2시
    type: "full"    # 전체 백업
```

## 디렉토리 구조

```
edi-automation/
├── config/              # 설정 파일
│   └── config.yaml
├── data/                # 데이터 디렉토리
│   ├── downloads/       # 다운로드된 파일
│   ├── uploads/         # 업로드할 파일
│   └── backups/         # 백업 파일
├── logs/                # 로그 파일
├── src/                 # 소스 코드
│   ├── auth/            # 인증 모듈
│   ├── automation/      # 자동화 모듈
│   ├── scheduler/       # 스케줄러 모듈
│   └── utils/           # 유틸리티 모듈
├── .env                 # 환경변수 (생성 필요)
├── .env.example         # 환경변수 예제
├── requirements.txt     # Python 패키지 목록
├── main.py              # 메인 실행 파일
└── README.md            # 이 파일
```

## 주의사항

### 보안

1. **인증서 비밀번호**: `.env` 파일은 절대 공유하지 마세요
2. **공동인증서**: 인증서 파일을 Git에 커밋하지 마세요
3. **다운로드 파일**: 민감한 데이터가 포함될 수 있으니 주의하세요

### 공동인증서 로그인

- 현재 버전에서는 공동인증서 선택 단계에서 수동 개입이 필요할 수 있습니다
- AnySign 등의 플러그인이 브라우저에 설치되어 있어야 합니다
- 처음 실행 시 브라우저 확장 프로그램 설치를 요구할 수 있습니다

### 헤드리스 모드

- 헤드리스 모드(`headless: true`)에서는 공동인증서 로그인이 어려울 수 있습니다
- 처음 사용할 때는 `headless: false`로 설정하여 브라우저를 표시하는 것을 권장합니다

## 문제 해결

### 로그인 실패

1. 공동인증서 비밀번호가 정확한지 확인
2. 공동인증서가 유효 기간 내인지 확인
3. 브라우저 확장 프로그램이 설치되어 있는지 확인

### 요소를 찾을 수 없음

EDI 사이트의 구조가 변경되었을 수 있습니다. 로그를 확인하고 필요시 코드를 수정해야 합니다.

### 다운로드 실패

1. 다운로드 디렉토리가 존재하는지 확인
2. 충분한 디스크 공간이 있는지 확인
3. 권한 문제가 있는지 확인

## 로그 확인

모든 작업은 `logs/` 디렉토리에 기록됩니다:

- `edi_automation_YYYY-MM-DD.log`: 일반 로그
- `edi_automation_error_YYYY-MM-DD.log`: 에러 로그

## 업데이트

패키지를 최신 버전으로 업데이트:

```bash
pip install --upgrade -r requirements.txt
```

## 라이선스

이 프로젝트는 내부 사용을 위한 도구입니다.

## 지원

문제가 발생하면 로그 파일과 함께 문의해주세요.

## 버전 정보

- 현재 버전: 1.0.0
- 최종 업데이트: 2026-01-29

## 개발 계획

### v1.1.0 (예정)
- [ ] 완전 자동 공동인증서 로그인 (AnySign 직접 제어)
- [ ] 웹 대시보드 추가
- [ ] 이메일 알림 기능
- [ ] 더 많은 보고서 유형 지원

### v1.2.0 (예정)
- [ ] API 서버 모드
- [ ] 다중 계정 지원
- [ ] 데이터 분석 기능
