// AI 관련 타입 정의

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

// 채팅 응답
export interface ChatResponse {
  content: string;
  done: boolean;
}

// 분석 요청
export interface AnalyzeRequest {
  businessId: string;
  yearMonth: string;
  wages: import('./index').MonthlyWage[];
}

// 분석 결과
export interface AnalysisResult {
  id: string;
  businessId: string;
  yearMonth: string;
  analyzedAt: Date;
  summary: string;
  insights: Insight[];
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

// AI 상태 (Store용)
export interface AIState {
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isChatLoading: boolean;
  analysisResults: Record<string, AnalysisResult>;
  isAnalyzing: boolean;
}
