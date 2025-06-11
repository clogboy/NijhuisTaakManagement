import { supabaseClient } from './supabase-service';

export class SupabaseUserPreferencesService {
  /**
   * Get user preferences from Supabase
   */
  async getUserPreferences(userId: number): Promise<any | undefined> {
    try {
      const { data, error } = await supabaseClient
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return undefined;
        }
        throw error;
      }

      return data?.preferences || undefined;
    } catch (error) {
      console.error('[SUPABASE] Error getting user preferences:', error);
      return undefined;
    }
  }

  /**
   * Update or create user preferences in Supabase
   */
  async updateUserPreferences(userId: number, preferencesUpdate: any): Promise<any> {
    try {
      // Get existing preferences first
      const existing = await this.getUserPreferences(userId);
      const mergedPrefs = { ...existing, ...preferencesUpdate };

      const { data, error } = await supabaseClient
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences: mergedPrefs,
          updated_at: new Date().toISOString()
        })
        .select('preferences')
        .single();

      if (error) {
        throw error;
      }

      return data?.preferences || mergedPrefs;
    } catch (error) {
      console.error('[SUPABASE] Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Create new user preferences in Supabase
   */
  async createUserPreferences(preferences: any & { createdBy: number }): Promise<any> {
    try {
      const { createdBy, ...prefsData } = preferences;

      const { data, error } = await supabaseClient
        .from('user_preferences')
        .insert({
          user_id: createdBy,
          preferences: prefsData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('preferences')
        .single();

      if (error) {
        throw error;
      }

      return data?.preferences || prefsData;
    } catch (error) {
      console.error('[SUPABASE] Error creating user preferences:', error);
      throw error;
    }
  }

  /**
   * Delete user preferences from Supabase
   */
  async deleteUserPreferences(userId: number): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('[SUPABASE] Error deleting user preferences:', error);
      throw error;
    }
  }

  /**
   * Sync preferences from local storage to Supabase
   */
  async syncToSupabase(localPreferences: Array<{ userId: number; preferences: any }>): Promise<void> {
    try {
      for (const pref of localPreferences) {
        await this.updateUserPreferences(pref.userId, pref.preferences);
      }
      console.log(`[SUPABASE] Synced ${localPreferences.length} user preferences to Supabase`);
    } catch (error) {
      console.error('[SUPABASE] Error syncing preferences to Supabase:', error);
      throw error;
    }
  }
}

export const supabaseUserPreferencesService = new SupabaseUserPreferencesService();