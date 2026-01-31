const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, writeBatch, Timestamp, collection, getDocs } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: 'AIzaSyBD5MQM0OeF0b2S6Au4h6WEw2EZfXg5GBg',
  authDomain: 'payroll-manager-82c95.firebaseapp.com',
  projectId: 'payroll-manager-82c95',
  storageBucket: 'payroll-manager-82c95.firebasestorage.app',
  messagingSenderId: '568839524151',
  appId: '1:568839524151:web:01ad6a21792ceee8fa94b2',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 부평 2026년 1월 파일 경로
const filePath = 'C:/Users/iceam/OneDrive/1.쿠우쿠우/노성창/부평/0.급여/0.2026/쿠우쿠우부평점_202601(수정).xlsx';
const yearMonth = '2026-01';
const businessId = 'biz-kukuku-bupyeong';

// 기존 데이터 로드
async function loadExistingData() {
  console.log('기존 데이터 로드 중...');

  const workers = new Map();
  const employments = new Map();
  const monthlyWages = new Map();

  // 근로자 로드
  const workersSnapshot = await getDocs(collection(db, 'workers'));
  workersSnapshot.forEach(doc => {
    workers.set(doc.data().residentNo, { id: doc.id, ...doc.data() });
  });

  // 고용관계 로드
  const employmentsSnapshot = await getDocs(collection(db, 'employments'));
  employmentsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.businessId === businessId) {
      employments.set(data.workerId, { id: doc.id, ...data });
    }
  });

  // 월별급여 로드 (2026-01)
  const wagesSnapshot = await getDocs(collection(db, 'monthlyWages'));
  wagesSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.yearMonth === yearMonth) {
      monthlyWages.set(data.employmentId, { id: doc.id, ...data });
    }
  });

  console.log(`  근로자: ${workers.size}명`);
  console.log(`  부평 고용관계: ${employments.size}건`);
  console.log(`  ${yearMonth} 급여: ${monthlyWages.size}건`);

  return { workers, employments, monthlyWages };
}

async function importData() {
  console.log('='.repeat(60));
  console.log('부평 2026년 1월 급여 데이터 임포트');
  console.log('='.repeat(60));
  console.log(`파일: ${filePath}`);
  console.log(`대상월: ${yearMonth}\n`);

  // 기존 데이터 로드
  const existing = await loadExistingData();

  // 엑셀 파일 읽기
  console.log('\n엑셀 파일 읽는 중...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = '임금대장';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`'${sheetName}' 시트를 찾을 수 없습니다.`);
    process.exit(1);
  }
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`  시트: ${sheetName}, 총 ${data.length}행`);

  // 부평 임금대장 고정 컬럼 매핑
  const headerRow = 3; // 0-indexed (4행)
  const nameCol = 1;
  const residentCol = 3;
  const wageCol = 19; // 임금총액

  console.log(`  헤더 행: ${headerRow + 1}, 이름: ${nameCol + 1}열, 주민: ${residentCol + 1}열, 급여: ${wageCol + 1}열\n`);

  // 데이터 추출 및 비교
  const changes = {
    added: [],
    updated: [],
    unchanged: [],
    notMatched: [],
  };

  const toTimestamp = (dateStr) => Timestamp.fromDate(new Date(dateStr));

  console.log('변경사항 분석 중...\n');

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[nameCol]) continue;

    const name = String(row[nameCol] || '').trim();
    const residentNo = String(row[residentCol] || '').trim();

    if (!name || name.length < 2 || !residentNo || residentNo.length < 6) continue;
    if (name.includes('합계') || name.includes('계') || name.includes('소계')) continue;

    let wage = 0;
    if (wageCol >= 0 && row[wageCol]) {
      // 숫자일 경우 그대로 사용, 문자열일 경우 파싱
      const rawWage = row[wageCol];
      if (typeof rawWage === 'number') {
        wage = Math.round(rawWage);
      } else {
        wage = parseInt(String(rawWage).replace(/[^0-9]/g, '')) || 0;
      }
    }

    // 기존 근로자 찾기
    const existingWorker = existing.workers.get(residentNo);
    if (!existingWorker) {
      changes.notMatched.push({ name, residentNo, wage });
      continue;
    }

    // 기존 고용관계 찾기
    const existingEmp = existing.employments.get(existingWorker.id);
    if (!existingEmp) {
      changes.notMatched.push({ name, residentNo, wage });
      continue;
    }

    // 기존 급여 찾기
    const existingWage = existing.monthlyWages.get(existingEmp.id);

    if (existingWage) {
      if (existingWage.totalWage !== wage) {
        changes.updated.push({
          name,
          employmentId: existingEmp.id,
          oldWage: existingWage.totalWage,
          newWage: wage,
          diff: wage - existingWage.totalWage,
        });
      } else {
        changes.unchanged.push({ name, wage });
      }
    } else {
      changes.added.push({
        name,
        employmentId: existingEmp.id,
        wage,
      });
    }
  }

  // 변경사항 요약 출력
  console.log('='.repeat(60));
  console.log('변경사항 요약');
  console.log('='.repeat(60));
  console.log(`  신규 추가: ${changes.added.length}건`);
  console.log(`  변경: ${changes.updated.length}건`);
  console.log(`  변동없음: ${changes.unchanged.length}건`);
  console.log(`  매칭 안됨: ${changes.notMatched.length}건`);

  if (changes.updated.length > 0) {
    console.log('\n변경 상세:');
    for (const change of changes.updated) {
      const sign = change.diff > 0 ? '+' : '';
      console.log(`  ${change.name}: ${change.oldWage.toLocaleString()} → ${change.newWage.toLocaleString()} (${sign}${change.diff.toLocaleString()})`);
    }
  }

  if (changes.notMatched.length > 0) {
    console.log('\n매칭 안됨 (새 근로자?):');
    for (const item of changes.notMatched) {
      console.log(`  ${item.name}: ${item.wage.toLocaleString()}`);
    }
  }

  // Firebase 업로드
  console.log('\n' + '='.repeat(60));
  console.log('Firebase 업로드 중...');
  console.log('='.repeat(60));

  // 신규 추가
  for (const item of changes.added) {
    const wageId = `mw-${item.employmentId}-${yearMonth}`;
    await setDoc(doc(db, 'monthlyWages', wageId), {
      id: wageId,
      employmentId: item.employmentId,
      yearMonth: yearMonth,
      totalWage: item.wage,
      createdAt: toTimestamp(new Date().toISOString()),
    });
    console.log(`  [추가] ${item.name}: ${item.wage.toLocaleString()}`);
  }

  // 변경
  for (const item of changes.updated) {
    const wageId = `mw-${item.employmentId}-${yearMonth}`;
    await setDoc(doc(db, 'monthlyWages', wageId), {
      id: wageId,
      employmentId: item.employmentId,
      yearMonth: yearMonth,
      totalWage: item.newWage,
      createdAt: toTimestamp(new Date().toISOString()),
    }, { merge: true });
    console.log(`  [변경] ${item.name}: ${item.oldWage.toLocaleString()} → ${item.newWage.toLocaleString()}`);
  }

  console.log('\n='.repeat(60));
  console.log('완료!');
  console.log('='.repeat(60));
  console.log(`  추가: ${changes.added.length}건`);
  console.log(`  변경: ${changes.updated.length}건`);

  process.exit(0);
}

importData().catch(console.error);
