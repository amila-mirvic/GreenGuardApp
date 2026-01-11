import moment from 'moment';

// Some modules (onboarding/chat/admin) expect this helper.
// If missing, parts of the app (notably signup) can hang because errors thrown
// before resolving Promises leave the UI in a perpetual loading state.
//
// Returns a Unix timestamp in **seconds**.
export function getUnixTimeStamp() {
  return Math.floor(Date.now() / 1000)
}

function normalizeToDate(input) {
  if (!input) return null;

  if (typeof input === 'object' && typeof input.toDate === 'function') {
    return input.toDate();
  }

  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'number') {
    const isMillis = input > 10_000_000_000;
    return new Date(isMillis ? input : input * 1000);
  }

  if (typeof input === 'string') {
    const asNumber = Number(input);
    if (!Number.isNaN(asNumber)) {
      return normalizeToDate(asNumber);
    }
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function timeFormat(createdAt) {
  const date = normalizeToDate(createdAt);
  if (!date) return '';

  const m = moment(date).local();
  const day = m.format('ddd');
  const time = m.format('hh:mm A');

  return `${day} ${time}`;
}
