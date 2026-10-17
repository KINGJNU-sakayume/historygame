import { expect, test } from '@playwright/test';

const shots = process.env.SHOTS_DIR;
const shot = async (page: import('@playwright/test').Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
};

test('모바일에서 한 판을 끝까지 하고, 새로고침해도 기록이 남는다', async ({ page }) => {
  // 외부 폰트 요청은 막아 둔다(오프라인 CI에서도 같게)
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('./');
  await shot(page, '01-list');

  await page.getByRole('link', { name: /강 건너의 두 왕국/ }).click();
  await page.getByRole('button', { name: '봉인을 뜯는다' }).click();
  await expect(page.getByText('당신은 왕국 A의 재상이다.')).toBeVisible();
  await shot(page, '02-briefing');
  await page.getByRole('button', { name: '자문 회의를 소집한다' }).click();

  // 탐문: 같은 조합은 순서대로, 없는 조합은 "알 수 없음"(차감 없음)
  await page.getByRole('radio', { name: /장군/ }).click();
  await page.getByRole('button', { name: '군사' }).click();
  await expect(page.locator('.response')).toContainText('병력 비교');
  await page.getByRole('button', { name: '군사' }).click();
  await expect(page.locator('.response')).toContainText('요새 상태');
  await page.getByRole('radio', { name: /시종/ }).click();
  await page.getByRole('button', { name: '혈연' }).click();
  await expect(page.locator('.response')).toContainText('당시 정보망으로는 알 수 없음');
  await expect(page.getByRole('status', { name: '남은 탐문 1회' })).toBeVisible();
  await shot(page, '03-inquiry');

  // 새로고침해도 탐문 기록 유지
  await page.reload();
  await expect(page.getByRole('heading', { name: '서류철 (2)' })).toBeVisible();

  await page.getByRole('button', { name: '판단하기' }).click();
  await page.getByText('수도를 옮긴다').click();
  await page.getByRole('button', { name: '결정을 봉인한다' }).click();
  await expect(page.getByRole('alert')).toContainText('왜 그렇게 판단했는지');
  await page.getByRole('textbox').fill('병력이 열세이니 수도를 옮겨 시간을 번다.');
  await shot(page, '04-decision');

  // 이유도 새로고침 후 남는다
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue('병력이 열세이니 수도를 옮겨 시간을 번다.');
  await page.getByRole('button', { name: '결정을 봉인한다' }).click();

  // 반론: 사절을 처리하지 않고 천도 → 사절 문제
  await expect(page.locator('.pushbacks')).toContainText('사절 문제');
  await page.getByRole('button', { name: '이의를 모두 들었다' }).click();
  await shot(page, '05-pushback');
  await page.getByRole('textbox').fill('사절은 돌려보냈어야 했다.');
  await page.getByRole('button', { name: '봉투를 열어 정체를 확인한다' }).click();

  await expect(page.getByRole('heading', { name: '가상 왕국 Testland' })).toBeVisible();
  await expect(page.locator('.side-by-side')).toContainText('병력이 열세이니');
  await expect(page.locator('.side-by-side')).toContainText('1888년');
  await expect(page.getByText('당신과 같은 길을 택했다.')).toBeVisible();
  await expect(page.locator('.tags').first()).toContainText('장기포석');
  await shot(page, '06-reveal');

  await page.reload();
  await expect(page.getByRole('heading', { name: '가상 왕국 Testland' })).toBeVisible();

  await page.getByRole('link', { name: '기록' }).click();
  await expect(page.locator('.records-list')).toContainText('제900호');
});

test('가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('./#/play/900');
  await page.getByRole('button', { name: '봉인을 뜯는다' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
