# Liquid Glass UI: 업무용 툴도 아름다워야 한다

> **TL;DR**: "기능만 되면 되지"라고 생각했는데, 매일 쓰는 도구가 못생기면 피로도가 쌓입니다. 애플의 Liquid Glass 디자인 언어를 차용해 다크모드 기반의 글래스모피즘 UI를 구현했습니다. 어두운 배경에서 눈이 편하고, 계층감 있는 인터페이스 만드는 법을 공유합니다.

---

## 들어가며: "글씨가 안 보여요"

MVP를 완성하고 실행했더니...

> "글씨가 하얀색에 하얀색이라 안 보인다"

기본 Tailwind 설정으로 만들었더니 라이트 모드에 흰 텍스트가 겹쳐 있었어요. 급하게 다크모드로 바꿔야 했습니다.

그런데 **그냥 바꾸는 김에, 제대로 된 디자인을 해보자**고 생각했어요.

매일 몇 시간씩 쓸 도구인데, 못생기면 일할 맛이 안 나니까요.

---

## Liquid Glass 디자인이란?

애플이 최근 밀고 있는 디자인 언어입니다.

- **반투명 유리** 효과 (Glassmorphism)
- **부드러운 그라데이션**
- **미묘한 빛 반사**
- **깊이감 있는 레이어**

iOS, macOS, visionOS에서 볼 수 있는 그 느낌이에요.

### 왜 이 스타일인가?

1. **눈의 피로 감소**: 어두운 배경에 은은한 빛
2. **계층 표현**: 반투명 레이어로 깊이감
3. **현대적 느낌**: 트렌디하면서도 과하지 않음
4. **집중 유도**: 중요한 요소가 돋보임

