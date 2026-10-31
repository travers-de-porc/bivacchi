import { useRef, useState } from 'react'
import { Check, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { exportBivouacsCsv, parseBivouacsCsv } from '@/lib/csv'
import { downloadFile } from '@/lib/utils'
import type { Bivouac } from '@/types/bivouac'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'

export function DataDialog({ open, onOpenChange, bivouacs, onImport }: { open: boolean; onOpenChange: (open: boolean) => void; bivouacs: Bivouac[]; onImport: (bivouacs: Bivouac[], isBackup: boolean) => boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ReturnType<typeof parseBivouacsCsv> | null>(null)
  const [filename, setFilename] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function readFile(file: File | undefined) {
    if (!file) return
    setError(''); setMessage(''); setPreview(null); setBusy(true)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Trop lourd : 10 Mo maximum. La place dans le sac est réservée au saucisson.')
      const result = parseBivouacsCsv(await file.text(), file.name)
      setPreview(result); setFilename(file.name)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de lire ce fichier CSV. On a essayé, promis.') }
    finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return <Dialog open={open} onOpenChange={onOpenChange} title="Vos données, votre affaire" description="Importez un CSV ou emportez une sauvegarde complète du carnet.">
    <div className="data-dialog-body"><div className="data-option"><span className="data-option-icon"><Download size={22} /></span><div><h3>Emporter le carnet</h3><p>{bivouacs.length} lieux, leurs données sources, vos envies, visites et notes. Tout le bazar, en un seul fichier.</p><Button variant="outline" onClick={() => { downloadFile(exportBivouacsCsv(bivouacs), `bivacco-explorer-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8'); setMessage('Export prêt. Rangez-le ailleurs que dans ce navigateur : c’est tout l’intérêt.') }}><Download size={15} />Exporter en CSV</Button></div></div>
    <div className="data-option"><span className="data-option-icon"><Upload size={22} /></span><div><h3>Gaver le carnet</h3><p>CSV en UTF-8, séparé par des virgules ou des points-virgules. La colonne « Cabane / lieu » sert à reconnaître les lieux : ne l’oubliez pas.</p><input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Fichier CSV à importer" onChange={e => void readFile(e.target.files?.[0])} /><Button variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload size={15} />{busy ? 'On déchiffre…' : 'Choisir un fichier CSV'}</Button></div></div>
    {preview && <div className="import-preview"><FileSpreadsheet size={23} /><strong>{filename}</strong><p>{preview.rowCount} lignes · {preview.bivouacs.length} lieux détectés.</p><p>Les nouveaux lieux seront ajoutés, ceux qu’on connaît déjà mis à jour. Les lignes sources restent toutes là.{preview.isBackup ? ' Cette sauvegarde restaure aussi vos envies, visites et notes, comme si de rien n’était.' : ' Vos envies, visites et notes actuelles ne bougent pas.'}</p>{preview.warnings.length > 0 && <ul>{preview.warnings.slice(0,8).map((warning,i) => <li key={i}>{warning}</li>)}{preview.warnings.length > 8 && <li>Et {preview.warnings.length - 8} autres avertissements. On s’arrête là.</li>}</ul>}<Button onClick={() => { if (onImport(preview.bivouacs, preview.isBackup)) { setMessage(`${preview.bivouacs.length} lieux importés et enregistrés. Du premier coup, pour une fois.`); setPreview(null) } else setError('Import raté : rien n’a été enregistré. Le message d’alerte sur la page principale explique pourquoi.') }}><Check size={16} />Confirmer l’import</Button></div>}
    {error && <p className="notice error" role="alert">{error}</p>}{message && <p className="notice success" role="status">{message}</p>}
    <p className="local-explanation">Tout reste dans ce navigateur, et nulle part ailleurs. Exportez le carnet avant de changer d’appareil ou de vider le navigateur, sinon il faudra tout ressaisir. À la main. Lentement.</p></div>
  </Dialog>
}
