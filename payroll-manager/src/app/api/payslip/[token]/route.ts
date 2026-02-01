/**
 * 급여명세서 토큰 검증 API
 * GET /api/payslip/[token]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPayslipTokenByToken, incrementTokenAccessCount } from '@/lib/firestore';
import { validateToken } from '@/lib/payslip-token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // 토큰으로 데이터 조회
    const tokenData = await getPayslipTokenByToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid token', code: 'TOKEN_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 토큰 유효성 검사
    const validation = validateToken(tokenData);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Token validation failed', code: validation.reason },
        { status: 403 }
      );
    }

    // 접근 횟수 증가
    await incrementTokenAccessCount(tokenData.id);

    // 급여명세서 데이터 반환
    return NextResponse.json({
      success: true,
      data: tokenData.payslipData,
      accessCount: tokenData.accessCount + 1,
      maxAccessCount: tokenData.maxAccessCount,
      expiresAt: tokenData.expiresAt,
    });
  } catch (error) {
    console.error('Payslip token API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
