import { describe, expect, it } from 'vitest'
import { nightMin, normHM, weekStart } from './dates.js'
import { closeDay, daySum, itemsOn, migrateDay, newDay, pendingCloses, timeOk, timeText, warnFor, weeksKept } from './rules.js'

// 테스트용 설정: 2026-11-16(월) 시작
const settings = () => ({
  startDate: '2026-11-16',
  items: [
    { id: 'wake', type: 'time', name: '기상', days: [0, 1, 2, 3, 4, 5, 6], goal: '07:30', dir: 'before', night: false },
    { id: 'run', type: 'check', name: '운동', slots: [{ days: [1, 3, 5], time: '19:00', min: 30, note: '' }] },
    { id: 'read', type: 'check', name: '독서', slots: [{ days: [0, 1, 2, 3, 4, 5, 6], time: '22:00', min: 15, note: '' }] },
    { id: 'bed', type: 'time', name: '취침', days: [0, 1, 2, 3, 4, 5, 6], goal: '23:00', dir: 'before', night: true },
    { id: 'snack', type: 'toggle', name: '야식', days: [0, 1, 2, 3, 4, 5, 6], score: 'off' },
    { id: 'note', type: 'toggle', name: '기록만', days: [0, 1, 2, 3, 4, 5, 6], score: 'none' },
  ],
})
const day = (s, date, fn) => { const d = newDay(date); fn?.(d); return d }
const ids = (list) => list.map((it) => it.id)

describe('시간 입력', () => {
  it('여러 형식을 HH:MM으로 맞춘다', () => {
    expect(normHM('7:30')).toBe('07:30')
    expect(normHM('0730')).toBe('07:30')
    expect(normHM('24:00')).toBeNull()
    expect(normHM('abc')).toBeNull()
  })
  it('밤 시간 해석: 0~6시는 다음 날, 6~18시는 +12시간', () => {
    expect(nightMin('11:00')).toBe(23 * 60)
    expect(nightMin('00:30')).toBe(24 * 60 + 30)
    expect(nightMin('22:40')).toBe(22 * 60 + 40)
    expect(nightMin('12:30')).toBe(24 * 60 + 30)
  })
  it('취침: 11:00은 달성, 00:30은 미달성으로 보고 00:30으로 표시', () => {
    const bed = settings().items[3]
    expect(timeOk(bed, '11:00')).toBe(true)
    expect(timeOk(bed, '23:00')).toBe(true)
    expect(timeOk(bed, '00:30')).toBe(false)
    expect(timeText(bed, '11:00')).toBe('23:00')
    expect(timeText(bed, '0:30')).toBe('00:30')
  })
  it('기상: 목표 이전이면 달성, 이후 기준도 된다', () => {
    const wake = settings().items[0]
    expect(timeOk(wake, '07:20')).toBe(true)
    expect(timeOk(wake, '07:40')).toBe(false)
    expect(timeOk({ ...wake, dir: 'after' }, '07:40')).toBe(true)
    expect(timeOk({ ...wake, goal: '' }, '07:40')).toBeNull()
  })
})

describe('하루 합계', () => {
  it('O와 △는 달성, 그날 할 일이 아닌 항목(-)은 뺀다', () => {
    const s = settings()
    // 11/17은 화요일: 운동 없음 → 기상, 독서, 취침, 야식 = 4
    const days = { '2026-11-17': day(s, '2026-11-17', (d) => { d.marks.read = '△'; d.times.wake = '08:00' }) }
    expect(daySum(s, days, '2026-11-17')).toEqual({ n: 2, total: 4 }) // 독서 △ + 야식 안 먹음
  })
  it('끄면 달성 항목은 켜면 점수가 빠진다', () => {
    const s = settings()
    const days = { '2026-11-16': day(s, '2026-11-16', (d) => { d.marks.run = 'O'; d.toggles.snack = true }) }
    expect(daySum(s, days, '2026-11-16')).toEqual({ n: 1, total: 5 })
  })
  it('아무것도 입력하지 않은 날은 0', () => {
    const s = settings()
    expect(daySum(s, {}, '2026-11-16').n).toBe(0)
    expect(daySum(s, { '2026-11-16': day(s, '2026-11-16') }, '2026-11-16').n).toBe(0)
  })
})

