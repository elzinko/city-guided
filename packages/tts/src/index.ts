export type SpeakOptions = { lang?: string; voice?: string; rate?: number }

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisAvailable()) return []
  return speechSynthesis.getVoices() || []
}

/**
 * Try to speak using browser SpeechSynthesis.
 * Returns true if speech was successfully queued, false otherwise.
 */
export function speakBrowser(text: string, opts?: SpeakOptions): boolean {
  if (!isSpeechSynthesisAvailable()) return false
  try {
    const u = new SpeechSynthesisUtterance(text)
    if (opts?.lang) u.lang = opts.lang
    if (opts?.rate) u.rate = opts.rate!
    const voices = getAvailableVoices()
    if (opts?.voice) {
      const v = voices.find((x) => x.name === opts.voice)
      if (v) u.voice = v
    }
    speechSynthesis.speak(u)
    return true
  } catch (e) {
    console.error('TTS speak failed', e)
    return false
  }
}
