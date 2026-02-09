"""
EDI 자동화 사용 예제
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.logger import setup_logger
from src.utils.selenium_helper import SeleniumHelper
from src.automation.login import EDILogin
from src.automation.claim_download import ClaimDownloader
from src.automation.claim_upload import ClaimUploader
from src.automation.report import ReportGenerator
from src.automation.backup import DataBackup


def example_1_simple_login():
    """예제 1: 간단한 로그인 테스트"""
    print("\n" + "=" * 60)
    print("예제 1: 로그인 테스트")
    print("=" * 60)

    # 환경변수 로드
    load_dotenv()
    cert_password = os.getenv("CERT_PASSWORD")

    # Selenium 초기화
    selenium_helper = SeleniumHelper(headless=False)
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if edi_login.login(cert_password, wait_manual=True):
            print("✓ 로그인 성공!")

            # 잠시 대기
            input("계속하려면 Enter를 누르세요...")

            # 로그아웃
            edi_login.logout()
            print("✓ 로그아웃 완료!")
        else:
            print("✗ 로그인 실패")

    finally:
        selenium_helper.close()


def example_2_download_claims():
    """예제 2: 청구 데이터 다운로드"""
    print("\n" + "=" * 60)
    print("예제 2: 청구 데이터 다운로드")
    print("=" * 60)

    load_dotenv()
    cert_password = os.getenv("CERT_PASSWORD")

    selenium_helper = SeleniumHelper(
        headless=False,
        download_dir="data/downloads"
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            print("✗ 로그인 실패")
            return

        print("✓ 로그인 성공!")

        # 청구 데이터 다운로드
        downloader = ClaimDownloader(selenium_helper, "data/downloads")

        # 이번 달 데이터 다운로드
        if downloader.download_monthly_claims(2026, 1):
            print("✓ 청구 데이터 다운로드 성공!")

            # 다운로드된 파일 목록 출력
            files = downloader.get_downloaded_files()
            print(f"\n다운로드된 파일 ({len(files)}개):")
            for i, file in enumerate(files[:5], 1):
                print(f"  {i}. {file.name}")
        else:
            print("✗ 청구 데이터 다운로드 실패")

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def example_3_upload_claims():
    """예제 3: 청구 데이터 업로드"""
    print("\n" + "=" * 60)
    print("예제 3: 청구 데이터 업로드")
    print("=" * 60)

    load_dotenv()
    cert_password = os.getenv("CERT_PASSWORD")

    # 업로드할 파일이 있는지 확인
    upload_dir = Path("data/uploads")
    upload_files = list(upload_dir.glob("*.xlsx"))

    if not upload_files:
        print("✗ 업로드할 파일이 없습니다.")
        print(f"  data/uploads/ 폴더에 파일을 넣어주세요.")
        return

    selenium_helper = SeleniumHelper(headless=False)
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            print("✗ 로그인 실패")
            return

        print("✓ 로그인 성공!")

        # 청구 데이터 업로드
        uploader = ClaimUploader(selenium_helper)

        # 첫 번째 파일 업로드
        file_path = upload_files[0]
        print(f"\n업로드 중: {file_path.name}")

        if uploader.upload_claim_file(str(file_path), validate=True):
            print("✓ 파일 업로드 성공!")
        else:
            print("✗ 파일 업로드 실패")

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def example_4_generate_reports():
    """예제 4: 보고서 생성"""
    print("\n" + "=" * 60)
    print("예제 4: 보고서 생성")
    print("=" * 60)

    load_dotenv()
    cert_password = os.getenv("CERT_PASSWORD")

    selenium_helper = SeleniumHelper(
        headless=False,
        download_dir="data/downloads"
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            print("✗ 로그인 실패")
            return

        print("✓ 로그인 성공!")

        # 보고서 생성
        report_gen = ReportGenerator(selenium_helper, "data/downloads")

        # 여러 보고서 생성
        report_types = ["청구현황", "심사결과"]
        results = report_gen.generate_monthly_reports(2026, 1, report_types)

        print("\n보고서 생성 결과:")
        for report_type, result in results.items():
            status = "✓" if result == "성공" else "✗"
            print(f"  {status} {report_type}: {result}")

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def example_5_full_backup():
    """예제 5: 전체 백업"""
    print("\n" + "=" * 60)
    print("예제 5: 전체 데이터 백업")
    print("=" * 60)

    load_dotenv()
    cert_password = os.getenv("CERT_PASSWORD")

    selenium_helper = SeleniumHelper(
        headless=False,
        download_dir="data/downloads"
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            print("✗ 로그인 실패")
            return

        print("✓ 로그인 성공!")

        # 전체 백업
        backup = DataBackup(selenium_helper)

        # 이번 달 데이터 백업
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")

        report_types = ["청구현황", "심사결과", "수납현황"]

        if backup.full_backup(start_date, end_date, report_types):
            print("✓ 전체 백업 성공!")

            # 백업 목록 출력
            backups = backup.get_backup_list()
            print(f"\n백업 목록 ({len(backups)}개):")
            for i, backup_info in enumerate(backups[:5], 1):
                print(f"  {i}. {backup_info['folder_name']}")
                print(f"     생성일시: {backup_info['created_time']}")
        else:
            print("✗ 백업 실패")

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def main():
    """메인 함수"""
    # 로거 설정
    setup_logger()

    print("\n" + "=" * 60)
    print("EDI 자동화 사용 예제")
    print("=" * 60)
    print("\n사용 가능한 예제:")
    print("  1. 로그인 테스트")
    print("  2. 청구 데이터 다운로드")
    print("  3. 청구 데이터 업로드")
    print("  4. 보고서 생성")
    print("  5. 전체 백업")
    print("  0. 종료")

    while True:
        try:
            choice = input("\n실행할 예제 번호를 입력하세요 (0-5): ")

            if choice == "0":
                print("종료합니다.")
                break
            elif choice == "1":
                example_1_simple_login()
            elif choice == "2":
                example_2_download_claims()
            elif choice == "3":
                example_3_upload_claims()
            elif choice == "4":
                example_4_generate_reports()
            elif choice == "5":
                example_5_full_backup()
            else:
                print("잘못된 선택입니다. 0-5 사이의 숫자를 입력하세요.")

        except KeyboardInterrupt:
            print("\n\n프로그램을 종료합니다.")
            break
        except Exception as e:
            print(f"\n오류 발생: {e}")


if __name__ == "__main__":
    main()