**[캡처 필요 #1]**: 완성된 대시보드 UI - Liquid Glass 스타일의 카드들

---

## 색상 팔레트

### 배경색

완전한 검정(`#000`)은 피했어요. 너무 무거워 보이거든요.

```css
:root {
  --background: #0a0a0f;
  --foreground: #f5f5f7;
}

body {
  background: linear-gradient(
    135deg,
    #0a0a0f 0%,
    #1a1a2e 50%,
    #0a0a0f 100%
  );
  min-height: 100vh;
}
```

**`#0a0a0f`**: 약간 파란 기운이 도는 다크 네이비. 순수 검정보다 부드럽습니다.

### 텍스트 색상

흰색도 순수 흰색(`#fff`)을 피했어요.

```css
/* 주요 텍스트 */
.text-primary { color: #f5f5f7; }

/* 보조 텍스트 */
.text-secondary { color: rgba(255, 255, 255, 0.6); }

/* 비활성 텍스트 */
.text-muted { color: rgba(255, 255, 255, 0.4); }
```

**투명도로 계층을 표현**합니다. 중요도에 따라 60%, 40%로 조절하면 시각적 계층이 생겨요.

---

## 글래스 효과 (핵심)

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### 핵심 속성 설명

| 속성 | 역할 |
|------|------|
| `background: rgba(255,255,255,0.05)` | 5% 불투명도의 흰색 → 거의 투명 |
| `backdrop-filter: blur(20px)` | 뒤 배경을 흐리게 → 유리 느낌 |
| `border: 1px solid rgba(255,255,255,0.1)` | 미세한 테두리 → 가장자리 강조 |
| `inset box-shadow` | 상단에 밝은 선 → 빛 반사 효과 |

**[캡처 필요 #2]**: Glass 효과 비교 - 일반 카드 vs Glass 카드

---

## 컴포넌트별 스타일링

### 사이드바

```css
.sidebar-glass {
  background: linear-gradient(
    180deg,
    rgba(30, 30, 45, 0.9) 0%,
    rgba(20, 20, 35, 0.95) 100%
  );
  backdrop-filter: blur(30px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-item {
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
}

.nav-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: white;
  background: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
}
```

**포인트**: 활성화된 메뉴는 파란색 배경 + 왼쪽 테두리로 강조

### 입력 필드

```css
.input-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  padding: 0.75rem 1rem;
  transition: all 0.2s;
}

.input-glass:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-glass::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
```

**포인트**: 포커스 시 파란색 글로우 효과

### 버튼

```css
.btn-primary {
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  color: white;
  border-radius: 12px;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
}
```

**포인트**: 호버 시 살짝 위로 올라가는 효과 (`translateY(-1px)`)

### 테이블

```css
.table-glass {
  width: 100%;
}

.table-glass thead {
  background: rgba(255, 255, 255, 0.05);
}

.table-glass th {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding: 1rem;
  text-align: left;
}

.table-glass tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.table-glass tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.table-glass td {
  padding: 1rem;
  color: #f5f5f7;
}
```

**포인트**: 헤더는 작고 가볍게, 데이터는 충분한 패딩으로 가독성 확보

---

## 배지 (상태 표시)

```css
.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-success {
  background: rgba(48, 209, 88, 0.2);
  color: #30D158;
}

.badge-warning {
  background: rgba(255, 159, 10, 0.2);
  color: #FF9F0A;
}

.badge-info {
  background: rgba(0, 122, 255, 0.2);
  color: #007AFF;
}

.badge-gray {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}
```

**포인트**: 애플 시스템 컬러 사용 (Success: #30D158, Warning: #FF9F0A, Info: #007AFF)

---

## 레이아웃 구조

```tsx
<div className="flex min-h-screen bg-gradient-dark">
  {/* 사이드바 */}
  <aside className="w-64 sidebar-glass fixed h-full z-10">
    <div className="p-6">
      <h1 className="text-xl font-bold text-white">급여관리</h1>
      <p className="text-white/40 text-sm mt-1">4대보험 자동화</p>
    </div>

    <nav className="px-4 mt-4">
      {navItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl mb-1
            ${isActive(item.href) ? 'active' : ''}`}
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  </aside>

  {/* 메인 콘텐츠 */}
  <main className="flex-1 ml-64 p-8">
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </main>
</div>
```

---

## 카드 컴포넌트 예시

```tsx
// 대시보드 통계 카드
<div className="glass p-6">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
      <BuildingIcon className="w-6 h-6 text-blue-400" />
    </div>
    <div>
      <p className="text-white/40 text-sm">사업장</p>
      <p className="text-2xl font-semibold text-white">15개</p>
    </div>
  </div>
</div>

// 사업장 카드
<div className="glass p-6 hover:bg-white/10 transition cursor-pointer">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="text-lg font-semibold text-white">쿠우쿠우 부평점</h3>
      <p className="text-white/60 text-sm mt-1">630-40-91109</p>
    </div>
    <span className="badge-success">12명 재직</span>
  </div>

  <div className="mt-4 flex gap-3">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500"></span>
      <span className="text-white/60 text-sm">입사 2명</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
      <span className="text-white/60 text-sm">퇴사 1명</span>
    </div>
  </div>
</div>
```

---

## Before & After

| 항목 | Before | After |
|------|--------|-------|
| 배경 | 흰색 | 다크 그라데이션 |
| 텍스트 | 흰색 (안 보임) | 계층화된 흰색 |
| 카드 | 단순 테두리 | 글래스 효과 |
| 버튼 | 기본 스타일 | 그라데이션 + 그림자 |
| 전체 느낌 | MVP 느낌 | 프로덕션 레벨 |

**[캡처 필요 #3]**: Before/After 비교 - 같은 화면의 변화

---

## 디자인 팁 정리

### 1. 완전한 검정은 피한다
`#000` 대신 `#0a0a0f` 같은 다크 네이비. 깊이감이 생깁니다.

### 2. 순수 흰색도 피하기
`#fff` 대신 `#f5f5f7`. 눈이 덜 피로해요.

### 3. 투명도로 계층 표현
`rgba(255,255,255,0.6)`, `0.4`, `0.1` 등으로 중요도를 시각화합니다.

### 4. 블러는 적당히
`blur(20px)` 정도가 적당. 너무 세면 성능에 영향을 줍니다.

### 5. 그림자로 깊이감
`box-shadow`로 요소가 떠있는 느낌을 줍니다.

### 6. 부드러운 트랜지션
`transition: all 0.2s`로 모든 상호작용에 부드러움을 더합니다.

---

## 마치며: 디자인도 투자다

"기능만 되면 되지"라고 생각하기 쉬워요.

하지만 **매일 몇 시간씩 쓰는 도구**라면, 디자인에 투자할 가치가 있습니다.

- 눈의 피로 감소 → 생산성 향상
- 깔끔한 UI → 실수 방지
- 아름다운 도구 → 일할 의욕 상승

다음 편에서는 데이터를 안전하게 보관하는 **Offline-First 전략**을 다룹니다.

---

### 다음 편 예고

**[7편] Offline-First 전략: 인터넷 없어도 작동하는 앱**
- 왜 오프라인 우선인가?
- Zustand + localStorage 조합
- 새로고침해도 데이터 유지
- 백업과 복원 기능

---

**관련 키워드**: Liquid Glass 디자인, 글래스모피즘, Tailwind CSS 다크모드, 애플 디자인 시스템, UI/UX 설계, 웹앱 디자인

---

*이 글이 도움이 되셨다면 공유 부탁드립니다. 질문이나 의견은 댓글로 남겨주세요!*
