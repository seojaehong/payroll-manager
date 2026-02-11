"""
상실신고서 생성 모듈
엑셀 급여 데이터에서 퇴사자를 추출하여 4대보험 상실신고서 데이터 생성
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd

from ..config.schema import BusinessPayrollConfig


@dataclass
class LossRecord:
    """상실신고 1건 데이터"""
    name: str
    resident_no: str
    leave_date: str             # YYYY-MM-DD
    loss_type: str = "1"        # 상실유형 (1=퇴직)
    last_wage: int = 0          # 마지막 보수월액
    avg_daily_wage: int = 0     # 평균임금 (일)
    retirement_eligible: bool = False  # 퇴직금 대상


@dataclass
class LossReport:
    """상실신고서 전체"""
    business_id: str
    business_name: str
    year_month: str
    records: list[LossRecord] = field(default_factory=list)
    generated_at: str = ""

    def __post_init__(self):
        if not self.generated_at:
            self.generated_at = datetime.now().isoformat()


def _is_retirement_eligible(join_date: str, leave_date: str) -> bool:
    """퇴직금 수급 자격 (1년 이상 근속)"""
    if not join_date or not leave_date:
        return False
    try:
        join = datetime.strptime(join_date, "%Y-%m-%d")
        leave = datetime.strptime(leave_date, "%Y-%m-%d")
        return (leave - join).days >= 365
    except ValueError:
        return False


def generate_loss_report(
    df: pd.DataFrame,
    config: BusinessPayrollConfig,
    year_month: str,
) -> LossReport:
    """
    표준화된 DataFrame에서 상실신고 대상을 추출.

    Parameters
    ----------
    df : 표준 필드명 DataFrame (map_to_standard 출력)
    config : 사업장 config
    year_month : 대상 월 (YYYY-MM)
    """
    records: list[LossRecord] = []

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        resident_no = str(row.get("residentNo", "")).strip()
        leave_date = str(row.get("leaveDate", "")).strip()
        join_date = str(row.get("joinDate", "")).strip()

        # 필수 필드 누락 → skip
        if not name or not resident_no:
            continue

        # 퇴사일이 없거나 대상 월이 아니면 skip
        if not leave_date or not leave_date.startswith(year_month):
            continue

        wage = int(row.get("wage", 0) or 0)
        eligible = _is_retirement_eligible(join_date, leave_date)

        records.append(LossRecord(
            name=name,
            resident_no=resident_no,
            leave_date=leave_date,
            loss_type="1",
            last_wage=wage,
            retirement_eligible=eligible,
        ))

    return LossReport(
        business_id=config.businessId,
        business_name=config.businessName,
        year_month=year_month,
        records=records,
    )
