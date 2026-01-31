import { RetirementCalculation, Worker, Business, MonthlyWage } from '@/types';
import { formatCurrency } from './retirement';

interface WageDetail {
  yearMonth: string;
  startDate: string;
  endDate: string;
  days: number;
  wage: number;
}

// 퇴직 전 3~4개월 급여 상세 데이터 생성
function getWageDetails(
  monthlyWages: MonthlyWage[],
  leaveDate: string
): WageDetail[] {
  const leave = new Date(leaveDate);
  const leaveYear = leave.getFullYear();
  const leaveMonth = leave.getMonth() + 1;
  const leaveDay = leave.getDate();

  const details: WageDetail[] = [];

  // 퇴직월 포함 최대 4개월 (중도퇴사 시)
  for (let i = 3; i >= 0; i--) {
    let year = leaveYear;
    let month = leaveMonth - i;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }

    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const wage = monthlyWages.find((mw) => mw.yearMonth === ym);

    const daysInMonth = new Date(year, month, 0).getDate();
    let startDate = `${year}.${month}.1`;
    let endDate = `${year}.${month}.${daysInMonth}`;
    let days = daysInMonth;

    // 퇴직월인 경우
    if (i === 0) {
      endDate = `${year}.${month}.${leaveDay}`;
      days = leaveDay;
    }

    if (wage || i <= 2) { // 최소 3개월은 표시
      details.push({
        yearMonth: ym,
        startDate,
        endDate,
        days,
        wage: wage?.totalWage || 0,
      });
    }
  }

  return details.filter(d => d.wage > 0 || details.indexOf(d) >= details.length - 3);
}

