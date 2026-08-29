import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../store';
import { getTrackTimings, getActiveTrack, getPlayingTracks } from '../utils';
import { Play, Pause, SkipBack, ZoomIn, ZoomOut } from 'lucide-react';

export function Timeline() {
  const { state, dispatch } = useAppContext();
  const project = state.currentProject!;
  const [zoom, setZoom] = useState(1);

  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeRef = useRef(state.currentTime);

  useEffect(() => {
    timeRef.current = state.currentTime;
  }, [state.currentTime]);

  const { totalDuration, startTimes } = getTrackTimings(project);
  const { activeTrack: currentTrack, trackStartTime } = getActiveTrack(project, state.currentTime);

  // Init AudioContext once
  useEffect(() => {
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        (window as any).__audioAnalyser = analyser;

        const dest = audioCtx.createMediaStreamDestination();
        analyser.connect(dest);
        analyser.connect(audioCtx.destination);
        
        (window as any).__exportAudioStream = dest.stream;
      } catch (e) {
        console.warn("Could not initialize audio routing", e);
      }
    }

    return () => {
      audioPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioPoolRef.current.clear();
    };
  }, []);

  // Update Audio Pool function
  const updateAudioPool = (time: number, forceSeek = false) => {
    const playingTracks = getPlayingTracks(project, time);
    const pool = audioPoolRef.current;
    
    // Set of active track IDs to clean up old ones
    const activeIds = new Set(playingTracks.map(p => p.track.id));

    // Cleanup tracks no longer playing
    pool.forEach((audio, id) => {
      if (!activeIds.has(id)) {
        audio.pause();
        // audio.src = ''; // Optional, keeps it loaded if we seek back soon
      }
    });

    // Update or create active tracks
    playingTracks.forEach(({ track, localTime, volume }) => {
      let audio = pool.get(track.id);
      
      if (!audio) {
        audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = track.audioUrl;
        
        // Connect to analyser
        if (audioCtxRef.current && analyserRef.current) {
           const source = audioCtxRef.current.createMediaElementSource(audio);
           source.connect(analyserRef.current);
        }
        
        pool.set(track.id, audio);
      } else if (audio.src !== track.audioUrl) {
        audio.src = track.audioUrl;
      }

      // Dynamic duration correction for VBR / incomplete metadata
      if (audio.duration && isFinite(audio.duration) && Math.abs(audio.duration - track.duration) > 1) {
          dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, track: { duration: audio.duration } }});
      }

      // Sync time if drifting or forced
      const drift = Math.abs(audio.currentTime - localTime);
      if (forceSeek || drift > 0.3) {
        audio.currentTime = localTime;
      }

      audio.volume = volume;

      if (state.isPlaying && audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else if (!state.isPlaying && !audio.paused) {
        audio.pause();
      }
    });
  };

  // Main playback engine
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let lastTick = performance.now();

    // Initial sync
    updateAudioPool(state.currentTime, true);

    if (state.isPlaying) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      interval = setInterval(() => {
        const now = performance.now();
        const delta = (now - lastTick) / 1000;
        lastTick = now;

        let nextTime = timeRef.current + delta;
        if (nextTime >= totalDuration) {
           nextTime = totalDuration;
           dispatch({ type: 'SET_PLAYING', payload: false });
        }
        
        dispatch({ type: 'SET_CURRENT_TIME', payload: nextTime });
        updateAudioPool(nextTime, false);
        
      }, 50);
    } else {
      updateAudioPool(state.currentTime, false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isPlaying, project.globalSettings.crossfade, totalDuration, dispatch]); // Added crossfade to deps so it updates instantly

  // For clicks / manual seeking
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    
    dispatch({ type: 'SET_CURRENT_TIME', payload: newTime });
    updateAudioPool(newTime, true);
  };

  const togglePlay = () => {
    if (state.currentTime >= totalDuration) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
      updateAudioPool(0, true);
    }
    dispatch({ type: 'SET_PLAYING', payload: !state.isPlaying });
  };

  const handleSkipBack = () => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
    updateAudioPool(0, true);
  };

  return (
    <div className="flex flex-col h-full min-h-[120px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 px-2 gap-2 md:gap-0 shrink-0">
        <div className="flex gap-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest items-center shrink-0">
          <span className="text-cyan-500 whitespace-nowrap">Timeline View</span>
          <span className="whitespace-nowrap">Audio Tracks</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 md:gap-6 shrink-0">
          <div className="text-[11px] text-cyan-400 font-mono font-bold tracking-wider shrink-0">
            {formatTime(state.currentTime)} <span className="text-neutral-600">/</span> {formatTime(totalDuration)}
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={handleSkipBack} className="text-neutral-400 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button onClick={togglePlay} className="text-neutral-400 hover:text-white transition-colors">
              {state.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>

          <div className="hidden md:block w-px h-4 bg-neutral-800 shrink-0"></div>

          <div className="flex items-center gap-2 shrink-0">
            <ZoomOut className="w-4 h-4 text-neutral-500" />
            <input 
              type="range" 
              min="1" 
              max="20" 
              step="0.1" 
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 md:w-24 accent-cyan-500 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="hidden md:block w-px h-4 bg-neutral-800 shrink-0"></div>
          <div className="flex items-center gap-2 shrink-0 group relative">
            <span className="text-[10px] text-neutral-500 uppercase font-bold hidden lg:block">Crossfade:</span>
            <input 
              type="range" 
              min="0" 
              max="15" 
              step="1" 
              value={project.globalSettings.crossfade || 0}
              onChange={(e) => {
                const newProject = { 
                  ...project, 
                  globalSettings: { ...project.globalSettings, crossfade: parseFloat(e.target.value) } 
                };
                dispatch({ type: 'UPDATE_PROJECT', payload: newProject });
              }}
              className="w-16 md:w-20 accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-neutral-400 font-mono w-4">{(project.globalSettings.crossfade || 0)}s</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-neutral-900/30 rounded border border-neutral-800 relative overflow-hidden flex flex-col min-h-[60px]">
        {project.tracks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-600 text-sm">
            Timeline is empty
          </div>
        ) : (
          <div 
            className="relative h-full cursor-text transition-all duration-100 ease-out" 
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
            onClick={handleTimelineClick}
          >
            
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-[1px] bg-cyan-500 z-20 pointer-events-none"
              style={{ left: `${(state.currentTime / totalDuration) * 100}%` }}
            >
              <div className="w-2 h-2 bg-cyan-500 rounded-full -ml-[3.5px] mt-[-1px]" />
            </div>

            {/* Time markers header (mocked for visual) */}
            <div className="h-6 border-b border-neutral-800 flex bg-neutral-900/50 absolute top-0 left-0 right-0 z-10 opacity-50 pointer-events-none">
               {/* Simplified time markers */}
               <div className="w-32 border-r border-neutral-800 text-[9px] flex items-center justify-center text-neutral-600">00:00</div>
               <div className="w-32 border-r border-neutral-800 text-[9px] flex items-center justify-center text-neutral-600">...</div>
            </div>

            {/* Tracks Area (Video, Text, Audio representation) */}
            <div className="absolute top-8 left-0 right-0 bottom-2 flex flex-col gap-1 px-2">
               {/* Audio track representation */}
               <div className="bg-neutral-800/50 border border-neutral-700 rounded h-10 relative flex items-center">
                  <span className="absolute -left-12 text-[9px] text-neutral-500 uppercase font-bold px-2 hidden lg:block">Audio</span>
                  <div className="w-full h-full relative">
                    {project.tracks.map((track, i) => {
                      const widthPercent = (track.duration / totalDuration) * 100;
                      const isSelected = state.selectedTrackId === track.id;
                      // Calculate left offset
                      let leftPercent = 0;
                      let acc = 0;
                      for (let j = 0; j < i; j++) {
                        acc += project.tracks[j].duration;
                      }
                      leftPercent = (acc / totalDuration) * 100;
                      
                      return (
                        <div 
                          key={track.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED_TRACK', payload: track.id });
                          }}
                          style={{ width: `${widthPercent}%`, left: `${leftPercent}%` }}
                          className={`absolute h-full rounded border overflow-hidden cursor-pointer flex flex-col justify-center px-2 transition-colors ${isSelected ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-neutral-700/30 border-neutral-600/30 hover:bg-neutral-600/40'}`}
                        >
                          <div className={`text-[9px] font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-neutral-400'}`}>
                            {track.number}. {track.title}
                          </div>
                          <div className={`h-2 flex items-center gap-0.5 opacity-50 mt-1 ${isSelected ? 'text-cyan-500' : 'text-neutral-500'}`}>
                             <div className="h-full w-0.5 bg-current"></div>
                             <div className="h-1/2 w-0.5 bg-current"></div>
                             <div className="h-3/4 w-0.5 bg-current"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
