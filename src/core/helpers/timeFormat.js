import moment from 'moment'

export function getUnixTimeStamp() {
  return Math.floor(Date.now() / 1000)
}

function normalizeToDate(input) {
  if (!input) return null

  if (typeof input === 'object' && typeof input.toDate === 'function') {
    return input.toDate()
  }

  if (input instanceof Date) {
    return input
  }

  if (typeof input === 'number') {
    const isMillis = input > 10_000_000_000
    return new Date(isMillis ? input : input * 1000)
  }

  if (typeof input === 'string') {
    const asNumber = Number(input)
    if (!Number.isNaN(asNumber)) {
      return normalizeToDate(asNumber)
    }

    const d = new Date(input)
    if (!Number.isNaN(d.getTime())) {
      return d
    }
  }

  return null
}

export function timeFormat(createdAt) {
  const date = normalizeToDate(createdAt)
  if (!date) return ''

  return moment(date).local().format('MMMM D YYYY, hh:mm A')
}