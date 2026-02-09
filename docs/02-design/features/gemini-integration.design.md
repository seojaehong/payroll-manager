# Gemini AI Integration Design Document

> **Feature**: gemini-integration
> **Plan Reference**: `docs/01-plan/features/gemini-integration.plan.md`
> **Created**: 2026-02-04
> **Owner**: Claude Opus 4.5
> **Status**: Design

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  Layout.tsx                                                  │
│    ├── AIChatButton (플로팅 버튼)                            │
│    │     └── AIChatModal (채팅 UI)                          │
│    └── Toast (AI 알림)                                      │
│                                                              │
│  Dashboard                                                   │
│    └── AIInsightCard (인사이트 카드들)                       │
│                                                              │
│  WagesTab                                                    │
│    └── AIAnalysisPanel (급여 분석 결과)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
├─────────────────────────────────────────────────────────────┤
│  /api/ai/chat         POST  대화형 AI (스트리밍)            │
│  /api/ai/analyze      POST  급여 데이터 분석                 │
│  /api/ai/insights     GET   인사이트 조회                    │
│                                                              │
│  (기존) /api/analyze-columns  POST  엑셀 헤더 분석          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gemini AI (External)                      │
├─────────────────────────────────────────────────────────────┤
│  Model: gemini-2.0-flash                                     │
│  SDK: @google/generative-ai                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Type Definitions

### 2.1 AI Chat Types

```typescript
// src/types/ai.ts

// 채팅 메시지
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 채팅 요청
export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  context?: {
    businessId?: string;
    workerId?: string;
    yearMonth?: string;
  };
}

// 채팅 응답 (스트리밍용)
export interface ChatResponse {
  content: string;
  done: boolean;
}
```

### 2.2 AI Analysis Types

```typescript
// 분석 요청
export interface AnalyzeRequest {
  businessId: string;
  yearMonth: string;
  wages: MonthlyWage[];
}

// 분석 결과
export interface AnalysisResult {
  id: string;
  businessId: string;
  yearMonth: string;
  analyzedAt: Date;

  // 요약
  summary: string;

  // 인사이트 목록
  insights: Insight[];

  // 경고 목록
  warnings: Warning[];
}

// 인사이트
export interface Insight {
  id: string;
  type: 'info' | 'positive' | 'negative' | 'neutral';
  category: 'wage' | 'deduction' | 'trend' | 'compliance';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

// 경고
export interface Warning {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'minimum_wage' | 'insurance_mismatch' | 'anomaly' | 'compliance';
  title: string;
  description: string;
  affectedWorkers?: string[];
  recommendation?: string;
}
```

### 2.3 State Extension

```typescript
// src/store/useStore.ts 확장

interface AIState {
  // 채팅
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isChatLoading: boolean;

  // 분석
  analysisResults: Record<string, AnalysisResult>; // key: businessId-yearMonth
  isAnalyzing: boolean;

  // 액션
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setChatOpen: (open: boolean) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
}
```

---

## 3. API Design

### 3.1 POST /api/ai/chat

**Request:**
```typescript
{
  message: string;
  history?: ChatMessage[];
  context?: {
    businessId?: string;
    workerId?: string;
    yearMonth?: string;
  };
}
```

**Response (Streaming):**
```typescript
// Server-Sent Events (SSE) 또는 ReadableStream
data: {"content": "안녕하세요", "done": false}
data: {"content": "! 무엇을", "done": false}
data: {"content": " 도와드릴까요?", "done": true}
```

**System Prompt:**
```
당신은 급여 관리 시스템의 AI 어시스턴트입니다.

전문 분야:
- 급여 계산 (기본급, 수당, 공제)
- 4대보험 (국민연금, 건강보험, 고용보험, 장기요양보험)
- 근로기준법 (최저임금, 연장근로, 휴일근로)
- 퇴직금 계산
- 급여명세서 작성

응답 원칙:
1. 정확한 법률/제도 정보 제공
2. 구체적인 계산 예시 포함
3. 2026년 기준 적용
4. 불확실한 경우 전문가 상담 권유
```

