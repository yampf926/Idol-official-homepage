import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { errorMessage } from '../utils/apiErrors';

// 홈/공연/게시판/알림 등 여러 화면에서 공유하는 서버 데이터와 갱신 로직입니다.
export function useDohwaData(activeMemberId, saveMember, clearMember) {
  const [artist, setArtist] = useState(null);
  const [concerts, setConcerts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [appliedEventIds, setAppliedEventIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [fanDashboard, setFanDashboard] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const selectedPostRef = useRef(null);

  const updateSelectedPost = useCallback((post) => {
    selectedPostRef.current = post;
    setSelectedPost(post);
  }, []);

  // 게시글 상세 조회입니다. countView가 true면 백엔드에서 조회수가 증가합니다.
  const openPost = useCallback(async (postId, countView = true) => {
    const res = await api.get(`/fan-posts/${postId}`, { params: { ...(activeMemberId ? { memberId: activeMemberId } : {}), countView } });
    updateSelectedPost(res.data);
  }, [activeMemberId, updateSelectedPost]);

  // 게시글 작성/수정/삭제 후 목록만 빠르게 다시 가져옵니다.
  const refreshPosts = useCallback(async () => {
    const postRes = await api.get('/fan-posts', { params: activeMemberId ? { memberId: activeMemberId } : {} });
    setPosts(postRes.data);
  }, [activeMemberId]);

  // 공연 예매/취소 후 공연 잔여 좌석과 내 예매 내역을 함께 동기화합니다.
  const refreshConcertsAndReservations = useCallback(async () => {
    const [concertRes, reservationRes] = await Promise.all([
      api.get('/concerts'),
      activeMemberId ? api.get('/reservations/my', { params: { memberId: activeMemberId } }) : Promise.resolve({ data: [] })
    ]);
    setConcerts(concertRes.data);
    setReservations(reservationRes.data);
  }, [activeMemberId]);

  const syncCurrentMember = useCallback(async (memberId = activeMemberId) => {
    if (!memberId) return;
    try {
      const freshMember = await api.get('/members/me', { params: { memberId } });
      saveMember(freshMember.data);
    } catch {
      clearMember();
    }
  }, [activeMemberId, clearMember, saveMember]);

  // 앱이 필요로 하는 초기 데이터를 병렬로 불러옵니다. 로그인 여부에 따라 내 예매/알림만 조건부 요청합니다.
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      let requestMemberId = activeMemberId;
      if (requestMemberId) {
        try {
          const freshMember = await api.get('/members/me', { params: { memberId: requestMemberId } });
          saveMember(freshMember.data);
          requestMemberId = freshMember.data.id;
        } catch {
          clearMember();
          requestMemberId = null;
        }
      }
      const [artistRes, concertRes, reservationRes, postRes, noticeRes, eventRes, appliedEventRes, notificationRes, fanDashboardRes] = await Promise.all([
        api.get('/artists/dohwa'),
        api.get('/concerts'),
        requestMemberId ? api.get('/reservations/my', { params: { memberId: requestMemberId } }) : Promise.resolve({ data: [] }),
        api.get('/fan-posts', { params: requestMemberId ? { memberId: requestMemberId } : {} }),
        api.get('/notices'),
        api.get('/events'),
        requestMemberId ? api.get('/events/my', { params: { memberId: requestMemberId } }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        requestMemberId ? api.get('/notifications', { params: { memberId: requestMemberId } }) : Promise.resolve({ data: [] }),
        api.get('/fandom/dashboard', { params: requestMemberId ? { memberId: requestMemberId } : {} })
      ]);
      setArtist(artistRes.data);
      setConcerts(concertRes.data);
      setReservations(reservationRes.data);
      setPosts(postRes.data);
      setNotices(noticeRes.data);
      setEvents(eventRes.data);
      setAppliedEventIds(appliedEventRes.data.map(apply => apply.event?.id).filter(Boolean));
      setNotifications(notificationRes.data);
      setFanDashboard(fanDashboardRes.data);
      if (!selectedPostRef.current && postRes.data[0]) {
        const postDetailRes = await api.get(`/fan-posts/${postRes.data[0].id}`, { params: { ...(requestMemberId ? { memberId: requestMemberId } : {}), countView: false } });
        updateSelectedPost(postDetailRes.data);
      }
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [activeMemberId, clearMember, saveMember, updateSelectedPost]);

  // 로그인 계정이 바뀌면 회원별 데이터가 달라지므로 전체 데이터를 다시 불러옵니다.
  useEffect(() => { load(); }, [load]);

  return {
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
    load,
    syncCurrentMember
  };
}
