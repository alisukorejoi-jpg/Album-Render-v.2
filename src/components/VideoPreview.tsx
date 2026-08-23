import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../store';

export function VideoPreview() {
  const { state } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const project = state.currentProject!;
  
  const [scale, setScale] = useState(1);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const trackImgCacheRef = useRef<Record<string, HTMLImageElement>>({});
  
  // Animation refs for 3D Floating Cards
  const lastTrackIndexRef = useRef<number>(-1);
  const currentOffsetRef = useRef<number>(0);
  const targetOffsetRef = useRef<number>(0);
  
  // Calculate Target Resolution
  let targetWidth = 1920;
  let targetHeight = 1080;
  switch (project.resolution) {
    case '720p': targetWidth = 1280; targetHeight = 720; break;
    case '1080p': targetWidth = 1920; targetHeight = 1080; break;
    case '4k': targetWidth = 3840; targetHeight = 2160; break;
    case 'square': targetWidth = 1080; targetHeight = 1080; break;
    case 'portrait': targetWidth = 1080; targetHeight = 1920; break;
  }

  // Load Background Image
  useEffect(() => {
    if (project.coverImage) {
      const img = new Image();
      img.onload = () => {
        bgImgRef.current = img;
      };
      img.src = project.coverImage;
    } else {
      bgImgRef.current = null;
    }
  }, [project.coverImage]);

  // Load Track Images
  useEffect(() => {
    project.tracks.forEach(track => {
      if (track.coverImage && !trackImgCacheRef.current[track.id]) {
        const img = new Image();
        img.onload = () => {
          trackImgCacheRef.current[track.id] = img;
        };
        img.src = track.coverImage;
      }
    });
  }, [project.tracks]);

  // Handle Resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const wRatio = (width - 40) / targetWidth;
        const hRatio = (height - 40) / targetHeight;
        setScale(Math.min(wRatio, hRatio));
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [targetWidth, targetHeight]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const template = project.globalSettings.template || 'minimal';
      
      // Clear
      const defaultBg = template === 'neumorphic_light' ? '#e3e5e8' : template === 'topographic_player' ? '#9c9ca3' : '#0a0a0b';
      const bgColor = project.globalSettings.backgroundColor || defaultBg;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw uploaded background image
      if (bgImgRef.current && template !== 'floating_cards') {
        const img = bgImgRef.current;
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > targetRatio) {
           drawWidth = targetHeight * imgRatio;
           offsetX = (targetWidth - drawWidth) / 2;
        } else {
           drawHeight = targetWidth / imgRatio;
           offsetY = (targetHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      }
      
      // Draw Topographic lines if topographic_player template and no bg img
      if (template === 'topographic_player' && !bgImgRef.current) {
         ctx.save();
         ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
         ctx.lineWidth = 2.5 * (targetWidth / 1920);
         ctx.beginPath();
         const yStep = targetHeight / 40;
         for (let i = -15; i < 50; i++) {
             const yOffset = yStep * i;
             ctx.moveTo(0, yOffset);
             for (let x = 0; x <= targetWidth; x += 30 * (targetWidth / 1920)) {
                 const xNorm = x / targetWidth;
                 const wave1 = Math.sin(xNorm * 12 + i * 0.5) * 50 * (targetWidth / 1920);
                 const wave2 = Math.cos(xNorm * 6 - i * 0.4) * 80 * (targetWidth / 1920);
                 const wave3 = Math.sin(xNorm * 25 + i * 0.2) * 20 * (targetWidth / 1920);
                 const y = yOffset + wave1 + wave2 + wave3;
                 ctx.lineTo(x, y);
             }
         }
         ctx.stroke();
         ctx.restore();
      }

      // Add subtle noise/gradient for cinematic feel, unless it's a template that specifies its own background
      if (template !== 'glass_player' && template !== 'glowing_mini' && template !== 'floating_cards' && template !== 'neumorphic_light' && template !== 'topographic_player') {
        const gradient = ctx.createLinearGradient(0, 0, 0, targetHeight);
        gradient.addColorStop(0, 'rgba(30, 30, 40, 0.3)');
        gradient.addColorStop(1, 'rgba(10, 10, 15, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      // Determine active track
      let activeTrack = null;
      let activeTrackIndex = -1;
      let timeAccumulator = 0;
      let trackStartTime = 0;
      
      const playTime = state.currentTime;

      for (let i = 0; i < project.tracks.length; i++) {
        const track = project.tracks[i];
        if (playTime >= timeAccumulator && playTime < timeAccumulator + track.duration) {
          activeTrack = track;
          activeTrackIndex = i;
          trackStartTime = timeAccumulator;
          break;
        }
        timeAccumulator += track.duration;
      }

      if (!activeTrack && project.tracks.length > 0) {
        activeTrack = project.tracks[0];
        activeTrackIndex = 0;
        trackStartTime = 0;
      }
      
      // Update offset for floating cards animation
      if (lastTrackIndexRef.current !== activeTrackIndex) {
        if (lastTrackIndexRef.current !== -1 && activeTrackIndex !== -1) {
          const diff = activeTrackIndex - lastTrackIndexRef.current;
          targetOffsetRef.current += diff;
        }
        lastTrackIndexRef.current = activeTrackIndex;
      }
      currentOffsetRef.current += (targetOffsetRef.current - currentOffsetRef.current) * 0.08;
      
      if (template === 'minimal') {
        // Minimal Cinematic
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `300 48px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '10px';
        ctx.fillText(project.title.toUpperCase(), targetWidth / 2, targetHeight / 2 - 120);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `400 32px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '5px';
        ctx.fillText(project.artist.toUpperCase(), targetWidth / 2, targetHeight / 2 - 50);
        
        if (activeTrack) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold 64px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '2px';
          const trackTitle = activeTrack.title || 'Untitled Track';
          ctx.fillText(`${activeTrack.number.toString().padStart(2, '0')}. ${trackTitle.toUpperCase()}`, targetWidth / 2, targetHeight / 2 + 100);
          
          ctx.fillStyle = '#06b6d4'; // cyan-500
          ctx.font = `400 24px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '8px';
          ctx.fillText('NOW PLAYING', targetWidth / 2, targetHeight / 2 + 180);
        }
      } else if (template === 'now_playing') {
        // Now Playing
        if (activeTrack) {
          const cw = targetWidth;
          const ch = targetHeight;
          
          // Draw Album art placeholder (a colored box for now)
          const rectSize = 400;
          const rectX = cw / 2 - rectSize / 2;
          const rectY = ch / 2 - rectSize / 2 - 100;
          
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 20;
          
          const trackImg = trackImgCacheRef.current[activeTrack.id];
          if (trackImg) {
            // Fill an invisible rect first just to create the shadow
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fillRect(rectX, rectY, rectSize, rectSize);
            ctx.shadowBlur = 0; // Turn off shadow for the actual image draw
            ctx.shadowOffsetY = 0;
            
            // Draw image covering the rect (square)
            ctx.save();
            ctx.beginPath();
            ctx.rect(rectX, rectY, rectSize, rectSize);
            ctx.clip();
            // simple cover logic: draw centered and scaled
            const imgRatio = trackImg.width / trackImg.height;
            let drawW = rectSize;
            let drawH = rectSize;
            if (imgRatio > 1) {
                drawW = rectSize * imgRatio;
            } else {
                drawH = rectSize / imgRatio;
            }
            ctx.drawImage(trackImg, rectX - (drawW - rectSize) / 2, rectY - (drawH - rectSize) / 2, drawW, drawH);
            ctx.restore();
          } else {
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(rectX, rectY, rectSize, rectSize);
          }
          
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          ctx.textAlign = 'center';
          ctx.fillStyle = '#06b6d4'; // cyan-500
          ctx.font = `600 24px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '8px';
          ctx.fillText('NOW PLAYING', cw / 2, rectY + rectSize + 80);

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold 56px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '0px';
          ctx.fillText((activeTrack.title || 'Untitled').toUpperCase(), cw / 2, rectY + rectSize + 160);

          ctx.fillStyle = '#a3a3a3'; // neutral-400
          ctx.font = `400 32px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.fillText((activeTrack.artist || project.artist).toUpperCase(), cw / 2, rectY + rectSize + 220);

          // Progress bar
          const barW = 600;
          const barX = cw / 2 - barW / 2;
          const barY = rectY + rectSize + 300;
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(barX, barY, barW, 4);
          
          const trackElapsed = Math.max(0, playTime - trackStartTime);
          const progress = Math.min(1, trackElapsed / activeTrack.duration);
          
          ctx.fillStyle = '#06b6d4'; // cyan-500
          ctx.fillRect(barX, barY, barW * progress, 4);
          ctx.beginPath();
          ctx.arc(barX + barW * progress, barY + 2, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.textAlign = 'left';
          ctx.font = `400 20px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.fillText(formatTime(trackElapsed), barX, barY + 40);
          ctx.textAlign = 'right';
          ctx.fillText(formatTime(activeTrack.duration), barX + barW, barY + 40);
        }
      } else if (template === 'playlist') {
        // Playlist
        const cw = targetWidth;
        const ch = targetHeight;
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `600 32px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '4px';
        ctx.fillText(project.artist.toUpperCase(), 200, 200);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 72px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '2px';
        ctx.fillText(project.title.toUpperCase(), 200, 280);

        const listStartY = 450;
        project.tracks.forEach((track, i) => {
          const isActive = i === activeTrackIndex;
          ctx.fillStyle = isActive ? '#06b6d4' : 'rgba(255, 255, 255, 0.4)';
          ctx.font = isActive ? `bold 40px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif` : `400 40px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          
          const prefix = isActive ? '▶ ' : '   ';
          const num = track.number.toString().padStart(2, '0');
          ctx.fillText(`${prefix}${num}  ${track.title || 'Untitled'}`, 200, listStartY + (i * 70));
        });
      } else if (template === 'centered_bold') {
        // Centered Bold Layout
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Album Title
        ctx.fillStyle = '#ffffff';
        ctx.font = `300 36px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '12px';
        ctx.fillText(project.title.toUpperCase(), targetWidth / 2, targetHeight / 2 - 160);
        
        // Artist
        ctx.fillStyle = '#737373'; // neutral-500
        ctx.font = `400 24px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
        ctx.letterSpacing = '6px';
        ctx.fillText(project.artist.toUpperCase(), targetWidth / 2, targetHeight / 2 - 100);
        
        if (activeTrack) {
          // Track Info
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold 84px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '0px';
          const trackTitle = activeTrack.title || 'Untitled Track';
          ctx.fillText(`${activeTrack.number.toString().padStart(2, '0')}. ${trackTitle.toUpperCase()}`, targetWidth / 2, targetHeight / 2 + 40);
          
          // Now Playing
          ctx.fillStyle = '#06b6d4'; // cyan-500
          ctx.font = `500 18px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}", sans-serif`;
          ctx.letterSpacing = '10px';
          ctx.fillText('NOW PLAYING', targetWidth / 2, targetHeight / 2 + 120);
        }
      } else if (template === 'glass_player') {
        const scaleF = targetWidth / 1920;
        const cw = targetWidth;
        const ch = targetHeight;

        // Main Glass Card
        const cardW = 1000 * scaleF;
        const cardH = 460 * scaleF;
        const cardX = cw / 2 - cardW / 2;
        const cardY = 160 * scaleF;

        ctx.fillStyle = 'rgba(20, 20, 20, 0.5)';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 40 * scaleF;
        ctx.shadowOffsetY = 20 * scaleF;
        roundRect(ctx, cardX, cardY, cardW, cardH, 40 * scaleF);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        ctx.lineWidth = 2 * scaleF;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        if (activeTrack) {
          // NOW PLAYING
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = `600 ${18 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.letterSpacing = `${4 * scaleF}px`;
          ctx.fillText('NOW PLAYING', cw / 2, cardY + 60 * scaleF);

          // Track Title
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${72 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
          ctx.letterSpacing = '0px';
          ctx.fillText(`♫ ${activeTrack.title || 'Untitled Track'}`, cw / 2, cardY + 140 * scaleF);

          // Artist
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = `500 ${32 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
          ctx.fillText(project.artist || 'Unknown Artist', cw / 2, cardY + 200 * scaleF);

          // Progress Bar
          const barW = 800 * scaleF;
          const barX = cw / 2 - barW / 2;
          const barY = cardY + 290 * scaleF;
          const barH = 8 * scaleF;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          roundRect(ctx, barX, barY, barW, barH, barH / 2);
          ctx.fill();

          const trackElapsed = Math.max(0, playTime - trackStartTime);
          const progress = Math.min(1, trackElapsed / activeTrack.duration);
          const activeW = barW * progress;

          ctx.fillStyle = '#ffffff';
          roundRect(ctx, barX, barY, activeW, barH, barH / 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(barX + activeW, barY + barH / 2, 12 * scaleF, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = `500 ${20 * scaleF}px font-mono`;
          ctx.textAlign = 'left';
          ctx.fillText(formatTime(trackElapsed), barX, barY + 40 * scaleF);
          ctx.textAlign = 'right';
          ctx.fillText(formatTime(activeTrack.duration), barX + barW, barY + 40 * scaleF);

          // Controls
          const ctrlY = cardY + 390 * scaleF;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.beginPath();
          ctx.arc(cw / 2, ctrlY, 45 * scaleF, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          ctx.fillStyle = '#000000';
          ctx.fillRect(cw / 2 - 10 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);
          ctx.fillRect(cw / 2 + 4 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `${32 * scaleF}px Arial`;
          ctx.fillText('⏮', cw / 2 - 100 * scaleF, ctrlY);
          ctx.fillText('⏭', cw / 2 + 100 * scaleF, ctrlY);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = `${24 * scaleF}px Arial`;
          ctx.fillText('🔀', cw / 2 - 200 * scaleF, ctrlY);
          ctx.fillText('🔁', cw / 2 + 200 * scaleF, ctrlY);
        }

        // Playlist List Below
        const listStartY = cardY + cardH + 60 * scaleF;
        const thumbSize = 80 * scaleF;
        const maxListItems = 4;
        
        let displayTracks = project.tracks;
        if (project.tracks.length > maxListItems) {
            let startIdx = Math.max(0, activeTrackIndex - 1);
            if (startIdx + maxListItems > project.tracks.length) {
                startIdx = Math.max(0, project.tracks.length - maxListItems);
            }
            displayTracks = project.tracks.slice(startIdx, startIdx + maxListItems);
        }
        
        const listStartX = cw / 2 - (400 * scaleF);

        displayTracks.forEach((track, idx) => {
           const isActive = activeTrack && activeTrack.id === track.id;
           const thumbY = listStartY + (idx * (thumbSize + 25 * scaleF));
           
           ctx.save();
           roundRect(ctx, listStartX, thumbY, thumbSize, thumbSize, 16 * scaleF);
           ctx.clip();
           
           const thumbImg = (track && track.id && trackImgCacheRef.current[track.id]);
           
           if (thumbImg) {
               const imgRatio = thumbImg.width / thumbImg.height;
               let drawW = thumbSize, drawH = thumbSize, drawX = listStartX, drawY = thumbY;
               if (imgRatio > 1) {
                   drawW = thumbSize * imgRatio;
                   drawX = listStartX - (drawW - thumbSize) / 2;
               } else {
                   drawH = thumbSize / imgRatio;
                   drawY = thumbY - (drawH - thumbSize) / 2;
               }
               ctx.drawImage(thumbImg, drawX, drawY, drawW, drawH);
           } else {
               ctx.fillStyle = isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)';
               ctx.fill();
               
               ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.4)';
               ctx.font = `bold ${32 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               ctx.fillText(track.number.toString(), listStartX + thumbSize/2, thumbY + thumbSize/2);
           }
           
           ctx.restore();
           
           ctx.textAlign = 'left';
           ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.6)';
           ctx.font = `bold ${32 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
           ctx.fillText(track.title || 'Untitled', listStartX + thumbSize + 30 * scaleF, thumbY + thumbSize/2 - 12 * scaleF);
           
           ctx.fillStyle = isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)';
           ctx.font = `400 ${24 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
           ctx.fillText(project.artist || 'Unknown Artist', listStartX + thumbSize + 30 * scaleF, thumbY + thumbSize/2 + 22 * scaleF);
        });
      } else if (template === 'glowing_mini') {
        const scaleF = targetWidth / 1920;
        const cw = targetWidth;
        const ch = targetHeight;

        // Main Glow Card
        const cardW = 860 * scaleF;
        const cardH = 480 * scaleF;
        const cardX = 120 * scaleF;
        const cardY = ch - cardH - 120 * scaleF;

        ctx.save();
        ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
        // Set glowing border
        ctx.shadowColor = 'rgba(255, 180, 50, 0.9)';
        ctx.shadowBlur = 40 * scaleF;
        ctx.lineWidth = 3 * scaleF;
        ctx.strokeStyle = 'rgba(255, 200, 80, 1)';
        roundRect(ctx, cardX, cardY, cardW, cardH, 40 * scaleF);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Mini Cover
        const coverSize = 180 * scaleF;
        const coverX = cardX + 50 * scaleF;
        const coverY = cardY + 50 * scaleF;

        ctx.save();
        roundRect(ctx, coverX, coverY, coverSize, coverSize, 24 * scaleF);
        ctx.clip();
        
        const miniCoverImg = (activeTrack && activeTrack.id && trackImgCacheRef.current[activeTrack.id]) || bgImgRef.current;
        
        if (miniCoverImg) {
            const img = miniCoverImg;
            const imgRatio = img.width / img.height;
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
            if (imgRatio > 1) {
                sWidth = img.height;
                sx = (img.width - sWidth) / 2;
            } else {
                sHeight = img.width;
                sy = (img.height - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, coverX, coverY, coverSize, coverSize);
        } else {
            ctx.fillStyle = '#333333';
            ctx.fill();
        }
        ctx.restore();

        // Text
        const textX = coverX + coverSize + 50 * scaleF;
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${54 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
        ctx.fillText((activeTrack?.title || 'Untitled Track').toUpperCase(), textX, coverY + 60 * scaleF);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `500 ${36 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
        ctx.fillText((project.artist || 'Unknown Artist').toUpperCase(), textX, coverY + 120 * scaleF);

        // Heart Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${40 * scaleF}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText('♥', cardX + cardW - 50 * scaleF, coverY + 60 * scaleF);

        // Progress Bar
        const barY = coverY + coverSize + 80 * scaleF;
        const barX = cardX + 50 * scaleF;
        const barW = cardW - 100 * scaleF;
        const barH = 8 * scaleF;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        roundRect(ctx, barX, barY, barW, barH, barH/2);
        ctx.fill();

        if (activeTrack) {
          const trackElapsed = Math.max(0, playTime - trackStartTime);
          const progress = Math.min(1, trackElapsed / activeTrack.duration);
          const activeW = barW * progress;

          ctx.fillStyle = '#ffffff';
          roundRect(ctx, barX, barY, activeW, barH, barH/2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(barX + activeW, barY + barH/2, 12 * scaleF, 0, Math.PI*2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = `500 ${20 * scaleF}px font-mono`;
          ctx.textAlign = 'left';
          ctx.fillText(formatTime(trackElapsed), barX, barY - 20 * scaleF);
          ctx.textAlign = 'right';
          ctx.fillText(formatTime(activeTrack.duration), barX + barW, barY - 20 * scaleF);
        }

        // Controls
        const ctrlY = barY + 100 * scaleF;
        const ctrlX = cardX + cardW / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Play/Pause BG
        ctx.beginPath();
        ctx.arc(ctrlX, ctrlY, 45 * scaleF, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240, 230, 210, 0.9)'; 
        ctx.fill();

        // Play/Pause icon (Pause bars)
        ctx.fillStyle = '#333333';
        ctx.fillRect(ctrlX - 10 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);
        ctx.fillRect(ctrlX + 4 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);

        // Prev / Next
        ctx.fillStyle = '#ffffff';
        ctx.font = `${36 * scaleF}px Arial`;
        ctx.fillText('⏮', ctrlX - 120 * scaleF, ctrlY);
        ctx.fillText('⏭', ctrlX + 120 * scaleF, ctrlY);

        // Shuffle / Repeat
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = `${28 * scaleF}px Arial`;
        ctx.fillText('🔀', ctrlX - 240 * scaleF, ctrlY);
        ctx.fillText('🔁', ctrlX + 240 * scaleF, ctrlY);
      } else if (template === 'floating_cards') {
        const scaleF = targetWidth / 1920;
        const cw = targetWidth;
        const ch = targetHeight;

        const drawCard = (x: number, y: number, w: number, h: number, zIndex: number, overlayAlpha: number, isCenter: boolean, cardTrack?: Track) => {
            ctx.save();
            ctx.shadowColor = 'rgba(255, 200, 50, 0.6)';
            ctx.shadowBlur = 40 * scaleF;
            ctx.lineWidth = 4 * scaleF;
            ctx.strokeStyle = 'rgba(255, 210, 80, 0.9)';

            roundRect(ctx, x, y, w, h, 20 * scaleF);
            ctx.stroke(); 
            ctx.clip(); 
            
            const cardImg = (cardTrack && cardTrack.id && trackImgCacheRef.current[cardTrack.id]) || bgImgRef.current;

            if (cardImg) {
                const img = cardImg;
                const imgRatio = img.width / img.height;
                const targetRatio = w / h;
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                if (imgRatio > targetRatio) {
                    sWidth = img.height * targetRatio;
                    sx = (img.width - sWidth) / 2;
                } else {
                    sHeight = img.width / targetRatio;
                    sy = (img.height - sHeight) / 2;
                }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
            } else {
                ctx.fillStyle = '#222';
                ctx.fill();
            }

            if (overlayAlpha > 0) {
                ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
                ctx.fillRect(x, y, w, h);
            }

            if (isCenter) {
                const grad = ctx.createLinearGradient(0, y, 0, y + 300 * scaleF);
                grad.addColorStop(0, 'rgba(0,0,0,0.8)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, w, h);

                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                const maxWidth = w - 40 * scaleF;
                
                let artistFontSize = 32 * scaleF;
                ctx.font = `bold ${artistFontSize}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
                const displayArtist = activeTrack?.artist || project.artist || 'Unknown Artist';
                let artistWidth = ctx.measureText(displayArtist.toUpperCase()).width;
                if (artistWidth > maxWidth) {
                    artistFontSize = artistFontSize * (maxWidth / artistWidth);
                    ctx.font = `bold ${artistFontSize}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
                }
                ctx.fillText(displayArtist.toUpperCase(), x + w/2, y + 40 * scaleF);

                let titleFontSize = 64 * scaleF;
                ctx.font = `bold ${titleFontSize}px "${project.globalSettings.titleFont || "Playfair Display"}", serif`;
                const displayTitle = activeTrack?.title || 'Untitled Track';
                let titleWidth = ctx.measureText(displayTitle.toLowerCase()).width;
                if (titleWidth > maxWidth) {
                    titleFontSize = titleFontSize * (maxWidth / titleWidth);
                    ctx.font = `bold ${titleFontSize}px "${project.globalSettings.titleFont || "Playfair Display"}", serif`;
                }
                // Center vertically somewhat if font got smaller, or just keep top align. Top align is fine since it's 90 * scaleF
                ctx.fillText(displayTitle.toLowerCase(), x + w/2, y + 90 * scaleF);

                if (activeTrack) {
                    const trackElapsed = Math.max(0, playTime - trackStartTime);
                    const progress = Math.min(1, trackElapsed / activeTrack.duration);

                    const barW = w - 100 * scaleF;
                    const barH = 6 * scaleF;
                    const barX = x + 50 * scaleF;
                    const barY = y + h - 150 * scaleF;

                    // Timestamps
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.font = `500 ${16 * scaleF}px font-mono, monospace`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(formatTime(trackElapsed), barX, barY - 12 * scaleF);
                    ctx.textAlign = 'right';
                    ctx.fillText(formatTime(activeTrack.duration), barX + barW, barY - 12 * scaleF);

                    // Background bar
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    roundRect(ctx, barX, barY, barW, barH, barH/2);
                    ctx.fill();

                    // Active bar
                    const activeW = barW * progress;
                    ctx.fillStyle = '#ffffff';
                    roundRect(ctx, barX, barY, activeW, barH, barH/2);
                    ctx.fill();

                    // Progress Thumb
                    ctx.beginPath();
                    ctx.arc(barX + activeW, barY + barH/2, 10 * scaleF, 0, Math.PI*2);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();

                    // Playback Controls
                    const ctrlY = y + h - 65 * scaleF;
                    const ctrlX = x + w/2;

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Play/Pause Button
                    ctx.beginPath();
                    ctx.arc(ctrlX, ctrlY, 40 * scaleF, 0, Math.PI * 2);
                    ctx.fillStyle = '#E5E1D8'; // Light beige from image
                    ctx.fill();

                    ctx.fillStyle = '#2A2A2A'; // Dark gray for pause bars
                    ctx.fillRect(ctrlX - 10 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);
                    ctx.fillRect(ctrlX + 4 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);

                    // Prev / Next
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `${32 * scaleF}px Arial`;
                    ctx.fillText('⏮', ctrlX - 100 * scaleF, ctrlY);
                    ctx.fillText('⏭', ctrlX + 100 * scaleF, ctrlY);

                    // Shuffle
                    ctx.fillStyle = 'rgba(70, 110, 170, 0.9)'; // Blue box
                    roundRect(ctx, ctrlX - 200 * scaleF, ctrlY - 16 * scaleF, 32 * scaleF, 32 * scaleF, 6 * scaleF);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `${18 * scaleF}px Arial`;
                    ctx.fillText('🔀', ctrlX - 184 * scaleF, ctrlY);

                    // Repeat
                    ctx.fillStyle = 'rgba(70, 110, 170, 0.9)'; // Blue box
                    roundRect(ctx, ctrlX + 168 * scaleF, ctrlY - 16 * scaleF, 32 * scaleF, 32 * scaleF, 6 * scaleF);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `${18 * scaleF}px Arial`;
                    ctx.fillText('🔁', ctrlX + 184 * scaleF, ctrlY);
                }
            }
            ctx.restore();
        };

        const cx = cw / 2;
        const cy = ch / 2;
        
        const baseCards = [
          { i: -3, x: cx - 1160 * scaleF, y: cy - 250 * scaleF, w: 360 * scaleF, h: 500 * scaleF, overlay: 1.0 },
          { i: -2, x: cx - 720 * scaleF,  y: cy - 250 * scaleF, w: 360 * scaleF, h: 500 * scaleF, overlay: 0.7 },
          { i: -1, x: cx - 500 * scaleF,  y: cy - 350 * scaleF, w: 440 * scaleF, h: 700 * scaleF, overlay: 0.4 },
          { i: 0,  x: cx - 300 * scaleF,  y: cy - 450 * scaleF, w: 600 * scaleF, h: 900 * scaleF, overlay: 0.0 },
          { i: 1,  x: cx + 60 * scaleF,   y: cy - 350 * scaleF, w: 440 * scaleF, h: 700 * scaleF, overlay: 0.4 },
          { i: 2,  x: cx + 360 * scaleF,  y: cy - 250 * scaleF, w: 360 * scaleF, h: 500 * scaleF, overlay: 0.7 },
          { i: 3,  x: cx + 800 * scaleF,  y: cy - 250 * scaleF, w: 360 * scaleF, h: 500 * scaleF, overlay: 1.0 },
        ];

        const getLerped = (v: number) => {
          v = Math.max(-3, Math.min(3, v));
          const lower = Math.floor(v);
          const upper = Math.ceil(v);
          const t = v - lower;
          const c1 = baseCards.find(c => c.i === lower)!;
          const c2 = baseCards.find(c => c.i === upper)!;
          return {
            x: c1.x + (c2.x - c1.x) * t,
            y: c1.y + (c2.y - c1.y) * t,
            w: c1.w + (c2.w - c1.w) * t,
            h: c1.h + (c2.h - c1.h) * t,
            overlay: c1.overlay + (c2.overlay - c1.overlay) * t
          };
        };

        const offset = currentOffsetRef.current;
        const target = targetOffsetRef.current;
        
        // Exact sort from back to front based on current visual distance from center
        const cardsToDraw = [];
        for (let c = Math.floor(offset) - 3; c <= Math.ceil(offset) + 3; c++) {
           const v = c - offset;
           if (v >= -3 && v <= 3) {
             cardsToDraw.push({ c, v, absV: Math.abs(v) });
           }
        }
        
        cardsToDraw.sort((a, b) => b.absV - a.absV); // Largest distance first (drawn first/behind)

        for (const card of cardsToDraw) {
            const props = getLerped(card.v);
            const isCenter = (card.c === target); // Only destination card has text
            const trackForCard = project.tracks[card.c];
            drawCard(props.x, props.y, props.w, props.h, 0, props.overlay, isCenter, trackForCard);
        }
      } else if (template === 'neumorphic_light') {
        const cw = targetWidth;
        const ch = targetHeight;
        const scaleF = targetWidth / 1920;
        
        const cardW = 600 * scaleF;
        const cardH = 960 * scaleF;
        const cardX = cw / 2 - cardW / 2;
        const cardY = ch / 2 - cardH / 2;
        const baseColor = project.globalSettings.backgroundColor || '#e3e5e8';
        const darkShadow = 'rgba(163, 177, 198, 0.6)';
        const lightShadow = 'rgba(255, 255, 255, 0.9)';

        // Draw Neumorphic Rect
        const drawNeuRect = (x: number, y: number, w: number, h: number, r: number) => {
            ctx.save();
            ctx.fillStyle = baseColor;
            // Dark Shadow
            ctx.shadowColor = darkShadow;
            ctx.shadowBlur = 20 * scaleF;
            ctx.shadowOffsetX = 10 * scaleF;
            ctx.shadowOffsetY = 10 * scaleF;
            roundRect(ctx, x, y, w, h, r);
            ctx.fill();
            // Light Shadow
            ctx.shadowColor = lightShadow;
            ctx.shadowBlur = 20 * scaleF;
            ctx.shadowOffsetX = -10 * scaleF;
            ctx.shadowOffsetY = -10 * scaleF;
            roundRect(ctx, x, y, w, h, r);
            ctx.fill();
            ctx.restore();
        };

        // Draw Neumorphic Circle
        const drawNeuCircle = (cx: number, cy: number, r: number) => {
            ctx.save();
            ctx.fillStyle = baseColor;
            // Dark
            ctx.shadowColor = darkShadow;
            ctx.shadowBlur = 15 * scaleF;
            ctx.shadowOffsetX = 8 * scaleF;
            ctx.shadowOffsetY = 8 * scaleF;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            // Light
            ctx.shadowColor = lightShadow;
            ctx.shadowBlur = 15 * scaleF;
            ctx.shadowOffsetX = -8 * scaleF;
            ctx.shadowOffsetY = -8 * scaleF;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        // 1. Draw Main Card Background
        drawNeuRect(cardX, cardY, cardW, cardH, 40 * scaleF);

        // 2. Header
        ctx.fillStyle = '#222222';
        ctx.font = `bold ${20 * scaleF}px "${project.globalSettings.titleFont || "Inter"}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PLAYING NOW', cw / 2, cardY + 70 * scaleF);

        // Back Arrow
        ctx.save();
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 5 * scaleF;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cardX + 70 * scaleF, cardY + 60 * scaleF);
        ctx.lineTo(cardX + 55 * scaleF, cardY + 70 * scaleF);
        ctx.lineTo(cardX + 70 * scaleF, cardY + 80 * scaleF);
        ctx.stroke();
        ctx.restore();

        // 3. Cover Art Area
        const coverRadius = 140 * scaleF;
        const coverCy = cardY + 280 * scaleF;
        
        // Outer Neumorphic Ring
        drawNeuCircle(cw / 2, coverCy, coverRadius + 15 * scaleF);

        // Circular Cover Image
        ctx.save();
        ctx.beginPath();
        ctx.arc(cw / 2, coverCy, coverRadius, 0, Math.PI * 2);
        ctx.clip();
        
        const trackImg = (activeTrack && activeTrack.id && trackImgCacheRef.current[activeTrack.id]) || bgImgRef.current;
        if (trackImg) {
            const imgRatio = trackImg.width / trackImg.height;
            let drawW = coverRadius * 2;
            let drawH = coverRadius * 2;
            if (imgRatio > 1) {
                drawW = coverRadius * 2 * imgRatio;
            } else {
                drawH = (coverRadius * 2) / imgRatio;
            }
            ctx.drawImage(trackImg, cw / 2 - drawW / 2, coverCy - drawH / 2, drawW, drawH);
        } else {
            ctx.fillStyle = '#9aa1ab'; // Placeholder cover
            ctx.fill();
        }
        ctx.restore();

        // Left/Right Action Buttons
        const sideBtnRadius = 30 * scaleF;
        const leftBtnCx = cardX + 80 * scaleF;
        const rightBtnCx = cardX + cardW - 80 * scaleF;
        drawNeuCircle(leftBtnCx, coverCy, sideBtnRadius);
        drawNeuCircle(rightBtnCx, coverCy, sideBtnRadius);

        // Heart Icon (Left)
        ctx.save();
        ctx.fillStyle = '#222222';
        ctx.font = `${28 * scaleF}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', leftBtnCx, coverCy + 3 * scaleF);
        ctx.restore();

        // Ellipsis Icon (Right)
        ctx.save();
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(rightBtnCx - 10 * scaleF, coverCy, 4 * scaleF, 0, Math.PI * 2);
        ctx.arc(rightBtnCx, coverCy, 4 * scaleF, 0, Math.PI * 2);
        ctx.arc(rightBtnCx + 10 * scaleF, coverCy, 4 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 4. Playlist Area
        const listStartY = coverCy + 190 * scaleF;
        const itemH = 90 * scaleF;
        
        const activeIdx = project.tracks.findIndex(t => t.id === activeTrack?.id);
        const startIdx = Math.max(0, Math.min(project.tracks.length - 4, activeIdx - 1)); 
        const displayTracks = project.tracks.slice(Math.max(0, startIdx), Math.max(0, startIdx) + 4);

        displayTracks.forEach((track, i) => {
            const isPlaying = track.id === activeTrack?.id;
            const itemY = listStartY + i * itemH;
            
            if (isPlaying) {
                drawNeuRect(cardX + 20 * scaleF, itemY, cardW - 40 * scaleF, 80 * scaleF, 20 * scaleF);
            }

            // Track Text
            const textX = cardX + 50 * scaleF;
            const textCy = itemY + 40 * scaleF;
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#111111';
            ctx.font = `bold ${22 * scaleF}px "${project.globalSettings.titleFont || "Inter"}"`;
            ctx.fillText(track.title || 'Unknown Title', textX, textCy - 4 * scaleF);

            ctx.textBaseline = 'top';
            ctx.fillStyle = '#666666';
            ctx.font = `normal ${18 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
            ctx.fillText(track.artist || project.artist || 'Unknown Artist', textX, textCy + 4 * scaleF);

            // Right Button
            const btnCx = cardX + cardW - 70 * scaleF;
            drawNeuCircle(btnCx, itemY + 40 * scaleF, 26 * scaleF);
            
            ctx.fillStyle = '#111111';
            if (isPlaying) {
                // Pause icon
                ctx.fillRect(btnCx - 6 * scaleF, itemY + 30 * scaleF, 4 * scaleF, 20 * scaleF);
                ctx.fillRect(btnCx + 2 * scaleF, itemY + 30 * scaleF, 4 * scaleF, 20 * scaleF);
            } else {
                // Minus icon
                ctx.fillRect(btnCx - 8 * scaleF, itemY + 38 * scaleF, 16 * scaleF, 4 * scaleF);
            }
        });
      } else if (template === 'topographic_player') {
        const cw = targetWidth;
        const ch = targetHeight;
        // Scale to fit the 1300px card vertically with some padding
        const scaleF = Math.min(cw / 1920, ch / 1450);
        
        const cardW = 800 * scaleF;
        const cardH = 1300 * scaleF; // Adjusted for aspect ratio
        const cardX = cw / 2 - cardW / 2;
        const cardY = ch / 2 - cardH / 2 - 20 * scaleF; // Shift up slightly
        
        const sIntensity = (project.globalSettings.shadowIntensity ?? 50) / 50;
        
        // 1. Draw Main Card
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${0.2 * sIntensity})`;
        ctx.shadowBlur = 40 * scaleF;
        ctx.shadowOffsetX = 10 * scaleF;
        ctx.shadowOffsetY = 15 * scaleF;
        ctx.fillStyle = '#f5f7f8';
        roundRect(ctx, cardX, cardY, cardW, cardH, 80 * scaleF);
        ctx.fill();
        ctx.restore();

        const drawHexagon = (cx: number, cy: number, r: number, fill: string, hasShadow = true) => {
            ctx.save();
            if (hasShadow) {
                ctx.shadowColor = `rgba(0,0,0,${0.15 * sIntensity})`;
                ctx.shadowBlur = 15 * scaleF;
                ctx.shadowOffsetX = 5 * scaleF;
                ctx.shadowOffsetY = 10 * scaleF;
            }
            ctx.fillStyle = fill;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - (Math.PI / 6);
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        // Header Title
        ctx.fillStyle = '#444444';
        ctx.font = `900 ${36 * scaleF}px "${project.globalSettings.titleFont || "Inter"}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(project.globalSettings.headerText || project.album || 'Play Nasheed', cw / 2, cardY + 80 * scaleF);

        // Top Left Hexagon
        const tlHexCx = cardX;
        const tlHexCy = cardY + 120 * scaleF;
        drawHexagon(tlHexCx, tlHexCy, 60 * scaleF, '#ffffff');
        
        // Music note in top left hex
        ctx.fillStyle = '#555555';
        ctx.font = `${40 * scaleF}px sans-serif`;
        ctx.fillText('♪', tlHexCx, tlHexCy + 4 * scaleF);

        // 2. Cover Art Area
        const coverRadius = 220 * scaleF;
        const coverCy = cardY + 400 * scaleF;
        
        // Outer Ring for Image
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cw / 2, coverCy, coverRadius + 30 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner shadow effect ring
        ctx.strokeStyle = '#e6e9ea';
        ctx.lineWidth = 15 * scaleF;
        ctx.stroke();
        ctx.restore();

        // Image
        ctx.save();
        ctx.beginPath();
        ctx.arc(cw / 2, coverCy, coverRadius, 0, Math.PI * 2);
        ctx.clip();
        
        const trackImg = (activeTrack && activeTrack.id && trackImgCacheRef.current[activeTrack.id]) || bgImgRef.current;
        if (trackImg) {
            const imgRatio = trackImg.width / trackImg.height;
            let drawW = coverRadius * 2;
            let drawH = coverRadius * 2;
            if (imgRatio > 1) {
                drawW = coverRadius * 2 * imgRatio;
            } else {
                drawH = (coverRadius * 2) / imgRatio;
            }
            ctx.drawImage(trackImg, cw / 2 - drawW / 2, coverCy - drawH / 2, drawW, drawH);
        } else {
            ctx.fillStyle = '#9aa1ab'; 
            ctx.fill();
        }
        
        // Inner shadow on the image clip
        ctx.beginPath();
        ctx.arc(cw / 2, coverCy, coverRadius + 20 * scaleF, 0, Math.PI * 2);
        ctx.shadowColor = `rgba(0,0,0,${0.6 * sIntensity})`;
        ctx.shadowBlur = 30 * scaleF;
        ctx.shadowOffsetX = 10 * scaleF;
        ctx.shadowOffsetY = 10 * scaleF;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = 40 * scaleF;
        ctx.stroke();
        ctx.restore();

        // Top Right Hexagon on Image
        const trHexCx = cw / 2 + coverRadius * 0.8;
        const trHexCy = coverCy - coverRadius * 0.65;
        drawHexagon(trHexCx, trHexCy, 50 * scaleF, '#ffffff');
        
        // Mic icon in top right hex
        ctx.fillStyle = '#555555';
        ctx.font = `${30 * scaleF}px sans-serif`;
        ctx.fillText('🎤', trHexCx, trHexCy + 4 * scaleF);

        // 3. Track Info
        const infoY = coverCy + 300 * scaleF;
        ctx.fillStyle = '#444444';
        ctx.font = `900 ${42 * scaleF}px "${project.globalSettings.titleFont || "Inter"}"`;
        ctx.fillText((activeTrack?.title || 'Unknown Title'), cw / 2, infoY);

        ctx.fillStyle = '#666666';
        ctx.font = `normal ${28 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
        ctx.fillText((activeTrack?.artist || project.artist || 'Unknown Artist'), cw / 2, infoY + 50 * scaleF);

        // 4. Progress Bar
        const barY = infoY + 120 * scaleF;
        const barW = cardW - 140 * scaleF;
        const barH = 24 * scaleF;
        const barX = cw / 2 - barW / 2;

        // Bar bg (unfilled part with inner shadow)
        ctx.save();
        roundRect(ctx, barX, barY, barW, barH, barH / 2);
        ctx.fillStyle = '#f0f3f5';
        ctx.fill();
        ctx.clip();
        ctx.shadowColor = `rgba(0,0,0,${0.3 * sIntensity})`;
        ctx.shadowBlur = 10 * scaleF;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6 * scaleF;
        ctx.strokeStyle = '#f0f3f5'; 
        ctx.lineWidth = 12 * scaleF;
        roundRect(ctx, barX - 10 * scaleF, barY - 10 * scaleF, barW + 20 * scaleF, barH + 20 * scaleF, barH / 2);
        ctx.stroke();
        ctx.restore();

        // Bar fill (dark grey)
        let activeW = 0;
        let trackElapsed = 0;
        if (activeTrack) {
            trackElapsed = state.currentTime - trackStartTime;
            const progress = Math.max(0, Math.min(1, trackElapsed / activeTrack.duration));
            activeW = progress * barW;
        }

        if (activeW > 0) {
            ctx.fillStyle = '#5a5a5a';
            roundRect(ctx, barX, barY, activeW, barH, barH / 2);
            ctx.fill();
        }

        // Thumb
        const thumbCx = barX + activeW;
        const thumbCy = barY + barH / 2;
        ctx.save();
        // Inner shadow on thumb for that embossed look
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(thumbCx, thumbCy, 16 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4 * scaleF;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();

        // Time Text
        ctx.fillStyle = '#555555';
        ctx.font = `normal ${20 * scaleF}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(formatTime(trackElapsed), barX, barY + 40 * scaleF);
        ctx.textAlign = 'right';
        ctx.fillText(activeTrack ? formatTime(activeTrack.duration) : '00:00', barX + barW, barY + 40 * scaleF);

        // 5. Lyrics Dummy
        const lyricY = barY + 90 * scaleF;
        ctx.textAlign = 'center';
        
        const defaultLyrics = "Mum I'm all grown up now\nAnd it's not too late I'd like to put a smile\non your face every day";
        const lyricsText = project.globalSettings.lyricsText || defaultLyrics;
        const lyricLines = lyricsText.split('\n').slice(0, 3); // max 3 lines
        
        if (lyricLines[0]) {
            ctx.fillStyle = '#666666';
            ctx.font = `bold ${22 * scaleF}px "${project.globalSettings.titleFont || "Inter"}"`;
            ctx.fillText(lyricLines[0], cw / 2, lyricY);
        }
        
        if (lyricLines[1]) {
            ctx.font = `normal ${20 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
            ctx.fillText(lyricLines[1], cw / 2, lyricY + 30 * scaleF);
        }
        
        if (lyricLines[2]) {
            ctx.fillStyle = '#a0a0a0';
            ctx.fillText(lyricLines[2], cw / 2, lyricY + 60 * scaleF);
        }

        // 6. Controls
        const ctrlY = cardY + cardH - 120 * scaleF;
        const drawCtrlBtn = (cx: number, cy: number, r: number) => {
            ctx.save();
            ctx.shadowColor = `rgba(0,0,0,${0.2 * sIntensity})`;
            ctx.shadowBlur = 10 * scaleF;
            ctx.shadowOffsetX = 2 * scaleF;
            ctx.shadowOffsetY = 5 * scaleF;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        // Prev
        drawCtrlBtn(cw / 2 - 140 * scaleF, ctrlY, 45 * scaleF);
        ctx.fillStyle = '#555555';
        ctx.font = `bold ${30 * scaleF}px Arial`;
        ctx.fillText('⏮', cw / 2 - 140 * scaleF, ctrlY + 2 * scaleF);

        // Play/Pause
        drawCtrlBtn(cw / 2, ctrlY, 55 * scaleF);
        ctx.fillStyle = '#555555';
        if (state.isPlaying) {
            ctx.fillRect(cw / 2 - 12 * scaleF, ctrlY - 18 * scaleF, 8 * scaleF, 36 * scaleF);
            ctx.fillRect(cw / 2 + 4 * scaleF, ctrlY - 18 * scaleF, 8 * scaleF, 36 * scaleF);
        } else {
            ctx.beginPath();
            ctx.moveTo(cw / 2 - 10 * scaleF, ctrlY - 18 * scaleF);
            ctx.lineTo(cw / 2 + 15 * scaleF, ctrlY);
            ctx.lineTo(cw / 2 - 10 * scaleF, ctrlY + 18 * scaleF);
            ctx.fill();
        }

        // Next
        drawCtrlBtn(cw / 2 + 140 * scaleF, ctrlY, 45 * scaleF);
        ctx.fillStyle = '#555555';
        ctx.font = `bold ${30 * scaleF}px Arial`;
        ctx.fillText('⏭', cw / 2 + 140 * scaleF, ctrlY + 2 * scaleF);

        // 7. Bottom Pill
        const pillW = 340 * scaleF;
        const pillH = 100 * scaleF;
        const pillX = cw / 2 - pillW / 2;
        const pillY = cardY + cardH - pillH / 2; // overlapping bottom edge

        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.15 * sIntensity})`;
        ctx.shadowBlur = 20 * scaleF;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10 * scaleF;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.restore();

        // 3 Icons in pill
        const iconY = pillY + pillH / 2;
        const spacing = pillW / 3;
        
        // Icon 1 (Heart)
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(pillX + spacing / 2, iconY, 36 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `${32 * scaleF}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', pillX + spacing / 2, iconY + 4 * scaleF);

        // Icon 2 (Music note)
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(pillX + spacing * 1.5, iconY, 36 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('♪', pillX + spacing * 1.5, iconY + 4 * scaleF);

        // Icon 3 (User)
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(pillX + spacing * 2.5, iconY, 36 * scaleF, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('👤', pillX + spacing * 2.5, iconY + 4 * scaleF);
      } else if (template === 'cover_flow_player') {
        const cw = targetWidth;
        const ch = targetHeight;
        const scaleF = targetWidth / 1920;
        
        // 1. Background (Blurred Active Track)
        const activeImg = (activeTrack && trackImgCacheRef.current[activeTrack.id]) || bgImgRef.current;
        if (activeImg) {
            ctx.save();
            ctx.filter = `blur(${80 * scaleF}px)`;
            ctx.drawImage(activeImg, -100 * scaleF, -100 * scaleF, cw + 200 * scaleF, ch + 200 * scaleF);
            ctx.restore();
            // Warm/dark overlay to match reference mood
            ctx.fillStyle = 'rgba(40, 20, 0, 0.4)'; 
            ctx.fillRect(0, 0, cw, ch);
        } else {
            // Fallback gradient
            const grad = ctx.createLinearGradient(0, 0, 0, ch);
            grad.addColorStop(0, '#c77830');
            grad.addColorStop(1, '#421600');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cw, ch);
        }

        // 2. Cover Flow Cards
        const activeIdx = activeTrack ? project.tracks.findIndex(t => t.id === activeTrack.id) : 0;
        const offsets = [-2, 2, -1, 1, 0]; // Draw order
        const centerY = ch / 2 - 80 * scaleF;

        offsets.forEach(offset => {
            const trackIdx = activeIdx + offset;
            if (trackIdx < 0 || trackIdx >= project.tracks.length) return;
            const track = project.tracks[trackIdx];
            const trackImg = trackImgCacheRef.current[track.id] || bgImgRef.current;

            ctx.save();
            
            // Calculate Position & Scale
            let scale = 1;
            let posX = cw / 2;
            let zIndexBlur = 0;
            
            if (offset === -2) { scale = 0.65; posX = cw / 2 - 450 * scaleF; zIndexBlur = 8; }
            else if (offset === 2) { scale = 0.65; posX = cw / 2 + 450 * scaleF; zIndexBlur = 8; }
            else if (offset === -1) { scale = 0.85; posX = cw / 2 - 250 * scaleF; zIndexBlur = 3; }
            else if (offset === 1) { scale = 0.85; posX = cw / 2 + 250 * scaleF; zIndexBlur = 3; }
            
            ctx.translate(posX, centerY);
            ctx.scale(scale, scale);
            
            const cardW = 500 * scaleF;
            const cardH = 650 * scaleF;

            // Shadows for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 40 * scaleF;
            ctx.shadowOffsetX = (offset * -15) * scaleF;
            ctx.shadowOffsetY = 20 * scaleF;

            // Draw Base Card & Clip
            ctx.beginPath();
            roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 30 * scaleF);
            ctx.fillStyle = '#111';
            ctx.fill();
            
            // Apply slight blur to background cards for depth of field
            if (offset !== 0) {
                ctx.filter = `blur(${zIndexBlur * scaleF}px) brightness(0.6)`;
            }

            ctx.clip(); // Clip for image
            ctx.shadowColor = 'transparent';

            // Draw Cover Image
            if (trackImg) {
                const imgRatio = trackImg.width / trackImg.height;
                const cardRatio = cardW / cardH;
                let drawW = cardW;
                let drawH = cardH;
                if (imgRatio > cardRatio) {
                    drawW = cardH * imgRatio;
                } else {
                    drawH = cardW / imgRatio;
                }
                ctx.drawImage(trackImg, -drawW / 2, -drawH / 2, drawW, drawH);
            }
            
            // Gradient Overlay for Text Visibility
            const grad = ctx.createLinearGradient(0, 0, 0, cardH / 2);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = grad;
            ctx.fillRect(-cardW / 2, 0, cardW, cardH / 2);

            // Inner Highlight (Glass edge)
            ctx.lineWidth = 2 * scaleF;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 30 * scaleF);
            ctx.stroke();

            // Draw Text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Title
            ctx.font = `bold ${36 * scaleF}px "${project.globalSettings.titleFont || 'Inter'}"`;
            ctx.fillText(track.title || 'Unknown', 0, cardH / 2 - 80 * scaleF);
            
            // Artist
            ctx.fillStyle = '#bbbbbb';
            ctx.font = `normal ${24 * scaleF}px "${project.globalSettings.artistFont || 'Inter'}"`;
            ctx.fillText(track.artist || project.artist || 'Unknown Artist', 0, cardH / 2 - 35 * scaleF);

            ctx.restore();
        });

        // 3. Bottom Glass Player Pill
        const pillW = 1100 * scaleF;
        const pillH = 110 * scaleF;
        const pillX = cw / 2 - pillW / 2;
        const pillY = ch - pillH - 60 * scaleF;

        ctx.save();
        // Base glass pill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 30 * scaleF;
        ctx.shadowOffsetY = 15 * scaleF;
        roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5 * scaleF;
        ctx.stroke();
        
        // Dark Inner Pill (Track Info)
        const innerPillW = 400 * scaleF;
        const innerPillH = 80 * scaleF;
        const innerPillX = cw / 2 - innerPillW / 2;
        const innerPillY = pillY + (pillH - innerPillH) / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        roundRect(ctx, innerPillX, innerPillY, innerPillW, innerPillH, 20 * scaleF);
        ctx.fill();
        
        // Mini Cover
        const miniCoverSize = 60 * scaleF;
        const miniCoverX = innerPillX + 10 * scaleF;
        const miniCoverY = innerPillY + 10 * scaleF;
        if (activeImg) {
            ctx.save();
            ctx.beginPath();
            roundRect(ctx, miniCoverX, miniCoverY, miniCoverSize, miniCoverSize, 10 * scaleF);
            ctx.clip();
            ctx.drawImage(activeImg, miniCoverX, miniCoverY, miniCoverSize, miniCoverSize);
            ctx.restore();
        }
        
        // Inner Track Info
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${18 * scaleF}px "${project.globalSettings.titleFont || 'Inter'}"`;
        ctx.fillText((activeTrack?.title || 'Unknown').substring(0, 20), miniCoverX + miniCoverSize + 15 * scaleF, innerPillY + 35 * scaleF);
        
        ctx.fillStyle = '#aaaaaa';
        ctx.font = `normal ${14 * scaleF}px "${project.globalSettings.artistFont || 'Inter'}"`;
        ctx.fillText((activeTrack?.artist || project.artist || 'Unknown Artist').substring(0, 25), miniCoverX + miniCoverSize + 15 * scaleF, innerPillY + 55 * scaleF);
        
        // Mini Progress Bar
        const progBarW = innerPillW - miniCoverSize - 80 * scaleF;
        const progBarX = miniCoverX + miniCoverSize + 15 * scaleF;
        const progBarY = innerPillY + 68 * scaleF;
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        roundRect(ctx, progBarX, progBarY, progBarW, 3 * scaleF, 1.5 * scaleF);
        ctx.fill();
        
        if (activeTrack) {
            const trackElapsed = state.currentTime - trackStartTime;
            const progress = Math.max(0, Math.min(1, trackElapsed / activeTrack.duration));
            if (progress > 0) {
                ctx.fillStyle = '#ffffff';
                roundRect(ctx, progBarX, progBarY, progBarW * progress, 3 * scaleF, 1.5 * scaleF);
                ctx.fill();
            }
        }
        
        // Ellipsis in inner pill
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${20 * scaleF}px serif`;
        ctx.fillText('...', innerPillX + innerPillW - 35 * scaleF, innerPillY + 45 * scaleF);

        // --- Left Controls ---
        const ctrlY = pillY + pillH / 2;
        const leftCtrlX = pillX + 180 * scaleF;
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.font = `${30 * scaleF}px sans-serif`;
        ctx.fillText('⏮', leftCtrlX - 80 * scaleF, ctrlY + 2 * scaleF); // Previous
        ctx.fillText('⏭', leftCtrlX + 80 * scaleF, ctrlY + 2 * scaleF); // Next
        
        // Play/Pause (Bigger)
        if (state.isPlaying) {
            ctx.fillRect(leftCtrlX - 10 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);
            ctx.fillRect(leftCtrlX + 4 * scaleF, ctrlY - 14 * scaleF, 6 * scaleF, 28 * scaleF);
        } else {
            ctx.beginPath();
            ctx.moveTo(leftCtrlX - 8 * scaleF, ctrlY - 15 * scaleF);
            ctx.lineTo(leftCtrlX + 12 * scaleF, ctrlY);
            ctx.lineTo(leftCtrlX - 8 * scaleF, ctrlY + 15 * scaleF);
            ctx.fill();
        }

        // --- Right Controls ---
        const rightCtrlX = pillX + pillW - 200 * scaleF;
        
        // Custom draw Lyrics Icon
        ctx.beginPath();
        const lx = rightCtrlX - 70 * scaleF;
        const ly = ctrlY;
        ctx.arc(lx, ly - 2 * scaleF, 12 * scaleF, 0, Math.PI * 2);
        ctx.moveTo(lx - 8 * scaleF, ly + 6 * scaleF);
        ctx.lineTo(lx - 12 * scaleF, ly + 14 * scaleF);
        ctx.lineTo(lx - 2 * scaleF, ly + 10 * scaleF);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scaleF;
        ctx.stroke();
        ctx.beginPath(); // Inner quotes
        ctx.moveTo(lx - 4 * scaleF, ly - 4 * scaleF); ctx.lineTo(lx - 4 * scaleF, ly);
        ctx.moveTo(lx + 4 * scaleF, ly - 4 * scaleF); ctx.lineTo(lx + 4 * scaleF, ly);
        ctx.stroke();

        // Custom draw List Icon
        const mx = rightCtrlX;
        ctx.beginPath();
        for (let i = -6; i <= 6; i += 6) {
            ctx.moveTo(mx - 10 * scaleF, ly + i * scaleF);
            ctx.lineTo(mx + 10 * scaleF, ly + i * scaleF);
        }
        ctx.stroke();

        // Custom draw Volume Icon
        const vx = rightCtrlX + 70 * scaleF;
        ctx.beginPath();
        ctx.moveTo(vx - 8 * scaleF, ly - 4 * scaleF);
        ctx.lineTo(vx - 2 * scaleF, ly - 4 * scaleF);
        ctx.lineTo(vx + 6 * scaleF, ly - 10 * scaleF);
        ctx.lineTo(vx + 6 * scaleF, ly + 10 * scaleF);
        ctx.lineTo(vx - 2 * scaleF, ly + 4 * scaleF);
        ctx.lineTo(vx - 8 * scaleF, ly + 4 * scaleF);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(vx + 6 * scaleF, ly, 8 * scaleF, -Math.PI/3, Math.PI/3);
        ctx.arc(vx + 6 * scaleF, ly, 14 * scaleF, -Math.PI/3, Math.PI/3);
        ctx.stroke();

        ctx.restore();
      } else if (template === 'cover_flow_3d') {
        const cw = targetWidth;
        const ch = targetHeight;
        const scaleF = targetWidth / 1920;
        
        // 1. Background (Warm Spotlight)
        const bgGrad = ctx.createRadialGradient(cw / 2, ch / 2 + 100 * scaleF, 100 * scaleF, cw / 2, ch / 2, 1200 * scaleF);
        bgGrad.addColorStop(0, '#4a3525');
        bgGrad.addColorStop(0.5, '#1e140d');
        bgGrad.addColorStop(1, '#0a0705');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cw, ch);

        // 2. Podium
        const podW = 800 * scaleF;
        const podH = 120 * scaleF;
        const podX = cw / 2;
        const podY = ch / 2 + 240 * scaleF; // Center of podium

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 40 * scaleF;
        ctx.shadowOffsetY = 20 * scaleF;
        
        // Bottom ring (shadow/base)
        ctx.beginPath();
        ctx.ellipse(podX, podY + 20 * scaleF, podW / 2 + 40 * scaleF, podH / 2 + 10 * scaleF, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0705';
        ctx.fill();

        // Main podium cylinder
        ctx.beginPath();
        ctx.ellipse(podX, podY + 10 * scaleF, podW / 2, podH / 2, 0, 0, Math.PI * 2);
        const podGrad = ctx.createLinearGradient(podX - podW/2, 0, podX + podW/2, 0);
        podGrad.addColorStop(0, '#2a1a0a');
        podGrad.addColorStop(0.2, '#8b653b');
        podGrad.addColorStop(0.5, '#e0b885');
        podGrad.addColorStop(0.8, '#8b653b');
        podGrad.addColorStop(1, '#2a1a0a');
        ctx.fillStyle = podGrad;
        ctx.fill();
        ctx.lineWidth = 4 * scaleF;
        ctx.strokeStyle = '#6a4a2a';
        ctx.stroke();

        // Podium top
        ctx.beginPath();
        ctx.ellipse(podX, podY, podW / 2, podH / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1e140d';
        ctx.fill();
        ctx.lineWidth = 2 * scaleF;
        ctx.strokeStyle = '#e0b885';
        ctx.stroke();
        ctx.restore();

        // 3. Draw Cards (Cover Flow)
        const drawCard = (x: number, y: number, w: number, h: number, isCenter: boolean, alpha: number, trackForCard?: Track) => {
            ctx.save();
            ctx.shadowColor = isCenter ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = isCenter ? 50 * scaleF : 20 * scaleF;
            ctx.shadowOffsetY = isCenter ? 20 * scaleF : 10 * scaleF;
            ctx.globalAlpha = alpha;

            // Draw rounded rect mask
            roundRect(ctx, x, y, w, h, 24 * scaleF);
            ctx.fillStyle = '#111';
            ctx.fill();

            // Glow border for center
            if (isCenter) {
                ctx.lineWidth = 4 * scaleF;
                ctx.strokeStyle = 'rgba(224, 184, 133, 0.8)';
                ctx.stroke();
            } else {
                ctx.lineWidth = 2 * scaleF;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.stroke();
            }

            ctx.clip(); 

            // Draw image
            const cardImg = (trackForCard && trackForCard.id && trackImgCacheRef.current[trackForCard.id]) || bgImgRef.current;
            if (cardImg) {
                ctx.drawImage(cardImg, x, y, w, h);
            }

            // Dark overlay for text readability at bottom
            const grad = ctx.createLinearGradient(0, y + h - 300 * scaleF, 0, y + h);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            
            // Side card extra darkening
            if (!isCenter) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(x, y, w, h);
            }

            // Draw Text
            const cx = x + w / 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            const displayTitle = trackForCard?.title || 'Untitled Track';
            const displayArtist = trackForCard?.artist || project.artist || 'Unknown Artist';

            if (isCenter) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${48 * scaleF}px "${project.globalSettings.titleFont || "Plus Jakarta Sans"}"`;
                ctx.fillText(displayTitle, cx, y + h - 100 * scaleF);
                
                ctx.fillStyle = 'rgba(224, 184, 133, 0.9)'; // Gold-ish
                ctx.font = `500 ${28 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
                ctx.fillText(displayArtist, cx, y + h - 60 * scaleF);

                // Audio Waveform Fake Graphic
                const waveY = y + h - 30 * scaleF;
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                for(let i=0; i<24; i++) {
                   const barH = 5 * scaleF + Math.random() * 15 * scaleF;
                   ctx.fillRect(cx - 140 * scaleF + i * 12 * scaleF, waveY - barH/2, 4 * scaleF, barH);
                }
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = `bold ${30 * scaleF}px "${project.globalSettings.titleFont || "Plus Jakarta Sans"}"`;
                ctx.fillText(displayTitle, cx, y + h - 70 * scaleF);
                
                ctx.fillStyle = 'rgba(224, 184, 133, 0.7)';
                ctx.font = `500 ${18 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
                ctx.fillText(displayArtist, cx, y + h - 40 * scaleF);
                
                const waveY = y + h - 20 * scaleF;
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                for(let i=0; i<16; i++) {
                   const barH = 3 * scaleF + Math.random() * 8 * scaleF;
                   ctx.fillRect(cx - 60 * scaleF + i * 8 * scaleF, waveY - barH/2, 2 * scaleF, barH);
                }
            }
            
            ctx.restore();
        };

        const cx = cw / 2;
        const cy = ch / 2 - 100 * scaleF;
        
        // Define card positions based on index relative to center (0)
        // x, y, width, height, alpha
        const flowCards = [
          { i: -3, x: cx - 780 * scaleF, y: cy + 40 * scaleF, w: 200 * scaleF, h: 440 * scaleF, alpha: 0.0 },
          { i: -2, x: cx - 640 * scaleF, y: cy + 30 * scaleF, w: 260 * scaleF, h: 500 * scaleF, alpha: 0.7 },
          { i: -1, x: cx - 380 * scaleF, y: cy + 20 * scaleF, w: 320 * scaleF, h: 580 * scaleF, alpha: 1.0 },
          { i: 0,  x: cx,                y: cy,               w: 500 * scaleF, h: 700 * scaleF, alpha: 1.0 },
          { i: 1,  x: cx + 380 * scaleF, y: cy + 20 * scaleF, w: 320 * scaleF, h: 580 * scaleF, alpha: 1.0 },
          { i: 2,  x: cx + 640 * scaleF, y: cy + 30 * scaleF, w: 260 * scaleF, h: 500 * scaleF, alpha: 0.7 },
          { i: 3,  x: cx + 780 * scaleF, y: cy + 40 * scaleF, w: 200 * scaleF, h: 440 * scaleF, alpha: 0.0 },
        ];

        const getFlowLerped = (v: number) => {
          v = Math.max(-3, Math.min(3, v));
          const lower = Math.floor(v);
          const upper = Math.ceil(v);
          const t = v - lower;
          const c1 = flowCards.find(c => c.i === lower)!;
          const c2 = flowCards.find(c => c.i === upper)!;
          return {
            x: c1.x + (c2.x - c1.x) * t,
            y: c1.y + (c2.y - c1.y) * t,
            w: c1.w + (c2.w - c1.w) * t,
            h: c1.h + (c2.h - c1.h) * t,
            alpha: c1.alpha + (c2.alpha - c1.alpha) * t
          };
        };

        const offset = currentOffsetRef.current;
        const target = targetOffsetRef.current;
        
        const cardsToDraw = [];
        for (let c = Math.floor(offset) - 3; c <= Math.ceil(offset) + 3; c++) {
           const v = c - offset;
           if (v >= -3 && v <= 3) {
             cardsToDraw.push({ c, v, absV: Math.abs(v) });
           }
        }
        
        // Sort back to front (largest absolute distance first)
        cardsToDraw.sort((a, b) => b.absV - a.absV);

        for (const card of cardsToDraw) {
            const props = getFlowLerped(card.v);
            const isCenter = (card.c === target);
            const trackForCard = project.tracks[card.c];
            const drawX = props.x - props.w / 2;
            const drawY = props.y - props.h / 2;
            drawCard(drawX, drawY, props.w, props.h, isCenter, props.alpha, trackForCard);
        }

        // 4. Bottom Glass Player Bar
        const barW = 1200 * scaleF;
        const barH = 120 * scaleF;
        const barX = cw / 2 - barW / 2;
        const barY = ch - 160 * scaleF;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 30 * scaleF;
        ctx.shadowOffsetY = 10 * scaleF;
        
        ctx.fillStyle = 'rgba(30, 20, 15, 0.6)';
        roundRect(ctx, barX, barY, barW, barH, 60 * scaleF);
        ctx.fill();
        
        ctx.lineWidth = 2 * scaleF;
        ctx.strokeStyle = 'rgba(224, 184, 133, 0.4)';
        ctx.stroke();
        ctx.restore();

        // Left side controls
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${30 * scaleF}px Arial`;
        const ctrlCY = barY + barH / 2;
        ctx.fillText('⏮', barX + 100 * scaleF, ctrlCY);
        ctx.fillText('⏭', barX + 260 * scaleF, ctrlCY);
        
        // Play button
        ctx.beginPath();
        ctx.arc(barX + 180 * scaleF, ctrlCY, 36 * scaleF, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
        ctx.lineWidth = 1 * scaleF;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        if (state.isPlaying) {
            ctx.fillRect(barX + 180 * scaleF - 8 * scaleF, ctrlCY - 12 * scaleF, 6 * scaleF, 24 * scaleF);
            ctx.fillRect(barX + 180 * scaleF + 2 * scaleF, ctrlCY - 12 * scaleF, 6 * scaleF, 24 * scaleF);
        } else {
            ctx.beginPath();
            ctx.moveTo(barX + 180 * scaleF - 6 * scaleF, ctrlCY - 12 * scaleF);
            ctx.lineTo(barX + 180 * scaleF + 10 * scaleF, ctrlCY);
            ctx.lineTo(barX + 180 * scaleF - 6 * scaleF, ctrlCY + 12 * scaleF);
            ctx.fill();
        }

        // Center mini cover and track info
        const miniCoverSize = 80 * scaleF;
        const miniCoverX = barX + 380 * scaleF;
        const miniCoverY = barY + 20 * scaleF;
        
        ctx.save();
        roundRect(ctx, miniCoverX, miniCoverY, miniCoverSize, miniCoverSize, 12 * scaleF);
        ctx.clip();
        const activeImg = (activeTrack && activeTrack.id && trackImgCacheRef.current[activeTrack.id]) || bgImgRef.current;
        if (activeImg) {
            ctx.drawImage(activeImg, miniCoverX, miniCoverY, miniCoverSize, miniCoverSize);
        } else {
            ctx.fillStyle = '#333';
            ctx.fill();
        }
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${28 * scaleF}px "${project.globalSettings.titleFont || "Plus Jakarta Sans"}"`;
        ctx.fillText(activeTrack?.title || 'Untitled', miniCoverX + 110 * scaleF, ctrlCY - 14 * scaleF);

        ctx.fillStyle = 'rgba(224, 184, 133, 0.9)';
        ctx.font = `500 ${18 * scaleF}px "${project.globalSettings.artistFont || "Plus Jakarta Sans"}"`;
        ctx.fillText(activeTrack?.artist || project.artist || 'Unknown Artist', miniCoverX + 110 * scaleF, ctrlCY + 14 * scaleF);

        // Progress bar in the glass player
        const progW = 280 * scaleF;
        const progX = miniCoverX + 110 * scaleF;
        const progY = ctrlCY + 30 * scaleF;
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        roundRect(ctx, progX, progY, progW, 4 * scaleF, 2 * scaleF);
        ctx.fill();
        
        if (activeTrack) {
            const trackElapsed = Math.max(0, state.currentTime - trackStartTime);
            const progress = Math.min(1, trackElapsed / activeTrack.duration);
            ctx.fillStyle = 'rgba(224, 184, 133, 1)';
            roundRect(ctx, progX, progY, progW * progress, 4 * scaleF, 2 * scaleF);
            ctx.fill();
        }

        // Right side icons
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('...', barX + barW - 320 * scaleF, ctrlCY - 10 * scaleF); // Ellipsis
        
        ctx.font = `${24 * scaleF}px Arial`;
        ctx.fillText('🔀', barX + barW - 240 * scaleF, ctrlCY);
        ctx.fillText('𝄏', barX + barW - 160 * scaleF, ctrlCY); // List icon roughly
        ctx.fillText('🔊', barX + barW - 80 * scaleF, ctrlCY);

      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [project, state.currentTime, state.isPlaying, targetWidth, targetHeight]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <div 
        className="bg-black shadow-2xl overflow-hidden ring-1 ring-white/10"
        style={{
          width: targetWidth * scale,
          height: targetHeight * scale,
        }}
      >
        <canvas
          ref={canvasRef}
          width={targetWidth}
          height={targetHeight}
          className="w-full h-full"
        />
      </div>
      
      {/* Playback Overlay if empty */}
      {project.tracks.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 px-6 py-3 rounded text-[10px] uppercase tracking-widest text-neutral-400 font-bold backdrop-blur-md border border-white/10">
            Add tracks to preview album
          </div>
        </div>
      ) : (
        <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded border border-white/10 text-[10px] text-neutral-400 font-mono pointer-events-none">
          {targetWidth} x {targetHeight} | {project.fps} FPS
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
