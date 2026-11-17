// 시간 입력칸: 입력하는 동안은 자유롭게, 칸을 벗어날 때 "07:30" 형식으로 저장
import { useEffect, useState } from 'react'
import { normHM } from '../lib/dates.js'
import { useUI } from '../ui.jsx'

export default function TimeField({ value, onCommit, placeholder = '19:00', className = 't' }) {
  const ui = useUI()
  const [v, setV] = useState(value || '')
  useEffect(() => setV(value || ''), [value])
  const commit = () => {
    if (!v.trim()) { if (value) onCommit(''); return }
    const n = normHM(v)
    if (n) { setV(n); if (n !== value) onCommit(n) }
    else { ui.toast('예: 07:30 또는 0730'); setV(value || '') }
  }
  return (
    <input className={className} value={v} placeholder={placeholder} inputMode="numeric"
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  )
}
