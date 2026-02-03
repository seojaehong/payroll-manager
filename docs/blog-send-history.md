# 급여명세서 발송 이력 추적 시스템 구현

## 문제: 발송 후 추적 불가

급여명세서를 이메일/SMS/카카오톡으로 발송하는 기능은 있었지만, **발송 이력을 확인할 방법이 없었다.**

- "지난달 명세서 보냈나?"
- "이 사람한테 어떤 채널로 보냈지?"
- "발송 실패한 건 있나?"

## 해결: SendHistory 테이블

### 타입 정의

```typescript
// src/types/index.ts
export interface SendHistory {
  id: string;
  businessId: string;
  workerId: string;
  employmentId: string;
  yearMonth: string;        // "2026-01"
  channel: 'email' | 'sms' | 'kakao';
  recipient: string;        // 이메일 또는 전화번호
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  errorMessage?: string;    // 실패 시 에러 메시지
  tokenId?: string;         // 웹 링크용 토큰 ID
  sentAt: Date;
  deliveredAt?: Date;
}
```

### Firestore CRUD 함수

```typescript
// src/lib/firestore.ts

// 사업장별 발송 이력 조회
export async function getSendHistoryByBusiness(businessId: string): Promise<SendHistory[]> {
  const q = query(
    collection(db, 'sendHistory'),
    where('businessId', '==', businessId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
    sentAt: fromTimestamp(doc.data().sentAt),
  }));
}

// 발송 이력 저장
export async function saveSendHistory(history: Omit<SendHistory, 'id'>): Promise<string> {
  const id = doc(collection(db, 'sendHistory')).id;
  await setDoc(doc(db, 'sendHistory', id), {
    ...history,
    sentAt: toTimestamp(history.sentAt),
  });
  return id;
}

// 상태 업데이트 (delivered/failed)
export async function updateSendHistoryStatus(
  id: string,
  status: 'delivered' | 'failed',
  errorMessage?: string
): Promise<void> {
  // ...
}
```

### API 라우트에서 이력 저장

```typescript
// src/app/api/send-email/route.ts

export async function POST(request: NextRequest) {
  // ... 이메일 발송 로직

  // 발송 성공 시 이력 저장
  await saveSendHistory({
    businessId,
    workerId,
    employmentId,
    yearMonth: payslipData.yearMonth,
    channel: 'email',
    recipient: recipient.email,
    status: 'sent',
    tokenId,
    sentAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
```

SMS와 카카오톡 API도 동일하게 이력 저장:

```typescript
// 발송 실패 시에도 이력 저장 (에러 메시지 포함)
await saveSendHistory({
  // ...
  status: 'failed',
  errorMessage: result.error,
  sentAt: new Date(),
});
```

## 발송 이력 조회 API

```typescript
// src/app/api/send-history/route.ts

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('businessId');
  const yearMonth = request.nextUrl.searchParams.get('yearMonth');

  let history = await getSendHistoryByBusiness(businessId);

  // yearMonth 필터
  if (yearMonth) {
    history = history.filter((h) => h.yearMonth === yearMonth);
  }

  // 최신순 정렬
  history.sort((a, b) =>
    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );

  return NextResponse.json({ history });
}
```

## UI 컴포넌트

```tsx
// src/components/ui/SendHistoryList.tsx

export function SendHistoryList({ businessId, yearMonth }) {
  const [history, setHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;

    fetch(`/api/send-history?businessId=${businessId}`)
      .then((res) => res.json())
      .then((data) => setHistory(data.history));
  }, [businessId, isExpanded]);

  return (
    <div>
      {/* 접기/펼치기 */}
      <button onClick={() => setIsExpanded(!isExpanded)}>
        ▶ 발송 이력 ({history.length})
      </button>

      {isExpanded && (
        <table>
          <thead>
            <tr>
              <th>채널</th>
              <th>월</th>
              <th>수신자</th>
              <th>상태</th>
              <th>발송일</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td>{channelIcons[item.channel]}</td>
                <td>{item.yearMonth}</td>
                <td>{maskRecipient(item.recipient)}</td>
                <td>
                  <span className={statusBadge[item.status].class}>
                    {statusBadge[item.status].text}
                  </span>
                </td>
                <td>{formatTime(item.sentAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### 상태 뱃지

```typescript
const statusBadge = {
  pending: { text: '대기', class: 'bg-yellow-500/20 text-yellow-400' },
  sent:    { text: '발송', class: 'bg-blue-500/20 text-blue-400' },
  delivered: { text: '수신', class: 'bg-green-500/20 text-green-400' },
  failed:  { text: '실패', class: 'bg-red-500/20 text-red-400' },
};
```

### 수신자 마스킹

```typescript
const maskRecipient = (recipient: string) => {
  if (recipient.includes('@')) {
    const [local, domain] = recipient.split('@');
    return `${local.slice(0, 3)}***@${domain}`;
  }
  return recipient.slice(0, 7) + '****';  // 전화번호
};
// "hong@example.com" → "hon***@example.com"
// "01012345678" → "0101234****"
```

## 결과

| 기능 | 설명 |
|------|------|
| 이력 자동 저장 | 모든 발송 시 Firestore에 기록 |
| 채널별 구분 | 📧 이메일 / 📱 SMS / 💬 카카오 |
| 상태 추적 | 대기 → 발송 → 수신/실패 |
| 에러 확인 | 실패 시 에러 메시지 저장 |

## 다음 개선 사항

- [ ] 발송 실패 시 재발송 버튼
- [ ] 채널별/상태별 필터링
- [ ] 발송 통계 대시보드

---

*급여관리 시스템 개발 중 - Claude Code와 함께*
