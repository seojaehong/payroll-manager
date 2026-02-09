import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `당신은 급여 관리 시스템의 AI 어시스턴트입니다.

전문 분야:
- 급여 계산 (기본급, 수당, 공제)
- 4대보험 (국민연금, 건강보험, 고용보험, 장기요양보험)
- 근로기준법 (최저임금, 연장근로, 휴일근로)
- 퇴직금 계산
- 급여명세서 작성

2026년 기준 정보:
- 최저시급: 10,030원
- 최저월급(209시간): 2,096,270원
- 국민연금: 4.5% (근로자)
- 건강보험: 3.545% (근로자)
- 장기요양: 건강보험의 12.95%
- 고용보험: 0.9% (근로자)

응답 원칙:
1. 정확한 법률/제도 정보 제공
2. 구체적인 계산 예시 포함
3. 2026년 기준 적용
4. 불확실한 경우 전문가 상담 권유
5. 간결하고 명확하게 답변`;

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: '메시지가 필요합니다' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API 키가 설정되지 않았습니다' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // 대화 히스토리 구성
    const chatHistory = history?.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })) || [];

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: '네, 급여 관리 관련 질문에 답변 드리겠습니다.' }] },
        ...chatHistory,
      ],
    });

    // 스트리밍 응답
    const result = await chat.sendMessageStream(message);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text, done: false })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI Chat 오류:', error);
    return new Response(
      JSON.stringify({ error: 'AI 응답 중 오류가 발생했습니다', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
