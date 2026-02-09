# EDI 자동화 실행 흐름 상세 가이드

## 전체 실행 흐름

```
사용자 명령 입력
    ↓
main.py 실행
    ↓
환경변수 로드 (.env)
    ↓
설정 파일 로드 (config/config.yaml)
    ↓
로거 초기화 (src/utils/logger.py)
    ↓
Selenium 초기화 (src/utils/selenium_helper.py)
    ↓
Chrome 브라우저 실행
    ↓
로그인 프로세스 (src/automation/login.py)
    ↓
작업 수행 (download/upload/report/backup)
    ↓
로그아웃
    ↓
브라우저 종료
```

---

## 1. 로그인 프로세스 상세

### 실행 파일: `src/automation/login.py`

```
1. EDI 사이트 접속
   └─> https://edi.nhis.or.kr/homeapp/wep/m/retrieveMain.xx

2. 공동인증서 로그인 버튼 클릭
   ├─> XPath로 "공동인증서" 텍스트 포함 요소 찾기
   └─> 버튼 클릭

3. 인증서 선택 팝업 처리
   ├─> 새 창/iframe으로 전환
   ├─> 인증서 비밀번호 입력 (.env의 CERT_PASSWORD)
   └─> 확인 버튼 클릭

   ⚠️ AnySign 플러그인 사용 - 수동 개입 필요할 수 있음

4. 로그인 성공 확인
   ├─> "로그아웃" 버튼 존재 확인
   ├─> "마이페이지" 요소 확인
   └─> 최대 60초 대기

5. 로그인 완료
   └─> 메인 페이지로 이동
```

**주요 코드 위치:**
- `EDILogin.navigate_to_edi()`: EDI 사이트 접속
- `EDILogin.click_certificate_login()`: 인증서 로그인 버튼 클릭
- `EDILogin.handle_certificate_selection()`: 인증서 선택 처리
- `EDILogin.wait_for_login_success()`: 로그인 성공 대기

---

## 2. 청구 데이터 다운로드 프로세스

### 실행 파일: `src/automation/claim_download.py`

```
1. 청구 조회 메뉴 이동
   └─> "청구조회", "진료비청구" 메뉴 클릭

2. 조회 기간 설정
   ├─> 시작일 입력 (startDate 필드)
   └─> 종료일 입력 (endDate 필드)

3. 조회 버튼 클릭
   ├─> "조회" 버튼 찾기
   └─> 3초 대기 (결과 로딩)

4. 결과 다운로드
   ├─> "엑셀" 또는 "다운로드" 버튼 클릭
   └─> 5초 대기 (다운로드 완료)

5. 파일 저장
   └─> data/downloads/ 폴더에 저장
```

**사용 예시:**
```bash
# 명령어
python main.py download --month 2026-01

# 실행 흐름
main.py
  └─> download_claims(config, args)
      └─> ClaimDownloader.download_monthly_claims(2026, 1)
          ├─> navigate_to_claim_inquiry()
          ├─> set_date_range("2026-01-01", "2026-01-31")
          ├─> click_search()
          └─> download_results("excel")
```

---

## 3. 청구 데이터 업로드 프로세스

### 실행 파일: `src/automation/claim_upload.py`

```
1. 청구 업로드 메뉴 이동
   └─> "청구접수", "청구등록" 메뉴 클릭

2. 파일 선택
   ├─> <input type="file"> 요소 찾기
   └─> 파일 경로 입력 (sendKeys)

3. 파일 검증 (선택사항)
   ├─> "검증" 버튼 클릭
   ├─> 5초 대기
   ├─> 검증 결과 확인
   │   ├─> 성공: "검증 성공" 메시지 확인
   │   └─> 실패: "오류" 메시지 확인
   └─> 실패 시 중단

4. 업로드 제출
   ├─> "제출" 또는 "업로드" 버튼 클릭
   ├─> 확인 대화상자 처리 (alert.accept())
   └─> 완료 메시지 확인
```

**사용 예시:**
```bash
# 명령어
python main.py upload --file "data/uploads/claim.xlsx"

# 실행 흐름
main.py
  └─> upload_claims(config, args)
      └─> ClaimUploader.upload_claim_file("data/uploads/claim.xlsx")
          ├─> navigate_to_claim_upload()
          ├─> select_file("data/uploads/claim.xlsx")
          ├─> validate_file() [config에서 설정된 경우]
          └─> submit_upload()
```

---

## 4. 보고서 생성 프로세스

### 실행 파일: `src/automation/report.py`

