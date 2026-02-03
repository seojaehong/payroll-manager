/**
 * 발송 이력 조회 API
 * GET /api/send-history?businessId=xxx&yearMonth=2026-01
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSendHistoryByBusiness } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const yearMonth = searchParams.get('yearMonth');

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Firestore에서 발송 이력 조회
    let history = await getSendHistoryByBusiness(businessId);

    // yearMonth 필터
    if (yearMonth) {
      history = history.filter((h) => h.yearMonth === yearMonth);
    }

    // 최신순 정렬
    history.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('발송 이력 조회 실패:', error);
    return NextResponse.json(
      { error: 'Failed to fetch send history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
