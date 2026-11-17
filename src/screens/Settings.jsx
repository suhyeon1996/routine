import { useEffect, useRef, useState } from 'react'
import { DOW, WEEK_ORDER } from '../lib/dates.js'
import { hasRecords, live, summary, TYPES } from '../lib/rules.js'
import { blankItem } from '../lib/defaults.js'
import TimeField from '../components/TimeField.jsx'
import { useUI } from '../ui.jsx'

export default function Settings({ settings, days, updateSettings }) {
  const ui = useUI()
  const [open, setOpen] = useState({})
  const list = live(settings)

  // 항목 하나를 바꾸기
  const edit = (id, fn) => updateSettings((s) => fn(s.items.find((i) => i.id === id)))

  const move = (it, dir) => updateSettings((s) => {
    const l = s.items.filter((x) => !x.archived)
    const me = l.find((x) => x.id === it.id)
    const other = l[l.indexOf(me) + dir]
    if (!other) return
    const i = s.items.indexOf(me), k = s.items.indexOf(other)
    ;[s.items[i], s.items[k]] = [s.items[k], s.items[i]]
  })
  const rename = async (it) => {
    const n = await ui.askText('이름 바꾸기', it.name)
    if (n) edit(it.id, (x) => { x.name = n })
  }
  const remove = async (it) => {
    if (await ui.confirm(`'${it.name}'을(를) 삭제할까요? 지난 기록은 남아요.`, '삭제')) edit(it.id, (x) => { x.archived = true })
  }
  const add = () => ui.open(<AddSheet onCancel={ui.close} onAdd={(name, type) => {
    const it = blankItem('i' + Date.now().toString(36), name, type)
    updateSettings((s) => { s.items.push(it) })
    setOpen((o) => ({ ...o, [it.id]: true }))
    ui.close()
    ui.toast(`${name} 추가됨 · 요일과 시간을 정해요`)
  }} />)

  const toggleDay = (it, d, si) => edit(it.id, (x) => {
    if (si === undefined) {
      x.days = x.days.includes(d) ? x.days.filter((v) => v !== d) : [...x.days, d]
      return
    }
    const slot = x.slots[si]
    if (slot.days.includes(d)) { slot.days = slot.days.filter((v) => v !== d); return }
    // 한 요일은 한 줄에만: 다른 줄에 있으면 이 줄로 옮긴다
    const other = x.slots.find((s, k) => k !== si && s.days.includes(d))
    if (other) { other.days = other.days.filter((v) => v !== d); ui.toast(`${DOW[d]}요일을 이 줄로 옮겼어요`) }
    slot.days.push(d)
  })
  const changeType = (it, t) => {
    if (it.type === t || hasRecords(days, it.id)) return
    edit(it.id, (x) => { const n = blankItem(x.id, x.name, t); Object.keys(x).forEach((k) => delete x[k]); Object.assign(x, n) })
  }
  const delSlot = async (it, si) => {
    if (await ui.confirm('이 요일·시간 줄을 지울까요?', '지우기')) edit(it.id, (x) => { x.slots.splice(si, 1) })
  }

  const Chips = ({ it, si }) => {
    const on = si === undefined ? it.days : it.slots[si].days
    return (
      <div className="chips">
        {WEEK_ORDER.map((d) => (
          <button key={d} className={on.includes(d) ? 'on' : ''} onClick={() => toggleDay(it, d, si)} aria-pressed={on.includes(d)}>{DOW[d]}</button>
        ))}
      </div>
    )
  }

  const Editor = ({ it }) => {
    const lock = hasRecords(days, it.id)
    return (
      <div className="edit">
        <div className="row" style={{ border: 0, minHeight: 40 }}>
          <span className="small muted">입력 방식{lock ? ' · 기록이 있어 바꿀 수 없어요' : ''}</span>
          <div className={`seg ${lock ? 'lock' : ''}`}>
            {Object.keys(TYPES).map((t) => (
              <button key={t} className={it.type === t ? 'on' : ''} disabled={lock} onClick={() => changeType(it, t)}>{TYPES[t].name}</button>
            ))}
          </div>
        </div>
        {it.type === 'check' && <>
          {it.slots.map((s, si) => (
            <div key={si} className="slot">
              <Chips it={it} si={si} />
              <div className="slotin">
                <TimeField className="s-time" value={s.time} onCommit={(v) => edit(it.id, (x) => { x.slots[si].time = v })} />
                <MinField value={s.min} onCommit={(v) => edit(it.id, (x) => { x.slots[si].min = v })} />
                <span className="small muted">분</span>
                <NoteField value={s.note} onCommit={(v) => edit(it.id, (x) => { x.slots[si].note = v })} />
                {it.slots.length > 1 && <button className="x" onClick={() => delSlot(it, si)} aria-label="이 줄 삭제">✕</button>}
              </div>
            </div>
          ))}
          <button className="addslot" onClick={() => edit(it.id, (x) => { x.slots.push({ days: [], time: '', min: 30, note: '' }) })}>+ 요일·시간 줄 추가</button>
        </>}
        {it.type === 'time' && (
          <div className="slot">
            <Chips it={it} />
            <div className="slotin">
              <span className="small muted">목표</span>
              <TimeField className="s-time" value={it.goal} placeholder="없음" onCommit={(v) => edit(it.id, (x) => { x.goal = v })} />
              <div className="seg">
                <button className={it.dir !== 'after' ? 'on' : ''} onClick={() => edit(it.id, (x) => { x.dir = 'before' })}>이전</button>
                <button className={it.dir === 'after' ? 'on' : ''} onClick={() => edit(it.id, (x) => { x.dir = 'after' })}>이후</button>
              </div>
              <span className="small muted">달성</span>
            </div>
            <div className="slotin" style={{ justifyContent: 'space-between' }}>
              <span className="small">밤 시간 해석 <span className="muted">(11:00 → 23:00, 0~6시 → 다음 날 새벽)</span></span>
              <button className={`tg ${it.night ? 'on' : ''}`} role="switch" aria-checked={!!it.night} aria-label="밤 시간 해석"
                onClick={() => edit(it.id, (x) => { x.night = !x.night })} />
            </div>
          </div>
        )}
        {it.type === 'toggle' && (
          <div className="slot">
            <Chips it={it} />
            <div className="slotin" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">합계</span>
              <div className="seg">
                {[['none', '안 넣음'], ['on', '켜면 달성'], ['off', '끄면 달성']].map(([k, l]) => (
                  <button key={k} className={(it.score || 'none') === k ? 'on' : ''} onClick={() => edit(it.id, (x) => { x.score = k })}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="top"><h1>설정</h1></div>
      <div className="sec">
        <div className="lbl">항목 · 오늘 화면과 이번 주 표에 이 순서대로 나와요</div>
        {list.map((it, idx) => (
          <div key={it.id} className="it">
            <div className="ithead">
              <span className="nm"><span className={`badge ${it.type}`}>{TYPES[it.type].name}</span><span>{it.name}</span></span>
              <span className="menu">
                <button disabled={idx === 0} onClick={() => move(it, -1)} aria-label="위로">↑</button>
                <button disabled={idx === list.length - 1} onClick={() => move(it, 1)} aria-label="아래로">↓</button>
                <button onClick={() => rename(it)} aria-label="이름 바꾸기">✎</button>
                <button onClick={() => remove(it)} aria-label="삭제">🗑</button>
              </span>
            </div>
            {open[it.id]
              ? <>{Editor({ it })}<button className="addslot" onClick={() => setOpen({ ...open, [it.id]: false })}>접기 ▲</button></>
              : <button className="summary" onClick={() => setOpen({ ...open, [it.id]: true })}>{summary(it)} · <span className="link">편집 ▼</span></button>}
          </div>
        ))}
        <button className="add" onClick={add}>+ 항목 추가</button>
      </div>
      <div className="small muted" style={{ padding: '0 4px' }}>한 요일은 한 줄에만 들어가요. 삭제한 항목은 숨겨지고 지난 기록은 남아요. 설정은 이 휴대폰에만 저장돼요.</div>
    </>
  )
}

function MinField({ value, onCommit }) {
  const [v, setV] = useState(String(value || ''))
  useEffect(() => setV(String(value || '')), [value])
  return (
    <input className="s-min" value={v} placeholder="30" inputMode="numeric" onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = parseInt(v, 10); const m = n > 0 ? n : 0; setV(m ? String(m) : ''); if (m !== value) onCommit(m) }} />
  )
}

function NoteField({ value, onCommit }) {
  const [v, setV] = useState(value || '')
  useEffect(() => setV(value || ''), [value])
  return <input className="s-note" value={v} placeholder="내용 (선택)" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />
}

function AddSheet({ onAdd, onCancel }) {
  const ui = useUI()
  const [name, setName] = useState('')
  const [type, setType] = useState('check')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const ok = () => (name.trim() ? onAdd(name.trim(), type) : ui.toast('이름을 넣어 주세요'))
  return (
    <>
      <div className="shead"><b>항목 추가</b></div>
      <input ref={ref} className="name" placeholder="이름 (예: 스트레칭)" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="typepick">
        {Object.entries(TYPES).map(([k, t]) => (
          <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>
            <span className={`badge ${k}`}>{t.name}</span><span className="ex">{t.ex}</span>
          </button>
        ))}
      </div>
      <div className="sh-btns">
        <button className="big ghost" onClick={onCancel}>취소</button>
        <button className="big" onClick={ok}>추가</button>
      </div>
    </>
  )
}
