import { loadIndex } from '../../data.ts';
import { isData, load, merge, save } from '../../store.ts';
import { h } from '../dom.ts';

export function records(): HTMLElement {
  const data = load();
  const titles = new Map<string, string>();
  const list = h('ul', { class: 'records-list' });
  const msg = h('p', { class: 'muted', role: 'status' });

  const draw = () =>
    list.replaceChildren(
      ...(data.finished.length
        ? data.finished
            .slice()
            .reverse()
            .map((p) =>
              h('li', null,
                h('strong', null, `사건 ${p.scenarioId} ${titles.get(p.scenarioId) ?? ''}`),
                h('span', { class: 'muted' }, ` ${new Date(p.finishedAt ?? p.startedAt).toLocaleDateString('ko-KR')}`),
                p.tags.length ? h('p', { class: 'tags' }, p.tags.join(', ')) : null,
              ),
            )
        : [h('li', { class: 'muted' }, '아직 끝낸 판이 없다. 사건 목록에서 하나를 골라 시작하라.')]),
    );
  draw();
  loadIndex().then((idx) => {
    idx.forEach((s) => titles.set(s.id, s.title));
    draw();
  }).catch(() => {});

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `historygame-records-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJson = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const incoming = JSON.parse(await file.text());
      if (!isData(incoming)) throw new Error('이 게임의 기록 파일이 아니다');
      const merged = merge(load(), incoming);
      const added = merged.finished.length - load().finished.length;
      if (!save(merged)) throw new Error('브라우저 저장소에 쓸 수 없다');
      data.finished = merged.finished;
      draw();
      msg.textContent = `끝난 판 ${added}개를 가져왔다.`;
    } catch (err) {
      msg.textContent = `가져오기 실패: ${(err as Error).message}`;
    }
  };

  return h('section', { class: 'screen records' },
    h('h1', null, '판단 기록'),
    h('p', { class: 'muted' }, '기록은 이 브라우저에만 저장된다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 내보내 두라.'),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: exportJson }, 'JSON 내보내기'),
      h('label', { class: 'btn' }, 'JSON 가져오기', h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: importJson })),
    ),
    msg,
    list,
  );
}