### 3.2 POST /api/ai/analyze

**Request:**
```typescript
{
  businessId: string;
  yearMonth: string;
  wages: MonthlyWage[];
}
```

**Response:**
```typescript
{
  success: true;
  result: AnalysisResult;
}
```

**분석 프롬프트:**
```
다음 급여 데이터를 분석해주세요:

[데이터 JSON]

분석 항목:
1. 급여 요약 (평균, 최고/최저, 총액)
2. 이상치 탐지 (평균 대비 ±30% 이상)
3. 4대보험 정합성 (요율 기준 검증)
4. 최저임금 준수 여부 (2026년 기준: 시급 10,030원)
5. 전월 대비 변동 분석

JSON 형식으로 응답:
{
  "summary": "...",
  "insights": [...],
  "warnings": [...]
}
```

### 3.3 GET /api/ai/insights

**Query Parameters:**
- `businessId`: 사업장 ID
- `yearMonth`: 대상 월 (optional, 없으면 전체)

**Response:**
```typescript
{
  insights: Insight[];
  warnings: Warning[];
  lastAnalyzedAt: Date;
}
```

---

## 4. Component Design

### 4.1 AIChatButton

**파일**: `src/components/ai/AIChatButton.tsx`

```typescript
interface AIChatButtonProps {
  className?: string;
}

// 플로팅 버튼 (우하단 고정)
// - 클릭 시 채팅 모달 열기
// - 미읽은 메시지 뱃지 (옵션)
// - 애니메이션 효과
```

**UI 사양:**
- 위치: `fixed bottom-6 right-6`
- 크기: `w-14 h-14`
- 색상: `bg-blue-600 hover:bg-blue-700`
- 아이콘: 💬 또는 AI 아이콘
- Z-index: `z-50`

### 4.2 AIChatModal

**파일**: `src/components/ai/AIChatModal.tsx`

```typescript
interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 채팅 모달 UI
// - 메시지 리스트 (스크롤)
// - 입력창 + 전송 버튼
// - 로딩 인디케이터
// - 히스토리 초기화 버튼
```

**UI 사양:**
- 크기: `w-96 h-[500px]` (데스크톱)
- 위치: `fixed bottom-24 right-6`
- 배경: `bg-slate-800/95 backdrop-blur`
- 메시지 UI:
  - User: `bg-blue-600` (오른쪽 정렬)
  - Assistant: `bg-slate-700` (왼쪽 정렬)

### 4.3 AIAnalysisPanel

**파일**: `src/components/ai/AIAnalysisPanel.tsx`

```typescript
interface AIAnalysisPanelProps {
  businessId: string;
  yearMonth: string;
  wages: MonthlyWage[];
  onAnalyze?: () => void;
}

// 분석 패널
// - "AI 분석" 버튼
// - 로딩 상태
// - 분석 결과 표시 (인사이트 + 경고)
```

**UI 사양:**
- 카드 형태 (`bg-slate-800/50`)
- 인사이트: 아이콘 + 제목 + 설명
- 경고: severity에 따른 색상
  - low: `text-blue-400`
  - medium: `text-yellow-400`
  - high: `text-orange-400`
  - critical: `text-red-400`

### 4.4 AIInsightCard

**파일**: `src/components/ai/AIInsightCard.tsx`

```typescript
interface AIInsightCardProps {
  insight: Insight;
}

// 개별 인사이트 카드
// - 아이콘 (type별)
// - 제목
// - 설명
// - 추가 데이터 (있으면)
```

---

## 5. Implementation Order

### Phase 1: Core Infrastructure (Day 1)

1. **타입 정의**
   - `src/types/ai.ts` 생성
   - ChatMessage, AnalysisResult 등 타입 정의

