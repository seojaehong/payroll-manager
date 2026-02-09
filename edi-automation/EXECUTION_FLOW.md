# 실행 흐름 간단 정리

## 🚀 빠른 이해 - 5분 안에 파악하기

### 전체 구조
```
당신의 명령
    ↓
main.py (명령어 처리)
    ↓
Selenium (Chrome 브라우저 제어)
    ↓
EDI 웹사이트 자동 조작
    ↓
결과 파일 저장
```

---

## 📁 주요 파일별 역할

| 파일 | 역할 | 언제 사용되나? |
|------|------|---------------|
| **main.py** | 프로그램 진입점 | 모든 명령어 실행 시 |
| **login.py** | 로그인 처리 | 모든 작업 시작 전 |
| **claim_download.py** | 청구 다운로드 | `download` 명령 실행 시 |
| **claim_upload.py** | 청구 업로드 | `upload` 명령 실행 시 |
| **report.py** | 보고서 생성 | `report` 명령 실행 시 |
| **backup.py** | 백업 관리 | `backup` 명령 또는 스케줄러 |
| **backup_scheduler.py** | 정기 백업 | `scheduler` 명령 실행 시 |

---

## 🔄 명령어별 실행 흐름

### 1️⃣ 로그인 테스트
```bash
python main.py test-login
```

```
main.py
  ↓
환경변수 로드 (.env에서 비밀번호)
  ↓
Selenium 초기화 (Chrome 브라우저 시작)
  ↓
login.py 실행
  ├─ EDI 사이트 접속
  ├─ 공동인증서 버튼 클릭
  ├─ 인증서 선택 (수동 개입 가능)
  └─ 로그인 성공 확인
  ↓
로그아웃
  ↓
브라우저 종료
```

**걸리는 시간**: 약 30초 ~ 1분
**수동 개입**: 인증서 선택 시
**결과**: 로그인 성공/실패 메시지

---

### 2️⃣ 청구 데이터 다운로드
```bash
python main.py download --month 2026-01
```

```
main.py
  ↓
login.py (로그인 수행)
  ↓
claim_download.py 실행
  ├─ "청구조회" 메뉴 클릭
  ├─ 날짜 입력 (2026-01-01 ~ 2026-01-31)
  ├─ "조회" 버튼 클릭
  └─ "엑셀 다운로드" 버튼 클릭
  ↓
파일 저장
  └─ data/downloads/청구데이터_20260129.xlsx
  ↓
로그아웃 & 종료
```

**걸리는 시간**: 약 1~2분
**수동 개입**: 로그인 시 인증서 선택
**결과**: data/downloads/ 폴더에 엑셀 파일

---

### 3️⃣ 청구 데이터 업로드
```bash
python main.py upload --file "data/uploads/claim.xlsx"
```

```
main.py
  ↓
login.py (로그인 수행)
  ↓
claim_upload.py 실행
  ├─ "청구접수" 메뉴 클릭
  ├─ 파일 선택 (claim.xlsx)
  ├─ 파일 검증 (옵션)
  │   ├─ "검증" 버튼 클릭
  │   └─ 검증 결과 확인
  └─ "제출" 버튼 클릭
  ↓
업로드 완료 확인
  ↓
로그아웃 & 종료
```

**걸리는 시간**: 약 1~2분
**수동 개입**: 로그인 시
**결과**: EDI 시스템에 데이터 제출됨

---

### 4️⃣ 보고서 생성
```bash
python main.py report --month 2026-01 --types "청구현황" "심사결과"
```

