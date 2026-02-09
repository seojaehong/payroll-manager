import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Business, Worker, Employment, Report, MonthlyWage, ExcelMapping, RetirementCalculation, PayslipToken, SendHistory } from '@/types';

// Firestore writeBatch 500건 제한 처리를 위한 청크 유틸리티
const BATCH_LIMIT = 500;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


// 컬렉션 이름
const COLLECTIONS = {
  businesses: 'businesses',
  workers: 'workers',
  employments: 'employments',
  reports: 'reports',
  monthlyWages: 'monthlyWages',
  excelMappings: 'excelMappings',
  retirementCalculations: 'retirementCalculations',
  payslipTokens: 'payslipTokens',
  sendHistory: 'sendHistory',
} as const;

// Date <-> Timestamp 변환 (문자열도 처리)
const toTimestamp = (date: Date | string) => {
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
};
const fromTimestamp = (ts: Timestamp | undefined) => {
  if (!ts || typeof ts.toDate !== 'function') {
    return new Date();
  }
  return ts.toDate();
};

// undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
const cleanUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
};

// === 사업장 ===
export async function getBusinesses(): Promise<Business[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.businesses));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    } as Business;
  });
}

export async function saveBusiness(business: Business): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.businesses, business.id), {
    ...business,
    createdAt: toTimestamp(business.createdAt),
    updatedAt: toTimestamp(business.updatedAt),
  });
}

export async function deleteBusiness(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.businesses, id));
}

// === 근로자 ===
export async function getWorkers(): Promise<Worker[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.workers));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    } as Worker;
  });
}

export async function saveWorker(worker: Worker): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.workers, worker.id), cleanUndefined({
    ...worker,
    createdAt: toTimestamp(worker.createdAt),
    updatedAt: toTimestamp(worker.updatedAt),
  }));
}

export async function saveWorkers(workers: Worker[]): Promise<void> {
  const chunks = chunkArray(workers, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((worker) => {
      const ref = doc(db, COLLECTIONS.workers, worker.id);
      batch.set(ref, cleanUndefined({
        ...worker,
        createdAt: toTimestamp(worker.createdAt),
        updatedAt: toTimestamp(worker.updatedAt),
      }));
    });
    await batch.commit();
  }
}

// === 고용관계 ===
export async function getEmployments(): Promise<Employment[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.employments));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
    } as Employment;
  });
}

export async function saveEmployment(employment: Employment): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.employments, employment.id), cleanUndefined({
    ...employment,
    createdAt: toTimestamp(employment.createdAt),
    updatedAt: toTimestamp(employment.updatedAt),
  }));
}

export async function saveEmployments(employments: Employment[]): Promise<void> {
  const chunks = chunkArray(employments, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((emp) => {
      const ref = doc(db, COLLECTIONS.employments, emp.id);
      batch.set(ref, cleanUndefined({
        ...emp,
        createdAt: toTimestamp(emp.createdAt),
        updatedAt: toTimestamp(emp.updatedAt),
      }));
    });
    await batch.commit();
  }
}

export async function deleteEmploymentsByBusiness(businessId: string): Promise<string[]> {
  const q = query(collection(db, COLLECTIONS.employments), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);
  const deletedIds: string[] = [];

  if (snapshot.empty) return deletedIds;

  const chunks = chunkArray(snapshot.docs, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      deletedIds.push(docSnap.id);
    });
    await batch.commit();
  }
  return deletedIds;
}

export async function deleteWorker(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.workers, id));
}

export async function deleteEmployment(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.employments, id));
}

export async function deleteEmploymentsByWorker(workerId: string): Promise<string[]> {
  const q = query(collection(db, COLLECTIONS.employments), where('workerId', '==', workerId));
  const snapshot = await getDocs(q);
  const deletedIds: string[] = [];

  if (snapshot.empty) return deletedIds;

  const chunks = chunkArray(snapshot.docs, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      deletedIds.push(docSnap.id);
    });
    await batch.commit();
  }
  return deletedIds;
}

export async function deleteMonthlyWage(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.monthlyWages, id));
}

