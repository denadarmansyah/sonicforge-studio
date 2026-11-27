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
  featured_order?: number
  is_banned: boolean
  ban_reason?: string
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
  username?: string | null
  email?: string
}

export interface AbuseReport {
  id: string
  reporter_id: string | null
  target_type: 'profile' | 'template'
  target_id: string
  reason: string
  details: string
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed'
  admin_note?: string
  resolved_at?: string | null
  created_at: string
  target_label?: string
  target_url?: string
  owner_username?: string | null
  owner_id?: string | null
}

export type AuthProviderKind = 'google' | 'email'

export interface AuthSessionUser {
  id: string
  email: string
  email_confirmed: boolean
  providers: AuthProviderKind[]
  has_password: boolean
}

export type UsernameCheckStatus = 'available' | 'taken' | 'invalid' | 'reserved'

export interface UsernameCheckResult {
  available: boolean
  status: UsernameCheckStatus
  normalized: string
  message: string
}

export interface SiteSettings {
  announcement_text: string
  announcement_active: boolean
  maintenance_mode: boolean
  updated_at?: string
}

export interface AdminGateStatus {
  is_admin: boolean
  unlocked: boolean
  session_open: boolean
  must_change: boolean
  unlocked_until: string | null
  is_primary: boolean
}

export interface AdminAuditLogEntry {
  id: string
  actor_id?: string | null
  actor_email: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export interface AdminOverviewData {
  metrics: {
    total_users: number
    new_users_7d: number
    new_users_30d: number
    active_profiles: number
    total_templates: number
    total_links: number
    open_reports: number
    active_pro: number
    total_views: number
    total_clicks: number
  }
  growth_30d: {
    date: string
    new_users: number
    views: number
    clicks: number
  }[]
  recent_logs: AdminAuditLogEntry[]
}

export interface AdminUserListItem {
  id: string
  email: string
  registered_at: string
  last_sign_in_at: string | null
  providers: string[]
  username: string | null
  display_name: string | null
  avatar_url: string | null
  category: string | null
  raw_plan: PlanId
  plan_expires_at: string | null
  effective_plan: PlanId
  is_verified: boolean
  is_featured: boolean
  featured_order: number
  is_banned: boolean
  ban_reason: string
  has_username: boolean
  is_admin: boolean
  is_primary_admin: boolean
  templates_count: number
  links_count: number
}

export interface AdminUserDetail {
  account: {
    id: string
    email: string
    email_confirmed_at: string | null
    created_at: string
    last_sign_in_at: string | null
    has_password: boolean
    providers: string[]
    is_admin: boolean
    is_primary_admin: boolean
  }
  profile: Profile | null
  subscriptions: SubscriptionRecord[]
  reports: AbuseReport[]
  stats: {
    templates_count: number
    links_count: number
    total_views: number
    total_clicks: number
  }
}

export interface AdminContentItem {
  id: string
  kind: 'template' | 'link'
  link_type?: LinkItemType
  title: string
  description?: string
  url: string | null
  tiktok_url?: string | null
  thumbnail_url: string | null
  status: 'active' | 'hidden' | 'removed'
  owner_id: string
  owner_username: string
  owner_display_name: string
  created_at: string
}

export interface AdminTeamMember {
  user_id: string
  email: string
  username: string | null
  note: string | null
  is_primary: boolean
  has_passphrase: boolean
  created_at: string
}
