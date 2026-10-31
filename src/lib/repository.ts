import type { Bivouac } from '@/types/bivouac'
import { exportBivouacsCsv, parseBivouacsCsv } from './csv'
import { updateSeed } from './seed-update'

export const STORAGE_KEY = 'bivacco-explorer:v1'
interface StoredData { version: 1; csv: string; savedAt: string; seedRevision?: string }
interface SeedUpdate { revision: string; previousSeed: Bivouac[] }
export interface LoadResult { bivouacs: Bivouac[]; error: string | null; recovery: string | null }
export interface BivouacRepository {
  load(seed: Bivouac[]): LoadResult
  save(bivouacs: Bivouac[]): void
  reset(): void
}
/** Replace this adapter when a remote repository is introduced; UI does not access storage. */
export function createLocalRepository(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, seedUpdate?: SeedUpdate): BivouacRepository {
  let blocked = false
  return {
    load(seed) {
      let raw: string | null = null
      try {
        raw = storage.getItem(STORAGE_KEY)
        if (!raw) return { bivouacs: seed, error: null, recovery: null }
        const stored: unknown = JSON.parse(raw)
        if (!stored || typeof stored !== 'object' || !('version' in stored) || stored.version !== 1 || !('csv' in stored) || typeof stored.csv !== 'string') {
          throw new Error('Format de sauvegarde inconnu ou version plus récente.')
        }
        if (seedUpdate && 'seedRevision' in stored && stored.seedRevision !== seedUpdate.revision) {
          throw new Error('Version du jeu de données non prise en charge.')
        }
        const { bivouacs } = parseBivouacsCsv(stored.csv, 'Sauvegarde locale')
        const refreshed = seedUpdate && !('seedRevision' in stored)
          ? updateSeed(bivouacs, seedUpdate.previousSeed, seed)
          : bivouacs
        return { bivouacs: refreshed, error: null, recovery: null }
      } catch {
        blocked = true
        return { bivouacs: seed, error: 'La sauvegarde locale ne peut pas être lue. Vos données sont conservées. Téléchargez une copie avant de réinitialiser.', recovery: raw }
      }
    },
    save(bivouacs) {
      if (blocked) throw new Error('Sauvegarde protégée : récupérez vos données puis réinitialisez le stockage avant de modifier le carnet.')
      const data: StoredData = {
        version: 1, csv: exportBivouacsCsv(bivouacs), savedAt: new Date().toISOString(),
        ...(seedUpdate ? { seedRevision: seedUpdate.revision } : {}),
      }
      try { storage.setItem(STORAGE_KEY, JSON.stringify(data)) }
      catch { throw new Error('Enregistrement impossible : le stockage du navigateur est indisponible ou plein. Aucune modification n’a été enregistrée.') }
    },
    reset() { storage.removeItem(STORAGE_KEY); blocked = false },
  }
}
