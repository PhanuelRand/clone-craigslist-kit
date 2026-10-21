/**
 * Des dates pour les suites qui interrogent la découverte.
 *
 * Ces suites passent la vraie date du jour, à Madagascar. Les membres qu'elles
 * créent sont actifs aujourd'hui : au module 17, la découverte cache ceux qui
 * ne se sont pas connectés depuis plus de trente jours, et une date figée dans
 * le futur ou le passé les cacherait tous.
 *
 * Ce fichier fait partie du harnais.
 */

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function format(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

function parts(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return { year, month, day }
}

/** La date du jour à Madagascar, 'AAAA-MM-JJ'. */
export function todayInMadagascar() {
  // 'en-CA' écrit les dates au format AAAA-MM-JJ.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo' }).format(new Date())
}

/** La date `days` jours plus tard, ou plus tôt si `days` est négatif. */
export function shiftDays(date: string, days: number) {
  const { year, month, day } = parts(date)
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000)
  return format(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/** Le même jour, `years` ans plus tôt; un 29 février devient un 28 si besoin. */
export function yearsBefore(date: string, years: number) {
  const { year, month, day } = parts(date)
  const target = year - years
  const leap = (target % 4 === 0 && target % 100 !== 0) || target % 400 === 0
  return format(target, month, month === 2 && day === 29 && !leap ? 28 : day)
}

/** Une date de naissance qui donne exactement cet âge à `today`. */
export function bornAged(age: number, today: string) {
  return yearsBefore(today, age)
}