// HTML을 PDF로 변환 (한글 지원)
export async function downloadRetirementPDF(
  calculation: RetirementCalculation,
  worker: Worker,
  business: Business,
  monthlyWages?: MonthlyWage[]
): Promise<void> {
  const residentNoMasked = worker.residentNo.slice(0, 6) + '-*******';

  // 급여 상세 데이터
  const wageDetails = monthlyWages
    ? getWageDetails(
        monthlyWages.filter((mw) => mw.employmentId === calculation.employmentId),
        calculation.leaveDate
      )
    : [];

  const totalWageDays = wageDetails.reduce((sum, d) => sum + d.days, 0);
  const totalWageAmount = wageDetails.reduce((sum, d) => sum + d.wage, 0);

  // HTML 템플릿 생성
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>퇴직금 명세서 - ${worker.name}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', -apple-system, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: white;
      line-height: 1.4;
    }
    .container { max-width: 210mm; margin: 0 auto; padding: 8mm; }

    /* 헤더 */
    .header {
      text-align: center;
      padding: 12px 0;
      margin-bottom: 15px;
      border-bottom: 2px solid #1e3a5f;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e3a5f;
      letter-spacing: 8px;
    }

    /* 테이블 공통 */
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: center;
      vertical-align: middle;
    }
    th {
      background: #f0f4f8;
      font-weight: 600;
      color: #1e3a5f;
    }

    /* 섹션 */
    .section { margin-bottom: 12px; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a5f;
      padding: 6px 10px;
      background: #e8eef4;
      border-left: 4px solid #1e3a5f;
      margin-bottom: 6px;
    }

    /* 기본 정보 테이블 */
    .info-table th { width: 15%; background: #f5f7fa; }
    .info-table td { text-align: left; }
    .info-table .value { font-weight: 500; }

    /* 급여 내역 테이블 */
    .wage-table th { font-size: 10px; }
    .wage-table td { font-size: 10px; }
    .wage-table .amount { text-align: right; font-family: 'Consolas', monospace; }
    .wage-table .total-row { background: #f0f4f8; font-weight: 700; }

    /* 계산 테이블 */
    .calc-table { margin-top: 8px; }
    .calc-table th { width: 35%; text-align: left; padding-left: 12px; }
    .calc-table td { text-align: right; font-family: 'Consolas', monospace; font-weight: 500; }
    .calc-table .formula { font-size: 9px; color: #666; font-weight: normal; }

    /* 결과 박스 */
    .result-box {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      border-radius: 8px;
      padding: 15px 20px;
      margin: 15px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .result-label { color: #fff; font-size: 14px; font-weight: 600; }
    .result-value { color: #fff; font-size: 24px; font-weight: 700; font-family: 'Consolas', monospace; }

    /* 세금 내역 */
    .tax-row td { color: #c0392b; }
    .tax-row td:last-child::before { content: '- '; }

    /* 푸터 */
    .footer {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #888;
    }
    .footer p { margin: 2px 0; }

    /* 서명란 */
    .signature-area {
      display: flex;
      justify-content: flex-end;
      gap: 40px;
      margin-top: 20px;
    }
    .signature-box { text-align: center; }
    .signature-line {
      width: 100px;
      border-bottom: 1px solid #333;
      height: 30px;
      margin-bottom: 5px;
    }
    .signature-text { font-size: 10px; color: #666; }

    /* 인쇄 설정 */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .result-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 헤더 -->
    <div class="header">
      <h1>퇴 직 금 명 세 서</h1>
    </div>

    <!-- 기본 정보 -->
    <div class="section">
      <table class="info-table">
        <tr>
          <th>사업장명</th>
          <td class="value" colspan="2">${business.name}</td>
          <th>사업자번호</th>
          <td>${business.bizNo || '-'}</td>
        </tr>
        <tr>
          <th>성 명</th>
          <td class="value">${worker.name}</td>
          <th>주민등록번호</th>
          <td colspan="2">${residentNoMasked}</td>
        </tr>
        <tr>
          <th>입 사 일</th>
          <td>${calculation.joinDate}</td>
          <th>퇴 사 일</th>
          <td>${calculation.leaveDate}</td>
          <th>재직일수</th>
          <td><strong>${calculation.totalDays.toLocaleString()}일</strong></td>
        </tr>
      </table>
    </div>

    <!-- 급여 산정 내역 -->
    <div class="section">
      <div class="section-title">급여 산정 내역 (퇴직 전 3개월)</div>
      <table class="wage-table">
        <thead>
          <tr>
            <th style="width:8%">구분</th>
            <th style="width:25%">기간</th>
            <th style="width:12%">일수</th>
            <th style="width:20%">월 급여</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${wageDetails.length > 0 ? wageDetails.map((d, i) => `
          <tr>
            <td>${d.yearMonth.split('-')[1]}월</td>
            <td>${d.startDate} ~ ${d.endDate}</td>
            <td>${d.days}일</td>
            <td class="amount">${d.wage.toLocaleString()}원</td>
            <td>${i === wageDetails.length - 1 ? '퇴직월' : ''}</td>
          </tr>
          `).join('') : `
          <tr>
            <td colspan="5" style="padding: 15px; color: #888;">
              급여 데이터: ${calculation.last3MonthsWages.toLocaleString()}원 / ${calculation.last3MonthsDays}일
            </td>
          </tr>
          `}
          <tr class="total-row">
            <td colspan="2">합 계</td>
            <td>${wageDetails.length > 0 ? totalWageDays : calculation.last3MonthsDays}일</td>
            <td class="amount">${(wageDetails.length > 0 ? totalWageAmount : calculation.last3MonthsWages).toLocaleString()}원</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 평균임금 및 퇴직금 계산 -->
    <div class="section">
      <div class="section-title">퇴직금 계산</div>
      <table class="calc-table">
        <tr>
          <th>① 평균임금 (1일)</th>
          <td>
            ${formatCurrency(calculation.averageDailyWage)}
            <div class="formula">${(wageDetails.length > 0 ? totalWageAmount : calculation.last3MonthsWages).toLocaleString()} ÷ ${wageDetails.length > 0 ? totalWageDays : calculation.last3MonthsDays}일</div>
          </td>
        </tr>
        <tr>
          <th>② 퇴직금 (세전)</th>
          <td>
            ${formatCurrency(calculation.retirementPay)}
            <div class="formula">${formatCurrency(calculation.averageDailyWage)} × 30일 × ${calculation.totalDays}일 ÷ 365</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- 퇴직소득세 -->
    <div class="section">
      <div class="section-title">퇴직소득세 계산</div>
      <table class="calc-table">
        <tr>
          <th>근속연수</th>
          <td>${calculation.totalYears.toFixed(2)}년 (${Math.floor(calculation.totalYears)}년)</td>
        </tr>
        <tr>
          <th>근속연수공제</th>
          <td>${formatCurrency(calculation.serviceYearDeduction)}</td>
        </tr>
        <tr>
          <th>과세표준</th>
          <td>${formatCurrency(calculation.taxableIncome)}</td>
        </tr>
        <tr class="tax-row">
          <th style="color:#c0392b">퇴직소득세</th>
          <td>${formatCurrency(calculation.retirementTax)}</td>
        </tr>
        <tr class="tax-row">
          <th style="color:#c0392b">지방소득세 (10%)</th>
          <td>${formatCurrency(calculation.localRetirementTax)}</td>
        </tr>
      </table>
    </div>

    <!-- 실지급액 -->
    <div class="result-box">
      <span class="result-label">실수령 퇴직금</span>
      <span class="result-value">${formatCurrency(calculation.netRetirementPay)}</span>
    </div>

    <!-- 푸터 -->
    <div class="footer">
      <p>※ 본 명세서는 「근로자퇴직급여보장법」에 따른 퇴직금 산정 기준으로 작성되었습니다.</p>
      <p>※ 퇴직금 = 평균임금 × 30일 × (재직일수 ÷ 365)</p>
      <p>※ 작성일시: ${new Date().toLocaleString('ko-KR')}</p>
    </div>

    <!-- 서명란 -->
    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line"></div>
        <span class="signature-text">근로자 (인)</span>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <span class="signature-text">사용자 (인)</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // 새 창에서 열고 인쇄 (PDF로 저장 가능)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  } else {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `퇴직금명세서_${worker.name}_${calculation.leaveDate.replace(/-/g, '')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('HTML 파일이 다운로드되었습니다. 브라우저에서 열어 PDF로 인쇄하세요.');
  }
}
