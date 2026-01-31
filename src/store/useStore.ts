import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Business, Worker, Employment, Report, ExcelMapping, MonthlyWage } from '@/types';
import * as firestore from '@/lib/firestore';

// 초기 사업장 데이터
const initialBusinesses: Business[] = [
  {
    id: 'biz-kukuku-bupyeong',
    name: '쿠우쿠우 부평점',
    bizNo: '630-40-91109',
    gwanriNo: '79516010160',
    gyGwanriNo: '79516010160',
    sjGwanriNo: '79516010160',
    npsGwanriNo: '20008864199',
    nhicGwanriNo: '77588907',
    address: '인천 부평구 부흥로 264, 9층 (부평동, 동아웰빙타운)',
    tel: '010-9959-2647',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-gangdong',
    name: '쿠우쿠우 강동점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-geomdan',
    name: '쿠우쿠우 검단점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-godeok',
    name: '쿠우쿠우 고덕점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-masan',
    name: '쿠우쿠우 마산점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-bundang',
    name: '쿠우쿠우 분당점 (유빛)',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-sangbong',
    name: '쿠우쿠우 상봉점 (누리에프앤비)',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-songtan',
    name: '쿠우쿠우 송탄점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-yangju',
    name: '쿠우쿠우 양주옥정점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-yeonsinne',
    name: '쿠우쿠우 연신내점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-chuncheon',
    name: '쿠우쿠우 춘천점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-kukuku-uijeongbu',
    name: '쿠우쿠우 의정부민락점',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-diningone',
    name: '다이닝원',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-bluerail',
    name: '블루레일 (건대/의정부)',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'biz-always-shabu',
    name: '올웨이즈샤브',
    bizNo: '',
    gwanriNo: '',
    gyGwanriNo: '',
    sjGwanriNo: '',
    npsGwanriNo: '',
    nhicGwanriNo: '',
    address: '',
    tel: '',
    defaultJikjong: '532',
    defaultWorkHours: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 엑셀 매핑 초기 데이터
const initialMappings: ExcelMapping[] = [
  {
    businessId: 'biz-kukuku-bupyeong',
    sheetName: '임금대장',
    headerRow: 4,
    dataStartRow: 6,
    columns: {
      name: 2,
      residentNo: 4,
      joinDate: 5,
      leaveDate: 6,
      wage: 7,
    },
  },
];

interface AppState {
  // 초기화 및 동기화
  initialized: boolean;
  syncing: boolean;
  lastSyncAt: Date | null;
  syncError: string | null;
  initializeData: () => void;
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;

  // 사업장
  businesses: Business[];
  addBusiness: (business: Business) => void;
  updateBusiness: (id: string, data: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;

  // 근로자
  workers: Worker[];
  addWorker: (worker: Worker) => void;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;

  // 고용 관계
  employments: Employment[];
  addEmployment: (employment: Employment) => void;
  updateEmployment: (id: string, data: Partial<Employment>) => void;
  deleteEmployment: (id: string) => void;

  // 신고 이력
  reports: Report[];
  addReport: (report: Report) => void;

  // 월별 급여 이력
  monthlyWages: MonthlyWage[];
  addMonthlyWage: (wage: MonthlyWage) => void;
  addMonthlyWages: (wages: MonthlyWage[]) => void;
  getMonthlyWagesByEmployment: (employmentId: string, year?: number) => MonthlyWage[];

  // 엑셀 매핑
  excelMappings: ExcelMapping[];
  setExcelMapping: (mapping: ExcelMapping) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 초기화 및 동기화
      initialized: false,
      syncing: false,
      lastSyncAt: null,
      syncError: null,

      initializeData: () => {
        const state = get();
        if (!state.initialized && state.businesses.length === 0) {
          set({
            initialized: true,
            businesses: initialBusinesses,
            excelMappings: initialMappings,
          });
        } else if (!state.initialized) {
          const existingIds = new Set(state.businesses.map((b) => b.id));
          const newBusinesses = initialBusinesses.filter((b) => !existingIds.has(b.id));
          if (newBusinesses.length > 0) {
            set({
              initialized: true,
              businesses: [...state.businesses, ...newBusinesses],
            });
          } else {
            set({ initialized: true });
          }
        }
      },

      // Firebase에서 데이터 로드
      loadFromCloud: async () => {
        set({ syncing: true, syncError: null });
        try {
          const data = await firestore.syncAllData();

          // 클라우드에 데이터가 있으면 로드
          if (data.businesses.length > 0 || data.workers.length > 0) {
            set({
              businesses: data.businesses.length > 0 ? data.businesses : get().businesses,
              workers: data.workers,
              employments: data.employments,
              reports: data.reports,
              monthlyWages: data.monthlyWages,
              excelMappings: data.excelMappings.length > 0 ? data.excelMappings : get().excelMappings,
              syncing: false,
              lastSyncAt: new Date(),
              syncError: null,
            });
          } else {
            // 클라우드가 비어있으면 로컬 데이터 업로드
            await get().syncToCloud();
          }
        } catch (error) {
          console.error('Firebase 로드 실패:', error);
          set({ syncing: false, syncError: String(error) });
        }
      },

      // Firebase에 데이터 저장
      syncToCloud: async () => {
        const state = get();
        set({ syncing: true, syncError: null });

        try {
          // 모든 데이터를 Firebase에 저장
          const savePromises: Promise<void>[] = [];

          // 사업장 저장
          state.businesses.forEach((biz) => {
            savePromises.push(firestore.saveBusiness(biz));
          });

          // 근로자 저장
          if (state.workers.length > 0) {
            savePromises.push(firestore.saveWorkers(state.workers));
          }

          // 고용관계 저장
          if (state.employments.length > 0) {
            savePromises.push(firestore.saveEmployments(state.employments));
          }

          // 월별 급여 저장
          if (state.monthlyWages.length > 0) {
            savePromises.push(firestore.saveMonthlyWages(state.monthlyWages));
          }

          // 신고이력 저장
          state.reports.forEach((report) => {
            savePromises.push(firestore.saveReport(report));
          });

          // 엑셀 매핑 저장
          state.excelMappings.forEach((mapping) => {
            savePromises.push(firestore.saveExcelMapping(mapping));
          });

          await Promise.all(savePromises);

          set({ syncing: false, lastSyncAt: new Date(), syncError: null });
        } catch (error) {
          console.error('Firebase 저장 실패:', error);
          set({ syncing: false, syncError: String(error) });
          throw error;
        }
      },

      // 사업장
      businesses: [],
      addBusiness: (business) => {
        set((state) => ({ businesses: [...state.businesses, business] }));
        // 비동기로 Firebase에 저장
        firestore.saveBusiness(business).catch(console.error);
      },
      updateBusiness: (id, data) => {
        const state = get();
        const updated = state.businesses.find((b) => b.id === id);
        if (updated) {
          const newBusiness = { ...updated, ...data, updatedAt: new Date() };
          set((state) => ({
            businesses: state.businesses.map((b) => (b.id === id ? newBusiness : b)),
          }));
          firestore.saveBusiness(newBusiness).catch(console.error);
        }
      },
      deleteBusiness: (id) => {
        set((state) => ({
          businesses: state.businesses.filter((b) => b.id !== id),
        }));
        firestore.deleteBusiness(id).catch(console.error);
      },

      // 근로자
      workers: [],
      addWorker: (worker) => {
        set((state) => ({ workers: [...state.workers, worker] }));
        firestore.saveWorker(worker).catch(console.error);
      },
      updateWorker: (id, data) => {
        const state = get();
        const updated = state.workers.find((w) => w.id === id);
        if (updated) {
          const newWorker = { ...updated, ...data, updatedAt: new Date() };
          set((state) => ({
            workers: state.workers.map((w) => (w.id === id ? newWorker : w)),
          }));
          firestore.saveWorker(newWorker).catch(console.error);
        }
      },
      deleteWorker: (id) => {
        set((state) => ({
          workers: state.workers.filter((w) => w.id !== id),
        }));
      },

      // 고용 관계
      employments: [],
      addEmployment: (employment) => {
        set((state) => ({ employments: [...state.employments, employment] }));
        firestore.saveEmployment(employment).catch(console.error);
      },
      updateEmployment: (id, data) => {
        const state = get();
        const updated = state.employments.find((e) => e.id === id);
        if (updated) {
          const newEmployment = { ...updated, ...data, updatedAt: new Date() };
          set((state) => ({
            employments: state.employments.map((e) => (e.id === id ? newEmployment : e)),
          }));
          firestore.saveEmployment(newEmployment).catch(console.error);
        }
      },
      deleteEmployment: (id) => {
        set((state) => ({
          employments: state.employments.filter((e) => e.id !== id),
        }));
      },

      // 신고 이력
      reports: [],
      addReport: (report) => {
        set((state) => ({ reports: [...state.reports, report] }));
        firestore.saveReport(report).catch(console.error);
      },

      // 월별 급여 이력
      monthlyWages: [],
      addMonthlyWage: (wage) => {
        set((state) => ({ monthlyWages: [...state.monthlyWages, wage] }));
        firestore.saveMonthlyWages([wage]).catch(console.error);
      },
      addMonthlyWages: (wages) => {
        set((state) => ({
          monthlyWages: [
            ...state.monthlyWages.filter(
              (mw) => !wages.some((w) => w.employmentId === mw.employmentId && w.yearMonth === mw.yearMonth)
            ),
            ...wages,
          ],
        }));
        firestore.saveMonthlyWages(wages).catch(console.error);
      },
      getMonthlyWagesByEmployment: (employmentId, year) => {
        const state = get();
        return state.monthlyWages.filter((mw) => {
          if (mw.employmentId !== employmentId) return false;
          if (year && !mw.yearMonth.startsWith(String(year))) return false;
          return true;
        });
      },

      // 엑셀 매핑
      excelMappings: [],
      setExcelMapping: (mapping) => {
        set((state) => ({
          excelMappings: [
            ...state.excelMappings.filter((m) => m.businessId !== mapping.businessId),
            mapping,
          ],
        }));
        firestore.saveExcelMapping(mapping).catch(console.error);
      },
    }),
    {
      name: 'payroll-manager-storage',
    }
  )
);
