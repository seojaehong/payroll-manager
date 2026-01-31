const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch, Timestamp } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase 설정
const firebaseConfig = {
  apiKey: 'AIzaSyBD5MQM0OeF0b2S6Au4h6WEw2EZfXg5GBg',
  authDomain: 'payroll-manager-82c95.firebaseapp.com',
  projectId: 'payroll-manager-82c95',
  storageBucket: 'payroll-manager-82c95.firebasestorage.app',
  messagingSenderId: '568839524151',
  appId: '1:568839524151:web:01ad6a21792ceee8fa94b2',
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// JSON 데이터 로드
const dataPath = path.join(__dirname, 'bupyeong-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

async function uploadData() {
  console.log('Firebase 업로드 시작...\n');

  // Timestamp 변환
  const toTimestamp = (dateStr) => {
    return Timestamp.fromDate(new Date(dateStr));
  };

  try {
    // 1. 근로자 업로드
    console.log(`근로자 ${data.workers.length}명 업로드 중...`);
    for (const worker of data.workers) {
      await setDoc(doc(db, 'workers', worker.id), {
        ...worker,
        createdAt: toTimestamp(worker.createdAt),
        updatedAt: toTimestamp(worker.updatedAt),
      });
    }
    console.log('✓ 근로자 완료\n');

    // 2. 고용관계 업로드
    console.log(`고용관계 ${data.employments.length}건 업로드 중...`);
    for (const emp of data.employments) {
      await setDoc(doc(db, 'employments', emp.id), {
        ...emp,
        createdAt: toTimestamp(emp.createdAt),
        updatedAt: toTimestamp(emp.updatedAt),
      });
    }
    console.log('✓ 고용관계 완료\n');

    // 3. 월별급여 업로드 (배치 처리)
    console.log(`월별급여 ${data.monthlyWages.length}건 업로드 중...`);

    // 500개씩 배치 처리 (Firestore 제한)
    const batchSize = 450;
    for (let i = 0; i < data.monthlyWages.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = data.monthlyWages.slice(i, i + batchSize);

      for (const wage of chunk) {
        const ref = doc(db, 'monthlyWages', wage.id);
        batch.set(ref, {
          ...wage,
          createdAt: toTimestamp(wage.createdAt),
        });
      }

      await batch.commit();
      console.log(`  ${Math.min(i + batchSize, data.monthlyWages.length)}/${data.monthlyWages.length} 완료`);
    }
    console.log('✓ 월별급여 완료\n');

    console.log('=== 업로드 완료! ===');
    console.log('Firebase Console에서 확인하세요:');
    console.log('https://console.firebase.google.com/project/payroll-manager-82c95/firestore/data');

  } catch (error) {
    console.error('오류 발생:', error);
  }

  process.exit(0);
}

uploadData();
