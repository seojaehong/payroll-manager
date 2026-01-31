# Firebase Firestore 연동: 로컬에서 클라우드로

> 브라우저 localStorage의 한계를 넘어 진정한 데이터베이스로.

## 왜 Firebase인가?

### localStorage의 한계
- 5MB 용량 제한
- 브라우저별 독립 (다른 기기 접근 불가)
- 백업/복원 수동
- 데이터 손실 위험 (브라우저 초기화 시)

### Firebase Firestore 장점
- 무제한 저장 (비용 기반)
- 실시간 동기화
- 다중 기기 접근
- 자동 백업
- 오프라인 지원

## 설정

### Firebase 프로젝트 생성

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=payroll-manager-82c95.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=payroll-manager-82c95
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=payroll-manager-82c95.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=568839524151
NEXT_PUBLIC_FIREBASE_APP_ID=1:568839524151:web:01ad6a21792ceee8fa94b2
```

### Firestore 초기화

```typescript
// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // ...
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
```

## 컬렉션 구조

```
firestore/
├── businesses/           # 사업장
│   ├── biz-kukuku-bupyeong
│   └── biz-kukuku-gangdong
├── workers/              # 근로자
├── employments/          # 고용관계
├── monthlyWages/         # 월별 급여
├── reports/              # 신고 이력
└── excelMappings/        # 엑셀 매핑
```

## CRUD 함수

```typescript
// lib/firestore.ts

// Date <-> Timestamp 변환 (localStorage 호환)
const toTimestamp = (date: Date | string) => {
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return Timestamp.fromDate(date);
};

// 사업장 저장
export async function saveBusiness(business: Business): Promise<void> {
  await setDoc(doc(db, 'businesses', business.id), {
    ...business,
    createdAt: toTimestamp(business.createdAt),
    updatedAt: toTimestamp(business.updatedAt),
  });
}

// 전체 데이터 동기화
export async function syncAllData() {
  const [businesses, workers, employments, ...] = await Promise.all([
    getBusinesses(),
    getWorkers(),
    getEmployments(),
    // ...
  ]);

  return { businesses, workers, employments, ... };
}
```

## 보안 규칙

```javascript
// Firestore Rules (테스트용)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ 프로덕션에서는 인증 기반 규칙 필요!

## 결과

- **데이터 안전**: 클라우드 백업 자동화
- **다중 기기**: 어디서든 접근 가능
- **실시간**: 변경 즉시 반영
- **무료 할당량**: 일 50,000 읽기 / 20,000 쓰기

---

*"로컬 스토리지는 임시, 데이터베이스는 영구"*
