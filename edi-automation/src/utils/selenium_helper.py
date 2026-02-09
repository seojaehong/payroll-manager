"""
Selenium 헬퍼 모듈
웹 자동화를 위한 유틸리티 함수들을 제공합니다.
"""

import time
from typing import Optional, List
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from loguru import logger


class SeleniumHelper:
    """Selenium 웹 자동화 헬퍼 클래스"""

    def __init__(self, headless: bool = False, download_dir: Optional[str] = None):
        """
        Args:
            headless: 헤드리스 모드 사용 여부
            download_dir: 다운로드 디렉토리 경로
        """
        self.headless = headless
        self.download_dir = download_dir
        self.driver: Optional[webdriver.Chrome] = None

    def initialize_driver(self) -> webdriver.Chrome:
        """
        Chrome 드라이버를 초기화합니다.

        Returns:
            webdriver.Chrome: 초기화된 드라이버
        """
        try:
            chrome_options = Options()

            if self.headless:
                chrome_options.add_argument('--headless')

            # 일반적인 옵션 설정
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)

            # User-Agent 설정 (봇 탐지 방지)
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

            # 다운로드 디렉토리 설정
            if self.download_dir:
                prefs = {
                    "download.default_directory": self.download_dir,
                    "download.prompt_for_download": False,
                    "download.directory_upgrade": True,
                    "safebrowsing.enabled": True
                }
                chrome_options.add_experimental_option("prefs", prefs)

            # 드라이버 생성
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)

            # 암묵적 대기 설정
            self.driver.implicitly_wait(10)

            # 윈도우 최대화
            if not self.headless:
                self.driver.maximize_window()

            logger.info("Chrome 드라이버 초기화 성공")
            return self.driver

        except Exception as e:
            logger.error(f"드라이버 초기화 실패: {e}")
            raise

    def wait_for_element(self, by: By, value: str, timeout: int = 10):
        """
        요소가 나타날 때까지 대기합니다.

        Args:
            by: 검색 방법 (By.ID, By.XPATH 등)
            value: 검색 값
            timeout: 최대 대기 시간 (초)

        Returns:
            WebElement: 찾은 요소
        """
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            logger.error(f"요소를 찾을 수 없습니다: {by}={value}")
            raise

    def wait_for_clickable(self, by: By, value: str, timeout: int = 10):
        """
        요소가 클릭 가능할 때까지 대기합니다.

        Args:
            by: 검색 방법
            value: 검색 값
            timeout: 최대 대기 시간 (초)

        Returns:
            WebElement: 찾은 요소
        """
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            return element
        except TimeoutException:
            logger.error(f"클릭 가능한 요소를 찾을 수 없습니다: {by}={value}")
            raise

    def safe_click(self, by: By, value: str, timeout: int = 10) -> bool:
        """
        안전하게 요소를 클릭합니다.

        Args:
            by: 검색 방법
            value: 검색 값
            timeout: 최대 대기 시간

        Returns:
            bool: 클릭 성공 여부
        """
        try:
            element = self.wait_for_clickable(by, value, timeout)
            element.click()
            logger.debug(f"클릭 성공: {by}={value}")
            return True
        except Exception as e:
            logger.error(f"클릭 실패: {by}={value}, 오류: {e}")
            return False

    def safe_send_keys(self, by: By, value: str, keys: str, timeout: int = 10) -> bool:
        """
        안전하게 텍스트를 입력합니다.

        Args:
            by: 검색 방법
            value: 검색 값
            keys: 입력할 텍스트
            timeout: 최대 대기 시간

        Returns:
            bool: 입력 성공 여부
        """
        try:
            element = self.wait_for_element(by, value, timeout)
            element.clear()
            element.send_keys(keys)
            logger.debug(f"텍스트 입력 성공: {by}={value}")
            return True
        except Exception as e:
            logger.error(f"텍스트 입력 실패: {by}={value}, 오류: {e}")
            return False

    def switch_to_iframe(self, iframe_locator: str, by: By = By.ID, timeout: int = 10) -> bool:
        """
        iframe으로 전환합니다.

        Args:
            iframe_locator: iframe 식별자
            by: 검색 방법
            timeout: 최대 대기 시간

        Returns:
            bool: 전환 성공 여부
        """
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.frame_to_be_available_and_switch_to_it((by, iframe_locator))
            )
            logger.debug(f"iframe 전환 성공: {iframe_locator}")
            return True
        except Exception as e:
            logger.error(f"iframe 전환 실패: {iframe_locator}, 오류: {e}")
            return False

    def switch_to_default_content(self):
        """메인 컨텐츠로 돌아갑니다."""
        self.driver.switch_to.default_content()
        logger.debug("메인 컨텐츠로 전환")

    def execute_script(self, script: str, *args):
        """
        JavaScript를 실행합니다.

        Args:
            script: 실행할 JavaScript 코드
            *args: 스크립트 인자

        Returns:
            스크립트 실행 결과
        """
        try:
            result = self.driver.execute_script(script, *args)
            logger.debug("JavaScript 실행 성공")
            return result
        except Exception as e:
            logger.error(f"JavaScript 실행 실패: {e}")
            raise

    def take_screenshot(self, filename: str):
        """
        스크린샷을 저장합니다.

        Args:
            filename: 저장할 파일명
        """
        try:
            self.driver.save_screenshot(filename)
            logger.info(f"스크린샷 저장: {filename}")
        except Exception as e:
            logger.error(f"스크린샷 저장 실패: {e}")

    def close(self):
        """드라이버를 종료합니다."""
        if self.driver:
            self.driver.quit()
            logger.info("드라이버 종료")

    def __enter__(self):
        """컨텍스트 매니저 진입"""
        self.initialize_driver()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """컨텍스트 매니저 종료"""
        self.close()
