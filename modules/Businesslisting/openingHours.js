const TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Lagos';
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Current weekday (0 = Sun) and minutes since midnight in the platform timezone. */
function getLocalDayAndMinute(date = new Date(), timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    day: DAY_INDEX[get('weekday')],
    minute: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10),
  };
}

/** True if any interval for `now.day` contains `now.minute`. */
function isOpenAt(hours = [], now = getLocalDayAndMinute()) {
  return hours.some((h) => h.day === now.day && now.minute >= h.open && now.minute < h.close);
}

module.exports = { getLocalDayAndMinute, isOpenAt, TIMEZONE };
