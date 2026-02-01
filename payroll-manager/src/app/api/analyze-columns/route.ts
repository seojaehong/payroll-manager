import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { headers } = await request.json();

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json(
        { error: '헤더 배열이 필요합니다' },
        { status: 400 }
      );
    }

    const prompt = `급여대장 엑셀의 헤더 목록입니다 (1부터 시작하는 열 번호):
${headers.map((h, i) => `${i + 1}열: ${h || '빈칸'}`).join('\n')}

위 목록에서 다음 필드에 해당하는 열 번호(1부터 시작)를 찾아주세요:

[기본정보]
- name: 이름/성명
- residentNo: 주민등록번호
- joinDate: 입사일
- leaveDate: 퇴사일

[지급항목]
- basicWage: 기본급 (통상임금, 고정급)
- overtimeWage: 연장근로수당 (연장수당, 초과근무수당) - 통합열이 있으면 이것 사용
- overtimeWeekday: 연장근로수당(평일) - 평일/주말 분리된 경우
- overtimeWeekend: 연장근로수당(주말/휴일) - 평일/주말 분리된 경우
- nightWage: 야간근로수당 (야근수당)
- holidayWage: 휴일근로수당 (휴일수당)
- annualLeaveWage: 연차수당 (연차미사용수당, 연차보상)
- bonusWage: 상여금 (상여, 보너스)
- mealAllowance: 식대 (식비, 중식비)
- carAllowance: 차량유지비 (교통비, 자가운전보조)
- otherWage: 기타수당 (기타지급)
- wage: 지급총액/임금총액 (총지급액, 과세+비과세 합계)

[공제항목]
- nps: 국민연금
- nhic: 건강보험
- ltc: 장기요양보험
- ei: 고용보험
- incomeTax: 소득세 (갑근세)
- localTax: 지방소득세 (주민세)
- otherDeduction: 기타공제 (기타공제금)
- totalDeduction: 공제액합계 (공제총액)
- advancePayment: 기지급액 (가불금, 선지급)
- netWage: 실지급액 (차인지급액, 실수령액)

[근무정보]
- workDays: 근무일수 (출근일수)
- deductionDays: 공제일수 (결근일수, 미출근일수)
- deductionHours: 공제시간 (조퇴/지각 시간)

응답 형식 (1부터 시작하는 열 번호, 없으면 null):
{"name":2,"residentNo":4,"joinDate":5,"leaveDate":6,"basicWage":11,"overtimeWage":13,"overtimeWeekday":null,"overtimeWeekend":null,"nightWage":null,"holidayWage":null,"annualLeaveWage":null,"bonusWage":16,"mealAllowance":17,"carAllowance":18,"otherWage":null,"wage":21,"nps":28,"nhic":29,"ltc":30,"ei":31,"incomeTax":26,"localTax":27,"otherDeduction":null,"totalDeduction":32,"advancePayment":null,"netWage":35,"workDays":null,"deductionDays":null,"deductionHours":null}

JSON만 출력 (설명 없이):`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // JSON 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI 응답에서 JSON을 찾을 수 없습니다', raw: text },
        { status: 500 }
      );
    }

    const mapping = JSON.parse(jsonMatch[0]);

    // 헤더명도 함께 반환 (AI는 1-indexed 열 번호를 반환)
    const mappingWithNames: Record<string, { column: number | null; headerName: string | null }> = {};
    for (const [key, value] of Object.entries(mapping)) {
      const colIndex = value as number | null;
      mappingWithNames[key] = {
        column: colIndex,
        // 1-indexed이므로 -1해서 헤더 조회
        headerName: colIndex !== null && typeof colIndex === 'number' && colIndex > 0 ? headers[colIndex - 1] || null : null,
      };
    }

    return NextResponse.json({
      success: true,
      mapping: mappingWithNames,
    });
  } catch (error) {
    console.error('Gemini API 오류:', error);
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다', details: String(error) },
      { status: 500 }
    );
  }
}
