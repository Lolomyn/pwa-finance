'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '..', 'calendar.js'), 'utf8');

function setup(events) {
  const window = {};
  const document = {
    addEventListener() {},
    dispatchEvent() {},
    getElementById() { return null; }
  };

  const context = vm.createContext({
    window,
    document,
    CustomEvent: class CustomEvent {
      constructor(type) { this.type = type; }
    }
  });

  vm.runInContext(source, context, { filename: 'calendar.js' });
  window.HubCalendar.init(events);

  return window.HubCalendar;
}

const EVENTS = [
  { id: 'past-once', date: '2026-10-29', title: 'Прошедшее разовое', isYearly: false },
  { id: 'past-yearly', date: '2025-10-29', title: 'Прошедшее ежегодное', isYearly: true },
  { id: 'near-once', date: '2026-11-10', title: 'Ближайшее разовое', isYearly: false },
  { id: 'near-yearly', date: '2026-12-20', title: 'Ближайшее ежегодное', isYearly: true },
  { id: 'jan-yearly', date: '2027-01-05', title: 'Ежегодное через 61 день', isYearly: true },
  { id: 'far-yearly', date: '2027-03-01', title: 'Ежегодное через 116 дней', isYearly: true },
  { id: 'far-once', date: '2027-03-01', title: 'Разовое в марте', isYearly: false }
];

test('upcoming events skip past dates and annual repeats beyond three months', () => {
  const calendar = setup(EVENTS);
  const upcoming = calendar.getUpcoming(10, new Date(2026, 10, 5));

  assert.deepEqual(
    upcoming.map((event) => event.id),
    ['near-once', 'near-yearly', 'jan-yearly', 'far-once']
  );
  assert.deepEqual(
    upcoming.map((event) => event.date),
    ['2026-11-10', '2026-12-20', '2027-01-05', '2027-03-01']
  );
});

test('upcoming events respect the requested limit after filtering', () => {
  const calendar = setup(EVENTS);
  const upcoming = calendar.getUpcoming(2, new Date(2026, 10, 5));

  assert.deepEqual(upcoming.map((event) => event.id), ['near-once', 'near-yearly']);
});

test('an annual event appears when its next repeat is within the horizon', () => {
  const calendar = setup([
    { id: 'soon', date: '2024-12-20', title: 'Скоро', isYearly: true }
  ]);
  const upcoming = calendar.getUpcoming(10, new Date(2026, 10, 5));

  assert.deepEqual(upcoming.map((event) => event.id), ['soon']);
  assert.equal(upcoming[0].date, '2026-12-20');
});

test('a past one-time event never appears even without other events', () => {
  const calendar = setup([
    { id: 'past', date: '2026-10-29', title: 'Прошло', isYearly: false }
  ]);

  assert.deepEqual(calendar.getUpcoming(10, new Date(2026, 10, 5)), []);
});
