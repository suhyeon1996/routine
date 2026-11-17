import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, today as todayYmd, weekStart } from './lib/dates.js'
import { migrateDay, newDay, pendingCloses } from './lib/rules.js'
import { createSettings } from './lib/defaults.js'
import * as store from './lib/storage.js'
import { useUI } from './ui.jsx'
import Today from './screens/Today.jsx'
import Week from './screens/Week.jsx'
import Settings from './screens/Settings.jsx'
import Backup from './screens/Backup.jsx'

const TABS = [
  ['today', '☑', '오늘'],
  ['week', '▦', '이번 주'],
  ['settings', '⚙', '설정'],
  ['backup', '⇅', '백업'],
]

export default function App() {
  const ui = useUI()
  const [settings, setSettings] = useState(null)
  const [days, setDays] = useState({})
  const [error, setError] = useState('')
  const [today, setToday] = useState(todayYmd())
  const [tab, setTab] = useState('today')
  const [cur, setCur] = useState(todayYmd())
  const [wk, setWk] = useState(weekStart(todayYmd()))
  const settingsRef = useRef(null)
  const daysRef = useRef({})
  const mainRef = useRef(null)

  const load = useCallback(async () => {
    let s = await store.getSettings()
    if (!s) {
      s = createSettings(todayYmd())
      await store.saveSettings(s)
    }
    const all = await store.getAllDays()
    const t = todayYmd()
    const map = {}
    const changed = []
    // 예전 형식 기록은 새 형식으로 바꾼다
    for (const d of all) {
      const m = migrateDay(s, d, t)
      map[m.date] = m
      if (m !== d) changed.push(m)
    }
    // 끝난 날 마감: 입력하지 않은 할 일을 빈 값으로 채워 둔다
    for (const d of pendingCloses(s, map, t)) { map[d.date] = d; changed.push(d) }
    await Promise.all(changed.map((d) => store.saveDay(d)))
    settingsRef.current = s
    daysRef.current = map
    setSettings(s)
    setDays(map)
  }, [])

  useEffect(() => {
    load().catch((e) => setError('기록을 불러오지 못했어요: ' + e.message))
    store.requestPersist()
  }, [load])

  // 앱을 다시 열었을 때 날짜가 바뀌었으면 오늘로
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== 'visible') return
      const t = todayYmd()
      setToday((prev) => {
        if (prev !== t) {
          setCur(t); setWk(weekStart(t))
          // 날짜가 바뀌었으면 어제까지 마감
          if (settingsRef.current) {
            const closed = pendingCloses(settingsRef.current, daysRef.current, t)
            if (closed.length) {
              daysRef.current = { ...daysRef.current, ...Object.fromEntries(closed.map((d) => [d.date, d])) }
              setDays(daysRef.current)
              closed.forEach((d) => store.saveDay(d))
            }
          }
        }
        return t
      })
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])

  const saveFailed = (e) => ui.toast('저장하지 못했어요: ' + e.message)

  // 하루 기록 바꾸기 (입력한 값만 필드로 저장)
  const updateDay = useCallback((date, fn) => {
    const base = daysRef.current[date] ?? newDay(date)
    const d = structuredClone(base)
    fn(d)
    daysRef.current = { ...daysRef.current, [date]: d }
    setDays(daysRef.current)
    store.saveDay(d).catch(saveFailed)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback((fn) => {
    const s = structuredClone(settingsRef.current)
    fn(s)
    settingsRef.current = s
    setSettings(s)
    store.saveSettings(s).catch(saveFailed)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (t) => {
    setTab(t)
    if (t === 'today') setCur(today)
    if (t === 'week') setWk(weekStart(today))
    mainRef.current?.scrollTo(0, 0)
  }
  const openDay = (date) => { setCur(date); setTab('today'); mainRef.current?.scrollTo(0, 0) }

  if (error) return <div className="app"><main className="main"><div className="warn">{error}</div></main></div>
  if (!settings) return <div className="app"><main className="main muted">불러오는 중…</main></div>

  const backupDue = !settings.lastExportAt || settings.lastExportAt <= addDays(today, -14)
  const common = { settings, days, today, updateDay, updateSettings }

  return (
    <div className="app">
      <main className="main" ref={mainRef}>
        {tab === 'today' && <Today {...common} date={cur} setDate={setCur} />}
        {tab === 'week' && <Week {...common} wk={wk} setWk={setWk} openDay={openDay} />}
        {tab === 'settings' && <Settings {...common} />}
        {tab === 'backup' && <Backup {...common} reload={load} />}
      </main>
      <nav className="tabs">
        {TABS.map(([key, ic, name]) => (
          <button key={key} className={(tab === key ? 'on' : '') + (key === 'backup' && backupDue ? ' dot' : '')} onClick={() => go(key)}>
            <span className="ic">{ic}</span>{name}
          </button>
        ))}
      </nav>
    </div>
  )
}
