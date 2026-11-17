// 계산 규칙 (화면과 분리해서 테스트한다)
import { addDays, dow, weekStart, toMin, fromMin, normHM, nightMin, daysText } from './dates.js'

export const TYPES = {
  check: { name: '체크', ex: 'O / △ / X로 했는지 표시 · 합계에 들어감' },
  time: { name: '시간 입력', ex: '누르면 지금 시간, 직접 입력도 가능 · 목표가 있으면 합계에 들어감' },
  toggle: { name: '켜기/끄기', ex: '했으면 켜기 · 합계에 넣을지 고를 수 있음 (켜면 달성 / 끄면 달성)' },
}
export const SCORE = { none: '합계 제외 · 횟수만 셈', on: '켜면 달성', off: '끄면 달성' }

export const live = (settings) => settings.items.filter((i) => !i.archived)
export const itemById = (settings, id) => settings.items.find((i) => i.id === id)
export const slotFor = (it, date) => (it.slots || []).find((s) => s.days.includes(dow(date)))
export const onDay = (it, date) => (it.type === 'check' ? !!slotFor(it, date) : (it.days || []).includes(dow(date)))

// 하루 기록: 항목 id를 필드명으로 값만 저장한다
//   marks   { id: "O" | "△" | "X" | null }   체크
//   times   { id: "HH:MM" | null }            시간 입력
//   toggles { id: true | false }              켜기/끄기
// 오늘(과 아직 마감하지 않은 날)은 그날 할 일을 지금 설정으로 계산한다.
// 끝난 날은 마감할 때 입력하지 않은 할 일을 빈 값(null/false)으로 채워 두므로,
// 기록에 필드가 있으면 그날 할 일, 없으면 그날 할 일이 아님('-')이다.
export const newDay = (date) => ({ date, marks: {}, times: {}, toggles: {}, note: '' })

const FIELD = { check: 'marks', time: 'times', toggle: 'toggles' }
const hasField = (d, it) => !!d?.[FIELD[it.type]] && Object.prototype.hasOwnProperty.call(d[FIELD[it.type]], it.id)

// 그날 화면에 나올 항목 (설정 순서)
export function itemsOn(settings, days, date) {
  const d = days[date]
  if (d?.closed) return settings.items.filter((it) => hasField(d, it))
  return live(settings).filter((it) => onDay(it, date))
}

// 하루 마감: 그날 할 일 중 입력하지 않은 것을 빈 값으로 채운다 (기록은 그대로)
export function closeDay(settings, day, date) {
  const d = structuredClone(day ?? newDay(date))
  live(settings).filter((it) => onDay(it, date)).forEach((it) => {
    const f = FIELD[it.type]
    d[f] = d[f] || {}
    if (!(it.id in d[f])) d[f][it.id] = it.type === 'toggle' ? false : null
  })
  d.closed = true
  return d
}

// 처음 쓴 날부터 어제까지, 아직 마감하지 않은 날을 마감한다 (기록이 없는 날도 빈 기록으로)
export function pendingCloses(settings, days, today) {
  const out = []
  for (let d = settings.startDate; d < today; d = addDays(d, 1)) {
    if (!days[d]?.closed) out.push(closeDay(settings, days[d], d))
  }
  return out
}

// 예전 형식(버전 1: scheduled 목록) 기록을 새 형식으로 바꾼다
export function migrateDay(settings, day, today) {
  if (!day || !Array.isArray(day.scheduled)) return day
  const d = structuredClone(day)
  d.marks = d.marks || {}; d.times = d.times || {}; d.toggles = d.toggles || {}
  for (const id of d.scheduled) {
    const it = itemById(settings, id)
    if (!it || it.type === 'toggle') continue
    const f = FIELD[it.type]
    if (!(id in d[f])) d[f][id] = null
  }
  delete d.scheduled
  for (const k of Object.keys(d.marks)) if (d.marks[k] === undefined) d.marks[k] = null
  if (d.date < today) {
    live(settings).filter((it) => it.type === 'toggle' && onDay(it, d.date)).forEach((it) => {
      if (!(it.id in d.toggles)) d.toggles[it.id] = false
    })
    d.closed = true
  }
  return d
}

