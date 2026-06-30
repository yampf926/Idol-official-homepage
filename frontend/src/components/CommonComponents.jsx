import React from 'react';

const format = (value) => value ? String(value).replace('T', ' ').slice(0, 16) : '';

// 반복되는 섹션 제목 마크업을 통일하는 작은 공통 컴포넌트입니다.
export function SectionTitle({ title }) {
  return <div className="section-title"><h2>{title}</h2></div>;
}

export function EmptyState({ title, description }) {
  return <div className="panel empty-state"><h3>{title}</h3><p className="muted">{description}</p></div>;
}

export function NotFound({ setTab }) {
  return <section><div className="panel login-required"><h3>페이지를 찾을 수 없습니다.</h3><p>주소를 확인하거나 홈으로 돌아가 다시 이동하세요.</p><button onClick={() => setTab('home')}>홈으로 이동</button></div></section>;
}

// 로그인이 필요한 화면에 접근했을 때 로그인 페이지로 이동시키는 공통 안내 UI입니다.
export function LoginRequired({ setTab, message = '로그인이 필요한 메뉴입니다.' }) {
  return <section><div className="panel login-required"><h3>{message}</h3><p>로그인 후 예매 내역과 계정 정보를 확인할 수 있습니다.</p><button onClick={() => setTab('auth')}>로그인 / 회원가입</button></div></section>;
}

// 백엔드 연결 실패 시 사용자가 바로 실행할 수 있는 서버 실행 명령을 보여줍니다.
export function BackendStatus({ message, isBackendConnectionError, apiBaseUrl }) {
  const backendOffline = isBackendConnectionError(message);
  return <div className="panel login-required server-status">
    <h3>{backendOffline ? '백엔드 서버가 꺼져 있습니다.' : '데이터를 불러오지 못했습니다.'}</h3>
    <p>{message}</p>
    {backendOffline && <div className="server-steps">
      <b>켜는 방법</b>
      <code>cd C:\Users\KOSMO\IdeaProjects\Dohwa</code>
      <code>.\mvnw.cmd spring-boot:run</code>
      <span>프론트 API 주소: {apiBaseUrl}</span>
    </div>}
  </div>;
}

// 공지 목록은 서버에서 받은 공지 배열을 카드 형태로 단순 렌더링합니다.
export function NoticeList({ notices }) {
  return <section>
    <SectionTitle title="공지" />
    {!notices.length && <EmptyState title="등록된 공지가 없습니다." description="새 공지가 등록되면 이곳에 표시됩니다." />}
    <div className="grid">{notices.map(n => <article className="panel" key={n.id}><h3>{n.title}</h3><p>{n.content}</p><span>{format(n.createdAt)}</span></article>)}</div>
  </section>;
}

// 이벤트 목록은 응모 버튼만 상위 App에서 받은 apply 함수로 위임합니다.
export function Events({ events, appliedEventIds = [], apply, isBusy = () => false }) {
  return <section>
    <SectionTitle title="이벤트" />
    {!events.length && <EmptyState title="진행 중인 이벤트가 없습니다." description="이벤트가 열리면 응모 버튼과 기간이 표시됩니다." />}
    <div className="grid">{events.map(e => {
      const busy = isBusy(e.id);
      const applied = appliedEventIds.includes(e.id);
      return <article className="panel card" key={e.id}><span className="tag">진행</span><h3>{e.title}</h3><p>{e.content}</p><p>{format(e.startAt)} ~ {format(e.endAt)}</p><p>응모 {e.applyCount}명</p><button disabled={busy || applied} onClick={() => apply(e.id)}>{busy ? '처리 중' : applied ? '응모 완료' : '응모하기'}</button></article>;
    })}</div>
  </section>;
}

// 알림 화면입니다. 읽음/삭제/전체 처리 로직은 상위 App에서 API 호출 함수로 주입합니다.
export function Notifications({ items, read, readAll, remove, removeAll, isBusy = () => false }) {
  const unreadCount = items.filter(item => !item.read).length;
  const readAllBusy = isBusy('notification:readAll');
  const removeAllBusy = isBusy('notification:removeAll');

  return <section>
    <div className="section-title">
      <h2>알림</h2>
      <div className="section-actions">
        <button className="secondary" disabled={!unreadCount || readAllBusy} onClick={readAll}>{readAllBusy ? '처리 중' : '전체 읽음'}</button>
        <button className="secondary" disabled={!items.length || removeAllBusy} onClick={removeAll}>{removeAllBusy ? '처리 중' : '전체 삭제'}</button>
      </div>
    </div>
    <div className="panel list notification-list">
      {!items.length && <p className="muted">알림이 없습니다.</p>}
      {items.map(n => {
        const readBusy = isBusy(`notification:read:${n.id}`);
        const removeBusy = isBusy(`notification:remove:${n.id}`);
        return <div key={n.id} className={n.read ? 'read item notification-item' : 'item notification-item'}>
          <span>{n.content}</span>
          <div className="notification-actions">
            <button className="secondary notification-read-button" disabled={n.read || readBusy} onClick={() => read(n.id)}>{readBusy ? '처리 중' : n.read ? '읽음 완료' : '읽음'}</button>
            <button className="secondary notification-read-button" disabled={removeBusy} onClick={() => remove(n.id)}>{removeBusy ? '처리 중' : '삭제'}</button>
          </div>
        </div>;
      })}
    </div>
  </section>;
}
