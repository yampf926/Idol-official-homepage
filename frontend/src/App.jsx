import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, apiBaseUrl } from './api';
import { BackendStatus, EmptyState, Events, LoginRequired, NoticeList, Notifications, NotFound, SectionTitle } from './components/CommonComponents';
import { boardLabels, isDohwaMember, prefixLabels, roleLabel } from './constants/dohwaLabels';
import { useDohwaData } from './hooks/useDohwaData';
import { errorMessage, isAuthError, isBackendConnectionError } from './utils/apiErrors';
import { resizeImageFile } from './utils/imageFiles';
import { clearStoredMember, loadSavedMember, saveStoredMember } from './utils/memberStorage';
import './styles.css';

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

// 최상위 앱 컴포넌트입니다. 라우팅, 공통 데이터 로딩, 로그인 세션, 전역 토스트를 관리합니다.
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname === '/' ? 'home' : location.pathname.slice(1);
  const setTab = (next) => navigate(next === 'home' ? '/' : '/' + next);

  // currentMember는 로그인 상태의 기준이며, 초기값은 localStorage에서 복원합니다.
  const [currentMember, setCurrentMember] = useState(() => {
    return loadSavedMember();
  });
  const activeMemberId = currentMember?.id;

  const [message, setMessage] = useState('');
  const [busyKeys, setBusyKeys] = useState([]);
  const [cafeResetKey, setCafeResetKey] = useState(0);
  const [cafeDetailTarget, setCafeDetailTarget] = useState(null);
  const audioRef = useRef(null);
  const toastTimerRef = useRef(null);
  const busyKeysRef = useRef([]);
  const [musicOn, setMusicOn] = useState(false);

  // 브라우저 자동재생 제한 때문에 사용자가 누른 뒤 재생을 시도하고 실패 시 상태만 되돌립니다.
  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }
    try {
      await audio.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  };

  // 짧게 사라지는 전역 알림 메시지입니다.
  const notify = useCallback((text) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setMessage(text);
    toastTimerRef.current = setTimeout(() => {
      setMessage('');
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const clearMember = useCallback(() => {
    setCurrentMember(null);
    clearStoredMember();
  }, []);

  // 로그인/회원정보 수정 후 React 상태와 localStorage를 동시에 갱신합니다.
  const saveMember = useCallback((member) => {
    const safeMember = saveStoredMember(member);
    if (!safeMember) {
      clearMember();
      return;
    }
    setCurrentMember(safeMember);
  }, [clearMember]);

  const {
    artist,
    concerts,
    reservations,
    posts,
    selectedPost,
    notices,
    events,
    appliedEventIds,
    notifications,
    fanDashboard,
    loadError,
    loading,
    setNotifications,
    openPost,
    refreshPosts,
    refreshConcertsAndReservations,
    load
  } = useDohwaData(activeMemberId, saveMember, clearMember);

  useEffect(() => {
    busyKeysRef.current = busyKeys;
  }, [busyKeys]);

  const isBusy = useCallback((key) => busyKeys.includes(key), [busyKeys]);
  const hasBusyAction = busyKeys.length > 0;

  const runAction = useCallback(async (key, task) => {
    if (busyKeysRef.current.includes(key)) return;
    busyKeysRef.current = [...busyKeysRef.current, key];
    setBusyKeys(busyKeysRef.current);
    try {
      await task();
    } catch (error) {
      if (isAuthError(error)) {
        clearMember();
        setTab('auth');
      }
      notify(errorMessage(error));
    } finally {
      busyKeysRef.current = busyKeysRef.current.filter(item => item !== key);
      setBusyKeys(busyKeysRef.current);
    }
  }, [clearMember, notify, setTab]);

  // 로그아웃과 회원탈퇴 완료 시 공통으로 세션을 정리합니다.
  const logout = (logoutMessage = '로그아웃되었습니다.') => {
    clearMember();
    notify(typeof logoutMessage === 'string' ? logoutMessage : '로그아웃되었습니다.');
    setTab('home');
  };

  // 홈이나 프로필에서 게시글을 열 때 카페 탭으로 이동하면서 상세 글을 지정합니다.
  const openCafePost = async (postId) => {
    try {
      await openPost(postId);
      setCafeDetailTarget({ postId, tick: Date.now() });
      setTab('cafe');
    } catch (error) {
      notify(errorMessage(error));
      setTab('cafe');
    }
  };

  const payReservation = (id) => runAction(`reservation:${id}`, async () => {
    await api.put(`/reservations/${id}/pay`, null, { params: { memberId: activeMemberId } });
    notify('입금 확인이 완료되었습니다.');
    await load();
  });

  const cancelReservation = (id) => runAction(`reservation:${id}`, async () => {
    await api.delete(`/reservations/${id}`, { params: { memberId: activeMemberId } });
    notify('예매가 취소되었습니다.');
    await load();
  });

  // URL 경로와 탭 버튼을 1:1로 매핑합니다.
  const tabs = [
    ['home', '홈'], ['concerts', '공연'], ['events', '이벤트'], ['cafe', '게시판'],
    ['chat', '채팅방'], ['notifications', '알림'],
    ...(currentMember?.role === 'ADMIN' ? [['admin', '관리자']] : []),
    currentMember ? ['mypage', '마이페이지'] : ['auth', '로그인']
  ];
  const knownTabs = ['home', 'concerts', 'events', 'cafe', 'chat', 'notifications', 'admin', 'notices', 'mypage', 'auth'];

  // 카페 탭을 이미 보고 있을 때 다시 누르면 검색/필터 상태를 초기화하도록 신호값을 증가시킵니다.
  const selectTab = (key) => {
    if (key === 'cafe' && tab === 'cafe') {
      setCafeResetKey(value => value + 1);
    }
    setTab(key);
  };

  return (
    <>
      <header>
        <nav>
          <div className="brand"><span className="mark" />DOHWA LINK</div>
          <div className="tabs">
            {tabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => selectTab(key)}>{label}</button>)}
          </div>
        </nav>
      </header>
      <main>
        <audio ref={audioRef} src={assetUrl('peach.mp3')} loop onEnded={() => setMusicOn(false)} />
        {(loading || hasBusyAction) && <div className="global-loading" role="status">{hasBusyAction ? '요청을 처리하는 중입니다.' : '데이터를 불러오는 중입니다.'}</div>}
        {loadError && <BackendStatus message={loadError} isBackendConnectionError={isBackendConnectionError} apiBaseUrl={apiBaseUrl} />}
        {tab === 'home' && <Home artist={artist} concerts={concerts} events={events} posts={posts} notices={notices} fanDashboard={fanDashboard} currentMember={currentMember} musicOn={musicOn} toggleMusic={toggleMusic} setTab={setTab} openCafePost={openCafePost} />}
        {tab === 'concerts' && <Concerts concerts={concerts} currentMember={currentMember} setTab={setTab} notify={notify} refreshConcertsAndReservations={refreshConcertsAndReservations} />}
        {tab === 'mypage' && <MyPage currentMember={currentMember} reservations={reservations} fanDashboard={fanDashboard} reservationBusyKey={(id) => isBusy(`reservation:${id}`)} onPay={payReservation} onCancel={cancelReservation} reload={load} notify={notify} saveMember={saveMember} logout={logout} setTab={setTab} />}
        {tab === 'cafe' && <Cafe posts={posts} selectedPost={selectedPost} openPost={openPost} refreshPosts={refreshPosts} notify={notify} currentMember={currentMember} resetKey={cafeResetKey} detailTarget={cafeDetailTarget} />}
        {tab === 'chat' && <ChatRoom currentMember={currentMember} setTab={setTab} notify={notify} />}
        {tab === 'admin' && (currentMember?.role === 'ADMIN'
          ? <AdminPanel concerts={concerts} notices={notices} events={events} reload={load} notify={notify} />
          : <div className="panel login-required"><h3>관리자 권한이 필요합니다.</h3><button onClick={() => setTab('auth')}>로그인</button></div>)}
        {tab === 'notices' && <NoticeList notices={notices} />}
        {tab === 'events' && <Events events={events} appliedEventIds={appliedEventIds} isBusy={(id) => isBusy(`event:${id}`)} apply={(id) => runAction(`event:${id}`, async () => {
          if (!activeMemberId) {
            notify('로그인 후 이벤트에 응모할 수 있습니다.');
            setTab('auth');
            return;
          }
          await api.post(`/events/${id}/apply`, null, { params: { memberId: activeMemberId } });
          notify('이벤트 응모가 완료되었습니다.');
          await load();
        })} />}
        {tab === 'notifications' && (currentMember ? <Notifications items={notifications} isBusy={isBusy} read={(id) => runAction(`notification:read:${id}`, async () => {
          const res = await api.put(`/notifications/${id}/read`, null, { params: { memberId: activeMemberId } });
          setNotifications(items => items.map(item => item.id === id ? res.data : item));
          await load();
        })} readAll={() => runAction('notification:readAll', async () => {
          const res = await api.put('/notifications/read-all', null, { params: { memberId: activeMemberId } });
          setNotifications(res.data);
          notify('전체 알림을 읽음 처리했습니다.');
          await load();
        })} remove={(id) => runAction(`notification:remove:${id}`, async () => {
          await api.delete(`/notifications/${id}`, { params: { memberId: activeMemberId } });
          setNotifications(items => items.filter(item => item.id !== id));
          notify('알림이 삭제되었습니다.');
          await load();
        })} removeAll={() => runAction('notification:removeAll', async () => {
          if (!window.confirm('전체 알림을 삭제할까요?')) return;
          await api.delete('/notifications', { params: { memberId: activeMemberId } });
          setNotifications([]);
          notify('전체 알림이 삭제되었습니다.');
          await load();
        })} /> : <LoginRequired setTab={setTab} message="알림은 로그인 후 확인할 수 있습니다." />)}
        {tab === 'auth' && <AuthPage currentMember={currentMember} saveMember={saveMember} notify={notify} reload={load} setTab={setTab} />}
        {!knownTabs.includes(tab) && <NotFound setTab={setTab} />}
      </main>
      {message && <div className="toast">{message}</div>}
    </>
  );
}

