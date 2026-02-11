"""
payroll-automation CLI 진입점.

Usage:
    python -m payroll_automation list-businesses
    python -m payroll_automation config-check --business biz-kukuku-bupyeong
    python -m payroll_automation validate --business biz-kukuku-bupyeong --file 급여대장.xlsx
    python -m payroll_automation import --business biz-kukuku-bupyeong --file 급여대장.xlsx --month 2026-01
    python -m payroll_automation retirement --join 2023-01-02 --leave 2026-01-31 --wages 3000000
"""
from __future__ import annotations

import argparse
import json
import sys

from .config.loader import list_configs, load_config
from .calculators.retirement import (
    MonthlyWageData,
    calculate_retirement,
    is_eligible,
)


def cmd_list_businesses(args: argparse.Namespace) -> None:
    """사용 가능한 사업장 목록"""
    configs = list_configs()
    if not configs:
        print("등록된 사업장 config가 없습니다.")
        return
    print(f"=== 사업장 config 목록 ({len(configs)}개) ===")
    for biz_id in configs:
        try:
            cfg = load_config(biz_id)
            print(f"  {biz_id}: {cfg.businessName}")
        except Exception as e:
            print(f"  {biz_id}: [로드 실패] {e}")


def cmd_config_check(args: argparse.Namespace) -> None:
    """config 검증"""
    try:
        cfg = load_config(args.business)
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    print(f"=== Config 검증: {cfg.businessName} ({cfg.businessId}) ===")
    print(f"  버전: {cfg.version}")
    print(f"  엑셀 시트: {cfg.excel.sheetName}")
    print(f"  헤더 행: {cfg.excel.headerRow}")
    print(f"  데이터 시작 행: {cfg.excel.dataStartRow}")

    cols = cfg.excel.columns
    print(f"  컬럼 매핑 ({len(cols)}개):")
    for field, col in sorted(cols.items(), key=lambda x: x[1] or 999):
        print(f"    {field}: 열 {col}")

    wc = cfg.wageClassification
    print(f"  통상임금 항목: {wc.ordinaryWageItems}")
    print(f"  비과세 항목: {len(wc.taxExemptItems)}개")
    for item in wc.taxExemptItems:
        print(f"    {item.label} ({item.field}): 월 {item.monthlyLimit:,}원")

    defs = cfg.defaults
    print(f"  기본 직종코드: {defs.jikjongCode}")
    print(f"  주 소정근로시간: {defs.workHours}h")
    print(f"  국적코드: {defs.nationality}")

    print("\n[OK] Config 검증 통과")


def cmd_validate(args: argparse.Namespace) -> None:
    """엑셀 파일 검증"""
    from .excel.reader import read_payroll_excel
    from .excel.mapper import map_to_standard
    from .validators.wage_validator import validate_wage_data

    cfg = load_config(args.business)
    print(f"=== 데이터 검증: {cfg.businessName} ===")
    print(f"  파일: {args.file}")

    raw_df = read_payroll_excel(args.file, cfg)
    print(f"  원시 행 수: {len(raw_df)}")

    mapped_df = map_to_standard(raw_df, cfg)
    print(f"  매핑 후 행 수: {len(mapped_df)}")

    result = validate_wage_data(mapped_df)
    print(f"\n  전체: {result.total_rows}행")
    print(f"  유효: {result.valid_rows}행")
    print(f"  에러: {result.error_count}건")
    print(f"  경고: {result.warning_count}건")

    if result.issues:
        print("\n  --- 이슈 목록 ---")
        for issue in result.issues:
            icon = "[ERROR]" if issue.level == "error" else "[WARN]"
            print(f"  {icon} 행 {issue.row + 1}: {issue.field} - {issue.message}")

    if result.is_valid:
        print("\n[OK] 검증 통과")
    else:
        print(f"\n[FAIL] {result.error_count}건의 에러 발견")
        sys.exit(1)


