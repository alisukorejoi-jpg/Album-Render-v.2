import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Save, LogOut, CheckCircle } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsViewProps {
  user: User;
  settings: UserSettings;
  setSettings: (s: UserSettings) => void;
  projectsCount: number;
  onLogout: () => void;
}

export function SettingsView({ user, settings, setSettings, projectsCount, onLogout }: SettingsViewProps) {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: localSettings.displayName,
        settings: {
          defaultArtistName: localSettings.defaultArtistName,
          defaultFont: localSettings.defaultFont,
          defaultFormat: localSettings.defaultFormat
        }
      }, { merge: true });
      setSettings(localSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Settings</h1>
        <p className="text-neutral-400 text-sm">Manage your profile and default project preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-[#0F0F0F] border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Profile Information</h2>
          
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-xl font-bold border border-cyan-500/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div>
              <p className="text-white font-medium">{user.email}</p>
              <p className="text-neutral-500 text-xs">Logged in via Google</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Display Name</label>
              <input 
                type="text" 
                value={localSettings.displayName}
                onChange={(e) => setLocalSettings({...localSettings, displayName: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {/* Project Defaults Section */}
        <div className="bg-[#0F0F0F] border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Project Defaults</h2>
          <p className="text-xs text-neutral-500 mb-6">These settings will be automatically applied whenever you create a new album project.</p>
          
          <div className="space-y-5 max-w-md">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Default Artist Name</label>
              <input 
                type="text" 
                value={localSettings.defaultArtistName}
                onChange={(e) => setLocalSettings({...localSettings, defaultArtistName: e.target.value})}
                placeholder="e.g. Alta Belagia"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Default Font</label>
              <select
                value={localSettings.defaultFont}
                onChange={(e) => setLocalSettings({...localSettings, defaultFont: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
              >
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Inter">Inter</option>
                <option value="Space Grotesk">Space Grotesk</option>
                <option value="Outfit">Outfit</option>
                <option value="Syne">Syne</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Default Resolution</label>
              <select
                value={localSettings.defaultFormat}
                onChange={(e) => setLocalSettings({...localSettings, defaultFormat: e.target.value as any})}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
              >
                <option value="1080p">1080p (16:9 - YouTube/Desktop)</option>
                <option value="portrait">Portrait (9:16 - TikTok/Reels)</option>
                <option value="square">Square (1:1 - Instagram Feed)</option>
                <option value="4k">4K (16:9 - Ultra HD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save & Status */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-200 text-black rounded text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
          {message && (
            <span className="flex items-center gap-2 text-sm text-green-400 font-medium">
              <CheckCircle className="w-4 h-4" /> {message}
            </span>
          )}
        </div>

        {/* Data Management Section */}
        <div className="bg-[#0F0F0F] border border-neutral-800 rounded-xl p-6 mt-8">
          <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-6">Data & Account</h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-medium mb-1">Total Projects</p>
              <p className="text-neutral-500 text-xs">You currently have {projectsCount} project{projectsCount !== 1 ? 's' : ''} saved in your account.</p>
            </div>
            
            <button 
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              LOG OUT
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
