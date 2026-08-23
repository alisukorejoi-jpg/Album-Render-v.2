import React, { useRef } from 'react';
import { useAppContext } from '../store';
import { Plus, GripVertical, Music, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Track } from '../types';

export function TrackList() {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    const newTracks: Track[] = await Promise.all(
      files.map(async (file, index) => {
        // Read duration using an Audio object
        const url = URL.createObjectURL(file);
        const duration = await new Promise<number>((resolve) => {
          const audio = new Audio(url);
          audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
          });
        });

        const num = state.currentProject!.tracks.length + index + 1;
        
        // Strip extension for title
        let title = file.name;
        const lastDot = title.lastIndexOf('.');
        if (lastDot > 0) title = title.substring(0, lastDot);

        return {
          id: Math.random().toString(36).substring(7),
          number: num,
          title,
          audioFile: file,
          audioUrl: url,
          duration,
        } as Track;
      })
    );

    dispatch({ type: 'ADD_TRACKS', payload: newTracks });
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tracks = state.currentProject?.tracks || [];

  const handleMoveTrack = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!state.currentProject) return;
    
    const newTracks = [...state.currentProject.tracks];
    
    if (direction === 'up' && index > 0) {
      const temp = newTracks[index - 1];
      newTracks[index - 1] = newTracks[index];
      newTracks[index] = temp;
    } else if (direction === 'down' && index < newTracks.length - 1) {
      const temp = newTracks[index + 1];
      newTracks[index + 1] = newTracks[index];
      newTracks[index] = temp;
    } else {
      return; // No change
    }
    
    // Update track numbers
    newTracks.forEach((t, i) => t.number = i + 1);
    
    dispatch({ type: 'REORDER_TRACKS', payload: newTracks });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">TRACK LIST</h3>
        <span 
          onClick={() => fileInputRef.current?.click()}
          className="text-[10px] text-cyan-500 font-bold cursor-pointer hover:text-cyan-400"
        >
          + ADD
        </span>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          multiple 
          accept="audio/mp3,audio/wav,audio/m4a,audio/ogg" 
          className="hidden" 
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {tracks.length === 0 ? (
          <div className="text-center py-10 text-neutral-600 text-sm">
            <Music className="w-8 h-8 mx-auto mb-3 opacity-50" />
            No tracks added yet.
          </div>
        ) : (
          tracks.map((track, index) => {
            const isSelected = state.selectedTrackId === track.id;
            return (
              <div 
                key={track.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id })}
                className={`flex items-center gap-2 p-2 rounded group cursor-pointer border ${
                  isSelected 
                    ? 'bg-cyan-500/10 border-cyan-500/30' 
                    : 'hover:bg-neutral-800 border-transparent'
                }`}
              >
                <div className="flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity w-4">
                  <button onClick={(e) => handleMoveTrack(e, index, 'up')} disabled={index === 0} className="hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-current">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => handleMoveTrack(e, index, 'down')} disabled={index === tracks.length - 1} className="hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-current">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-cyan-500' : 'text-neutral-500'}`}>
                  {track.number.toString().padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <input 
                    type="text"
                    value={track.title}
                    onChange={(e) => dispatch({ 
                      type: 'UPDATE_TRACK', 
                      payload: { id: track.id, track: { title: e.target.value } } 
                    })}
                    className={`w-full bg-transparent border-none outline-none text-[11px] font-bold tracking-wide truncate focus:ring-1 focus:ring-cyan-500 rounded px-1 -ml-1 ${isSelected ? 'text-white' : 'text-neutral-300'}`}
                  />
                  <p className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                    {formatTime(track.duration)}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'DELETE_TRACK', payload: track.id });
                  }}
                  className="p-1 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
