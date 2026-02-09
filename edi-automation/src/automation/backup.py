"""
데이터 백업 모듈
"""

import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from loguru import logger

from ..utils.selenium_helper import SeleniumHelper
from .claim_download import ClaimDownloader
from .report import ReportGenerator


class DataBackup:
    """데이터 백업 클래스"""

    def __init__(
        self,
        selenium_helper: SeleniumHelper,
        backup_base_dir: str = "data/backups"
    ):
        """
        Args:
            selenium_helper: Selenium 헬퍼 인스턴스
            backup_base_dir: 백업 기본 디렉토리
        """
        self.selenium = selenium_helper
        self.backup_base_dir = Path(backup_base_dir)
        self.backup_base_dir.mkdir(parents=True, exist_ok=True)

        # 다운로드 디렉토리
        self.download_dir = Path("data/downloads")
        self.download_dir.mkdir(parents=True, exist_ok=True)

        # 다운로더 및 리포트 생성기 초기화
        self.claim_downloader = ClaimDownloader(selenium_helper, str(self.download_dir))
        self.report_generator = ReportGenerator(selenium_helper, str(self.download_dir))

    def create_backup_folder(self, prefix: str = "backup") -> Path:
        """
        타임스탬프가 포함된 백업 폴더를 생성합니다.

        Args:
            prefix: 폴더 이름 접두사

        Returns:
            Path: 생성된 백업 폴더 경로
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_folder = self.backup_base_dir / f"{prefix}_{timestamp}"
        backup_folder.mkdir(parents=True, exist_ok=True)

        logger.info(f"백업 폴더 생성: {backup_folder}")
        return backup_folder

    def backup_claim_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        backup_folder: Optional[Path] = None
    ) -> bool:
        """
        청구 데이터를 백업합니다.

        Args:
            start_date: 시작일
            end_date: 종료일
            backup_folder: 백업 폴더 (None이면 자동 생성)

        Returns:
            bool: 성공 여부
        """
        try:
            if not backup_folder:
                backup_folder = self.create_backup_folder("claim_backup")

            logger.info("청구 데이터 백업 시작...")

            # 청구 데이터 다운로드
            if self.claim_downloader.download_claim_data(start_date, end_date):
                # 다운로드된 파일들을 백업 폴더로 이동
                downloaded_files = self.claim_downloader.get_downloaded_files()

                for file_path in downloaded_files[:10]:  # 최근 10개 파일
                    try:
                        dest = backup_folder / file_path.name
                        shutil.copy2(file_path, dest)
                        logger.info(f"파일 백업: {file_path.name}")
                    except Exception as e:
                        logger.error(f"파일 백업 실패: {file_path.name}, 오류: {e}")

                logger.info(f"청구 데이터 백업 완료: {backup_folder}")
                return True
            else:
                logger.error("청구 데이터 다운로드 실패")
                return False

        except Exception as e:
            logger.error(f"청구 데이터 백업 중 오류 발생: {e}")
            return False

    def backup_reports(
        self,
        report_types: List[str],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        backup_folder: Optional[Path] = None
    ) -> bool:
        """
        보고서를 백업합니다.

        Args:
            report_types: 백업할 보고서 유형 목록
            start_date: 시작일
            end_date: 종료일
            backup_folder: 백업 폴더 (None이면 자동 생성)

        Returns:
            bool: 성공 여부
        """
        try:
            if not backup_folder:
                backup_folder = self.create_backup_folder("report_backup")

            logger.info(f"보고서 백업 시작 ({len(report_types)}개)...")

            success_count = 0
            for report_type in report_types:
                if self.report_generator.create_and_download_report(
                    report_type, start_date, end_date
                ):
                    success_count += 1

            # 다운로드된 파일들을 백업 폴더로 이동
            downloaded_files = self.claim_downloader.get_downloaded_files()

            for file_path in downloaded_files[:len(report_types)]:
                try:
                    dest = backup_folder / file_path.name
                    shutil.copy2(file_path, dest)
                    logger.info(f"보고서 백업: {file_path.name}")
                except Exception as e:
                    logger.error(f"보고서 백업 실패: {file_path.name}, 오류: {e}")

            logger.info(f"보고서 백업 완료: {success_count}/{len(report_types)} 성공")
            return success_count > 0

        except Exception as e:
            logger.error(f"보고서 백업 중 오류 발생: {e}")
            return False

    def full_backup(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        report_types: Optional[List[str]] = None
    ) -> bool:
        """
        전체 데이터를 백업합니다 (청구 데이터 + 보고서).

        Args:
            start_date: 시작일
            end_date: 종료일
            report_types: 보고서 유형 목록

        Returns:
            bool: 성공 여부
        """
        try:
            logger.info("=" * 60)
            logger.info("전체 데이터 백업 시작")
            logger.info("=" * 60)

            # 통합 백업 폴더 생성
            backup_folder = self.create_backup_folder("full_backup")

            # 청구 데이터 백업
            claim_success = self.backup_claim_data(start_date, end_date, backup_folder)

            # 보고서 백업
            report_success = True
            if report_types:
                report_success = self.backup_reports(
                    report_types, start_date, end_date, backup_folder
                )

            # 백업 정보 파일 생성
            info_file = backup_folder / "backup_info.txt"
            with open(info_file, "w", encoding="utf-8") as f:
                f.write(f"백업 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"백업 기간: {start_date} ~ {end_date}\n")
                f.write(f"청구 데이터 백업: {'성공' if claim_success else '실패'}\n")
                f.write(f"보고서 백업: {'성공' if report_success else '실패'}\n")
                if report_types:
                    f.write(f"보고서 유형: {', '.join(report_types)}\n")

            logger.info("=" * 60)
            logger.info(f"전체 백업 완료: {backup_folder}")
            logger.info("=" * 60)

            return claim_success or report_success

        except Exception as e:
            logger.error(f"전체 백업 중 오류 발생: {e}")
            return False

    def cleanup_old_backups(self, keep_days: int = 30) -> int:
        """
        오래된 백업 파일을 삭제합니다.

        Args:
            keep_days: 보관 기간 (일)

        Returns:
            int: 삭제된 백업 폴더 수
        """
        try:
            logger.info(f"{keep_days}일 이전 백업 파일 정리 중...")

            current_time = time.time()
            deleted_count = 0

            for backup_folder in self.backup_base_dir.iterdir():
                if backup_folder.is_dir():
                    folder_time = backup_folder.stat().st_mtime
                    age_days = (current_time - folder_time) / (24 * 3600)

                    if age_days > keep_days:
                        try:
                            shutil.rmtree(backup_folder)
                            logger.info(f"백업 폴더 삭제: {backup_folder.name} (생성 후 {int(age_days)}일 경과)")
                            deleted_count += 1
                        except Exception as e:
                            logger.error(f"백업 폴더 삭제 실패: {backup_folder.name}, 오류: {e}")

            logger.info(f"백업 파일 정리 완료: {deleted_count}개 폴더 삭제")
            return deleted_count

        except Exception as e:
            logger.error(f"백업 파일 정리 중 오류 발생: {e}")
            return 0

    def get_backup_list(self) -> List[dict]:
        """
        백업 목록을 가져옵니다.

        Returns:
            List[dict]: 백업 정보 목록
        """
        try:
            backups = []

            for backup_folder in sorted(self.backup_base_dir.iterdir(), reverse=True):
                if backup_folder.is_dir():
                    # 백업 정보 파일 읽기
                    info_file = backup_folder / "backup_info.txt"
                    info = {
                        "folder_name": backup_folder.name,
                        "path": str(backup_folder),
                        "created_time": datetime.fromtimestamp(
                            backup_folder.stat().st_mtime
                        ).strftime("%Y-%m-%d %H:%M:%S"),
                    }

                    if info_file.exists():
                        with open(info_file, "r", encoding="utf-8") as f:
                            info["details"] = f.read()

                    backups.append(info)

            return backups

        except Exception as e:
            logger.error(f"백업 목록 조회 실패: {e}")
            return []
