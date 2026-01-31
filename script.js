// ========================================
// 뉴로 코치 앱 - 메인 스크립트
// ========================================

// 전역 변수
let timerInterval = null;
let timerSeconds = 120; // 2분

// ========================================
// 화면 전환 함수
// ========================================
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });

    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.classList.add('active');
    }
}

// ========================================
// 상태 매핑
// ========================================
const stateMapping = {
    head: { state: 'hypo', message: '머리가 무겁고 생각이 복잡한 상태시군요' },
    chest: { state: 'hyper', message: '가슴이 답답하고 불안한 상태시군요' },
    stomach: { state: 'hyper', message: '배가 긴장되고 불편한 상태시군요' },
    legs: { state: 'hypo', message: '다리가 무겁고 힘이 없는 상태시군요' }
};

// ========================================
// 리셋 행동 라이브러리
// ========================================
const resetActions = {
    hyper: [
        { level: 1, action: '4초 들이쉬고, 7초 참고, 8초 내쉬는 호흡을 3번 해보세요', lower: '4-7-8 호흡을 1번만 해보세요' },
        { level: 2, action: '주변의 파란색 물건 3개를 찾아보세요', lower: '파란색 물건 1개만 찾아보세요' },
        { level: 3, action: '얼음을 10초 동안 쥐어보세요', lower: '찬물에 손을 5초만 담가보세요' }
    ],
    hypo: [
        { level: 1, action: '찬물로 손목을 10초 동안 씻어보세요', lower: '손바닥에 찬물 한 방울만 떨어뜨려보세요' },
        { level: 2, action: '제자리에서 20초 동안 걸어보세요', lower: '제자리에서 발을 3번만 움직여보세요' },
        { level: 3, action: '기지개를 켜며 큰 소리를 내보세요', lower: '팔만 위로 뻗어보세요' }
    ]
};

// ========================================
// 로컬 스토리지 관리
// ========================================

// 세션 데이터 로드
function loadSessions() {
    const data = localStorage.getItem('neuroCoachSessions');
    return data ? JSON.parse(data) : [];
}

// 세션 데이터 저장
function saveSessions(sessions) {
    localStorage.setItem('neuroCoachSessions', JSON.stringify(sessions));
}

// 새 세션 추가
function addSession(sessionData) {
    const sessions = loadSessions();
    sessions.push(sessionData);
    saveSessions(sessions);
}

// 오늘의 기록 카운트 계산
function getTodayCount() {
    const sessions = loadSessions();
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter(s => s.date === today && s.completed).length;
}

// 연속 실행일 계산
function calculateStreak() {
    const sessions = loadSessions();
    let streak = 0;
    let currentDate = new Date();

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasCompletedSession = sessions.some(s => s.date === dateStr && s.completed);
        if (!hasCompletedSession) break;
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}

// 홈 화면 통계 업데이트
function updateHomeStats() {
    const todayCount = getTodayCount();
    const streakCount = calculateStreak();

    document.getElementById('todayCount').textContent = todayCount;
    document.getElementById('streakCount').textContent = streakCount;
}

// ========================================
// 타이머 기능
// ========================================

// 타이머 시작
function startTimer() {
    timerSeconds = 120; // 2분
    updateTimerDisplay();
    updateTimerProgress();

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        updateTimerProgress();

        if (timerSeconds <= 0) {
            stopTimer();
            // 타이머 종료 시 자동으로 완료 처리
            completeSession(true);
        }
    }, 1000);
}

// 타이머 중지
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// 타이머 디스플레이 업데이트
function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    document.getElementById('timerMinutes').textContent = minutes;
    document.getElementById('timerSeconds').textContent = seconds.toString().padStart(2, '0');
}

// 타이머 프로그레스 업데이트
function updateTimerProgress() {
    const progress = document.getElementById('timerProgress');
    const circumference = 2 * Math.PI * 120; // 반지름 120
    const offset = circumference - (timerSeconds / 120) * circumference;
    progress.style.strokeDashoffset = offset;
}

// 세션 완료 처리
function completeSession(completed) {
    stopTimer();

    const currentAction = JSON.parse(localStorage.getItem('currentAction') || '{}');
    const selectedPart = localStorage.getItem('selectedPart');
    const currentState = localStorage.getItem('currentState');
    const resistanceCount = parseInt(localStorage.getItem('resistanceCount') || '0');

    const now = new Date();
    const sessionData = {
        id: now.getTime(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].slice(0, 5),
        bodyPart: selectedPart,
        state: currentState,
        resetAction: currentAction.action || '',
        completed: completed,
        feedback: null,
        resistanceCount: resistanceCount
    };

    // 임시로 저장 (피드백 후 최종 저장)
    localStorage.setItem('pendingSession', JSON.stringify(sessionData));

    // 완료 화면으로 이동
    updateCompleteStats();
    showScreen('complete');
}

