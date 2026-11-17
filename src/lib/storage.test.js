import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import * as store from './storage.js'
import { createSettings } from './defaults.js'

describe('저장소', () => {
  it('설정과 하루 기록을 저장하고 다시 읽는다', async () => {
    expect(await store.getSettings()).toBeNull()
    const s = createSettings('2026-11-16')
    await store.saveSettings(s)
    expect((await store.getSettings()).startDate).toBe('2026-11-16')

    const day = { date: '2026-11-17', scheduled: ['wake'], marks: {}, times: { wake: '07:20' }, toggles: {}, note: '' }
    await store.saveDay(day)
    expect(await store.getDay('2026-11-17')).toEqual(day)
    expect(await store.getDays('2026-11-16', '2026-11-18')).toHaveLength(1)
  })

  it('백업을 내보내고 불러오면 기록이 모두 바뀐다', async () => {
    const backup = await store.exportAll()
    expect(store.isBackup(backup)).toBe(true)

    const other = { ...backup, settings: { ...backup.settings, startDate: '2026-12-01' }, days: [{ date: '2026-12-01', scheduled: [], marks: {}, times: {}, toggles: {}, note: 'x' }] }
    await store.importAll(other)
    expect((await store.getSettings()).startDate).toBe('2026-12-01')
    expect((await store.getAllDays()).map((d) => d.date)).toEqual(['2026-12-01'])
  })

  it('routine 백업이 아니면 불러오지 않는다', async () => {
    expect(store.isBackup({ app: 'other' })).toBe(false)
    await expect(store.importAll({ app: 'other' })).rejects.toThrow()
  })
})
