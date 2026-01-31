# Firebase로 완성한 하이브리드 워크플로우: 시리즈 완결편

> **TL;DR**: localStorage의 속도와 Firestore의 안정성을 결합한 하이브리드 저장소를 구축했습니다. 로컬에서 즉각 반응하면서 백그라운드로 클라우드 동기화. 이 시리즈에서 다룬 전체 여정을 정리하고, AI 코딩 도구로 프로그램을 만든 소회를 공유합니다.

---

## 들어가며: 왜 Firebase인가?

7편까지 만든 시스템은 **완전히 로컬에서 동작**했습니다.

하지만 현실적인 문제가 있었어요.

### localStorage의 한계

- **5MB 용량 제한**: 데이터가 많아지면 위험
- **브라우저별 독립**: 다른 기기에서 접근 불가
- **데이터 손실 위험**: 브라우저 초기화 시 모든 게 날아감
- **수동 백업 필요**: 잊으면 끝

### Firebase Firestore의 장점

- **무제한 저장**: 비용 기반으로 확장
- **실시간 동기화**: 여러 기기에서 동시 사용
- **자동 백업**: Google 인프라의 안정성
- **오프라인 지원**: 인터넷 끊겨도 캐시 동작

---

## Firebase 프로젝트 설정

### 1단계: Firebase 콘솔에서 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: payroll-manager)
4. Google Analytics 설정 (선택)

### 2단계: 웹 앱 추가

1. 프로젝트 설정 > 일반 > "앱 추가" > 웹
2. 앱 닉네임 입력
3. Firebase SDK 설정 정보 복사

### 3단계: 환경변수 설정

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=payroll-manager-82c95.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=payroll-manager-82c95
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=payroll-manager-82c95.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=568839524151
NEXT_PUBLIC_FIREBASE_APP_ID=1:568839524151:web:01ad6a21792ceee8fa94b2
```

### 4단계: Firebase 초기화

```typescript
// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 중복 초기화 방지
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db = getFirestore(app);
```

**[캡처 필요 #1]**: Firebase 콘솔 - Firestore Database 화면

---

## Firestore 컬렉션 구조

```
firestore/
├── businesses/           # 사업장
│   ├── biz-kukuku-bupyeong
│   ├── biz-kukuku-gangdong
│   └── ...
├── workers/              # 근로자
├── employments/          # 고용관계
├── monthlyWages/         # 월별 급여
├── reports/              # 신고 이력
└── excelMappings/        # 엑셀 매핑
```

각 문서는 localStorage와 **동일한 구조**를 사용합니다. 변환 로직이 필요 없어요.

---

## CRUD 함수 구현

### Date ↔ Timestamp 변환

localStorage는 Date를 문자열로 저장하지만, Firestore는 Timestamp 객체를 사용합니다.

```typescript
import { Timestamp } from 'firebase/firestore';

// Date/문자열 → Timestamp 변환
const toTimestamp = (date: Date | string | undefined) => {
  if (!date) return null;
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
};

// Timestamp → Date 변환
const fromTimestamp = (timestamp: Timestamp | null) => {
  if (!timestamp) return null;
  return timestamp.toDate();
};
```

### 사업장 저장

```typescript
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function saveBusiness(business: Business): Promise<void> {
  await setDoc(doc(db, 'businesses', business.id), {
    ...business,
    createdAt: toTimestamp(business.createdAt),
    updatedAt: toTimestamp(business.updatedAt),
  });
}

export async function getBusinesses(): Promise<Business[]> {
  const snapshot = await getDocs(collection(db, 'businesses'));
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    createdAt: fromTimestamp(doc.data().createdAt),
    updatedAt: fromTimestamp(doc.data().updatedAt),
  })) as Business[];
}

