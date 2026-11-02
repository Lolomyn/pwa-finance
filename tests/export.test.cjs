'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));

function setup() {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, {
      hidden: true, disabled: false, textContent: '', attrs: {},
      setAttribute(key, value) { this.attrs[key] = value; },
      removeAttribute(key) { delete this.attrs[key]; },
      focus() {}
    });
    return elements.get(id);
  };
  const downloads = [];
  const writes = [];
  let items = [
    { id: 2, date: '2027-02-20', amount: 1234.5, type: 'income', category: 'Зарплата', note: 'Бонус, "годовой"' },
    { id: 1, date: '2026-11-04', amount: 12, type: 'expense', category: 'Еда', note: 'Хлеб\nМолоко', isAdjustment: true }
  ];
  const context = vm.createContext({
    console, Date, JSON, document: { getElementById: get, body: { classList: { add() {} } } },
    getTransactionType: (item) => item.type,
    getAllExpenses: async () => structuredClone(items),
    getInitialBalance: async () => 500,
    getAllCategories: async () => [{ name: 'Еда', type: 'expense', icon: 'food' }],
    getQuickTemplates: async () => [{ id: 'q', label: 'Обед', amount: 50, type: 'expense', category: 'Еда', note: '', enabled: true, order: 0 }],
    normalizeCategoryIconKey: (key) => key,
    isSystemCategory: () => false,
    downloadFile: (...args) => downloads.push(args),
    getTodayISO: () => '2026-11-02',
    setSettings: async (data) => writes.push(data),
    updateLastBackupStatusLine() {}, hideBackupBanner() {}, syncHubOverlayLock() {},
    exportJsonButton: get('legacyJson'), exportCsvButton: get('legacyCsv'),
    clearError() {}, showError() {}
  });
  vm.runInContext(`let isAppLocked = false; let lastBackupAt = null;\n${slice('function compareExpensesByDateAscending(', 'function downloadFile(')}\n${slice('async function exportJSON(', 'function getReportPeriodLabel(')}`, context);
  return { context, get, downloads, writes,
    run: (code) => vm.runInContext(code, context),
    setItems(value) { items = value; }
  };
}

test('JSON exports all financial records, balance, categories and templates in the existing import format', async () => {
  const app = setup();
  await app.run('exportJSON()');
  const [content, filename, mime] = app.downloads[0];
  const data = JSON.parse(content);
  assert.equal(data.version, 2);
  assert.equal(data.transactions.length, 2);
  assert.equal(data.transactions[0].type, 'income');
  assert.equal(data.transactions[1].isAdjustment, true);
  assert.equal(data.initialBalance, 500);
  assert.equal(data.categories[0].icon, 'food');
  assert.equal(data.quickTemplates[0].label, 'Обед');
  assert.equal(data.pinHash, undefined);
  assert.equal(filename, 'expenses-backup-2026-11-02.json');
  assert.match(mime, /application\/json/);
  assert.equal(app.writes[0].lastBackupAt, data.exportedAt);
});

test('CSV includes all periods and both types, BOM, chronological order and escaped values', async () => {
  const app = setup();
  await app.run('exportCSV()');
  const [csv, filename] = app.downloads[0];
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(csv, /date,type,amount,category,note/);
  assert.ok(csv.indexOf('2026-11-04') < csv.indexOf('2027-02-20'));
  assert.match(csv, /"Бонус, ""годовой"""/);
  assert.match(csv, /"Хлеб\nМолоко"/);
  assert.equal(filename, 'expenses-2026-11-02.csv');
  assert.equal(app.writes.length, 0, 'CSV must not update JSON backup time');
});

test('empty database still exports valid JSON and CSV', async () => {
  const app = setup();
  app.setItems([]);
  await app.run('exportJSON()');
  await app.run('exportCSV()');
  assert.deepEqual(JSON.parse(app.downloads[0][0]).transactions, []);
  assert.equal(app.downloads[1][0], '\uFEFFdate,type,amount,category,note');
});

test('locked app cannot export or download after locking during a read', async () => {
  const app = setup();
  await assert.rejects(app.run('isAppLocked = true; exportJSON()'));
  await assert.rejects(app.run('exportCSV()'));
  app.context.getAllExpenses = async () => {
    app.run('isAppLocked = true');
    return [];
  };
  await assert.rejects(app.run('isAppLocked = false; exportCSV()'));
  assert.equal(app.downloads.length, 0);
});

test('hub export prevents repeated requests and restores buttons after success', async () => {
  const app = setup();
  const pending = app.run("handleHubExport('json')");
  assert.equal(app.get('hubExportJson').disabled, true);
  assert.equal(app.get('hubExportCsv').disabled, true);
  await app.run("handleHubExport('csv')");
  await pending;
  assert.equal(app.downloads.length, 1);
  assert.equal(app.get('hubExportJson').disabled, false);
  assert.equal(app.get('hubExportCsv').disabled, false);
  assert.equal(app.get('hubExportError').hidden, true);
  assert.match(app.get('hubExportStatus').textContent, /JSON.*передан браузеру/);
});

test('hub shows inline errors, can retry, and does not claim download success', async () => {
  const app = setup();
  app.context.getAllExpenses = async () => { throw new Error('IndexedDB error'); };
  await app.run("handleHubExport('json')");
  assert.equal(app.downloads.length, 0);
  assert.equal(app.get('hubExportStatus').hidden, true);
  assert.equal(app.get('hubExportError').hidden, false);
  assert.equal(app.get('hubExportJson').disabled, false);
  app.context.getAllExpenses = async () => [];
  await app.run("handleHubExport('csv')");
  assert.equal(app.downloads.length, 1);
  assert.equal(app.get('hubExportError').hidden, true);
});

test('hub export re-reads current storage rather than stale screen state', async () => {
  const app = setup();
  await app.run("handleHubExport('json')");
  app.setItems([{ id: 7, type: 'income', amount: 9, date: '2028-01-01', category: 'Новое', note: '' }]);
  await app.run("handleHubExport('json')");
  assert.equal(JSON.parse(app.downloads[1][0]).transactions[0].id, 7);
});
