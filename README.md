# routine

매일 쓰는 루틴 체크 웹앱입니다. 아이폰 홈 화면에 설치해서 씁니다.

- 항목마다 입력 방식을 고릅니다: 체크(O / △ / X) · 시간 입력 · 켜기/끄기
- △(5분짜리 최소 버전)도 달성으로 인정
- 하루 합계가 이틀 연속 0이면 경고
- 기록은 휴대폰 브라우저에만 저장되고, 공유하기(카톡 등)·복사·파일로 백업할 수 있습니다

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/routine/
npm test         # 계산 규칙과 저장소 테스트
npm run build    # dist/ 에 정적 파일 생성 (GitHub Pages용)
```

## 구조

| 파일 | 역할 |
|---|---|
| `src/lib/rules.js` | 합계, 밤 시간 해석, 이틀째 0, 이어간 주 계산 (화면과 분리, 테스트 있음) |
| `src/lib/storage.js` | 저장소. IndexedDB는 이 파일에서만 다룸 (클라우드 DB로 바꿀 때 이 파일만 교체) |
| `src/lib/defaults.js` | 처음 실행할 때 들어가는 예시 루틴 |
| `src/lib/dates.js` | 날짜·시간 계산 (주의 시작은 월요일) |
| `src/screens/` | 오늘 · 이번 주 · 설정 · 백업 화면 |
| `src/ui.jsx` | 아래에서 올라오는 창, 확인 창, 알림 |

설계: [docs/화면설계.md](docs/화면설계.md)
