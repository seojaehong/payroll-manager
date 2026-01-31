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

    const prompt = `급여대장 엑셀의 헤더 목록입니다:
${headers.map((h, i) => `${i}: ${h || '빈칸'}`).join('\n')}

위 목록에서 다음 필드에 해당하는 열 번호(숫자)를 찾아주세요:
- name: 이름/성명
- residentNo: 주민등록번호
- joinDate: 입사일
- leaveDate: 퇴사일
- wage: 임금총액 (계약임금X, 실제 총지급액)
- nps: 국민연금
- nhic: 건강보험
- ltc: 장기요양보험
- ei: 고용보험
- incomeTax: 소득세
- localTax: 주민세/지방소득세
- netWage: 실지급액

응답 형식 (숫자만, 없으면 null):
{"name":1,"residentNo":3,"joinDate":4,"leaveDate":5,"wage":20,"nps":27,"nhic":28,"ltc":29,"ei":30,"incomeTax":25,"localTax":26,"netWage":34}

JSON만 출력:`;

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

    // 헤더명도 함께 반환
    const mappingWithNames: Record<string, { column: number | null; headerName: string | null }> = {};
    for (const [key, value] of Object.entries(mapping)) {
      const colIndex = value as number | null;
      mappingWithNames[key] = {
        column: colIndex,
        headerName: colIndex !== null && typeof colIndex === 'number' ? headers[colIndex] || null : null,
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
