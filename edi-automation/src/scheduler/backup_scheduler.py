"""
정기 백업 스케줄러 모듈
"""

import schedule
import time
from datetime import datetime, timedelta
from typing import Callable, Optional, List
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper
from ..automation.login import EDILogin
from ..automation.backup import DataBackup


class BackupScheduler:
    """정기 백업 스케줄러 클래스"""

    def __init__(
        self,
        cert_password: Optional[str] = None,
        headless: bool = True
    ):
        """
        Args:
            cert_password: 인증서 비밀번호
            headless: 헤드리스 모드 사용 여부
        """
        self.cert_password = cert_password
        self.headless = headless
        self.is_running = False

    def perform_backup(
        self,
        backup_type: str = "full",
        report_types: Optional[List[str]] = None
    ):
        """
        백업 작업을 수행합니다.

        Args:
            backup_type: 백업 유형 (full, claim, report)
            report_types: 보고서 유형 목록
        """
        try:
            logger.info("=" * 60)
            logger.info(f"정기 백업 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"백업 유형: {backup_type}")
            logger.info("=" * 60)

            # Selenium 초기화
            selenium_helper = SeleniumHelper(
                headless=self.headless,
                download_dir="data/downloads"
            )
            selenium_helper.initialize_driver()

            try:
                # 로그인
                edi_login = EDILogin(selenium_helper)
                if not edi_login.login(self.cert_password, wait_manual=False):
                    logger.error("로그인 실패로 백업을 중단합니다.")
                    return

                # 백업 수행
                data_backup = DataBackup(selenium_helper)

                # 기간 설정 (이번 달)
                start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
                end_date = datetime.now().strftime("%Y-%m-%d")

                if backup_type == "full":
                    data_backup.full_backup(
                        start_date=start_date,
                        end_date=end_date,
                        report_types=report_types
                    )
                elif backup_type == "claim":
                    data_backup.backup_claim_data(start_date, end_date)
                elif backup_type == "report":
                    if report_types:
                        data_backup.backup_reports(
                            report_types, start_date, end_date
                        )

                # 로그아웃
                edi_login.logout()

                # 오래된 백업 정리 (30일 이전)
                data_backup.cleanup_old_backups(keep_days=30)

                logger.info("=" * 60)
                logger.info("정기 백업 완료")
                logger.info("=" * 60)

            finally:
                selenium_helper.close()

        except Exception as e:
            logger.error(f"백업 작업 중 오류 발생: {e}")

    def schedule_daily_backup(
        self,
        time_str: str = "02:00",
        backup_type: str = "full",
        report_types: Optional[List[str]] = None
    ):
        """
        매일 정해진 시간에 백업을 실행하도록 스케줄링합니다.

        Args:
            time_str: 실행 시간 (HH:MM 형식)
            backup_type: 백업 유형
            report_types: 보고서 유형 목록
        """
        logger.info(f"일일 백업 스케줄 등록: 매일 {time_str}")

        schedule.every().day.at(time_str).do(
            self.perform_backup,
            backup_type=backup_type,
            report_types=report_types
        )

    def schedule_weekly_backup(
        self,
        day: str = "monday",
        time_str: str = "02:00",
        backup_type: str = "full",
        report_types: Optional[List[str]] = None
    ):
        """
        매주 정해진 요일과 시간에 백업을 실행하도록 스케줄링합니다.

        Args:
            day: 요일 (monday, tuesday, ..., sunday)
            time_str: 실행 시간 (HH:MM 형식)
            backup_type: 백업 유형
            report_types: 보고서 유형 목록
        """
        logger.info(f"주간 백업 스케줄 등록: 매주 {day} {time_str}")

        getattr(schedule.every(), day.lower()).at(time_str).do(
            self.perform_backup,
            backup_type=backup_type,
            report_types=report_types
        )

    def schedule_monthly_backup(
        self,
        day: int = 1,
        time_str: str = "02:00",
        backup_type: str = "full",
        report_types: Optional[List[str]] = None
    ):
        """
        매월 정해진 날짜와 시간에 백업을 실행하도록 스케줄링합니다.

        Args:
            day: 일 (1-31)
            time_str: 실행 시간 (HH:MM 형식)
            backup_type: 백업 유형
            report_types: 보고서 유형 목록
        """
        logger.info(f"월간 백업 스케줄 등록: 매월 {day}일 {time_str}")

        def monthly_job():
            if datetime.now().day == day:
                self.perform_backup(backup_type, report_types)

        schedule.every().day.at(time_str).do(monthly_job)

    def run(self):
        """
        스케줄러를 실행합니다.
        """
        self.is_running = True
        logger.info("백업 스케줄러 시작")
        logger.info(f"등록된 작업 수: {len(schedule.jobs)}")

        try:
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # 1분마다 체크
        except KeyboardInterrupt:
            logger.info("사용자에 의해 스케줄러 중지")
        finally:
            self.is_running = False
            logger.info("백업 스케줄러 종료")

    def stop(self):
        """
        스케줄러를 중지합니다.
        """
        self.is_running = False
        logger.info("스케줄러 중지 요청")

    def list_jobs(self):
        """
        등록된 작업 목록을 출력합니다.
        """
        logger.info("=" * 60)
        logger.info("등록된 백업 작업 목록")
        logger.info("=" * 60)

        for i, job in enumerate(schedule.jobs, 1):
            logger.info(f"{i}. {job}")

        logger.info("=" * 60)

    def clear_all_jobs(self):
        """
        모든 스케줄 작업을 제거합니다.
        """
        schedule.clear()
        logger.info("모든 백업 스케줄 작업이 제거되었습니다.")
