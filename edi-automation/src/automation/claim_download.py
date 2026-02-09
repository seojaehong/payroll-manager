"""
청구 데이터 조회 및 다운로드 모듈
"""

import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper


class ClaimDownloader:
    """청구 데이터 다운로드 클래스"""

    def __init__(self, selenium_helper: SeleniumHelper, download_dir: str):
        """
        Args:
            selenium_helper: Selenium 헬퍼 인스턴스
            download_dir: 다운로드 디렉토리
        """
        self.selenium = selenium_helper
        self.driver = selenium_helper.driver
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)

    def navigate_to_claim_inquiry(self) -> bool:
        """
        청구 조회 메뉴로 이동합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("청구 조회 메뉴로 이동 중...")

            # 메뉴 클릭 시도
            menu_selectors = [
                (By.XPATH, "//a[contains(text(), '청구조회')]"),
                (By.XPATH, "//a[contains(text(), '진료비청구')]"),
                (By.LINK_TEXT, "청구관리"),
            ]

            for by, selector in menu_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("청구 조회 메뉴 클릭 성공")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("청구 조회 메뉴를 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"청구 조회 메뉴 이동 실패: {e}")
            return False

    def set_date_range(self, start_date: str, end_date: str) -> bool:
        """
        조회 기간을 설정합니다.

        Args:
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"조회 기간 설정: {start_date} ~ {end_date}")

            # 시작일 입력
            start_date_selectors = [
                (By.ID, "startDate"),
                (By.NAME, "startDate"),
                (By.XPATH, "//input[contains(@placeholder, '시작일')]"),
            ]

            for by, selector in start_date_selectors:
                if self.selenium.safe_send_keys(by, selector, start_date.replace("-", ""), timeout=5):
                    break

            # 종료일 입력
            end_date_selectors = [
                (By.ID, "endDate"),
                (By.NAME, "endDate"),
                (By.XPATH, "//input[contains(@placeholder, '종료일')]"),
            ]

            for by, selector in end_date_selectors:
                if self.selenium.safe_send_keys(by, selector, end_date.replace("-", ""), timeout=5):
                    break

            logger.info("조회 기간 설정 완료")
            return True

        except Exception as e:
            logger.error(f"조회 기간 설정 실패: {e}")
            return False

    def click_search(self) -> bool:
        """
        조회 버튼을 클릭합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("조회 버튼 클릭 중...")

            search_selectors = [
                (By.XPATH, "//button[contains(text(), '조회')]"),
                (By.ID, "searchBtn"),
                (By.CLASS_NAME, "btn-search"),
            ]

            for by, selector in search_selectors:
                if self.selenium.safe_click(by, selector, timeout=5):
                    logger.info("조회 버튼 클릭 성공")
                    time.sleep(3)  # 검색 결과 로딩 대기
                    return True

            logger.warning("조회 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"조회 버튼 클릭 실패: {e}")
            return False

    def download_results(self, file_format: str = "excel") -> bool:
        """
        조회 결과를 다운로드합니다.

        Args:
            file_format: 파일 형식 (excel, pdf, csv 등)

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"{file_format} 형식으로 다운로드 시작...")

            # 다운로드 버튼 찾기
            download_selectors = [
                (By.XPATH, f"//button[contains(text(), '{file_format}')]"),
                (By.XPATH, f"//button[contains(text(), '엑셀')]"),
                (By.XPATH, "//button[contains(text(), '다운로드')]"),
                (By.ID, "downloadBtn"),
                (By.CLASS_NAME, "btn-download"),
            ]

            for by, selector in download_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("다운로드 버튼 클릭 성공")
                    time.sleep(5)  # 다운로드 완료 대기
                    return True
                except:
                    continue

            logger.warning("다운로드 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"다운로드 실패: {e}")
            return False

    def download_claim_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        file_format: str = "excel"
    ) -> bool:
        """
        청구 데이터를 조회하고 다운로드합니다.

        Args:
            start_date: 시작일 (기본값: 이번 달 1일)
            end_date: 종료일 (기본값: 오늘)
            file_format: 파일 형식

        Returns:
            bool: 성공 여부
        """
        try:
            # 기본 날짜 설정
            if not start_date:
                start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")

            logger.info(f"청구 데이터 다운로드 시작: {start_date} ~ {end_date}")

            # 1. 청구 조회 메뉴로 이동
            if not self.navigate_to_claim_inquiry():
                return False

            # 2. 조회 기간 설정
            if not self.set_date_range(start_date, end_date):
                return False

            # 3. 조회 실행
            if not self.click_search():
                return False

            # 4. 결과 다운로드
            if not self.download_results(file_format):
                return False

            logger.info("청구 데이터 다운로드 완료!")
            return True

        except Exception as e:
            logger.error(f"청구 데이터 다운로드 중 오류 발생: {e}")
            self.selenium.take_screenshot("logs/claim_download_error.png")
            return False

    def download_monthly_claims(self, year: int, month: int) -> bool:
        """
        특정 월의 청구 데이터를 다운로드합니다.

        Args:
            year: 년도
            month: 월

        Returns:
            bool: 성공 여부
        """
        try:
            from datetime import date
            import calendar

            # 해당 월의 첫날과 마지막날 계산
            first_day = date(year, month, 1)
            last_day_num = calendar.monthrange(year, month)[1]
            last_day = date(year, month, last_day_num)

            start_date = first_day.strftime("%Y-%m-%d")
            end_date = last_day.strftime("%Y-%m-%d")

            logger.info(f"{year}년 {month}월 청구 데이터 다운로드")
            return self.download_claim_data(start_date, end_date)

        except Exception as e:
            logger.error(f"월별 청구 데이터 다운로드 실패: {e}")
            return False

    def get_downloaded_files(self) -> List[Path]:
        """
        다운로드된 파일 목록을 반환합니다.

        Returns:
            List[Path]: 다운로드된 파일 경로 목록
        """
        try:
            files = sorted(
                self.download_dir.glob("*"),
                key=lambda x: x.stat().st_mtime,
                reverse=True
            )
            return files
        except Exception as e:
            logger.error(f"다운로드 파일 목록 조회 실패: {e}")
            return []
