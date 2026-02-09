"""
EDI 자동화 메인 실행 파일
"""

import os
import sys
import yaml
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.utils.logger import setup_logger
from src.utils.selenium_helper import SeleniumHelper
from src.auth.certificate_handler import CertificateHandler
from src.automation.login import EDILogin
from src.automation.claim_download import ClaimDownloader
from src.automation.claim_upload import ClaimUploader
from src.automation.report import ReportGenerator
from src.automation.backup import DataBackup
from src.scheduler.backup_scheduler import BackupScheduler
from loguru import logger


def load_config(config_path: str = "config/config.yaml") -> dict:
    """설정 파일을 로드합니다."""
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
        logger.info(f"설정 파일 로드 성공: {config_path}")
        return config
    except Exception as e:
        logger.error(f"설정 파일 로드 실패: {e}")
        return {}


def test_login(config: dict):
    """로그인 테스트"""
    logger.info("=" * 60)
    logger.info("로그인 테스트 시작")
    logger.info("=" * 60)

    # 환경변수에서 인증서 비밀번호 가져오기
    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    if not cert_password:
        logger.warning("인증서 비밀번호가 설정되지 않았습니다.")
        logger.warning(".env 파일에 CERT_PASSWORD를 설정하거나 수동으로 입력해야 합니다.")

    # Selenium 초기화
    selenium_helper = SeleniumHelper(
        headless=config.get("selenium", {}).get("headless", False),
        download_dir=config.get("download", {}).get("directory", "data/downloads")
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if edi_login.login(cert_password, wait_manual=True):
            logger.info("로그인 성공!")

            # 로그아웃
            input("\n계속하려면 Enter를 누르세요...")
            edi_login.logout()
        else:
            logger.error("로그인 실패")

    finally:
        selenium_helper.close()


def download_claims(config: dict, args):
    """청구 데이터 다운로드"""
    logger.info("=" * 60)
    logger.info("청구 데이터 다운로드 시작")
    logger.info("=" * 60)

    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    selenium_helper = SeleniumHelper(
        headless=config.get("selenium", {}).get("headless", False),
        download_dir=config.get("download", {}).get("directory", "data/downloads")
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            logger.error("로그인 실패")
            return

        # 청구 데이터 다운로드
        downloader = ClaimDownloader(
            selenium_helper,
            config.get("download", {}).get("directory", "data/downloads")
        )

        if args.month:
            # 월별 다운로드
            year, month = map(int, args.month.split("-"))
            downloader.download_monthly_claims(year, month)
        else:
            # 기간별 다운로드
            downloader.download_claim_data(args.start_date, args.end_date)

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def upload_claims(config: dict, args):
    """청구 데이터 업로드"""
    logger.info("=" * 60)
    logger.info("청구 데이터 업로드 시작")
    logger.info("=" * 60)

    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    selenium_helper = SeleniumHelper(
        headless=config.get("selenium", {}).get("headless", False)
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            logger.error("로그인 실패")
            return

        # 청구 데이터 업로드
        uploader = ClaimUploader(selenium_helper)

        if args.file:
            # 단일 파일 업로드
            uploader.upload_claim_file(
                args.file,
                validate=config.get("upload", {}).get("validate_before_upload", True)
            )
        elif args.directory:
            # 디렉토리 내 모든 파일 업로드
            upload_dir = Path(args.directory)
            files = list(upload_dir.glob("*.*"))
            uploader.upload_multiple_files(
                [str(f) for f in files],
                validate=config.get("upload", {}).get("validate_before_upload", True)
            )

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def generate_reports(config: dict, args):
    """보고서 생성"""
    logger.info("=" * 60)
    logger.info("보고서 생성 시작")
    logger.info("=" * 60)

    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    selenium_helper = SeleniumHelper(
        headless=config.get("selenium", {}).get("headless", False),
        download_dir=config.get("download", {}).get("directory", "data/downloads")
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=True):
            logger.error("로그인 실패")
            return

        # 보고서 생성
        report_gen = ReportGenerator(
            selenium_helper,
            config.get("download", {}).get("directory", "data/downloads")
        )

        if args.month:
            # 월별 보고서
            year, month = map(int, args.month.split("-"))
            report_types = args.types or config.get("backup", {}).get("report_types", [])
            report_gen.generate_monthly_reports(year, month, report_types)
        else:
            # 단일 보고서
            report_gen.create_and_download_report(
                args.type,
                args.start_date,
                args.end_date
            )

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def run_backup(config: dict, args):
    """백업 실행"""
    logger.info("=" * 60)
    logger.info("백업 시작")
    logger.info("=" * 60)

    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    selenium_helper = SeleniumHelper(
        headless=config.get("selenium", {}).get("headless", True),
        download_dir=config.get("download", {}).get("directory", "data/downloads")
    )
    selenium_helper.initialize_driver()

    try:
        # 로그인
        edi_login = EDILogin(selenium_helper)
        if not edi_login.login(cert_password, wait_manual=False):
            logger.error("로그인 실패")
            return

        # 백업 실행
        backup = DataBackup(selenium_helper)
        report_types = config.get("backup", {}).get("report_types", [])

        backup.full_backup(
            start_date=args.start_date,
            end_date=args.end_date,
            report_types=report_types
        )

        # 로그아웃
        edi_login.logout()

    finally:
        selenium_helper.close()


def run_scheduler(config: dict):
    """스케줄러 실행"""
    logger.info("=" * 60)
    logger.info("스케줄러 시작")
    logger.info("=" * 60)

    cert_password = os.getenv("CERT_PASSWORD") or config.get("login", {}).get("cert_password")

    scheduler = BackupScheduler(
        cert_password=cert_password,
        headless=config.get("selenium", {}).get("headless", True)
    )

    # 설정에 따라 스케줄 등록
    scheduler_config = config.get("scheduler", {})
    report_types = config.get("backup", {}).get("report_types", [])

    # 일일 백업
    if scheduler_config.get("daily_backup", {}).get("enabled", False):
        scheduler.schedule_daily_backup(
            time_str=scheduler_config["daily_backup"].get("time", "02:00"),
            backup_type=scheduler_config["daily_backup"].get("type", "full"),
            report_types=report_types
        )

    # 주간 백업
    if scheduler_config.get("weekly_backup", {}).get("enabled", False):
        scheduler.schedule_weekly_backup(
            day=scheduler_config["weekly_backup"].get("day", "monday"),
            time_str=scheduler_config["weekly_backup"].get("time", "03:00"),
            backup_type=scheduler_config["weekly_backup"].get("type", "full"),
            report_types=report_types
        )

    # 월간 백업
    if scheduler_config.get("monthly_backup", {}).get("enabled", False):
        scheduler.schedule_monthly_backup(
            day=scheduler_config["monthly_backup"].get("day", 1),
            time_str=scheduler_config["monthly_backup"].get("time", "04:00"),
            backup_type=scheduler_config["monthly_backup"].get("type", "full"),
            report_types=report_types
        )

    # 등록된 작업 목록 출력
    scheduler.list_jobs()

    # 스케줄러 실행
    scheduler.run()


def main():
    """메인 함수"""
    # 환경변수 로드
    load_dotenv()

    # 설정 로드
    config = load_config()

    # 로거 설정
    setup_logger(
        log_dir=config.get("logging", {}).get("directory", "logs"),
        log_level=config.get("logging", {}).get("level", "INFO")
    )

    # 명령행 인자 파싱
    parser = argparse.ArgumentParser(description="EDI 자동화 도구")
    subparsers = parser.add_subparsers(dest="command", help="실행할 명령")

    # 로그인 테스트
    subparsers.add_parser("test-login", help="로그인 테스트")

    # 청구 다운로드
    download_parser = subparsers.add_parser("download", help="청구 데이터 다운로드")
    download_parser.add_argument("--start-date", help="시작일 (YYYY-MM-DD)")
    download_parser.add_argument("--end-date", help="종료일 (YYYY-MM-DD)")
    download_parser.add_argument("--month", help="월 (YYYY-MM)")

    # 청구 업로드
    upload_parser = subparsers.add_parser("upload", help="청구 데이터 업로드")
    upload_parser.add_argument("--file", help="업로드할 파일")
    upload_parser.add_argument("--directory", help="업로드할 파일들이 있는 디렉토리")

    # 보고서 생성
    report_parser = subparsers.add_parser("report", help="보고서 생성")
    report_parser.add_argument("--type", help="보고서 유형")
    report_parser.add_argument("--types", nargs="+", help="보고서 유형들 (여러 개)")
    report_parser.add_argument("--start-date", help="시작일 (YYYY-MM-DD)")
    report_parser.add_argument("--end-date", help="종료일 (YYYY-MM-DD)")
    report_parser.add_argument("--month", help="월 (YYYY-MM)")

    # 백업
    backup_parser = subparsers.add_parser("backup", help="데이터 백업")
    backup_parser.add_argument("--start-date", help="시작일 (YYYY-MM-DD)")
    backup_parser.add_argument("--end-date", help="종료일 (YYYY-MM-DD)")

    # 스케줄러
    subparsers.add_parser("scheduler", help="스케줄러 실행")

    args = parser.parse_args()

    # 명령 실행
    if args.command == "test-login":
        test_login(config)
    elif args.command == "download":
        download_claims(config, args)
    elif args.command == "upload":
        upload_claims(config, args)
    elif args.command == "report":
        generate_reports(config, args)
    elif args.command == "backup":
        run_backup(config, args)
    elif args.command == "scheduler":
        run_scheduler(config)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
