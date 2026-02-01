/**
 * 통합 급여명세서 발송 API
 * POST /api/send-payslip
 *
 * 이메일/SMS/카카오톡 통합 발송 지원
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PayslipData, SendChannel } from '@/types';

interface SendPayslipRequest {
  payslipData: PayslipData;
  channels: SendChannel[];  // 복수 채널 지원
  recipient: {
    email?: string;
    phone?: string;
  };
  attachPdf?: boolean;  // 이메일 PDF 첨부
  includeLink?: boolean;  // 이메일 링크 포함
  businessId: string;
  workerId: string;
  employmentId: string;
}

interface ChannelResult {
  channel: SendChannel;
  success: boolean;
  error?: string;
  webLink?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPayslipRequest = await request.json();
    const {
      payslipData,
      channels,
      recipient,
      attachPdf = true,
      includeLink = true,
      businessId,
      workerId,
      employmentId,
    } = body;

    // 필수 값 검증
    if (!payslipData || !channels || channels.length === 0) {
      return NextResponse.json(
        { error: 'payslipData and channels are required' },
        { status: 400 }
      );
    }

    // 채널별 필수 값 검증
    if (channels.includes('email') && !recipient.email) {
      return NextResponse.json(
        { error: 'recipient.email is required for email channel' },
        { status: 400 }
      );
    }

    if ((channels.includes('sms') || channels.includes('kakao')) && !recipient.phone) {
      return NextResponse.json(
        { error: 'recipient.phone is required for SMS/Kakao channel' },
        { status: 400 }
      );
    }

    const results: ChannelResult[] = [];
    const baseUrl = request.nextUrl.origin;

    // 각 채널별 발송 처리
    for (const channel of channels) {
      try {
        let apiUrl: string;
        let requestBody: Record<string, unknown>;

        switch (channel) {
          case 'email':
            apiUrl = `${baseUrl}/api/send-email`;
            requestBody = {
              payslipData,
              recipient: { email: recipient.email },
              attachPdf,
              includeLink,
              businessId,
              workerId,
              employmentId,
            };
            break;

          case 'sms':
            apiUrl = `${baseUrl}/api/send-sms`;
            requestBody = {
              payslipData,
              recipient: { phone: recipient.phone },
              businessId,
              workerId,
              employmentId,
            };
            break;

          case 'kakao':
            apiUrl = `${baseUrl}/api/send-kakao`;
            requestBody = {
              payslipData,
              recipient: { phone: recipient.phone },
              businessId,
              workerId,
              employmentId,
            };
            break;

          default:
            results.push({
              channel,
              success: false,
              error: `Unknown channel: ${channel}`,
            });
            continue;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          results.push({
            channel,
            success: true,
            webLink: result.webLink,
          });
        } else {
          results.push({
            channel,
            success: false,
            error: result.error || result.details || 'Unknown error',
          });
        }
      } catch (error) {
        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 결과 요약
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount}/${channels.length} channels sent successfully`,
      results,
      summary: {
        total: channels.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('Send payslip error:', error);
    return NextResponse.json(
      { error: 'Failed to send payslip', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
