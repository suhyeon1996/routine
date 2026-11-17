// 저장소. 화면 코드는 이 파일의 함수만 쓴다.
// 나중에 클라우드 DB로 바꿀 때는 이 파일만 바꾸면 된다 (모든 함수는 Promise를 돌려준다).
const DB_NAME = 'routine'
const DB_VERSION = 1

let dbPromise = null
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings')
        if (!d.objectStoreNames.contains('days')) d.createObjectStore('days', { keyPath: 'date' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run(store, mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode)
    const result = fn(tx.objectStore(store))
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const getSettings = () => run('settings', 'readonly', (s) => s.get('main')).then((v) => v ?? null)
export const saveSettings = (settings) => run('settings', 'readwrite', (s) => { s.put(settings, 'main') })
export const getDay = (date) => run('days', 'readonly', (s) => s.get(date)).then((v) => v ?? null)
export const saveDay = (day) => run('days', 'readwrite', (s) => { s.put(day) })
export const getAllDays = () => run('days', 'readonly', (s) => s.getAll())
export const getDays = (fromDate, toDate) =>
  run('days', 'readonly', (s) => s.getAll(IDBKeyRange.bound(fromDate, toDate)))

// 백업 파일 형식
export const BACKUP_APP = 'routine'
export const BACKUP_VERSION = 1

export async function exportAll() {
  const [settings, days] = await Promise.all([getSettings(), getAllDays()])
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), settings, days }
}

export function isBackup(data) {
  return !!data && data.app === BACKUP_APP && data.version === BACKUP_VERSION &&
    !!data.settings && Array.isArray(data.settings.items) && Array.isArray(data.days)
}

// 형식을 검사한 뒤 지금 기록을 모두 바꾼다
export async function importAll(data) {
  if (!isBackup(data)) throw new Error('routine 백업이 아니에요')
  const d = await db()
  await new Promise((resolve, reject) => {
    const tx = d.transaction(['settings', 'days'], 'readwrite')
    tx.objectStore('settings').put(data.settings, 'main')
    const days = tx.objectStore('days')
    days.clear()
    data.days.forEach((day) => days.put(day))
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// 아이폰 Safari가 저장 공간을 함부로 지우지 않도록 요청 (지원할 때만)
export async function requestPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch { /* 지원하지 않으면 무시 */ }
}
