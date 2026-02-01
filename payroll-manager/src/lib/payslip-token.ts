/**
 * 급여명세서 토큰 관리 유틸리티
 * UUID 기반 토큰 생성 및 검증
 */

import { v4 as uuidv4 } from 'uuid';
import type { PayslipData, PayslipToken } from '@/types';

/**
 * 토큰 생성
 * @param payslipData 급여명세서 데이터
 * @param expirationDays 만료일 (기본 7일)
 * @param maxAccessCount 최대 접근 횟수 (기본 5회)
 * @returns PayslipToken 객체 (ID 제외, Firestore 저장 후 할당)
 */
export function createPayslipToken(
  payslipData: PayslipData,
  expirationDays: number = 7,
  maxAccessCount: number = 5
): Omit<PayslipToken, 'id'> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return {
    token: uuidv4(),
    payslipData,
    expiresAt,
    accessCount: 0,
    maxAccessCount,
    createdAt: now,
  };
}

/**
 * 토큰 유효성 검사
 * @param token PayslipToken 객체
 * @returns 유효성 결과
 */
export function validateToken(token: PayslipToken): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();

  // 만료 확인
  if (token.expiresAt < now) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  // 접근 횟수 확인
  if (token.accessCount >= token.maxAccessCount) {
    return { valid: false, reason: 'MAX_ACCESS_EXCEEDED' };
  }

  return { valid: true };
}

/**
 * 웹 링크 URL 생성
 * @param token 토큰 문자열
 * @param baseUrl 기본 URL (환경변수에서 가져옴)
 * @returns 완전한 웹 링크 URL
 */
export function generatePayslipUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}/payslip/${token}`;
}

/**
 * 토큰에서 ID 추출 (URL 경로에서)
 * @param url URL 문자열
 * @returns 토큰 문자열 또는 null
 */
export function extractTokenFromUrl(url: string): string | null {
  const match = url.match(/\/payslip\/([a-f0-9-]{36})/);
  return match ? match[1] : null;
}
