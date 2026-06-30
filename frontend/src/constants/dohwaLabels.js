// 게시판 탭과 말머리 코드를 화면에 보여줄 한글 라벨로 변환합니다.
export const boardLabels = {
  All: '전체글',
  Notice: '공지',
  Review: '후기',
  Question: '질문',
  'Fan Art': '팬아트',
  Archive: '자료실',
  Trade: '거래',
  Event: '이벤트'
};

export const prefixLabels = {
  Concert: '공연',
  Ticket: '티켓',
  Goods: '굿즈',
  Image: '이미지',
  Schedule: '스케줄',
  Trade: '양도',
  Event: '참여'
};

const DOHWA_EMAIL = 'dohwa0412@dohwa.com';

// 특정 이메일 계정은 일반 FAN 권한이어도 화면에서는 아티스트로 표시합니다.
export const isDohwaMember = (member) => member?.email?.toLowerCase() === DOHWA_EMAIL;

export const roleLabel = (member) => isDohwaMember(member) ? '아티스트' : member?.role;
