import { useAppContext } from '../store';

export function Inspector() {
  const { state, dispatch } = useAppContext();
  const project = state.currentProject!;
  const selectedTrack = project.tracks.find(t => t.id === state.selectedTrackId);

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">INSPECTOR</h3>
      
      <div className="space-y-4">
        
        {/* Always visible: Visual Template */}
        <div>
          <label className="text-[10px] text-neutral-400 block mb-2">VISUAL TEMPLATE</label>
          <select 
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            value={project.globalSettings.template}
            onChange={e => {
              const newSettings = { ...project.globalSettings, template: e.target.value };
              dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
            }}
          >
            <option value="minimal">Minimal Cinematic</option>
            <option value="cover_flow_3d">3D Cover Flow</option>
            <option value="cover_flow_3d_light">3D Cover Flow (Light)</option>
            <option value="now_playing">Now Playing</option>
            <option value="playlist">Full Album Playlist</option>
            <option value="centered_bold">Centered Bold Title</option>
            <option value="glass_player">Glass Player Card</option>
            <option value="glowing_mini">Glowing Mini Player</option>
            <option value="floating_cards">3D Floating Cards</option>
            <option value="neumorphic_light">Neumorphic Light (Mobile)</option>
            <option value="topographic_player">Topographic Player</option>
            <option value="cover_flow_player">Cover Flow Player</option>
          </select>
        </div>

        <div className="w-full h-px bg-neutral-800 my-2" />

        {/* Global Settings */}
        {!selectedTrack && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-neutral-400 block mb-2">TITLE FONT</label>
              <select 
                value={project.globalSettings.titleFont || 'Playfair Display'}
                onChange={e => {
                  const newSettings = { ...project.globalSettings, titleFont: e.target.value };
                  dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Playfair Display">Playfair Display (Serif)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Sans)</option>
                <option value="Montserrat">Montserrat (Bold Sans)</option>
                <option value="Space Grotesk">Space Grotesk (Modern)</option>
                <option value="Bebas Neue">Bebas Neue (Display)</option>
                <option value="Inter">Inter (Clean)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-2">ARTIST FONT</label>
              <select 
                value={project.globalSettings.artistFont || 'Plus Jakarta Sans'}
                onChange={e => {
                  const newSettings = { ...project.globalSettings, artistFont: e.target.value };
                  dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Sans)</option>
                <option value="Playfair Display">Playfair Display (Serif)</option>
                <option value="Montserrat">Montserrat (Bold Sans)</option>
                <option value="Space Grotesk">Space Grotesk (Modern)</option>
                <option value="Inter">Inter (Clean)</option>
              </select>
            </div>

            <div className="w-full h-px bg-neutral-800 my-2" />

            <div>
              <label className="text-[10px] text-neutral-400 block mb-2">BACKGROUND COLOR</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={project.globalSettings.backgroundColor || '#0a0a0b'}
                  onChange={e => {
                    const newSettings = { ...project.globalSettings, backgroundColor: e.target.value };
                    dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                  }}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-xs text-neutral-400 font-mono uppercase">
                  {project.globalSettings.backgroundColor || '#0a0a0b'}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-neutral-800 my-2" />

            <div>
              <label className="text-[10px] text-neutral-400 block mb-2">BACKGROUND IMAGE</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      dispatch({ type: 'UPDATE_PROJECT', payload: { coverImage: e.target?.result as string } });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-cyan-400 hover:file:bg-neutral-700 cursor-pointer"
              />
              {project.coverImage && (
                <button 
                  onClick={() => dispatch({ type: 'UPDATE_PROJECT', payload: { coverImage: null } })}
                  className="mt-2 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest"
                >
                  Remove Background
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">ALBUM TITLE</label>
              <input 
                type="text" 
                value={project.title}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { title: e.target.value } })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 block mb-1">ARTIST NAME</label>
              <input 
                type="text" 
                value={project.artist}
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { artist: e.target.value } })}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            {project.globalSettings.template === 'topographic_player' && (
              <>
                <div className="w-full h-px bg-neutral-800 my-2" />
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">HEADER TEXT</label>
                  <input 
                    type="text" 
                    placeholder="Play Nasheed"
                    value={project.globalSettings.headerText || ''}
                    onChange={e => {
                      const newSettings = { ...project.globalSettings, headerText: e.target.value };
                      dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-neutral-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">LYRICS TEXT</label>
                  <textarea 
                    rows={3}
                    placeholder="Mum I'm all grown up now..."
                    value={project.globalSettings.lyricsText || ''}
                    onChange={e => {
                      const newSettings = { ...project.globalSettings, lyricsText: e.target.value };
                      dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-neutral-600 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 flex justify-between">
                    <span>SHADOW INTENSITY</span>
                    <span>{project.globalSettings.shadowIntensity ?? 50}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="100"
                    value={project.globalSettings.shadowIntensity ?? 50}
                    onChange={e => {
                      const newSettings = { ...project.globalSettings, shadowIntensity: parseInt(e.target.value) };
                      dispatch({ type: 'UPDATE_PROJECT', payload: { globalSettings: newSettings } });
                    }}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Track Specific Settings */}
        {selectedTrack && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] text-cyan-400 block font-bold">TRACK {selectedTrack.number.toString().padStart(2, '0')}</label>
                <button 
                  onClick={() => dispatch({ type: 'SET_SELECTED_TRACK', payload: null })}
                  className="text-[10px] text-neutral-500 hover:text-white"
                >
                  Clear Selection
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">CUSTOM TRACK TITLE</label>
                  <input 
                    type="text" 
                    value={selectedTrack.title}
                    onChange={e => dispatch({ type: 'UPDATE_TRACK', payload: { id: selectedTrack.id, track: { title: e.target.value } } })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">CUSTOM ARTIST</label>
                  <input 
                    type="text" 
                    value={selectedTrack.artist || ''}
                    placeholder={`Default: ${project.artist}`}
                    onChange={e => dispatch({ type: 'UPDATE_TRACK', payload: { id: selectedTrack.id, track: { artist: e.target.value } } })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-neutral-600"
                  />
                </div>
                <div className="w-full h-px bg-neutral-800 my-2" />
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-2">CUSTOM COVER IMAGE</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          dispatch({ type: 'UPDATE_TRACK', payload: { id: selectedTrack.id, track: { coverImage: ev.target?.result as string } } });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-cyan-400 hover:file:bg-neutral-700 cursor-pointer"
                  />
                  {selectedTrack.coverImage && (
                    <button 
                      onClick={() => dispatch({ type: 'UPDATE_TRACK', payload: { id: selectedTrack.id, track: { coverImage: undefined } } })}
                      className="mt-2 text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest"
                    >
                      Remove Cover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
      
      {!selectedTrack && (
        <div className="mt-auto p-4 bg-cyan-500/5 rounded border border-cyan-500/20">
          <p className="text-[10px] text-cyan-500 font-bold mb-1 tracking-widest">GLOBAL EDIT MODE</p>
          <p className="text-[10px] text-neutral-400 leading-relaxed">Changes to Artist and Title will apply to all tracks.</p>
        </div>
      )}
    </div>
  );
}
