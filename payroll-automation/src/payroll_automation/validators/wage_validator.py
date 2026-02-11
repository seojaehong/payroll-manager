"""
급여 데이터 정합성 검증 모듈
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

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


def _validate_resident_no(value: str) -> str | None:
    """주민번호 검증 → 에러 메시지 or None"""
    if not value:
        return "주민번호 누락"

    digits = re.sub(r"[^0-9]", "", value)
    if len(digits) != 13:
        return f"주민번호 자릿수 오류 ({len(digits)}자리)"

    # 생년월일 범위 체크
    yy = int(digits[0:2])
    mm = int(digits[2:4])
    dd = int(digits[4:6])
    if mm < 1 or mm > 12:
        return f"주민번호 월 범위 오류 ({mm}월)"
    if dd < 1 or dd > 31:
        return f"주민번호 일 범위 오류 ({dd}일)"

    return None


def _validate_date(value: str, field_name: str) -> str | None:
    """날짜 검증"""
    if not value:
        return None  # 선택 필드

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        return f"{field_name} 형식 오류 ({value})"

    parts = value.split("-")
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
    if year < 1950 or year > 2100:
        return f"{field_name} 연도 범위 오류 ({year})"
    if month < 1 or month > 12:
        return f"{field_name} 월 범위 오류 ({month})"
    if day < 1 or day > 31:
        return f"{field_name} 일 범위 오류 ({day})"

    return None


def validate_wage_data(df: pd.DataFrame) -> ValidationResult:
    """
    표준화된 DataFrame의 데이터 정합성 검증.

    Parameters
    ----------
    df : 표준 필드명 DataFrame (map_to_standard 출력)
    """
    issues: list[ValidationIssue] = []
    valid_count = 0

    for idx, row in df.iterrows():
        row_issues: list[ValidationIssue] = []

        # 이름 체크
        name = str(row.get("name", "")).strip()
        if not name:
            row_issues.append(ValidationIssue(
                row=idx, field="name", level="error", message="이름 누락"
            ))

        # 주민번호 체크
        resident_no = str(row.get("residentNo", "")).strip()
        err = _validate_resident_no(resident_no)
        if err:
            row_issues.append(ValidationIssue(
                row=idx, field="residentNo", level="error", message=err
            ))

        # 입사일 체크
        join_date = str(row.get("joinDate", "")).strip()
        if not join_date:
            row_issues.append(ValidationIssue(
                row=idx, field="joinDate", level="warning", message="입사일 누락"
            ))
        else:
            err = _validate_date(join_date, "입사일")
            if err:
                row_issues.append(ValidationIssue(
                    row=idx, field="joinDate", level="error", message=err
                ))

        # 퇴사일 체크
        leave_date = str(row.get("leaveDate", "")).strip()
        if leave_date:
            err = _validate_date(leave_date, "퇴사일")
            if err:
                row_issues.append(ValidationIssue(
                    row=idx, field="leaveDate", level="error", message=err
                ))

            # 입사일 > 퇴사일 체크
            if join_date and leave_date and join_date > leave_date:
                row_issues.append(ValidationIssue(
                    row=idx, field="leaveDate", level="error",
                    message=f"퇴사일({leave_date})이 입사일({join_date})보다 빠름"
                ))

        # 급여 체크
        wage = row.get("wage", 0)
        if isinstance(wage, (int, float)) and wage < 0:
            row_issues.append(ValidationIssue(
                row=idx, field="wage", level="error",
                message=f"급여 음수값 ({wage})"
            ))

        if not row_issues:
            valid_count += 1
        issues.extend(row_issues)

    return ValidationResult(
        total_rows=len(df),
        valid_rows=valid_count,
        issues=issues,
    )
