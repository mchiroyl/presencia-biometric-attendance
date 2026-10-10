const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests/e2e', timeout: 60000, workers: 1, use: { baseURL: 'http://localhost:5173', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' }, reporter: [['list'], ['html', { open: 'never' }]] });
