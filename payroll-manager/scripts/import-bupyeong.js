const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 부평 급여 파일 경로
const basePath = 'C:/Users/iceam/OneDrive/1.쿠우쿠우/노성창/부평/0.급여/~2025/00.2025';

// 결과 저장
const result = {
  workers: [],
  employments: [],
  monthlyWages: [],
};

// 이미 처리한 근로자 (주민번호 기준)
const processedWorkers = new Map();

// 12개월 처리
for (let month = 1; month <= 12; month++) {
  const monthStr = String(month);
  const monthFolder = path.join(basePath, monthStr);

  if (!fs.existsSync(monthFolder)) {
    console.log(`${month}월 폴더 없음`);
    continue;
  }

  // (세무) 파일 찾기
  const files = fs.readdirSync(monthFolder);
  const taxFile = files.find(f => f.includes('(세무)') && f.endsWith('.xlsx'));
  const regularFile = files.find(f => f.includes('부평점_2025') && !f.includes('세무') && f.endsWith('.xlsx'));

  const targetFile = taxFile || regularFile;
  if (!targetFile) {
    console.log(`${month}월 급여 파일 없음`);
    continue;
  }

  const filePath = path.join(monthFolder, targetFile);
  console.log(`처리 중: ${month}월 - ${targetFile}`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames.find(n => n.includes('임금') || n.includes('급여')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 헤더 찾기 (이름, 주민번호 등)
    let headerRow = -1;
    let nameCol = -1, residentCol = -1, wageCol = -1, joinCol = -1, leaveCol = -1;

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        if (cell === '성명' || cell === '이름') nameCol = j;
        if (cell.includes('주민') || cell === '주민등록번호') residentCol = j;
        if (cell.includes('지급') && cell.includes('계') || cell === '실지급액' || cell === '지급계') wageCol = j;
        if (cell.includes('입사') || cell === '입사일') joinCol = j;
        if (cell.includes('퇴사') || cell === '퇴사일') leaveCol = j;
      }

      if (nameCol >= 0 && residentCol >= 0) {
        headerRow = i;
        break;
      }
    }

    if (headerRow < 0) {
      console.log(`  헤더 찾을 수 없음`);
      continue;
    }

    console.log(`  헤더: ${headerRow}행, 이름: ${nameCol}, 주민: ${residentCol}, 급여: ${wageCol}`);

    // 데이터 처리
    let count = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[nameCol]) continue;

      const name = String(row[nameCol] || '').trim();
      const residentNo = String(row[residentCol] || '').trim();

      if (!name || name.length < 2 || !residentNo || residentNo.length < 6) continue;
      if (name.includes('합계') || name.includes('계') || name.includes('소계')) continue;

      // 급여
      let wage = 0;
      if (wageCol >= 0 && row[wageCol]) {
        wage = parseInt(String(row[wageCol]).replace(/[^0-9]/g, '')) || 0;
      }

      // 입사일
      let joinDate = '';
      if (joinCol >= 0 && row[joinCol]) {
        const jd = row[joinCol];
        if (typeof jd === 'number') {
          const date = XLSX.SSF.parse_date_code(jd);
          joinDate = `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
        } else {
          joinDate = String(jd);
        }
      }

      // 퇴사일
      let leaveDate = '';
      if (leaveCol >= 0 && row[leaveCol]) {
        const ld = row[leaveCol];
        if (typeof ld === 'number') {
          const date = XLSX.SSF.parse_date_code(ld);
          leaveDate = `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
        } else {
          leaveDate = String(ld);
        }
      }

      // 근로자 등록 (중복 체크)
      let workerId = processedWorkers.get(residentNo);
      if (!workerId) {
        workerId = `worker-bupyeong-${Date.now()}-${result.workers.length}`;
        result.workers.push({
          id: workerId,
          name: name,
          residentNo: residentNo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        processedWorkers.set(residentNo, workerId);

        // 고용관계
        const employmentId = `emp-bupyeong-${Date.now()}-${result.employments.length}`;
        result.employments.push({
          id: employmentId,
          workerId: workerId,
          businessId: 'biz-kukuku-bupyeong',
          status: leaveDate ? 'INACTIVE' : 'ACTIVE',
          joinDate: joinDate || '2025-01-01',
          leaveDate: leaveDate || undefined,
          monthlyWage: wage,
          jikjongCode: '532',
          workHours: 40,
          gyYn: true,
          sjYn: true,
          npsYn: true,
          nhicYn: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // 월별 급여
        if (wage > 0) {
          const yearMonth = `2025-${String(month).padStart(2, '0')}`;
          result.monthlyWages.push({
            id: `mw-${employmentId}-${yearMonth}`,
            employmentId: employmentId,
            yearMonth: yearMonth,
            totalWage: wage,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // 기존 근로자 - 월별 급여만 추가
        const employment = result.employments.find(e => e.workerId === workerId);
        if (employment && wage > 0) {
          const yearMonth = `2025-${String(month).padStart(2, '0')}`;
          // 중복 체크
          const existing = result.monthlyWages.find(m => m.employmentId === employment.id && m.yearMonth === yearMonth);
          if (!existing) {
            result.monthlyWages.push({
              id: `mw-${employment.id}-${yearMonth}`,
              employmentId: employment.id,
              yearMonth: yearMonth,
              totalWage: wage,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      count++;
    }

    console.log(`  ${count}명 처리`);

  } catch (err) {
    console.error(`  오류: ${err.message}`);
  }
}

// 결과 저장
const outputPath = path.join(__dirname, 'bupyeong-data.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

console.log('\n=== 완료 ===');
console.log(`근로자: ${result.workers.length}명`);
console.log(`고용관계: ${result.employments.length}건`);
console.log(`월별급여: ${result.monthlyWages.length}건`);
console.log(`저장: ${outputPath}`);
