# [4편] 리퀴드 글라스 UI - 애플 감성 다크모드 만들기

> AI와 노무사가 만드는 4대보험 자동화 시리즈 (4/9)

## "글씨가 안 보여요"

MVP를 완성하고 실행했다. 그런데...

> "글씨가 하얀색에 하얀색이라 안 보인다"

기본 Tailwind 설정으로 만들었더니 라이트 모드에 흰 텍스트가 겹쳐 있었다. 급하게 다크모드로 바꿔야 했다.

그냥 바꾸는 김에, 제대로 된 디자인을 해보자.

## 리퀴드 글라스 디자인이란?

애플이 최근 밀고 있는 디자인 언어다.

- **반투명 유리** 효과 (Glassmorphism)
- **부드러운 그라데이션**
- **미묘한 빛 반사**
- **깊이감 있는 레이어**

iOS, macOS, visionOS에서 볼 수 있는 그 느낌.

## 색상 팔레트

### 배경

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

완전한 검정(`#000`)이 아닌, 약간 파란 기운이 도는 다크 네이비(`#0a0a0f`).

### 글래스 효과

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

핵심은 `backdrop-filter: blur()`. 뒤 배경을 흐리게 해서 유리 느낌을 낸다.

### 텍스트

```css
/* 주요 텍스트 */
.text-white { color: #f5f5f7; }

/* 보조 텍스트 */
.text-white\/60 { color: rgba(255, 255, 255, 0.6); }
.text-white\/40 { color: rgba(255, 255, 255, 0.4); }
```

흰색의 투명도를 조절해서 계층을 만든다.

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

### 입력 필드

```css
.input-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
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

### 버튼

```css
.btn-primary {
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  color: white;
  border-radius: 12px;
  font-weight: 500;
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
}
```

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
}

.table-glass tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.table-glass tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
```

### 배지 (상태 표시)

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

## 레이아웃 구조

```tsx
<div className="flex min-h-screen">
  {/* 사이드바 */}
  <aside className="w-64 sidebar-glass fixed h-full">
    <div className="p-6">
      <h1 className="text-xl font-bold text-white">급여관리</h1>
    </div>
    <nav className="px-4">
      {navItems.map(item => (
        <Link
          href={item.href}
          className={`nav-item block px-4 py-3 rounded-xl mb-1
            ${isActive ? 'active' : ''}`}
        >
          {item.label}
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
      <p className="text-2xl font-semibold text-white">30개</p>
    </div>
  </div>
</div>
```

## 결과물

**Before:**
- 흰 배경에 흰 글씨
- 기본 Tailwind 스타일
- 눈이 아픔

**After:**
- 어두운 배경에 은은한 유리 효과
- 계층감 있는 UI
- 밤에 작업해도 눈이 편함

## 디자인 팁

1. **완전한 검정은 피한다**: `#000` 대신 `#0a0a0f` 같은 다크 네이비
2. **흰색도 순수 흰색 피하기**: `#fff` 대신 `#f5f5f7`
3. **투명도로 계층 표현**: `rgba(255,255,255,0.6)`, `0.4`, `0.1` 등
4. **블러는 적당히**: `blur(20px)` 정도가 적당
5. **그림자는 부드럽게**: `box-shadow`로 깊이감 추가

## 다음 편 예고

예쁜 건 됐고, 이제 데이터가 날아가면 안 된다.

- 오프라인에서도 작동하는 앱
- Zustand + localStorage 조합
- 새로고침해도 데이터 유지

---

*다음 편: [5편] 오프라인 우선 설계 - Zustand와 localStorage의 조합*
