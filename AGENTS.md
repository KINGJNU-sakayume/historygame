# 이 저장소에서 일하는 에이전트에게

- **에피소드(시나리오)를 만들거나 고칠 때**: 먼저 `docs/EPISODE_GUIDE.md`를 끝까지 읽고, `docs/templates/`에서 시작한다. 기준 예시는 `scenarios/001`과 `research/001.md`.
- **화면(UI)을 고칠 때**: `docs/DESIGN.md`의 색·서체·레이아웃 규칙을 따른다.
- 사실 주장은 모두 `research/<id>.md`에 출처와 함께. 출처 도메인은 `research-allowlist.txt`. 위키백과 단독 사실은 쓰지 않는다.
- 끝내기 전에 `npm run validate`, `npm run check-urls`, `npm test`가 통과해야 하고, `npm run dev`로 한 판을 끝까지 해 본다.
- 판 하나를 맞추려고 코드를 고치지 않는다. 필요하면 사용자에게 묻는다.
