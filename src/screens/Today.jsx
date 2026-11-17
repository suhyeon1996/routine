import { useEffect, useRef, useState } from 'react'
import { addDays, fromMin, label, normHM, nowHM, toMin } from '../lib/dates.js'
import { daySum, goalText, itemsOn, live, SCORE, slotFor, summary, timeOk, timeText, warnFor } from '../lib/rules.js'
import { useUI } from '../ui.jsx'

const MARKS = [['O', 'O'], ['△', 'T'], ['X', 'X']]

export default function Today({ settings, days, today, date, setDate, updateDay }) {
  const ui = useUI()
  const [showOff, setShowOff] = useState(false)
  const d = days[date]
  // 설정 순서 그대로 한 목록. 오늘은 지금 설정으로, 끝난 날은 기록에 있는 필드로
  const items = itemsOn(settings, days, date)
  const off = live(settings).filter((it) => !items.includes(it))
  const s = daySum(settings, days, date)
  const isToday = date === today

  // 지울 때는 필드를 없애지 않고 빈 값으로 둔다 (끝난 날의 할 일 목록이 유지되도록)
  const mark = (id, v) => updateDay(date, (x) => { x.marks[id] = x.marks[id] === v ? null : v })
  const toggle = (id) => updateDay(date, (x) => { x.toggles[id] = !x.toggles[id] })
  const setTime = (id, v) => updateDay(date, (x) => { x.times[id] = v || null })

  const pressTime = (it) => {
    const v = d?.times?.[it.id]
    // 빈칸 + 밤 해석이 아닌 항목 + 오늘이면 바로 지금 시간
    if (!v && !it.night && isToday) {
      const now = nowHM()
      setTime(it.id, now)
      ui.toast(`${it.name} ${now} 입력`)
      return
    }
    ui.open(<TimeSheet it={it} value={v || ''} onSave={(nv) => { setTime(it.id, nv); ui.close() }} onCancel={ui.close} />)
  }

  return (
    <>
      <div className="top">
        <button className="arr" onClick={() => setDate(addDays(date, -1))} aria-label="전날">◀</button>
        <h1>{isToday ? '오늘 · ' : ''}{label(date)}</h1>
        <button className="arr" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="다음날">▶</button>
      </div>
      {warnFor(settings, days, date, today) && (
        <div className="warn">{isToday ? '⚠ 어제와 그제 모두 0이에요. 오늘은 △ 하나라도!' : '⚠ 이틀째 0인 날이에요.'}</div>
      )}
      <div className="sec total"><span>{isToday ? '오늘' : '이날'} 합계</span><span>{s.n} / {s.total}</span></div>

      <div className="sec ls">
        {items.length === 0 && <div className="lr"><div className="tx muted">오늘 할 일이 없어요</div></div>}
        {items.map((it) => it.type === 'check'
          ? <CheckRow key={it.id} it={it} date={date} value={d?.marks?.[it.id]} onMark={(v) => mark(it.id, v)} />
          : it.type === 'time'
            ? <TimeRow key={it.id} it={it} value={d?.times?.[it.id]} onPress={() => pressTime(it)} />
            : <ToggleRow key={it.id} it={it} on={!!d?.toggles?.[it.id]} onToggle={() => toggle(it.id)} />)}
        {off.length > 0 && (
          <button className="more" onClick={() => setShowOff(!showOff)}>
            {showOff ? '오늘 없는 항목 접기' : `오늘 없는 항목 ${off.length}개 보기`}
          </button>
        )}
        {showOff && off.map((it) => (
          <div key={it.id} className="lr off">
            <div className="tx"><div className="tt">{it.name}</div><div className="sub">{summary(it)}</div></div>
            <span className="muted">-</span>
          </div>
        ))}
      </div>

      <div className="sec">
        <div className="lbl">비고</div>
        <textarea rows={2} placeholder="메모" value={d?.note || ''}
          onChange={(e) => { const v = e.target.value; updateDay(date, (x) => { x.note = v }) }} />
      </div>
    </>
  )
}

function CheckRow({ it, date, value, onMark }) {
  const sl = slotFor(it, date) || {}
  const end = sl.time && sl.min ? fromMin(toMin(sl.time) + sl.min) : ''
  return (
    <div className="lr">
      <div className="tx">
        <div className="tt">
          {sl.time && <span className="tm0">{sl.time}</span>}
          {sl.min ? <span className="du">({sl.min}분)</span> : null}
          {it.name}{it.archived && <span className="del">(삭제)</span>}
        </div>
        <div className="sub">{sl.note}{sl.note && end ? ' · ' : ''}{end ? `${sl.time}~${end}` : ''}</div>
      </div>
      <div className="btns">
        {MARKS.map(([m, c]) => (
          <button key={m} className={`${c} ${value === m ? 'sel' : ''}`} onClick={() => onMark(m)} aria-pressed={value === m}>{m}</button>
        ))}
      </div>
    </div>
  )
}

function TimeRow({ it, value, onPress }) {
  const ok = timeOk(it, value)
  return (
    <div className="lr">
      <div className="tx"><div className="tt">{it.name}{it.archived && <span className="del">(삭제)</span>}</div><div className="sub">{goalText(it)}</div></div>
      <button className={`tmb ${value ? 'set' : ''}`} onClick={onPress}>
        {value ? <>{timeText(it, value)}{ok !== null && <span className={ok ? 'ok' : 'bad'}>{ok ? '✓' : '✗'}</span>}</> : '눌러서 입력'}
      </button>
    </div>
  )
}

function ToggleRow({ it, on, onToggle }) {
  return (
    <div className="lr">
      <div className="tx"><div className="tt">{it.name}{it.archived && <span className="del">(삭제)</span>}</div><div className="sub">{SCORE[it.score || 'none']}</div></div>
      <button className={`tg ${on ? 'on' : ''} ${it.score === 'off' ? 'neg' : ''}`}
        onClick={onToggle} role="switch" aria-checked={on} aria-label={it.name} />
    </div>
  )
}

function TimeSheet({ it, value, onSave, onCancel }) {
  const ui = useUI()
  const [v, setV] = useState(value)
  const ref = useRef(null)
  useEffect(() => { if (it.night) ref.current?.focus() }, [it.night])
  const ok = () => {
    if (!v.trim()) return onSave('')
    const n = normHM(v)
    if (!n) return ui.toast('예: 07:30 또는 0730')
    onSave(n)
  }
  return (
    <>
      <div className="shead"><b>{it.name}</b><span className="muted small">{it.goal ? goalText(it) : ''}</span></div>
      <button className="big" onClick={() => onSave(nowHM())}>지금 시간 넣기 ({nowHM()})</button>
      <div className="row" style={{ border: 0 }}>
        <span>직접 입력</span>
        <input ref={ref} className="t" value={v} onChange={(e) => setV(e.target.value)} placeholder={it.goal || '07:30'}
          inputMode="numeric" onKeyDown={(e) => e.key === 'Enter' && ok()} />
      </div>
      {it.night && <div className="small muted">11:00처럼 넣어도 밤 11시로 봐요. 0~6시는 다음 날 새벽이에요.</div>}
      <div className="sh-btns">
        <button className="big ghost" onClick={() => onSave('')}>지우기</button>
        <button className="big ghost" onClick={onCancel}>취소</button>
        <button className="big" onClick={ok}>확인</button>
      </div>
    </>
  )
}
