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

`scenarios/<세 자리 id>/scenario.json`과 (선택) `map.svg`를 넣으면 코드 수정 없이 목록에 나온다. 형식은 `config/scenario.schema.json`, 예시는 `scenarios/001`.

- 사실 주장은 모두 `research/<id>.md`에 출처와 함께 기록한다. 출처 없는 주장은 본문에 쓰지 않는다.
- `reveal.redact`와 `reveal.identities`의 이름, `reveal` 본문의 연도가 마스킹 영역(`masked`, `dossier`, `pushbacks`, 지도)에 나오면 검증이 실패한다.
- 성향 태그는 `config/tag-axes.json`의 극 중에서 고른다(아니면 경고).
- 나라·세력은 `masked.entities`에 대문자 한 글자(A~Z)로 정의하고 본문에서는 그 글자로 쓴다. 플레이어의 나라에는 `"self": true`를 붙인다(화면에서 형광 강조, 첫 언급 풀이는 '우리'). 정의하지 않은 대문자 한 글자가 마스킹 영역에 있으면 검증이 경고한다.
- 화면은 보고 한 건, 반론 한 건, 선택지 목록 안에서 기호가 처음 나올 때 `B(대륙의 제국)`처럼 풀이를 붙인다. 상황 설명에는 이미 "제국 B"처럼 써 두므로 풀이를 붙이지 않는다.
- `map.svg`는 실제 지형이 아니라 **관계도**로 그린다. 해안선·나침반·실제 배치는 정체를 드러내므로 쓰지 않는다. 원 크기는 국력, 맞닿은 원은 국경을 맞댄 나라, 선은 동맹·진군·봉쇄 같은 행동을 나타낸다(예: `scenarios/001/map.svg`).
- 출처 도메인은 `research-allowlist.txt`에 있어야 한다(아니면 경고).

## 배포

저장소 Settings → Pages → Source를 **GitHub Actions**로 바꾸면 `main`에 push할 때 `.github/workflows/deploy.yml`이 검증 후 배포한다. 주간 링크 검사(`linkrot.yml`)는 끊긴 출처를 `linkrot` 라벨 이슈로 등록한다.

판단 기록은 브라우저 localStorage에만 저장된다. 기록 화면에서 JSON으로 내보내고 가져올 수 있다.