export async function deleteMonthlyWages(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const chunks = chunkArray(ids, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      batch.delete(doc(db, COLLECTIONS.monthlyWages, id));
    });
    await batch.commit();
  }
  return ids.length;
}

export async function deleteMonthlyWagesByEmployment(employmentId: string): Promise<number> {
  const q = query(collection(db, COLLECTIONS.monthlyWages), where('employmentId', '==', employmentId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const chunks = chunkArray(snapshot.docs, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
  return snapshot.size;
}

export async function deleteMonthlyWagesByEmployments(employmentIds: string[]): Promise<number> {
  if (employmentIds.length === 0) return 0;

  let totalDeleted = 0;
  // Firestore 'in' 쿼리는 최대 30개까지만 지원
  const idChunks = chunkArray(employmentIds, 30);

  for (const idChunk of idChunks) {
    const q = query(collection(db, COLLECTIONS.monthlyWages), where('employmentId', 'in', idChunk));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docChunks = chunkArray(snapshot.docs, BATCH_LIMIT);
      for (const docChunk of docChunks) {
        const batch = writeBatch(db);
        docChunk.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
      totalDeleted += snapshot.size;
    }
  }
  return totalDeleted;
}

export async function deleteRetirementCalculationsByBusiness(businessId: string): Promise<number> {
  const q = query(collection(db, COLLECTIONS.retirementCalculations), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const chunks = chunkArray(snapshot.docs, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
  return snapshot.size;
}

export async function deleteExcelMapping(businessId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.excelMappings, businessId));
}

// === 월별 급여 ===
export async function getMonthlyWages(): Promise<MonthlyWage[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.monthlyWages));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
    } as MonthlyWage;
  });
}

export async function getMonthlyWagesByEmployment(employmentId: string): Promise<MonthlyWage[]> {
  const q = query(
    collection(db, COLLECTIONS.monthlyWages),
    where('employmentId', '==', employmentId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
    } as MonthlyWage;
  });
}

export async function saveMonthlyWages(wages: MonthlyWage[]): Promise<void> {
  const chunks = chunkArray(wages, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((wage) => {
      const ref = doc(db, COLLECTIONS.monthlyWages, wage.id);
      batch.set(ref, cleanUndefined({
        ...wage,
        createdAt: toTimestamp(wage.createdAt),
      }));
    });
    await batch.commit();
  }
}

// === 신고 이력 ===
export async function getReports(): Promise<Report[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.reports));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: fromTimestamp(data.createdAt),
    } as Report;
  });
}

export async function saveReport(report: Report): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.reports, report.id), {
    ...report,
    createdAt: toTimestamp(report.createdAt),
  });
}

// === 엑셀 매핑 ===
export async function getExcelMappings(): Promise<ExcelMapping[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.excelMappings));
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    businessId: doc.id,
  })) as ExcelMapping[];
}

export async function saveExcelMapping(mapping: ExcelMapping): Promise<void> {
  // Firebase는 undefined 값을 허용하지 않으므로 중첩 객체도 정리
  const cleanedMapping = {
    ...mapping,
    columns: cleanUndefined(mapping.columns as Record<string, unknown>),
  };
  await setDoc(doc(db, COLLECTIONS.excelMappings, mapping.businessId), cleanUndefined(cleanedMapping as Record<string, unknown>));
}

// === 퇴직금 계산 ===
export async function getRetirementCalculations(): Promise<RetirementCalculation[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.retirementCalculations));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      calculatedAt: fromTimestamp(data.calculatedAt),
    } as RetirementCalculation;
  });
}

export async function getRetirementCalculationsByBusiness(businessId: string): Promise<RetirementCalculation[]> {
  const q = query(
    collection(db, COLLECTIONS.retirementCalculations),
    where('businessId', '==', businessId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      calculatedAt: fromTimestamp(data.calculatedAt),
    } as RetirementCalculation;
  });
}

export async function saveRetirementCalculation(calculation: RetirementCalculation): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.retirementCalculations, calculation.id), cleanUndefined({
    ...calculation,
    calculatedAt: toTimestamp(calculation.calculatedAt),
  }));
}

export async function deleteRetirementCalculation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.retirementCalculations, id));
}

