import { addDays, DOW, dow, parseYmd, short } from '../lib/dates.js'
import { achieved, counts, daySum, isCounted, itemsOn, timeOk, timeText, touched, weeksKept } from '../lib/rules.js'

export default function Week({ settings, days, today, wk, setWk, openDay }) {
  const dates = [...Array(7)].map((_, i) => addDays(wk, i))
  const blank = (d) => !isCounted(settings, d, today)
  // 날짜별 그날 할 일 (오늘 이후는 지금 설정, 끝난 날은 기록의 필드)
  const onMap = Object.fromEntries(dates.map((d) => [d, new Set(itemsOn(settings, days, d).map((it) => it.id))]))
  const isOn = (it, d) => onMap[d].has(it.id)
  // 설정 순서 그대로 한 표. 삭제한 항목은 이번 주에 그날 할 일이었던 날이 있을 때만
  const rowItems = settings.items.filter((it) => !it.archived || dates.some((d) => isOn(it, d)))

  const Cell = ({ d, cls, children }) => (
    <td className={`c ${cls || ''}`} onClick={() => openDay(d)}>{children}</td>
  )

  const itemRow = (it) => {
    let n = 0, t = 0
    const cells = dates.map((d) => {
      if (!isOn(it, d)) return <td key={d} className="dash">-</td>
      if (blank(d)) return <td key={d} />
      const day = days[d]
      if (it.type === 'check') {
        t++
        const v = day?.marks?.[it.id] || ''
        if (v === 'O' || v === '△') n++
        return <Cell key={d} d={d} cls={v === 'O' ? 'cO' : v === '△' ? 'cT' : v === 'X' ? 'cX' : ''}>{v}</Cell>
      }
      if (it.goal) t++
      const v = day?.times?.[it.id]
      if (!v) return <Cell key={d} d={d} />
      const ok = timeOk(it, v)
      if (ok) n++
      return <Cell key={d} d={d} cls={`hm ${ok === null ? '' : ok ? 'cO' : 'cX'}`}>{timeText(it, v)}</Cell>
    })
    return <tr key={it.id}><td className="nm">{it.name}</td>{cells}<td className="tot">{counts(it) ? `${n}/${t}` : '-'}</td></tr>
  }

  const toggleRow = (it) => {
    const sc = counts(it)
    let c = 0, n = 0, t = 0
    const cells = dates.map((d) => {
      if (!isOn(it, d)) return <td key={d} className="dash">-</td>
      if (blank(d)) return <td key={d} />
      const day = days[d]
      const on = !!day?.toggles?.[it.id]
      if (on) c++
      if (!sc) return <Cell key={d} d={d} cls="muted">{on ? '✓' : ''}</Cell>
      t++
      const ok = touched(day) && achieved(it, day)
      if (ok) n++
      return <Cell key={d} d={d} cls={touched(day) ? (ok ? 'cO' : 'cX') : ''}>{on ? '✓' : ''}</Cell>
    })
    return (
      <tr key={it.id}>
        <td className={`nm ${sc ? '' : 'muted'}`}>{it.name.replace(/\s*\(.*\)/, '')}</td>{cells}
        <td className="tot">{sc ? `${n}/${t}` : `${c}회`}</td>
      </tr>
    )
  }

  let sn = 0, st = 0
  const sumCells = dates.map((d) => {
    if (blank(d)) return <td key={d} />
    const s = daySum(settings, days, d)
    sn += s.n; st += s.total
    return <td key={d} className={s.n === 0 ? 'zero' : ''}>{s.n}</td>
  })

  return (
    <>
      <div className="top">
        <button className="arr" onClick={() => setWk(addDays(wk, -7))} aria-label="지난주">◀</button>
        <h1>{short(wk)} ~ {short(addDays(wk, 6))}</h1>
        <button className="arr" onClick={() => setWk(addDays(wk, 7))} disabled={addDays(wk, 7) > today} aria-label="다음 주">▶</button>
      </div>
      <div className="sec"><div className="row" style={{ border: 0 }}><span>이어간 주</span><b>{weeksKept(settings, days, today)}주째</b></div></div>
      <div className="sec" style={{ padding: '6px' }}>
        <table className="wk">
          <colgroup><col className="nmc" />{dates.map((d) => <col key={d} />)}<col className="totc" /></colgroup>
          <thead>
            <tr><th />{dates.map((d) => <th key={d} className={d === today ? 'today' : ''}>{DOW[dow(d)]}<br />{parseYmd(d).getDate()}</th>)}<th>합계</th></tr>
          </thead>
          <tbody>
            {rowItems.map((it) => (it.type === 'toggle' ? toggleRow(it) : itemRow(it)))}
            <tr className="sum"><td className="nm">하루</td>{sumCells}<td className="tot">{sn}/{st}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="small muted" style={{ padding: '0 4px' }}>빈칸 = 미입력 · - = 그날 없음 · 칸을 누르면 그날로 이동 · ◀로 지난주 보기</div>
    </>
  )
}
