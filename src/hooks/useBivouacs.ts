import { useState } from 'react'
import seedCsv from '../../data/Bivacco_Explorer_enrichi.csv?raw'
import controlsCsv from '../../data/Bivacco_Explorer_sources_et_controles.csv?raw'
import previousSeedCsv from '../../data/bivouacs.csv?raw'
import { mergeBivouacs, parseBivouacsCsv } from '@/lib/csv'
import { attachSourceControls } from '@/lib/enrichment'
import { createLocalRepository } from '@/lib/repository'
import type { Bivouac, BivouacChanges } from '@/types/bivouac'

const seed = attachSourceControls(parseBivouacsCsv(seedCsv, 'Bivacco_Explorer_enrichi.csv').bivouacs, controlsCsv)
const previousSeed = parseBivouacsCsv(previousSeedCsv, 'Bivacco Backlog.xlsx').bivouacs
const repository = createLocalRepository({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
}, { revision: 'enriched-2026-10', previousSeed })
export function useBivouacs() {
  const [initial] = useState(() => repository.load(seed))
  const [bivouacs, setBivouacs] = useState(initial.bivouacs)
  const [storageError, setStorageError] = useState(initial.error)
  const persist = (next: Bivouac[]) => {
    try { repository.save(next); setBivouacs(next); setStorageError(null); return true }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Enregistrement impossible.'); return false }
  }
  return {
    bivouacs, storageError, recovery: initial.recovery,
    update: (id: string, changes: BivouacChanges) => persist(bivouacs.map(item => item.id === id ? { ...item, ...changes } : item)),
    importData: (incoming: Bivouac[], isBackup = false) => persist(mergeBivouacs(bivouacs, incoming, { restorePersonalState: isBackup })),
    reset: () => { try { repository.reset(); setBivouacs(seed); setStorageError(null) } catch { setStorageError('Impossible de réinitialiser ce stockage.') } },
  }
}
