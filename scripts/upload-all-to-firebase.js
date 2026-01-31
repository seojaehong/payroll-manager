const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, writeBatch, Timestamp, collection, getDocs, query, where } = require('firebase/firestore');
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
const dataPath = path.join(__dirname, 'all-businesses-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// 변경사항 추적
const changes = {
  workers: { added: 0, updated: 0 },
  employments: { added: 0, updated: 0 },
  monthlyWages: { added: 0, updated: 0, changed: [] },
};

async function uploadData() {
  console.log('Firebase 업로드 시작...\n');
  console.log(`데이터 요약:`);
  console.log(`  근로자: ${data.workers.length}명`);
  console.log(`  고용관계: ${data.employments.length}건`);
  console.log(`  월별급여: ${data.monthlyWages.length}건\n`);

  // Timestamp 변환
  const toTimestamp = (dateStr) => {
    return Timestamp.fromDate(new Date(dateStr));
  };

  try {
    // 1. 근로자 업로드 (변경 감지)
    console.log(`근로자 ${data.workers.length}명 업로드 중...`);
    for (const worker of data.workers) {
      const docRef = doc(db, 'workers', worker.id);
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        const oldData = existing.data();
        if (oldData.name !== worker.name || oldData.residentNo !== worker.residentNo) {
          changes.workers.updated++;
        }
      } else {
        changes.workers.added++;
      }

      await setDoc(docRef, {
        ...worker,
        createdAt: toTimestamp(worker.createdAt),
        updatedAt: toTimestamp(worker.updatedAt),
      });
    }
    console.log(`✓ 근로자 완료 (추가: ${changes.workers.added}, 업데이트: ${changes.workers.updated})\n`);

    // 2. 고용관계 업로드
    console.log(`고용관계 ${data.employments.length}건 업로드 중...`);
    for (const emp of data.employments) {
      const docRef = doc(db, 'employments', emp.id);
      const existing = await getDoc(docRef);

      if (existing.exists()) {
        changes.employments.updated++;
      } else {
        changes.employments.added++;
      }

      await setDoc(docRef, {
        ...emp,
        createdAt: toTimestamp(emp.createdAt),
        updatedAt: toTimestamp(emp.updatedAt),
      });
    }
    console.log(`✓ 고용관계 완료 (추가: ${changes.employments.added}, 업데이트: ${changes.employments.updated})\n`);

    // 3. 월별급여 업로드 (변경 감지 - 배치 처리)
    console.log(`월별급여 ${data.monthlyWages.length}건 업로드 중...`);
    console.log('변경사항 감지 활성화됨\n');

    const batchSize = 450;
    for (let i = 0; i < data.monthlyWages.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = data.monthlyWages.slice(i, i + batchSize);

      for (const wage of chunk) {
        const ref = doc(db, 'monthlyWages', wage.id);

        // 기존 데이터 확인
        const existing = await getDoc(ref);
        if (existing.exists()) {
          const oldData = existing.data();
          if (oldData.totalWage !== wage.totalWage) {
            changes.monthlyWages.updated++;
            changes.monthlyWages.changed.push({
              id: wage.id,
              employmentId: wage.employmentId,
              yearMonth: wage.yearMonth,
              oldWage: oldData.totalWage,
              newWage: wage.totalWage,
              diff: wage.totalWage - oldData.totalWage,
            });
          }
        } else {
          changes.monthlyWages.added++;
        }

        batch.set(ref, {
          ...wage,
          createdAt: toTimestamp(wage.createdAt),
        });
      }

      await batch.commit();
      console.log(`  ${Math.min(i + batchSize, data.monthlyWages.length)}/${data.monthlyWages.length} 완료`);
    }
    console.log(`✓ 월별급여 완료 (추가: ${changes.monthlyWages.added}, 변경: ${changes.monthlyWages.updated})\n`);

    // 변경사항 요약
    console.log('='.repeat(60));
    console.log('=== 업로드 완료! ===');
    console.log('='.repeat(60));
    console.log('\n변경사항 요약:');
    console.log(`  근로자: ${changes.workers.added} 추가, ${changes.workers.updated} 업데이트`);
    console.log(`  고용관계: ${changes.employments.added} 추가, ${changes.employments.updated} 업데이트`);
    console.log(`  월별급여: ${changes.monthlyWages.added} 추가, ${changes.monthlyWages.updated} 변경`);

    // 급여 변경 상세
    if (changes.monthlyWages.changed.length > 0) {
      console.log('\n급여 변경 상세:');
      for (const change of changes.monthlyWages.changed.slice(0, 20)) {
        const sign = change.diff > 0 ? '+' : '';
        console.log(`  ${change.yearMonth}: ${change.oldWage.toLocaleString()} → ${change.newWage.toLocaleString()} (${sign}${change.diff.toLocaleString()})`);
      }
      if (changes.monthlyWages.changed.length > 20) {
        console.log(`  ... 외 ${changes.monthlyWages.changed.length - 20}건`);
      }
    }

    // 변경사항 로그 저장
    const logPath = path.join(__dirname, `upload-log-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(logPath, JSON.stringify(changes, null, 2), 'utf-8');
    console.log(`\n변경 로그 저장: ${logPath}`);

    console.log('\nFirebase Console에서 확인하세요:');
    console.log('https://console.firebase.google.com/project/payroll-manager-82c95/firestore/data');

  } catch (error) {
    console.error('오류 발생:', error);
  }

  process.exit(0);
}

uploadData();