// 홈 화면입니다. 최신 공연, 이벤트, 인기 게시글, 팬덤 랭킹을 모아 첫 화면에서 보여줍니다.
function Home({ artist, concerts = [], events = [], posts = [], notices = [], fanDashboard, currentMember, musicOn, toggleMusic, setTab, openCafePost }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const now = new Date();
  const formatShortDate = (value) => value ? new Date(value).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '일정 미정';
  const daysUntil = (value) => {
    if (!value) return 'D-day';
    const diff = Math.ceil((new Date(value) - now) / 86400000);
    if (diff < 0) return '진행 중';
    return diff === 0 ? 'D-day' : `D-${diff}`;
  };
  // 가장 가까운 미래 공연을 홈의 대표 공연으로 사용합니다.
  const nextConcert = [...concerts]
    .filter((concert) => !concert.concertDate || new Date(concert.concertDate) >= now)
    .sort((a, b) => new Date(a.concertDate || 0) - new Date(b.concertDate || 0))[0] || concerts[0];
  const activeEvent = [...events]
    .sort((a, b) => new Date(a.endAt || a.startAt || 0) - new Date(b.endAt || b.startAt || 0))[0];
  const hotPosts = [...posts]
    .filter((post) => !post.pinned)
    .sort((a, b) => ((b.likeCount || 0) * 3 + (b.commentCount || 0) * 2 + (b.viewCount || 0) / 10) - ((a.likeCount || 0) * 3 + (a.commentCount || 0) * 2 + (a.viewCount || 0) / 10))
    .slice(0, 4);
  const ranking = fanDashboard?.ranking?.slice(0, 5) || [];
  const missions = fanDashboard?.missions?.slice(0, 3) || [];
  // 공지/이벤트/인기글을 하나의 흐르는 소식 영역으로 합칩니다.
  const liveItems = [
    ...notices.slice(0, 2).map((notice) => ({ type: '공지', title: notice.title, tab: 'notices' })),
    ...events.slice(0, 2).map((event) => ({ type: '이벤트', title: event.title, tab: 'events' })),
    ...hotPosts.slice(0, 3).map((post) => ({ type: '팬톡', title: post.title, tab: 'cafe' }))
  ];
  // 홈 상단 슬라이더에 들어갈 주요 이동 항목입니다.
  const heroSlides = [
    {
      label: 'MAIN STAGE',
      title: nextConcert?.title || 'DOHWA 1st Concert',
      desc: nextConcert ? `${formatShortDate(nextConcert.concertDate)} 공연 예매와 좌석 현황을 확인하세요.` : '새로운 공연 소식이 등록되면 가장 먼저 보여드립니다.',
      action: '공연 예매',
      tab: 'concerts'
    },
    {
      label: 'FAN EVENT',
      title: activeEvent?.title || '팬 이벤트 준비 중',
      desc: activeEvent ? `${formatShortDate(activeEvent.endAt)}까지 참여 가능한 이벤트입니다.` : '도화와 팬이 함께 만드는 이벤트 공간입니다.',
      action: '이벤트 참여',
      tab: 'events'
    },
    {
      label: 'COMMUNITY',
      title: hotPosts[0]?.title || '팬 게시판으로 모이기',
      desc: '사진, 후기, 응원 글을 남기고 다른 팬들과 실시간으로 반응을 나눠보세요.',
      action: '게시판 보기',
      tab: 'cafe'
    }
  ];
  const statItems = [
    ['공연', concerts.length],
    ['이벤트', events.length],
    ['게시글', posts.length],
    ['내 레벨', fanDashboard?.me?.level || currentMember?.role || 'GUEST']
  ];
  const dDayNumber = nextConcert?.concertDate ? Math.max(0, Math.ceil((new Date(nextConcert.concertDate) - now) / 86400000)) : 0;
  const dDayProgress = Math.max(8, Math.min(100, 100 - dDayNumber));
  const openPostFromHome = (postId) => {
    if (openCafePost) {
      openCafePost(postId);
      return;
    }
    setTab('cafe');
  };

  // 홈 슬라이더는 일정 시간마다 자동으로 다음 항목을 보여줍니다.
  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % heroSlides.length), 4500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return <section className="home-page">
    <div className="panel home-hero">
      <div className="home-hero-copy">
        <span className="eyebrow">DOHWA OFFICIAL FAN SERVICE</span>
        <h1>도화의 홈페이지</h1>
        <p>{artist?.description || '도화는 맑은 보컬과 섬세한 퍼포먼스를 기반으로 활동하는 솔로 아티스트입니다. 팬들과 오래 기억될 장면을 만들어 갑니다.'}</p>
        <div className="home-actions">
          <button onClick={() => setTab('concerts')}>공연 예매</button>
          <button className="secondary" onClick={() => setTab('events')}>이벤트 보기</button>
          <button className="secondary" onClick={() => setTab('cafe')}>팬 게시판</button>
        </div>
        <div className="home-slider" aria-label="홈 주요 소식">
          <div>
            <span>{heroSlides[activeSlide].label}</span>
            <b>{heroSlides[activeSlide].title}</b>
            <small>{heroSlides[activeSlide].desc}</small>
          </div>
          <button onClick={() => setTab(heroSlides[activeSlide].tab)}>{heroSlides[activeSlide].action}</button>
        </div>
        <div className="home-slide-dots" aria-label="배너 선택">
          {heroSlides.map((slide, index) => <button key={slide.label} className={activeSlide === index ? 'active' : ''} onClick={() => setActiveSlide(index)} aria-label={`${index + 1}번째 배너 보기`} />)}
        </div>
        <div className="music-player">
          <div>
            <span className="eyebrow">NOW PLAYING</span>
            <strong>복숭아</strong>
            <small>{musicOn ? '재생 중' : '홈페이지 전용 트랙'}</small>
          </div>
          <button className={musicOn ? 'player-button playing' : 'player-button'} onClick={toggleMusic} aria-label={musicOn ? '복숭아 일시정지' : '복숭아 재생'} title={musicOn ? '일시정지' : '재생'}>
            <span>{musicOn ? '❚❚' : '▶'}</span>
          </button>
        </div>
      </div>
      <button className="home-visual" onClick={() => setTab('concerts')} aria-label="공연 예매 페이지로 이동">
        <img src={assetUrl('DOHWA 1st concert.png')} alt="DOHWA 1st concert" />
      </button>
    </div>

    <div className="home-live-strip">
      <span>LIVE</span>
      <div>
        {liveItems.length ? liveItems.map((item, index) => <button key={`${item.type}-${item.title}-${index}`} onClick={() => setTab(item.tab)}>
          <b>{item.type}</b>
          {item.title}
        </button>) : <p>새 소식이 등록되면 이곳에 흐릅니다.</p>}
      </div>
    </div>

    <div className="home-stat-grid">
      {statItems.map(([label, value]) => <article className="home-stat-card" key={label}>
        <span>{label}</span>
        <b>{value}</b>
      </article>)}
    </div>

    <div className="home-section-grid">
      <article className="panel home-feature large">
        <span className="eyebrow">NEXT STAGE</span>
        <h2>{nextConcert?.title || '다음 공연 준비 중'}</h2>
        <div className="home-stage-row">
          <div className="home-dday-ring" style={{ '--progress': `${dDayProgress}%` }}>
            <b>{daysUntil(nextConcert?.concertDate)}</b>
            <span>COUNT</span>
          </div>
          <p>{nextConcert ? `${formatShortDate(nextConcert.concertDate)}에 ${nextConcert.venue || '공개 예정 장소'}에서 만나요. 예매 가능한 좌석과 공연 정보를 바로 확인할 수 있습니다.` : '공연 일정이 등록되면 이곳에 바로 표시됩니다.'}</p>
        </div>
        <button onClick={() => setTab('concerts')}>좌석 확인하기</button>
      </article>

      <article className="panel home-feature">
        <span className="eyebrow">ACTIVE EVENT</span>
        <h2>{activeEvent?.title || '진행 이벤트 대기 중'}</h2>
        <p>{activeEvent ? `${formatShortDate(activeEvent.startAt)}부터 ${formatShortDate(activeEvent.endAt)}까지 참여할 수 있습니다.` : '새 이벤트가 열리면 홈에서 바로 안내됩니다.'}</p>
        <button className="secondary" onClick={() => setTab('events')}>이벤트 참여</button>
      </article>

      <article className="panel home-feature">
        <span className="eyebrow">TOP FANS</span>
        <h2>팬 랭킹</h2>
        <div className="home-card-list">
          {ranking.length ? ranking.map((fan, index) => <div className="home-ranking-row" key={fan.memberId || fan.nickname}>
            <b>{index + 1}</b>
            <span>{fan.nickname}</span>
            <small>{fan.point}P</small>
          </div>) : <p className="muted">팬 활동 데이터가 아직 없습니다.</p>}
        </div>
      </article>

      <article className="panel home-feature large">
        <span className="eyebrow">HOT FAN POSTS</span>
        <h2>지금 많이 보는 게시글</h2>
        <div className="home-post-grid">
          {hotPosts.length ? hotPosts.map((post) => <button className="home-post-card" key={post.id} onClick={() => openPostFromHome(post.id)}>
            {post.imageUrl && <img src={post.imageUrl} alt="" />}
            <span>{post.category || '팬톡'}</span>
            <b>{post.title}</b>
            <small>좋아요 {post.likeCount || 0} · 댓글 {post.commentCount || 0}</small>
          </button>) : <p className="muted">게시글이 등록되면 인기 글이 표시됩니다.</p>}
        </div>
      </article>

      <article className="panel home-feature">
        <span className="eyebrow">TODAY MISSIONS</span>
        <h2>오늘의 활동</h2>
        <div className="home-card-list">
          {missions.length ? missions.map((mission) => <div className="home-mission-row" key={mission.code || mission.title}>
            <span>{mission.completed ? '완료' : '진행'}</span>
            <b>{mission.title}</b>
            <small>{mission.rewardPoint}P</small>
          </div>) : <p className="muted">로그인하면 미션을 확인할 수 있습니다.</p>}
        </div>
      </article>

      <article className="panel home-feature">
        <span className="eyebrow">NOTICE</span>
        <h2>최근 공지</h2>
        <div className="home-timeline">
          {notices.slice(0, 3).map((notice) => <button key={notice.id} onClick={() => setTab('notices')}>
            <b>{notice.title}</b>
            <small>{formatShortDate(notice.createdAt)}</small>
          </button>)}
          {!notices.length && <p className="muted">등록된 공지가 없습니다.</p>}
        </div>
      </article>

      <article className="panel home-feature">
        <span className="eyebrow">OFFICIAL CHANNELS</span>
        <h2>공식 채널</h2>
        <div className="home-channel-grid">
          <p><b>팬레터</b><span>서울시 송파구 도화링크 팬레터 담당자 앞</span></p>
          <p><b>문의</b><span>support@dohwa-link.example</span></p>
          <p><b>운영 시간</b><span>평일 10:00 - 18:00</span></p>
        </div>
      </article>
    </div>
  </section>;
}

// 팬 활동 점수, 레벨, 미션, 배지를 보여주는 팬덤 대시보드입니다.
function Fandom({ dashboard, currentMember, setTab, embedded = false }) {
  const [selectedBadge, setSelectedBadge] = useState(null);
  if (!dashboard) return <div className="panel login-required">팬덤 데이터를 불러오는 중입니다.</div>;
  const me = dashboard.me || {};
  const stats = me.stats || {};
  const ranking = dashboard.ranking || [];
  const missions = dashboard.missions || [];
  const hotPosts = dashboard.hotPosts || [];
  const badges = me.badges || [];
  const badgeDescriptions = {
    '첫 게시글': '게시글을 처음 작성하면 획득하는 시작 배지입니다.',
    '댓글 요정': '댓글 활동이 활발한 팬에게 부여되는 소통 배지입니다.',
    '좋아요 수집가': '좋아요 활동으로 팬덤 반응을 만든 기록입니다.',
    '공연 메이트': '공연 예매를 통해 현장 활동에 참여한 기록입니다.',
    '이벤트 러버': '이벤트 응모로 팬덤 이벤트에 참여한 기록입니다.'
  };

  // embedded가 true이면 마이페이지 안에 들어가는 축약형으로 렌더링합니다.
  return <section className={embedded ? 'fandom mypage-fandom' : 'fandom'}>
    {!embedded && <SectionTitle title="팬덤 아레나" />}
    <div className="fandom-hero panel">
      <div>
        <span className="eyebrow">FANDOM LEVEL SYSTEM</span>
        <h2>{currentMember ? `${me.nickname}의 팬 활동 레벨` : '도화 팬덤 성장 시스템'}</h2>
        <p>{currentMember ? '현재 계정의 게시글, 댓글, 좋아요, 공연 예매, 이벤트 응모 활동이 레벨과 배지로 기록됩니다.' : '로그인하면 내 레벨, 미션, 배지를 확인할 수 있습니다.'}</p>
      </div>
      <div className="level-orb">
        <small>LEVEL</small>
        <b>{me.level || '-'}</b>
        <span>{me.title || '로그인 필요'}</span>
      </div>
    </div>

    <div className="fandom-grid">
      <article className="panel level-card">
        <span className="eyebrow">MY PROGRESS</span>
        <h3>{me.title || '팬 활동을 시작하세요'}</h3>
        <div className="xp-bar"><span style={{ width: `${me.progress || 0}%` }} /></div>
        <p className="muted">{me.points || 0} XP · 다음 레벨 기준 {me.nextLevelPoints || 120} XP</p>
        <div className="xp-guide">
          <span>게시글 +60 XP</span>
          <span>댓글 +20 XP</span>
          <span>좋아요 +10 XP</span>
          <span>예매 +80 XP</span>
          <span>이벤트 +30 XP</span>
        </div>
        <div className="stat-row">
          <p><b>{stats.posts || 0}</b><span>게시글</span></p>
          <p><b>{stats.comments || 0}</b><span>댓글</span></p>
          <p><b>{stats.likedPosts || 0}</b><span>누른 좋아요</span></p>
          <p><b>{stats.reservations || 0}</b><span>예매</span></p>
        </div>
      </article>

      <article className="panel mission-card">
        <span className="eyebrow">TODAY MISSIONS</span>
        <h3>팬 활동 미션</h3>
        <div className="mission-list">
          {missions.map(mission => <div key={mission.title} className={mission.complete ? 'mission complete' : 'mission'}>
            <div><b>{mission.title}</b><small>{mission.description}</small></div>
            <span>{mission.complete ? '완료' : `${mission.value}/${mission.target}`}</span>
          </div>)}
        </div>
      </article>

      <article className="panel badge-card">
        <span className="eyebrow">BADGE VAULT</span>
        <h3>획득 배지</h3>
        <div className="badge-grid">
          {badges.length ? badges.map(badge => <button key={badge.name} className={badge.earned ? 'badge earned' : 'badge'} onClick={() => setSelectedBadge(badge)}>{badge.name}</button>) : <p className="muted">로그인하면 배지가 표시됩니다.</p>}
        </div>
      </article>

      <article className="panel ranking-card">
        <span className="eyebrow">TOP FANS</span>
        <h3>팬 랭킹</h3>
        <div className="ranking-list">
          {ranking.map((item, index) => <div key={item.memberId} className="ranking-row">
            <b>{index + 1}</b>
            <div><strong>{item.nickname}</strong><small>Lv.{item.level} · {item.title}</small></div>
            <span>{item.points} XP</span>
          </div>)}
        </div>
      </article>

      <article className="panel hot-card">
        <span className="eyebrow">HOT POSTS</span>
        <h3>인기 활동글</h3>
        <div className="hot-list">
          {hotPosts.map(post => <button key={post.id} className="hot-post" onClick={() => setTab('cafe')}>
            <b>[{prefixLabels[post.prefix] || post.prefix}] {post.title}</b>
            <small>{post.author} · 좋아요 {post.likeCount} · 댓글 {post.commentCount} · 조회 {post.viewCount}</small>
          </button>)}
        </div>
      </article>
    </div>
    {selectedBadge && <div className="modal-backdrop" onClick={() => setSelectedBadge(null)}>
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <span className="eyebrow">BADGE DETAIL</span>
        <h3>{selectedBadge.name}</h3>
        <p>{badgeDescriptions[selectedBadge.name] || '팬 활동을 통해 획득할 수 있는 배지입니다.'}</p>
        <p className="muted">{selectedBadge.earned ? '획득 완료' : '아직 획득하지 못했습니다. 미션과 활동을 이어가세요.'}</p>
        <button onClick={() => setSelectedBadge(null)}>확인</button>
      </div>
    </div>}
  </section>;
}

