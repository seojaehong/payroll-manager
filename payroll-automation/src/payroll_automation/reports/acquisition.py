"""
취득신고서 생성 모듈
엑셀 급여 데이터에서 신규 근로자를 추출하여 4대보험 취득신고서 데이터 생성
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd

from ..config.schema import BusinessPayrollConfig


@dataclass
class AcquisitionRecord:
    """취득신고 1건 데이터"""
    name: str
    resident_no: str
    join_date: str              # YYYY-MM-DD
    wage: int                   # 월 보수액
    jikjong_code: str = "532"   # 직종코드
    work_hours: int = 40        # 주 소정근로시간
    nationality: str = "100"    # 국적코드 (100=대한민국)
    acquisition_type: str = "1" # 취득유형 (1=신규)


@dataclass
class AcquisitionReport:
    """취득신고서 전체"""
    business_id: str
    business_name: str
    year_month: str             # 대상 월 (YYYY-MM)
    records: list[AcquisitionRecord] = field(default_factory=list)
    generated_at: str = ""

    def __post_init__(self):
        if not self.generated_at:
            self.generated_at = datetime.now().isoformat()


def generate_acquisition_report(
    df: pd.DataFrame,
    config: BusinessPayrollConfig,
    year_month: str,
    existing_resident_nos: set[str] | None = None,
) -> AcquisitionReport:
    """
    표준화된 DataFrame에서 취득신고 대상을 추출.

    Parameters
    ----------
    df : 표준 필드명 DataFrame (map_to_standard 출력)
    config : 사업장 config
    year_month : 대상 월 (YYYY-MM)
    existing_resident_nos : 이미 등록된 근로자 주민번호 Set (있으면 중복 제외)
    """
    existing = existing_resident_nos or set()
    defaults = config.defaults
    records: list[AcquisitionRecord] = []

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        resident_no = str(row.get("residentNo", "")).strip()
        join_date = str(row.get("joinDate", "")).strip()

        # 필수 필드 누락 → skip
        if not name or not resident_no:
            continue

        # 이미 등록된 근로자 → skip
        if resident_no in existing:
            continue

        # 입사일이 대상 월에 해당하는지 확인
        if join_date and not join_date.startswith(year_month):
            continue

        # 월 보수액
        wage = int(row.get("wage", 0) or 0)

        records.append(AcquisitionRecord(
            name=name,
            resident_no=resident_no,
            join_date=join_date or f"{year_month}-01",
            wage=wage,
            jikjong_code=defaults.jikjongCode,
            work_hours=defaults.workHours,
            nationality=defaults.nationality,
        ))

    return AcquisitionReport(
        business_id=config.businessId,
        business_name=config.businessName,
        year_month=year_month,
        records=records,
    )
