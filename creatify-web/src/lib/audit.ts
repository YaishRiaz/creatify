import { createSupabaseClient } from '@/lib/supabase'

type AuditAction =
  | 'approve_task'
  | 'reject_task'
  | 'suspend_creator'
  | 'reinstate_creator'
  | 'adjust_wallet'
  | 'force_activate_campaign'
  | 'pause_campaign'
  | 'resume_campaign'
  | 'force_complete_campaign'
  | 'mark_payout_processing'
  | 'mark_payout_paid'
  | 'mark_payout_failed'
  | 'suspend_brand'

export async function logAdminAction(
  adminUserId: string,
  action: AuditAction,
  entityType: 'task' | 'creator' | 'campaign' | 'payout' | 'brand',
  entityId: string,
  details?: Record<string, unknown>
) {
  const supabase = createSupabaseClient()
  const { error } = await supabase.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? {},
  })
  if (error) {
    console.error('Failed to write audit log:', error)
    // Don't throw — audit log failure should never block the admin action
  }
}
