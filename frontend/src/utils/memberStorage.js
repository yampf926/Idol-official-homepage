const storageKey = 'dohwa.currentMember';

export const sanitizeMember = (member) => {
  if (!member?.id) return null;
  return {
    id: member.id,
    email: member.email,
    nickname: member.nickname,
    role: member.role,
    profileImage: member.profileImage || '',
    createdAt: member.createdAt
  };
};

// 새로고침 후에도 로그인 상태를 복원하기 위해 localStorage에서 회원 정보를 읽습니다.
export const loadSavedMember = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const member = sanitizeMember(JSON.parse(raw));
    if (!member) {
      localStorage.removeItem(storageKey);
    }
    return member;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

export const saveStoredMember = (member) => {
  const safeMember = sanitizeMember(member);
  if (!safeMember) return null;
  localStorage.setItem(storageKey, JSON.stringify(safeMember));
  return safeMember;
};

export const clearStoredMember = () => {
  localStorage.removeItem(storageKey);
};
