import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../store';
import { ArrowLeft, Save, Play, Square, Download, Settings, Type, Image as ImageIcon, Maximize, Minimize, Loader2 } from 'lucide-react';
import { TrackList } from './TrackList';
import { VideoPreview } from './VideoPreview';
import { Timeline } from './Timeline';
import { Inspector } from './Inspector';
import { ExportDialog } from './ExportDialog';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { saveProjectToFirestore } from '../lib/db';

export function Editor() {
  const { state, dispatch } = useAppContext();
  const project = state.currentProject!;
  const [activeTab, setActiveTab] = useState<'tracks' | 'settings'>('tracks');
  const [showExport, setShowExport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const [user] = useAuthState(auth);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      previewContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleSave = async () => {
    if (!user || !project) return;
    setIsSaving(true);
    try {
      await saveProjectToFirestore(project, user.uid);
      // Could show a toast notification here
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-neutral-200 font-sans selection:bg-cyan-500/30">
      {/* Topbar */}
      <div className="h-auto md:h-14 border-b border-neutral-800 bg-[#0F0F0F] flex flex-col md:flex-row items-center justify-between p-4 md:px-6 gap-4 md:gap-0">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <button 
            onClick={() => dispatch({ type: 'OPEN_PROJECT', payload: '' })} // Close
            className="flex items-center gap-2 p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="hidden md:block w-px h-6 bg-neutral-800"></div>
          <span className="text-white font-bold tracking-tight text-lg flex items-center gap-2 truncate">
            <span className="text-cyan-500 shrink-0">🎵</span> <span className="truncate">{project.title || 'Album Render'}</span>
          </span>
          <div className="hidden md:block w-px h-6 bg-neutral-800"></div>
          <button 
            onClick={toggleFullscreen}
            title="Fullscreen Preview"
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center border border-neutral-700 rounded bg-neutral-900 overflow-hidden">
            <span className="text-[10px] md:text-xs font-bold text-cyan-500 px-2 md:px-3 py-1.5 uppercase tracking-wider bg-neutral-800">RESOLUTION</span>
            <select
              value={project.resolution || 'portrait'}
              onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { resolution: e.target.value as any } })}
              className="bg-transparent text-[10px] md:text-xs text-white px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="720p" className="bg-neutral-900 text-white">720p HD (16:9)</option>
              <option value="1080p" className="bg-neutral-900 text-white">1080p Full HD (16:9)</option>
              <option value="4k" className="bg-neutral-900 text-white">2160p 4K (16:9)</option>
              <option value="square" className="bg-neutral-900 text-white">Square (1:1 Instagram)</option>
              <option value="portrait" className="bg-neutral-900 text-white">Portrait (9:16 Reels)</option>
            </select>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving || !user}
            className="flex items-center gap-2 text-[10px] md:text-xs px-2 md:px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 font-semibold transition-colors disabled:opacity-50"
          >
             {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
             SAVE
          </button>
          <button 
            onClick={() => dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying })}
            className={`text-[10px] md:text-xs px-2 md:px-3 py-1.5 rounded font-semibold transition-colors ${state.isPlaying ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20' : 'bg-neutral-800 hover:bg-neutral-700'}`}
          >
             {state.isPlaying ? 'STOP PREVIEW' : 'PREVIEW'}
          </button>
          <button 
            onClick={() => setShowExport(true)}
            className="text-[10px] md:text-xs px-3 md:px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/20 transition-colors whitespace-nowrap"
          >
            EXPORT WEBM
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Panel - Tracks & Settings */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-[#0F0F0F] flex flex-col shrink-0">
          <div className="flex border-b border-neutral-800 shrink-0">
            <button 
              onClick={() => setActiveTab('tracks')}
              className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'tracks' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-neutral-500 hover:text-white'}`}
            >
              TRACKS
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeTab === 'settings' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-neutral-500 hover:text-white'}`}
            >
              INFO
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 min-h-[200px] lg:min-h-0">
            {activeTab === 'tracks' ? (
              <TrackList />
            ) : (
              <div className="space-y-4">
                <div className="p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">
                   <p className="text-[10px] text-neutral-400">Edit Album Title, Artist, and Cover in the Inspector on the right.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - Preview */}
        <div ref={previewContainerRef} className="flex-1 bg-black flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden min-h-[300px] lg:min-h-0 shrink-0">
           <VideoPreview />
        </div>

        {/* Right Panel - Inspector */}
        <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-[#0F0F0F] flex flex-col p-4 shrink-0">
          <Inspector />
        </div>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-auto lg:h-32 border-t border-neutral-800 bg-[#0A0A0A] flex flex-col shrink-0 p-3 overflow-x-auto">
        <Timeline />
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
