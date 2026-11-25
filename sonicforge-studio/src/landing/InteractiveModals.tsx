import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Lock, Mail, Sparkles, User, X } from 'lucide-react'
import { LuvenLogo, LuvenWaveformMark } from './LuvenIcons'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function AuthModal({
  mode,
  onClose,
  onSwitchMode,
}: {
  mode: 'login' | 'signup' | null
  onClose: () => void
  onSwitchMode: (m: 'login' | 'signup') => void
}) {
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSubmitted(false)
    setError('')
  }, [mode])

  useEffect(() => {
    if (!mode) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mode, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Masukkan alamat email yang valid.')
      return
    }
    if (password.trim().length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    setError('')
    setSubmitted(true)
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={onClose}
        >
          {/* Bottom Sheet on HP (<640px), Centered Dialog on >=640px, Scrollable Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="luven-auth-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[#E4E4E7] bg-white px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[#0F0F10] shadow-2xl sm:max-h-[88dvh] sm:max-w-[420px] sm:rounded-2xl sm:p-6"
          >
            {/* Mobile Sheet Grab Handle */}
            <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E4E4E7] sm:hidden" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dialog"
              className="absolute right-3.5 top-3.5 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#E4E4E7] text-[#52525B] transition-colors active:bg-[#F4F4F5] [@media(hover:hover)]:hover:bg-[#F4F4F5] [@media(hover:hover)]:hover:text-[#0F0F10] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pr-10">
              <LuvenLogo variant="dark" />
              <h2 id="luven-auth-title" className="mt-4 text-[22px] font-bold tracking-[-0.02em]">
                {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun Luven baru'}
              </h2>
              <p className="mt-1 text-[13.5px] text-[#52525B]">
                {mode === 'login'
                  ? 'Masuk untuk menyimpan preset dan proyek sound Anda di cloud.'
                  : 'Bergabung bersama kreator audio dan mulai berkarya.'}
              </p>
            </div>

            {submitted ? (
              <div className="rounded-xl border border-[#E4E4E7] bg-[#F4F4F5] p-4 text-center">
                <CheckCircle2 size={28} className="mx-auto text-[#0F0F10]" />
                <p className="mt-2 text-[14px] font-semibold text-[#0F0F10]">
                  Sistem autentikasi sedang disiapkan
                </p>
                <p className="mt-1 text-[13px] text-[#52525B]">
                  Sementara itu, Anda dapat langsung menggunakan seluruh fitur Sound Creator tanpa perlu login.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#0F0F10] text-[14px] font-semibold text-white transition-colors [@media(hover:hover)]:hover:bg-[#27272A]"
                >
                  Mengerti
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-[#0F0F10]">Nama Lengkap</label>
                    <div className="relative">
                      <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nama kreator Anda"
                        className="min-h-11 w-full rounded-xl border border-[#E4E4E7] bg-white pl-10 pr-3.5 text-[14px] text-[#0F0F10] outline-none transition-colors focus:border-[#0F0F10]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-[#0F0F10]">Email</label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="min-h-11 w-full rounded-xl border border-[#E4E4E7] bg-white pl-10 pr-3.5 text-[14px] text-[#0F0F10] outline-none transition-colors focus:border-[#0F0F10]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-[#0F0F10]">Kata Sandi</label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="min-h-11 w-full rounded-xl border border-[#E4E4E7] bg-white pl-10 pr-3.5 text-[14px] text-[#0F0F10] outline-none transition-colors focus:border-[#0F0F10]"
                    />
                  </div>
                </div>

                {error && <p className="text-[12.5px] font-medium text-[#5B1A2B]">{error}</p>}

                <button
                  type="submit"
                  className="mt-1 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#5B1A2B] text-[14px] font-semibold text-white transition-colors [@media(hover:hover)]:hover:bg-[#702237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B1A2B]"
                >
                  {mode === 'login' ? 'Login' : 'Sign Up'}
                </button>
              </form>
            )}

            <div className="mt-5 border-t border-[#E4E4E7] pt-4 text-center text-[13px] text-[#52525B]">
              {mode === 'login' ? (
                <>
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => onSwitchMode('signup')}
                    className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-[#0F0F10] underline underline-offset-2"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => onSwitchMode('login')}
                    className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-[#0F0F10] underline underline-offset-2"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ComingSoonToast({
  notice,
  onDismiss,
  onOpenStudio,
}: {
  notice: { title: string; desc: string } | null
  onDismiss: () => void
  onOpenStudio: () => void
}) {
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(onDismiss, 4800)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 items-start gap-3.5 rounded-2xl border border-[#27272A] bg-[#0F0F10] p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <LuvenWaveformMark size={20} color="#FFFFFF" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[14px] font-semibold">{notice.title}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#5B1A2B] px-2 py-0.5 text-[10.5px] font-semibold text-white">
                <Sparkles size={10} />
                Coming Soon
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#A1A1AA]">{notice.desc}</p>
            <button
              type="button"
              onClick={() => {
                onDismiss()
                onOpenStudio()
              }}
              className="mt-1 inline-flex min-h-9 cursor-pointer items-center text-[12.5px] font-semibold text-white underline underline-offset-2 [@media(hover:hover)]:hover:text-[#E4E4E7]"
            >
              Coba Sound Creator sekarang →
            </button>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup notifikasi"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#A1A1AA] transition-colors [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
