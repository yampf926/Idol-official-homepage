const STORAGE_KEY = 'dohwa.static.demo.v1';
const nowIso = () => new Date().toISOString();
const base = (path) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

const seedState = () => {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const concertDate = new Date();
  concertDate.setDate(concertDate.getDate() + 21);
  const bookingEnd = new Date();
  bookingEnd.setDate(bookingEnd.getDate() + 14);

  const members = [
    { id: 1, email: 'dohwa0412@dohwa.com', nickname: 'DOHWA', password: 'Dohwa123!', role: 'ADMIN', profileImage: '' },
    { id: 2, email: 'fan@dohwa.com', nickname: '복숭아팬', password: 'Fan1234!', role: 'USER', profileImage: '' }
  ];
  const posts = [
    {
      id: 1,
      boardType: 'Notice',
      prefix: 'Official',
      title: 'DOHWA 1st Concert 예매 안내',
      content: '공개 페이지 데모에서도 좌석 선택과 예매 흐름을 확인할 수 있습니다.',
      authorId: 1,
      author: 'DOHWA',
      pinned: true,
      imageUrl: base('sample.png'),
      viewCount: 132,
      likeCount: 24,
      likedBy: [],
      createdAt: nowIso()
    },
    {
      id: 2,
      boardType: 'Review',
      prefix: 'Concert',
      title: '첫 공연 기대 중',
      content: '무대 이미지와 예매 흐름이 한 페이지 안에서 자연스럽게 이어집니다.',
      authorId: 2,
      author: '복숭아팬',
      pinned: false,
      imageUrl: base('dohwaConcert.png'),
      viewCount: 58,
      likeCount: 9,
      likedBy: [],
      createdAt: nowIso()
    }
  ];

  return {
    ids: { member: 3, post: 3, comment: 2, reservation: 1, notification: 2, chat: 2, event: 2, notice: 2, report: 1 },
    members,
    concerts: [
      {
        id: 1,
        title: 'DOHWA 1st Concert',
        description: '도화의 첫 단독 공연입니다. 공개 페이지에서는 데모 예매로 동작합니다.',
        venue: 'Peach Hall',
        concertDate: concertDate.toISOString(),
        bookingStartAt: start.toISOString(),
        bookingEndAt: bookingEnd.toISOString(),
        totalSeats: 80,
        remainingSeats: 78,
        vipPrice: 132000,
        rPrice: 110000,
        sPrice: 88000,
        aPrice: 66000
      }
    ],
    reservations: [],
    posts,
    comments: [
      { id: 1, postId: 2, authorId: 1, author: 'DOHWA', content: '공연장에서 만나요.', likeCount: 3, likedBy: [], parentId: null, createdAt: nowIso() }
    ],
    notices: [{ id: 1, title: '공개 페이지 데모 안내', content: '데이터는 현재 브라우저에 저장됩니다.', createdAt: nowIso() }],
    events: [{ id: 1, title: '응원 메시지 이벤트', content: '도화에게 남기고 싶은 말을 적어주세요.', startAt: start.toISOString(), endAt: bookingEnd.toISOString() }],
    eventApplies: [],
    notifications: [{ id: 1, memberId: 2, title: '환영합니다', content: 'DOHWA LINK 데모 페이지입니다.', read: false, createdAt: nowIso() }],
    chats: [{ id: 1, memberId: 1, nickname: 'DOHWA', content: '오늘도 좋은 하루 보내세요.', createdAt: nowIso() }],
    reports: []
  };
};

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedState();
  } catch {
    return seedState();
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
};

