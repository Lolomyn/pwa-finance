'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'finance.js'), 'utf8')
  .replace(/\ninit\(\);\s*$/, '\n');
const workCalendar = require('../ru-work-calendar.js');

function setup() {
  class Element {
    constructor() {
      this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach((name) => this.classes.add(name)),
        remove: (...names) => names.forEach((name) => this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
        toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name)
      };
      this.style = {};
      this.value = '';
      this.textContent = '';
      this.innerHTML = '';
      this.inert = false;
      this.attributes = {};
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    insertAdjacentHTML(position, html) { this.innerHTML += html; }
    focus() { this.focused = true; }
    matches() { return false; }
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const context = vm.createContext({
    console, Date, Element, setTimeout,
    window: { RuWorkCalendar: workCalendar },
    document: {
      body: new Element(),
      getElementById: get,
      querySelector: () => null,
      querySelectorAll: () => []
    }
  });
  vm.runInContext(source, context);
  vm.runInContext(`
    state.categories = [
      {id: 1, name: 'Еда', type: 'expense'},
      {id: 2, name: 'Зарплата', type: 'income'}
    ];
    renderCalcCats = () => {};
    renderCurrentView = () => {};
    renderHistory = () => {};
    addTransactionRecord = async (data) => ({...data, id: 10});
  `, context);
  return { run: (code) => vm.runInContext(code, context), get };
}

test('new operation starts on the local current date and resets on reopening', () => {
  const { run, get } = setup();
  run('openCalc()');
  assert.equal(run('state.calcDate'), run('todayISO()'));
  assert.match(get('calcDateLabel').textContent, /^Сегодня, /);
  run("state.calcDate = '2024-02-29'; openCalc()");
  assert.equal(run('state.calcDate'), run('todayISO()'));
});

test('calendar selects one day across months and applies it without losing the draft', () => {
  const { run, get } = setup();
  run("openCalc(); state.calcDate = '2024-03-15'; state.calcExpr = '125'; openCalcDatePicker(); changePickMonth(-1); selectCalDay(29)");
  get('calcNote').value = 'Покупка';
  assert.equal(get('datePickerTitle').textContent, 'Дата операции');
  assert.equal(get('pickRangeSummary').style.display, 'none');
  assert.equal(get('pickDateSummary').hidden, false);
  assert.equal(run('isoDate(state.tempStart)'), '2024-02-29');
  assert.equal(run('isoDate(state.tempEnd)'), '2024-02-29');
  assert.equal(get('calcSheet').inert, true);
  run('applyCustomRange()');
  assert.equal(run('state.calcDate'), '2024-02-29');
  assert.equal(get('calcDateLabel').textContent, '29 фев 2024');
  assert.equal(run('state.calcExpr'), '125');
  assert.equal(get('calcNote').value, 'Покупка');
  assert.equal(get('calcSheet').classList.contains('open'), true);
  assert.equal(get('calcSheet').inert, false);
  assert.equal(get('backdrop').classList.contains('open'), true);
  assert.equal(get('datePickerModal').classList.contains('open'), false);
});

test('cancel, backdrop and Escape discard only the unconfirmed date', () => {
  for (const action of ['closeDatePicker()', 'dismissModal()', "handleKeydown({key: 'Escape'})"]) {
    const { run, get } = setup();
    run("openCalc(); state.calcDate = '2024-03-15'; openCalcDatePicker(); selectCalDay(10)");
    run(action);
    assert.equal(run('state.calcDate'), '2024-03-15');
    assert.equal(get('calcSheet').classList.contains('open'), true);
    assert.equal(get('calcSheet').inert, false);
    assert.equal(get('datePickerModal').classList.contains('open'), false);
  }
});

test('calendar keyboard input does not change the amount or save the operation', () => {
  const { run } = setup();
  run("openCalc(); state.calcExpr = '125'; openCalcDatePicker(); handleKeydown({key: '7'}); handleKeydown({key: 'Enter'})");
  assert.equal(run('state.calcExpr'), '125');
  assert.equal(run('state.transactions.length'), 0);
});

for (const type of ['expense', 'income']) {
  test(`${type} is saved with the selected day, not today`, async () => {
    const { run, get } = setup();
    run(`openCalc(); switchCalcType('${type}'); state.calcDate = '2024-02-29'; state.calcExpr = '125'`);
    get('calcNote').value = 'Проверка даты';
    await run('submitTx()');
    assert.equal(run('state.transactions.length'), 1);
    assert.equal(run('state.transactions[0].date'), '2024-02-29');
    assert.equal(run('state.transactions[0].type'), type);
    assert.equal(run('state.transactions[0].amount'), 125);
    assert.equal(run('state.transactions[0].note'), 'Проверка даты');
  });
}

test('history and statistics retain two-day range selection after the operation calendar', () => {
  const { run, get } = setup();
  run("openCalc(); openCalcDatePicker(); closeDatePicker(); openDatePicker('history', new Date(2024, 1, 1), new Date(2024, 1, 29)); selectCalDay(10); selectCalDay(12); applyCustomRange()");
  assert.equal(run('isoDate(state.historyRangeStart)'), '2024-02-10');
  assert.equal(run('isoDate(state.historyRangeEnd)'), '2024-02-12');
  run("openDatePicker('stats', new Date(2024, 1, 1), new Date(2024, 1, 29)); selectCalDay(15); selectCalDay(17)");
  assert.equal(get('pickRangeSummary').style.display, 'flex');
  assert.equal(get('pickDateSummary').hidden, true);
  assert.equal(run('isoDate(state.tempStart)'), '2024-02-15');
  assert.equal(run('isoDate(state.tempEnd)'), '2024-02-17');
});

test('date picker marks holidays and shortened days from the production calendar', () => {
  const { run, get } = setup();
  run("openCalc(); state.calcDate = '2026-11-04'; openCalcDatePicker()");

  const html = get('calDaysGrid').innerHTML;
  const day3 = html.match(/<button[^>]*data-cal-day="3"[^>]*>/)[0];
  const day4 = html.match(/<button[^>]*data-cal-day="4"[^>]*>/)[0];

  assert.match(day3, /cal-day-shortened/);
  assert.match(day4, /cal-day-holiday/);
  assert.match(get('pickDateDetails').textContent, /День народного единства/);

  run('selectCalDay(3)');
  assert.match(get('pickDateDetails').textContent, /Сокращённый день/);
  assert.equal(run('state.calcDate'), '2026-11-04');
});

test('date picker marks a working Saturday and the following transferred day off', () => {
  const { run, get } = setup();
  run("openCalc(); state.calcDate = '2027-02-20'; openCalcDatePicker()");

  const html = get('calDaysGrid').innerHTML;
  const day20 = html.match(/<button[^>]*data-cal-day="20"[^>]*>/)[0];
  const day22 = html.match(/<button[^>]*data-cal-day="22"[^>]*>/)[0];

  assert.match(day20, /cal-day-working-weekend/);
  assert.match(day20, /cal-day-shortened/);
  assert.match(day22, /cal-day-holiday/);
});

test('date picker explains that a future year is not approved yet', () => {
  const { run, get } = setup();
  run("openCalc(); state.calcDate = '2028-01-01'; openCalcDatePicker()");

  assert.equal(get('calYearNote').hidden, false);
  assert.match(get('calYearNote').textContent, /2028/);
  assert.match(get('calYearNote').textContent, /не утверждён/);
});
