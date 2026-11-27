import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Lock,
  Palette,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
} from 'lucide-react'
import { PlanId } from '../config/plans'
import { uploadCreatorImage } from '../lib/platformStore'
import {
  contrastRatio,
  CURATED_FONT_PAIRS,
  DEFAULT_FREE_THEME,
  DEFAULT_PROFILE_SETTINGS,
  ProfileSettings,
  ProfileThemeConfig,
  suggestAccessibleTextColor,
  THEME_PRESETS,
} from '../lib/themeConfig'
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Slider,
  Tabs,
  UnstyledButton,
  useToast,
} from './primitives'

type StudioTab = 'presets' | 'colors' | 'shapes' | 'typo' | 'seo'

interface PersonalPreset {
  id: string
  name: string
  theme: ProfileThemeConfig
}

const PERSONAL_PRESETS_KEY = 'luven.personal_theme_presets'

function loadPersonalPresets(): PersonalPreset[] {
  try {
    const raw = localStorage.getItem(PERSONAL_PRESETS_KEY)
    return raw ? (JSON.parse(raw) as PersonalPreset[]) : []
  } catch {
    return []
  }
}

export function AppearanceStudio({
  userId,
  effectivePlan,
  theme,
  settings,
  onChangeTheme,
  onChangeSettings,
  onSave,
  saving,
  onRequirePro,
}: {
  userId: string
  effectivePlan: PlanId
  theme: ProfileThemeConfig
  settings: ProfileSettings
  onChangeTheme: (t: ProfileThemeConfig) => void
  onChangeSettings: (s: ProfileSettings) => void
  onSave: () => Promise<void>
  saving: boolean
  onRequirePro: (featureName: string) => void
}) {
  const { pushToast } = useToast()
  const [tab, setTab] = useState<StudioTab>('presets')
  const [uploadingBg, setUploadingBg] = useState(false)
  const [personalPresets, setPersonalPresets] = useState<PersonalPreset[]>(loadPersonalPresets)
  const [newPresetName, setNewPresetName] = useState('')
  const bgInputRef = useRef<HTMLInputElement>(null)
  const ogInputRef = useRef<HTMLInputElement>(null)

  const isPro = effectivePlan === 'pro'

  const requireProOr = (featureName: string, fn: () => void) => {
    if (!isPro) {
      onRequirePro(featureName)
      return
    }
    fn()
  }

  const patchTheme = (patch: Partial<ProfileThemeConfig>, featureLabel = 'Kustomisasi Tampilan Pro') => {
    requireProOr(featureLabel, () => onChangeTheme({ ...theme, ...patch }))
  }

  const patchSettings = (patch: Partial<ProfileSettings>, featureLabel = 'Pengaturan Pro') => {
    requireProOr(featureLabel, () => onChangeSettings({ ...settings, ...patch }))
  }

  const handleRandomize = () => {
    requireProOr('Acak Tema Otomatis', () => {
      const proList = THEME_PRESETS.filter((p) => p.proOnly)
      const pick = proList[Math.floor(Math.random() * proList.length)]
      if (pick) onChangeTheme({ ...pick.theme })
    })
  }

  const handleReset = () => {
    onChangeTheme({ ...DEFAULT_FREE_THEME })
    if (isPro) onChangeSettings({ ...DEFAULT_PROFILE_SETTINGS })
    pushToast('Tampilan dikembalikan ke pengaturan awal.')
  }

  const handleSavePersonalPreset = () => {
    requireProOr('Simpan Preset Tema Pribadi', () => {
      const label = newPresetName.trim() || `Tema Kustom ${personalPresets.length + 1}`
      const next = [{ id: crypto.randomUUID(), name: label, theme }, ...personalPresets].slice(0, 8)
      setPersonalPresets(next)
      setNewPresetName('')
      try {
        localStorage.setItem(PERSONAL_PRESETS_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      pushToast(`Preset “${label}” disimpan.`)
    })
  }

  const handleUploadBg = async (file: File, kind: 'background' | 'og') => {
    setUploadingBg(true)
    try {
      const url = await uploadCreatorImage(userId, file, kind)
      if (kind === 'background') {
        onChangeTheme({ ...theme, bgType: 'image', bgImageUrl: url })
      } else {
        onChangeSettings({ ...settings, customOgImageUrl: url })
      }
      pushToast('Gambar berhasil dioptimasi ke WebP dan dipasang.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengunggah gambar.', 'err')
    } finally {
      setUploadingBg(false)
    }
  }

  // Automatic WCAG AA Contrast Checker
  const activeBg = theme.bgType === 'solid' ? theme.bgColor : theme.bgGradFrom
  const pageContrast = contrastRatio(theme.textColor, activeBg)
  const cardContrast =
    theme.buttonFillStyle === 'outline'
      ? contrastRatio(theme.textColor, activeBg)
      : contrastRatio(theme.cardTextColor, theme.cardBgColor)
  const lowContrast = pageContrast < 4.5 || cardContrast < 4.5

  return (
    <Card className="p-4 sm:p-6">
      <input
        ref={bgInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleUploadBg(f, 'background')
          e.target.value = ''
        }}
      />
      <input
        ref={ogInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleUploadBg(f, 'og')
          e.target.value = ''
        }}
      />

      {/* Top Studio Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette size={17} className="text-fg" />
            <h2 className="m-0 text-[18px] font-bold text-fg">Studio Tampilan Profil</h2>
            <Badge variant={isPro ? 'accent' : 'neutral'}>{isPro ? 'PRO AKTIF' : 'PAKET FREE'}</Badge>
          </div>
          <p className="mt-1 mb-0 text-[12.5px] text-fg-sec">
            {isPro
              ? 'Sesuaikan tema, warna, gradasi, border, font, dan tata letak halaman publik Anda.'
              : 'Paket Free mendukung 3 tema monokrom bawaan. Upgrade ke Pro untuk membuka 24+ tema dan kustomisasi penuh.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRandomize}>
            {!isPro && <Lock size={13} />}
            <Shuffle size={14} />
            <span>Acak Tema</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw size={14} />
            <span>Reset</span>
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={() => void onSave()}>
            <Save size={14} />
            <span>Simpan Tampilan</span>
          </Button>
        </div>
      </div>

      {/* WCAG Contrast Warning Banner */}
      {lowContrast && (
        <div
          role="status"
          className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-fg border-l-4 border-l-fg bg-elevated p-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2.5 text-[12.5px] text-fg">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Kontras teks terlalu rendah (rasio{' '}
              <strong className="font-mono">{Math.min(pageContrast, cardContrast).toFixed(1)}:1</strong>, standar WCAG AA minimal 4.5:1) sehingga sulit dibaca pengunjung.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              patchTheme({
                textColor: suggestAccessibleTextColor(activeBg),
                cardTextColor: suggestAccessibleTextColor(theme.cardBgColor),
              })
            }
          >
            Perbaiki Kontras
          </Button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="mt-4">
        <Tabs<StudioTab>
          layoutGroupId="appearance-studio-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'presets', label: 'Tema (24+)' },
            { id: 'colors', label: isPro ? 'Warna & Latar' : 'Warna & Latar (Pro)' },
            { id: 'shapes', label: isPro ? 'Border & Tata Letak' : 'Border & Tata Letak (Pro)' },
            { id: 'typo', label: isPro ? 'Font & Animasi' : 'Font & Animasi (Pro)' },
            { id: 'seo', label: isPro ? 'SEO, Brand & QR' : 'SEO, Brand & QR (Pro)' },
          ]}
        />
      </div>

      {/* TAB 1: 24+ THEME PRESETS */}
      {tab === 'presets' && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEME_PRESETS.map((preset) => {
              const selected = theme.presetId === preset.id
              const locked = preset.proOnly && !isPro
              return (
                <UnstyledButton
                  key={preset.id}
                  onClick={() => {
                    if (locked) {
                      onRequirePro(`Tema ${preset.name}`)
                      return
                    }
                    onChangeTheme({ ...preset.theme })
                  }}
                  className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                    selected ? 'border-2 border-fg' : 'border-edge [@media(hover:hover)]:hover:border-fg-sec'
                  }`}
                >
                  <div
                    className="relative flex h-20 w-full flex-col justify-between p-2.5"
                    style={{
                      backgroundColor: preset.theme.bgColor,
                      backgroundImage:
                        preset.theme.bgType === 'gradient-linear'
                          ? `linear-gradient(${preset.theme.bgGradAngle}deg, ${preset.theme.bgGradFrom}, ${preset.theme.bgGradTo})`
                          : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="h-3.5 w-3.5 rounded-full border"
                        style={{
                          backgroundColor: preset.theme.accentColor,
                          borderColor: preset.theme.borderColor,
                        }}
                      />
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-fg">
                          <Lock size={10} /> Pro
                        </span>
                      ) : selected ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-fg text-bg">
                          <Check size={12} />
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="h-4 w-full rounded"
                      style={{
                        backgroundColor: preset.theme.cardBgColor,
                        border: `1px solid ${preset.theme.borderColor}`,
                      }}
                    />
                  </div>
                  <div className="bg-surface px-3 py-2">
                    <span className="block truncate text-[12.5px] font-semibold text-fg">
                      {preset.name}
                    </span>
                    <span className="block font-mono text-[10.5px] uppercase text-fg-sec">
                      {preset.proOnly ? 'Pro' : 'Free'} · {preset.group}
                    </span>
                  </div>
                </UnstyledButton>
              )
            })}
          </div>

          {/* Personal Presets (PRO) */}
          <div className="rounded-xl border border-edge bg-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-fg">Preset Pribadi Anda</span>
              {!isPro && <Badge>Pro</Badge>}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Nama preset baru..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
              <Button variant="secondary" onClick={handleSavePersonalPreset}>
                {!isPro && <Lock size={13} />}
                <span>Simpan Preset</span>
              </Button>
            </div>
            {personalPresets.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {personalPresets.map((pp) => (
                  <Button
                    key={pp.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => requireProOr('Gunakan Preset Pribadi', () => onChangeTheme({ ...pp.theme }))}
                  >
                    <span>{pp.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COLORS, GRADIENTS, PATTERNS & BG IMAGE */}
      {tab === 'colors' && (
        <div className="mt-5 space-y-5">
          <Select
            label="Tipe Latar Belakang"
            value={theme.bgType}
            onChange={(e) => patchTheme({ bgType: e.target.value as ProfileThemeConfig['bgType'] }, 'Tipe Latar Pro')}
          >
            <option value="solid">Warna Solid</option>
            <option value="gradient-linear">Gradasi Linear (2–3 Titik)</option>
            <option value="gradient-radial">Gradasi Radial</option>
            <option value="image">Gambar Latar Unggahan</option>
          </Select>

          {theme.bgType === 'solid' && (
            <ColorField label="Warna Latar Utama" value={theme.bgColor} onChange={(v) => patchTheme({ bgColor: v })} />
          )}

          {(theme.bgType === 'gradient-linear' || theme.bgType === 'gradient-radial') && (
            <div className="space-y-3 rounded-xl border border-edge bg-bg p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ColorField label="Titik Awal" value={theme.bgGradFrom} onChange={(v) => patchTheme({ bgGradFrom: v })} />
                <ColorField label="Titik Tengah" value={theme.bgGradVia} onChange={(v) => patchTheme({ bgGradVia: v })} />
                <ColorField label="Titik Akhir" value={theme.bgGradTo} onChange={(v) => patchTheme({ bgGradTo: v })} />
              </div>
              {theme.bgType === 'gradient-linear' && (
                <Slider
                  label="Sudut Gradasi"
                  value={theme.bgGradAngle}
                  min={0}
                  max={360}
                  unit="°"
                  onChange={(n) => patchTheme({ bgGradAngle: n })}
                />
              )}
            </div>
          )}

          {theme.bgType === 'image' && (
            <div className="space-y-3 rounded-xl border border-edge bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-fg">Gambar Latar (WebP maks 2 MB)</span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploadingBg}
                  onClick={() => requireProOr('Gambar Latar Kustom', () => bgInputRef.current?.click())}
                >
                  <ImagePlus size={14} />
                  <span>{theme.bgImageUrl ? 'Ganti Gambar' : 'Unggah Gambar'}</span>
                </Button>
              </div>
              <Slider
                label="Gelapkan Overlay"
                value={theme.bgOverlayOpacity}
                min={0}
                max={80}
                unit="%"
                onChange={(n) => patchTheme({ bgOverlayOpacity: n })}
              />
              <Slider
                label="Tingkat Blur Latar"
                value={theme.bgBlurPx}
                min={0}
                max={20}
                unit=" px"
                onChange={(n) => patchTheme({ bgBlurPx: n })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Pola Latar"
              value={theme.bgPattern}
              onChange={(e) => patchTheme({ bgPattern: e.target.value as ProfileThemeConfig['bgPattern'] })}
            >
              <option value="none">Tanpa Pola</option>
              <option value="dots">Titik Halus (Dots)</option>
              <option value="lines">Garis Horizontal</option>
              <option value="grid">Grid Teknis</option>
              <option value="noise">Tekstur Grain</option>
            </Select>

            <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-edge bg-bg px-3.5 text-[13.5px] text-fg">
              <span>Latar Bergerak Halus</span>
              <input
                type="checkbox"
                checked={theme.bgAnimated}
                onChange={(e) => patchTheme({ bgAnimated: e.target.checked })}
                className="h-4 w-4 accent-fg"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorField label="Teks Utama" value={theme.textColor} onChange={(v) => patchTheme({ textColor: v })} />
            <ColorField label="Teks Sekunder" value={theme.textSecColor} onChange={(v) => patchTheme({ textSecColor: v })} />
            <ColorField label="Latar Kartu / Tombol" value={theme.cardBgColor} onChange={(v) => patchTheme({ cardBgColor: v })} />
            <ColorField label="Teks Kartu / Tombol" value={theme.cardTextColor} onChange={(v) => patchTheme({ cardTextColor: v })} />
            <ColorField label="Garis Tepi (Border)" value={theme.borderColor} onChange={(v) => patchTheme({ borderColor: v })} />
            <ColorField label="Aksen Sorotan" value={theme.accentColor} onChange={(v) => patchTheme({ accentColor: v })} />
          </div>
        </div>
      )}

      {/* TAB 3: AVATAR SHAPES, BUTTON BORDERS, SHADOWS & LAYOUT */}
      {tab === 'shapes' && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Bentuk Foto Profil"
              value={theme.avatarShape}
              onChange={(e) => patchTheme({ avatarShape: e.target.value as ProfileThemeConfig['avatarShape'] })}
            >
              <option value="circle">Lingkaran</option>
              <option value="rounded">Kotak Membulat</option>
              <option value="squircle">Squircle</option>
              <option value="star">Bintang</option>
              <option value="hexagon">Hexagon</option>
            </Select>
            <Select
              label="Gaya Bingkai Avatar"
              value={theme.avatarBorderStyle}
              onChange={(e) => patchTheme({ avatarBorderStyle: e.target.value as ProfileThemeConfig['avatarBorderStyle'] })}
            >
              <option value="solid">Solid</option>
              <option value="double">Ganda (Double)</option>
              <option value="dashed">Putus-putus</option>
              <option value="gradient">Aksen Gradasi</option>
              <option value="spinning-ring">Cincin Berputar</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Bentuk Tombol Link"
              value={theme.buttonShape}
              onChange={(e) => patchTheme({ buttonShape: e.target.value as ProfileThemeConfig['buttonShape'] })}
            >
              <option value="square">Kotak Tegas</option>
              <option value="rounded">Membulat</option>
              <option value="pill">Pil Penuh</option>
            </Select>
            <Select
              label="Gaya Isi Tombol"
              value={theme.buttonFillStyle}
              onChange={(e) => patchTheme({ buttonFillStyle: e.target.value as ProfileThemeConfig['buttonFillStyle'] })}
            >
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
              <option value="glass">Glass Transparan</option>
              <option value="3d">Tombol 3D</option>
              <option value="offset">Offset Bayangan</option>
            </Select>
            <Select
              label="Gaya Border Kartu"
              value={theme.cardBorderStyle}
              onChange={(e) => patchTheme({ cardBorderStyle: e.target.value as ProfileThemeConfig['cardBorderStyle'] })}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Putus-putus</option>
              <option value="double">Ganda</option>
              <option value="gradient">Aksen</option>
            </Select>
            <Select
              label="Bayangan & Efek Kartu"
              value={theme.cardShadowStyle}
              onChange={(e) => patchTheme({ cardShadowStyle: e.target.value as ProfileThemeConfig['cardShadowStyle'] })}
            >
              <option value="none">Tanpa Bayangan</option>
              <option value="soft">Bayangan Lembut</option>
              <option value="neo-brutal">Neo-Brutalism Keras</option>
              <option value="glow">Kilau Aksen</option>
              <option value="animated-outline">Outline Sorotan</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Tata Letak Link"
              value={theme.layoutMode}
              onChange={(e) => patchTheme({ layoutMode: e.target.value as ProfileThemeConfig['layoutMode'] })}
            >
              <option value="list">Daftar (1 Kolom)</option>
              <option value="grid-2">Grid 2 Kolom</option>
              <option value="featured-large">Kartu Besar</option>
              <option value="mixed">Kombinasi Sorotan</option>
            </Select>
            <Select
              label="Gaya Ikon Sosial"
              value={theme.socialStyle}
              onChange={(e) => patchTheme({ socialStyle: e.target.value as ProfileThemeConfig['socialStyle'] })}
            >
              <option value="outline">Outline</option>
              <option value="pill">Pil + Label</option>
              <option value="solid">Solid</option>
              <option value="minimal">Minimalis</option>
            </Select>
            <Select
              label="Perataan Header"
              value={theme.contentAlign}
              onChange={(e) => patchTheme({ contentAlign: e.target.value as ProfileThemeConfig['contentAlign'] })}
            >
              <option value="center">Tengah</option>
              <option value="left">Rata Kiri</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Slider
              label="Ketebalan Border"
              value={theme.cardBorderWidth}
              min={0}
              max={4}
              unit=" px"
              onChange={(n) => patchTheme({ cardBorderWidth: n })}
            />
            <Slider
              label="Jarak Antar Link"
              value={theme.cardGapPx}
              min={8}
              max={24}
              unit=" px"
              onChange={(n) => patchTheme({ cardGapPx: n })}
            />
            <Slider
              label="Lebar Kolom Konten"
              value={theme.contentMaxWidthPx}
              min={440}
              max={720}
              step={20}
              unit=" px"
              onChange={(n) => patchTheme({ contentMaxWidthPx: n })}
            />
          </div>
        </div>
      )}

      {/* TAB 4: TYPOGRAPHY & ANIMATIONS */}
      {tab === 'typo' && (
        <div className="mt-5 space-y-4">
          <Select
            label="Pasangan Font Terkurasi (12 Pilihan)"
            value={theme.fontPairId}
            onChange={(e) => patchTheme({ fontPairId: e.target.value })}
          >
            {CURATED_FONT_PAIRS.map((fp) => (
              <option key={fp.id} value={fp.id}>
                {fp.label}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Slider
              label="Ukuran Nama Profil"
              value={theme.titleSizePx}
              min={20}
              max={34}
              unit=" px"
              onChange={(n) => patchTheme({ titleSizePx: n })}
            />
            <Slider
              label="Spasi Huruf (Tracking)"
              value={theme.titleTrackingEm}
              min={-0.04}
              max={0.04}
              step={0.01}
              unit=" em"
              onChange={(n) => patchTheme({ titleTrackingEm: n })}
            />
          </div>

          <Select
            label="Gaya Animasi Link"
            value={theme.animationPreset}
            onChange={(e) => patchTheme({ animationPreset: e.target.value as ProfileThemeConfig['animationPreset'] })}
          >
            <option value="none">Tanpa Animasi</option>
            <option value="fade-up">Muncul Halus (Fade Up)</option>
            <option value="hover-lift">Terangkat Saat Hover</option>
            <option value="pulse">Denyut pada Link Sorotan</option>
            <option value="shake">Getar Halus Saat Hover</option>
          </Select>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-edge bg-bg px-3.5 text-[13.5px] text-fg">
              <span>Aktifkan Animasi Halaman</span>
              <input
                type="checkbox"
                checked={theme.animationsEnabled}
                onChange={(e) => patchTheme({ animationsEnabled: e.target.checked })}
                className="h-4 w-4 accent-fg"
              />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-edge bg-bg px-3.5 text-[13.5px] text-fg">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={14} /> Konfeti Halus Link Sorotan
              </span>
              <input
                type="checkbox"
                checked={theme.confettiOnFeatured}
                onChange={(e) => patchTheme({ confettiOnFeatured: e.target.checked })}
                className="h-4 w-4 accent-fg"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 5: SEO, LUVEN BRANDING TOGGLE, SENSITIVE GATE & CUSTOM QR */}
      {tab === 'seo' && (
        <div className="mt-5 space-y-4">
          <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-edge bg-bg px-4 py-3 text-[13.5px] text-fg">
            <div>
              <span className="block font-semibold">Sembunyikan blok &ldquo;Buat halaman kamu di Luven&rdquo;</span>
              <span className="block text-[12px] text-fg-sec">
                Khusus paket Pro. Pada paket Free blok ajakan di bawah halaman selalu tampil.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.hideLuvenBranding}
              onChange={(e) => patchSettings({ hideLuvenBranding: e.target.checked }, 'Sembunyikan Watermark Luven')}
              className="h-4 w-4 accent-fg"
            />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-edge bg-bg px-4 py-3 text-[13.5px] text-fg">
            <div>
              <span className="block font-semibold">Aktifkan Peringatan Konten Sensitif</span>
              <span className="block text-[12px] text-fg-sec">
                Menampilkan konfirmasi kepada pengunjung sebelum membuka halaman profil Anda.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.sensitiveContentGate}
              onChange={(e) => patchSettings({ sensitiveContentGate: e.target.checked }, 'Gerbang Konten Sensitif')}
              className="h-4 w-4 accent-fg"
            />
          </label>

          <Input
            label="Judul SEO Kustom (Open Graph)"
            placeholder="Mis. Koleksi Template CapCut & Preset — @username"
            maxLength={70}
            value={settings.seoTitle}
            onChange={(e) => patchSettings({ seoTitle: e.target.value }, 'SEO Kustom')}
          />

          <Input
            label="Deskripsi SEO Kustom"
            placeholder="Deskripsi singkat yang tampil saat link dibagikan di TikTok/WhatsApp..."
            maxLength={160}
            value={settings.seoDescription}
            onChange={(e) => patchSettings({ seoDescription: e.target.value }, 'SEO Kustom')}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-edge bg-bg p-4">
            <div>
              <span className="block text-[13px] font-semibold text-fg">Gambar Pratinjau Sosial Kustom</span>
              <span className="block text-[12px] text-fg-sec">
                {settings.customOgImageUrl ? 'Gambar OG kustom terpasang.' : 'Menggunakan foto profil secara bawaan.'}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={uploadingBg}
              onClick={() => requireProOr('Gambar OG Kustom', () => ogInputRef.current?.click())}
            >
              <ImagePlus size={14} />
              <span>{settings.customOgImageUrl ? 'Ganti OG Image' : 'Unggah OG Image'}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ColorField
              label="Warna Kode QR"
              value={settings.qrFgColor}
              onChange={(v) => patchSettings({ qrFgColor: v }, 'Kode QR Berwarna')}
            />
            <ColorField
              label="Latar Belakang Kode QR"
              value={settings.qrBgColor}
              onChange={(v) => patchSettings({ qrBgColor: v }, 'Kode QR Berwarna')}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-bg px-3 py-2">
      <div className="min-w-0">
        <span className="block truncate text-[12px] font-medium text-fg">{label}</span>
        <input
          type="text"
          value={value}
          maxLength={7}
          aria-label={`Kode HEX ${label}`}
          onChange={(e) => {
            const v = e.target.value.toUpperCase()
            if (/^#[0-9A-F]{0,6}$/.test(v)) onChange(v)
          }}
          className="mt-0.5 w-20 bg-transparent font-mono text-[11.5px] text-fg-sec outline-none"
        />
      </div>
      <input
        type="color"
        aria-label={`Pilih warna ${label}`}
        value={/^#[0-9A-F]{6}$/i.test(value) ? value : '#0A0A0A'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-edge bg-transparent p-0"
      />
    </div>
  )
}
