/**
 * 급여명세서 PDF 생성 모듈
 * html2canvas + jsPDF를 사용한 한글 지원 PDF 생성
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { PayslipData } from '@/types';
import { formatNumber } from '@/lib/format';

// 급여명세서 HTML 생성
function createPayslipHtml(data: PayslipData): string {
  const yearMonth = data.yearMonth.replace('-', '년 ') + '월';

  // 지급 항목 (값이 있는 항목만 표시, 0도 표시)
  const earningsItems: { label: string; amount: number }[] = [];
  if (data.basicWage != null) earningsItems.push({ label: '기본급', amount: data.basicWage });
  if (data.overtimeWage != null && data.overtimeWage > 0) earningsItems.push({ label: '연장근로수당', amount: data.overtimeWage });
  if (data.nightWage != null && data.nightWage > 0) earningsItems.push({ label: '야간근로수당', amount: data.nightWage });
  if (data.holidayWage != null && data.holidayWage > 0) earningsItems.push({ label: '휴일근로수당', amount: data.holidayWage });
  if (data.bonusWage != null && data.bonusWage > 0) earningsItems.push({ label: '상여금', amount: data.bonusWage });
  if (data.otherWage != null && data.otherWage > 0) earningsItems.push({ label: '기타수당', amount: data.otherWage });

  // 항목 없으면 총액만
  if (earningsItems.length === 0 && data.totalWage) {
    earningsItems.push({ label: '급여', amount: data.totalWage });
  }

  // 공제 항목 (값이 있는 항목만 표시)
  const deductionItems: { label: string; amount: number }[] = [];
  if (data.nps != null && data.nps > 0) deductionItems.push({ label: '국민연금', amount: data.nps });
  if (data.nhic != null && data.nhic > 0) deductionItems.push({ label: '건강보험', amount: data.nhic });
  if (data.ltc != null && data.ltc > 0) deductionItems.push({ label: '장기요양보험', amount: data.ltc });
  if (data.ei != null && data.ei > 0) deductionItems.push({ label: '고용보험', amount: data.ei });
  if (data.incomeTax != null && data.incomeTax > 0) deductionItems.push({ label: '소득세', amount: data.incomeTax });
  if (data.localTax != null && data.localTax > 0) deductionItems.push({ label: '지방소득세', amount: data.localTax });
  if (data.otherDeduction != null && data.otherDeduction > 0) deductionItems.push({ label: '기타공제', amount: data.otherDeduction });

  const generatedDate = data.generatedAt instanceof Date
    ? data.generatedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return `
    <div id="payslip-content" style="
      width: 595px;
      padding: 40px;
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      background: white;
      color: #1a1a1a;
      box-sizing: border-box;
    ">
      <!-- 헤더 -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e40af;">
        <h1 style="margin: 0; font-size: 28px; color: #1e40af; font-weight: bold;">급여명세서</h1>
        <p style="margin: 10px 0 0; font-size: 16px; color: #666;">${yearMonth}</p>
      </div>

      <!-- 기본 정보 -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 100px;">사업장</td>
            <td style="padding: 8px 0; font-weight: 600;">${data.businessName}</td>
            <td style="padding: 8px 0; color: #666; width: 100px;">사업자번호</td>
            <td style="padding: 8px 0;">${data.businessBizNo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">성명</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 18px;">${data.workerName}</td>
            <td style="padding: 8px 0; color: #666;">귀속연월</td>
            <td style="padding: 8px 0;">${data.yearMonth}</td>
          </tr>
        </table>
      </div>

      <!-- 지급/공제 테이블 -->
      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <!-- 지급 내역 -->
        <div style="flex: 1;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">지급 내역</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${earningsItems.map(item => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.label}</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatNumber(item.amount)}원</td>
              </tr>
            `).join('')}
            <tr style="background: #f0f9ff;">
              <td style="padding: 12px 8px; font-weight: 700;">지급 합계</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #1e40af;">${formatNumber(data.totalWage)}원</td>
            </tr>
          </table>
        </div>

        <!-- 공제 내역 -->
        <div style="flex: 1;">
          <h3 style="margin: 0 0 15px; font-size: 16px; color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px;">공제 내역</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${deductionItems.length > 0 ? deductionItems.map(item => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${item.label}</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${formatNumber(item.amount)}원</td>
              </tr>
            `).join('') : '<tr><td style="padding: 10px 0; color: #999;">(공제 없음)</td></tr>'}
            <tr style="background: #fef2f2;">
              <td style="padding: 12px 8px; font-weight: 700;">공제 합계</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #dc2626;">${formatNumber(data.totalDeduction)}원</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- 실수령액 -->
      <div style="background: #1e40af; color: white; padding: 25px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <span style="font-size: 20px; font-weight: 600;">실수령액</span>
        <span style="font-size: 32px; font-weight: 700;">${formatNumber(data.netWage)}원</span>
      </div>

      ${data.workDays || data.workHours ? `
      <!-- 근무 정보 -->
      <div style="background: #f8fafc; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
        <span style="color: #666; margin-right: 20px;">근무정보:</span>
        ${data.workDays ? `<span style="margin-right: 20px;">근무일수 <strong>${data.workDays}일</strong></span>` : ''}
        ${data.workHours ? `<span>근무시간 <strong>${data.workHours}시간</strong></span>` : ''}
      </div>
      ` : ''}

      <!-- 푸터 -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
        <p style="margin: 5px 0;">발급일: ${generatedDate}</p>
        <p style="margin: 5px 0;">본 문서는 전자적으로 생성된 급여명세서입니다.</p>
      </div>
    </div>
  `;
}

/**
 * 급여명세서 PDF 생성 (한글 지원)
 */
export async function generatePayslipPDF(data: PayslipData): Promise<Blob> {
  // 임시 컨테이너 생성
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = createPayslipHtml(data);
  document.body.appendChild(container);

  const content = container.querySelector('#payslip-content') as HTMLElement;

  try {
    // HTML을 캔버스로 변환
    const canvas = await html2canvas(content, {
      scale: 2, // 고해상도
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    // PDF 생성
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    return pdf.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * 급여명세서 PDF 다운로드
 */
export async function downloadPayslipPDF(data: PayslipData, filename?: string): Promise<void> {
  try {
    const blob = await generatePayslipPDF(data);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename
      ? `${filename}.pdf`
      : `급여명세서_${data.workerName}_${data.yearMonth}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    // Note: toast는 호출하는 컴포넌트에서 처리해야 합니다
    throw new Error('PDF 생성 중 오류가 발생했습니다.');
  }
}
