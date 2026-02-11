"""
Config 기반 범용 엑셀 리더
사업장 config의 excel 섹션을 읽어서 DataFrame으로 변환
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from ..config.schema import BusinessPayrollConfig


def _find_sheet(filepath: str, config: BusinessPayrollConfig) -> str:
    """config 기반 시트 자동 선택"""
    xl = pd.ExcelFile(filepath)
    sheet_names = xl.sheet_names

    # 1순위: config에 지정된 sheetName
    if config.excel.sheetName in sheet_names:
        return config.excel.sheetName

    # 2순위: sheetKeywords 매칭
    for kw in (config.excel.sheetKeywords or []):
        for name in sheet_names:
            if kw in name:
                return name

    # 3순위: 첫 번째 시트
    return sheet_names[0]


def read_payroll_excel(
    filepath: str | Path,
    config: BusinessPayrollConfig,
    sheet_name: str | None = None,
) -> pd.DataFrame:
    """
    config 기반으로 엑셀 파일을 읽어 원시 DataFrame 반환.

    - config.excel.headerRow / dataStartRow가 있으면 무조건 신뢰 (자동감지 안 함).
    - 숨겨진 행/열을 포함하여 있는 그대로 읽음 (skipfooter, comment 없음).
    - config.excel.columns 인덱스가 실제 범위를 벗어나도 에러 없이 빈값 처리.
    """
    filepath = str(filepath)
    sheet = sheet_name or _find_sheet(filepath, config)

    # header=None: 수동 행 제어. 숨겨진 행/열 포함 전체 읽기.
    df = pd.read_excel(filepath, sheet_name=sheet, header=None)

    # config의 dataStartRow를 무조건 신뢰 (1-indexed → 0-indexed)
    data_start_idx = config.excel.dataStartRow - 1

    if data_start_idx < len(df):
        df = df.iloc[data_start_idx:].reset_index(drop=True)
    else:
        df = pd.DataFrame()

    # 컬럼 범위 안전장치: config에 정의된 최대 컬럼 인덱스가
    # 실제 DataFrame 컬럼 수를 넘는 경우, 빈 컬럼을 패딩
    if len(df) > 0 and config.excel.columns:
        max_col_1indexed = max(
            (v for v in config.excel.columns.values() if v is not None),
            default=0,
        )
        current_cols = len(df.columns)
        if max_col_1indexed > current_cols:
            for i in range(current_cols, max_col_1indexed):
                df[i] = ""

    return df


def parse_resident_no(raw: object) -> str:
    """주민번호 정규화 (비숫자 제거 + 13자리 패딩)"""
    if raw is None or pd.isna(raw):
        return ""
    digits = re.sub(r"[^0-9]", "", str(raw))
    if 0 < len(digits) < 13:
        digits = digits.zfill(13)
    return digits


def parse_date(raw: object) -> str:
    """날짜 파싱 → YYYY-MM-DD 문자열"""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return ""

    # pandas Timestamp
    if isinstance(raw, pd.Timestamp):
        return raw.strftime("%Y-%m-%d")

    # 숫자 (엑셀 시리얼)
    if isinstance(raw, (int, float)):
        try:
            ts = pd.Timestamp("1899-12-30") + pd.Timedelta(days=int(raw))
            return ts.strftime("%Y-%m-%d")
        except (ValueError, OverflowError):
            return ""

    s = str(raw).strip()

    # YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s

    # YYYYMMDD
    if re.match(r"^\d{8}$", s):
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"

    # YY.MM.DD
    m = re.match(r"^(\d{2})\.(\d{1,2})\.(\d{1,2})$", s)
    if m:
        yy, mm, dd = m.groups()
        year = f"20{yy}" if int(yy) < 50 else f"19{yy}"
        return f"{year}-{mm.zfill(2)}-{dd.zfill(2)}"

    return s


def parse_number(raw: object) -> int:
    """금액 파싱 → 정수 (원 단위 절사)"""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return 0
    if isinstance(raw, (int, float)):
        return int(raw)
    cleaned = re.sub(r"[^0-9.\-]", "", str(raw))
    try:
        return int(float(cleaned))
    except (ValueError, TypeError):
        return 0
