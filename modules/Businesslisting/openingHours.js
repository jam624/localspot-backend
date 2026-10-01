const TIMEZONE = process.env.APP_TIMEZONE || "Africa/Lagos";
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getLocalDayAndMinute(date = new Date(), timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return { day: DAY_INDEX[value("weekday")], minute: Number(value("hour")) * 60 + Number(value("minute")) };
}

export function isOpenAt(hours = [], now = getLocalDayAndMinute()) {
  return hours.some((item) => item.day === now.day && now.minute >= item.open && now.minute < item.close);
}
