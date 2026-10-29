import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog } from './ui/dialog'
interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [help, setHelp] = useState(false)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt) }
    const onInstalled = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt); window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  if (installed) return null
  return <><Button variant="ghost" size="sm" className="install-button" aria-label="Installer l’application" onClick={async () => { if (!prompt) { setHelp(true); return }; await prompt.prompt(); await prompt.userChoice; setPrompt(null) }}><Download size={16} /><span>Installer l’app</span></Button><Dialog open={help} onOpenChange={setHelp} title="Le carnet vous accompagne" description="Installez Bivacco Explorer sur votre écran d’accueil."><div className="install-help"><Smartphone size={38} /><p><strong>Sur iPhone ou iPad</strong><br />Dans Safari, ouvrez le menu de partage puis « Sur l’écran d’accueil ».</p><p><strong>Sur Android ou ordinateur</strong><br />Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p><p className="muted">L’installation nécessite HTTPS (ou localhost). Après une première ouverture, le carnet reste accessible hors connexion. Les photos externes et le fond de carte nécessitent Internet.</p></div></Dialog></>
}
