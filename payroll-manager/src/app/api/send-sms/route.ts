/**
 * SMS 발송 API (CoolSMS)
 * POST /api/send-sms
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayslipToken, generatePayslipUrl } from '@/lib/payslip-token';
import { savePayslipToken, saveSendHistory } from '@/lib/firestore';
import type { PayslipData } from '@/types';

interface SendSmsRequest {
  payslipData: PayslipData;
  recipient: {
    phone: string;
    name?: string;
  };
  businessId: string;
  workerId: string;
  employmentId: string;
}

// CoolSMS API 호출
async function sendCoolSms(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.COOLSMS_API_KEY;
  const apiSecret = process.env.COOLSMS_API_SECRET;
  const sender = process.env.COOLSMS_SENDER;

  if (!apiKey || !apiSecret || !sender) {
    return { success: false, error: 'CoolSMS configuration is not set' };
  }

  // CoolSMS API v4 인증
  const timestamp = Date.now().toString();
  const salt = Math.random().toString(36).substring(2, 15);

  // HMAC-SHA256 시그니처 생성
  const crypto = await import('crypto');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(timestamp + salt)
    .digest('hex');

  try {
    const response = await fetch('https://api.coolsms.co.kr/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to,
          from: sender,
          text,
          type: text.length > 90 ? 'LMS' : 'SMS', // 90자 초과 시 LMS
        },
      }),
    });

    const result = await response.json();

    if (response.ok && result.groupId) {
      return { success: true, messageId: result.groupId };
    } else {
      return { success: false, error: result.errorMessage || 'Failed to send SMS' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// SMS 메시지 생성 (90자 제한 고려)
function generateSmsMessage(data: PayslipData, webLink: string): string {
  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const yearMonth = data.yearMonth.replace('-', '년 ') + '월';

  // 기본 SMS (90자 이내)
  const shortMessage = `[${data.businessName}] ${yearMonth} 급여명세서
실수령액: ${formatNumber(data.netWage)}원
확인: ${webLink}`;

  if (shortMessage.length <= 90) {
    return shortMessage;
  }

  // LMS용 상세 메시지
  return `[${data.businessName}]
${yearMonth} 급여명세서

${data.workerName}님

■ 지급: ${formatNumber(data.totalWage)}원
■ 공제: ${formatNumber(data.totalDeduction)}원
■ 실수령액: ${formatNumber(data.netWage)}원

상세 내역 확인
${webLink}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendSmsRequest = await request.json();
    const { payslipData, recipient, businessId, workerId, employmentId } = body;

    // 필수 값 검증
    if (!payslipData || !recipient?.phone) {
      return NextResponse.json(
        { error: 'payslipData and recipient.phone are required' },
        { status: 400 }
      );
    }

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = recipient.phone.replace(/-/g, '');

    // 웹 링크 생성 (SMS는 항상 링크 포함)
    const tokenData = createPayslipToken(payslipData);
    const tokenId = await savePayslipToken(tokenData);
    const webLink = generatePayslipUrl(tokenData.token);

    // SMS 메시지 생성
    const message = generateSmsMessage(payslipData, webLink);

    // SMS 발송
    const result = await sendCoolSms(normalizedPhone, message);

    if (!result.success) {
      // 발송 실패 이력 저장
      await saveSendHistory({
        businessId,
        workerId,
        employmentId,
        yearMonth: payslipData.yearMonth,
        channel: 'sms',
        recipient: recipient.phone,
        status: 'failed',
        errorMessage: result.error,
        tokenId,
        sentAt: new Date(),
      });

      return NextResponse.json(
        { error: 'Failed to send SMS', details: result.error },
        { status: 500 }
      );
    }

    // 발송 성공 이력 저장
    await saveSendHistory({
      businessId,
      workerId,
      employmentId,
      yearMonth: payslipData.yearMonth,
      channel: 'sms',
      recipient: recipient.phone,
      status: 'sent',
      tokenId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      messageId: result.messageId,
      webLink,
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
