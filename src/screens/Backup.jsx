import { useRef, useState } from 'react'
import { daysBetween, label, today as todayYmd } from '../lib/dates.js'
import * as store from '../lib/storage.js'
import { useUI } from '../ui.jsx'

export default function Backup({ settings, today, updateSettings, reload }) {
  const ui = useUI()
  const fileRef = useRef(null)
  const last = settings.lastExportAt
  const ago = last ? daysBetween(last, today) : null
  const due = ago === null || ago >= 14

  const fileName = () => `routine-backup-${todayYmd()}.json`
  const markExported = () => updateSettings((s) => { s.lastExportAt = todayYmd() })
  const backupText = async () => {
    const data = await store.exportAll()
    data.settings = { ...data.settings, lastExportAt: todayYmd() }
    return JSON.stringify(data)
  }

  const saveFile = async () => {
    const url = URL.createObjectURL(new Blob([await backupText()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName()
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    markExported()
    ui.toast('파일로 저장했어요')
  }

  // 아이폰 공유 창(카카오톡, 메일, 파일 앱 등). 공유를 못 하는 브라우저는 파일로 저장
  const share = async () => {
    const file = new File([await backupText()], fileName(), { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'routine 백업' })
        markExported()
        ui.toast('공유했어요')
      } else {
        ui.toast('이 브라우저는 공유를 못 해서 파일로 저장해요')
        await saveFile()
      }
    } catch (e) {
      if (e.name !== 'AbortError') ui.toast('공유하지 못했어요')
    }
  }

  const copy = async () => {
    const text = await backupText()
    try {
      await navigator.clipboard.writeText(text)
      markExported()
      ui.toast(`복사했어요 (${Math.max(1, Math.round(text.length / 1024))}KB)`)
    } catch {
      // 복사가 막히면 글자를 보여 주고 직접 복사
      ui.open(<>
        <div className="shead"><b>아래 글자를 모두 복사하세요</b></div>
        <textarea rows={8} readOnly value={text} onFocus={(e) => e.target.select()} autoFocus />
        <button className="big" onClick={ui.close}>닫기</button>
      </>)
    }
  }

  const importText = async (text) => {
    let data
    try { data = JSON.parse(text) } catch { data = null }
    if (!store.isBackup(data)) return ui.toast('routine 백업이 아니에요')
    if (!(await ui.confirm(`${data.days.length}일치 기록을 불러올까요? 지금 기록은 모두 덮어써요.`, '불러오기'))) return
    try {
      await store.importAll(data)
      await reload()
      ui.toast('불러왔어요')
    } catch (e) {
      ui.toast('불러오지 못했어요: ' + e.message)
    }
  }

  const paste = () => ui.open(<PasteSheet onCancel={ui.close} onOk={(t) => { ui.close(); importText(t) }} />)

  return (
    <>
      <div className="top"><h1>백업</h1></div>
      <div className="sec">
        <div className="lbl">마지막 내보내기</div>
        <div className="row" style={{ border: 0 }}>
          {last ? <>{label(last)} <span className={due ? 'bad' : 'muted'}>{ago === 0 ? '오늘' : `${ago}일 전`}</span></> : <span className="muted">아직 없음</span>}
        </div>
      </div>
      {due && <div className="warn">2주 넘게 백업하지 않았어요. 아이폰은 오래 안 쓰면 기록을 지울 수 있어요.</div>}
      <div className="sec">
        <div className="lbl">보내기</div>
        <button className="big" onClick={share}>공유하기 (카톡 등)</button>
        <div className="sh-btns">
          <button className="big ghost" onClick={copy}>텍스트로 복사</button>
          <button className="big ghost" onClick={saveFile}>파일로 저장</button>
        </div>
        <div className="small muted" style={{ paddingBottom: 8 }}>공유하기 → 아이폰 공유 창에서 카카오톡 → '나와의 채팅'에 파일로 보내면 편해요. 텍스트로 복사는 메모장이나 카톡에 붙여 넣을 수 있어요.</div>
      </div>
      <div className="sec">
        <div className="lbl">불러오기</div>
        <div className="sh-btns">
          <button className="big ghost" onClick={() => fileRef.current?.click()}>파일에서</button>
          <button className="big ghost" onClick={paste}>붙여 넣어서</button>
        </div>
        <div className="small muted" style={{ paddingBottom: 8 }}>불러오면 지금 기록을 모두 덮어써요. 불러오기 전에 한 번 더 물어봐요.</div>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importText(await f.text()) }} />
    </>
  )
}

function PasteSheet({ onOk, onCancel }) {
  const [v, setV] = useState('')
  return (
    <>
      <div className="shead"><b>백업 글자 붙여 넣기</b></div>
      <textarea rows={8} value={v} onChange={(e) => setV(e.target.value)} placeholder='{"app":"routine", ...' autoFocus />
      <div className="sh-btns">
        <button className="big ghost" onClick={onCancel}>취소</button>
        <button className="big" onClick={() => onOk(v)}>불러오기</button>
      </div>
    </>
  )
}
