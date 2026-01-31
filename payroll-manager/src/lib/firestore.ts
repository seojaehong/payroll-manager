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
import { Business, Worker, Employment, Report, MonthlyWage, ExcelMapping, RetirementCalculation } from '@/types';

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
const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
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
  await setDoc(doc(db, COLLECTIONS.workers, worker.id), {
    ...worker,
    createdAt: toTimestamp(worker.createdAt),
    updatedAt: toTimestamp(worker.updatedAt),
  });
}

export async function saveWorkers(workers: Worker[]): Promise<void> {
  const chunks = chunkArray(workers, BATCH_LIMIT);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((worker) => {
      const ref = doc(db, COLLECTIONS.workers, worker.id);
      batch.set(ref, {
        ...worker,
        createdAt: toTimestamp(worker.createdAt),
        updatedAt: toTimestamp(worker.updatedAt),
      });
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
  await setDoc(doc(db, COLLECTIONS.employments, employment.id), removeUndefined({
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
      batch.set(ref, removeUndefined({
        ...emp,
        createdAt: toTimestamp(emp.createdAt),
        updatedAt: toTimestamp(emp.updatedAt),
      }));
    });
    await batch.commit();
  }
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
      batch.set(ref, {
        ...wage,
        createdAt: toTimestamp(wage.createdAt),
      });
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
  await setDoc(doc(db, COLLECTIONS.excelMappings, mapping.businessId), mapping);
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
  await setDoc(doc(db, COLLECTIONS.retirementCalculations, calculation.id), removeUndefined({
    ...calculation,
    calculatedAt: toTimestamp(calculation.calculatedAt),
  }));
}

export async function deleteRetirementCalculation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.retirementCalculations, id));
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
