// 아래에서 올라오는 창, 확인 창, 짧은 알림 (브라우저 기본 창은 홈 화면 앱에서 막히는 경우가 있어 직접 만든다)
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const UI = createContext(null)
export const useUI = () => useContext(UI)

export function UIProvider({ children }) {
  const [sheet, setSheet] = useState(null) // { node, onCancel }
  const [msg, setMsg] = useState('')
  const timer = useRef(null)

  const toast = useCallback((text) => {
    setMsg(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(''), 1800)
  }, [])
  const close = useCallback(() => setSheet(null), [])
  const open = useCallback((node, onCancel) => setSheet({ node, onCancel }), [])

  const confirm = useCallback((text, okText = '확인') => new Promise((resolve) => {
    const done = (v) => { setSheet(null); resolve(v) }
    open(
      <>
        <div className="sh-msg">{text}</div>
        <div className="sh-btns">
          <button className="big ghost" onClick={() => done(false)}>취소</button>
          <button className="big" onClick={() => done(true)}>{okText}</button>
        </div>
      </>,
      () => resolve(false),
    )
  }), [open])

  const askText = useCallback((title, value = '') => new Promise((resolve) => {
    open(<AskText title={title} value={value} onDone={(v) => { setSheet(null); resolve(v) }} />, () => resolve(null))
  }), [open])

  const cancel = () => { sheet?.onCancel?.(); setSheet(null) }

  return (
    <UI.Provider value={{ open, close, toast, confirm, askText }}>
      {children}
      {sheet && (
        <div className="sheetbg" onClick={(e) => { if (e.target === e.currentTarget) cancel() }}>
          <div className="sh" role="dialog">{sheet.node}</div>
        </div>
      )}
      <div className={'toast' + (msg ? ' show' : '')} role="status">{msg}</div>
    </UI.Provider>
  )
}

function AskText({ title, value, onDone }) {
  const [v, setV] = useState(value)
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const ok = () => onDone(v.trim() || null)
  return (
    <>
      <div className="shead"><b>{title}</b></div>
      <input ref={ref} className="name" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok()} />
      <div className="sh-btns">
        <button className="big ghost" onClick={() => onDone(null)}>취소</button>
        <button className="big" onClick={ok}>확인</button>
      </div>
    </>
  )
}
