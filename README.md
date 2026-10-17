# 역사의 봉투 — 마스킹 역사 판단 게임

나라·인물·연도를 지운 역사의 한 장면에서 결정자가 되어 판단하고, 마지막에 정체와 실제 결과를 확인하는 혼자 하는 정적 웹 게임.

## 개발

```sh
npm ci
npm run dev          # 시나리오 빌드 + 개발 서버
npm test             # 단위 테스트 (엔진·검증기)
npm run test:e2e     # 모바일 뷰포트 플레이 테스트 (가상 픽스처 시나리오)
npm run validate     # 스키마·참조·마스킹 누출·출처 필수 검사
npm run check-urls   # 출처 URL 도달·허용 도메인 검사 → report.md
npm run build        # 선택지 셔플 + 정적 빌드 → dist/
```

## 시나리오 추가

에피소드 제작 규칙은 **[docs/EPISODE_GUIDE.md](docs/EPISODE_GUIDE.md)** 하나에 모여 있다. 템플릿은 `docs/templates/`, 기준 예시는 `scenarios/001`과 `research/001.md`. 다른 사람이나 LLM에게 제작을 맡길 때는 이 지침과 템플릿을 함께 넘기면 된다.

화면 디자인 규칙은 [docs/DESIGN.md](docs/DESIGN.md).

## 배포

저장소 Settings → Pages → Source를 **GitHub Actions**로 바꾸면 `main`에 push할 때 `.github/workflows/deploy.yml`이 검증 후 배포한다. 주간 링크 검사(`linkrot.yml`)는 끊긴 출처를 `linkrot` 라벨 이슈로 등록한다.

판단 기록은 브라우저 localStorage에만 저장된다. 기록 화면에서 JSON으로 내보내고 가져올 수 있다.
