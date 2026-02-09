'use client';

import { useState } from 'react';
import { MonthlyWage } from '@/types';
import { AnalysisResult, Insight, Warning } from '@/types/ai';

interface AIAnalysisPanelProps {
  businessId: string;
  yearMonth: string;
  wages: MonthlyWage[];
}

export default function AIAnalysisPanel({ businessId, yearMonth, wages }: AIAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (wages.length === 0) {
      setError('분석할 급여 데이터가 없습니다');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, yearMonth, wages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '분석 실패');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류 발생');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: Warning['severity']) => {
    switch (severity) {
      case 'low': return 'text-blue-400 bg-blue-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'critical': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive': return '✅';
      case 'negative': return '⚠️';
      case 'info': return 'ℹ️';
      case 'neutral': return '📊';
      default: return '📌';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-white font-bold">AI</span>
          </div>
          <div>
            <h3 className="text-white font-semibold">AI 급여 분석</h3>
            <p className="text-xs text-white/50">{yearMonth} 급여 데이터 ({wages.length}명)</p>
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || wages.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg transition-all flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              분석 중...
            </>
          ) : (
            <>
              <span>🔍</span>
              AI 분석 실행
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-white/80 text-sm font-medium mb-2">📋 분석 요약</h4>
            <p className="text-white/60 text-sm whitespace-pre-wrap">{result.summary}</p>
          </div>

          {/* 경고 */}
          {result.warnings.length > 0 && (
            <div>
              <h4 className="text-white/80 text-sm font-medium mb-2">⚠️ 주의 사항 ({result.warnings.length})</h4>
              <div className="space-y-2">
                {result.warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`rounded-lg p-3 ${getSeverityColor(warning.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-sm">{warning.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-black/20">
                        {warning.severity}
                      </span>
                    </div>
                    <p className="text-sm opacity-80 mt-1">{warning.description}</p>
                    {warning.recommendation && (
                      <p className="text-xs opacity-60 mt-2">💡 {warning.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 인사이트 */}
          {result.insights.length > 0 && (
            <div>
              <h4 className="text-white/80 text-sm font-medium mb-2">💡 인사이트 ({result.insights.length})</h4>
              <div className="grid gap-2">
                {result.insights.map((insight) => (
                  <div key={insight.id} className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span>{getInsightIcon(insight.type)}</span>
                      <span className="text-white/80 text-sm font-medium">{insight.title}</span>
                    </div>
                    <p className="text-white/50 text-sm mt-1">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 분석 시간 */}
          <p className="text-white/30 text-xs text-right">
            분석 시간: {new Date(result.analyzedAt).toLocaleString('ko-KR')}
          </p>
        </div>
      )}

      {!result && !error && (
        <div className="text-center py-8 text-white/30">
          <p className="text-2xl mb-2">🤖</p>
          <p className="text-sm">AI 분석을 실행하여 급여 데이터를 분석하세요</p>
          <p className="text-xs mt-1">최저임금, 4대보험, 이상치 등을 확인합니다</p>
        </div>
      )}
    </div>
  );
}