const ok = (config, data, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config, request: null });
const fail = (config, message, status = 400) => Promise.reject({ response: { data: { message }, status }, message, config });
const nextId = (state, key) => state.ids[key]++;
const memberById = (state, id) => state.members.find((member) => member.id === Number(id));
const publicMember = (member) => member && ({
  id: member.id,
  email: member.email,
  nickname: member.nickname,
  role: member.role,
  profileImage: member.profileImage || ''
});
const currentMemberId = (config) => Number(config.params?.memberId || config.data?.memberId || 0);
const postListItem = (state, post, memberId = 0) => ({
  ...post,
  content: undefined,
  liked: post.likedBy?.includes(memberId) || false,
  commentCount: state.comments.filter((comment) => comment.postId === post.id).length
});
const postDetail = (state, id, memberId = 0, countView = true) => {
  const post = state.posts.find((item) => item.id === Number(id));
  if (!post) return null;
  if (countView) post.viewCount = (post.viewCount || 0) + 1;
  return {
    post: postListItem(state, post, memberId),
    content: post.content,
    imageUrl: post.imageUrl,
    comments: state.comments
      .filter((comment) => comment.postId === post.id)
      .map((comment) => ({ ...comment, liked: comment.likedBy?.includes(memberId) || false }))
  };
};
const reservationWithConcert = (state, reservation) => ({
  ...reservation,
  concert: state.concerts.find((concert) => concert.id === reservation.concertId)
});
const seatGrade = (seatLabel) => {
  if (seatLabel?.startsWith('A')) return 'VIP';
  if (seatLabel?.startsWith('B') || seatLabel?.startsWith('C')) return 'R';
  if (seatLabel?.startsWith('D') || seatLabel?.startsWith('E') || seatLabel?.startsWith('F')) return 'S';
  return 'A';
};
const seatPrice = (concert, grade) => {
  if (grade === 'VIP') return concert.vipPrice;
  if (grade === 'R') return concert.rPrice;
  if (grade === 'S') return concert.sPrice;
  return concert.aPrice;
};
const dashboard = (state, memberId = 0) => {
  const member = memberById(state, memberId);
  return {
    me: { level: member ? 'PEACH' : 'GUEST', point: member ? 412 : 0 },
    ranking: state.members.map((memberItem, index) => ({ memberId: memberItem.id, nickname: memberItem.nickname, point: 520 - index * 67 })),
    missions: [
      { code: 'login', title: '로그인하기', rewardPoint: 10, completed: Boolean(member) },
      { code: 'post', title: '게시글 읽기', rewardPoint: 20, completed: false }
    ],
    hotPosts: state.posts.slice(0, 3).map((post) => postListItem(state, post, memberId)),
    stats: { posts: state.posts.length, comments: state.comments.length, reservations: state.reservations.length }
  };
};

