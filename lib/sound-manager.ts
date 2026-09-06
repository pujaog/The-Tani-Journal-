import { Howl } from 'howler'

const sounds = {
  likeTap: new Howl({ src: ['/sounds/like-tap.mp3'], preload: true }),
  commentSubmit: new Howl({ src: ['/sounds/comment-submit.mp3'], preload: true }),
  publishSuccess: new Howl({ src: ['/sounds/publish-success.mp3'], preload: true }),
  notificationPop: new Howl({ src: ['/sounds/notification-pop.mp3'], preload: true }),
}

const MUTE_KEY = 'tani-journal-muted'

export const soundManager = {
  isMuted() {
    return typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === 'true'
  },
  setMuted(muted: boolean) {
    if (typeof window !== 'undefined') window.localStorage.setItem(MUTE_KEY, String(muted))
  },
  play(name: keyof typeof sounds) {
    if (typeof window === 'undefined' || this.isMuted()) return
    sounds[name].play()
  },
}