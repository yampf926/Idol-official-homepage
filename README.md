# DOHWA Link

DOHWA Link는 가상 아티스트 `도화(DOHWA)`의 팬 서비스 포트폴리오 프로젝트입니다.

## 기술 스택

### Backend
- Spring Boot 3
- Spring Web
- Spring Data JPA
- H2 local DB
- Oracle profile 지원

### Frontend
- React
- Vite
- Axios
- React Router

## 가장 쉬운 실행 방법

프로젝트 루트에서 아래 파일을 더블클릭하거나 터미널에서 실행합니다.

```powershell
.\start-dev.cmd
```

실행하면 터미널 창 2개가 열립니다.

- Backend: `http://localhost:8080`
- Frontend: `http://localhost:412`

Frontend 창에 `Local: http://localhost:412/`가 보이면 브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:412/
```

## 직접 실행 방법

### 1. 백엔드 실행

```powershell
cd C:\Users\KOSMO\IdeaProjects\Dohwa
.\mvnw.cmd spring-boot:run
```

### 2. 프론트 실행

새 터미널을 하나 더 열고 실행합니다.

```powershell
cd C:\Users\KOSMO\IdeaProjects\Dohwa\frontend
..\npmw.cmd run dev
```

### 3. 브라우저 접속

```text
http://localhost:412/
```

## 자주 생기는 문제

### `localhost:412`에 연결할 수 없음

프론트 서버가 꺼져 있는 상태입니다.

```powershell
cd C:\Users\KOSMO\IdeaProjects\Dohwa\frontend
..\npmw.cmd run dev
```

### 화면은 열리는데 데이터를 불러오지 못함

백엔드 서버가 꺼져 있는 상태입니다.

```powershell
cd C:\Users\KOSMO\IdeaProjects\Dohwa
.\mvnw.cmd spring-boot:run
```

### 컴퓨터를 껐다 켠 뒤 접속이 안 됨

정상입니다. 컴퓨터를 끄면 프론트/백엔드 서버도 같이 꺼집니다. 다시 접속하기 전에 `start-dev.cmd`를 실행하세요.

## 환경 변수

프론트 API 주소는 `frontend/.env`에서 바꿀 수 있습니다.

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

기본 예시는 `frontend/.env.example`에 있습니다.

## 테스트 계정

```text
fan@dohwa.com / Dohwa1234!
admin@dohwa.com / Dohwa1234!
dohwa@gmail.com / Dohwa1234!
```

- `fan@dohwa.com`: 팬 계정
- `admin@dohwa.com`: 관리자 계정
- `dohwa@gmail.com`: 아티스트 도화 계정. DB 역할은 기존 로컬 DB와 호환되도록 `FAN`으로 저장하고, 서비스에서는 이메일로 아티스트 계정인지 구분합니다.

## 주요 기능

- 회원가입 / 로그인
- 아티스트 홈
- 공연 목록 / 좌석 예매 / 예매 취소
- 팬 게시판 / 댓글 / 답글 / 좋아요
- 팬덤 레벨 / 미션 / 랭킹
- 이벤트 응모
- 알림 목록
- 채팅방

## 주요 API

### 회원

```text
POST /api/members/signup
POST /api/members/login
GET  /api/members/me
GET  /api/members/{memberId}/profile
```

### 공연 / 예매

```text
GET    /api/concerts
GET    /api/concerts/{concertId}/reserved-seats
POST   /api/concerts/{concertId}/reservations
GET    /api/reservations/my
DELETE /api/reservations/{reservationId}
```

### 게시판

```text
GET    /api/fan-posts
GET    /api/fan-posts/{postId}
POST   /api/fan-posts
PUT    /api/fan-posts/{postId}
DELETE /api/fan-posts/{postId}
POST   /api/fan-posts/{postId}/like
POST   /api/fan-posts/{postId}/comments
PUT    /api/comments/{commentId}
DELETE /api/comments/{commentId}
POST   /api/comments/{commentId}/like
```

### 이벤트 / 알림 / 채팅

```text
GET  /api/events
POST /api/events/{eventId}/apply
GET  /api/notifications
PUT  /api/notifications/{notificationId}/read
GET  /api/chat/messages
POST /api/chat/messages
```

## 앞으로 개선할 점

- `main.jsx` 컴포넌트 분리
- 비밀번호 BCrypt 암호화
- `memberId` 파라미터 기반 인증을 JWT 또는 세션 인증으로 교체
- 관리자 화면 추가
- 서비스 테스트 코드 추가
