// axios 에러 형태를 사용자가 이해할 수 있는 메시지로 통일합니다.
export const errorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status) return `요청 실패 (${error.response.status})`;
  if (error.request) return '백엔드 서버에 연결할 수 없습니다. 프로젝트 루트에서 .\\mvnw.cmd spring-boot:run 을 실행하세요.';
  return '요청을 처리하지 못했습니다.';
};

export const isAuthError = (error) => [401, 403].includes(error.response?.status);

export const isBackendConnectionError = (message) => message?.includes('백엔드 서버에 연결할 수 없습니다');