```
1. 통계/보고서 메뉴 이동
   └─> "통계", "보고서" 메뉴 클릭

2. 보고서 유형 선택
   ├─> 드롭다운 또는 라디오 버튼
   └─> 예: "청구현황", "심사결과", "수납현황"

3. 조회 기간 설정
   ├─> 시작일 입력
   └─> 종료일 입력

4. 보고서 생성
   ├─> "생성" 또는 "조회" 버튼 클릭
   └─> 5초 대기 (보고서 생성)

5. 보고서 다운로드
   ├─> "엑셀" 또는 "다운로드" 버튼 클릭
   └─> data/downloads/ 폴더에 저장
```

**사용 예시:**
```bash
# 명령어
python main.py report --month 2026-01 --types "청구현황" "심사결과"

# 실행 흐름
main.py
  └─> generate_reports(config, args)
      └─> ReportGenerator.generate_monthly_reports(2026, 1, ["청구현황", "심사결과"])
          ├─> [청구현황]
          │   ├─> navigate_to_statistics()
          │   ├─> select_report_type("청구현황")
          │   ├─> set_report_period("2026-01-01", "2026-01-31")
          │   ├─> generate_report()
          │   └─> download_report("excel")
          └─> [심사결과]
              ├─> navigate_to_statistics()
              ├─> select_report_type("심사결과")
              ├─> set_report_period("2026-01-01", "2026-01-31")
              ├─> generate_report()
              └─> download_report("excel")
```

---

## 5. 전체 백업 프로세스

### 실행 파일: `src/automation/backup.py`

```
1. 백업 폴더 생성
   └─> data/backups/full_backup_20260129_140530/

2. 청구 데이터 백업
   ├─> ClaimDownloader로 청구 데이터 다운로드
   └─> data/downloads/ → data/backups/[폴더명]/

3. 보고서 백업
   ├─> ReportGenerator로 각 보고서 생성
   │   ├─> "청구현황"
   │   ├─> "심사결과"
   │   └─> "수납현황"
   └─> data/downloads/ → data/backups/[폴더명]/

4. 백업 정보 파일 생성
   └─> backup_info.txt
       ├─> 백업 일시
       ├─> 백업 기간
       └─> 백업 결과

5. 오래된 백업 정리
   └─> 30일 이전 백업 폴더 자동 삭제
```

**사용 예시:**
```bash
# 명령어
python main.py backup

# 실행 흐름
main.py
  └─> run_backup(config, args)
      └─> DataBackup.full_backup(start_date, end_date, report_types)
          ├─> create_backup_folder("full_backup")
          ├─> backup_claim_data()
          │   └─> ClaimDownloader.download_claim_data()
          ├─> backup_reports(["청구현황", "심사결과", "수납현황"])
          │   └─> ReportGenerator.create_and_download_report() × 3
          └─> cleanup_old_backups(30)
```

---

## 6. 정기 백업 스케줄러

### 실행 파일: `src/scheduler/backup_scheduler.py`

```
1. 스케줄러 초기화
   └─> BackupScheduler(cert_password, headless=True)

2. 스케줄 등록 (config.yaml 기반)
   ├─> 일일 백업
   │   └─> 매일 02:00에 전체 백업
   ├─> 주간 백업 (선택)
   │   └─> 매주 월요일 03:00에 전체 백업
   └─> 월간 백업
       └─> 매월 1일 04:00에 전체 백업

3. 스케줄러 실행
   └─> 무한 루프 (1분마다 체크)
       ├─> schedule.run_pending()
       └─> 예약된 시간이 되면
           ├─> Selenium 초기화
           ├─> 로그인
           ├─> 백업 수행
           ├─> 로그아웃
           └─> 브라우저 종료
```

**사용 예시:**
```bash
# 명령어
python main.py scheduler

# 실행 흐름
main.py
  └─> run_scheduler(config)
      └─> BackupScheduler
          ├─> schedule_daily_backup("02:00")
          ├─> schedule_monthly_backup(1, "04:00")
          └─> run()
              └─> [예약 시간마다]
                  └─> perform_backup("full", report_types)
                      ├─> SeleniumHelper 초기화
                      ├─> EDILogin.login()
                      ├─> DataBackup.full_backup()
                      └─> EDILogin.logout()
```

---

## 7. 파일 위치와 역할

### 설정 파일
```
.env                           # 환경변수 (인증서 비밀번호)
config/config.yaml             # 전체 설정 (백업 주기, 경로 등)
```

### 데이터 폴더
```
data/downloads/                # 다운로드된 원본 파일
data/uploads/                  # 업로드할 파일 보관
data/backups/                  # 백업된 파일
  └─ full_backup_20260129_140530/
      ├─ claim_2026-01.xlsx
      ├─ report_청구현황.xlsx
      └─ backup_info.txt
```

### 로그 파일
```
logs/edi_automation_2026-01-29.log        # 일반 로그
logs/edi_automation_error_2026-01-29.log  # 에러 로그
logs/login_error.png                      # 스크린샷 (오류 발생 시)
```

