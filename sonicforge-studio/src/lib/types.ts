import { PlanId } from '../config/plans'
import { ProfileSettings, ProfileThemeConfig } from '../lib/themeConfig'

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
  tiktok_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  website_url: string | null
  category: string
  is_verified: boolean
  is_featured: boolean
  is_banned: boolean
  onboarding_completed: boolean
  plan: PlanId
  plan_expires_at: string | null
  theme: ProfileThemeConfig
  settings: ProfileSettings
  referred_by: string | null
  created_at: string
  updated_at?: string
}

export type LinkItemType =
  | 'link'
  | 'capcut'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'whatsapp'
  | 'website'
  | 'heading'
  | 'announcement'
  | 'embed_tiktok'
  | 'embed_youtube'

export interface LinkItem {
  id: string
  owner_id: string
  type: LinkItemType
  title: string
  url: string | null
  thumbnail_url: string | null
  position: number
  is_active: boolean
  is_featured: boolean
  group_id: string | null
  schedule_start: string | null
  schedule_end: string | null
  created_at: string
  updated_at?: string
}

export type TemplateStatus = 'active' | 'hidden' | 'removed'

export interface CreatorTemplate {
  id: string
  owner_id: string
  title: string
  description: string
  capcut_url: string
  tiktok_url: string | null
  thumbnail_url: string | null
  tags: string[]
  song_title: string | null
  sort_order: number
  status: TemplateStatus
  created_at: string
  updated_at?: string
  owner?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_verified' | 'category'>
  weekly_clicks?: number
}

export type AnalyticsEventType =
  | 'profile_view'
  | 'template_view'
  | 'capcut_click'
  | 'tiktok_click'
  | 'social_click'
  | 'link_click'

export interface DailyMetricPoint {
  date: string
  views: number
  clicks: number
}

export interface CreatorAnalyticsSummary {
  totalProfileViews: number
  views7d: number
  views30d: number
  views90d: number
  totalCapcutClicks: number
  totalTiktokClicks: number
  totalSocialClicks: number
  totalLinkClicks: number
  clicks7d: number
  series7d: DailyMetricPoint[]
  series30d: DailyMetricPoint[]
  series90d: DailyMetricPoint[]
  topTemplates: {
    template_id: string
    title: string
    clicks: number
    views: number
  }[]
  topLinks: {
    link_id: string
    title: string
    type: LinkItemType
    clicks: number
  }[]
  topReferrers: { host: string; count: number }[]
  deviceBreakdown: { mobile: number; desktop: number }
  peakHours: { hour: number; count: number }[]
  referralCount: number
}

export interface SubscriptionRecord {
  id: string
  user_id: string
  plan: PlanId
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'revoked'
  amount: number
  provider: string
  provider_ref: string | null
  started_at: string
  expires_at: string | null
  created_at: string
}

export interface AbuseReport {
  id: string
  reporter_id: string | null
  target_type: 'profile' | 'template'
  target_id: string
  reason: string
  details: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  target_label?: string
  target_url?: string
}

export interface AuthSessionUser {
  id: string
  email: string
  email_confirmed: boolean
}