```
main.py
  ↓
login.py (로그인 수행)
  ↓
report.py 실행
  ↓
[보고서 1: 청구현황]
  ├─ "통계" 메뉴 클릭
  ├─ "청구현황" 선택
  ├─ 날짜 입력
  ├─ "조회" 버튼 클릭
  └─ "다운로드" 버튼 클릭
  ↓
[보고서 2: 심사결과]
  ├─ "통계" 메뉴 클릭
  ├─ "심사결과" 선택
  ├─ 날짜 입력
  ├─ "조회" 버튼 클릭
  └─ "다운로드" 버튼 클릭
  ↓
파일 저장
  ├─ data/downloads/청구현황_20260129.xlsx
  └─ data/downloads/심사결과_20260129.xlsx
  ↓
로그아웃 & 종료
```

**걸리는 시간**: 약 2~4분 (보고서 개수에 따라)
**수동 개입**: 로그인 시
**결과**: data/downloads/ 폴더에 보고서 파일들

---

### 5️⃣ 전체 백업
```bash
python main.py backup
```

```
main.py
  ↓
login.py (로그인 수행)
  ↓
backup.py 실행
  ↓
백업 폴더 생성
  └─ data/backups/full_backup_20260129_143025/
  ↓
[1단계] 청구 데이터 다운로드
  └─ claim_download.py 호출
  ↓
[2단계] 보고서 생성 (3개)
  ├─ report.py 호출 (청구현황)
  ├─ report.py 호출 (심사결과)
  └─ report.py 호출 (수납현황)
  ↓
파일 복사
  ├─ downloads/ → backups/full_backup_.../
  └─ backup_info.txt 생성
  ↓
오래된 백업 정리
  └─ 30일 이전 백업 폴더 삭제
  ↓
로그아웃 & 종료
```

**걸리는 시간**: 약 5~10분
**수동 개입**: 로그인 시
**결과**: data/backups/ 폴더에 백업 완료

---

### 6️⃣ 정기 백업 스케줄러
```bash
python main.py scheduler
```

```
main.py
  ↓
backup_scheduler.py 실행
  ↓
스케줄 등록 (config.yaml 기반)
  ├─ 매일 02:00 - 전체 백업
  └─ 매월 1일 04:00 - 전체 백업
  ↓
무한 루프 시작 (1분마다 체크)
  ↓
┌─────────────────────────────┐
│ [예약된 시간이 되면]          │
│   ↓                          │
│ Selenium 초기화              │
│   ↓                          │
│ login.py (로그인)            │
│   ↓                          │
│ backup.py (백업 수행)        │
│   ↓                          │
│ login.py (로그아웃)          │
│   ↓                          │
│ Selenium 종료                │
│   ↓                          │
│ 다음 예약 시간까지 대기      │
└─────────────────────────────┘
```

**실행 시간**: 계속 실행 중 (백그라운드)
**수동 개입**: 없음 (자동 실행)
**결과**: 예약된 시간마다 자동 백업

---

## 🔍 각 단계에서 일어나는 일

### 로그인 단계 상세
```
1. Chrome 브라우저 실행
   └─ webdriver_manager가 ChromeDriver 자동 다운로드

2. EDI 사이트 접속
   └─ https://edi.nhis.or.kr/homeapp/wep/m/retrieveMain.xx

3. 페이지 로드 대기
   └─ 2초 대기

4. "공동인증서" 버튼 찾기
   ├─ XPath: //a[contains(text(), '공동인증서')]
   ├─ XPath: //button[contains(text(), '공동인증서')]
   └─ 여러 선택자 시도

5. 버튼 클릭
   └─ Selenium의 click() 메서드 사용

6. 팝업/iframe 전환
   ├─ 새 창이 열리면 → switch_to.window()
   └─ iframe이면 → switch_to.frame()

7. 비밀번호 입력
   ├─ <input type="password"> 찾기
   └─ .env의 CERT_PASSWORD 값 입력

8. 확인 버튼 클릭
   └─ "확인", "로그인" 버튼 찾아서 클릭

9. 로그인 성공 확인 (최대 60초 대기)
   ├─ "로그아웃" 텍스트 있는지 확인
   ├─ "마이페이지" 요소 있는지 확인
   └─ 1초마다 체크, 최대 60회 시도

10. 성공!
    └─ 메인 페이지에서 작업 시작
```

