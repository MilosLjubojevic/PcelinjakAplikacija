import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { AppState } from '../types';

const BACKUP_BUCKET = 'backups';
const BACKUP_KEY = '@pcelinjak_last_backup';

export interface BackupInfo {
  lastBackup: Date | null;
  success: boolean;
  error?: string;
}

export async function backupToSupabase(state: AppState): Promise<BackupInfo> {
  if (!isSupabaseConfigured()) {
    return { lastBackup: null, success: false, error: 'Supabase nije konfigurisan' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { lastBackup: null, success: false, error: 'Korisnik nije prijavljen' };
    }

    const backupData = JSON.stringify(state);
    const fileName = `${user.id}/pcelinjak-backup.json`;

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(fileName, new Blob([backupData], { type: 'application/json' }), {
        upsert: true,
      });

    if (error) throw error;

    const now = new Date();
    await AsyncStorage.setItem(BACKUP_KEY, now.toISOString());

    return { lastBackup: now, success: true };
  } catch (error: any) {
    console.error('Backup error:', error);
    return { lastBackup: null, success: false, error: error.message || 'Greška pri backup-u' };
  }
}

export async function restoreFromSupabase(): Promise<{ data: AppState | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase nije konfigurisan' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Korisnik nije prijavljen' };
    }

    const fileName = `${user.id}/pcelinjak-backup.json`;
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(fileName);

    if (error) throw error;
    if (!data) return { data: null, error: 'Nema backup podataka' };

    const text = await data.text();
    const parsed = JSON.parse(text) as AppState;

    return { data: parsed };
  } catch (error: any) {
    console.error('Restore error:', error);
    return { data: null, error: error.message || 'Greška pri vraćanju podataka' };
  }
}

export async function getLastBackupDate(): Promise<Date | null> {
  try {
    const stored = await AsyncStorage.getItem(BACKUP_KEY);
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}