// 로그인, 회원가입, 이메일 찾기, 비밀번호 재설정을 한 화면에서 탭처럼 전환합니다.
function AuthPage({ currentMember, saveMember, notify, reload, setTab }) {
  const [authMode, setAuthMode] = useState('login');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ email: '', nickname: '', password: '' });
  const [findNickname, setFindNickname] = useState('');
  const [foundEmails, setFoundEmails] = useState([]);
  const [resetForm, setResetForm] = useState({ email: '', nickname: '', newPassword: '', confirmPassword: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const passwordRuleMessage = '비밀번호는 영문, 숫자, 특수기호를 포함해 8자리 이상이어야 합니다.';
  const isValidSignupPassword = (password) =>
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

  // 로그인 실패 횟수는 프론트 localStorage에 저장해 5회 실패 시 5분간 입력을 제한합니다.
  const submitLogin = async () => {
    const email = login.email.trim().toLowerCase();
    const lockKey = email ? `dohwa.loginLock.${email}` : '';
    if (lockKey) {
      const loginLock = JSON.parse(localStorage.getItem(lockKey) || '{"count":0,"lockedUntil":0}');
      if (loginLock.lockedUntil && loginLock.lockedUntil > Date.now()) {
        const minutes = Math.ceil((loginLock.lockedUntil - Date.now()) / 60000);
        notify(`로그인 실패가 반복되어 ${minutes}분 후 다시 시도할 수 있습니다.`);
        return;
      }
    }
    try {
      const res = await api.post('/members/login', login);
      if (lockKey) {
        localStorage.removeItem(lockKey);
      }
      saveMember(res.data);
      notify('로그인되었습니다.');
      await reload();
      setTab('mypage');
    } catch (error) {
      if (lockKey) {
        const loginLock = JSON.parse(localStorage.getItem(lockKey) || '{"count":0,"lockedUntil":0}');
        const nextCount = (loginLock.count || 0) + 1;
        localStorage.setItem(lockKey, JSON.stringify({
          count: nextCount >= 5 ? 0 : nextCount,
          lockedUntil: nextCount >= 5 ? Date.now() + 5 * 60 * 1000 : 0
        }));
      }
      notify(errorMessage(error));
    }
  };

  // 회원가입 성공 후 바로 로그인 상태로 저장하고 마이페이지로 이동합니다.
  const submitSignup = async () => {
    if (!signup.nickname.trim()) {
      notify('닉네임을 입력하세요.');
      return;
    }
    if (!isValidSignupPassword(signup.password)) {
      notify(passwordRuleMessage);
      return;
    }
    try {
      const res = await api.post('/members/signup', signup);
      saveMember(res.data);
      setSignup({ email: '', nickname: '', password: '' });
      notify('회원가입이 완료되었습니다.');
      await reload();
      setTab('mypage');
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 닉네임으로 가입 이메일을 찾는 보조 기능입니다.
  const findEmail = async () => {
    const nickname = findNickname.trim();
    if (!nickname) {
      notify('닉네임을 입력하세요.');
      return;
    }
    try {
      const res = await api.post('/members/find-email', { nickname });
      setFoundEmails(res.data.emails || []);
      notify('가입된 이메일을 찾았습니다.');
    } catch (error) {
      setFoundEmails([]);
      notify(errorMessage(error));
    }
  };

  // 이메일과 닉네임이 모두 맞을 때 새 비밀번호로 변경합니다.
  const resetPassword = async () => {
    const email = resetForm.email.trim();
    const nickname = resetForm.nickname.trim();
    if (!email || !nickname) {
      notify('이메일과 닉네임을 입력하세요.');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      notify('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!isValidSignupPassword(resetForm.newPassword)) {
      notify(passwordRuleMessage);
      return;
    }
    try {
      await api.put('/members/password/reset', { email, nickname, newPassword: resetForm.newPassword });
      setResetForm({ email: '', nickname: '', newPassword: '', confirmPassword: '' });
      notify('비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.');
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  if (currentMember) return <LoginRequired setTab={setTab} message="이미 로그인되어 있습니다." />;

  return <section>
    <SectionTitle title="로그인 / 회원가입" />
    <div className="auth-shell">
      <div className="panel auth-card">
        <div className="auth-tabs">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>로그인</button>
          <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>회원가입</button>
        </div>
        <div className="auth-body">
          {authMode === 'login' && <div className="write auth-form">
            <h3>로그인</h3>
            <input type="email" placeholder="이메일" value={login.email} onChange={e => setLogin({...login, email: e.target.value})}/>
            <PasswordField placeholder="비밀번호" value={login.password} visible={showLoginPassword} onToggle={() => setShowLoginPassword(value => !value)} onChange={password => setLogin({...login, password})}/>
            <button onClick={submitLogin}>로그인</button>
          </div>}
          {authMode === 'signup' && <div className="write auth-form">
            <h3>회원가입</h3>
            <input type="email" placeholder="이메일" value={signup.email} onChange={e => setSignup({...signup, email: e.target.value})}/>
            <input placeholder="닉네임" maxLength={10} value={signup.nickname} onChange={e => setSignup({...signup, nickname: e.target.value})}/>
            <PasswordField placeholder="비밀번호" value={signup.password} visible={showSignupPassword} onToggle={() => setShowSignupPassword(value => !value)} onChange={password => setSignup({...signup, password})}/>
            <p className={signup.password && !isValidSignupPassword(signup.password) ? 'password-hint invalid' : 'password-hint'}>{passwordRuleMessage}</p>
            <button onClick={submitSignup}>가입하기</button>
          </div>}
          {authMode === 'email' && <div className="write auth-form">
            <h3>이메일 찾기</h3>
            <p className="muted">가입할 때 사용한 닉네임으로 이메일을 찾습니다.</p>
            <input placeholder="가입한 닉네임" maxLength={10} value={findNickname} onChange={e => setFindNickname(e.target.value)} />
            <button onClick={findEmail}>이메일 찾기</button>
            {foundEmails.length > 0 && <div className="found-email-list">
              {foundEmails.map(email => <span key={email}>{email}</span>)}
            </div>}
          </div>}
          {authMode === 'password' && <div className="write auth-form">
            <h3>비밀번호 찾기</h3>
            <input type="email" placeholder="가입한 이메일" value={resetForm.email} onChange={e => setResetForm({...resetForm, email: e.target.value})} />
            <input placeholder="가입한 닉네임" maxLength={10} value={resetForm.nickname} onChange={e => setResetForm({...resetForm, nickname: e.target.value})} />
            <PasswordField placeholder="새 비밀번호" value={resetForm.newPassword} visible={showResetPassword} onToggle={() => setShowResetPassword(value => !value)} onChange={newPassword => setResetForm({...resetForm, newPassword})}/>
            <input type="password" placeholder="새 비밀번호 확인" value={resetForm.confirmPassword} onChange={e => setResetForm({...resetForm, confirmPassword: e.target.value})} />
            <p className={resetForm.newPassword && !isValidSignupPassword(resetForm.newPassword) ? 'password-hint invalid' : 'password-hint'}>{passwordRuleMessage}</p>
            <button onClick={resetPassword}>비밀번호 재설정</button>
          </div>}
        </div>
        <div className="auth-help">
          <div className="auth-help-toggle">
            <button className={authMode === 'email' ? 'active' : ''} onClick={() => setAuthMode('email')}>이메일 찾기</button>
            <button className={authMode === 'password' ? 'active' : ''} onClick={() => setAuthMode('password')}>비밀번호 찾기</button>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

function PasswordField({ placeholder, value, visible, onToggle, onChange }) {
  return <div className="password-field">
    <input type={visible ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    <button type="button" className="secondary password-toggle" onClick={onToggle}>{visible ? '숨기기' : '보기'}</button>
  </div>;
}

// 내 정보 수정, 비밀번호 변경, 활동 내역, 예매 내역을 탭으로 관리하는 마이페이지입니다.
function MyPage({ currentMember, reservations, fanDashboard, reservationBusyKey = () => false, onPay, onCancel, reload, notify, saveMember, logout, setTab }) {
  const [mypageTab, setMypageTab] = useState('profile');
  const [profile, setProfile] = useState({ nickname: currentMember?.nickname || '', profileImage: currentMember?.profileImage || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activityProfile, setActivityProfile] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // currentMember가 갱신되면 입력 폼도 최신 회원 정보로 맞춥니다.
  useEffect(() => {
    setProfile({ nickname: currentMember?.nickname || '', profileImage: currentMember?.profileImage || '' });
  }, [currentMember]);

  // 활동 관리 탭을 열 때만 프로필 활동 데이터를 요청해 불필요한 API 호출을 줄입니다.
  useEffect(() => {
    if (mypageTab !== 'activity' || !currentMember) return;
    let alive = true;
    setActivityLoading(true);
    api.get(`/members/${currentMember.id}/profile`)
      .then(res => { if (alive) setActivityProfile(res.data); })
      .catch(error => notify(errorMessage(error)))
      .finally(() => { if (alive) setActivityLoading(false); });
    return () => { alive = false; };
  }, [mypageTab, currentMember?.id]);

  if (!currentMember) return <LoginRequired setTab={setTab} />;

  const updateProfile = async () => {
    const nickname = profile.nickname.trim();
    if (!nickname) {
      notify('닉네임을 입력하세요.');
      return;
    }

    try {
      const res = await api.put(`/members/${currentMember.id}`, { ...profile, nickname });
      saveMember(res.data);
      notify('내 정보가 수정되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 이미지 파일은 서버 업로드 대신 base64 문자열로 저장하므로 선택 즉시 압축합니다.
  const changeProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const profileImage = await resizeImageFile(file, 420, 0.82);
      setProfile(current => ({ ...current, profileImage }));
    } catch {
      notify('프로필 이미지를 처리하지 못했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  // 회원탈퇴는 되돌릴 수 없으므로 confirm과 비밀번호 prompt를 한 번 더 거칩니다.
  const deleteAccount = async () => {
    if (!window.confirm('회원탈퇴 시 예매 내역, 게시글, 댓글 등 계정 정보가 삭제됩니다. 탈퇴하시겠습니까?')) {
      return;
    }
    const password = window.prompt('회원탈퇴 확인을 위해 현재 비밀번호를 입력하세요.');
    if (!password) {
      notify('회원탈퇴가 취소되었습니다.');
      return;
    }

    try {
      await api.delete(`/members/${currentMember.id}`, { data: { password } });
      await reload();
      logout('회원탈퇴가 완료되었습니다.');
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 현재 비밀번호 확인은 백엔드에서 처리하고, 프론트에서는 새 비밀번호 일치 여부만 먼저 검사합니다.
  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      await api.put(`/members/${currentMember.id}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify('비밀번호가 변경되었습니다.');
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  return <section>
    <SectionTitle title="마이페이지" />
    <div className="mypage-tabs">
      <button className={mypageTab === 'profile' ? 'active' : ''} onClick={() => setMypageTab('profile')}>내 정보</button>
      <button className={mypageTab === 'password' ? 'active' : ''} onClick={() => setMypageTab('password')}>비밀번호 변경</button>
      <button className={mypageTab === 'activity' ? 'active' : ''} onClick={() => setMypageTab('activity')}>활동 관리</button>
      <button className={mypageTab === 'reservations' ? 'active' : ''} onClick={() => setMypageTab('reservations')}>예매 내역</button>
    </div>
    {mypageTab === 'profile' && <div className="mypage-section profile-section">
      <div className="account-stack">
        <div className="panel account-card account-summary-card">
          <span className="eyebrow">MY ACCOUNT</span>
          <label className={profile.profileImage ? 'account-avatar image-avatar editable-avatar' : 'account-avatar editable-avatar'}>
            {profile.profileImage && <img src={profile.profileImage} alt="프로필" />}
            <input type="file" accept="image/*" onChange={changeProfileImage} />
            <span>사진 변경</span>
          </label>
          <h3>{currentMember.nickname}</h3>
          <p className="muted">{currentMember.email}</p>
          <span className="account-role">{roleLabel(currentMember)}</span>
        </div>
        <div className="panel account-card account-edit-card">
          <span className="eyebrow">PROFILE EDIT</span>
          <div className="write">
            <input placeholder="닉네임" maxLength={10} value={profile.nickname} onChange={e => setProfile({...profile, nickname: e.target.value})} />
            {profile.profileImage && <button className="account-action" onClick={() => setProfile({...profile, profileImage: ''})}>기본 프로필로 되돌리기</button>}
            <button className="account-action" onClick={updateProfile}>내 정보 저장</button>
          </div>
        </div>
        <div className="panel account-card account-session-card">
          <span className="eyebrow">SESSION</span>
          <div className="account-button-grid">
            <button className="account-action" onClick={logout}>로그아웃</button>
            <button className="account-action" onClick={deleteAccount}>회원탈퇴</button>
          </div>
        </div>
      </div>
      <div className="mypage-fandom-wrap">
        <Fandom dashboard={fanDashboard} currentMember={currentMember} setTab={setTab} embedded />
      </div>
    </div>}
    {mypageTab === 'password' && <div className="mypage-section password-section">
      <div className="panel account-card password-card">
        <span className="eyebrow">PASSWORD</span>
        <h3>비밀번호 변경</h3>
        <p className="muted">현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
        <div className="write">
          <input type="password" placeholder="현재 비밀번호" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
          <input type="password" placeholder="새 비밀번호" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
          <input type="password" placeholder="새 비밀번호 확인" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
          <button className="account-action" onClick={changePassword}>비밀번호 변경</button>
        </div>
      </div>
      <div className="panel password-guide">
        <span className="eyebrow">SECURITY CHECK</span>
        <h3>안전한 비밀번호 기준</h3>
        <div className="guide-list">
          <p><b>8자 이상</b><span>짧은 비밀번호는 추측되기 쉽습니다.</span></p>
          <p><b>영문 + 숫자 + 특수기호</b><span>현재 회원가입 규칙과 동일하게 맞췄습니다.</span></p>
        </div>
      </div>
    </div>}
    {mypageTab === 'reservations' && <div className="mypage-section full-section">
      <div className="panel">
        <h3>예매 내역</h3>
        <ReservationTable reservations={reservations} isBusy={reservationBusyKey} onPay={onPay} onCancel={onCancel} />
      </div>
    </div>}
    {mypageTab === 'activity' && <div className="mypage-section full-section">
      <div className="panel activity-panel">
        <span className="eyebrow">MY ACTIVITY</span>
        <h3>내 활동 관리</h3>
        {activityLoading && <p className="muted">활동 내역을 불러오는 중입니다.</p>}
        {!activityLoading && activityProfile && <div className="activity-grid">
          <ActivityList title="작성 게시글" items={activityProfile.posts} empty="작성한 게시글이 없습니다." render={post => <><b>[{prefixLabels[post.prefix] || post.prefix}] {post.title}</b><small>좋아요 {post.likeCount} · 조회 {post.viewCount}</small></>} />
          <ActivityList title="작성 댓글" items={activityProfile.comments} empty="작성한 댓글이 없습니다." render={comment => <><b>{comment.content}</b><small>{comment.postTitle} · 좋아요 {comment.likeCount}</small></>} />
          <ActivityList title="좋아요한 글" items={activityProfile.likedPosts} empty="좋아요한 글이 없습니다." render={post => <><b>[{prefixLabels[post.prefix] || post.prefix}] {post.title}</b><small>좋아요 {post.likeCount}</small></>} />
        </div>}
        <button className="account-action" onClick={() => setTab('cafe')}>게시판에서 관리하기</button>
      </div>
    </div>}
  </section>;
}

// 마이페이지 활동 관리에서 같은 카드 레이아웃으로 여러 활동 목록을 보여주는 작은 재사용 컴포넌트입니다.
function ActivityList({ title, items, empty, render }) {
  return <article className="activity-card">
    <h4>{title}</h4>
    <div className="activity-list">
      {items?.length ? items.slice(0, 5).map(item => <p key={item.id}>{render(item)}</p>) : <p className="muted">{empty}</p>}
    </div>
  </article>;
}

// 관리자 전용 패널입니다. 회원 검색, 신고 처리, 공지/이벤트/공연 등록, 알림 발송, 공연 관리를 담당합니다.
function AdminPanel({ concerts = [], notices = [], events = [], reload, notify }) {
  // datetime-local 입력은 브라우저 로컬 시간 문자열이 필요하므로 ISO 문자열을 보정합니다.
  const toLocalInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const nowValue = () => toLocalInput(new Date(Date.now() + 60 * 60 * 1000));
  const laterValue = () => toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [notice, setNotice] = useState({ title: '', content: '' });
  const [event, setEvent] = useState({ title: '', content: '', startAt: nowValue(), endAt: laterValue() });
  const [concert, setConcert] = useState({
    title: '',
    concertDate: laterValue(),
    bookingStartAt: nowValue(),
    bookingEndAt: laterValue(),
    venue: '',
    description: '',
    totalSeats: 100,
    vipPrice: 154000,
    rPrice: 132000,
    sPrice: 110000,
    aPrice: 88000
  });
  const [editingConcertId, setEditingConcertId] = useState(null);
  const [notification, setNotification] = useState({ memberId: '', content: '' });
  const [memberQuery, setMemberQuery] = useState('');
  const [searchedMembers, setSearchedMembers] = useState([]);
  const [reportStatus, setReportStatus] = useState('OPEN');
  const [reports, setReports] = useState([]);
  const serviceChecklist = [
    ['인증/보안', 'JWT 또는 서버 세션, API 권한 검증, CORS/CSRF/XSS 방어가 필요합니다.', false],
    ['결제/예매', 'PG 결제 승인/취소 콜백, 좌석 선점 만료, 환불 정책 처리가 필요합니다.', false],
    ['파일 저장소', 'base64 저장 대신 S3/R2 같은 오브젝트 스토리지와 CDN이 필요합니다.', false],
    ['운영 DB/백업', 'H2 파일 DB 대신 MySQL/PostgreSQL, 정기 백업, 복구 절차가 필요합니다.', false],
    ['모니터링', '서버 로그, 에러 추적, 헬스체크, 배포 알림이 필요합니다.', false],
    ['정책 문서', '이용약관, 개인정보처리방침, 환불/신고/저작권 정책이 필요합니다.', false]
  ];

  // 신고 목록은 선택한 상태 필터에 따라 다시 불러옵니다.
  const loadReports = async () => {
    try {
      const res = await api.get('/admin/reports', { params: { status: reportStatus } });
      setReports(res.data);
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  useEffect(() => {
    loadReports();
  }, [reportStatus]);

  // 회원 검색은 검색어가 있을 때만 호출하고, 입력 중 과도한 요청을 막기 위해 250ms 지연합니다.
  useEffect(() => {
    const keyword = memberQuery.trim();
    if (!keyword) {
      setSearchedMembers([]);
      return;
    }

    let canceled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get('/members', { params: { keyword } });
        if (!canceled) {
          setSearchedMembers(res.data.slice(0, 8));
        }
      } catch (error) {
        if (!canceled) {
          notify(errorMessage(error));
        }
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(timeoutId);
    };
  }, [memberQuery]);

  // 신고를 처리 완료 상태로 바꾼 뒤 현재 필터 목록을 다시 조회합니다.
  const resolveReport = async (reportId) => {
    try {
      await api.put(`/admin/reports/${reportId}/resolve`);
      notify('신고를 처리 완료했습니다.');
      await loadReports();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const updateMemberRole = async (member, role) => {
    try {
      const res = await api.put(`/members/${member.id}`, {
        nickname: member.nickname,
        profileImage: member.profileImage || '',
        role
      });
      setSearchedMembers(items => items.map(item => item.id === member.id ? res.data : item));
      notify(`${member.nickname} 권한을 ${role}로 변경했습니다.`);
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 등록 성공 후 상위 App의 load를 호출해 홈/공지 목록까지 최신 상태로 맞춥니다.
  const createNotice = async () => {
    if (!notice.title.trim() || !notice.content.trim()) return notify('공지 제목과 내용을 입력하세요.');
    try {
      await api.post('/admin/notices', { title: notice.title.trim(), content: notice.content.trim() });
      setNotice({ title: '', content: '' });
      notify('공지가 등록되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 이벤트 등록도 공지와 동일하게 등록 후 전체 데이터를 다시 동기화합니다.
  const createEvent = async () => {
    if (!event.title.trim() || !event.content.trim()) return notify('이벤트 제목과 내용을 입력하세요.');
    try {
      await api.post('/admin/events', { ...event, title: event.title.trim(), content: event.content.trim() });
      setEvent({ title: '', content: '', startAt: nowValue(), endAt: laterValue() });
      notify('이벤트가 등록되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 공연 등록에는 예매 기간과 등급별 가격까지 함께 전달합니다.
  const createConcert = async () => {
    if (!concert.title.trim() || !concert.venue.trim() || !concert.description.trim()) return notify('공연 정보를 모두 입력하세요.');
    try {
      await api.post('/admin/concerts', {
        ...concert,
        title: concert.title.trim(),
        venue: concert.venue.trim(),
        description: concert.description.trim(),
        totalSeats: Number(concert.totalSeats),
        vipPrice: Number(concert.vipPrice),
        rPrice: Number(concert.rPrice),
        sPrice: Number(concert.sPrice),
        aPrice: Number(concert.aPrice)
      });
      setConcert({
        title: '',
        concertDate: laterValue(),
        bookingStartAt: nowValue(),
        bookingEndAt: laterValue(),
        venue: '',
        description: '',
        totalSeats: 100,
        vipPrice: 154000,
        rPrice: 132000,
        sPrice: 110000,
        aPrice: 88000
      });
      notify('공연이 등록되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const startConcertEdit = (item) => {
    setEditingConcertId(item.id);
    setConcert({
      title: item.title || '',
      concertDate: item.concertDate ? String(item.concertDate).slice(0, 16) : laterValue(),
      bookingStartAt: item.bookingStartAt ? String(item.bookingStartAt).slice(0, 16) : nowValue(),
      bookingEndAt: item.bookingEndAt ? String(item.bookingEndAt).slice(0, 16) : laterValue(),
      venue: item.venue || '',
      description: item.description || '',
      totalSeats: item.totalSeats || 100,
      vipPrice: item.vipPrice || 154000,
      rPrice: concertPrice(item, 'R'),
      sPrice: concertPrice(item, 'S'),
      aPrice: concertPrice(item, 'A')
    });
  };

  const saveConcert = async () => {
    if (!concert.title.trim() || !concert.venue.trim() || !concert.description.trim()) return notify('공연 정보를 모두 입력하세요.');
    if (!editingConcertId) return createConcert();
    try {
      await api.put(`/admin/concerts/${editingConcertId}`, {
        ...concert,
        title: concert.title.trim(),
        venue: concert.venue.trim(),
        description: concert.description.trim(),
        totalSeats: Number(concert.totalSeats),
        vipPrice: Number(concert.vipPrice),
        rPrice: Number(concert.rPrice),
        sPrice: Number(concert.sPrice),
        aPrice: Number(concert.aPrice)
      });
      setEditingConcertId(null);
      setConcert({
        title: '',
        concertDate: laterValue(),
        bookingStartAt: nowValue(),
        bookingEndAt: laterValue(),
        venue: '',
        description: '',
        totalSeats: 100,
        vipPrice: 154000,
        rPrice: 132000,
        sPrice: 110000,
        aPrice: 88000
      });
      notify('공연 정보가 수정되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const deleteConcert = async (concertId) => {
    if (!window.confirm('공연을 삭제할까요? 이미 예매가 있다면 운영상 문제가 생길 수 있습니다.')) return;
    try {
      await api.delete(`/admin/concerts/${concertId}`);
      notify('공연이 삭제되었습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const sendNotification = async () => {
    if (!notification.content.trim()) return notify('알림 내용을 입력하세요.');
    if (!notification.memberId) return notify('알림을 받을 회원 ID를 입력하세요.');
    try {
      await api.post('/admin/notifications', {
        memberId: Number(notification.memberId),
        content: notification.content.trim()
      });
      setNotification({ memberId: '', content: '' });
      notify('알림을 발송했습니다.');
      await reload();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  return <section className="mypage-admin">
    <SectionTitle title="관리자 콘솔" />
    <div className="admin-grid">
      <article className="panel admin-member-card">
        <span className="eyebrow">SERVICE READINESS</span>
        <h3>실서비스 준비 체크리스트</h3>
        <div className="service-checklist">
          {serviceChecklist.map(([title, detail, done]) => <p key={title}>
            <b>{done ? '완료' : '필요'} · {title}</b>
            <span>{detail}</span>
          </p>)}
        </div>
      </article>
      <article className="panel admin-member-card">
        <span className="eyebrow">MEMBERS</span>
        <h3>회원 검색</h3>
        <div className="write">
          <input placeholder="닉네임 검색" value={memberQuery} onChange={e => setMemberQuery(e.target.value)} />
        </div>
        <div className="admin-member-list">
          {searchedMembers.map(member => <p key={member.id}>
            <b>{member.nickname}</b>
            <span>{member.email}</span>
            <small>{roleLabel(member)} · 가입 {format(member.createdAt)}</small>
            <span className="inline-actions">
              <button className="secondary" disabled={member.role === 'FAN'} onClick={() => updateMemberRole(member, 'FAN')}>FAN</button>
              <button className="secondary" disabled={member.role === 'ADMIN'} onClick={() => updateMemberRole(member, 'ADMIN')}>ADMIN</button>
            </span>
          </p>)}
          {memberQuery.trim() && !searchedMembers.length && <p className="muted">검색 결과가 없습니다.</p>}
        </div>
      </article>
      <article className="panel admin-member-card">
        <span className="eyebrow">REPORTS</span>
        <h3>신고 관리</h3>
        <div className="cafe-control-row">
          <select value={reportStatus} onChange={e => setReportStatus(e.target.value)}>
            <option value="OPEN">미처리</option>
            <option value="RESOLVED">처리 완료</option>
            <option value="ALL">전체</option>
          </select>
          <button className="secondary" onClick={loadReports}>새로고침</button>
        </div>
        <div className="report-list">
          {reports.map(report => <div key={report.id} className="report-item">
            <div><b>{report.targetType === 'POST' ? '게시글' : '댓글'} #{report.targetId}</b><small>신고자 {report.reporter} · {format(report.createdAt)}</small><p>{report.reason}</p></div>
            <span className={report.status === 'OPEN' ? 'report-status open' : 'report-status'}>{report.status === 'OPEN' ? '미처리' : '완료'}</span>
            {report.status === 'OPEN' && <button className="secondary" onClick={() => resolveReport(report.id)}>처리 완료</button>}
          </div>)}
          {!reports.length && <p className="muted">신고 내역이 없습니다.</p>}
        </div>
      </article>
      <article className="panel">
        <span className="eyebrow">NOTIFICATION</span>
        <h3>알림 발송</h3>
        <div className="write">
          <input type="number" min="1" placeholder="회원 ID" value={notification.memberId} onChange={e => setNotification({ ...notification, memberId: e.target.value })} />
          <textarea placeholder="알림 내용" value={notification.content} onChange={e => setNotification({ ...notification, content: e.target.value })} />
          <button onClick={sendNotification}>알림 발송</button>
        </div>
      </article>
      <article className="panel">
        <span className="eyebrow">NOTICE</span>
        <h3>공지 등록</h3>
        <div className="write">
          <input placeholder="공지 제목" value={notice.title} onChange={e => setNotice({ ...notice, title: e.target.value })} />
          <textarea placeholder="공지 내용" value={notice.content} onChange={e => setNotice({ ...notice, content: e.target.value })} />
          <button onClick={createNotice}>공지 등록</button>
        </div>
      </article>
      <article className="panel">
        <span className="eyebrow">EVENT</span>
        <h3>이벤트 등록</h3>
        <div className="write">
          <input placeholder="이벤트 제목" value={event.title} onChange={e => setEvent({ ...event, title: e.target.value })} />
          <textarea placeholder="이벤트 내용" value={event.content} onChange={e => setEvent({ ...event, content: e.target.value })} />
          <input type="datetime-local" value={event.startAt} onChange={e => setEvent({ ...event, startAt: e.target.value })} />
          <input type="datetime-local" value={event.endAt} onChange={e => setEvent({ ...event, endAt: e.target.value })} />
          <button onClick={createEvent}>이벤트 등록</button>
        </div>
      </article>
      <article className="panel admin-member-card">
        <span className="eyebrow">NOTICE INVENTORY</span>
        <h3>공지 현황</h3>
        <div className="report-list">
          {notices.slice(0, 6).map(item => <div key={item.id} className="report-item">
            <div>
              <b>{item.title}</b>
              <small>{format(item.createdAt)}</small>
              <p>{item.content}</p>
            </div>
          </div>)}
          {!notices.length && <p className="muted">등록된 공지가 없습니다.</p>}
        </div>
      </article>
      <article className="panel admin-member-card">
        <span className="eyebrow">EVENT INVENTORY</span>
        <h3>이벤트 현황</h3>
        <div className="report-list">
          {events.slice(0, 6).map(item => <div key={item.id} className="report-item">
            <div>
              <b>{item.title}</b>
              <small>{format(item.startAt)} - {format(item.endAt)}</small>
              <p>응모 {item.applyCount}명 · {item.content}</p>
            </div>
          </div>)}
          {!events.length && <p className="muted">등록된 이벤트가 없습니다.</p>}
        </div>
      </article>
      <article className="panel">
        <span className="eyebrow">CONCERT</span>
        <h3>{editingConcertId ? '공연 수정' : '공연 등록'}</h3>
        <div className="write">
          <input placeholder="공연명" value={concert.title} onChange={e => setConcert({ ...concert, title: e.target.value })} />
          <input type="datetime-local" value={concert.concertDate} onChange={e => setConcert({ ...concert, concertDate: e.target.value })} />
          <input type="datetime-local" value={concert.bookingStartAt} onChange={e => setConcert({ ...concert, bookingStartAt: e.target.value })} />
          <input type="datetime-local" value={concert.bookingEndAt} onChange={e => setConcert({ ...concert, bookingEndAt: e.target.value })} />
          <input placeholder="장소" value={concert.venue} onChange={e => setConcert({ ...concert, venue: e.target.value })} />
          <input type="number" min="1" max="1000" value={concert.totalSeats} onChange={e => setConcert({ ...concert, totalSeats: e.target.value })} />
          <input type="number" min="0" placeholder="VIP 가격" value={concert.vipPrice} onChange={e => setConcert({ ...concert, vipPrice: e.target.value })} />
          <input type="number" min="0" placeholder="R석 가격" value={concert.rPrice} onChange={e => setConcert({ ...concert, rPrice: e.target.value })} />
          <input type="number" min="0" placeholder="S석 가격" value={concert.sPrice} onChange={e => setConcert({ ...concert, sPrice: e.target.value })} />
          <input type="number" min="0" placeholder="A석 가격" value={concert.aPrice} onChange={e => setConcert({ ...concert, aPrice: e.target.value })} />
          <textarea placeholder="공연 설명" value={concert.description} onChange={e => setConcert({ ...concert, description: e.target.value })} />
          <button onClick={saveConcert}>{editingConcertId ? '공연 수정' : '공연 등록'}</button>
          {editingConcertId && <button className="secondary" onClick={() => setEditingConcertId(null)}>수정 취소</button>}
        </div>
      </article>
      <article className="panel admin-member-card">
        <span className="eyebrow">CONCERT INVENTORY</span>
        <h3>공연 관리</h3>
        <div className="report-list">
          {concerts.map(item => <div key={item.id} className="report-item">
            <div>
              <b>{item.title}</b>
              <small>{format(item.concertDate)} · {item.venue}</small>
              <p>잔여 {concertRemaining(item)} / 전체 {item.totalSeats} · VIP {money(concertPrice(item, 'VIP'))} · R {money(concertPrice(item, 'R'))}</p>
            </div>
            <button className="secondary" onClick={() => startConcertEdit(item)}>수정</button>
            <button className="secondary" onClick={() => deleteConcert(item.id)}>삭제</button>
          </div>)}
          {!concerts.length && <p className="muted">등록된 공연이 없습니다.</p>}
        </div>
      </article>
    </div>
  </section>;
}

// 공연 목록, 예매 가능 상태, 좌석 선택, 예매 확정을 담당하는 화면입니다.
function Concerts({ concerts, currentMember, setTab, notify, refreshConcertsAndReservations }) {
  const [selectedConcert, setSelectedConcert] = useState(null);
  const [reservedSeats, setReservedSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState('');
  const [checkoutStep, setCheckoutStep] = useState('seat');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentForm, setPaymentForm] = useState({
    depositorName: '',
    cashReceipt: '',
    cardNumber: '',
    cardExpiry: '',
    cardBirth: '',
    cardPassword: '',
    kakaoPhone: '',
    agreePolicy: false,
    agreeCancel: false
  });
  const [paymentGuide, setPaymentGuide] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [completedReservation, setCompletedReservation] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const cashReceiptRefs = useRef([]);
  const seats = selectedConcert ? buildSeats(selectedConcert.totalSeats) : [];
  const selectedSeatGrade = selectedSeat ? seatGrade(selectedSeat) : '';
  const selectedSeatPrice = selectedSeat ? seatPrice(selectedConcert, selectedSeatGrade) : 0;
  const cashReceiptDigits = paymentForm.cashReceipt.replace(/\D/g, '').slice(0, 11);
  const cashReceiptParts = [cashReceiptDigits.slice(0, 3), cashReceiptDigits.slice(3, 7), cashReceiptDigits.slice(7, 11)];
  const paymentMethodNotice = {
    BANK_TRANSFER: '좌석을 먼저 확보한 뒤 안내 계좌로 입금해야 예매가 확정됩니다.',
    CARD: '카드 승인 화면을 대신해 필수 결제 정보를 확인합니다.',
    KAKAO_PAY: '카카오페이 승인 요청을 대신해 휴대폰 인증 정보를 확인합니다.'
  };
  const cardDigits = paymentForm.cardNumber.replace(/\D/g, '');
  const kakaoDigits = paymentForm.kakaoPhone.replace(/\D/g, '');
  const paymentFormValid = Boolean(selectedSeat && paymentForm.agreePolicy && paymentForm.agreeCancel
    && (paymentMethod === 'BANK_TRANSFER'
      ? paymentForm.depositorName.trim()
      : paymentMethod === 'CARD'
        ? cardDigits.length >= 14 && isValidExpiry(paymentForm.cardExpiry) && paymentForm.cardBirth.length === 6 && paymentForm.cardPassword.length === 2
        : kakaoDigits.length === 11));
  const checkoutSteps = [
    ['seat', '좌석 선택'],
    ['review', '주문 확인'],
    ['payment', '결제 정보'],
    ['complete', '완료']
  ];

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updatePaymentForm = (field, value) => {
    setPaymentForm(form => ({ ...form, [field]: value }));
  };

  const updateCashReceiptPart = (index, value) => {
    const maxLengths = [3, 4, 4];
    const nextParts = [...cashReceiptParts];
    nextParts[index] = value.replace(/\D/g, '').slice(0, maxLengths[index]);
    updatePaymentForm('cashReceipt', nextParts.join(''));
    if (nextParts[index].length === maxLengths[index]) {
      cashReceiptRefs.current[index + 1]?.focus();
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      depositorName: '',
      cashReceipt: '',
      cardNumber: '',
      cardExpiry: '',
      cardBirth: '',
      cardPassword: '',
      kakaoPhone: '',
      agreePolicy: false,
      agreeCancel: false
    });
    setPaymentGuide(null);
    setPaymentProcessing(false);
  };

  const closeCheckout = () => {
    setSelectedConcert(null);
    setSelectedSeat('');
    setCheckoutStep('seat');
    setPaymentMethod('BANK_TRANSFER');
    setCompletedReservation(null);
    resetPaymentForm();
  };

  const changePaymentMethod = (method) => {
    setPaymentMethod(method);
    resetPaymentForm();
  };

  const copyBankAccount = async () => {
    const copied = await copyText('국민 123456-78-901234 도화링크');
    notify(copied ? '입금 계좌를 복사했습니다.' : '입금 계좌: 국민 123456-78-901234 도화링크');
  };

  // 좌석 선택 패널을 열기 전에 로그인 여부를 확인하고, 이미 예매된 좌석 목록을 가져옵니다.
  const openSeatPicker = async (concert) => {
    if (!currentMember) {
      notify('로그인 후 예매할 수 있습니다.');
      setTab('auth');
      return;
    }
    setSelectedConcert(concert);
    setSelectedSeat('');
    setCheckoutStep('seat');
    setPaymentMethod('BANK_TRANSFER');
    setCompletedReservation(null);
    resetPaymentForm();
    try {
      const res = await api.get(`/concerts/${concert.id}/reserved-seats`);
      setReservedSeats(res.data);
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 선택한 좌석을 백엔드에 예매 요청하고 성공하면 공연/내 예매 데이터를 다시 동기화합니다.
  const reserve = async () => {
    if (!selectedConcert || !selectedSeat) return notify('좌석을 선택하세요.');
    if (!paymentFormValid) return notify('결제 정보를 입력하고 필수 동의 항목을 확인하세요.');
    try {
      setPaymentProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 900));
      const res = await api.post(`/concerts/${selectedConcert.id}/reservations`, { seatLabel: selectedSeat, paymentMethod }, { params: { memberId: currentMember.id } });
      setCompletedReservation(res.data);
      setCheckoutStep('complete');
      if (res.data.status === 'PAYMENT_PENDING') {
        setPaymentGuide(res.data);
        notify(`${selectedSeat} ${selectedSeatGrade}석이 10분 동안 확보되었습니다.`);
      } else {
        notify(`${selectedSeat} ${selectedSeatGrade}석 예매와 결제가 완료되었습니다.`);
      }
    } catch (error) {
      notify(errorMessage(error));
      return;
    } finally {
      setPaymentProcessing(false);
    }
    refreshConcertsAndReservations();
  };

  const nextStep = () => {
    if (checkoutStep === 'seat') {
      if (!selectedSeat) return notify('좌석을 선택하세요.');
      setCheckoutStep('review');
      return;
    }
    if (checkoutStep === 'review') {
      setCheckoutStep('payment');
    }
  };

  const selectedSummary = (
    <div className="checkout-summary">
      <div><span>공연</span><b>{selectedConcert?.title}</b></div>
      <div><span>좌석</span><b>{selectedSeat ? `${selectedSeat} ${selectedSeatGrade}석` : '좌석 선택 필요'}</b></div>
      <div><span>결제 금액</span><b>{selectedSeat ? money(selectedSeatPrice) : '-'}</b></div>
    </div>
  );

  return <section>
    <SectionTitle title="공연" />
    <div className="grid concert-grid">{concerts.map(c => {
      const status = bookingStatus(c);
      const remainingSeats = concertRemaining(c);
      const reservedCount = Math.max(0, Number(c.totalSeats || 0) - remainingSeats);
      const reservable = status.available && remainingSeats > 0;
      const countdown = bookingCountdownLabel(c, nowTick);
      return <article className="panel card concert-card" key={c.id}>
      <div className="concert-top"><span className="tag">{reservable ? '예매 가능' : status.label}</span>{countdown && <span className="countdown-pill">{countdown}</span>}</div>
      <div className="concert-body"><h3>{c.title}</h3><p>{c.description}</p></div>
      <div className="concert-meta">
        <p><b>장소</b><span>{c.venue}</span></p>
        <p><b>일시</b><span>{format(c.concertDate)}</span></p>
        <p><b>예매 기간</b><span>{format(c.bookingStartAt)} - {format(c.bookingEndAt)}</span></p>
        <p><b>좌석</b><span>남은 {remainingSeats}석 / 전체 {c.totalSeats}석</span></p>
        <p><b>예매됨</b><span>{reservedCount}석</span></p>
      </div>
      <div className="price-row">
        <span><b>VIP</b><small>{money(concertPrice(c, 'VIP'))}</small></span>
        <span><b>R</b><small>{money(concertPrice(c, 'R'))}</small></span>
        <span><b>S</b><small>{money(concertPrice(c, 'S'))}</small></span>
        <span><b>A</b><small>{money(concertPrice(c, 'A'))}</small></span>
      </div>
      <button disabled={!reservable} onClick={() => openSeatPicker(c)}>{reservable ? '좌석 선택' : status.label}</button>
    </article>;
    })}</div>
    {selectedConcert && <div className="panel seat-panel">
      <div className="seat-header"><div><span className="eyebrow">CHECKOUT</span><h3>{selectedConcert.title}</h3><p className="muted">남은 좌석 {concertRemaining(selectedConcert)}석 / 전체 {selectedConcert.totalSeats}석 · 선택 좌석: {selectedSeat ? `${selectedSeat} ${selectedSeatGrade}석 ${money(selectedSeatPrice)}` : '없음'}</p></div><button className="secondary" onClick={closeCheckout}>닫기</button></div>
      <div className="checkout-steps">{checkoutSteps.map(([key, label], index) => {
        const activeIndex = checkoutSteps.findIndex(([stepKey]) => stepKey === checkoutStep);
        return <span key={key} className={index <= activeIndex ? 'active' : ''}>{label}</span>;
      })}</div>
      {checkoutStep === 'seat' && <>
        <div className="screen">STAGE</div>
        <div className="seat-map">{seats.map(seat => {
          const reserved = reservedSeats.includes(seat);
          const grade = seatGrade(seat);
          return <button key={seat} disabled={reserved} title={`${grade}석 ${money(seatPrice(selectedConcert, grade))}`} className={selectedSeat === seat ? 'seat selected' : reserved ? 'seat reserved' : `seat grade-${grade.toLowerCase()}`} onClick={() => { setSelectedSeat(seat); setPaymentGuide(null); }}>{seat}<small>{grade}</small></button>;
        })}</div>
        <div className="seat-legend"><span><i className="legend available" />선택 가능</span><span><i className="legend selected" />선택됨</span><span><i className="legend reserved" />예매 완료</span></div>
        {selectedSummary}
        <div className="actions"><button disabled={!selectedSeat} onClick={nextStep}>주문 확인으로 이동</button></div>
      </>}
      {checkoutStep === 'review' && <>
        {selectedSummary}
        <div className="checkout-policy">
          <b>예매 전 확인</b>
          <p>선택한 좌석은 결제 완료 또는 입금 대기 등록 시점에 확정됩니다. 무통장 입금은 안내된 기한 안에 입금 확인을 완료해야 합니다.</p>
          <p>결제 완료 후 취소는 마이페이지에서 환불 접수 흐름으로 진행됩니다.</p>
        </div>
        <div className="actions"><button className="secondary" onClick={() => setCheckoutStep('seat')}>좌석 다시 선택</button><button onClick={nextStep}>결제 정보 입력</button></div>
      </>}
      {checkoutStep === 'payment' && <>
        {selectedSummary}
        <div className="payment-methods">
          <button className={paymentMethod === 'BANK_TRANSFER' ? 'active' : ''} onClick={() => changePaymentMethod('BANK_TRANSFER')}>무통장 입금</button>
          <button className={paymentMethod === 'CARD' ? 'active' : ''} onClick={() => changePaymentMethod('CARD')}>카드 결제</button>
          <button className={paymentMethod === 'KAKAO_PAY' ? 'active' : ''} onClick={() => changePaymentMethod('KAKAO_PAY')}>카카오페이</button>
        </div>
        <div className="payment-form">
          <p className="muted">{paymentMethodNotice[paymentMethod]}</p>
          {paymentMethod === 'BANK_TRANSFER' && <>
            <label>입금자명<input placeholder="예: 홍길동" value={paymentForm.depositorName} onChange={e => updatePaymentForm('depositorName', e.target.value)} /></label>
            <div className="payment-form-field">
              <span>현금영수증 휴대폰 번호</span>
              <div className="cash-receipt-row">
                <input ref={el => { cashReceiptRefs.current[0] = el; }} inputMode="numeric" maxLength={3} placeholder="010" value={cashReceiptParts[0]} onChange={e => updateCashReceiptPart(0, e.target.value)} />
                <input ref={el => { cashReceiptRefs.current[1] = el; }} inputMode="numeric" maxLength={4} placeholder="0000" value={cashReceiptParts[1]} onChange={e => updateCashReceiptPart(1, e.target.value)} />
                <input ref={el => { cashReceiptRefs.current[2] = el; }} inputMode="numeric" maxLength={4} placeholder="0000" value={cashReceiptParts[2]} onChange={e => updateCashReceiptPart(2, e.target.value)} />
              </div>
            </div>
          </>}
          {paymentMethod === 'CARD' && <div className="payment-grid">
            <label>카드번호<input inputMode="numeric" placeholder="1234 5678 9012 3456" value={formatCardNumber(paymentForm.cardNumber)} onChange={e => updatePaymentForm('cardNumber', digitsOnly(e.target.value).slice(0, 16))} /></label>
            <label>유효기간<input inputMode="numeric" placeholder="MM/YY" value={paymentForm.cardExpiry} onChange={e => updatePaymentForm('cardExpiry', formatExpiryInput(e.target.value))} /></label>
            <label>생년월일<input inputMode="numeric" maxLength={6} placeholder="YYMMDD" value={paymentForm.cardBirth} onChange={e => updatePaymentForm('cardBirth', digitsOnly(e.target.value).slice(0, 6))} /></label>
            <label>비밀번호 앞 2자리<input inputMode="numeric" maxLength={2} placeholder="**" value={paymentForm.cardPassword} onChange={e => updatePaymentForm('cardPassword', digitsOnly(e.target.value).slice(0, 2))} /></label>
          </div>}
          {paymentMethod === 'KAKAO_PAY' && <label>카카오페이 휴대폰 번호<input inputMode="tel" placeholder="010-0000-0000" value={formatPhoneNumber(paymentForm.kakaoPhone)} onChange={e => updatePaymentForm('kakaoPhone', digitsOnly(e.target.value).slice(0, 11))} /></label>}
          <label className="check-line"><input type="checkbox" checked={paymentForm.agreePolicy} onChange={e => updatePaymentForm('agreePolicy', e.target.checked)} /> 예매자 정보와 결제 금액을 확인했습니다.</label>
          <label className="check-line"><input type="checkbox" checked={paymentForm.agreeCancel} onChange={e => updatePaymentForm('agreeCancel', e.target.checked)} /> 취소 및 환불 정책에 동의합니다.</label>
        </div>
        <div className="actions"><button className="secondary" onClick={() => setCheckoutStep('review')}>이전</button><button disabled={!paymentFormValid || paymentProcessing} onClick={reserve}>{paymentProcessing ? '결제 승인 확인 중' : `결제 진행 ${money(selectedSeatPrice)}`}</button></div>
      </>}
      {checkoutStep === 'complete' && completedReservation && <div className="payment-complete">
        <span className="eyebrow">RESERVATION COMPLETE</span>
        <h3>{completedReservation.status === 'PAYMENT_PENDING' ? '좌석이 확보되었습니다.' : '예매가 완료되었습니다.'}</h3>
        <p className="muted">예매번호 {completedReservation.ticketCode || '-'} · {selectedConcert.title} · {selectedSeat} {selectedSeatGrade}석</p>
        {completedReservation.status === 'PAYMENT_PENDING' && <div className="payment-guide">
          <b>입금 안내</b>
          <p>입금 계좌: 국민 123456-78-901234 도화링크 <button className="inline-copy" onClick={copyBankAccount}>복사</button></p>
          <p>입금 금액: {money(completedReservation.price)} · 남은 시간: {formatDuration(new Date(completedReservation.paymentExpiresAt).getTime() - nowTick)}</p>
          <p className="muted">기한 안에 마이페이지 예매 내역에서 입금 확인을 완료하지 않으면 자동 취소됩니다.</p>
        </div>}
        <div className="actions"><button onClick={closeCheckout}>공연 목록으로 돌아가기</button></div>
      </div>}
    </div>}
  </section>;
}

// 전체 좌석 수를 A1, A2 ... B1 형태의 좌석 라벨 배열로 변환합니다.
function buildSeats(totalSeats) {
  const seatsPerRow = 10;
  const rowName = (index) => {
    let name = '';
    let value = index;
    do {
      name = String.fromCharCode(65 + (value % 26)) + name;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return name;
  };

  return Array.from({ length: totalSeats }, (_, index) => {
    const row = Math.floor(index / seatsPerRow);
    const seatNumber = index % seatsPerRow + 1;
    return `${rowName(row)}${seatNumber}`;
  });
}

// 좌석 행에 따라 등급을 계산합니다. 백엔드 ReservationService의 등급 규칙과 맞춰야 합니다.
function seatGrade(seatLabel) {
  if (seatLabel.startsWith('A')) return 'VIP';
  if (seatLabel.startsWith('B') || seatLabel.startsWith('C')) return 'R';
  if (seatLabel.startsWith('D') || seatLabel.startsWith('E') || seatLabel.startsWith('F')) return 'S';
  return 'A';
}

// 공연에 저장된 등급별 가격 중 현재 좌석 등급에 해당하는 값을 꺼냅니다.
function seatPrice(concert, grade) {
  return concertPrice(concert, grade);
}

function concertPrice(concert, grade) {
  if (!concert) return 0;
  if (grade === 'VIP') return Number(concert.vipPrice ?? concert.vipprice ?? 0);
  if (grade === 'R') return Number(concert.rPrice ?? concert.rprice ?? 0);
  if (grade === 'S') return Number(concert.sPrice ?? concert.sprice ?? 0);
  return Number(concert.aPrice ?? concert.aprice ?? 0);
}

function concertRemaining(concert) {
  const total = Number(concert?.totalSeats || 0);
  const remaining = Number(concert?.remainingSeats ?? total);
  if (!total) return Math.max(0, remaining);
  return Math.max(0, Math.min(total, remaining));
}

// 현재 시간과 예매 시작/마감 시간을 비교해 버튼 활성화와 상태 라벨을 결정합니다.
function bookingStatus(concert) {
  const now = Date.now();
  const start = concert.bookingStartAt ? new Date(concert.bookingStartAt).getTime() : 0;
  const end = concert.bookingEndAt ? new Date(concert.bookingEndAt).getTime() : new Date(concert.concertDate).getTime();
  if (start && now < start) return { available: false, label: '예매 예정' };
  if (end && now > end) return { available: false, label: '예매 마감' };
  if (concertRemaining(concert) <= 0) return { available: false, label: '매진' };
  return { available: true, label: '예매 가능' };
}

// 예매 내역 전용 페이지가 필요할 때 재사용할 수 있는 얇은 래퍼입니다.
function Reservations({ reservations, onPay, onCancel }) {
  return <section><SectionTitle title="마이페이지" /><div className="panel"><ReservationTable reservations={reservations} onPay={onPay} onCancel={onCancel} /></div></section>;
}

// 마이페이지 예매 내역 표입니다. 예매번호, 좌석 등급, 금액까지 티켓 정보처럼 보여줍니다.
function ReservationTable({ reservations, onPay, onCancel, isBusy = () => false }) {
  const [paymentConfirm, setPaymentConfirm] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ depositorName: '', bankLast4: '', agreed: false });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState({ reason: '일정 변경', detail: '', agreed: false });
  const [ticketTarget, setTicketTarget] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!reservations.length) return <div className="login-required">아직 예매 내역이 없습니다.</div>;
  const openPaymentConfirm = (reservation) => {
    setPaymentConfirm(reservation);
    setConfirmForm({ depositorName: '', bankLast4: '', agreed: false });
  };
  const openCancelModal = (reservation) => {
    setCancelTarget(reservation);
    setCancelForm({ reason: '일정 변경', detail: '', agreed: false });
  };
  const submitPaymentConfirm = async () => {
    if (!confirmForm.depositorName.trim() || confirmForm.bankLast4.trim().length < 4 || !confirmForm.agreed) return;
    await onPay(paymentConfirm.id);
    setPaymentConfirm(null);
  };
  const submitCancel = async () => {
    if (!cancelTarget || !cancelForm.reason || !cancelForm.agreed) return;
    await onCancel(cancelTarget.id);
    setCancelTarget(null);
  };
  const renderActions = (r) => {
    const busy = isBusy(r.id);
    return <div className="row-actions">
      {r.status === 'PAYMENT_PENDING' && <button disabled={busy} onClick={() => openPaymentConfirm(r)}>{busy ? '처리 중' : '입금 확인'}</button>}
      {r.status === 'RESERVED' && <button className="secondary" onClick={() => setTicketTarget(r)}>티켓 보기</button>}
      {r.status !== 'CANCELED' && <button className="secondary" disabled={busy} onClick={() => openCancelModal(r)}>{r.status === 'RESERVED' ? '환불 접수' : '취소'}</button>}
    </div>;
  };
  return <>
    <table className="reservation-table"><thead><tr><th>예매번호</th><th>공연</th><th>좌석</th><th>금액</th><th>결제</th><th>상태</th><th>예매일</th><th></th></tr></thead><tbody>{reservations.map(r => (
      <tr key={r.id}><td>{r.ticketCode || '-'}</td><td>{r.concert?.title}</td><td>{reservationSeatLabel(r)}</td><td>{money(r.price)}</td><td>{paymentMethodLabel(r.paymentMethod)}{r.paymentExpiresAt && <small> ~ {format(r.paymentExpiresAt)}</small>}</td><td>{reservationStatusLabel(r.status)}</td><td>{format(r.reservedAt)}</td><td>{renderActions(r)}</td></tr>
    ))}</tbody></table>
    <div className="reservation-card-list">{reservations.map(r => <article className="reservation-card" key={r.id}>
      <div className="reservation-card-head"><span className={r.status === 'RESERVED' ? 'status-pill paid' : r.status === 'PAYMENT_PENDING' ? 'status-pill pending' : 'status-pill'}>{reservationStatusLabel(r.status)}</span><b>{r.ticketCode || '-'}</b></div>
      <h4>{r.concert?.title}</h4>
      <div className="reservation-card-grid">
        <p><span>좌석</span><b>{reservationSeatLabel(r)}</b></p>
        <p><span>금액</span><b>{money(r.price)}</b></p>
        <p><span>결제</span><b>{paymentMethodLabel(r.paymentMethod)}</b></p>
        <p><span>예매일</span><b>{format(r.reservedAt)}</b></p>
      </div>
      {r.status === 'PAYMENT_PENDING' && r.paymentExpiresAt && <p className="reservation-deadline">입금 남은 시간 {formatDuration(new Date(r.paymentExpiresAt).getTime() - nowTick)}</p>}
      {renderActions(r)}
    </article>)}</div>
    {paymentConfirm && <div className="modal-backdrop">
      <div className="modal-card payment-confirm-modal">
        <span className="eyebrow">PAYMENT CHECK</span>
        <h3>입금 확인</h3>
        <p>{paymentConfirm.concert?.title} · {paymentConfirm.seatLabel} {paymentConfirm.seatGrade}석</p>
        <div className="checkout-summary compact">
          <div><span>예매번호</span><b>{paymentConfirm.ticketCode || '-'}</b></div>
          <div><span>입금 금액</span><b>{money(paymentConfirm.price)}</b></div>
          <div><span>입금 기한</span><b>{format(paymentConfirm.paymentExpiresAt)}</b></div>
        </div>
        <label>입금자명<input placeholder="예매 시 입력한 입금자명" value={confirmForm.depositorName} onChange={e => setConfirmForm(form => ({ ...form, depositorName: e.target.value }))} /></label>
        <label>입금 계좌 끝 4자리<input inputMode="numeric" maxLength={4} placeholder="1234" value={confirmForm.bankLast4} onChange={e => setConfirmForm(form => ({ ...form, bankLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} /></label>
        <label className="check-line"><input type="checkbox" checked={confirmForm.agreed} onChange={e => setConfirmForm(form => ({ ...form, agreed: e.target.checked }))} /> 실제 입금 후 확인 버튼을 누릅니다.</label>
        <div className="modal-actions">
          <button disabled={!confirmForm.depositorName.trim() || confirmForm.bankLast4.length < 4 || !confirmForm.agreed || isBusy(paymentConfirm.id)} onClick={submitPaymentConfirm}>{isBusy(paymentConfirm.id) ? '처리 중' : '입금 확인 요청'}</button>
          <button className="secondary" onClick={() => setPaymentConfirm(null)}>닫기</button>
        </div>
      </div>
    </div>}
    {cancelTarget && <div className="modal-backdrop">
      <div className="modal-card payment-confirm-modal">
        <span className="eyebrow">CANCEL REQUEST</span>
        <h3>{cancelTarget.status === 'RESERVED' ? '환불 접수' : '예매 취소'}</h3>
        <p>{cancelTarget.concert?.title} · {reservationSeatLabel(cancelTarget)}</p>
        <div className="checkout-summary compact">
          <div><span>예매번호</span><b>{cancelTarget.ticketCode || '-'}</b></div>
          <div><span>취소 금액</span><b>{money(cancelTarget.price)}</b></div>
          <div><span>처리 방식</span><b>{cancelTarget.status === 'RESERVED' ? '환불 접수 후 취소' : '즉시 취소'}</b></div>
        </div>
        <label>취소 사유<select value={cancelForm.reason} onChange={e => setCancelForm(form => ({ ...form, reason: e.target.value }))}><option>일정 변경</option><option>좌석 변경</option><option>결제수단 변경</option><option>기타</option></select></label>
        <label>상세 사유<textarea placeholder="선택 입력" value={cancelForm.detail} onChange={e => setCancelForm(form => ({ ...form, detail: e.target.value }))} /></label>
        <label className="check-line"><input type="checkbox" checked={cancelForm.agreed} onChange={e => setCancelForm(form => ({ ...form, agreed: e.target.checked }))} /> 취소 후 같은 좌석을 다시 확보하지 못할 수 있음을 확인했습니다.</label>
        <div className="modal-actions">
          <button disabled={!cancelForm.reason || !cancelForm.agreed || isBusy(cancelTarget.id)} onClick={submitCancel}>{isBusy(cancelTarget.id) ? '처리 중' : cancelTarget.status === 'RESERVED' ? '환불 접수' : '예매 취소'}</button>
          <button className="secondary" onClick={() => setCancelTarget(null)}>닫기</button>
        </div>
      </div>
    </div>}
    {ticketTarget && <div className="modal-backdrop">
      <div className="modal-card ticket-modal">
        <span className="eyebrow">MOBILE TICKET</span>
        <h3>{ticketTarget.concert?.title}</h3>
        <div className="ticket-qr" aria-label="예매 QR 코드">{reservationQrPattern(ticketTarget).map((on, index) => <i key={index} className={on ? 'on' : ''} />)}</div>
        <div className="checkout-summary compact">
          <div><span>예매번호</span><b>{ticketTarget.ticketCode || '-'}</b></div>
          <div><span>좌석</span><b>{reservationSeatLabel(ticketTarget)}</b></div>
          <div><span>공연 일시</span><b>{format(ticketTarget.concert?.concertDate)}</b></div>
        </div>
        <p className="muted">입장 시 이 화면과 본인 확인 정보를 함께 제시하세요.</p>
        <button onClick={() => setTicketTarget(null)}>닫기</button>
      </div>
    </div>}
  </>;
}

// 실시간에 가까운 채팅방입니다. 2초마다 메시지를 새로 불러오는 간단한 폴링 구조입니다.
function ChatRoom({ currentMember, setTab, notify }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [chatError, setChatError] = useState('');
  const isDohwa = isDohwaMember(currentMember);

  // 서버에는 최신 80개 메시지를 요청하고, 화면에서는 작성자에 따라 좌/우 정렬합니다.
  const loadMessages = useCallback(async (silent = false) => {
    try {
      const res = await api.get('/chat/messages');
      setMessages(res.data);
      setChatError('');
    } catch (error) {
      setChatError(errorMessage(error));
      if (!silent) notify(errorMessage(error));
    }
  }, [notify]);

  // WebSocket 대신 setInterval 폴링으로 주기적으로 새 메시지를 가져옵니다.
  useEffect(() => {
    if (!currentMember) return;
    loadMessages();
    const timer = setInterval(() => loadMessages(true), 2000);
    return () => clearInterval(timer);
  }, [currentMember?.id, loadMessages]);

  if (!currentMember) return <LoginRequired setTab={setTab} message="채팅방은 로그인 후 이용할 수 있습니다." />;

  const send = async () => {
    if (!content.trim()) return;
    try {
      await api.post('/chat/messages', { content }, { params: { memberId: currentMember.id } });
      setContent('');
      await loadMessages();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 본인 메시지 또는 관리자 계정은 메시지를 삭제할 수 있습니다.
  const deleteMessage = async (messageId) => {
    if (!window.confirm('채팅을 삭제할까요?')) return;
    try {
      await api.delete(`/chat/messages/${messageId}`, { params: { memberId: currentMember.id } });
      notify('채팅이 삭제되었습니다.');
      await loadMessages();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  return <section>
    <SectionTitle title="채팅방" />
    <div className="panel chat-panel">
      <div className="chat-notice"><b>{isDohwa ? 'DOHWA MODE' : 'PEACH MODE'}</b></div>
      {chatError && <div className="inline-error">채팅 서버 연결이 불안정합니다. 자동으로 다시 시도합니다.</div>}
      <div className="chat-list">
        {messages.map(message => {
          const fromDohwa = message.artistMessage;
          const fromAdmin = message.senderRole === 'ADMIN';
          const mine = message.senderId === currentMember.id;
          const side = fromDohwa || fromAdmin ? 'left' : 'right';
          const canDelete = mine || currentMember.role === 'ADMIN';
          return <div key={message.id} className={`chat-row ${side}`}>
            <div className={fromDohwa || fromAdmin ? 'chat-bubble artist' : mine ? 'chat-bubble mine' : 'chat-bubble fan'}>
              <span>{message.senderNickname}</span>
              <p>{message.content}</p>
              <div className="chat-meta">
                <small>{format(message.createdAt)}</small>
                {canDelete && <button className="chat-delete" onClick={() => deleteMessage(message.id)}>삭제</button>}
              </div>
            </div>
          </div>;
        })}
      </div>
      <div className="chat-input">
        <input placeholder={isDohwa ? '피치에게 보낼 메시지' : '채팅 메시지'} value={content} onChange={e => setContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
        <button onClick={send}>전송</button>
      </div>
    </div>
  </section>;
}

// 팬 게시판입니다. 목록, 검색/필터/정렬, 글 작성, 상세, 댓글, 프로필 보기를 한 컴포넌트에서 처리합니다.
function Cafe({ posts, selectedPost, openPost, refreshPosts, notify, currentMember, resetKey, detailTarget }) {
  const [board, setBoard] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ boardType: 'Review', prefix: 'Concert', title: '', content: '', imageUrl: '' });
  const [editForm, setEditForm] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('posts');
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const boards = ['All', 'Notice', 'Review', 'Question', 'Fan Art', 'Archive', 'Trade', 'Event'];
  const memberId = currentMember?.id;
  const draftKey = memberId ? `dohwa.postDraft.${memberId}` : '';
  const postLimits = { title: 80, content: 4000, comment: 500, report: 300 };
  const validatePostForm = (target) => {
    const title = target.title.trim();
    const content = target.content.trim();
    if (!title || !content) return '제목과 내용을 입력하세요.';
    if (title.length > postLimits.title) return `제목은 ${postLimits.title}자 이하로 입력하세요.`;
    if (content.length > postLimits.content) return `내용은 ${postLimits.content}자 이하로 입력하세요.`;
    return '';
  };
  const validateCommentText = (text, label = '댓글') => {
    const value = text.trim();
    if (!value) return `${label} 내용을 입력하세요.`;
    if (value.length > postLimits.comment) return `${label}은 ${postLimits.comment}자 이하로 입력하세요.`;
    return '';
  };
  // 게시판/말머리/검색어를 한 번에 적용합니다. 고정글은 어떤 필터에서도 상단에 남깁니다.
  const filtered = posts.filter(p => {
    const searchable = [
      p.title,
      p.author,
      boardLabels[p.boardType],
      p.boardType,
      prefixLabels[p.prefix],
      p.prefix
    ].filter(Boolean).join(' ').toLowerCase();
    return (board === 'All' || p.boardType === board || p.pinned) &&
      (prefixFilter === 'All' || p.prefix === prefixFilter || p.pinned) &&
      searchable.includes(query.toLowerCase());
  });
  // 고정글을 항상 먼저 보여준 뒤 선택한 정렬 기준을 적용합니다.
  const sortedPosts = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sortBy === 'views') return b.viewCount - a.viewCount;
    if (sortBy === 'likes') return b.likeCount - a.likeCount;
    if (sortBy === 'comments') return b.commentCount - a.commentCount;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPosts = sortedPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const canEditPost = Boolean(currentMember && selectedPost && selectedPost.post.authorId === currentMember.id);
  const canDeletePost = Boolean(currentMember && selectedPost && (selectedPost.post.authorId === currentMember.id || currentMember.role === 'ADMIN'));

  // 필터 조건이 바뀌면 이전 페이지 번호가 맞지 않을 수 있으므로 첫 페이지로 되돌립니다.
  useEffect(() => {
    setPage(1);
  }, [board, prefixFilter, query, pageSize, sortBy]);

  const resetCommentForms = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
    setReplyingCommentId(null);
    setReplyText('');
  };

  // 카페 탭을 다시 눌렀을 때 목록/검색/작성/상세 상태를 초기 상태로 되돌립니다.
  const resetBoardHome = () => {
    setBoard('All');
    setPrefixFilter('All');
    setSortBy('latest');
    setSearchInput('');
    setQuery('');
    setPage(1);
    setEditForm(null);
    setProfile(null);
    setProfileTab('posts');
    resetCommentForms();
    setViewMode('list');
  };

  // 왼쪽 게시판 메뉴를 바꾸면 말머리와 상세 상태도 함께 초기화합니다.
  const selectBoard = (nextBoard) => {
    setBoard(nextBoard);
    setPrefixFilter('All');
    setPage(1);
    setEditForm(null);
    setProfile(null);
    setProfileTab('posts');
    resetCommentForms();
    setViewMode('list');
  };

  useEffect(() => {
    resetBoardHome();
  }, [resetKey]);

  // 홈/프로필 등 외부에서 특정 게시글을 열라고 요청하면 상세 보기 모드로 전환합니다.
  useEffect(() => {
    if (!detailTarget) return;
    setEditForm(null);
    setProfile(null);
    resetCommentForms();
    setViewMode('detail');
  }, [detailTarget]);

  // 작성 중이던 글은 회원별 localStorage 초안으로 복원합니다.
  useEffect(() => {
    if (!draftKey) return;
    const rawDraft = localStorage.getItem(draftKey);
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft);
      setForm(current => ({ ...current, ...draft }));
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  // 제목이나 내용이 있으면 초안을 저장하고, 모두 비면 초안을 삭제합니다.
  useEffect(() => {
    if (!draftKey) return;
    const hasDraft = form.title.trim() || form.content.trim();
    if (hasDraft) {
      localStorage.setItem(draftKey, JSON.stringify(form));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, form]);

  // 로그인 필수 액션에서 같은 검사를 반복하지 않도록 공통 함수로 분리했습니다.
  const requireLogin = (message) => {
    if (currentMember) return false;
    notify(message);
    return true;
  };

  // 입력창의 임시 검색어를 실제 필터 query로 확정합니다.
  const searchPosts = () => {
    setQuery(searchInput.trim());
    setPage(1);
    setViewMode('list');
  };

  // 닉네임을 누르면 해당 회원의 작성글/댓글/좋아요 글을 별도 프로필 패널로 보여줍니다.
  const openProfile = async (targetMemberId) => {
    if (!targetMemberId) return;
    setProfileLoading(true);
    setProfile(null);
    setProfileTab('posts');
    setEditForm(null);
    resetCommentForms();
    setViewMode('profile');
    try {
      const res = await api.get(`/members/${targetMemberId}/profile`);
      setProfile(res.data);
    } catch (error) {
      notify(errorMessage(error));
      setViewMode('list');
    } finally {
      setProfileLoading(false);
    }
  };

  // 작성자 이름 버튼은 상세 행 클릭과 충돌하지 않도록 이벤트 전파를 막습니다.
  const authorButton = (memberId, nickname) => (
    <button className="link-button" onClick={(event) => { event.stopPropagation(); openProfile(memberId); }}>{nickname}</button>
  );

  // 게시글 등록 성공 시 저장된 초안을 삭제하고 목록을 다시 불러옵니다.
  const write = async () => {
    if (requireLogin('로그인 후 게시글을 작성할 수 있습니다.')) return;
    const validationMessage = validatePostForm(form);
    if (validationMessage) return notify(validationMessage);
    try {
      await api.post('/fan-posts', { ...form, title: form.title.trim(), content: form.content.trim() }, { params: { memberId } });
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      setForm({ ...form, title: '', content: '', imageUrl: '' });
      setViewMode('list');
      notify('게시글이 등록되었습니다.');
    } catch (error) {
      notify(errorMessage(error));
      return;
    }
    refreshPosts();
  };

  // 상세 글의 현재 값을 수정 폼에 복사해 편집 모드로 진입합니다.
  const startEdit = () => {
    if (!selectedPost) return;
    setEditForm({ boardType: selectedPost.post.boardType, prefix: selectedPost.post.prefix, title: selectedPost.post.title, content: selectedPost.content, imageUrl: selectedPost.post.imageUrl || selectedPost.imageUrl || '' });
  };

  // 글 작성/수정 이미지도 base64 문자열로 저장하므로 업로드 전에 압축합니다.
  const changePostImage = async (event, mode = 'write') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await resizeImageFile(file, 900, 0.78);
      if (mode === 'edit') {
        setEditForm(current => ({ ...current, imageUrl }));
      } else {
        setForm(current => ({ ...current, imageUrl }));
      }
    } catch {
      notify('게시글 이미지를 처리하지 못했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  // 수정 후 조회수는 올리지 않고 상세 데이터를 다시 가져와 화면을 최신화합니다.
  const updatePost = async () => {
    if (!selectedPost || !editForm) return;
    const validationMessage = validatePostForm(editForm);
    if (validationMessage) return notify(validationMessage);
    try {
      await api.put('/fan-posts/' + selectedPost.post.id, { ...editForm, title: editForm.title.trim(), content: editForm.content.trim() }, { params: { memberId } });
      notify('게시글이 수정되었습니다.');
      setEditForm(null);
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 글 삭제 후에는 상세 화면을 닫고 목록으로 돌아갑니다.
  const deletePost = async () => {
    if (!selectedPost || !confirm('게시글을 삭제할까요?')) return;
    try {
      await api.delete('/fan-posts/' + selectedPost.post.id, { params: { memberId } });
      notify('게시글이 삭제되었습니다.');
      setEditForm(null);
      setViewMode('list');
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 좋아요 토글 후 상세와 목록을 모두 갱신해야 숫자가 양쪽에서 맞습니다.
  const togglePostLike = async () => {
    if (requireLogin('로그인 후 좋아요를 누를 수 있습니다.')) return;
    if (!selectedPost) return;
    try {
      await api.post('/fan-posts/' + selectedPost.post.id + '/like', null, { params: { memberId } });
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 댓글 작성 후 상세 글과 목록의 댓글 수를 함께 갱신합니다.
  const comment = async () => {
    if (requireLogin('로그인 후 댓글을 작성할 수 있습니다.')) return;
    if (!selectedPost) return;
    const validationMessage = validateCommentText(commentText);
    if (validationMessage) return notify(validationMessage);
    try {
      await api.post('/fan-posts/' + selectedPost.post.id + '/comments', { content: commentText.trim() }, { params: { memberId } });
      setCommentText('');
      resetCommentForms();
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 답글은 댓글 작성 API에 parentId를 추가해 같은 엔드포인트로 보냅니다.
  const reply = async (parentId) => {
    if (requireLogin('로그인 후 답글을 작성할 수 있습니다.')) return;
    if (!selectedPost) return;
    const validationMessage = validateCommentText(replyText, '답글');
    if (validationMessage) return notify(validationMessage);
    try {
      await api.post('/fan-posts/' + selectedPost.post.id + '/comments', { content: replyText.trim(), parentId }, { params: { memberId } });
      setReplyText('');
      setReplyingCommentId(null);
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 댓글 수정 후 열려 있던 댓글/답글 입력 상태를 초기화합니다.
  const updateComment = async (commentId) => {
    if (!selectedPost) return;
    const validationMessage = validateCommentText(editingCommentText);
    if (validationMessage) return notify(validationMessage);
    try {
      await api.put('/comments/' + commentId, { content: editingCommentText.trim() }, { params: { memberId } });
      notify('댓글이 수정되었습니다.');
      resetCommentForms();
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 댓글 삭제도 상세와 목록을 모두 갱신해 댓글 수를 맞춥니다.
  const deleteComment = async (commentId) => {
    if (!selectedPost || !confirm('댓글을 삭제할까요?')) return;
    try {
      await api.delete('/comments/' + commentId, { params: { memberId } });
      notify('댓글이 삭제되었습니다.');
      resetCommentForms();
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 댓글 좋아요는 글 좋아요와 별도 API를 사용합니다.
  const toggleCommentLike = async (commentId) => {
    if (requireLogin('로그인 후 댓글 좋아요를 누를 수 있습니다.')) return;
    if (!selectedPost) return;
    try {
      await api.post('/comments/' + commentId + '/like', null, { params: { memberId } });
      await openPost(selectedPost.post.id, false);
      await refreshPosts();
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  // 게시글/댓글 신고는 targetType과 targetId만 바꿔 같은 신고 API로 접수합니다.
  const reportTarget = async (targetType, targetId) => {
    if (requireLogin('로그인 후 신고할 수 있습니다.')) return;
    const reason = window.prompt('신고 사유를 입력하세요.');
    if (!reason?.trim()) return;
    if (reason.trim().length > postLimits.report) {
      notify(`신고 사유는 ${postLimits.report}자 이하로 입력하세요.`);
      return;
    }
    try {
      await api.post('/reports', { targetType, targetId, reason: reason.trim() }, { params: { memberId } });
      notify('신고가 접수되었습니다.');
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const renderHeart = (liked) => liked ? '♥' : '♡';

  // 댓글은 대댓글을 재귀적으로 렌더링하므로 replies가 있으면 renderComment를 다시 호출합니다.
  const renderComment = (commentItem, depth = 0) => {
    const canEditComment = currentMember?.id === commentItem.authorId;
    const canDeleteComment = currentMember?.id === commentItem.authorId || currentMember?.role === 'ADMIN';
    const editing = editingCommentId === commentItem.id;
    const replying = replyingCommentId === commentItem.id;
    return <div className={depth ? 'comment-card reply-card' : 'comment-card'} key={commentItem.id}>
      <div className="comment-head">
        <div><b>{authorButton(commentItem.authorId, commentItem.authorNickname)}</b> <small>{format(commentItem.createdAt)}</small></div>
        <div className="row-actions">
          <button className={commentItem.liked ? 'heart-button liked' : 'heart-button'} onClick={() => toggleCommentLike(commentItem.id)}>{renderHeart(commentItem.liked)} {commentItem.likeCount}</button>
          <button className="secondary" onClick={() => { setReplyingCommentId(replying ? null : commentItem.id); setReplyText(''); }}>답글</button>
          {canEditComment && <button className="secondary" onClick={() => { setEditingCommentId(commentItem.id); setEditingCommentText(commentItem.content); setReplyingCommentId(null); }}>수정</button>}
          {canDeleteComment && <button className="secondary" onClick={() => deleteComment(commentItem.id)}>삭제</button>}
          <button className="secondary" onClick={() => reportTarget('COMMENT', commentItem.id)}>신고</button>
        </div>
      </div>
      {editing ? <div className="write compact-write"><textarea value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)} /><div className="toolbar"><button onClick={() => updateComment(commentItem.id)}>저장</button><button className="secondary" onClick={resetCommentForms}>취소</button></div></div> : <p>{commentItem.content}</p>}
      {replying && <div className="write compact-write"><input placeholder="답글 작성" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') reply(commentItem.id); }} /><div className="toolbar"><button onClick={() => reply(commentItem.id)}>등록</button><button className="secondary" onClick={() => setReplyingCommentId(null)}>취소</button></div></div>}
      {commentItem.replies?.length > 0 && <div className="reply-list">{commentItem.replies.map(replyItem => renderComment(replyItem, depth + 1))}</div>}
    </div>;
  };

  // 프로필 활동 목록에서 게시글을 누르면 일반 게시글 상세 화면으로 전환합니다.
  const openProfilePost = async (postId) => {
    await openPost(postId);
    setViewMode('detail');
  };

  const postLink = (post) => (
    <button className="link-button" onClick={() => openProfilePost(post.id)}>[{prefixLabels[post.prefix] || post.prefix}] {post.title}</button>
  );

  // 회원 프로필 패널은 작성글/댓글/좋아요 글을 내부 탭으로 전환합니다.
  const renderProfile = () => {
    if (profileLoading) return <div className="login-required">프로필을 불러오는 중입니다.</div>;
    if (!profile) return <div className="login-required">프로필 정보가 없습니다.</div>;
    const profileTabs = [
      {
        key: 'posts',
        label: '작성 게시글',
        count: profile.posts.length,
        content: profile.posts.length
          ? profile.posts.map(post => <p key={post.id}>{postLink(post)} <small>좋아요 {post.likeCount} · 조회 {post.viewCount}</small></p>)
          : <p className="muted">작성한 게시글이 없습니다.</p>
      },
      {
        key: 'comments',
        label: '작성 댓글',
        count: profile.comments.length,
        content: profile.comments.length
          ? profile.comments.map(commentItem => <p key={commentItem.id}><button className="link-button" onClick={() => openProfilePost(commentItem.postId)}>{commentItem.content}</button> <small>in {commentItem.postTitle} · 좋아요 {commentItem.likeCount}</small></p>)
          : <p className="muted">작성한 댓글이 없습니다.</p>
      },
      {
        key: 'likedPosts',
        label: '좋아요한 글',
        count: profile.likedPosts.length,
        content: profile.likedPosts.length
          ? profile.likedPosts.map(post => <p key={post.id}>{postLink(post)} <small>좋아요 {post.likeCount}</small></p>)
          : <p className="muted">좋아요한 글이 없습니다.</p>
      }
    ];
    const activeProfileTab = profileTabs.find(tab => tab.key === profileTab) || profileTabs[0];
    return <article className="post-detail profile-panel">
      <span className="eyebrow">MEMBER PROFILE</span>
      <h3>{profile.member.nickname}</h3>
      <p className="muted">{profile.member.email} · {roleLabel(profile.member)} · 가입 {format(profile.member.createdAt)}</p>
      <div className="profile-tabs">
        {profileTabs.map(tab => <button key={tab.key} className={profileTab === tab.key ? 'active' : ''} onClick={() => setProfileTab(tab.key)}>{tab.label} <span>{tab.count}</span></button>)}
      </div>
      <div className="profile-tab-panel">
        <h4>{activeProfileTab.label}</h4>
        <div className="profile-list">{activeProfileTab.content}</div>
      </div>
    </article>;
  };

  return <section>
    <SectionTitle title="게시판" />
    <div className="cafe">
      <aside className="panel menu">{boards.map(x => <button key={x} className={board === x ? 'active' : ''} onClick={() => selectBoard(x)}>{boardLabels[x]}</button>)}</aside>
      <div className="panel">
        <div className="cafe-controls">
          <div className="cafe-control-row search-row">
            <input placeholder="게시글 검색" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') searchPosts(); }} />
            <button className="secondary search-desktop" onClick={searchPosts}>검색</button>
          </div>
          <div className="cafe-control-row filter-page-row">
            <select value={board} onChange={e => selectBoard(e.target.value)}>{boards.map(x => <option key={x} value={x}>{x === 'All' ? '전체' : boardLabels[x]}</option>)}</select>
            <select value={prefixFilter} onChange={e => setPrefixFilter(e.target.value)}><option value="All">전체</option>{Object.entries(prefixLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <button className="secondary search-mobile" onClick={searchPosts}>검색</button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="latest">최신순</option><option value="views">조회순</option><option value="likes">좋아요순</option><option value="comments">댓글순</option></select>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10개씩</option><option value={15}>15개씩</option><option value={20}>20개씩</option></select>
            {viewMode !== 'list' && <button className="secondary" onClick={() => { setViewMode('list'); setEditForm(null); resetCommentForms(); }}>목록</button>}
            <button onClick={() => currentMember ? setViewMode('write') : notify('로그인 후 게시글을 작성할 수 있습니다.')}>글쓰기</button>
          </div>
        </div>
        {viewMode === 'list' && !sortedPosts.length && <EmptyState title="게시글이 없습니다." description={query ? '검색어나 필터를 바꿔 다시 확인하세요.' : '첫 게시글을 작성해 팬들과 소식을 나눠보세요.'} />}
        {viewMode === 'list' && Boolean(sortedPosts.length) && <div className="board-list"><div className="board-table-wrap"><table><thead><tr><th>게시판</th><th>제목</th><th>작성자</th><th>조회</th><th>좋아요</th></tr></thead><tbody>{pagedPosts.map(p => <tr key={p.id} className={p.pinned ? 'pinned-row' : ''} onClick={async () => { setEditForm(null); resetCommentForms(); await openPost(p.id); setViewMode('detail'); }}><td>{p.pinned ? '공지' : boardLabels[p.boardType] || p.boardType}</td><td><b>[{prefixLabels[p.prefix] || p.prefix}] {p.title}</b> <small>댓글 {p.commentCount}</small></td><td>{authorButton(p.authorId, p.author)}</td><td>{p.viewCount}</td><td><span className={p.liked ? 'heart-inline liked' : 'heart-inline'}>{renderHeart(p.liked)}</span> {p.likeCount}</td></tr>)}</tbody></table></div><div className="pagination"><button className="page-nav" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => <button key={pageNumber} className={pageNumber === currentPage ? 'page-number current' : 'page-number'} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button className="page-nav" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>다음</button><span className="page-count">총 {sortedPosts.length}개</span></div></div>}
        {viewMode === 'detail' && selectedPost && <article className="post-detail">
          <span className="eyebrow">POST DETAIL</span>
          {editForm ? <div className="write"><select value={editForm.boardType} onChange={e => setEditForm({...editForm, boardType: e.target.value})}>{boards.filter(x => x !== 'All').map(x => <option key={x} value={x}>{boardLabels[x]}</option>)}</select><select value={editForm.prefix} onChange={e => setEditForm({...editForm, prefix: e.target.value})}>{Object.entries(prefixLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input placeholder="제목" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}/><textarea placeholder="내용" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})}/><label className="image-picker"><span>게시글 이미지 선택</span><input type="file" accept="image/*" onChange={event => changePostImage(event, 'edit')} /></label>{editForm.imageUrl && <div className="post-image-preview"><img src={editForm.imageUrl} alt="게시글 이미지 미리보기" /><button className="secondary" onClick={() => setEditForm({...editForm, imageUrl: ''})}>이미지 제거</button></div>}<div className="toolbar"><button onClick={updatePost}>수정 저장</button><button className="secondary" onClick={() => setEditForm(null)}>취소</button></div></div> : <><h3>[{prefixLabels[selectedPost.post.prefix] || selectedPost.post.prefix}] {selectedPost.post.title}</h3><p className="muted">{authorButton(selectedPost.post.authorId, selectedPost.post.author)} · 조회 {selectedPost.post.viewCount} · 좋아요 {selectedPost.post.likeCount}</p>{(selectedPost.post.imageUrl || selectedPost.imageUrl) && <img className="post-image" src={selectedPost.post.imageUrl || selectedPost.imageUrl} alt="게시글 이미지" />}<p>{selectedPost.content}</p></>}
          {!editForm && <div className="toolbar"><button className={selectedPost.post.liked ? 'heart-button liked' : 'heart-button'} onClick={togglePostLike}>{renderHeart(selectedPost.post.liked)} 좋아요 {selectedPost.post.likeCount}</button>{canEditPost && <button className="secondary" onClick={startEdit}>수정</button>}{canDeletePost && <button className="secondary" onClick={deletePost}>삭제</button>}<button className="secondary" onClick={() => reportTarget('POST', selectedPost.post.id)}>신고</button></div>}
          <h4>댓글</h4>
          <div className="comment-list">{selectedPost.comments.map(commentItem => renderComment(commentItem))}</div>
          <div className="toolbar"><input placeholder="댓글 작성" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') comment(); }}/><button onClick={comment}>등록</button></div>
        </article>}
        {viewMode === 'profile' && renderProfile()}
        {viewMode === 'write' && <div className="write write-panel"><div className="draft-notice">작성 중인 글은 이 브라우저에 자동 임시저장됩니다.</div><select value={form.boardType} onChange={e => setForm({...form, boardType: e.target.value})}>{boards.filter(x => x !== 'All' && x !== 'Notice').map(x => <option key={x} value={x}>{boardLabels[x]}</option>)}</select><select value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})}>{Object.entries(prefixLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input placeholder="제목" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/><textarea placeholder="내용" value={form.content} onChange={e => setForm({...form, content: e.target.value})}/><label className="image-picker"><span>게시글 이미지 선택</span><input type="file" accept="image/*" onChange={event => changePostImage(event, 'write')} /></label>{form.imageUrl && <div className="post-image-preview"><img src={form.imageUrl} alt="게시글 이미지 미리보기" /><button className="secondary" onClick={() => setForm({...form, imageUrl: ''})}>이미지 제거</button></div>}<div className="toolbar"><button onClick={write}>글 등록</button><button className="secondary" onClick={() => { if (draftKey) localStorage.removeItem(draftKey); setForm({ ...form, title: '', content: '', imageUrl: '' }); notify('임시저장을 비웠습니다.'); }}>임시저장 삭제</button><button className="secondary" onClick={() => setViewMode('list')}>취소</button></div></div>}
      </div>
    </div>
  </section>;
}

function digitsOnly(value) { return String(value || '').replace(/\D/g, ''); }
function formatPhoneNumber(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
function formatCardNumber(value) {
  return digitsOnly(value).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatExpiryInput(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
function isValidExpiry(value) {
  const digits = digitsOnly(value);
  if (digits.length !== 4) return false;
  const month = Number(digits.slice(0, 2));
  return month >= 1 && month <= 12;
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
function bookingCountdownLabel(concert, now = Date.now()) {
  const start = concert?.bookingStartAt ? new Date(concert.bookingStartAt).getTime() : 0;
  const end = concert?.bookingEndAt ? new Date(concert.bookingEndAt).getTime() : 0;
  if (start && now < start) return `오픈까지 ${formatDuration(start - now)}`;
  if (end && now <= end) return `마감까지 ${formatDuration(end - now)}`;
  return '';
}
function reservationSeatLabel(reservation) {
  return reservation?.seatGrade ? `${reservation.seatLabel} ${reservation.seatGrade}석` : reservation?.seatLabel || '-';
}
function reservationQrPattern(reservation) {
  const seed = String(reservation?.ticketCode || reservation?.id || 'DOHWA');
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Array.from({ length: 49 }, (_, index) => {
    const edge = index < 7 || index % 7 === 0 || index % 7 === 6 || index >= 42;
    return edge || ((Math.abs(hash) + index * 17) % 5 < 2);
  });
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
// LocalDateTime 문자열을 화면에 맞게 짧은 날짜/시간 형식으로 자릅니다.
function format(value) { return value ? String(value).replace('T', ' ').slice(0, 16) : ''; }
// 숫자 가격을 한국어 원화 표기로 보여줍니다.
function money(value) { return `${Number(value || 0).toLocaleString('ko-KR')}원`; }
function reservationStatusLabel(status) {
  if (status === 'PAYMENT_PENDING') return '입금 대기';
  if (status === 'RESERVED') return '결제 완료';
  return '취소';
}
function paymentMethodLabel(method) {
  if (method === 'CARD') return '카드';
  if (method === 'KAKAO_PAY') return '카카오페이';
  return '무통장';
}