// === 급여명세서 토큰 ===
export async function getPayslipTokenByToken(token: string): Promise<PayslipToken | null> {
  const q = query(
    collection(db, COLLECTIONS.payslipTokens),
    where('token', '==', token)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    expiresAt: fromTimestamp(data.expiresAt),
    createdAt: fromTimestamp(data.createdAt),
    payslipData: {
      ...data.payslipData,
      generatedAt: fromTimestamp(data.payslipData.generatedAt),
    },
  } as PayslipToken;
}

export async function savePayslipToken(tokenData: Omit<PayslipToken, 'id'>): Promise<string> {
  const id = doc(collection(db, COLLECTIONS.payslipTokens)).id;
  await setDoc(doc(db, COLLECTIONS.payslipTokens, id), {
    ...tokenData,
    expiresAt: toTimestamp(tokenData.expiresAt),
    createdAt: toTimestamp(tokenData.createdAt),
    payslipData: {
      ...tokenData.payslipData,
      generatedAt: toTimestamp(tokenData.payslipData.generatedAt),
    },
  });
  return id;
}

export async function incrementTokenAccessCount(tokenId: string): Promise<void> {
  const tokenRef = doc(db, COLLECTIONS.payslipTokens, tokenId);
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.payslipTokens), where('__name__', '==', tokenId)));
  if (!snapshot.empty) {
    const data = snapshot.docs[0].data();
    await setDoc(tokenRef, {
      ...data,
      accessCount: (data.accessCount || 0) + 1,
    });
  }
}

// === 발송 이력 ===
export async function getSendHistoryByBusiness(businessId: string): Promise<SendHistory[]> {
  const q = query(
    collection(db, COLLECTIONS.sendHistory),
    where('businessId', '==', businessId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      sentAt: fromTimestamp(data.sentAt),
      deliveredAt: data.deliveredAt ? fromTimestamp(data.deliveredAt) : undefined,
    } as SendHistory;
  });
}

export async function getSendHistoryByWorker(workerId: string, yearMonth?: string): Promise<SendHistory[]> {
  let q = query(
    collection(db, COLLECTIONS.sendHistory),
    where('workerId', '==', workerId)
  );
  if (yearMonth) {
    q = query(q, where('yearMonth', '==', yearMonth));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      sentAt: fromTimestamp(data.sentAt),
      deliveredAt: data.deliveredAt ? fromTimestamp(data.deliveredAt) : undefined,
    } as SendHistory;
  });
}

export async function saveSendHistory(history: Omit<SendHistory, 'id'>): Promise<string> {
  const id = doc(collection(db, COLLECTIONS.sendHistory)).id;
  const data: Record<string, unknown> = {
    ...history,
    sentAt: toTimestamp(history.sentAt),
  };
  if (history.deliveredAt) {
    data.deliveredAt = toTimestamp(history.deliveredAt);
  } else {
    delete data.deliveredAt;
  }
  await setDoc(doc(db, COLLECTIONS.sendHistory, id), cleanUndefined(data as Record<string, unknown>));
  return id;
}

export async function updateSendHistoryStatus(
  id: string,
  status: SendHistory['status'],
  errorMessage?: string
): Promise<void> {
  const historyRef = doc(db, COLLECTIONS.sendHistory, id);
  const updates: Record<string, unknown> = { status };
  if (errorMessage) updates.errorMessage = errorMessage;
  if (status === 'delivered') updates.deliveredAt = toTimestamp(new Date());

  // Firestore에서 기존 문서 가져와서 업데이트
  const q = query(collection(db, COLLECTIONS.sendHistory), where('__name__', '==', id));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const existingData = snapshot.docs[0].data();
    await setDoc(historyRef, { ...existingData, ...updates });
  }
}

// === 전체 데이터 동기화 ===
export async function syncAllData() {
  const [businesses, workers, employments, reports, monthlyWages, excelMappings, retirementCalculations] = await Promise.all([
    getBusinesses(),
    getWorkers(),
    getEmployments(),
    getReports(),
    getMonthlyWages(),
    getExcelMappings(),
    getRetirementCalculations(),
  ]);

  return { businesses, workers, employments, reports, monthlyWages, excelMappings, retirementCalculations };
}
