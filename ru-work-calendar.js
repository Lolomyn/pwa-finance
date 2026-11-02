'use strict';

/*
 * Производственный календарь России для пятидневной рабочей недели.
 *
 * Данные лежат отдельно от интерфейса, чтобы новый год можно было добавить
 * без изменения календарей и расчёта рабочих дней. Для 2026 и 2027 годов
 * переносы и сокращённые дни взяты из постановлений Правительства РФ.
 *
 * Чтобы актуализировать следующий год:
 * 1. Добавьте объект года в YEARS по образцу соседних.
 * 2. Укажите праздники, перенесённые выходные, рабочие субботы и сокращённые дни.
 * 3. Обновите source, sourceUrl и updatedAt.
 * 4. Увеличьте CACHE_NAME в sw.js.
 */

(function (global) {
  const FIXED_HOLIDAYS = {
    '01-01': 'Новогодние каникулы',
    '01-02': 'Новогодние каникулы',
    '01-03': 'Новогодние каникулы',
    '01-04': 'Новогодние каникулы',
    '01-05': 'Новогодние каникулы',
    '01-06': 'Новогодние каникулы',
    '01-07': 'Рождество Христово',
    '01-08': 'Новогодние каникулы',
    '02-23': 'День защитника Отечества',
    '03-08': 'Международный женский день',
    '05-01': 'Праздник Весны и Труда',
    '05-09': 'День Победы',
    '06-12': 'День России',
    '11-04': 'День народного единства'
  };

  const YEARS = {
    2026: {
      source: 'Постановление Правительства РФ от 24.09.2025 № 1466',
      sourceUrl: 'http://publication.pravo.gov.ru/document/0001202509240023',
      updatedAt: '2025-09-24',
      holidays: {
        '2026-01-01': 'Новогодние каникулы',
        '2026-01-02': 'Новогодние каникулы',
        '2026-01-03': 'Новогодние каникулы',
        '2026-01-04': 'Новогодние каникулы',
        '2026-01-05': 'Новогодние каникулы',
        '2026-01-06': 'Новогодние каникулы',
        '2026-01-07': 'Рождество Христово',
        '2026-01-08': 'Новогодние каникулы',
        '2026-02-23': 'День защитника Отечества',
        '2026-03-08': 'Международный женский день',
        '2026-05-01': 'Праздник Весны и Труда',
        '2026-05-09': 'День Победы',
        '2026-06-12': 'День России',
        '2026-11-04': 'День народного единства'
      },
      transfers: {
        '2026-01-09': 'Перенос выходного с 3 января',
        '2026-03-09': 'Перенос выходного с 8 марта',
        '2026-05-11': 'Перенос выходного с 9 мая',
        '2026-12-31': 'Перенос выходного с 4 января'
      },
      workingWeekends: {},
      shortened: {
        '2026-04-30': 'Сокращённый день перед 1 мая',
        '2026-05-08': 'Сокращённый день перед 9 мая',
        '2026-06-11': 'Сокращённый день перед Днём России',
        '2026-11-03': 'Сокращённый день перед Днём народного единства'
      }
    },
    2027: {
      source: 'Постановление Правительства РФ от 17.09.2026 № 1187',
      sourceUrl: 'http://publication.pravo.gov.ru/document/0001202609180037',
      updatedAt: '2026-09-17',
      holidays: {
        '2027-01-01': 'Новогодние каникулы',
        '2027-01-02': 'Новогодние каникулы',
        '2027-01-03': 'Новогодние каникулы',
        '2027-01-04': 'Новогодние каникулы',
        '2027-01-05': 'Новогодние каникулы',
        '2027-01-06': 'Новогодние каникулы',
        '2027-01-07': 'Рождество Христово',
        '2027-01-08': 'Новогодние каникулы',
        '2027-02-23': 'День защитника Отечества',
        '2027-03-08': 'Международный женский день',
        '2027-05-01': 'Праздник Весны и Труда',
        '2027-05-09': 'День Победы',
        '2027-06-12': 'День России',
        '2027-11-04': 'День народного единства'
      },
      transfers: {
        '2027-02-22': 'Перенос выходного с 20 февраля',
        '2027-05-03': 'Перенос выходного с 1 мая',
        '2027-05-10': 'Перенос выходного с 9 мая',
        '2027-06-14': 'Перенос выходного с 12 июня',
        '2027-11-05': 'Перенос выходного с 2 января',
        '2027-12-31': 'Перенос выходного с 3 января'
      },
      workingWeekends: {
        '2027-02-20': 'Рабочая суббота (перенос с 20 на 22 февраля)'
      },
      shortened: {
        '2027-02-20': 'Сокращённый рабочий день',
        '2027-04-30': 'Сокращённый день перед 1 мая',
        '2027-06-11': 'Сокращённый день перед Днём России',
        '2027-11-03': 'Сокращённый день перед Днём народного единства'
      }
    }
  };

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(value) {
    const parts = String(value).split('-').map(Number);
    const date = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeDate(value) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    return parseISO(value);
  }

  function isWeekend(date) {
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6;
  }

  function fixedHolidayFor(date) {
    return FIXED_HOLIDAYS[`${pad(date.getMonth() + 1)}-${pad(date.getDate())}`] || null;
  }

  function getYearData(year) {
    return YEARS[year] || null;
  }

  function isKnownYear(year) {
    return Boolean(getYearData(year));
  }

  function getYears() {
    return Object.keys(YEARS).map(Number).sort((left, right) => left - right);
  }

  function getDayInfo(value) {
    const date = normalizeDate(value);

    if (!date) {
      return null;
    }

    const iso = toISO(date);
    const year = date.getFullYear();
    const data = getYearData(year);
    const weekend = isWeekend(date);
    let holidayName = null;
    let transferName = null;
    let workingWeekendName = null;
    let shortenedName = null;

    if (data) {
      holidayName = data.holidays[iso] || null;
      transferName = data.transfers[iso] || null;
      workingWeekendName = data.workingWeekends[iso] || null;
      shortenedName = data.shortened[iso] || null;
    } else {
      holidayName = fixedHolidayFor(date);
    }

    const isWorkingWeekend = Boolean(workingWeekendName);
    const isHoliday = Boolean(holidayName);
    const isTransfer = Boolean(transferName);
    const isWorking = isWorkingWeekend || (!weekend && !isHoliday && !isTransfer);
    const isNonWorking = !isWorking;
    const isShortened = Boolean(shortenedName);

    let label = 'Рабочий день';

    if (isWorkingWeekend) {
      label = workingWeekendName;
    } else if (isHoliday) {
      label = holidayName;
    } else if (isTransfer) {
      label = transferName;
    } else if (weekend) {
      label = 'Выходной';
    }

    if (isShortened && isWorkingWeekend) {
      label = `${workingWeekendName}; ${shortenedName.toLowerCase()}`;
    } else if (isShortened) {
      label = `${label}; ${shortenedName.toLowerCase()}`;
    }

    return {
      iso,
      year,
      date,
      weekday: date.getDay(),
      isWeekend: weekend,
      isWorking,
      isNonWorking,
      isNonWorkingWeekday: isNonWorking && !weekend,
      isHoliday,
      holidayName,
      isTransfer,
      transferName,
      isWorkingWeekend,
      workingWeekendName,
      isShortened,
      shortenedName,
      label,
      isEstimated: !data,
      source: data ? data.source : null,
      sourceUrl: data ? data.sourceUrl : null,
      updatedAt: data ? data.updatedAt : null
    };
  }

  function getMonthStats(year, month) {
    const data = getYearData(year);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const stats = {
      year,
      month,
      daysInMonth,
      workingDays: 0,
      nonWorkingDays: 0,
      weekendDays: 0,
      nonWorkingWeekdays: 0,
      shortenedDays: 0,
      workingWeekends: 0,
      isEstimated: !data
    };

    for (let day = 1; day <= daysInMonth; day += 1) {
      const info = getDayInfo(new Date(year, month, day));

      if (!info) {
        continue;
      }

      if (info.isWorking) {
        stats.workingDays += 1;
      } else {
        stats.nonWorkingDays += 1;
      }

      if (info.isWeekend) {
        stats.weekendDays += 1;
      }

      if (info.isNonWorkingWeekday) {
        stats.nonWorkingWeekdays += 1;
      }

      if (info.isShortened) {
        stats.shortenedDays += 1;
      }

      if (info.isWorkingWeekend) {
        stats.workingWeekends += 1;
      }
    }

    return stats;
  }

  function getYearStats(year) {
    const totals = {
      year,
      workingDays: 0,
      nonWorkingDays: 0,
      weekendDays: 0,
      nonWorkingWeekdays: 0,
      shortenedDays: 0,
      workingWeekends: 0,
      isEstimated: !getYearData(year)
    };

    for (let month = 0; month < 12; month += 1) {
      const stats = getMonthStats(year, month);
      totals.workingDays += stats.workingDays;
      totals.nonWorkingDays += stats.nonWorkingDays;
      totals.weekendDays += stats.weekendDays;
      totals.nonWorkingWeekdays += stats.nonWorkingWeekdays;
      totals.shortenedDays += stats.shortenedDays;
      totals.workingWeekends += stats.workingWeekends;
    }

    return totals;
  }

  const api = {
    getDayInfo,
    getMonthStats,
    getYearStats,
    getYearData,
    isKnownYear,
    getYears
  };

  global.RuWorkCalendar = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
