"""
보고서 및 통계 조회 모듈
"""

import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper


class ReportGenerator:
    """보고서 및 통계 조회 클래스"""

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

    def navigate_to_statistics(self) -> bool:
        """
        통계/보고서 메뉴로 이동합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("통계/보고서 메뉴로 이동 중...")

            menu_selectors = [
                (By.XPATH, "//a[contains(text(), '통계')]"),
                (By.XPATH, "//a[contains(text(), '보고서')]"),
                (By.LINK_TEXT, "통계관리"),
            ]

            for by, selector in menu_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("통계/보고서 메뉴 클릭 성공")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("통계/보고서 메뉴를 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"통계/보고서 메뉴 이동 실패: {e}")
            return False

    def select_report_type(self, report_type: str) -> bool:
        """
        보고서 유형을 선택합니다.

        Args:
            report_type: 보고서 유형 (예: "청구현황", "심사결과", "수납현황" 등)

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"보고서 유형 선택: {report_type}")

            # 드롭다운 또는 라디오 버튼으로 보고서 유형 선택
            type_selectors = [
                (By.XPATH, f"//option[contains(text(), '{report_type}')]"),
                (By.XPATH, f"//label[contains(text(), '{report_type}')]"),
                (By.XPATH, f"//input[@value='{report_type}']"),
            ]

            for by, selector in type_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("보고서 유형 선택 완료")
                    time.sleep(1)
                    return True
                except:
                    continue

            logger.warning(f"보고서 유형을 찾을 수 없습니다: {report_type}")
            return False

        except Exception as e:
            logger.error(f"보고서 유형 선택 실패: {e}")
            return False

    def set_report_period(self, start_date: str, end_date: str) -> bool:
        """
        보고서 기간을 설정합니다.

        Args:
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"보고서 기간 설정: {start_date} ~ {end_date}")

            # 시작일 입력
            start_selectors = [
                (By.ID, "reportStartDate"),
                (By.NAME, "startDate"),
                (By.XPATH, "//input[contains(@placeholder, '시작')]"),
            ]

            for by, selector in start_selectors:
                if self.selenium.safe_send_keys(by, selector, start_date.replace("-", ""), timeout=5):
                    break

            # 종료일 입력
            end_selectors = [
                (By.ID, "reportEndDate"),
                (By.NAME, "endDate"),
                (By.XPATH, "//input[contains(@placeholder, '종료')]"),
            ]

            for by, selector in end_selectors:
                if self.selenium.safe_send_keys(by, selector, end_date.replace("-", ""), timeout=5):
                    break

            logger.info("보고서 기간 설정 완료")
            return True

        except Exception as e:
            logger.error(f"보고서 기간 설정 실패: {e}")
            return False

    def generate_report(self) -> bool:
        """
        보고서를 생성합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("보고서 생성 중...")

            generate_selectors = [
                (By.XPATH, "//button[contains(text(), '생성')]"),
                (By.XPATH, "//button[contains(text(), '조회')]"),
                (By.ID, "generateBtn"),
                (By.CLASS_NAME, "btn-generate"),
            ]

            for by, selector in generate_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("보고서 생성 버튼 클릭")
                    time.sleep(5)  # 보고서 생성 대기
                    return True
                except:
                    continue

            logger.warning("보고서 생성 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"보고서 생성 실패: {e}")
            return False

    def download_report(self, file_format: str = "excel") -> bool:
        """
        생성된 보고서를 다운로드합니다.

        Args:
            file_format: 파일 형식 (excel, pdf 등)

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"{file_format} 형식으로 보고서 다운로드...")

            download_selectors = [
                (By.XPATH, f"//button[contains(text(), '{file_format}')]"),
                (By.XPATH, "//button[contains(text(), '엑셀')]"),
                (By.XPATH, "//button[contains(text(), '다운로드')]"),
                (By.ID, "downloadReportBtn"),
            ]

            for by, selector in download_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("보고서 다운로드 버튼 클릭")
                    time.sleep(5)  # 다운로드 완료 대기
                    return True
                except:
                    continue

            logger.warning("보고서 다운로드 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"보고서 다운로드 실패: {e}")
            return False

    def create_and_download_report(
        self,
        report_type: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        file_format: str = "excel"
    ) -> bool:
        """
        보고서를 생성하고 다운로드합니다.

        Args:
            report_type: 보고서 유형
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

            logger.info(f"보고서 생성 및 다운로드: {report_type} ({start_date} ~ {end_date})")

            # 1. 통계/보고서 메뉴로 이동
            if not self.navigate_to_statistics():
                return False

            # 2. 보고서 유형 선택
            if report_type:
                self.select_report_type(report_type)  # 실패해도 계속 진행

            # 3. 기간 설정
            if not self.set_report_period(start_date, end_date):
                logger.warning("기간 설정 실패, 계속 진행합니다.")

            # 4. 보고서 생성
            if not self.generate_report():
                return False

            # 5. 보고서 다운로드
            if not self.download_report(file_format):
                return False

            logger.info("보고서 생성 및 다운로드 완료!")
            return True

        except Exception as e:
            logger.error(f"보고서 생성 중 오류 발생: {e}")
            self.selenium.take_screenshot("logs/report_error.png")
            return False

    def get_statistics_summary(self) -> Dict:
        """
        화면에 표시된 통계 요약 정보를 가져옵니다.

        Returns:
            Dict: 통계 정보
        """
        try:
            logger.info("통계 요약 정보 수집 중...")

            summary = {}

            # 통계 정보가 표시되는 요소들 찾기
            stat_elements = self.driver.find_elements(By.CLASS_NAME, "stat-item")

            for element in stat_elements:
                try:
                    label = element.find_element(By.CLASS_NAME, "stat-label").text
                    value = element.find_element(By.CLASS_NAME, "stat-value").text
                    summary[label] = value
                except:
                    pass

            logger.info(f"통계 정보 수집 완료: {len(summary)}개 항목")
            return summary

        except Exception as e:
            logger.error(f"통계 정보 수집 실패: {e}")
            return {}

    def generate_monthly_reports(self, year: int, month: int, report_types: List[str]) -> Dict:
        """
        특정 월의 여러 보고서를 생성합니다.

        Args:
            year: 년도
            month: 월
            report_types: 보고서 유형 목록

        Returns:
            Dict: 각 보고서의 생성 결과
        """
        try:
            from datetime import date
            import calendar

            # 해당 월의 첫날과 마지막날
            first_day = date(year, month, 1)
            last_day_num = calendar.monthrange(year, month)[1]
            last_day = date(year, month, last_day_num)

            start_date = first_day.strftime("%Y-%m-%d")
            end_date = last_day.strftime("%Y-%m-%d")

            results = {}

            for report_type in report_types:
                logger.info(f"보고서 생성 중 ({len(results)+1}/{len(report_types)}): {report_type}")
                success = self.create_and_download_report(report_type, start_date, end_date)
                results[report_type] = "성공" if success else "실패"

            # 결과 요약
            success_count = sum(1 for v in results.values() if v == "성공")
            logger.info(f"월별 보고서 생성 완료: 성공 {success_count}/{len(report_types)}")

            return results

        except Exception as e:
            logger.error(f"월별 보고서 생성 실패: {e}")
            return {}