def cmd_import(args: argparse.Namespace) -> None:
    """엑셀 임포트 + 신고서 생성"""
    from .excel.reader import read_payroll_excel
    from .excel.mapper import map_to_standard
    from .reports.acquisition import generate_acquisition_report
    from .reports.loss import generate_loss_report

    cfg = load_config(args.business)
    print(f"=== 임포트: {cfg.businessName} ({args.month}) ===")

    raw_df = read_payroll_excel(args.file, cfg)
    mapped_df = map_to_standard(raw_df, cfg)
    print(f"  매핑 완료: {len(mapped_df)}명")

    # 취득신고
    acq = generate_acquisition_report(mapped_df, cfg, args.month)
    print(f"\n  --- 취득신고 대상: {len(acq.records)}명 ---")
    for r in acq.records:
        print(f"    {r.name} | {r.resident_no[:6]}-******* | 입사 {r.join_date} | 보수 {r.wage:,}원")

    # 상실신고
    loss = generate_loss_report(mapped_df, cfg, args.month)
    print(f"\n  --- 상실신고 대상: {len(loss.records)}명 ---")
    for r in loss.records:
        tag = " [퇴직금대상]" if r.retirement_eligible else ""
        print(f"    {r.name} | {r.resident_no[:6]}-******* | 퇴사 {r.leave_date}{tag}")

    # JSON 출력 (--json)
    if getattr(args, "json_output", False):
        output = {
            "acquisition": [
                {
                    "name": r.name,
                    "residentNo": r.resident_no,
                    "joinDate": r.join_date,
                    "wage": r.wage,
                }
                for r in acq.records
            ],
            "loss": [
                {
                    "name": r.name,
                    "residentNo": r.resident_no,
                    "leaveDate": r.leave_date,
                    "retirementEligible": r.retirement_eligible,
                }
                for r in loss.records
            ],
        }
        print(f"\n{json.dumps(output, ensure_ascii=False, indent=2)}")


def cmd_retirement(args: argparse.Namespace) -> None:
    """퇴직금 계산"""
    join_date = args.join
    leave_date = args.leave
    wage = args.wages

    if not is_eligible(join_date, leave_date):
        print("[FAIL] 1년 미만 근속 → 퇴직금 미대상")
        sys.exit(1)

    # 간이 계산: 매월 동일 급여로 가정
    from datetime import datetime
    leave = datetime.strptime(leave_date, "%Y-%m-%d")
    wages_data: list[MonthlyWageData] = []
    for i in range(3):
        y = leave.year
        m = leave.month - i
        if m <= 0:
            m += 12
            y -= 1
        wages_data.append(MonthlyWageData(
            year_month=f"{y}-{m:02d}",
            total_wage=wage,
        ))

    result = calculate_retirement(join_date, leave_date, wages_data)
    if result is None:
        print("[FAIL] 퇴직금 계산 실패")
        sys.exit(1)

    print(f"=== 퇴직금 산정 ===")
    print(f"  입사일: {result.join_date}")
    print(f"  퇴사일: {result.leave_date}")
    print(f"  근속일수: {result.total_days}일 ({result.total_years:.2f}년)")
    print(f"")
    print(f"  최근3개월 급여: {result.last_3months_wages:,}원")
    print(f"  최근3개월 일수: {result.last_3months_days}일")
    print(f"  평균임금(일): {result.average_daily_wage:,}원")
    print(f"")
    print(f"  퇴직금: {result.retirement_pay:,}원")
    print(f"  근속연수공제: {result.service_year_deduction:,}원")
    print(f"  환산급여: {result.converted_income:,}원")
    print(f"  환산급여공제: {result.converted_deduction:,}원")
    print(f"  과세표준: {result.taxable_income:,}원")
    print(f"  퇴직소득세: {result.retirement_tax:,}원")
    print(f"  지방소득세: {result.local_tax:,}원")
    print(f"")
    print(f"  ★ 실수령액: {result.net_retirement_pay:,}원")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="payroll",
        description="급여 자동화 CLI 도구",
    )
    sub = parser.add_subparsers(dest="command")

    # list-businesses
    sub.add_parser("list-businesses", help="사업장 config 목록")

    # config-check
    p_check = sub.add_parser("config-check", help="config 검증")
    p_check.add_argument("--business", "-b", required=True, help="사업장 ID")

    # validate
    p_val = sub.add_parser("validate", help="엑셀 파일 검증")
    p_val.add_argument("--business", "-b", required=True)
    p_val.add_argument("--file", "-f", required=True, help="엑셀 파일 경로")

    # import
    p_imp = sub.add_parser("import", help="엑셀 임포트 + 신고서 생성")
    p_imp.add_argument("--business", "-b", required=True)
    p_imp.add_argument("--file", "-f", required=True)
    p_imp.add_argument("--month", "-m", required=True, help="대상 월 (YYYY-MM)")
    p_imp.add_argument("--json", dest="json_output", action="store_true")

    # retirement
    p_ret = sub.add_parser("retirement", help="퇴직금 계산")
    p_ret.add_argument("--join", required=True, help="입사일 (YYYY-MM-DD)")
    p_ret.add_argument("--leave", required=True, help="퇴사일 (YYYY-MM-DD)")
    p_ret.add_argument("--wages", type=int, required=True, help="월 급여 (원)")

    args = parser.parse_args()

    commands = {
        "list-businesses": cmd_list_businesses,
        "config-check": cmd_config_check,
        "validate": cmd_validate,
        "import": cmd_import,
        "retirement": cmd_retirement,
    }

    if args.command in commands:
        commands[args.command](args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
