import { StateCreator } from 'zustand'
import { Note, Track, Project, TempoEvent, TimeSigEvent } from '@/types'
import { createDefaultProject } from '@/model/project'

export interface ProjectSlice {
  /** PPQ (每四分音符 tick 数) */
  ppq: number
  /** 音轨列表 */
  tracks: Track[]
  /** 速度映射表 */
  tempoMap: TempoEvent[]
  /** 拍号列表 */
  timeSigs: TimeSigEvent[]
  /** 工程数据版本 —— 每次数据变更时递增，供渲染层检测变化 */
  projectVersion: number

  /** 加载工程 */
  loadProject: (project: Project) => void
  /** 创建新工程（默认 1 轨） */
  newProject: () => void
  /** 添加音轨 */
  addTrack: (track: Track) => void
  /** 移除音轨 */
  removeTrack: (trackId: string) => void
  /** 更新音轨属性 */
  updateTrack: (trackId: string, updates: Partial<Track>) => void
  /** 添加音符到指定音轨 */
  addNote: (trackId: string, note: Note) => void
  /** 从指定音轨移除音符 */
  removeNote: (trackId: string, noteId: string) => void
  /** 更新指定音轨中的音符 */
  updateNote: (trackId: string, noteId: string, updates: Partial<Note>) => void
  /** 替换整个速度映射表 */
  updateTempoMap: (tempoMap: TempoEvent[]) => void
  /** 替换整个拍号列表 */
  updateTimeSigs: (timeSigs: TimeSigEvent[]) => void
}

/**
 * 生成简短唯一 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (
  set,
) => {
  const defaultProject = createDefaultProject()

  return {
    ppq: defaultProject.ppq,
    tracks: defaultProject.tracks,
    tempoMap: defaultProject.tempoMap,
    timeSigs: defaultProject.timeSigs,
    projectVersion: 0,

    loadProject: (project) => set({ ...project }),

    newProject: () => set({ ...createDefaultProject() }),

    addTrack: (track) =>
      set((state) => ({
        tracks: [...state.tracks, track],
        projectVersion: state.projectVersion + 1,
      })),

    removeTrack: (trackId) =>
      set((state) => ({
        tracks: state.tracks.filter((t) => t.id !== trackId),
        projectVersion: state.projectVersion + 1,
      })),

    updateTrack: (trackId, updates) =>
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t,
        ),
        projectVersion: state.projectVersion + 1,
      })),

    addNote: (trackId, note) =>
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                notes: [
                  ...t.notes,
                  { ...note, id: note.id || generateId() },
                ],
              }
            : t,
        ),
        projectVersion: state.projectVersion + 1,
      })),

    removeNote: (trackId, noteId) =>
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) }
            : t,
        ),
        projectVersion: state.projectVersion + 1,
      })),

    updateNote: (trackId, noteId, updates) =>
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                notes: t.notes.map((n) =>
                  n.id === noteId ? { ...n, ...updates } : n,
                ),
              }
            : t,
        ),
        projectVersion: state.projectVersion + 1,
      })),

    updateTempoMap: (tempoMap) =>
      set((state) => ({
        tempoMap,
        projectVersion: state.projectVersion + 1,
      })),

    updateTimeSigs: (timeSigs) =>
      set((state) => ({
        timeSigs,
        projectVersion: state.projectVersion + 1,
      })),
  }
}
