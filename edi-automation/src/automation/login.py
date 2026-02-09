"""
EDI 로그인 자동화 모듈
"""

import time
from typing import Optional
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper
from ..auth.certificate_handler import CertificateHandler


class EDILogin:
    """EDI 로그인 자동화 클래스"""

    EDI_URL = "https://edi.nhis.or.kr/homeapp/wep/m/retrieveMain.xx"

    def __init__(self, selenium_helper: SeleniumHelper, cert_handler: Optional[CertificateHandler] = None):
        """
        Args:
            selenium_helper: Selenium 헬퍼 인스턴스
            cert_handler: 인증서 핸들러 (옵션)
        """
        self.selenium = selenium_helper
        self.cert_handler = cert_handler
        self.driver = selenium_helper.driver

    def navigate_to_edi(self):
        """EDI 사이트로 이동합니다."""
        try:
            logger.info(f"EDI 사이트 접속: {self.EDI_URL}")
            self.driver.get(self.EDI_URL)
            time.sleep(2)  # 페이지 로드 대기
            return True
        except Exception as e:
            logger.error(f"EDI 사이트 접속 실패: {e}")
            return False

    def click_certificate_login(self) -> bool:
        """
        공동인증서 로그인 버튼을 클릭합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("공동인증서 로그인 버튼 찾는 중...")

            # 여러 가능한 선택자 시도
            possible_selectors = [
                (By.XPATH, "//a[contains(text(), '공동인증서')]"),
                (By.XPATH, "//button[contains(text(), '공동인증서')]"),
                (By.XPATH, "//*[contains(text(), '공동인증서') and contains(@class, 'btn')]"),
                (By.ID, "certLogin"),
                (By.CLASS_NAME, "cert-login"),
            ]

            for by, selector in possible_selectors:
                try:
                    element = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((by, selector))
                    )
                    element.click()
                    logger.info("공동인증서 로그인 버튼 클릭 성공")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("공동인증서 로그인 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"공동인증서 로그인 버튼 클릭 실패: {e}")
            return False

    def handle_certificate_selection(self, cert_password: Optional[str] = None) -> bool:
        """
        인증서 선택 및 비밀번호 입력을 처리합니다.

        참고: 실제 공동인증서 선택은 AnySign 등의 플러그인을 통해 이루어지므로,
        Selenium만으로는 완전한 자동화가 어렵습니다.
        이 메서드는 가능한 부분만 자동화하고, 필요시 사용자 개입이 필요할 수 있습니다.

        Args:
            cert_password: 인증서 비밀번호

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("인증서 선택 창 처리 중...")

            # AnySign 창이 팝업으로 뜨는 경우 처리
            # 새 창으로 전환
            time.sleep(3)  # 팝업 로드 대기

            # 현재 창 핸들 저장
            main_window = self.driver.current_window_handle

            # 모든 창 핸들 가져오기
            all_windows = self.driver.window_handles

            # 팝업 창이 있는 경우 전환
            if len(all_windows) > 1:
                for window in all_windows:
                    if window != main_window:
                        self.driver.switch_to.window(window)
                        logger.info("인증서 선택 팝업으로 전환")
                        break

            # iframe이 있는 경우 전환 시도
            try:
                iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
                if iframes:
                    self.driver.switch_to.frame(iframes[0])
                    logger.info("인증서 선택 iframe으로 전환")
            except:
                pass

            # 인증서 비밀번호 입력 필드 찾기
            if cert_password:
                password_selectors = [
                    (By.ID, "certPassword"),
                    (By.ID, "password"),
                    (By.NAME, "password"),
                    (By.XPATH, "//input[@type='password']"),
                ]

                for by, selector in password_selectors:
                    try:
                        password_input = WebDriverWait(self.driver, 5).until(
                            EC.presence_of_element_located((by, selector))
                        )
                        password_input.clear()
                        password_input.send_keys(cert_password)
                        logger.info("인증서 비밀번호 입력 완료")

                        # 확인 버튼 클릭
                        confirm_button_selectors = [
                            (By.XPATH, "//button[contains(text(), '확인')]"),
                            (By.XPATH, "//button[contains(text(), '로그인')]"),
                            (By.ID, "confirmBtn"),
                        ]

                        for btn_by, btn_selector in confirm_button_selectors:
                            try:
                                confirm_btn = self.driver.find_element(btn_by, btn_selector)
                                confirm_btn.click()
                                logger.info("확인 버튼 클릭 완료")
                                break
                            except:
                                continue

                        break
                    except:
                        continue

            # 메인 창으로 돌아가기
            self.driver.switch_to.window(main_window)

            logger.info("인증서 선택 처리 완료 (일부 수동 개입 필요할 수 있음)")
            return True

        except Exception as e:
            logger.error(f"인증서 선택 처리 실패: {e}")
            return False

    def wait_for_login_success(self, timeout: int = 30) -> bool:
        """
        로그인 성공을 기다립니다.

        Args:
            timeout: 최대 대기 시간 (초)

        Returns:
            bool: 로그인 성공 여부
        """
        try:
            logger.info("로그인 완료 대기 중...")

            # 로그인 성공 후 나타나는 요소들
            success_indicators = [
                (By.XPATH, "//*[contains(text(), '로그아웃')]"),
                (By.XPATH, "//*[contains(text(), '마이페이지')]"),
                (By.ID, "logoutBtn"),
                (By.CLASS_NAME, "user-info"),
            ]

            start_time = time.time()
            while time.time() - start_time < timeout:
                for by, selector in success_indicators:
                    try:
                        element = self.driver.find_element(by, selector)
                        if element.is_displayed():
                            logger.info("로그인 성공 확인!")
                            return True
                    except:
                        pass

                time.sleep(1)

            logger.warning(f"로그인 성공을 {timeout}초 내에 확인하지 못했습니다.")
            return False

        except Exception as e:
            logger.error(f"로그인 성공 확인 중 오류: {e}")
            return False

    def login(self, cert_password: Optional[str] = None, wait_manual: bool = True) -> bool:
        """
        전체 로그인 프로세스를 실행합니다.

        Args:
            cert_password: 인증서 비밀번호
            wait_manual: 수동 개입을 기다릴지 여부

        Returns:
            bool: 로그인 성공 여부
        """
        try:
            # 1. EDI 사이트 접속
            if not self.navigate_to_edi():
                return False

            # 2. 공동인증서 로그인 버튼 클릭
            self.click_certificate_login()

            # 3. 인증서 선택 및 비밀번호 입력
            self.handle_certificate_selection(cert_password)

            # 4. 수동 개입 대기 (인증서 선택 등)
            if wait_manual:
                logger.info("=" * 60)
                logger.info("수동으로 인증서를 선택하고 로그인을 완료해주세요.")
                logger.info("로그인 완료 후 자동으로 다음 단계로 진행됩니다.")
                logger.info("=" * 60)

            # 5. 로그인 성공 대기
            if self.wait_for_login_success(timeout=60):
                logger.info("EDI 로그인 완료!")
                time.sleep(2)  # 안정화 대기
                return True
            else:
                logger.error("로그인 실패 또는 시간 초과")
                return False

        except Exception as e:
            logger.error(f"로그인 프로세스 중 오류 발생: {e}")
            self.selenium.take_screenshot("logs/login_error.png")
            return False

    def is_logged_in(self) -> bool:
        """
        현재 로그인 상태를 확인합니다.

        Returns:
            bool: 로그인 여부
        """
        try:
            logout_indicators = [
                (By.XPATH, "//*[contains(text(), '로그아웃')]"),
                (By.ID, "logoutBtn"),
            ]

            for by, selector in logout_indicators:
                try:
                    element = self.driver.find_element(by, selector)
                    if element.is_displayed():
                        return True
                except:
                    pass

            return False

        except:
            return False

    def logout(self) -> bool:
        """
        로그아웃합니다.

        Returns:
            bool: 로그아웃 성공 여부
        """
        try:
            if not self.is_logged_in():
                logger.info("이미 로그아웃 상태입니다.")
                return True

            logout_selectors = [
                (By.XPATH, "//a[contains(text(), '로그아웃')]"),
                (By.XPATH, "//button[contains(text(), '로그아웃')]"),
                (By.ID, "logoutBtn"),
            ]

            for by, selector in logout_selectors:
                try:
                    element = self.driver.find_element(by, selector)
                    element.click()
                    logger.info("로그아웃 성공")
                    time.sleep(2)
                    return True
                except:
                    continue

            logger.warning("로그아웃 버튼을 찾을 수 없습니다.")
            return False

        except Exception as e:
            logger.error(f"로그아웃 실패: {e}")
            return False