### 다운로드 단계 상세
```
1. 메뉴 클릭
   └─ JavaScript click 또는 일반 click

2. 날짜 입력
   ├─ input 필드 찾기 (ID, Name, XPath)
   ├─ 기존 값 지우기 (clear())
   └─ 새 값 입력 (send_keys())

3. 조회 버튼 클릭
   └─ 클릭 후 3초 대기 (결과 로딩)

4. 다운로드 버튼 클릭
   └─ 클릭 후 5초 대기 (파일 다운로드)

5. 파일 확인
   └─ Chrome의 다운로드 폴더에 파일 저장됨
       (config.yaml에 설정된 경로)
```

---

## 📊 시간 예상

| 작업 | 소요 시간 | 수동 개입 |
|------|-----------|----------|
| 로그인 테스트 | 30초~1분 | 인증서 선택 |
| 청구 다운로드 | 1~2분 | 로그인 시만 |
| 청구 업로드 | 1~2분 | 로그인 시만 |
| 보고서 1개 | 1~2분 | 로그인 시만 |
| 보고서 3개 | 3~5분 | 로그인 시만 |
| 전체 백업 | 5~10분 | 로그인 시만 |

---

## 🐛 문제 발생 시 어디를 봐야 하나?

### 문제: 로그인이 안 됨
```
확인할 파일:
├─ .env (비밀번호 확인)
├─ logs/edi_automation_error_날짜.log (오류 로그)
└─ logs/login_error.png (스크린샷)

확인할 코드:
└─ src/automation/login.py
    ├─ navigate_to_edi() - 사이트 접속
    ├─ click_certificate_login() - 버튼 클릭
    └─ handle_certificate_selection() - 인증서 처리
```

### 문제: 요소를 찾을 수 없음
```
확인할 위치:
└─ 해당 automation 모듈 (login.py, claim_download.py 등)
    └─ 선택자(selector) 부분
        예: (By.XPATH, "//button[contains(text(), '조회')]")

해결 방법:
1. headless: false로 설정하여 화면 보기
2. EDI 사이트 구조 변경 여부 확인
3. 선택자 업데이트 필요
```

### 문제: 다운로드가 안 됨
```
확인할 위치:
├─ data/downloads/ 폴더 존재하는지
├─ 디스크 공간 충분한지
└─ 파일 권한 확인

확인할 설정:
└─ config/config.yaml
    └─ download:
          directory: "data/downloads"
```

---

## 💡 핵심 포인트

1. **모든 것은 main.py에서 시작**
   - 명령어 파싱
   - 설정 로드
   - 해당 함수 호출

2. **로그인은 필수**
   - 모든 작업 전에 login.py 실행
   - 수동으로 인증서 선택 필요할 수 있음

3. **로그를 보면 모든 것을 알 수 있음**
   - logs/ 폴더의 로그 파일 확인
   - 각 단계마다 로그 기록됨

4. **자동화는 EDI 사이트 구조에 의존**
   - 사이트가 변경되면 코드 수정 필요
   - 선택자(selector)를 업데이트해야 할 수 있음

5. **헤드리스 모드는 디버깅에 불편**
   - 처음 사용 시 headless: false 권장
   - 화면 보면서 어디서 막히는지 확인

---

## 🎯 다음 단계

1. **먼저 해보기**
   ```bash
   python main.py test-login
   ```

2. **로그 확인 습관**
   ```bash
   # 로그 파일 보기
   cat logs/edi_automation_2026-01-29.log
   ```

3. **예제 실행해보기**
   ```bash
   python examples/example_usage.py
   ```

4. **설정 커스터마이징**
   - config/config.yaml 수정
   - 백업 시간, 보고서 유형 등 조정

5. **스케줄러로 자동화**
   ```bash
   python main.py scheduler
   ```

**모든 코드는 명확하게 주석이 달려 있어 읽기 쉽습니다!**