export function createStaticDemoAdapter() {
  return async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const path = new URL(config.url, 'https://dohwa.local').pathname.replace(/^\/api/, '');
    if (typeof config.data === 'string' && config.data) {
      try {
        config.data = JSON.parse(config.data);
      } catch {
        config.data = {};
      }
    }
    config.data ||= {};
    const state = loadState();
    const memberId = currentMemberId(config);

    if (method === 'get' && path === '/artists/dohwa') return ok(config, { name: 'DOHWA', description: '맑은 보컬과 섬세한 무대를 가진 솔로 아티스트입니다.' });
    if (method === 'get' && path === '/concerts') return ok(config, state.concerts);
    if (method === 'get' && path.match(/^\/concerts\/\d+\/reserved-seats$/)) {
      const concertId = Number(path.split('/')[2]);
      return ok(config, state.reservations.filter((item) => item.concertId === concertId && item.status !== 'CANCELLED').map((item) => item.seatLabel));
    }
    if (method === 'post' && path.match(/^\/concerts\/\d+\/reservations$/)) {
      const concertId = Number(path.split('/')[2]);
      const member = memberById(state, memberId);
      const concert = state.concerts.find((item) => item.id === concertId);
      if (!member || !concert) return fail(config, '로그인 후 예매할 수 있습니다.', 401);
      const grade = seatGrade(config.data?.seatLabel);
      const reservation = {
        id: nextId(state, 'reservation'),
        concertId,
        memberId,
        seatLabel: config.data.seatLabel,
        seatGrade: grade,
        price: seatPrice(concert, grade),
        status: config.data.paymentMethod === 'BANK_TRANSFER' ? 'PAYMENT_PENDING' : 'RESERVED',
        paymentMethod: config.data.paymentMethod,
        paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        ticketCode: `DHW-${Date.now().toString().slice(-6)}`,
        reservedAt: nowIso()
      };
      state.reservations.push(reservation);
      concert.remainingSeats = Math.max(0, Number(concert.remainingSeats || concert.totalSeats) - 1);
      saveState(state);
      return ok(config, reservationWithConcert(state, reservation), 201);
    }
    if (method === 'get' && path === '/reservations/my') return ok(config, state.reservations.filter((item) => item.memberId === memberId).map((item) => reservationWithConcert(state, item)));
    if (method === 'put' && path.match(/^\/reservations\/\d+\/pay$/)) {
      const reservation = state.reservations.find((item) => item.id === Number(path.split('/')[2]));
      if (reservation) reservation.status = 'RESERVED';
      saveState(state);
      return ok(config, reservationWithConcert(state, reservation));
    }
    if (method === 'delete' && path.match(/^\/reservations\/\d+$/)) {
      const reservation = state.reservations.find((item) => item.id === Number(path.split('/')[2]));
      if (reservation) reservation.status = 'CANCELLED';
      saveState(state);
      return ok(config, { ok: true });
    }

    if (method === 'post' && path === '/members/signup') {
      const email = (config.data.email || '').trim().toLowerCase();
      if (state.members.some((member) => member.email === email)) return fail(config, '이미 가입된 이메일입니다.');
      const member = { id: nextId(state, 'member'), email, nickname: config.data.nickname.trim(), password: config.data.password, role: 'USER', profileImage: '' };
      state.members.push(member);
      saveState(state);
      return ok(config, publicMember(member), 201);
    }
    if (method === 'post' && path === '/members/login') {
      const email = (config.data.email || '').trim().toLowerCase();
      const member = state.members.find((item) => item.email === email && item.password === config.data.password);
      if (!member) return fail(config, '이메일 또는 비밀번호가 올바르지 않습니다.', 401);
      return ok(config, publicMember(member));
    }
    if (method === 'get' && path === '/members/me') return ok(config, publicMember(memberById(state, memberId)));
    if (method === 'post' && path === '/members/find-email') {
      const nickname = (config.data.nickname || '').trim();
      return ok(config, { emails: state.members.filter((member) => member.nickname === nickname).map((member) => member.email) });
    }
    if (method === 'put' && path === '/members/password/reset') {
      const member = state.members.find((item) => item.email === config.data.email && item.nickname === config.data.nickname);
      if (!member) return fail(config, '일치하는 회원이 없습니다.');
      member.password = config.data.newPassword;
      saveState(state);
      return ok(config, publicMember(member));
    }
    if (path.match(/^\/members\/\d+$/)) {
      const id = Number(path.split('/')[2]);
      const member = memberById(state, id);
      if (!member) return fail(config, '회원을 찾지 못했습니다.', 404);
      if (method === 'put') {
        member.nickname = config.data.nickname || member.nickname;
        member.profileImage = config.data.profileImage || '';
        saveState(state);
        return ok(config, publicMember(member));
      }
      if (method === 'delete') {
        state.members = state.members.filter((item) => item.id !== id);
        saveState(state);
        return ok(config, { ok: true });
      }
    }
    if (method === 'put' && path.match(/^\/members\/\d+\/password$/)) return ok(config, { ok: true });
    if (method === 'get' && path.match(/^\/members\/\d+\/profile$/)) {
      const id = Number(path.split('/')[2]);
      const member = memberById(state, id);
      return ok(config, {
        member: publicMember(member),
        posts: state.posts.filter((post) => post.authorId === id).map((post) => postListItem(state, post, id)),
        comments: state.comments.filter((comment) => comment.authorId === id),
        likedPosts: state.posts.filter((post) => post.likedBy?.includes(id)).map((post) => postListItem(state, post, id))
      });
    }
    if (method === 'get' && path === '/members') return ok(config, state.members.map(publicMember));

    if (method === 'get' && path === '/fan-posts') return ok(config, state.posts.map((post) => postListItem(state, post, memberId)));
    if (method === 'post' && path === '/fan-posts') {
      const member = memberById(state, memberId);
      if (!member) return fail(config, '로그인 후 작성할 수 있습니다.', 401);
      const post = { id: nextId(state, 'post'), ...config.data, authorId: member.id, author: member.nickname, pinned: false, viewCount: 0, likeCount: 0, likedBy: [], createdAt: nowIso() };
      state.posts.unshift(post);
      saveState(state);
      return ok(config, postListItem(state, post, memberId), 201);
    }
    if (path.match(/^\/fan-posts\/\d+$/)) {
      const id = Number(path.split('/')[2]);
      const post = state.posts.find((item) => item.id === id);
      if (!post) return fail(config, '게시글을 찾지 못했습니다.', 404);
      if (method === 'get') {
        const detail = postDetail(state, id, memberId, config.params?.countView !== false);
        saveState(state);
        return ok(config, detail);
      }
      if (method === 'put') {
        Object.assign(post, config.data);
        saveState(state);
        return ok(config, postDetail(state, id, memberId, false));
      }
      if (method === 'delete') {
        state.posts = state.posts.filter((item) => item.id !== id);
        state.comments = state.comments.filter((item) => item.postId !== id);
        saveState(state);
        return ok(config, { ok: true });
      }
    }
    if (method === 'post' && path.match(/^\/fan-posts\/\d+\/like$/)) {
      const post = state.posts.find((item) => item.id === Number(path.split('/')[2]));
      post.likedBy ||= [];
      if (post.likedBy.includes(memberId)) post.likedBy = post.likedBy.filter((id) => id !== memberId);
      else post.likedBy.push(memberId);
      post.likeCount = post.likedBy.length;
      saveState(state);
      return ok(config, postDetail(state, post.id, memberId, false));
    }
    if (method === 'post' && path.match(/^\/fan-posts\/\d+\/comments$/)) {
      const member = memberById(state, memberId);
      if (!member) return fail(config, '로그인 후 댓글을 작성할 수 있습니다.', 401);
      const comment = { id: nextId(state, 'comment'), postId: Number(path.split('/')[2]), authorId: member.id, author: member.nickname, content: config.data.content, parentId: config.data.parentId || null, likeCount: 0, likedBy: [], createdAt: nowIso() };
      state.comments.push(comment);
      saveState(state);
      return ok(config, comment, 201);
    }
    if (method === 'put' && path.match(/^\/comments\/\d+$/)) {
      const comment = state.comments.find((item) => item.id === Number(path.split('/')[2]));
      if (comment) comment.content = config.data.content;
      saveState(state);
      return ok(config, comment);
    }
    if (method === 'delete' && path.match(/^\/comments\/\d+$/)) {
      state.comments = state.comments.filter((item) => item.id !== Number(path.split('/')[2]));
      saveState(state);
      return ok(config, { ok: true });
    }
    if (method === 'post' && path.match(/^\/comments\/\d+\/like$/)) return ok(config, { ok: true });

    if (method === 'get' && path === '/notices') return ok(config, state.notices);
    if (method === 'get' && path === '/events') return ok(config, state.events);
    if (method === 'get' && path === '/events/my') return ok(config, state.eventApplies.filter((item) => item.member?.id === memberId));
    if (method === 'post' && path.match(/^\/events\/\d+\/apply$/)) {
      const event = state.events.find((item) => item.id === Number(path.split('/')[2]));
      state.eventApplies.push({ id: nextId(state, 'event'), event, member: publicMember(memberById(state, memberId)), appliedAt: nowIso() });
      saveState(state);
      return ok(config, { ok: true }, 201);
    }
    if (method === 'get' && path === '/notifications') return ok(config, state.notifications.filter((item) => item.memberId === memberId));
    if (method === 'put' && path.match(/^\/notifications\/\d+\/read$/)) {
      const item = state.notifications.find((notice) => notice.id === Number(path.split('/')[2]));
      if (item) item.read = true;
      saveState(state);
      return ok(config, item);
    }
    if (method === 'put' && path === '/notifications/read-all') {
      state.notifications.forEach((item) => { if (item.memberId === memberId) item.read = true; });
      saveState(state);
      return ok(config, state.notifications.filter((item) => item.memberId === memberId));
    }
    if (method === 'delete' && path === '/notifications') {
      state.notifications = state.notifications.filter((item) => item.memberId !== memberId);
      saveState(state);
      return ok(config, { ok: true });
    }
    if (method === 'delete' && path.match(/^\/notifications\/\d+$/)) {
      state.notifications = state.notifications.filter((item) => item.id !== Number(path.split('/')[2]));
      saveState(state);
      return ok(config, { ok: true });
    }
    if (method === 'get' && path === '/fandom/dashboard') return ok(config, dashboard(state, memberId));
    if (method === 'get' && path === '/chat/messages') return ok(config, state.chats);
    if (method === 'post' && path === '/chat/messages') {
      const member = memberById(state, memberId);
      const message = { id: nextId(state, 'chat'), memberId, nickname: member?.nickname || '팬', content: config.data.content, createdAt: nowIso() };
      state.chats.push(message);
      saveState(state);
      return ok(config, message, 201);
    }
    if (method === 'delete' && path.match(/^\/chat\/messages\/\d+$/)) {
      state.chats = state.chats.filter((item) => item.id !== Number(path.split('/')[3]));
      saveState(state);
      return ok(config, { ok: true });
    }
    if (method === 'post' && path === '/reports') {
      state.reports.push({ id: nextId(state, 'report'), ...config.data, memberId, status: 'OPEN', createdAt: nowIso() });
      saveState(state);
      return ok(config, { ok: true }, 201);
    }
    if (method === 'get' && path === '/admin/reports') return ok(config, state.reports);
    if (path.startsWith('/admin/')) return ok(config, config.data || { ok: true });

    return fail(config, `지원하지 않는 데모 API입니다: ${method.toUpperCase()} ${path}`, 404);
  };
}
