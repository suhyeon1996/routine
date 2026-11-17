// 날짜와 시간 계산 (로컬 시간 기준, 주의 시작은 월요일)

export const DOW = ['일', '월', '화', '수', '목', '금', '토']
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const today = () => ymd(new Date())
export const addDays = (s, n) => {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
export const dow = (s) => parseYmd(s).getDay()
export const weekStart = (s) => addDays(s, -((dow(s) + 6) % 7))
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5)

export const label = (s) => {
  const d = parseYmd(s)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`
}
export const short = (s) => {
  const d = parseYmd(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
export const daysText = (days) => {
  const o = WEEK_ORDER.filter((d) => days.includes(d))
  if (o.length === 7) return '매일'
  return o.length ? o.map((d) => DOW[d]).join('·') : '요일 없음'
}

// "7:30", "0730", "07:30" → "07:30". 형식이 틀리면 null
export function normHM(v) {
  const m = String(v ?? '').trim().match(/^(\d{1,2}):?(\d{2})$/)
  if (!m || +m[1] > 23 || +m[2] > 59) return null
  return `${pad(+m[1])}:${m[2]}`
}
export const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
export const fromMin = (n) => `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`
export const nowHM = () => {
  const n = new Date()
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`
}

// 밤 시간 해석: 0~6시는 다음 날 새벽(+24), 6~18시는 밤으로(+12), 18~24시는 그대로
export function nightMin(hm) {
  const h = +hm.slice(0, 2)
  const m = +hm.slice(3)
  const t = h < 6 ? h + 24 : h < 18 ? h + 12 : h
  return t * 60 + m
}