describe('그날 할 일 목록 (필드명:값 저장)', () => {
  it('오늘은 기록이 있어도 지금 설정으로 계산: 새 항목이 바로 들어간다', () => {
    const s = settings()
    const days = { '2026-11-17': day(s, '2026-11-17', (d) => { d.marks.read = 'O' }) }
    s.items.push({ id: 'getup', type: 'check', name: '침대 나가기', slots: [{ days: [2], time: '07:00', min: 5, note: '' }] })
    expect(ids(itemsOn(s, days, '2026-11-17'))).toContain('getup')
    expect(daySum(s, days, '2026-11-17').total).toBe(5)
  })
  it('마감하면 입력하지 않은 할 일이 빈 값으로 채워지고, 입력한 값은 그대로', () => {
    const s = settings()
    const d = closeDay(s, day(s, '2026-11-16', (x) => { x.marks.run = 'O' }), '2026-11-16')
    expect(d.closed).toBe(true)
    expect(d.marks).toEqual({ run: 'O', read: null })
    expect(d.times).toEqual({ wake: null, bed: null })
    expect(d.toggles).toEqual({ snack: false, note: false })
  })
  it('마감한 날은 설정을 바꿔도 목록이 그대로, 오늘 이후는 새 설정', () => {
    const s = settings()
    const days = { '2026-11-16': closeDay(s, undefined, '2026-11-16') }
    s.items[1].slots[0].days = [2] // 운동을 월·수·금 → 화
    expect(ids(itemsOn(s, days, '2026-11-16'))).toContain('run')
    expect(ids(itemsOn(s, days, '2026-11-18'))).not.toContain('run')
    expect(ids(itemsOn(s, days, '2026-11-17'))).toContain('run')
  })
  it('마감한 날: 입력 안 한 할 일은 빈칸으로 남아 합계 분모에 들어간다', () => {
    const s = settings()
    const days = { '2026-11-16': closeDay(s, day(s, '2026-11-16', (x) => { x.marks.run = 'O' }), '2026-11-16') }
    expect(daySum(s, days, '2026-11-16')).toEqual({ n: 2, total: 5 }) // 운동 O + 야식 안 먹음
  })
  it('처음 쓴 날부터 어제까지 마감 안 한 날만 마감 (기록 없는 날 포함)', () => {
    const s = settings()
    const days = { '2026-11-16': closeDay(s, undefined, '2026-11-16'), '2026-11-17': day(s, '2026-11-17') }
    expect(pendingCloses(s, days, '2026-11-19').map((d) => d.date)).toEqual(['2026-11-17', '2026-11-18'])
  })
  it('예전 형식(scheduled 목록)은 필드로 바꾼다', () => {
    const s = settings()
    const old = { date: '2026-11-17', scheduled: ['wake', 'read', 'bed'], marks: { read: 'O' }, times: {}, toggles: {}, note: '' }
    const m = migrateDay(s, old, '2026-11-18')
    expect(m.scheduled).toBeUndefined()
    expect(m.closed).toBe(true)
    expect(m.marks).toEqual({ read: 'O' })
    expect(m.times).toEqual({ wake: null, bed: null })
    expect(m.toggles).toEqual({ snack: false, note: false })
    const todayOld = migrateDay(s, { ...old, date: '2026-11-18' }, '2026-11-18')
    expect(todayOld.closed).toBeUndefined() // 오늘 기록은 마감하지 않음
  })
})

describe('이틀째 0 경고와 이어간 주', () => {
  const s = settings()
  const ok = (date) => day(s, date, (d) => { d.marks.read = 'O' })
  it('오늘: 어제와 그제가 0이고 오늘도 0이면 경고', () => {
    const days = { '2026-11-16': ok('2026-11-16') }
    expect(warnFor(s, days, '2026-11-19', '2026-11-19')).toBe(true) // 17, 18 모두 0
    expect(warnFor(s, days, '2026-11-18', '2026-11-18')).toBe(false) // 17만 0, 16은 달성
    days['2026-11-19'] = ok('2026-11-19')
    expect(warnFor(s, days, '2026-11-19', '2026-11-19')).toBe(false) // 오늘 달성하면 사라짐
  })
  it('처음 쓴 날 이전은 계산하지 않는다', () => {
    expect(warnFor(s, {}, '2026-11-16', '2026-11-16')).toBe(false)
    expect(warnFor(s, {}, '2026-11-17', '2026-11-17')).toBe(false)
  })
  it('지난 날: 그날과 전날이 모두 0이면 경고', () => {
    expect(warnFor(s, {}, '2026-11-17', '2026-11-20')).toBe(true)
    expect(warnFor(s, {}, '2026-11-16', '2026-11-20')).toBe(false)
  })
  it('이어간 주: 이틀 연속 0이 없었던 주를 이번 주부터 거꾸로 센다', () => {
    const all = {}
    for (let i = 0; i < 21; i++) {
      const d = new Date(2026, 10, 16 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      all[key] = ok(key)
    }
    expect(weekStart('2026-12-03')).toBe('2026-11-30')
    expect(weeksKept(s, all, '2026-12-03')).toBe(3)
    delete all['2026-11-24']; delete all['2026-11-25'] // 둘째 주 화·수가 0
    expect(weeksKept(s, all, '2026-12-03')).toBe(1)
  })
})
