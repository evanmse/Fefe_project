import { useState, useEffect, useCallback, useRef } from 'react'

/* ============================================================
   VoiceAssistant.tsx — Reconnaissance + synthèse vocale
   Web Speech API (SpeechRecognition + SpeechSynthesis)
   ============================================================ */

interface VoiceAssistantProps {
  onTranscript: (text: string) => void
  onSpeak: (text: string) => void
  enabled?: boolean
}

export function VoiceAssistant({ onTranscript, onSpeak, enabled = false }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'fr-FR'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
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

    rec.onerror = (event: any) => {
      console.warn('[Voice] Error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSupported(false)
      }
      setIsListening(false)
    }

    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
  }, [onTranscript])

  const toggleListen = useCallback(() => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setInterimText('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }, [isListening])

  // Expose speak function for external use
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

  if (!supported && !enabled) return null

  return (
    <div className="flex items-center gap-2">
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
    </div>
  )
}

/** Helper : prononcer du texte via le VoiceAssistant */
export function speakText(text: string) {
  window.dispatchEvent(new CustomEvent('voice-speak', { detail: text }))
}
