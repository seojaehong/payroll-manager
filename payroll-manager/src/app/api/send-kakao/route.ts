/**
 * 카카오 알림톡 발송 API
 * POST /api/send-kakao
 *
 * 주의: 카카오 알림톡 사용을 위해서는:
 * 1. 카카오 비즈니스 채널 개설
 * 2. 알림톡 템플릿 등록 및 심사 승인
 * 3. 발신 프로필 키 발급
 * 이 필요합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayslipToken, generatePayslipUrl } from '@/lib/payslip-token';
import { savePayslipToken, saveSendHistory } from '@/lib/firestore';
import type { PayslipData } from '@/types';
import { formatNumber } from '@/lib/format';

interface SendKakaoRequest {
  payslipData: PayslipData;
  recipient: {
    phone: string;
    name?: string;
  };
  businessId: string;
  workerId: string;
  employmentId: string;
}

// 카카오 알림톡 발송 (비즈메시지 API)
async function sendKakaoAlimtalk(
  phone: string,
  templateCode: string,
  templateParams: Record<string, string>,
  buttons?: Array<{ type: string; name: string; linkMobile?: string; linkPc?: string }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const senderKey = process.env.KAKAO_SENDER_KEY;

  if (!restApiKey || !senderKey) {
    return { success: false, error: 'Kakao API configuration is not set' };
  }

  // 전화번호 정규화 (하이픈 제거, 국가코드 추가)
  let normalizedPhone = phone.replace(/-/g, '');
  if (!normalizedPhone.startsWith('82')) {
    normalizedPhone = '82' + normalizedPhone.substring(1);
  }

  try {
    // 카카오 비즈메시지 API 호출
    // 실제 구현 시에는 카카오 비즈니스 센터에서 발급받은 API 키와
    // 등록된 알림톡 템플릿을 사용해야 합니다.
    const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `KakaoAK ${restApiKey}`,
      },
      body: new URLSearchParams({
        template_object: JSON.stringify({
          object_type: 'text',
          text: Object.entries(templateParams)
            .map(([key, value]) => `#{${key}}: ${value}`)
            .join('\n'),
          link: {
            web_url: buttons?.[0]?.linkPc,
            mobile_web_url: buttons?.[0]?.linkMobile,
          },
          button_title: buttons?.[0]?.name || '확인하기',
        }),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, messageId: result.result_code || 'sent' };
    } else {
      return { success: false, error: result.msg || 'Failed to send Kakao message' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 알림톡 대체 발송 (CoolSMS 친구톡/알림톡)
async function sendAlimtalkViaCoolSms(
  phone: string,
  templateId: string,
  variables: Record<string, string>,
  webLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.COOLSMS_API_KEY;
  const apiSecret = process.env.COOLSMS_API_SECRET;
  const pfId = process.env.COOLSMS_KAKAO_PFID; // 카카오 채널 연동 시 필요

  if (!apiKey || !apiSecret) {
    return { success: false, error: 'CoolSMS configuration is not set' };
  }

  // pfId가 없으면 카카오톡 발송 불가
  if (!pfId) {
    return { success: false, error: 'Kakao channel (PFID) is not configured' };
  }

  const timestamp = Date.now().toString();
  const salt = Math.random().toString(36).substring(2, 15);

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
          to: phone.replace(/-/g, ''),
          from: process.env.COOLSMS_SENDER,
          type: 'ATA', // 알림톡
          kakaoOptions: {
            pfId,
            templateId,
            variables,
            buttons: [
              {
                buttonType: 'WL',
                buttonName: '급여명세서 확인',
                linkMo: webLink,
                linkPc: webLink,
              },
            ],
          },
        },
      }),
    });

    const result = await response.json();

    if (response.ok && result.groupId) {
      return { success: true, messageId: result.groupId };
    } else {
      return { success: false, error: result.errorMessage || 'Failed to send Alimtalk' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SendKakaoRequest = await request.json();
    const { payslipData, recipient, businessId, workerId, employmentId } = body;

    // 필수 값 검증
    if (!payslipData || !recipient?.phone) {
      return NextResponse.json(
        { error: 'payslipData and recipient.phone are required' },
        { status: 400 }
      );
    }

    // 웹 링크 생성
    const tokenData = createPayslipToken(payslipData);
    const tokenId = await savePayslipToken(tokenData);
    const webLink = generatePayslipUrl(tokenData.token);

    // 알림톡 템플릿 변수
    const yearMonth = payslipData.yearMonth.replace('-', '년 ') + '월';

    const templateVariables = {
      business_name: payslipData.businessName,
      worker_name: payslipData.workerName,
      year_month: yearMonth,
      total_wage: formatNumber(payslipData.totalWage),
      total_deduction: formatNumber(payslipData.totalDeduction),
      net_wage: formatNumber(payslipData.netWage),
    };

    // 알림톡 발송 시도 (CoolSMS 경유)
    const templateId = process.env.COOLSMS_KAKAO_TEMPLATE_ID || 'PAYSLIP_001';
    const result = await sendAlimtalkViaCoolSms(
      recipient.phone,
      templateId,
      templateVariables,
      webLink
    );

    if (!result.success) {
      // 발송 실패 이력 저장
      await saveSendHistory({
        businessId,
        workerId,
        employmentId,
        yearMonth: payslipData.yearMonth,
        channel: 'kakao',
        recipient: recipient.phone,
        status: 'failed',
        errorMessage: result.error,
        tokenId,
        sentAt: new Date(),
      });

      return NextResponse.json(
        { error: 'Failed to send Kakao Alimtalk', details: result.error },
        { status: 500 }
      );
    }

    // 발송 성공 이력 저장
    await saveSendHistory({
      businessId,
      workerId,
      employmentId,
      yearMonth: payslipData.yearMonth,
      channel: 'kakao',
      recipient: recipient.phone,
      status: 'sent',
      tokenId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Kakao Alimtalk sent successfully',
      messageId: result.messageId,
      webLink,
    });
  } catch (error) {
    console.error('Send Kakao error:', error);
    return NextResponse.json(
      { error: 'Failed to send Kakao Alimtalk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
