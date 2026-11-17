import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, today as todayYmd, weekStart } from './lib/dates.js'
import { newDay } from './lib/rules.js'
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
    const map = Object.fromEntries(all.map((d) => [d.date, d]))
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
        if (prev !== t) { setCur(t); setWk(weekStart(t)) }
        return t
      })
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])

  const saveFailed = (e) => ui.toast('저장하지 못했어요: ' + e.message)

  // 하루 기록 바꾸기 (처음 저장할 때 그날 할 일 목록이 함께 고정된다)
  const updateDay = useCallback((date, fn) => {
    const base = daysRef.current[date] ?? newDay(settingsRef.current, date)
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
