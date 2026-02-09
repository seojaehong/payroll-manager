import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { businessId, yearMonth, wages } = await request.json();

    if (!wages || !Array.isArray(wages) || wages.length === 0) {
      return NextResponse.json(
        { error: '급여 데이터가 필요합니다' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    // 민감 정보 제거한 데이터 준비
    const sanitizedWages = wages.map((w: Record<string, unknown>, idx: number) => ({
      index: idx + 1,
      basicWage: w.basicWage,
      overtimeWage: w.overtimeWage || w.overtimeWeekday,
      nightWage: w.nightWage,
      holidayWage: w.holidayWage,
      bonusWage: w.bonusWage,
      mealAllowance: w.mealAllowance,
      totalWage: w.totalWage || w.wage,
      netWage: w.netWage,
      nps: w.nps,
      nhic: w.nhic,
      ltc: w.ltc,
      ei: w.ei,
      incomeTax: w.incomeTax,
      localTax: w.localTax,
      totalDeduction: w.totalDeduction,
      workDays: w.workDays,
    }));

    const prompt = `다음 ${yearMonth} 월 급여 데이터를 분석해주세요 (총 ${wages.length}명):

${JSON.stringify(sanitizedWages, null, 2)}

분석 항목:
1. 급여 요약 (평균, 최고/최저, 총액)
2. 이상치 탐지 (평균 대비 ±30% 이상인 급여)
3. 4대보험 정합성 검증 (2026년 기준 요율)
   - 국민연금: 4.5%
   - 건강보험: 3.545%
   - 장기요양: 건강보험의 12.95%
   - 고용보험: 0.9%
4. 최저임금 준수 여부 (2026년 기준: 시급 10,030원, 월 209시간 기준 2,096,270원)

JSON 형식으로만 응답해주세요:
{
  "summary": "전체 요약 텍스트",
  "insights": [
    {
      "id": "ins-1",
      "type": "info|positive|negative|neutral",
      "category": "wage|deduction|trend|compliance",
      "title": "인사이트 제목",
      "description": "상세 설명"
    }
  ],
  "warnings": [
    {
      "id": "warn-1",
      "severity": "low|medium|high|critical",
      "type": "minimum_wage|insurance_mismatch|anomaly|compliance",
      "title": "경고 제목",
      "description": "상세 설명",
      "recommendation": "권장 조치"
    }
  ]
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI 응답에서 JSON을 찾을 수 없습니다', raw: text },
        { status: 500 }
      );
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    const analysisResult = {
      id: `analysis-${businessId}-${yearMonth}-${Date.now()}`,
      businessId,
      yearMonth,
      analyzedAt: new Date().toISOString(),
      summary: analysisData.summary || '',
      insights: analysisData.insights || [],
      warnings: analysisData.warnings || [],
    };

    return NextResponse.json({
      success: true,
      result: analysisResult,
    });
  } catch (error) {
    console.error('AI 분석 오류:', error);
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다', details: String(error) },
      { status: 500 }
    );
  }
}