// 완료 화면 통계 업데이트
function updateCompleteStats() {
    const todayCount = getTodayCount() + 1; // 현재 세션 포함
    const streakCount = calculateStreak();

    document.getElementById('completeTodayCount').textContent = todayCount;
    document.getElementById('completeStreakCount').textContent = streakCount > 0 ? streakCount : 1;
}

// 피드백 저장 및 세션 완료
function saveFeedback(feedback) {
    const pendingSession = JSON.parse(localStorage.getItem('pendingSession') || '{}');
    pendingSession.feedback = feedback;

    addSession(pendingSession);
    localStorage.removeItem('pendingSession');
    localStorage.removeItem('currentAction');
    localStorage.removeItem('selectedPart');
    localStorage.removeItem('currentState');
    localStorage.setItem('resistanceCount', '0');

    updateHomeStats();
}

// ========================================
// DOM 로드 후 실행
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // 홈 화면 통계 초기화
    updateHomeStats();

    // ========================================
    // 홈 화면
    // ========================================
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const todayCount = getTodayCount();
            if (todayCount >= 3) {
                alert('오늘은 이미 3번의 리셋을 완료했습니다!\n내일 다시 시도해보세요.');
                return;
            }
            showScreen('select');
        });
    }

    // ========================================
    // 감각 선택 화면
    // ========================================
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showScreen('home');
        });
    }

    document.querySelectorAll('.body-part-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const part = e.currentTarget.dataset.part;
            const stateInfo = stateMapping[part];
            const actions = resetActions[stateInfo.state];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            // localStorage에 저장
            localStorage.setItem('selectedPart', part);
            localStorage.setItem('currentState', stateInfo.state);
            localStorage.setItem('currentAction', JSON.stringify(randomAction));
            localStorage.setItem('resistanceCount', '0');

            // 리셋 화면 업데이트
            document.getElementById('state-message').textContent = stateInfo.message;
            document.getElementById('reset-action').textContent = randomAction.action;

            // 리셋 화면으로 전환
            showScreen('reset');
        });
    });

    // ========================================
    // 리셋 제안 화면
    // ========================================
    const resetBackBtn = document.getElementById('resetBackBtn');
    if (resetBackBtn) {
        resetBackBtn.addEventListener('click', () => {
            showScreen('select');
        });
    }

    // 50% 낮추기 버튼
    const lowerBtn = document.getElementById('lowerBtn');
    if (lowerBtn) {
        lowerBtn.addEventListener('click', () => {
            const actionData = JSON.parse(localStorage.getItem('currentAction'));
            document.getElementById('reset-action').textContent = actionData.lower;

            // 저항 횟수 기록
            const resistCount = parseInt(localStorage.getItem('resistanceCount') || '0');
            localStorage.setItem('resistanceCount', resistCount + 1);
        });
    }

    // 지금 할게요 버튼
    const startResetBtn = document.getElementById('startResetBtn');
    if (startResetBtn) {
        startResetBtn.addEventListener('click', () => {
            const currentAction = JSON.parse(localStorage.getItem('currentAction') || '{}');
            const resetActionText = document.getElementById('reset-action').textContent;

            // 타이머 화면에 행동 표시
            document.getElementById('timer-action-text').textContent = resetActionText;

            // 타이머 화면으로 전환
            showScreen('timer');

            // 타이머 시작
            startTimer();
        });
    }

    // ========================================
    // 타이머 화면
    // ========================================
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            completeSession(true);
        });
    }

    const failBtn = document.getElementById('failBtn');
    if (failBtn) {
        failBtn.addEventListener('click', () => {
            completeSession(false);
        });
    }

    // ========================================
    // 완료 화면
    // ========================================
    const positiveFeedbackBtn = document.getElementById('positiveFeedbackBtn');
    if (positiveFeedbackBtn) {
        positiveFeedbackBtn.addEventListener('click', () => {
            saveFeedback('positive');
            showScreen('home');
        });
    }

    const neutralFeedbackBtn = document.getElementById('neutralFeedbackBtn');
    if (neutralFeedbackBtn) {
        neutralFeedbackBtn.addEventListener('click', () => {
            saveFeedback('neutral');
            showScreen('home');
        });
    }

    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            // 피드백 없이 홈으로 (세션은 이미 저장됨)
            showScreen('home');
        });
    }

    // ========================================
    // 명세서 생성 기능
    // ========================================

    // 근로소득 간이세액표 (공제대상가족 1~11명, 월급여액 1,500,000원 ~ 10,000,000원)
    const simplifiedTaxTable = {
        1500000: [1040, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1600000: [10980, 6480, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1700000: [13050, 8550, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        1800000: [15110, 10610, 2630, 0, 0, 0, 0, 0, 0, 0, 0],
        1900000: [17180, 12680, 4610, 1040, 0, 0, 0, 0, 0, 0, 0],
        2000000: [19520, 14750, 6600, 3220, 0, 0, 0, 0, 0, 0, 0],
        2500000: [35600, 28600, 16530, 13150, 9780, 6400, 3030, 0, 0, 0, 0],
        3000000: [74350, 56850, 31940, 26690, 21440, 17100, 13730, 10350, 6980, 3600, 0],
        3500000: [132110, 107110, 65590, 52460, 39340, 33630, 28380, 23130, 18190, 14820, 11440],
        4000000: [195960, 167950, 109590, 91670, 78550, 65420, 52300, 39170, 33570, 28320, 23070],
        4500000: [265650, 237250, 173430, 154680, 135930, 117180, 98430, 83860, 70730, 57610, 44480],
        5000000: [335470, 306710, 237850, 219100, 200350, 181600, 162850, 144100, 125350, 106600, 87850],
        5500000: [408400, 379250, 304930, 286180, 267430, 248680, 229930, 211180, 192430, 173680, 154930],
        6000000: [505900, 466060, 395720, 376970, 358220, 339470, 320720, 301970, 283220, 264470, 245720],
        6500000: [619300, 571490, 461720, 442970, 424220, 405470, 386720, 367970, 349220, 330470, 311720],
        7000000: [732700, 684290, 557350, 527350, 497350, 471470, 452720, 433970, 415220, 396470, 377720],
        7500000: [846100, 797090, 662950, 632950, 602950, 572950, 542950, 512950, 482950, 462470, 443720],
        8000000: [959500, 909890, 768550, 738550, 708550, 678550, 648550, 618550, 588550, 558550, 528550],
        8500000: [1074180, 1023960, 875420, 845420, 815420, 785420, 755420, 725420, 695420, 665420, 635420],
        9000000: [1191180, 1140360, 984620, 954620, 924620, 894620, 864620, 834620, 804620, 774620, 744620],
        9500000: [1306070, 1233480, 1071980, 1041980, 1011980, 981980, 951980, 921980, 891980, 861980, 831980],
        10000000: [1507400, 1431570, 1200840, 1170840, 1140840, 1110840, 1080840, 1050840, 1020840, 990840, 960840]
    };

    // 월급여액에 따른 세액 조회 (선형 보간)
    function getSimplifiedTax(monthlyPay, dependents) {
        const salaries = Object.keys(simplifiedTaxTable).map(Number).sort((a, b) => a - b);
        const depIndex = Math.min(Math.max(dependents - 1, 0), 10); // 1~11명

        if (monthlyPay < salaries[0]) return 0;
        if (monthlyPay >= salaries[salaries.length - 1]) {
            return roundDown10(simplifiedTaxTable[salaries[salaries.length - 1]][depIndex]);
        }

        // 선형 보간
        for (let i = 0; i < salaries.length - 1; i++) {
            if (monthlyPay >= salaries[i] && monthlyPay < salaries[i + 1]) {
                const lower = salaries[i];
                const upper = salaries[i + 1];
                const lowerTax = simplifiedTaxTable[lower][depIndex];
                const upperTax = simplifiedTaxTable[upper][depIndex];
                const ratio = (monthlyPay - lower) / (upper - lower);
                return roundDown10(lowerTax + (upperTax - lowerTax) * ratio);
            }
        }
        return 0;
    }

    // Rounddown -1 함수 (10원 단위 절사)
    function roundDown10(value) {
        return Math.floor(value / 10) * 10;
    }

    // 명세서 생성 버튼
    const specBtn = document.getElementById('specBtn');
    if (specBtn) {
        specBtn.addEventListener('click', () => {
            showScreen('spec');
        });
    }

    // YAML 불러오기 버튼
    const loadYamlBtn = document.getElementById('loadYamlBtn');
    const yamlFileInput = document.getElementById('yamlFileInput');

    if (loadYamlBtn && yamlFileInput) {
        loadYamlBtn.addEventListener('click', () => {
            yamlFileInput.click();
        });

        yamlFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const yamlText = event.target.result;
                    const data = parseYAML(yamlText);

                    // 폼에 데이터 채우기
                    if (data.year) document.getElementById('year').value = data.year;
                    if (data.month) document.getElementById('month').value = data.month;
                    if (data.position) document.getElementById('position').value = data.position;
                    if (data.name) document.getElementById('employeeName').value = data.name;
                    if (data.work_days) document.getElementById('workDays').value = data.work_days;
                    if (data.payment_date) document.getElementById('paymentDate').value = data.payment_date;
                    if (data.base_amount) document.getElementById('baseAmount').value = formatNumber(data.base_amount);
                    if (data.hire_date) document.getElementById('hireDate').value = data.hire_date;
                    if (data.attend_days) document.getElementById('attendDays').value = data.attend_days;
                    if (data.income_type) document.getElementById('incomeType').value = data.income_type;
                    if (data.dependents) document.getElementById('dependents').value = data.dependents;

                    // 지급항목 채우기
                    const container = document.getElementById('payItemsContainer');
                    container.innerHTML = '';

                    if (data.pay_items && data.pay_items.length > 0) {
                        data.pay_items.forEach(item => {
                            const newItem = document.createElement('div');
                            newItem.className = 'pay-item';
                            newItem.innerHTML = `
                                <input type="text" class="pay-item-name" placeholder="항목명" value="${item.name}" required>
                                <input type="text" class="pay-item-amount" placeholder="금액" value="${formatNumber(item.amount)}" required>
                                <button type="button" class="remove-item-btn">×</button>
                            `;
                            container.appendChild(newItem);

                            newItem.querySelector('.remove-item-btn').addEventListener('click', function() {
                                if (container.children.length > 1) {
                                    newItem.remove();
                                } else {
                                    alert('최소 1개의 지급항목이 필요합니다.');
                                }
                            });

                            // 새 필드에 포맷팅 적용
                            addCommaFormatting(newItem.querySelector('.pay-item-amount'));
                        });
                    }

                    // 공제항목 채우기
                    if (data.deductions) {
                        if (data.deductions.income_tax !== undefined)
                            document.getElementById('incomeTax').value = formatNumber(data.deductions.income_tax);
                        if (data.deductions.local_tax !== undefined)
                            document.getElementById('localTax').value = formatNumber(data.deductions.local_tax);
                        if (data.deductions.national_pension !== undefined)
                            document.getElementById('nationalPension').value = formatNumber(data.deductions.national_pension);
                        if (data.deductions.health_insurance !== undefined)
                            document.getElementById('healthInsurance').value = formatNumber(data.deductions.health_insurance);
                        if (data.deductions.employment_insurance !== undefined)
                            document.getElementById('employmentInsurance').value = formatNumber(data.deductions.employment_insurance);
                        if (data.deductions.long_term_care !== undefined)
                            document.getElementById('longTermCare').value = formatNumber(data.deductions.long_term_care);
                    }

                    alert('YAML 파일을 성공적으로 불러왔습니다!');
                } catch (error) {
                    console.error('YAML 파싱 오류:', error);
                    alert('YAML 파일을 읽는 중 오류가 발생했습니다.');
                }
            };
            reader.readAsText(file);
        });
    }

    // 간단한 YAML 파서 (기본적인 형식만 지원)
    function parseYAML(yamlText) {
        const lines = yamlText.split('\n');
        const data = {};
        let currentKey = null;
        let currentArray = null;
        let currentObject = null;

        lines.forEach(line => {
            // 주석 제거
            line = line.split('#')[0].trim();
            if (!line) return;

            // 배열 항목
            if (line.startsWith('  - name:')) {
                if (!currentArray) currentArray = [];
                currentObject = {};
                const name = line.split('name:')[1].trim().replace(/"/g, '');
                currentObject.name = name;
            } else if (line.startsWith('    amount:')) {
                const amount = parseInt(line.split('amount:')[1].trim());
                currentObject.amount = amount;
                currentArray.push(currentObject);
            }
            // 중첩 객체
            else if (line.startsWith('  ') && line.includes(':')) {
                const [key, value] = line.trim().split(':').map(s => s.trim());
                if (currentKey === 'deductions' || currentKey === 'summary') {
                    if (!data[currentKey]) data[currentKey] = {};
                    data[currentKey][key] = isNaN(value) ? value : parseInt(value);
                }
            }
            // 최상위 키
            else if (line.includes(':')) {
                const [key, value] = line.split(':').map(s => s.trim());

                if (value) {
                    data[key] = value.replace(/"/g, '');
                    // 숫자로 변환 가능하면 변환
                    if (!isNaN(data[key])) {
                        data[key] = parseInt(data[key]);
                    }
                } else {
                    currentKey = key;
                    if (key === 'pay_items') {
                        currentArray = [];
                        data[key] = currentArray;
                    }
                }
            }
        });

        return data;
    }

    // 소득 구분 변경 시 피부양자 수 필드 표시/숨김
    const incomeType = document.getElementById('incomeType');
    const dependentsGroup = document.getElementById('dependentsGroup');
    if (incomeType && dependentsGroup) {
        incomeType.addEventListener('change', function() {
            if (this.value === 'employment') {
                dependentsGroup.style.display = 'block';
            } else {
                dependentsGroup.style.display = 'none';
            }
        });
    }

    // 요율 직접 입력 체크박스
    const customRates = document.getElementById('customRates');
    const ratesSection = document.getElementById('ratesSection');
    if (customRates && ratesSection) {
        customRates.addEventListener('change', function() {
            ratesSection.style.display = this.checked ? 'block' : 'none';
        });
    }

    // 자동계산 버튼
    const autoCalcBtn = document.getElementById('autoCalcBtn');
    if (autoCalcBtn) {
        autoCalcBtn.addEventListener('click', calculateDeductions);
    }

    // 공제액 자동계산 함수
    function calculateDeductions() {
        const incomeTypeVal = document.getElementById('incomeType').value;
        const payItems = [];
        let totalPay = 0;

        // 지급항목 가져오기
        document.querySelectorAll('.pay-item').forEach(item => {
            const amountStr = item.querySelector('.pay-item-amount').value.replace(/,/g, '');
            const amount = parseInt(amountStr) || 0;
            payItems.push(amount);
            totalPay += amount;
        });

        if (totalPay === 0 || payItems.length === 0) {
            alert('지급항목을 먼저 입력해주세요.');
            return;
        }

        const monthlyPay = payItems[0] || 0; // 월지급총액 (첫 번째 항목)

        // 소득세 및 지방소득세 계산
        let incomeTax = 0;
        let localTax = 0;
        let nationalPension = 0;
        let healthInsurance = 0;
        let employmentInsurance = 0;
        let longTermCare = 0;

        if (incomeTypeVal === 'business') {
            // 사업소득: 3%, 10원 단위 절사 (보험료 계산 안함)
            incomeTax = roundDown10(monthlyPay * 0.03);
            localTax = roundDown10(incomeTax * 0.1);
        } else {
            // 근로소득: 간이세액표 조회
            const dependents = parseInt(document.getElementById('dependents').value) || 1;
            incomeTax = getSimplifiedTax(monthlyPay, dependents);
            localTax = roundDown10(incomeTax * 0.1);

            // 4대보험 계산 (근로소득만)
            const customRatesChecked = document.getElementById('customRates').checked;
            const durunuriEnabled = document.getElementById('durunuri').checked;
            let pensionRate, healthRate, employmentRate, longTermRate;

            if (customRatesChecked) {
                pensionRate = parseFloat(document.getElementById('pensionRate').value) / 100;
                healthRate = parseFloat(document.getElementById('healthRate').value) / 100;
                employmentRate = parseFloat(document.getElementById('employmentRate').value) / 100;
                longTermRate = parseFloat(document.getElementById('longTermRate').value) / 100;
            } else {
                pensionRate = 0.0475;
                healthRate = 0.03595;
                employmentRate = 0.009;
                longTermRate = 0.1314;
            }

            // 두루누리 지원: 국민연금과 고용보험은 80% 지원되어 20%만 공제
            if (durunuriEnabled) {
                pensionRate = pensionRate * 0.2;
                employmentRate = employmentRate * 0.2;
            }

            nationalPension = roundDown10(monthlyPay * pensionRate);
            healthInsurance = roundDown10(monthlyPay * healthRate);
            employmentInsurance = roundDown10(monthlyPay * employmentRate);
            longTermCare = roundDown10(healthInsurance * longTermRate);
        }

        // 폼에 값 입력 (포맷팅 적용)
        document.getElementById('incomeTax').value = formatNumber(incomeTax);
        document.getElementById('localTax').value = formatNumber(localTax);
        document.getElementById('nationalPension').value = formatNumber(nationalPension);
        document.getElementById('healthInsurance').value = formatNumber(healthInsurance);
        document.getElementById('employmentInsurance').value = formatNumber(employmentInsurance);
        document.getElementById('longTermCare').value = formatNumber(longTermCare);

        alert('공제액이 자동계산되었습니다.');
    }

    // 명세서 뒤로 버튼
    const specBackBtn = document.getElementById('specBackBtn');
    if (specBackBtn) {
        specBackBtn.addEventListener('click', () => {
            showScreen('home');
        });
    }

    // 지급항목 추가 버튼
    const addPayItemBtn = document.getElementById('addPayItemBtn');
    if (addPayItemBtn) {
        addPayItemBtn.addEventListener('click', () => {
            const container = document.getElementById('payItemsContainer');
            const newItem = document.createElement('div');
            newItem.className = 'pay-item';
            newItem.innerHTML = `
                <input type="text" class="pay-item-name" placeholder="항목명" required>
                <input type="text" class="pay-item-amount" placeholder="금액" required>
                <button type="button" class="remove-item-btn">×</button>
            `;
            container.appendChild(newItem);

            // 삭제 버튼 이벤트 추가
            newItem.querySelector('.remove-item-btn').addEventListener('click', function() {
                newItem.remove();
            });

            // 새 필드에 포맷팅 적용
            addCommaFormatting(newItem.querySelector('.pay-item-amount'));
        });
    }

    // 기존 삭제 버튼들에 이벤트 추가
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const payItem = this.closest('.pay-item');
            const container = document.getElementById('payItemsContainer');
            if (container.children.length > 1) {
                payItem.remove();
            } else {
                alert('최소 1개의 지급항목이 필요합니다.');
            }
        });
    });

    // 자동계산 시 포맷팅 적용
    function applyFormattingToDeductions() {
        const fields = ['incomeTax', 'localTax', 'nationalPension', 'healthInsurance', 'employmentInsurance', 'longTermCare'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value && field.value !== '0') {
                const numValue = parseInt(field.value.replace(/,/g, '')) || 0;
                field.value = formatNumber(numValue);
            }
        });
    }

    // 숫자 포맷팅 함수
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // 입력 필드에 쉼표 자동 추가
    function addCommaFormatting(inputElement) {
        inputElement.addEventListener('input', function(e) {
            let value = this.value.replace(/,/g, '');
            if (value && !isNaN(value)) {
                this.value = formatNumber(value);
            }
        });

        inputElement.addEventListener('blur', function(e) {
            let value = this.value.replace(/,/g, '');
            if (value && !isNaN(value)) {
                this.value = formatNumber(value);
            }
        });
    }

    // 모든 금액 입력 필드에 포맷팅 적용
    function applyFormattingToAllFields() {
        document.querySelectorAll('.pay-item-amount').forEach(field => {
            addCommaFormatting(field);
        });

        // 기본 정보 필드들
        const amountFields = [
            'baseAmount', 'incomeTax', 'localTax', 'nationalPension',
            'healthInsurance', 'employmentInsurance', 'longTermCare'
        ];

        amountFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) addCommaFormatting(field);
        });
    }

    // 초기 포맷팅 적용
    applyFormattingToAllFields();

    // 명세서 폼 제출
    const specForm = document.getElementById('specForm');
    if (specForm) {
        specForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // 기본 정보 가져오기
            const incomeTypeVal = document.getElementById('incomeType').value;
            const year = document.getElementById('year').value;
            const month = document.getElementById('month').value;
            const position = document.getElementById('position').value;
            const employeeName = document.getElementById('employeeName').value;
            const workDays = document.getElementById('workDays').value;
            const paymentDate = document.getElementById('paymentDate').value;
            const baseAmount = parseInt(document.getElementById('baseAmount').value.replace(/,/g, '')) || 0;
            const hireDate = document.getElementById('hireDate').value;
            const attendDays = document.getElementById('attendDays').value;

            // 지급항목 가져오기
            const payItems = [];
            let totalPay = 0;
            document.querySelectorAll('.pay-item').forEach(item => {
                const name = item.querySelector('.pay-item-name').value;
                const amount = parseInt(item.querySelector('.pay-item-amount').value.replace(/,/g, '')) || 0;
                payItems.push({ name, amount });
                totalPay += amount;
            });

            // 공제항목 가져오기
            const incomeTax = parseInt(document.getElementById('incomeTax').value.replace(/,/g, '')) || 0;
            const localTax = parseInt(document.getElementById('localTax').value.replace(/,/g, '')) || 0;
            const nationalPension = parseInt(document.getElementById('nationalPension').value.replace(/,/g, '')) || 0;
            const healthInsurance = parseInt(document.getElementById('healthInsurance').value.replace(/,/g, '')) || 0;
            const employmentInsurance = parseInt(document.getElementById('employmentInsurance').value.replace(/,/g, '')) || 0;
            const longTermCare = parseInt(document.getElementById('longTermCare').value.replace(/,/g, '')) || 0;

            const totalDeduct = incomeTax + localTax + nationalPension + healthInsurance + employmentInsurance + longTermCare;
            const finalAmount = totalPay - totalDeduct;

            // 미리보기 업데이트
            document.getElementById('previewTitle').textContent = `[${year}년 ${month}월] 급여 명세서`;
            document.getElementById('previewPosition').textContent = position;
            document.getElementById('previewName').textContent = employeeName;
            document.getElementById('previewWorkDays').textContent = workDays;
            document.getElementById('previewPaymentDate').textContent = paymentDate;
            document.getElementById('previewBaseAmount').textContent = formatNumber(baseAmount);
            document.getElementById('previewHireDate').textContent = hireDate;
            document.getElementById('previewAttendDays').textContent = attendDays;
            document.getElementById('previewNetAmount').textContent = formatNumber(totalPay) + '원';

            // 지급항목 렌더링 (전체 테이블 재구성)
            const totalRows = payItems.length + 1; // 항목 수 + 지급총액 행
            const rowspanCount = totalRows;

            let payTableHtml = `
                <tr>
                    <th rowspan="${rowspanCount}" style="width: 50px; writing-mode: vertical-rl; text-orientation: upright;">지급사항</th>
                    <td style="text-align: left;">${payItems[0].name}</td>
                    <td colspan="5" style="text-align: right;">${formatNumber(payItems[0].amount)}</td>
                </tr>
            `;

            // 나머지 항목들
            for (let i = 1; i < payItems.length; i++) {
                payTableHtml += `
                    <tr>
                        <td style="text-align: left;">${payItems[i].name}</td>
                        <td colspan="5" style="text-align: right;">${formatNumber(payItems[i].amount)}</td>
                    </tr>
                `;
            }

            // 지급총액 행
            payTableHtml += `
                <tr>
                    <td colspan="4" style="text-align: right; font-weight: bold;">지급총액</td>
                    <td style="text-align: right; font-weight: bold;">${formatNumber(totalPay)}</td>
                </tr>
            `;

            document.getElementById('previewPayItemsBody').innerHTML = payTableHtml;

            // 공제항목 업데이트
            document.getElementById('previewIncomeTax').textContent = incomeTax > 0 ? formatNumber(incomeTax) : '-';
            document.getElementById('previewLocalTax').textContent = localTax > 0 ? formatNumber(localTax) : '-';
            document.getElementById('previewNationalPension').textContent = formatNumber(nationalPension);
            document.getElementById('previewHealthInsurance').textContent = formatNumber(healthInsurance);
            document.getElementById('previewEmploymentInsurance').textContent = formatNumber(employmentInsurance);
            document.getElementById('previewLongTermCare').textContent = formatNumber(longTermCare);
            document.getElementById('previewTotalDeduct').textContent = formatNumber(totalDeduct);
            document.getElementById('previewFinalAmount').textContent = formatNumber(finalAmount);

            // 미리보기 섹션 표시
            document.getElementById('previewSection').style.display = 'block';

            // 미리보기로 스크롤
            document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // PDF 다운로드
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            const { jsPDF } = window.jspdf;
            const preview = document.getElementById('specPreview');

            try {
                // 파일명 생성
                const employeeName = document.getElementById('employeeName').value || '직원';
                const year = document.getElementById('year').value;
                const month = document.getElementById('month').value;
                const fileName = `급여명세서_${employeeName}_${year}년${month}월.pdf`;

                // html2canvas로 이미지 생성
                const canvas = await html2canvas(preview, {
                    scale: 4,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const imgWidth = 210; // A4 width in mm
                const pageHeight = 297; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(fileName);

                alert('PDF 다운로드가 완료되었습니다!');
            } catch (error) {
                console.error('PDF 생성 오류:', error);
                alert('PDF 생성 중 오류가 발생했습니다.');
            }
        });
    }

    // 이미지 다운로드
    const exportImageBtn = document.getElementById('exportImageBtn');
    if (exportImageBtn) {
        exportImageBtn.addEventListener('click', async () => {
            const preview = document.getElementById('specPreview');

            try {
                // 파일명 생성
                const employeeName = document.getElementById('employeeName').value || '직원';
                const year = document.getElementById('year').value;
                const month = document.getElementById('month').value;
                const fileName = `급여명세서_${employeeName}_${year}년${month}월.png`;

                const canvas = await html2canvas(preview, {
                    scale: 4,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true
                });

                // Canvas를 Blob으로 변환
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    link.click();
                    URL.revokeObjectURL(url);

                    alert('이미지 다운로드가 완료되었습니다!');
                });
            } catch (error) {
                console.error('이미지 생성 오류:', error);
                alert('이미지 생성 중 오류가 발생했습니다.');
            }
        });
    }

    // YAML 내보내기
    const exportYamlBtn = document.getElementById('exportYamlBtn');
    if (exportYamlBtn) {
        exportYamlBtn.addEventListener('click', () => {
            try {
                // 기본 정보
                const incomeTypeVal = document.getElementById('incomeType').value;
                const year = document.getElementById('year').value;
                const month = document.getElementById('month').value;
                const position = document.getElementById('position').value;
                const employeeName = document.getElementById('employeeName').value;
                const workDays = document.getElementById('workDays').value;
                const paymentDate = document.getElementById('paymentDate').value;
                const baseAmount = parseInt(document.getElementById('baseAmount').value.replace(/,/g, '')) || 0;
                const hireDate = document.getElementById('hireDate').value;
                const attendDays = document.getElementById('attendDays').value;
                const dependents = document.getElementById('dependents').value;

                // 지급항목
                const payItems = [];
                let totalPay = 0;
                document.querySelectorAll('.pay-item').forEach(item => {
                    const name = item.querySelector('.pay-item-name').value;
                    const amount = parseInt(item.querySelector('.pay-item-amount').value.replace(/,/g, '')) || 0;
                    payItems.push({ name, amount });
                    totalPay += amount;
                });

                // 공제항목
                const incomeTax = parseInt(document.getElementById('incomeTax').value.replace(/,/g, '')) || 0;
                const localTax = parseInt(document.getElementById('localTax').value.replace(/,/g, '')) || 0;
                const nationalPension = parseInt(document.getElementById('nationalPension').value.replace(/,/g, '')) || 0;
                const healthInsurance = parseInt(document.getElementById('healthInsurance').value.replace(/,/g, '')) || 0;
                const employmentInsurance = parseInt(document.getElementById('employmentInsurance').value.replace(/,/g, '')) || 0;
                const longTermCare = parseInt(document.getElementById('longTermCare').value.replace(/,/g, '')) || 0;

                const totalDeduct = incomeTax + localTax + nationalPension + healthInsurance + employmentInsurance + longTermCare;
                const finalAmount = totalPay - totalDeduct;

                // YAML 생성
                let yaml = `# 급여명세서 데이터
year: ${year}
month: ${month}
position: "${position}"
name: "${employeeName}"
work_days: ${workDays}
payment_date: "${paymentDate}"
base_amount: ${baseAmount}
hire_date: "${hireDate}"
attend_days: ${attendDays}
income_type: "${incomeTypeVal}"
dependents: ${dependents}

pay_items:\n`;

                payItems.forEach(item => {
                    yaml += `  - name: "${item.name}"\n    amount: ${item.amount}\n`;
                });

                yaml += `
deductions:
  income_tax: ${incomeTax}
  local_tax: ${localTax}
  national_pension: ${nationalPension}
  health_insurance: ${healthInsurance}
  employment_insurance: ${employmentInsurance}
  long_term_care: ${longTermCare}

summary:
  total_pay: ${totalPay}
  total_deduct: ${totalDeduct}
  final_amount: ${finalAmount}
`;

                // 파일 다운로드
                const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `급여명세서_${employeeName}_${year}년${month}월.yaml`;
                link.click();
                URL.revokeObjectURL(url);

                alert('YAML 파일이 다운로드되었습니다!');
            } catch (error) {
                console.error('YAML 생성 오류:', error);
                alert('YAML 생성 중 오류가 발생했습니다.');
            }
        });
    }
});
