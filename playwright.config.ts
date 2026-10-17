import { defineConfig, devices } from '@playwright/test';

// e2e는 가상 픽스처 시나리오로 빌드한다. 시나리오 JSON만 바꿔도 코드 수정 없이 돈다는 것을 겸해서 확인한다.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/historygame/',
    ...devices['Pixel 7'],
  },
  webServer: {
    command:
      'tsx scripts/build-scenarios.ts tests/fixtures/scenarios && vite build --outDir dist-e2e && vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173/historygame/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
