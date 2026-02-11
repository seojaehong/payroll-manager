"""
퇴직금 산정 모듈
근로자퇴직급여보장법에 따른 퇴직금 계산
- retirement.ts 포팅 (TypeScript → Python)
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RetirementResult:
    """퇴직금 산정 결과"""
    join_date: str
    leave_date: str
    total_days: int
    total_years: float

    last_3months_wages: int
    last_3months_days: int
    average_daily_wage: int

    retirement_pay: int

    service_year_deduction: int
    converted_income: int
    converted_deduction: int
    taxable_income: int
    retirement_tax: int
    local_tax: int

    net_retirement_pay: int


# ──────────────────────────────────────────
# 근속 계산
# ──────────────────────────────────────────

def is_eligible(join_date: str, leave_date: str) -> bool:
    """퇴직금 수급 자격 확인 (1년 이상 근속)"""
    join = datetime.strptime(join_date, "%Y-%m-%d")
    leave = datetime.strptime(leave_date, "%Y-%m-%d")
    return (leave - join).days >= 365


def get_total_days(join_date: str, leave_date: str) -> int:
    """총 근속일수 (퇴사일 포함)"""
    join = datetime.strptime(join_date, "%Y-%m-%d")
    leave = datetime.strptime(leave_date, "%Y-%m-%d")
    return (leave - join).days + 1


def get_service_years(join_date: str, leave_date: str) -> float:
    """근속연수 (소수점)"""
    return get_total_days(join_date, leave_date) / 365


# ──────────────────────────────────────────
# 평균임금 계산
# ──────────────────────────────────────────

@dataclass
class MonthlyWageData:
    """월급여 데이터 (간소화)"""
    year_month: str   # YYYY-MM
    total_wage: int


def get_last_3months_data(
    monthly_wages: list[MonthlyWageData],
    leave_date: str,
) -> tuple[int, int]:
    """
    퇴직 전 3개월 급여 합계 및 일수.
    Returns (wages, days)
    """
    leave = datetime.strptime(leave_date, "%Y-%m-%d")
    leave_year = leave.year
    leave_month = leave.month
    leave_day = leave.day

    # 퇴직월 + 이전 2개월
    target_months: list[str] = []
    for i in range(3):
        year = leave_year
        month = leave_month - i
        if month <= 0:
            month += 12
            year -= 1
        target_months.append(f"{year}-{month:02d}")

    # 빠른 조회용 dict
    wage_map = {mw.year_month: mw.total_wage for mw in monthly_wages}

    total_wages = 0
    total_days = 0

    for idx, ym in enumerate(target_months):
        total_wages += wage_map.get(ym, 0)

        year_val, month_val = map(int, ym.split("-"))
        # 해당 월의 일수
        if month_val == 12:
            days_in_month = 31
        else:
            next_month_first = datetime(year_val, month_val + 1, 1)
            days_in_month = (next_month_first - datetime(year_val, month_val, 1)).days

        if idx == 0:
            # 퇴직월: 퇴직일까지만
            total_days += leave_day
        else:
            total_days += days_in_month

    return total_wages, total_days


def calculate_average_wage(
    monthly_wages: list[MonthlyWageData],
    leave_date: str,
) -> int:
    """평균임금 (일당)"""
    wages, days = get_last_3months_data(monthly_wages, leave_date)
    if days == 0:
        return 0
    return round(wages / days)


# ──────────────────────────────────────────
# 퇴직금 계산
# ──────────────────────────────────────────

def calculate_retirement_pay(average_daily_wage: int, total_days: int) -> int:
    """퇴직금 = (평균임금 × 30일) × (총 근속일수 / 365)"""
    return round(average_daily_wage * 30 * (total_days / 365))


def truncate_to_10(amount: float) -> int:
    """10원 단위 절사 (국고금관리법 제47조)"""
    return math.floor(amount / 10) * 10


# ──────────────────────────────────────────
# 퇴직소득세 계산 (2026년 기준)
# ──────────────────────────────────────────

def get_service_year_deduction(service_years: float) -> int:
    """근속연수공제 (소득세법 시행령 별표2)"""
    years = math.ceil(service_years)  # 1년 미만 올림

    if years <= 5:
        return years * 1_000_000
    elif years <= 10:
        return 5_000_000 + (years - 5) * 2_000_000
    elif years <= 20:
        return 15_000_000 + (years - 10) * 2_500_000
    else:
        return 40_000_000 + (years - 20) * 3_000_000


def get_converted_income(after_deduction: int, service_years: float) -> int:
    """환산급여 = (퇴직소득 - 근속연수공제) × 12 ÷ 근속연수"""
    years = math.ceil(service_years)
    if years == 0:
        return 0
    return round((after_deduction * 12) / years)


def _get_tax_rate(converted_income: int) -> tuple[float, int]:
    """환산급여 기준 소득세율표 (2025년 기준, 소득세법 제55조)"""
    if converted_income <= 14_000_000:
        return 0.06, 0
    elif converted_income <= 50_000_000:
        return 0.15, 1_260_000
    elif converted_income <= 88_000_000:
        return 0.24, 5_760_000
    elif converted_income <= 150_000_000:
        return 0.35, 15_440_000
    elif converted_income <= 300_000_000:
        return 0.38, 19_940_000
    elif converted_income <= 500_000_000:
        return 0.40, 25_940_000
    elif converted_income <= 1_000_000_000:
        return 0.42, 35_940_000
    else:
        return 0.45, 65_940_000


def calculate_retirement_tax(
    retirement_pay: int,
    service_years: float,
) -> tuple[int, int, int, int, int]:
    """
    퇴직소득세 계산 (2026년 기준).
    Returns (retirement_tax, local_tax, taxable_income, converted_income, converted_deduction)
    """
    years = math.ceil(service_years)

    # 1. 근속연수공제
    syd = get_service_year_deduction(service_years)

    # 2. 환산급여
    after_deduction = max(0, retirement_pay - syd)
    converted_income = get_converted_income(after_deduction, service_years)

    # 3. 환산급여공제
    ci = converted_income
    if ci <= 8_000_000:
        converted_deduction = ci
    elif ci <= 70_000_000:
        converted_deduction = 8_000_000 + int((ci - 8_000_000) * 0.6)
    elif ci <= 100_000_000:
        converted_deduction = 45_200_000 + int((ci - 70_000_000) * 0.55)
    elif ci <= 300_000_000:
        converted_deduction = 61_700_000 + int((ci - 100_000_000) * 0.45)
    else:
        converted_deduction = 151_700_000 + int((ci - 300_000_000) * 0.35)

    # 4. 과세표준
    taxable_income = max(0, ci - converted_deduction)

    # 5. 환산산출세액
    rate, deduction = _get_tax_rate(taxable_income)
    converted_tax = max(0, taxable_income * rate - deduction)

    # 6. 퇴직소득세 (10원 미만 절사)
    retirement_tax = truncate_to_10((converted_tax * years) / 12)

    # 7. 지방소득세 (10원 미만 절사)
    local_tax = truncate_to_10(retirement_tax * 0.1)

    return retirement_tax, local_tax, taxable_income, converted_income, converted_deduction


# ──────────────────────────────────────────
# 전체 퇴직금 산정
# ──────────────────────────────────────────

def calculate_retirement(
    join_date: str,
    leave_date: str,
    monthly_wages: list[MonthlyWageData],
) -> RetirementResult | None:
    """
    전체 퇴직금 계산.

    Parameters
    ----------
    join_date : 입사일 (YYYY-MM-DD)
    leave_date : 퇴사일 (YYYY-MM-DD)
    monthly_wages : 월별 급여 데이터
    """
    if not join_date or not leave_date:
        return None

    if not is_eligible(join_date, leave_date):
        return None

    total_days = get_total_days(join_date, leave_date)
    total_years = get_service_years(join_date, leave_date)

    last_3m_wages, last_3m_days = get_last_3months_data(monthly_wages, leave_date)
    avg_daily_wage = calculate_average_wage(monthly_wages, leave_date)

    retirement_pay = calculate_retirement_pay(avg_daily_wage, total_days)

    syd = get_service_year_deduction(total_years)
    ret_tax, local_tax, taxable, converted, conv_deduction = calculate_retirement_tax(
        retirement_pay, total_years
    )

    net_pay = retirement_pay - ret_tax - local_tax

    return RetirementResult(
        join_date=join_date,
        leave_date=leave_date,
        total_days=total_days,
        total_years=total_years,
        last_3months_wages=last_3m_wages,
        last_3months_days=last_3m_days,
        average_daily_wage=avg_daily_wage,
        retirement_pay=retirement_pay,
        service_year_deduction=syd,
        converted_income=converted,
        converted_deduction=conv_deduction,
        taxable_income=taxable,
        retirement_tax=ret_tax,
        local_tax=local_tax,
        net_retirement_pay=net_pay,
    )
