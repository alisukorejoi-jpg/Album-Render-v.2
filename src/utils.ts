import { Project, Track } from './types';

export function getTrackTimings(project: Project) {
  const crossfade = project.globalSettings.crossfade || 0;
  const startTimes: number[] = [];
  let currentStart = 0;
  
  for (let i = 0; i < project.tracks.length; i++) {
    startTimes.push(currentStart);
    // Move start time for NEXT track forward, but overlap by crossfade
    currentStart += Math.max(0.1, project.tracks[i].duration - crossfade);
  }
  
  const totalDuration = project.tracks.length > 0 
    ? startTimes[project.tracks.length - 1] + project.tracks[project.tracks.length - 1].duration
    : 0;

  return { startTimes, totalDuration };
}

export function getActiveTrack(project: Project, currentTime: number) {
  const { startTimes } = getTrackTimings(project);
  
  let activeTrack = null;
  let trackStartTime = 0;
  let activeIndex = -1;

  for (let i = project.tracks.length - 1; i >= 0; i--) {
    if (currentTime >= startTimes[i]) {
      activeTrack = project.tracks[i];
      trackStartTime = startTimes[i];
      activeIndex = i;
      break;
    }
  }

  // If before first track somehow, just return first track
  if (!activeTrack && project.tracks.length > 0) {
      activeTrack = project.tracks[0];
      trackStartTime = startTimes[0];
      activeIndex = 0;
  }

  return { activeTrack, trackStartTime, activeIndex };
}

export function getPlayingTracks(project: Project, currentTime: number) {
  const { startTimes } = getTrackTimings(project);
  const crossfade = project.globalSettings.crossfade || 0;
  
  const playing = [];
  
  for (let i = 0; i < project.tracks.length; i++) {
    const track = project.tracks[i];
    const startTime = startTimes[i];
    const endTime = startTime + track.duration;
    
    // If the track is active at this current time
    if (currentTime >= startTime && currentTime < endTime) {
      let volume = 1.0;
      
      // Fade In (if it's not the first track and crossfade exists)
      if (i > 0 && crossfade > 0) {
        const fadeInEnd = startTime + crossfade;
        if (currentTime < fadeInEnd) {
          volume = (currentTime - startTime) / crossfade;
        }
      }
      
      // Fade Out (if it's not the last track and crossfade exists)
      if (i < project.tracks.length - 1 && crossfade > 0) {
        const fadeOutStart = endTime - crossfade;
        if (currentTime >= fadeOutStart) {
          volume = 1.0 - ((currentTime - fadeOutStart) / crossfade);
        }
      }
      
      playing.push({
        track,
        index: i,
        startTime,
        localTime: currentTime - startTime,
        volume: Math.max(0, Math.min(1, volume))
      });
    }
  }
  
  return playing;
}