export async function deleteBusiness(id: string): Promise<void> {
  await deleteDoc(doc(db, 'businesses', id));
}
```

### 전체 데이터 동기화

```typescript
export async function syncAllData() {
  const [businesses, workers, employments, monthlyWages, reports, excelMappings] =
    await Promise.all([
      getBusinesses(),
      getWorkers(),
      getEmployments(),
      getMonthlyWages(),
      getReports(),
      getExcelMappings(),
    ]);

  return {
    businesses,
    workers,
    employments,
    monthlyWages,
    reports,
    excelMappings,
  };
}
```

---

## 하이브리드 아키텍처

**핵심 전략**: 로컬 우선 + 백그라운드 동기화

```
┌─────────────────────────────────────────────────┐
│                    앱 (React)                    │
├─────────────────────────────────────────────────┤
│                 Zustand Store                    │
│  ┌──────────────┐    ┌──────────────┐           │
│  │ localStorage │ ←→ │  Firestore   │           │
│  │   (빠른)     │    │  (영구)      │           │
│  └──────────────┘    └──────────────┘           │
└─────────────────────────────────────────────────┘
```

### 1. 로컬 우선 (Optimistic Update)

사용자 액션은 즉시 로컬에 반영합니다.

```typescript
addBusiness: (business) => {
  // 1. 즉시 로컬에 저장 (UI 반응성)
  set((state) => ({
    businesses: [...state.businesses, business]
  }));

  // 2. 비동기로 Firebase에 저장 (백그라운드)
  firestore.saveBusiness(business).catch(console.error);
},
```

**장점**: 네트워크 지연과 무관하게 UI가 즉각 반응

### 2. 클라우드에서 불러오기

```typescript
loadFromCloud: async () => {
  set({ syncing: true, syncError: null });

  try {
    const data = await firestore.syncAllData();

    if (data.businesses.length > 0) {
      // 클라우드 데이터로 로컬 덮어쓰기
      set({
        businesses: data.businesses,
        workers: data.workers,
        employments: data.employments,
        monthlyWages: data.monthlyWages,
        reports: data.reports,
        excelMappings: data.excelMappings,
        syncing: false,
        lastSyncAt: new Date(),
      });
    } else {
      // 클라우드가 비어있으면 로컬 → 클라우드 업로드
      console.log('클라우드 비어있음, 로컬 데이터 업로드');
      await get().syncToCloud();
    }
  } catch (error) {
    set({ syncing: false, syncError: String(error) });
    console.error('동기화 실패:', error);
  }
},
```

### 3. 클라우드에 저장하기

```typescript
syncToCloud: async () => {
  const state = get();
  set({ syncing: true });

  const savePromises: Promise<void>[] = [];

  // 모든 데이터를 Firebase에 저장
  state.businesses.forEach(biz => {
    savePromises.push(firestore.saveBusiness(biz));
  });

  if (state.workers.length > 0) {
    savePromises.push(firestore.saveWorkers(state.workers));
  }

  if (state.employments.length > 0) {
    savePromises.push(firestore.saveEmployments(state.employments));
  }

  // ... 기타 데이터

  await Promise.all(savePromises);
  set({ syncing: false, lastSyncAt: new Date() });

  console.log('클라우드 동기화 완료');
},
```

---

## 동기화 상태 UI

사용자에게 동기화 상태를 시각적으로 보여줍니다.

```tsx
const SyncStatus = () => {
  const { syncing, syncError, lastSyncAt, loadFromCloud, syncToCloud } =
    useStore();

  return (
    <div className="glass p-4">
      {/* 상태 표시등 */}
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          syncing ? 'bg-yellow-500 animate-pulse' :
          syncError ? 'bg-red-500' :
          'bg-green-500'
        }`} />

        <span className="text-white/80">
          {syncing ? '동기화 중...' :
           syncError ? `오류: ${syncError}` :
           lastSyncAt ? `마지막: ${lastSyncAt.toLocaleString()}` :
           '동기화 필요'}
        </span>
      </div>

      {/* 수동 동기화 버튼 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={loadFromCloud}
          disabled={syncing}
          className="btn-secondary flex-1"
        >
          클라우드에서 불러오기
        </button>
        <button
          onClick={syncToCloud}
          disabled={syncing}
          className="btn-primary flex-1"
        >
          클라우드에 저장하기
        </button>
      </div>
    </div>
  );
};
```

**[캡처 필요 #2]**: 동기화 상태 UI - 초록색/노란색/빨간색 상태 표시

---

## Firestore 보안 규칙

### 개발 중 (테스트용)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**주의**: 이 설정은 누구나 읽고 쓸 수 있어요. 개발 중에만 사용하세요.

### 프로덕션용 (인증 필요)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

인증 기능 추가는 향후 과제로 남겨뒀습니다.

---

## 무료 할당량

Firebase Firestore는 무료 할당량이 있어요.

| 항목 | 일일 무료 할당량 |
|------|-----------------|
| 문서 읽기 | 50,000 |
| 문서 쓰기 | 20,000 |
| 문서 삭제 | 20,000 |
| 저장 용량 | 1GB |

**15개 사업장, 300명 근로자** 규모에서는 충분합니다.

---

## 전체 아키텍처 정리

```
┌────────────────────────────────────────────────────────────────┐
│                         사용자                                  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      Next.js 앱 (React)                         │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Pages      │  │ Components  │  │  xlsx 처리               │ │
│  │  (라우팅)    │  │  (UI)       │  │  (엑셀 읽기/쓰기)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                    Zustand Store (상태 관리)                    │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │  persist 미들웨어     │    │  Firebase 동기화      │          │
│  │  (localStorage)      │    │  (Firestore)         │          │
│  └──────────────────────┘    └──────────────────────┘          │
└────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│      localStorage       │    │    Firebase Firestore    │
│  (로컬, 빠름, 임시)      │    │  (클라우드, 안정, 영구)   │
└─────────────────────────┘    └─────────────────────────┘
```

---

## 시리즈 회고: AI와 함께 만든 여정

### 1편부터 8편까지의 여정

| 편 | 주제 | 핵심 |
|:--:|------|------|
| 1편 | 문제 정의 | 30개 사업장 엑셀 노가다 탈출 |
| 2편 | 데이터 설계 | 근로복지공단 API 분석 |
| 3편 | 엑셀 매핑 | 30개 다른 양식 정복 |
| 4편 | 보수 계산 | 추정 대신 실제 데이터 |
| 5편 | UI 설계 | 사업장 중심 대시보드 |
| 6편 | 디자인 | Liquid Glass UI |
| 7편 | 오프라인 | localStorage + Zustand |
| 8편 | 클라우드 | Firebase 하이브리드 |

### Claude Code와 함께한 소감

**처음에는 반신반의**했어요. "AI가 진짜 코드를 짜준다고?"

하지만 대화하면서 하나씩 만들어가니, 생각보다 훨씬 잘 됐습니다.

**잘 된 점**:
- 대화로 요구사항을 구체화
- 모르는 라이브러리도 AI가 설명하며 사용
- 버그 발생 시 같이 디버깅
- 코드 리뷰를 AI가 해줌

**어려웠던 점**:
- AI가 잘못된 코드를 제안할 때도 있음
- 복잡한 로직은 여러 번 수정 필요
- 전체 아키텍처는 결국 사람이 결정해야 함

### 노무사가 개발자가 된 것은 아니다

중요한 점: **저는 개발자가 아닙니다**.

하지만 **내 업무를 가장 잘 아는 사람**이에요. 어떤 데이터가 필요하고, 어떤 흐름으로 일하는지.

AI는 그 도메인 지식을 코드로 번역해주는 도구였습니다.

---

## 향후 계획

### 단기

- [ ] 사용자 인증 추가 (Firebase Auth)
- [ ] Chrome 확장프로그램으로 근로복지공단 자동 입력
- [ ] 모바일 반응형 UI 개선

### 장기

- [ ] 다른 노무사 사무실에서 사용할 수 있도록 범용화
- [ ] 건강보험공단, 국민연금공단 연동
- [ ] 급여 계산 기능 추가

---

## 마치며: 당신도 만들 수 있다

이 시리즈가 전하고 싶은 메시지입니다.

> **"코딩을 못해도, AI와 대화하면서 프로그램을 만들 수 있다"**

물론 쉽지만은 않아요. 시행착오도 있고, 수정도 많이 했습니다.

하지만 **반복적인 업무에 시간을 빼앗기고 있다면**, 한번 시도해볼 가치가 있습니다.

**내 업무를 가장 잘 아는 것은 나 자신**이니까요.

---

### 시리즈 전체 목록

1. [30개 사업장 엑셀 노가다 탈출기: AI 개발 입문](/blog/part-01)
2. [근로복지공단 API 분석: 데이터 설계의 시작](/blog/part-02)
3. [엑셀의 마법: 30개 사업장의 다른 양식을 하나로](/blog/part-03)
4. [상실신고의 핵심: 전년도/당해년도 보수 자동 계산](/blog/part-04)
5. [15개 사업장 대시보드: 사업장 중심 UI 설계](/blog/part-05)
6. [Liquid Glass UI: 업무용 툴도 아름다워야 한다](/blog/part-06)
7. [Offline-First 전략: 인터넷 없어도 작동하는 앱](/blog/part-07)
8. [Firebase로 완성한 하이브리드 워크플로우](/blog/part-08) (현재 글)

---

**관련 키워드**: Firebase Firestore, 하이브리드 저장소, 실시간 동기화, Claude Code AI 개발, 노무사 업무 자동화, 4대보험 자동화 시스템

---

*긴 시리즈를 끝까지 읽어주셔서 감사합니다. 질문이나 피드백은 댓글로 남겨주세요!*
