'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const calendar = require('../ru-work-calendar.js');

function day(value) {
  return calendar.getDayInfo(value);
}

test('2026 and 2027 match the five-day production calendar totals', () => {
  for (const year of [2026, 2027]) {
    const stats = calendar.getYearStats(year);
    assert.equal(stats.workingDays, 247, `${year}: рабочих дней`);
    assert.equal(stats.nonWorkingDays, 118, `${year}: выходных и праздников`);
    assert.equal(stats.shortenedDays, 4, `${year}: сокращённых дней`);
  }

  assert.equal(calendar.getYearStats(2026).workingWeekends, 0);
  assert.equal(calendar.getYearStats(2027).workingWeekends, 1);
});

test('2026 holidays, transfers and shortened days are marked', () => {
  assert.equal(day('2026-11-04').isHoliday, true);
  assert.equal(day('2026-11-04').isWorking, false);
  assert.equal(day('2026-11-03').isWorking, true);
  assert.equal(day('2026-11-03').isShortened, true);
  assert.equal(day('2026-01-09').isTransfer, true);
  assert.equal(day('2026-01-09').isWorking, false);
  assert.equal(day('2026-12-31').isTransfer, true);
  assert.equal(day('2026-12-31').isWorking, false);
  assert.equal(day('2026-05-08').isShortened, true);
  assert.equal(day('2026-06-11').isShortened, true);
});

test('2027 transfers, working Saturday and shortened days are marked', () => {
  const saturday = day('2027-02-20');
  assert.equal(saturday.isWeekend, true);
  assert.equal(saturday.isWorkingWeekend, true);
  assert.equal(saturday.isWorking, true);
  assert.equal(saturday.isShortened, true);

  assert.equal(day('2027-02-22').isTransfer, true);
  assert.equal(day('2027-02-22').isWorking, false);
  assert.equal(day('2027-05-03').isTransfer, true);
  assert.equal(day('2027-05-10').isTransfer, true);
  assert.equal(day('2027-06-14').isTransfer, true);
  assert.equal(day('2027-11-05').isTransfer, true);
  assert.equal(day('2027-12-31').isTransfer, true);
  assert.equal(day('2027-04-30').isShortened, true);
  assert.equal(day('2027-06-11').isShortened, true);
  assert.equal(day('2027-11-03').isShortened, true);
  assert.equal(day('2027-01-11').isWorking, true);
});

test('unknown years fall back to weekends and federal holidays', () => {
  const info = day('2028-01-01');
  assert.equal(info.isHoliday, true);
  assert.equal(info.isWorking, false);
  assert.equal(info.isEstimated, true);
  assert.equal(calendar.isKnownYear(2028), false);
});

test('month statistics include holidays and working weekends', () => {
  const november2026 = calendar.getMonthStats(2026, 10);
  assert.equal(november2026.daysInMonth, 30);
  assert.equal(november2026.workingDays, 20);
  assert.equal(november2026.nonWorkingWeekdays, 1);

  const february2027 = calendar.getMonthStats(2027, 1);
  assert.equal(february2027.workingDays, 19);
  assert.equal(february2027.workingWeekends, 1);
  assert.equal(february2027.nonWorkingWeekdays, 2);
});