---

## 8. 실제 실행 시나리오

### 시나리오 1: 매일 아침 자동 백업

```bash
# 1. 스케줄러 시작 (Windows 작업 스케줄러 또는 백그라운드 실행)
python main.py scheduler

# 2. 매일 새벽 2시에 자동 실행
[2026-01-30 02:00:00] - 정기 백업 시작
[2026-01-30 02:00:05] - Chrome 브라우저 초기화
[2026-01-30 02:00:10] - EDI 사이트 접속
[2026-01-30 02:00:15] - 로그인 진행
[2026-01-30 02:00:25] - 로그인 성공
[2026-01-30 02:00:30] - 청구 데이터 다운로드 시작
[2026-01-30 02:02:00] - 청구 데이터 다운로드 완료
[2026-01-30 02:02:05] - 보고서 생성 시작
[2026-01-30 02:05:30] - 보고서 생성 완료
[2026-01-30 02:05:35] - 백업 완료
[2026-01-30 02:05:40] - 로그아웃
[2026-01-30 02:05:45] - 브라우저 종료
```

### 시나리오 2: 수동으로 특정 월 데이터 다운로드

```bash
# 명령어 실행
python main.py download --month 2025-12

# 실행 로그
[2026-01-29 14:30:00] - 로거 설정 완료
[2026-01-29 14:30:01] - 설정 파일 로드 성공: config/config.yaml
[2026-01-29 14:30:05] - Chrome 드라이버 초기화 성공
[2026-01-29 14:30:10] - EDI 사이트 접속: https://edi.nhis.or.kr/...
[2026-01-29 14:30:15] - 공동인증서 로그인 버튼 클릭 성공
[2026-01-29 14:30:20] - 인증서 선택 팝업으로 전환
[2026-01-29 14:30:25] - 인증서 비밀번호 입력 완료
[2026-01-29 14:30:30] - 확인 버튼 클릭 완료
[2026-01-29 14:30:45] - 로그인 성공 확인!
[2026-01-29 14:30:50] - 청구 조회 메뉴 클릭 성공
[2026-01-29 14:30:55] - 조회 기간 설정: 2025-12-01 ~ 2025-12-31
[2026-01-29 14:31:00] - 조회 버튼 클릭 성공
[2026-01-29 14:31:10] - 다운로드 버튼 클릭 성공
[2026-01-29 14:31:20] - 청구 데이터 다운로드 완료!
[2026-01-29 14:31:25] - 로그아웃 성공
[2026-01-29 14:31:30] - 드라이버 종료
```

---

## 9. 트러블슈팅 지점

### 로그인 실패 시
```
위치: src/automation/login.py → EDILogin.login()

확인사항:
1. .env 파일의 CERT_PASSWORD 확인
2. 공동인증서 유효기간 확인
3. 브라우저 확장 프로그램 설치 여부
4. logs/login_error.png 스크린샷 확인
```

### 요소를 찾을 수 없을 때
```
위치: 각 automation 모듈의 요소 선택 부분

원인:
- EDI 사이트 구조 변경
- 팝업 또는 iframe 전환 필요
- 페이지 로드 시간 부족

해결:
1. config.yaml의 implicit_wait 시간 증가
2. 해당 모듈의 선택자(selector) 업데이트 필요
3. 스크린샷으로 현재 화면 상태 확인
```

### 다운로드 실패 시
```
위치: src/automation/claim_download.py, report.py

확인사항:
1. data/downloads/ 폴더 존재 여부
2. 디스크 공간 확인
3. 파일 권한 확인
4. Chrome 다운로드 설정 확인
```

---

## 10. 디버깅 팁

### 브라우저 화면 보면서 실행
```yaml
# config/config.yaml
selenium:
  headless: false  # 브라우저 표시
```

### 상세 로그 보기
```yaml
# config/config.yaml
logging:
  level: "DEBUG"  # 모든 로그 출력
```

### 특정 단계에서 일시정지
```python
# 코드에 추가
input("계속하려면 Enter를 누르세요...")
```

### 스크린샷 저장
```python
# 자동으로 오류 발생 시 저장됨
# logs/claim_download_error.png
# logs/login_error.png 등
```

---

## 요약

1. **main.py** = 모든 작업의 시작점
2. **로그인** → EDILogin이 처리 (수동 인증서 선택 필요할 수 있음)
3. **작업 수행** → 각 automation 모듈이 처리
4. **로그 확인** → logs/ 폴더에서 진행 상황 추적
5. **결과 확인** → data/ 폴더에서 다운로드/백업 파일 확인

모든 과정은 로그에 기록되며, 오류 발생 시 자동으로 스크린샷이 저장됩니다.
