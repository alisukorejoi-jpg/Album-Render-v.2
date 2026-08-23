import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Project } from '../types';

// Convert Project (with audioFile which cannot be saved to Firestore) to a savable format
export const serializeProject = (project: Project, userId: string) => {
  const savableTracks = project.tracks.map(t => {
    const { audioFile, ...rest } = t;
    return rest;
  });

  return {
    ...project,
    userId,
    tracks: savableTracks,
    lastEdited: serverTimestamp(),
  };
};

export const saveProjectToFirestore = async (project: Project, userId: string) => {
  try {
    const projectRef = doc(db, 'projects', project.id);
    await setDoc(projectRef, serializeProject(project, userId), { merge: true });
  } catch (err) {
    console.error('Failed to save project:', err);
  }
};

export const loadProjectsFromFirestore = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(collection(db, 'projects'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Add empty audioFile back since it's required by the Project type
      const tracks = data.tracks.map((t: any) => ({ ...t, audioFile: null }));
      return {
        ...data,
        id: doc.id,
        tracks,
        lastEdited: data.lastEdited?.toMillis ? data.lastEdited.toMillis() : Date.now()
      } as Project;
    });
  } catch (err) {
    console.error('Failed to load projects:', err);
    return [];
  }
};

export const deleteProjectFromFirestore = async (projectId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    console.error("Error deleting project from Firestore: ", error);
    throw error;
  }
};
