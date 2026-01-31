const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 사업장 설정 (경로, 비즈니스ID, 파일 패턴)
const businessConfigs = [
  {
    id: 'biz-kukuku-gangdong',
    name: '강동',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/강동/급여/2025',
    filePattern: ['강동점', '임금대장'],
    monthFormat: 'number', // 1, 2, 3...
  },
  {
    id: 'biz-kukuku-geomdan',
    name: '검단',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/검단/급여/0.2025',
    filePattern: ['검단점'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-godeok',
    name: '고덕',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/고덕/급여/2025',
    filePattern: ['고덕', '임금대장'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-masan',
    name: '마산',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/마산/0.급여/2025',
    filePattern: ['마산점'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-sangbong',
    name: '상봉',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/상봉(누리에프앤비)/0.급여/2025',
    filePattern: ['상봉', '누리'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-yangju',
    name: '양주옥정',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/양주옥정/급여',
    filePattern: ['양주옥정점', '옥정'],
    monthFormat: 'yyyymm', // 202501, 202502...
  },
  {
    id: 'biz-kukuku-yeonsinne',
    name: '연신내',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/연신내/1.급여/0.2025',
    filePattern: ['연신내'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-uijeongbu',
    name: '의정부민락',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/의정부(민락)/0.2025',
    filePattern: ['민락점', '민락'],
    monthFormat: 'number',
  },
  {
    id: 'biz-kukuku-bluerail',
    name: '블루레일',
    basePath: 'C:/Users/iceam/OneDrive/1.쿠우쿠우/블루레일(건대.의정부)/1.건대/1.급여/2025',
    filePattern: ['블루레일', '건대'],
    monthFormat: 'number',
  },
];

// 결과 저장
const result = {
  workers: [],
  employments: [],
  monthlyWages: [],
};

// 이미 처리한 근로자 (주민번호+사업장 기준)
const processedWorkers = new Map();

// 특정 사업장 처리
function processBusiness(config) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`사업장: ${config.name} (${config.id})`);
  console.log(`경로: ${config.basePath}`);
  console.log(`${'='.repeat(50)}`);

  if (!fs.existsSync(config.basePath)) {
    console.log(`  [스킵] 폴더가 존재하지 않음`);
    return { workers: 0, employments: 0, monthlyWages: 0 };
  }

  let totalWorkers = 0;
  let totalEmployments = 0;
  let totalMonthlyWages = 0;

  // 12개월 처리
  for (let month = 1; month <= 12; month++) {
    let monthFolder;
    if (config.monthFormat === 'yyyymm') {
      monthFolder = path.join(config.basePath, `2025${String(month).padStart(2, '0')}`);
    } else {
      monthFolder = path.join(config.basePath, String(month));
    }

    if (!fs.existsSync(monthFolder)) {
      console.log(`  ${month}월 폴더 없음: ${monthFolder}`);
      continue;
    }

    // 파일 찾기 (세무 파일 우선, 수정 파일 우선)
    const files = fs.readdirSync(monthFolder);
    let targetFile = null;

    // 1. (세무) 파일 찾기
    targetFile = files.find(f =>
      f.includes('(세무)') &&
      f.endsWith('.xlsx') &&
      config.filePattern.some(p => f.includes(p))
    );

    // 2. (수정) 파일 찾기
    if (!targetFile) {
      targetFile = files.find(f =>
        f.includes('(수정)') &&
        f.endsWith('.xlsx') &&
        config.filePattern.some(p => f.includes(p))
      );
    }

    // 3. 일반 파일 찾기
    if (!targetFile) {
      targetFile = files.find(f =>
        f.endsWith('.xlsx') &&
        !f.includes('일용') &&
        !f.includes('파트') &&
        !f.includes('근로내용') &&
        !f.includes('알바') &&
        !f.includes('급여자료') &&
        !f.includes('퇴사자') &&
        config.filePattern.some(p => f.includes(p))
      );
    }

    if (!targetFile) {
      console.log(`  ${month}월 급여 파일 없음`);
      continue;
    }

    const filePath = path.join(monthFolder, targetFile);
    console.log(`  처리 중: ${month}월 - ${targetFile}`);

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames.find(n =>
        n.includes('임금') || n.includes('급여') || n.includes('월별')
      ) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // 헤더 찾기
      let headerRow = -1;
      let nameCol = -1, residentCol = -1, wageCol = -1, joinCol = -1, leaveCol = -1;

      for (let i = 0; i < Math.min(15, data.length); i++) {
        const row = data[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          if (cell === '성명' || cell === '이름') nameCol = j;
          if (cell.includes('주민') || cell === '주민등록번호') residentCol = j;
          if ((cell.includes('지급') && cell.includes('계')) || cell === '실지급액' || cell === '지급계' || cell === '지급총액') wageCol = j;
          if (cell.includes('입사') || cell === '입사일') joinCol = j;
          if (cell.includes('퇴사') || cell === '퇴사일') leaveCol = j;
        }

        if (nameCol >= 0 && residentCol >= 0) {
          headerRow = i;
          break;
        }
      }

      if (headerRow < 0) {
        console.log(`    헤더 찾을 수 없음`);
        continue;
      }

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

        // 근로자+사업장 조합 키 (같은 사람이 다른 사업장에 있을 수 있음)
        const workerKey = `${residentNo}_${config.id}`;
        let workerId = processedWorkers.get(workerKey);

        if (!workerId) {
          // 새 근로자
          workerId = `worker-${config.name}-${Date.now()}-${result.workers.length}`;
          result.workers.push({
            id: workerId,
            name: name,
            residentNo: residentNo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          processedWorkers.set(workerKey, workerId);
          totalWorkers++;

          // 고용관계
          const employmentId = `emp-${config.name}-${Date.now()}-${result.employments.length}`;
          result.employments.push({
            id: employmentId,
            workerId: workerId,
            businessId: config.id,
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
          totalEmployments++;

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
            totalMonthlyWages++;
          }
        } else {
          // 기존 근로자 - 월별 급여만 추가
          const employment = result.employments.find(e => e.workerId === workerId && e.businessId === config.id);
          if (employment && wage > 0) {
            const yearMonth = `2025-${String(month).padStart(2, '0')}`;
            const existing = result.monthlyWages.find(m => m.employmentId === employment.id && m.yearMonth === yearMonth);
            if (!existing) {
              result.monthlyWages.push({
                id: `mw-${employment.id}-${yearMonth}`,
                employmentId: employment.id,
                yearMonth: yearMonth,
                totalWage: wage,
                createdAt: new Date().toISOString(),
              });
              totalMonthlyWages++;
            }
          }
        }
        count++;
      }

      console.log(`    ${count}명 처리`);

    } catch (err) {
      console.error(`    오류: ${err.message}`);
    }
  }

  return { workers: totalWorkers, employments: totalEmployments, monthlyWages: totalMonthlyWages };
}

// 모든 사업장 처리
console.log('쿠우쿠우 전 사업장 급여 데이터 임포트');
console.log(`사업장 수: ${businessConfigs.length}개`);

const stats = {};
for (const config of businessConfigs) {
  stats[config.name] = processBusiness(config);
}

// 결과 저장
const outputPath = path.join(__dirname, 'all-businesses-data.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

// 요약 출력
console.log('\n' + '='.repeat(60));
console.log('=== 전체 임포트 완료 ===');
console.log('='.repeat(60));
console.log('\n사업장별 요약:');
for (const [name, stat] of Object.entries(stats)) {
  console.log(`  ${name}: 근로자 ${stat.workers}명, 급여 ${stat.monthlyWages}건`);
}
console.log('\n전체 합계:');
console.log(`  근로자: ${result.workers.length}명`);
console.log(`  고용관계: ${result.employments.length}건`);
console.log(`  월별급여: ${result.monthlyWages.length}건`);
console.log(`\n저장: ${outputPath}`);
