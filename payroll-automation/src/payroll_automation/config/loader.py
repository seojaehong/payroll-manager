"""
Config 로더 - payroll-manager/config/businesses/*.json 읽기
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from .schema import BusinessPayrollConfig

# config 디렉토리 경로 결정
# 1순위: 환경변수 PAYROLL_CONFIG_DIR
# 2순위: ../payroll-manager/config/businesses (상대경로)
_DEFAULT_CONFIG_REL = Path(__file__).resolve().parent.parent.parent.parent.parent / "payroll-manager" / "config" / "businesses"


def get_config_dir() -> Path:
    """config/businesses 디렉토리 경로 반환"""
    env_dir = os.environ.get("PAYROLL_CONFIG_DIR")
    if env_dir:
        return Path(env_dir)
    return _DEFAULT_CONFIG_REL


def load_config(business_id: str) -> BusinessPayrollConfig:
    """사업장 ID로 config JSON 로드 + Pydantic 검증"""
    config_dir = get_config_dir()
    config_path = config_dir / f"{business_id}.json"

    if not config_path.exists():
        raise FileNotFoundError(f"Config 파일 없음: {config_path}")

    with open(config_path, encoding="utf-8") as f:
        data = json.load(f)

    return BusinessPayrollConfig(**data)


def list_configs() -> list[str]:
    """사용 가능한 사업장 config ID 목록"""
    config_dir = get_config_dir()
    if not config_dir.exists():
        return []
    return sorted(
        p.stem
        for p in config_dir.glob("*.json")
        if not p.name.startswith("_")
    )


def load_all_configs() -> list[BusinessPayrollConfig]:
    """모든 사업장 config 로드"""
    configs = []
    for biz_id in list_configs():
        try:
            configs.append(load_config(biz_id))
        except Exception as e:
            print(f"  [WARN] {biz_id} 로드 실패: {e}")
    return configs
