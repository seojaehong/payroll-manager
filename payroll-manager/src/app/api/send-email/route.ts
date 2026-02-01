/**
 * 이메일 발송 API
 * POST /api/send-email
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { generatePayslipPDF } from '@/lib/payslip-pdf';
import { createPayslipToken, generatePayslipUrl } from '@/lib/payslip-token';
import { savePayslipToken, saveSendHistory } from '@/lib/firestore';
import type { PayslipData } from '@/types';

interface SendEmailRequest {
  payslipData: PayslipData;
  recipient: {
    email: string;
    name?: string;
  };
  attachPdf?: boolean;
  includeLink?: boolean;
  businessId: string;
  workerId: string;
  employmentId: string;
}

// 이메일 HTML 템플릿
function generateEmailHtml(data: PayslipData, webLink?: string): string {
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>급여명세서</title>
  <style>
    body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #1e40af; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.8; }
    .content { padding: 30px; }
    .info-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 600; }
    .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 20px 0 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .amount { text-align: right; font-weight: 500; }
    .total-row { background: #f8fafc; font-weight: 700; }
    .total-row td { padding: 15px 10px; }
    .net-pay { background: #1e40af; color: white; padding: 25px; text-align: center; margin-top: 20px; border-radius: 8px; }
    .net-pay-label { font-size: 14px; opacity: 0.9; }
    .net-pay-amount { font-size: 32px; font-weight: 700; margin-top: 5px; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    .footer { padding: 20px 30px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>급여명세서</h1>
      <p>${data.yearMonth.replace('-', '년 ')}월</p>
    </div>

    <div class="content">
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">사업장</span>
          <span class="info-value">${data.businessName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">성명</span>
          <span class="info-value">${data.workerName}</span>
        </div>
      </div>

      <div class="section-title">지급 내역</div>
      <table>
        <tr>
          <td>기본급</td>
          <td class="amount">${formatNumber(data.basicWage)}원</td>
        </tr>
        ${data.overtimeWage ? `<tr><td>연장근로수당</td><td class="amount">${formatNumber(data.overtimeWage)}원</td></tr>` : ''}
        ${data.nightWage ? `<tr><td>야간근로수당</td><td class="amount">${formatNumber(data.nightWage)}원</td></tr>` : ''}
        ${data.holidayWage ? `<tr><td>휴일근로수당</td><td class="amount">${formatNumber(data.holidayWage)}원</td></tr>` : ''}
        ${data.bonusWage ? `<tr><td>상여금</td><td class="amount">${formatNumber(data.bonusWage)}원</td></tr>` : ''}
        ${data.otherWage ? `<tr><td>기타수당</td><td class="amount">${formatNumber(data.otherWage)}원</td></tr>` : ''}
        <tr class="total-row">
          <td>지급 합계</td>
          <td class="amount" style="color: #2563eb;">${formatNumber(data.totalWage)}원</td>
        </tr>
      </table>

      <div class="section-title">공제 내역</div>
      <table>
        <tr><td>국민연금</td><td class="amount">${formatNumber(data.nps)}원</td></tr>
        <tr><td>건강보험</td><td class="amount">${formatNumber(data.nhic)}원</td></tr>
        <tr><td>장기요양보험</td><td class="amount">${formatNumber(data.ltc)}원</td></tr>
        <tr><td>고용보험</td><td class="amount">${formatNumber(data.ei)}원</td></tr>
        <tr><td>소득세</td><td class="amount">${formatNumber(data.incomeTax)}원</td></tr>
        <tr><td>지방소득세</td><td class="amount">${formatNumber(data.localTax)}원</td></tr>
        ${data.otherDeduction ? `<tr><td>기타공제</td><td class="amount">${formatNumber(data.otherDeduction)}원</td></tr>` : ''}
        <tr class="total-row">
          <td>공제 합계</td>
          <td class="amount" style="color: #dc2626;">${formatNumber(data.totalDeduction)}원</td>
        </tr>
      </table>

      <div class="net-pay">
        <div class="net-pay-label">실수령액</div>
        <div class="net-pay-amount">${formatNumber(data.netWage)}원</div>
      </div>

      ${webLink ? `
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #64748b; font-size: 14px;">웹에서 급여명세서 확인하기</p>
        <a href="${webLink}" class="cta-button">급여명세서 보기</a>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>본 메일은 ${data.businessName}에서 발송한 급여명세서입니다.</p>
      <p>문의사항은 담당자에게 연락해 주세요.</p>
    </div>
  </div>
</body>
</html>
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { payslipData, recipient, attachPdf, includeLink, businessId, workerId, employmentId } = body;

    // 필수 값 검증
    if (!payslipData || !recipient?.email) {
      return NextResponse.json(
        { error: 'payslipData and recipient.email are required' },
        { status: 400 }
      );
    }

    // SMTP 설정 확인
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: 'SMTP configuration is not set' },
        { status: 500 }
      );
    }

    // 웹 링크 생성 (옵션)
    let webLink: string | undefined;
    let tokenId: string | undefined;
    if (includeLink) {
      const tokenData = createPayslipToken(payslipData);
      tokenId = await savePayslipToken(tokenData);
      webLink = generatePayslipUrl(tokenData.token);
    }

    // PDF 생성 (옵션)
    let pdfBuffer: Buffer | undefined;
    if (attachPdf) {
      const pdfBlob = await generatePayslipPDF(payslipData);
      const arrayBuffer = await pdfBlob.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    }

    // 이메일 전송
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${payslipData.businessName}" <${smtpFrom}>`,
      to: recipient.email,
      subject: `[급여명세서] ${payslipData.yearMonth} ${payslipData.workerName}님 급여명세서`,
      html: generateEmailHtml(payslipData, webLink),
      attachments: pdfBuffer
        ? [
            {
              filename: `급여명세서_${payslipData.workerName}_${payslipData.yearMonth}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    };

    await transporter.sendMail(mailOptions);

    // 발송 이력 저장
    await saveSendHistory({
      businessId,
      workerId,
      employmentId,
      yearMonth: payslipData.yearMonth,
      channel: 'email',
      recipient: recipient.email,
      status: 'sent',
      tokenId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      webLink,
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
