"""
청구 데이터 업로드 모듈
"""

import time
from pathlib import Path
from typing import Optional, List
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper


class ClaimUploader:
    """청구 데이터 업로드 클래스"""

    def __init__(self, selenium_helper: SeleniumHelper):
        """
        Args:
            selenium_helper: Selenium 헬퍼 인스턴스
        """
        self.selenium = selenium_helper
        self.driver = selenium_helper.driver

    def navigate_to_claim_upload(self) -> bool:
        """
        청구 업로드 메뉴로 이동합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("청구 업로드 메뉴로 이동 중...")

            menu_selectors = [
                (By.XPATH, "//a[contains(text(), '청구접수')]"),
                (By.XPATH, "//a[contains(text(), '청구등록')]"),
                (By.LINK_TEXT, "접수등록"),
            ]

            for by, selector in menu_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("청구 업로드 메뉴 클릭 성공")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("청구 업로드 메뉴를 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"청구 업로드 메뉴 이동 실패: {e}")
            return False

    def select_file(self, file_path: str) -> bool:
        """
        업로드할 파일을 선택합니다.

        Args:
            file_path: 업로드할 파일 경로

        Returns:
            bool: 성공 여부
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.error(f"파일을 찾을 수 없습니다: {file_path}")
                return False

            logger.info(f"파일 선택: {file_path}")

            # 파일 입력 필드 찾기
            file_input_selectors = [
                (By.XPATH, "//input[@type='file']"),
                (By.ID, "fileInput"),
                (By.NAME, "uploadFile"),
            ]

            for by, selector in file_input_selectors:
                try:
                    file_input = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((by, selector))
                    )
                    # 파일 경로를 절대 경로로 변환
                    abs_path = str(file_path.absolute())
                    file_input.send_keys(abs_path)
                    logger.info("파일 선택 완료")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("파일 입력 필드를 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"파일 선택 실패: {e}")
            return False

    def validate_file(self) -> bool:
        """
        업로드 파일을 검증합니다.

        Returns:
            bool: 검증 성공 여부
        """
        try:
            logger.info("파일 검증 중...")

            validate_selectors = [
                (By.XPATH, "//button[contains(text(), '검증')]"),
                (By.ID, "validateBtn"),
                (By.CLASS_NAME, "btn-validate"),
            ]

            for by, selector in validate_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("검증 버튼 클릭")
                    time.sleep(5)  # 검증 완료 대기

                    # 검증 결과 확인
                    success_indicators = [
                        (By.XPATH, "//*[contains(text(), '검증 성공')]"),
                        (By.XPATH, "//*[contains(text(), '오류 없음')]"),
                        (By.CLASS_NAME, "validation-success"),
                    ]

                    for success_by, success_selector in success_indicators:
                        try:
                            self.driver.find_element(success_by, success_selector)
                            logger.info("파일 검증 성공")
                            return True
                        except:
                            pass

                    # 오류 확인
                    error_indicators = [
                        (By.XPATH, "//*[contains(text(), '검증 실패')]"),
                        (By.XPATH, "//*[contains(text(), '오류')]"),
                        (By.CLASS_NAME, "validation-error"),
                    ]

                    for error_by, error_selector in error_indicators:
                        try:
                            error_elem = self.driver.find_element(error_by, error_selector)
                            logger.error(f"검증 오류: {error_elem.text}")
                            return False
                        except:
                            pass

                    logger.warning("검증 결과를 확인할 수 없습니다.")
                    return True  # 일단 계속 진행

                except:
                    continue

            logger.info("검증 버튼이 없어 검증 단계를 건너뜁니다.")
            return True

        except Exception as e:
            logger.error(f"파일 검증 실패: {e}")
            return False

    def submit_upload(self) -> bool:
        """
        업로드를 제출합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("업로드 제출 중...")

            submit_selectors = [
                (By.XPATH, "//button[contains(text(), '제출')]"),
                (By.XPATH, "//button[contains(text(), '업로드')]"),
                (By.ID, "submitBtn"),
                (By.CLASS_NAME, "btn-submit"),
            ]

            for by, selector in submit_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("제출 버튼 클릭")
                    time.sleep(3)

                    # 확인 대화상자 처리
                    try:
                        alert = self.driver.switch_to.alert
                        alert_text = alert.text
                        logger.info(f"알림 메시지: {alert_text}")
                        alert.accept()
                    except:
                        pass

                    logger.info("업로드 제출 완료")
                    return True

                except:
                    continue

            logger.warning("제출 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"업로드 제출 실패: {e}")
            return False

    def upload_claim_file(self, file_path: str, validate: bool = True) -> bool:
        """
        청구 파일을 업로드합니다.

        Args:
            file_path: 업로드할 파일 경로
            validate: 검증 수행 여부

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info(f"청구 파일 업로드 시작: {file_path}")

            # 1. 청구 업로드 메뉴로 이동
            if not self.navigate_to_claim_upload():
                return False

            # 2. 파일 선택
            if not self.select_file(file_path):
                return False

            # 3. 파일 검증 (옵션)
            if validate:
                if not self.validate_file():
                    logger.error("파일 검증 실패로 업로드를 중단합니다.")
                    return False

            # 4. 업로드 제출
            if not self.submit_upload():
                return False

            logger.info("청구 파일 업로드 완료!")
            return True

        except Exception as e:
            logger.error(f"청구 파일 업로드 중 오류 발생: {e}")
            self.selenium.take_screenshot("logs/claim_upload_error.png")
            return False

    def upload_multiple_files(self, file_paths: List[str], validate: bool = True) -> dict:
        """
        여러 청구 파일을 순차적으로 업로드합니다.

        Args:
            file_paths: 업로드할 파일 경로 목록
            validate: 검증 수행 여부

        Returns:
            dict: 각 파일의 업로드 결과
        """
        results = {}

        for file_path in file_paths:
            try:
                logger.info(f"파일 업로드 중 ({len(results)+1}/{len(file_paths)}): {file_path}")
                success = self.upload_claim_file(file_path, validate)
                results[file_path] = "성공" if success else "실패"
            except Exception as e:
                logger.error(f"파일 업로드 실패: {file_path}, 오류: {e}")
                results[file_path] = f"오류: {str(e)}"

        # 결과 요약
        success_count = sum(1 for v in results.values() if v == "성공")
        logger.info(f"업로드 완료: 성공 {success_count}/{len(file_paths)}")

        return results
