/**
 * Supabase User Sync Utilities
 * 
 * Handles syncing auth.users to public.users DIRECTLY in Supabase
 * NO BACKEND NEEDED!
 */

import { supabase } from '@/lib/supabase';

/**
 * Sync Supabase auth.users to public.users table
 * Called after successful OAuth login
 */
export async function syncUserToPublicTable(supabaseAuthUser: any) {
  console.log('🔄 [SYNC] Syncing user to public.users table');
  console.log('🔄 [SYNC] Auth User ID:', supabaseAuthUser.id);
  console.log('🔄 [SYNC] Email:', supabaseAuthUser.email);

  try {
    // Check if user already exists in public.users
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabaseAuthUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found (which is OK)
      console.error('❌ [SYNC] Error checking user:', fetchError);
      throw fetchError;
    }

    if (existingUser) {
      // User exists - just update timestamp
      console.log('✅ [SYNC] User exists, updating timestamp');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [SYNC] Error updating user:', updateError);
        throw updateError;
      }

      console.log('✅ [SYNC] User synced successfully!');
      return updatedUser;
    } else {
      // User doesn't exist - create new
      console.log('📝 [SYNC] Creating new user in public.users');

      const name = supabaseAuthUser.user_metadata?.full_name ||
                   supabaseAuthUser.user_metadata?.name ||
                   supabaseAuthUser.email?.split('@')[0] ||
                   'User';

      const phone = supabaseAuthUser.user_metadata?.phone || null;
      const avatar = supabaseAuthUser.user_metadata?.avatar_url || 
                     supabaseAuthUser.user_metadata?.picture || null;

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          supabase_uid: supabaseAuthUser.id,
          email: supabaseAuthUser.email,
          name: name,
          phone: phone,
          avatar: avatar,
          email_verified: supabaseAuthUser.email_confirmed_at ? true : false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [SYNC] Error creating user:', insertError);
        console.error('❌ [SYNC] Insert details:', {
          supabase_uid: supabaseAuthUser.id,
          email: supabaseAuthUser.email,
          name: name,
        });
        throw insertError;
      }

      console.log('✅ [SYNC] User created successfully!');
      console.log('✅ [SYNC] DB ID:', newUser.id);
      return newUser;
    }
  } catch (error) {
    console.error('❌ [SYNC] Unexpected error:', error);
    throw error;
  }
}

/**
 * Get user from public.users by supabase_uid
 */
export async function getUserBySupabaseUid(supabaseUid: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabaseUid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching user:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Unexpected error fetching user:', error);
    throw error;
  }
}
