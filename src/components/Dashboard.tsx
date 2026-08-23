import { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { Plus, FolderOpen, Settings, LayoutTemplate, Film, MonitorPlay, LogOut, Loader2, Users, Trash2 } from 'lucide-react';
import { Project, GlobalSettings } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { AuthModal } from './AuthModal';
import { loadProjectsFromFirestore, saveProjectToFirestore, deleteProjectFromFirestore } from '../lib/db';
import { AdminDashboard } from './AdminDashboard';
import { SettingsView } from './SettingsView';
import { UserSettings } from '../types';
import { getDoc } from 'firebase/firestore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'projects' | 'templates' | 'settings' | 'admin'>('projects');
  const [userSettings, setUserSettings] = useState<UserSettings>({
    displayName: '',
    defaultArtistName: '',
    defaultFont: 'Plus Jakarta Sans',
    defaultFormat: '1080p'
  });
  const [showCreate, setShowCreate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [resolution, setResolution] = useState<'720p'|'1080p'|'4k'|'square'|'portrait'>('1080p');
  const [fps, setFps] = useState(30);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    async function fetchProjects() {
      if (user) {
        setIsSyncing(true);
        // Sync user to firestore for admin tracking
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let currentSettings = {
            displayName: user.displayName || '',
            defaultArtistName: '',
            defaultFont: 'Plus Jakarta Sans',
            defaultFormat: '1080p' as any
          };

          if (userSnap.exists()) {
            const data = userSnap.data();
            currentSettings = {
              displayName: data.displayName || user.displayName || '',
              defaultArtistName: data.settings?.defaultArtistName || '',
              defaultFont: data.settings?.defaultFont || 'Plus Jakarta Sans',
              defaultFormat: data.settings?.defaultFormat || '1080p'
            };
          }

          setUserSettings(currentSettings);

          await setDoc(userRef, {
            email: user.email,
            displayName: currentSettings.displayName,
            lastLogin: new Date().toISOString(),
            settings: {
              defaultArtistName: currentSettings.defaultArtistName,
              defaultFont: currentSettings.defaultFont,
              defaultFormat: currentSettings.defaultFormat
            }
          }, { merge: true });
        } catch (e) {
          console.error('Failed to sync user', e);
        }

        const userProjects = await loadProjectsFromFirestore(user.uid);
        dispatch({ type: 'SET_PROJECTS', payload: userProjects });
        setIsSyncing(false);
      } else {
        dispatch({ type: 'SET_PROJECTS', payload: [] });
      }
    }
    fetchProjects();
  }, [user, dispatch]);

  const handleCreateClick = () => {
    if (userSettings.defaultArtistName) setArtist(userSettings.defaultArtistName);
    if (userSettings.defaultFormat) setResolution(userSettings.defaultFormat);
    setShowCreate(true);
  };

  
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, projectTitle: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${projectTitle}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteProjectFromFirestore(projectId);
      dispatch({ type: 'DELETE_PROJECT', payload: projectId });
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Failed to delete project. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!title || !artist) return;
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    
    const defaultSettings: GlobalSettings = {
      template: 'minimal',
      backgroundColor: '#df9f28',
      textSettings: {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        align: 'center',
        x: 50,
        y: 50,
        opacity: 100,
        animation: 'fade-in',
      }
    };

    const newProject: Project = {
      id: Date.now().toString(),
      title,
      artist,
      coverImage: null,
      description: '',
      resolution,
      fps,
      tracks: [],
      globalSettings: defaultSettings,
      lastEdited: Date.now(),
    };

    // Optimistic update
    dispatch({ type: 'CREATE_PROJECT', payload: newProject });
    
    // Save to Firestore
    await saveProjectToFirestore(newProject, user.uid);
  };

  const templatesList = [
    { id: 'cover_flow_3d', name: '3D Cover Flow', desc: 'A stunning 3D perspective with a spotlight podium, glowing side cards, and a sleek bottom glass player.', icon: '🏆' },
    { id: 'floating_cards', name: '3D Floating Cards', desc: 'Immersive 3D perspective with multiple floating cover cards and glowing neon edges.', icon: '🎲' },
    { id: 'glowing_mini', name: 'Glowing Mini Player', desc: 'A slick, glassmorphic mini-player anchored at the bottom-left with a strong neon aura.', icon: '✨' },
    { id: 'glass_player', name: 'Glass Player Card', desc: 'Centralized, large frosted-glass card featuring live lyrics/playlist integration.', icon: '🧊' },
    { id: 'cover_flow_player', name: 'Cover Flow Player', desc: 'Classic Apple-style cover flow with reflections and scrolling items.', icon: '🎵' },
    { id: 'minimal', name: 'Minimal Cinematic', desc: 'Clean layout with a large background, subtle gradients, and elegant typography.', icon: '🎬' },
    { id: 'now_playing', name: 'Now Playing', desc: 'Focuses purely on the currently active track with a large, centered cover art.', icon: '🎧' },
    { id: 'playlist', name: 'Full Album Playlist', desc: 'Shows the complete tracklist prominently, perfect for full album uploads.', icon: '📜' },
    { id: 'centered_bold', name: 'Centered Bold Title', desc: 'Massive, screen-filling bold typography for a highly impactful aesthetic.', icon: '🔠' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0A0A0A] text-neutral-200 font-sans selection:bg-cyan-500/30">
      {/* Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-[#0F0F0F] p-4 md:p-6 flex flex-col gap-4 md:gap-6 shrink-0">
        <div className="flex items-center gap-3 text-white font-bold text-lg tracking-tight">
          <span className="text-cyan-500">🎵</span>
          Album Render
        </div>

        <nav className="flex flex-row md:flex-col gap-2 mt-0 md:mt-4 text-xs font-medium overflow-x-auto pb-2 md:pb-0 flex-1">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 rounded-lg transition-colors w-full whitespace-nowrap md:whitespace-normal ${activeTab === 'projects' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white border border-transparent'}`}
          >
            <FolderOpen className="w-4 h-4" /> Projects
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 rounded-lg transition-colors w-full whitespace-nowrap md:whitespace-normal ${activeTab === 'templates' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white border border-transparent'}`}
          >
            <LayoutTemplate className="w-4 h-4" /> Templates
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 rounded-lg transition-colors w-full whitespace-nowrap md:whitespace-normal ${activeTab === 'settings' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white border border-transparent'}`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          {user?.email === 'alisukorejoi@gmail.com' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 rounded-lg transition-colors w-full whitespace-nowrap md:whitespace-normal ${activeTab === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white border border-transparent'}`}
            >
              <Users className="w-4 h-4" /> Admin
            </button>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="hidden md:flex flex-col gap-3 pt-6 border-t border-neutral-800">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs text-white font-medium truncate">{user.displayName || 'User'}</span>
                  <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
                </div>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              LOG IN
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-12 max-w-5xl mx-auto">
          
          {/* Projects View */}
          {activeTab === 'projects' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-12">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Recent Projects</h1>
                <button
                  onClick={handleCreateClick}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-cyan-900/20 text-xs tracking-wider w-full md:w-auto"
                >
                  <Plus className="w-4 h-4" /> CREATE NEW ALBUM
                </button>
              </div>

              {showAuthModal && (
                <AuthModal onClose={() => setShowAuthModal(false)} />
              )}

              {showCreate && (
                <div className="mb-8 md:mb-12 p-4 md:p-8 border border-neutral-800 bg-[#0F0F0F] rounded-xl shadow-2xl">
                  <h2 className="text-xl font-bold text-white mb-6">Create New Album</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Album Title</label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                          placeholder="e.g. Senja Terakhir"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Artist Name</label>
                        <input 
                          type="text" 
                          value={artist}
                          onChange={e => setArtist(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                          placeholder="e.g. Alta Belagia"
                        />
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Resolution</label>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {['1080p', '1440p', '4k'].map(res => (
                            <button
                              key={res}
                              onClick={() => setResolution(res as any)}
                              className={`px-3 md:px-4 py-2 rounded border text-xs font-bold uppercase transition-all ${resolution === res ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900 text-neutral-400'}`}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-500 mb-2 uppercase tracking-widest">Frame Rate</label>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          {[24, 30, 60].map(val => (
                            <button
                              key={val}
                              onClick={() => setFps(val)}
                              className={`px-3 md:px-4 py-2 rounded border text-xs font-bold uppercase transition-all ${fps === val ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900 text-neutral-400'}`}
                            >
                              {val} FPS
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex flex-col md:flex-row justify-end gap-3">
                    <button 
                      onClick={() => setShowCreate(false)}
                      className="px-5 py-2.5 rounded bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors w-full md:w-auto"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={handleCreate}
                      disabled={!title || !artist}
                      className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                    >
                      CREATE PROJECT
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.projects.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => dispatch({ type: 'OPEN_PROJECT', payload: project.id })}
                    className="group p-5 bg-[#0F0F0F] border border-neutral-800 rounded-xl hover:border-cyan-500/50 cursor-pointer transition-all"
                  >
                    <div className="aspect-video bg-neutral-900 rounded-lg mb-4 flex items-center justify-center border border-neutral-800 overflow-hidden relative">
                      {project.coverImage ? (
                        <img src={project.coverImage} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">💿</span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="px-4 py-2 bg-cyan-600 text-white text-xs font-bold rounded-full shadow-lg">OPEN PROJECT</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{project.title}</h3>
                    <p className="text-neutral-400 text-xs mb-3">{project.artist}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-[10px] font-bold text-neutral-500 uppercase">
                        <span>{project.tracks.length} Tracks</span>
                        <span>{project.resolution}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteProject(e, project.id, project.title)}
                        className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {state.projects.length === 0 && !showCreate && (
                  <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-2xl bg-[#0F0F0F]">
                    <span className="text-4xl block mb-4">💿</span>
                    <h3 className="text-sm font-bold text-neutral-300 mb-2">No projects yet</h3>
                    <p className="text-neutral-500 text-xs">Create your first full album project to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Templates View */}
          {activeTab === 'templates' && (
            <>
              <div className="mb-12">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Template Gallery</h1>
                <p className="text-neutral-400 text-sm">Explore and manage available visual styles for your album rendering.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templatesList.map(template => (
                  <div key={template.id} className="p-6 bg-[#0F0F0F] border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors flex flex-col h-full">
                    <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xl mb-6">
                      {template.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                    <p className="text-neutral-500 text-xs leading-relaxed flex-1">
                      {template.desc}
                    </p>
                    <div className="mt-6 pt-6 border-t border-neutral-900 flex justify-between items-center">
                      <span className="text-[10px] font-mono text-neutral-600 uppercase">SYSTEM PRESET</span>
                      <MonitorPlay className="w-4 h-4 text-neutral-600" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Admin View */}
          {activeTab === 'admin' && user?.email === 'alisukorejoi@gmail.com' && (
            <AdminDashboard />
          )}

          {/* Settings View */}
          {activeTab === 'settings' && user && (
            <SettingsView 
              user={user} 
              settings={userSettings} 
              setSettings={setUserSettings}
              projectsCount={state.projects.length}
              onLogout={() => auth.signOut()}
            />
          )}

        </div>
      </div>
    </div>
  );
}
