"""
공동인증서 처리 모듈
NPKI 인증서를 읽고 처리하는 기능을 제공합니다.
"""

import os
import base64
from pathlib import Path
from typing import Optional, Dict
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend
from cryptography import x509
from loguru import logger


class CertificateHandler:
    """공동인증서 관리 클래스"""

    def __init__(self, cert_path: str, cert_password: str):
        """
        Args:
            cert_path: NPKI 인증서 폴더 경로 (예: C:/NPKI/yessign/)
            cert_password: 인증서 비밀번호
        """
        self.cert_path = Path(cert_path)
        self.cert_password = cert_password
        self.certificate = None
        self.private_key = None

    def load_certificate(self) -> bool:
        """
        NPKI 인증서와 개인키를 로드합니다.

        Returns:
            bool: 성공 여부
        """
        try:
            # NPKI 폴더 구조: signCert.der (인증서), signPri.key (암호화된 개인키)
            cert_file = self.cert_path / "signCert.der"
            key_file = self.cert_path / "signPri.key"

            if not cert_file.exists():
                logger.error(f"인증서 파일을 찾을 수 없습니다: {cert_file}")
                return False

            if not key_file.exists():
                logger.error(f"개인키 파일을 찾을 수 없습니다: {key_file}")
                return False

            # 인증서 로드 (DER 형식)
            with open(cert_file, 'rb') as f:
                cert_data = f.read()
                self.certificate = x509.load_der_x509_certificate(cert_data, default_backend())

            # 개인키 로드 (암호화된 형식)
            with open(key_file, 'rb') as f:
                key_data = f.read()
                # NPKI 개인키는 보통 SEED 알고리즘으로 암호화되어 있음
                # 실제 복호화는 더 복잡한 처리가 필요할 수 있음
                try:
                    self.private_key = serialization.load_der_private_key(
                        key_data,
                        password=self.cert_password.encode(),
                        backend=default_backend()
                    )
                except Exception as e:
                    logger.warning(f"표준 방식으로 개인키 로드 실패: {e}")
                    logger.info("NPKI 전용 라이브러리가 필요할 수 있습니다.")
                    return False

            logger.info("인증서 로드 성공")
            return True

        except Exception as e:
            logger.error(f"인증서 로드 중 오류 발생: {e}")
            return False

    def get_certificate_info(self) -> Dict:
        """
        인증서 정보를 반환합니다.

        Returns:
            Dict: 인증서 정보 (주체, 발급자, 유효기간 등)
        """
        if not self.certificate:
            return {}

        return {
            "subject": self.certificate.subject.rfc4514_string(),
            "issuer": self.certificate.issuer.rfc4514_string(),
            "serial_number": str(self.certificate.serial_number),
            "not_valid_before": self.certificate.not_valid_before_utc.isoformat(),
            "not_valid_after": self.certificate.not_valid_after_utc.isoformat(),
        }

    def sign_data(self, data: str) -> Optional[str]:
        """
        데이터에 전자서명합니다.

        Args:
            data: 서명할 데이터

        Returns:
            str: Base64 인코딩된 서명 값
        """
        if not self.private_key:
            logger.error("개인키가 로드되지 않았습니다.")
            return None

        try:
            # 데이터 서명
            signature = self.private_key.sign(
                data.encode(),
                padding.PKCS1v15(),
                hashes.SHA256()
            )

            # Base64 인코딩
            return base64.b64encode(signature).decode()

        except Exception as e:
            logger.error(f"서명 중 오류 발생: {e}")
            return None

    def get_certificate_base64(self) -> Optional[str]:
        """
        인증서를 Base64 인코딩하여 반환합니다.

        Returns:
            str: Base64 인코딩된 인증서
        """
        if not self.certificate:
            return None

        cert_der = self.certificate.public_bytes(serialization.Encoding.DER)
        return base64.b64encode(cert_der).decode()

    @staticmethod
    def find_npki_folders() -> list:
        """
        시스템에서 NPKI 폴더를 찾습니다.

        Returns:
            list: NPKI 폴더 경로 목록
        """
        npki_folders = []

        # Windows 기본 NPKI 경로
        possible_paths = [
            Path.home() / "AppData" / "LocalLow" / "NPKI",
            Path("C:/NPKI"),
            Path("C:/Program Files/NPKI"),
        ]

        for path in possible_paths:
            if path.exists():
                # 하위 인증기관 폴더 찾기
                for subdir in path.iterdir():
                    if subdir.is_dir():
                        # USER 폴더 내 개인 인증서 찾기
                        user_folder = subdir / "USER"
                        if user_folder.exists():
                            for cert_folder in user_folder.iterdir():
                                if cert_folder.is_dir():
                                    if (cert_folder / "signCert.der").exists():
                                        npki_folders.append(str(cert_folder))

        return npki_folders
