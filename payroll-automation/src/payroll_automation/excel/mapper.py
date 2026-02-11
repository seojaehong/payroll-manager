"""
Config 기반 컬럼 매퍼
원시 DataFrame의 컬럼 인덱스를 표준 필드명으로 변환
"""
from __future__ import annotations

import pandas as pd

from ..config.schema import BusinessPayrollConfig
from .reader import parse_date, parse_number, parse_resident_no


# 표준 필드 → 파서 매핑
_PARSERS: dict[str, callable] = {
    "residentNo": parse_resident_no,
    "joinDate": parse_date,
    "leaveDate": parse_date,
}

# 금액 필드 (자동으로 parse_number 적용)
_MONEY_FIELDS = {
    "wage", "basicWage", "totalWage",
    "mealAllowance", "carAllowance", "childcareAllowance",
    "overtimePay", "nightPay", "holidayPay", "bonus",
    "nationalPension", "healthInsurance", "longTermCare",
    "employmentInsurance", "incomeTax", "localIncomeTax",
    "totalDeduction", "netPay",
}


def map_to_standard(
    df: pd.DataFrame,
    config: BusinessPayrollConfig,
) -> pd.DataFrame:
    """
    원시 DataFrame → 표준 필드명 DataFrame.

    config.excel.columns에서 {필드: 1-indexed 컬럼번호} 매핑을 읽어
    해당 필드에 맞는 파서를 자동 적용.
    """
    columns = config.excel.columns
    result: dict[str, list] = {}

    for field, col_1indexed in columns.items():
        if col_1indexed is None:
            continue

        col_idx = col_1indexed - 1  # 0-indexed

        if col_idx < 0 or col_idx >= len(df.columns):
            continue

        raw_series = df.iloc[:, col_idx]

        # 필드별 파서 적용
        if field in _PARSERS:
            result[field] = [_PARSERS[field](v) for v in raw_series]
        elif field in _MONEY_FIELDS:
            result[field] = [parse_number(v) for v in raw_series]
        else:
            # 기본: 문자열 변환 (NaN → 빈 문자열)
            result[field] = [
                "" if pd.isna(v) else str(v).strip()
                for v in raw_series
            ]

    mapped = pd.DataFrame(result)

    # 빈 행 제거 (이름이 비어있으면 skip)
    if "name" in mapped.columns:
        mapped = mapped[mapped["name"].str.strip() != ""].reset_index(drop=True)

    return mapped