// 시간 입력 항목의 달성 여부. 목표가 없거나 값이 없으면 null
export function timeOk(it, v) {
  const n = normHM(v)
  if (!n || !it.goal) return null
  const a = it.night ? nightMin(n) : toMin(n)
  const g = it.night ? nightMin(it.goal) : toMin(it.goal)
  return it.dir === 'after' ? a >= g : a <= g
}
// 화면에 보여 줄 시각 (밤 해석이면 0:30 → 00:30, 11:00 → 23:00)
export const timeText = (it, v) => {
  const n = normHM(v)
  if (!n) return ''
  return it.night ? fromMin(nightMin(n)) : n
}

export const counts = (it) =>
  it.type === 'check' || (it.type === 'time' && !!it.goal) || (it.type === 'toggle' && (it.score || 'none') !== 'none')

export const touched = (d) =>
  !!d && (Object.values(d.marks || {}).some(Boolean) || Object.values(d.times || {}).some(Boolean) ||
    Object.values(d.toggles || {}).some(Boolean) || !!d.note)

export function achieved(it, d) {
  if (it.type === 'check') return d.marks?.[it.id] === 'O' || d.marks?.[it.id] === '△'
  if (it.type === 'time') return !!timeOk(it, d.times?.[it.id])
  return it.score === 'on' ? !!d.toggles?.[it.id] : !d.toggles?.[it.id]
}

// 하루 합계. 아무것도 입력하지 않은 날은 0 ('끄면 달성' 항목도 점수 없음)
export function daySum(settings, days, date) {
  const list = itemsOn(settings, days, date).filter(counts)
  const d = days[date]
  let n = 0
  if (touched(d)) list.forEach((it) => { if (achieved(it, d)) n++ })
  return { n, total: list.length }
}

export const isCounted = (settings, date, today) => date >= settings.startDate && date <= today
export const isZero = (settings, days, date, today) => isCounted(settings, date, today) && daySum(settings, days, date).n === 0

// 이틀째 0 경고. 오늘은 하루가 안 끝났으므로 어제·그제가 모두 0이고 오늘도 아직 0일 때
export function warnFor(settings, days, date, today) {
  const z = (d) => isZero(settings, days, d, today)
  if (date === today) return daySum(settings, days, date).n === 0 && z(addDays(date, -1)) && z(addDays(date, -2))
  return z(date) && z(addDays(date, -1))
}

function weekBroken(settings, days, ws, today) {
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i)
    if (d >= today) break
    if (isZero(settings, days, d, today) && isZero(settings, days, addDays(d, -1), today)) return true
  }
  return false
}
// 이어간 주: 이틀 연속 0이 없었던 주가 몇 주 연속인지 (진행 중인 이번 주 포함)
export function weeksKept(settings, days, today) {
  let n = 0
  let ws = weekStart(today)
  const first = weekStart(settings.startDate)
  while (ws >= first) {
    if (weekBroken(settings, days, ws, today)) break
    n++
    ws = addDays(ws, -7)
  }
  return n
}

export const hasRecords = (days, id) =>
  Object.values(days).some((d) => d.marks?.[id] || d.times?.[id] || d.toggles?.[id])

export function summary(it) {
  if (it.type === 'check')
    return it.slots.map((s) => `${daysText(s.days)} ${s.time || '--:--'} ${s.min || 0}분${s.note ? ' ' + s.note : ''}`).join(' / ')
  if (it.type === 'time')
    return `${daysText(it.days)} · ${it.goal ? `목표 ${it.goal} ${it.dir === 'after' ? '이후' : '이전'}` : '목표 없음 (기록만)'}${it.night ? ' · 밤 해석' : ''}`
  return `${daysText(it.days)} · ${SCORE[it.score || 'none']}`
}

export const goalText = (it) => (it.goal ? `목표 ${it.goal} ${it.dir === 'after' ? '이후' : '이전'}` : '기록만')
