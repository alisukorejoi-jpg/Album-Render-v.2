import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Project, Track, GlobalSettings, TextSettings } from './types';

interface AppState {
  currentProject: Project | null;
  projects: Project[];
  isPlaying: boolean;
  currentTime: number;
  selectedTrackId: string | null;
}

type AppAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'OPEN_PROJECT'; payload: string }
  | { type: 'SAVE_PROJECT' }
  | { type: 'UPDATE_PROJECT'; payload: Partial<Project> }
  | { type: 'ADD_TRACKS'; payload: Track[] }
  | { type: 'UPDATE_TRACK'; payload: { id: string; track: Partial<Track> } }
  | { type: 'DELETE_TRACK'; payload: string }
  | { type: 'REORDER_TRACKS'; payload: Track[] }
  | { type: 'SET_SELECTED_TRACK'; payload: string | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number };

const initialState: AppState = {
  currentProject: null,
  projects: [],
  isPlaying: false,
  currentTime: 0,
  selectedTrackId: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'CREATE_PROJECT':
      return { ...state, currentProject: action.payload, projects: [...state.projects, action.payload] };
        case 'DELETE_PROJECT':
      return { 
        ...state, 
        projects: state.projects.filter(p => p.id !== action.payload),
        currentProject: state.currentProject?.id === action.payload ? null : state.currentProject
      };
    case 'OPEN_PROJECT':
      const proj = state.projects.find(p => p.id === action.payload) || null;
      return { ...state, currentProject: proj };
    case 'UPDATE_PROJECT':
      if (!state.currentProject) return state;
      return { ...state, currentProject: { ...state.currentProject, ...action.payload } };
    case 'ADD_TRACKS':
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tracks: [...state.currentProject.tracks, ...action.payload],
        },
      };
    case 'UPDATE_TRACK':
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.map(t =>
            t.id === action.payload.id ? { ...t, ...action.payload.track } : t
          ),
        },
      };
    case 'DELETE_TRACK':
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.filter(t => t.id !== action.payload),
        },
      };
    case 'REORDER_TRACKS':
      if (!state.currentProject) return state;
      return { ...state, currentProject: { ...state.currentProject, tracks: action.payload } };
    case 'SET_SELECTED_TRACK':
      return { ...state, selectedTrackId: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