2. **Store 확장**
   - `useStore.ts`에 AI 상태 추가
   - chatMessages, analysisResults 등

3. **API Route: /api/ai/chat**
   - 기본 채팅 API 구현
   - 스트리밍 응답 설정
   - 시스템 프롬프트 설정

### Phase 2: Chat UI (Day 2)

4. **AIChatButton 컴포넌트**
   - 플로팅 버튼 UI
   - 클릭 핸들러

5. **AIChatModal 컴포넌트**
   - 채팅 UI 구현
   - 메시지 리스트
   - 입력창 + 전송
   - 스트리밍 응답 처리

6. **Layout 통합**
   - Layout.tsx에 AIChatButton 추가

### Phase 3: Analysis (Day 3)

7. **API Route: /api/ai/analyze**
   - 급여 분석 API 구현
   - 분석 프롬프트 설정

8. **AIAnalysisPanel 컴포넌트**
   - 분석 버튼 + 결과 표시
   - 인사이트/경고 렌더링

9. **WagesTab 통합**
   - 급여 탭에 분석 패널 추가

### Phase 4: Dashboard Integration (Day 4)

10. **AIInsightCard 컴포넌트**
    - 개별 인사이트 카드 UI

11. **Dashboard 통합**
    - 대시보드에 주요 인사이트 표시

12. **API Route: /api/ai/insights**
    - 인사이트 조회 API

---

## 6. File Structure

```
payroll-manager/src/
├── app/
│   └── api/
│       └── ai/
│           ├── chat/
│           │   └── route.ts        # 채팅 API
│           ├── analyze/
│           │   └── route.ts        # 분석 API
│           └── insights/
│               └── route.ts        # 인사이트 API
├── components/
│   └── ai/
│       ├── AIChatButton.tsx        # 플로팅 버튼
│       ├── AIChatModal.tsx         # 채팅 모달
│       ├── AIAnalysisPanel.tsx     # 분석 패널
│       └── AIInsightCard.tsx       # 인사이트 카드
├── types/
│   ├── index.ts                    # 기존 타입
│   └── ai.ts                       # AI 관련 타입 (신규)
└── store/
    └── useStore.ts                 # AI 상태 추가
```

---

## 7. Error Handling

| 에러 | 처리 방법 |
|------|----------|
| API Key 없음 | Toast 에러 + 설정 안내 |
| 네트워크 오류 | 재시도 버튼 표시 |
| 응답 타임아웃 | 30초 후 타임아웃 메시지 |
| 파싱 실패 | 원본 텍스트 표시 |
| Rate Limit | 대기 시간 안내 |

---

## 8. Security Considerations

1. **API Key 보호**
   - 서버 사이드에서만 사용
   - 환경변수로 관리

2. **데이터 익명화**
   - 주민번호 마스킹 (앞자리만)
   - 개인명 이니셜화 (옵션)

3. **요청 제한**
   - 분당 10회 제한 (추후 설정)
   - 사용자별 할당량

---

## 9. Testing Checklist

- [ ] 채팅 메시지 전송/수신
- [ ] 스트리밍 응답 표시
- [ ] 대화 히스토리 유지
- [ ] 채팅 모달 열기/닫기
- [ ] 급여 분석 실행
- [ ] 분석 결과 표시
- [ ] 인사이트 카드 렌더링
- [ ] 경고 알림 표시
- [ ] 에러 핸들링
- [ ] 모바일 반응형

---

## 10. Dependencies

**기존 설치됨:**
- `@google/generative-ai` - Gemini SDK

**신규 필요 없음** (기존 스택 활용)

---

## 11. Environment Variables

```env
# .env.local (이미 설정됨)
GEMINI_API_KEY=your-api-key
```

---

## 12. Related Documents

| Document | Path |
|----------|------|
| Plan | `docs/01-plan/features/gemini-integration.plan.md` |
| 기존 API | `src/app/api/analyze-columns/route.ts` |

---

*Generated by PDCA Design Phase*
