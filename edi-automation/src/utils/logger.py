"""
로깅 설정 모듈
"""

import sys
from pathlib import Path
from loguru import logger


def setup_logger(log_dir: str = "logs", log_level: str = "INFO"):
    """
    로거를 설정합니다.

    Args:
        log_dir: 로그 파일을 저장할 디렉토리
        log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # 기존 핸들러 제거
    logger.remove()

    # 콘솔 출력 설정
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True
    )

    # 로그 디렉토리 생성
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # 파일 출력 설정 (일반 로그)
    logger.add(
        log_path / "edi_automation_{time:YYYY-MM-DD}.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} - {message}",
        level=log_level,
        rotation="00:00",  # 매일 자정에 로그 파일 교체
        retention="30 days",  # 30일간 로그 보관
        encoding="utf-8"
    )

    # 에러 로그 파일 (ERROR 이상만 기록)
    logger.add(
        log_path / "edi_automation_error_{time:YYYY-MM-DD}.log",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} - {message}",
        level="ERROR",
        rotation="00:00",
        retention="90 days",  # 에러 로그는 90일간 보관
        encoding="utf-8"
    )

    logger.info("로거 설정 완료")
    return logger
