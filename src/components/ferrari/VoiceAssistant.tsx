import { useState, useEffect, useCallback, useRef } from 'react'

/* ============================================================
   VoiceAssistant.tsx — Reconnaissance + synthèse vocale
   Web Speech API (SpeechRecognition + SpeechSynthesis)
   Modes :
   - manual : clic pour écouter, clic pour arrêter
   - wake   : écoute continue, mot-clé « Ferrari »
   ============================================================ */

const WAKE_WORDS = ['ferrari', 'hey ferrari', 'ok ferrari', 'dis ferrari']

interface VoiceAssistantProps {
  onTranscript: (text: string) => void
  onSpeak: (text: string) => void
  enabled?: boolean
  mode?: 'manual' | 'wake'
}

export function VoiceAssistant({ onTranscript, onSpeak, enabled = false, mode = 'manual' }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [interimText, setInterimText] = useState('')
  const [wakeActive, setWakeActive] = useState(false)
  const recognitionRef = useRef<any>(null)
  const wakeRestartRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const wakeActiveRef = useRef(false)

  // =========== Créer l'instance de reconnaissance ===========
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const rec = new SpeechRecognition()
    rec.lang = 'fr-FR'
    rec.interimResults = true
    rec.maxAlternatives = 1

    // Flag pour éviter double onend en mode wake
    let stoppedManually = false

    rec.onresult = (event: any) => {
      if (modeRef.current === 'wake') {
        // Mode wake : accumuler les résultats de CETTE reconnaissance
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }

        if (final) {
          const lower = final.toLowerCase().trim()
          setInterimText('')

          // Chercher le mot-clé
          const wakeIdx = WAKE_WORDS.reduce((found, word) => {
            const idx = lower.indexOf(word)
            return idx >= 0 && (found === -1 || idx < found) ? idx : found
          }, -1)

          if (wakeIdx >= 0) {
            const matchedWord = WAKE_WORDS.find(w => lower.includes(w)) || 'ferrari'
            const afterWake = final.slice(wakeIdx + matchedWord.length).trim()
            stopAndRestart(rec)
            if (afterWake) {
              // "Ferrari quelle est la météo" → envoi direct
              playChime()
              onTranscript(afterWake)
            } else {
              // Juste "Ferrari" → attendre la question
              playChime()
              sayListening() // "Je t'écoute"
              waitForQuestion(rec)
            }
          } else if (wakeActiveRef.current) {
            // On était en attente de question → envoi
            wakeActiveRef.current = false
            setWakeActive(false)
            stopAndRestart(rec)
            playChime()
            onTranscript(final.trim())
          } else {
            // Pas de mot-clé → redémarrer
            stopAndRestart(rec)
          }
        } else if (interim) {
          setInterimText(wakeActiveRef.current ? '🎤 ' + interim : '👂 ' + interim)
        }
      } else {
        // Mode manuel
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }
        if (final) {
          setInterimText('')
          onTranscript(final)
        } else {
          setInterimText(interim)
        }
      }
    }

    rec.onerror = (event: any) => {
      console.warn('[Voice] Error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSupported(false)
      }
      setIsListening(false)
      stoppedManually = true
      if (modeRef.current === 'wake' && event.error !== 'not-allowed') {
        setTimeout(() => restartRec(rec), 1000)
      }
    }

    rec.onend = () => {
      if (stoppedManually) {
        stoppedManually = false
        return
      }
      // En mode wake, si onend est appelé naturellement (timeout, silence),
      // on redémarre car on veut une écoute continue
      if (modeRef.current === 'wake' && enabledRef.current) {
        setIsListening(true)
        setTimeout(() => restartRec(rec), 300)
      } else {
        setIsListening(false)
      }
    }

    // Helpers
    function stopAndRestart(r: any) {
      stoppedManually = true
      try { r.stop() } catch {}
      wakeRestartRef.current = setTimeout(() => {
        stoppedManually = false
        restartRec(r)
      }, 500)
    }

    function restartRec(r: any) {
      if (modeRef.current !== 'wake' || !enabledRef.current) return
      try { r.start(); setIsListening(true) } catch (e) {
        // Réessayer après un délai
        setTimeout(() => {
          try { r.start(); setIsListening(true) } catch {}
        }, 1000)
      }
    }

    function sayListening() {
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance('Je t\'écoute')
          u.lang = 'fr-FR'
          u.rate = 1.2
          u.volume = 0.8
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(u)
        }
      } catch {}
    }

    function waitForQuestion(r: any) {
      wakeActiveRef.current = true
      setWakeActive(true)
      setInterimText('Je t\'écoute…')
      // La reconnaissance est déjà redémarrée par stopAndRestart
    }

    recognitionRef.current = rec

    if (mode === 'wake' && enabled) {
      try { rec.start(); setIsListening(true) } catch {}
    }

    return () => {
      stoppedManually = true
      if (wakeRestartRef.current) clearTimeout(wakeRestartRef.current)
      try { rec.stop() } catch {}
    }
  }, [mode, enabled, onTranscript])

  // =========== Synchroniser avec enabled ===========
  useEffect(() => {
    if (!recognitionRef.current || mode !== 'wake') return
    if (enabled && !isListening) {
      try { recognitionRef.current.start(); setIsListening(true) } catch {}
    } else if (!enabled && isListening) {
      try { recognitionRef.current.stop(); setIsListening(false) } catch {}
    }
  }, [enabled, mode, isListening])

  // =========== Toggle manuel ===========
  const toggleListen = useCallback(() => {
    if (!recognitionRef.current || mode !== 'manual') return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setInterimText('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }, [isListening, mode])

  // =========== Synthèse vocale ===========
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const text = e.detail
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
    window.addEventListener('voice-speak', handler as EventListener)
    return () => window.removeEventListener('voice-speak', handler as EventListener)
  }, [])

  if (!supported) return null

  return (
    <div className="flex items-center gap-2">
      {mode === 'wake' ? (
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${enabled ? (wakeActive ? 'bg-[#ffb800] animate-pulse' : 'bg-[#00ff41]') : 'bg-[#555]'}`} />
          <span className={`label-mono text-[10px] ${enabled ? (wakeActive ? 'text-[#ffb800]' : 'text-[#00ff41]') : 'text-[#555]'}`}>
            {enabled ? (wakeActive ? 'Parle…' : 'Écoute') : 'Veille'}
          </span>
          {interimText && (
            <span className="label-mono text-[#ffb800] italic truncate max-w-[100px] text-[10px]">
              {interimText}
            </span>
          )}
        </div>
      ) : (
        <>
          {interimText && (
            <span className="label-mono text-[#ffb800] italic truncate max-w-[140px]">
              🎤 {interimText}
            </span>
          )}
          <button
            onClick={toggleListen}
            disabled={!supported}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 label-mono transition text-[10px] ${
              isListening
                ? 'bg-[#dc0000] text-white animate-pulse'
                : supported
                  ? 'bg-[#0d0d0d] border border-[#2a2a2a] text-[#8a8a8a] hover:text-[#00ff41] hover:border-[#00ff41]'
                  : 'bg-[#0d0d0d] border border-[#1f1f1f] text-[#555] cursor-not-allowed'
            }`}
            title={isListening ? 'Arrêter d\'écouter' : 'Dicter une question'}
          >
            {isListening ? '🔴 Écoute…' : isSpeaking ? '🔊' : '🎤'}
          </button>
        </>
      )}
    </div>
  )
}

/** Petit bip sonore pour signaler la détection du mot-clé */
function playChime() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

/** Helper : prononcer du texte via le VoiceAssistant */
export function speakText(text: string) {
  window.dispatchEvent(new CustomEvent('voice-speak', { detail: text }))
}
