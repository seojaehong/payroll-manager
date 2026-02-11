"""
BusinessPayrollConfig Pydantic 모델
payroll-manager/src/types/config.ts와 동일한 스키마
"""
from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class TaxExemptItem(BaseModel):
    field: str          # MonthlyWage 필드키 (예: "mealAllowance")
    label: str          # 표시명 (예: "식대")
    monthlyLimit: int   # 월 비과세 한도 (원)


class WageClassification(BaseModel):
    ordinaryWageItems: list[str] = Field(default_factory=lambda: ["basicWage"])
    taxExemptItems: list[TaxExemptItem] = Field(default_factory=list)


class BonusInfo(BaseModel):
    cycle: Literal["monthly", "quarterly", "biannual", "annual", "custom"] = "custom"
    months: list[int] | None = None
    rate: float | None = None
    includeInOrdinaryWage: bool = False


class ExcelStructure(BaseModel):
    filePattern: str | None = None
    sheetName: str = "임금대장"
    sheetKeywords: list[str] = Field(default_factory=lambda: ["임금대장", "급여대장"])
    headerRow: int = 4          # 1-indexed
    dataStartRow: int = 6       # 1-indexed
    columns: dict[str, int | None] = Field(default_factory=dict)
    fieldAliases: dict[str, list[str]] | None = None


class Defaults(BaseModel):
    jikjongCode: str = "532"
    workHours: int = 40
    nationality: str = "100"


class BusinessPayrollConfig(BaseModel):
    businessId: str
    businessName: str
    version: int = 1
    updatedAt: str = ""

    excel: ExcelStructure
    wageClassification: WageClassification = Field(default_factory=WageClassification)
    bonus: BonusInfo | None = None
    defaults: Defaults = Field(default_factory=Defaults)

    def get_column(self, field: str) -> int | None:
        """필드에 해당하는 1-indexed 컬럼 번호 반환 (없으면 None)"""
        return self.excel.columns.get(field)

    def get_column_0(self, field: str) -> int | None:
        """필드에 해당하는 0-indexed 컬럼 번호 반환 (없으면 None)"""
        col = self.excel.columns.get(field)
        return col - 1 if col is not None else None
