// 처음 실행할 때 들어가는 예시 루틴 (누구나 쓸 수 있는 예시. 개인 루틴은 넣지 않는다)
import { ALL_DAYS } from './dates.js'

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6

export const exampleItems = () => [
  { id: 'wake', type: 'time', name: '기상', days: [...ALL_DAYS], goal: '07:30', dir: 'before', night: false },
  { id: 'stretch', type: 'check', name: '스트레칭', slots: [{ days: [...ALL_DAYS], time: '07:10', min: 10, note: '' }] },
  { id: 'workout', type: 'check', name: '운동', slots: [
    { days: [MON, WED, FRI], time: '19:00', min: 30, note: '걷기' },
    { days: [TUE, THU], time: '19:00', min: 30, note: '홈트' },
  ] },
  { id: 'reading', type: 'check', name: '독서', slots: [{ days: [...ALL_DAYS], time: '22:00', min: 15, note: '' }] },
  { id: 'tidy', type: 'check', name: '정리', slots: [{ days: [SAT], time: '10:00', min: 30, note: '방 정리' }] },
  { id: 'bed', type: 'time', name: '취침', days: [...ALL_DAYS], goal: '23:30', dir: 'before', night: true },
  { id: 'latesnack', type: 'toggle', name: '야식 (먹은 날)', days: [...ALL_DAYS], score: 'off' },
  { id: 'vitamin', type: 'toggle', name: '영양제 (먹은 날)', days: [...ALL_DAYS], score: 'on' },
]

export const createSettings = (startDate) => ({
  version: 1,
  startDate,
  lastExportAt: null,
  items: exampleItems(),
})

// 새 항목의 기본값
export function blankItem(id, name, type) {
  if (type === 'check') return { id, type, name, slots: [{ days: [MON, TUE, WED, THU, FRI], time: '', min: 30, note: '' }] }
  if (type === 'time') return { id, type, name, days: [...ALL_DAYS], goal: '', dir: 'before', night: false }
  return { id, type, name, days: [...ALL_DAYS], score: 'none' }
}
