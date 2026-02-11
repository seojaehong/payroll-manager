"""
급여 데이터 정합성 검증 모듈
벡터화 연산 기반 (iterrows 미사용)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import numpy as np
import pandas as pd


@dataclass
class ValidationIssue:
    """검증 이슈 1건"""
    row: int           # 0-indexed
    field: str
    level: str         # "error" | "warning"
    message: str


@dataclass
class ValidationResult:
    """검증 결과"""
    total_rows: int
    valid_rows: int
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.level == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.level == "warning")

    @property
    def is_valid(self) -> bool:
        return self.error_count == 0


# ──────────────────────────────────────────
# 벡터화된 검증 헬퍼
# ──────────────────────────────────────────

_RE_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_RE_DIGITS = re.compile(r"[^0-9]")


def _vec_validate_resident_no(series: pd.Series) -> pd.DataFrame:
    """
    주민번호 벡터 검증.
    Returns DataFrame with columns: [has_error: bool, message: str]
    """
    s = series.fillna("").astype(str).str.strip()
    digits = s.str.replace(r"[^0-9]", "", regex=True)
    digit_len = digits.str.len()

    # 조건별 에러
    empty = s == ""
    wrong_len = ~empty & (digit_len != 13)

    # 월/일 범위 (13자리인 것만 체크)
    valid_len = ~empty & (digit_len == 13)
    mm = pd.to_numeric(digits.str[2:4], errors="coerce").fillna(0).astype(int)
    dd = pd.to_numeric(digits.str[4:6], errors="coerce").fillna(0).astype(int)
    bad_month = valid_len & ((mm < 1) | (mm > 12))
    bad_day = valid_len & ((dd < 1) | (dd > 31))

    has_error = empty | wrong_len | bad_month | bad_day

    # 메시지 생성 (에러가 있는 행만)
    msg = pd.Series("", index=series.index)
    msg[empty] = "주민번호 누락"
    msg[wrong_len] = "주민번호 자릿수 오류 (" + digit_len[wrong_len].astype(str) + "자리)"
    msg[bad_month] = "주민번호 월 범위 오류 (" + mm[bad_month].astype(str) + "월)"
    msg[bad_day] = "주민번호 일 범위 오류 (" + dd[bad_day].astype(str) + "일)"

    return pd.DataFrame({"has_error": has_error, "message": msg})


def _vec_validate_date(series: pd.Series, field_name: str) -> pd.DataFrame:
    """
    날짜 벡터 검증.
    Returns DataFrame: [has_error: bool, message: str, is_empty: bool]
    """
    s = series.fillna("").astype(str).str.strip()
    is_empty = s == ""
    matches_fmt = s.str.match(r"^\d{4}-\d{2}-\d{2}$")

    # 형식 불일치 (비어있지 않은데 형식이 틀린 경우)
    bad_fmt = ~is_empty & ~matches_fmt

    # 범위 체크 (형식 맞는 것만)
    valid_fmt = ~is_empty & matches_fmt
    year = pd.to_numeric(s.str[:4], errors="coerce").fillna(0).astype(int)
    month = pd.to_numeric(s.str[5:7], errors="coerce").fillna(0).astype(int)
    day = pd.to_numeric(s.str[8:10], errors="coerce").fillna(0).astype(int)

    bad_year = valid_fmt & ((year < 1950) | (year > 2100))
    bad_month = valid_fmt & ((month < 1) | (month > 12))
    bad_day = valid_fmt & ((day < 1) | (day > 31))

    has_error = bad_fmt | bad_year | bad_month | bad_day

    msg = pd.Series("", index=series.index)
    msg[bad_fmt] = field_name + " 형식 오류 (" + s[bad_fmt] + ")"
    msg[bad_year] = field_name + " 연도 범위 오류 (" + year[bad_year].astype(str) + ")"
    msg[bad_month] = field_name + " 월 범위 오류 (" + month[bad_month].astype(str) + ")"
    msg[bad_day] = field_name + " 일 범위 오류 (" + day[bad_day].astype(str) + ")"

    return pd.DataFrame({"has_error": has_error, "message": msg, "is_empty": is_empty})


# ──────────────────────────────────────────
# 메인 검증 함수
# ──────────────────────────────────────────

def validate_wage_data(df: pd.DataFrame) -> ValidationResult:
    """
    표준화된 DataFrame의 데이터 정합성 검증 (벡터화).

    Parameters
    ----------
    df : 표준 필드명 DataFrame (map_to_standard 출력)
    """
    if len(df) == 0:
        return ValidationResult(total_rows=0, valid_rows=0)

    issues: list[ValidationIssue] = []
    # 행별 에러 존재 여부 추적
    has_error_per_row = pd.Series(False, index=df.index)

    # ── 1. 이름 누락 ──
    if "name" in df.columns:
        name_empty = df["name"].fillna("").astype(str).str.strip() == ""
        for idx in df.index[name_empty]:
            issues.append(ValidationIssue(row=idx, field="name", level="error", message="이름 누락"))
        has_error_per_row |= name_empty

    # ── 2. 주민번호 검증 ──
    if "residentNo" in df.columns:
        rno = _vec_validate_resident_no(df["residentNo"])
        for idx in df.index[rno["has_error"]]:
            issues.append(ValidationIssue(
                row=idx, field="residentNo", level="error", message=rno.at[idx, "message"]
            ))
        has_error_per_row |= rno["has_error"]

    # ── 3. 입사일 검증 ──
    if "joinDate" in df.columns:
        jd = _vec_validate_date(df["joinDate"], "입사일")
        # 누락 → warning
        for idx in df.index[jd["is_empty"]]:
            issues.append(ValidationIssue(
                row=idx, field="joinDate", level="warning", message="입사일 누락"
            ))
        # 형식/범위 에러
        for idx in df.index[jd["has_error"]]:
            issues.append(ValidationIssue(
                row=idx, field="joinDate", level="error", message=jd.at[idx, "message"]
            ))
        has_error_per_row |= jd["has_error"]

    # ── 4. 퇴사일 검증 ──
    if "leaveDate" in df.columns:
        ld = _vec_validate_date(df["leaveDate"], "퇴사일")
        for idx in df.index[ld["has_error"]]:
            issues.append(ValidationIssue(
                row=idx, field="leaveDate", level="error", message=ld.at[idx, "message"]
            ))
        has_error_per_row |= ld["has_error"]

        # 입사일 > 퇴사일 (둘 다 유효한 경우만)
        if "joinDate" in df.columns:
            jd_s = df["joinDate"].fillna("").astype(str).str.strip()
            ld_s = df["leaveDate"].fillna("").astype(str).str.strip()
            both_valid = (jd_s != "") & (ld_s != "") & ~ld["has_error"]
            if "joinDate" in df.columns:
                jd_check = _vec_validate_date(df["joinDate"], "입사일")
                both_valid &= ~jd_check["has_error"]
            reversed_dates = both_valid & (jd_s > ld_s)
            for idx in df.index[reversed_dates]:
                issues.append(ValidationIssue(
                    row=idx, field="leaveDate", level="error",
                    message=f"퇴사일({ld_s[idx]})이 입사일({jd_s[idx]})보다 빠름"
                ))
            has_error_per_row |= reversed_dates

    # ── 5. 급여 음수 체크 ──
    if "wage" in df.columns:
        wage_series = pd.to_numeric(df["wage"], errors="coerce").fillna(0)
        negative_wage = wage_series < 0
        for idx in df.index[negative_wage]:
            issues.append(ValidationIssue(
                row=idx, field="wage", level="error",
                message=f"급여 음수값 ({wage_series[idx]})"
            ))
        has_error_per_row |= negative_wage

    valid_rows = int((~has_error_per_row).sum())

    return ValidationResult(
        total_rows=len(df),
        valid_rows=valid_rows,
        issues=issues,
    )
