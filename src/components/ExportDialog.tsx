import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../store';
import { X, Video } from 'lucide-react';

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  const project = state.currentProject!;
  
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState('Ready to render');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const totalDuration = project.tracks.reduce((sum, t) => sum + t.duration, 0);
  const progress = totalDuration > 0 ? Math.min(100, Math.floor((state.currentTime / totalDuration) * 100)) : 0;

  // Auto-stop when finished
  useEffect(() => {
    if (isExporting && state.currentTime >= totalDuration && totalDuration > 0) {
      stopAndSave();
    }
  }, [state.currentTime, isExporting, totalDuration]);

  const startExport = async () => {
    setIsExporting(true);
    setStatus('Initializing Canvas and Audio...');

    try {
      // Find the preview canvas
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error("Preview canvas not found");
      
      const canvasStream = canvas.captureStream(project.fps);
      
      // Get Audio Stream from Timeline
      const audioStream = (window as any).__exportAudioStream as MediaStream | undefined;
      
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream && audioStream.getAudioTracks().length > 0) {
         tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${project.title.replace(/\s+/g, '_')}_Full_Album.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setStatus('Export Complete!');
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 2000);
      };

      // Start from beginning
      dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
      
      // Allow a tiny delay for React state to update and audio to seek to 0
      setTimeout(() => {
         mediaRecorder.start(1000); // emit chunk every second
         dispatch({ type: 'SET_PLAYING', payload: true });
         setStatus('Recording real-time... Do not close tab.');
      }, 500);
      
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      setIsExporting(false);
    }
  };

  const stopAndSave = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    dispatch({ type: 'SET_PLAYING', payload: false });
    setStatus('Saving file...');
  };

  const cancelExport = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    dispatch({ type: 'SET_PLAYING', payload: false });
    setIsExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0F0F0F] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden font-sans">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
            <Video className="w-4 h-4 text-cyan-500" /> EXPORT FULL ALBUM
          </div>
          {!isExporting && (
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white tracking-tight mb-1">{project.title}</h3>
            <p className="text-neutral-400 text-xs font-mono">{project.tracks.length} TRACKS • {project.resolution.toUpperCase()} • {project.fps} FPS</p>
          </div>

          {isExporting ? (
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                <span>{status}</span>
                <span className="text-cyan-500">{progress}%</span>
              </div>
              <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-[11px] text-cyan-100 leading-relaxed font-medium">
                This will render the timeline into a single WebM video file. Ensure all your tracks and text settings are correct.
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            {!isExporting && (
              <button 
                onClick={cancelExport}
                className="px-4 py-2 rounded text-[10px] font-bold tracking-widest hover:bg-neutral-800 text-neutral-400 transition-colors uppercase"
              >
                CLOSE
              </button>
            )}
            
            {isExporting ? (
              <button 
                onClick={stopAndSave}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold tracking-widest transition-colors shadow-lg shadow-red-900/20 uppercase"
              >
                STOP EARLY & SAVE
              </button>
            ) : (
              <button 
                onClick={startExport}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold tracking-widest transition-colors shadow-lg shadow-cyan-900/20 uppercase"
              >
                START EXPORT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
