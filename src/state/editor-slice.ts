import { StateCreator } from 'zustand'

/** 工具模式 */
export type ToolMode = 'pointer' | 'pencil' | 'eraser'

/** 方向 */
export type Orientation = 'vertical' | 'horizontal'

/** 视口状态 */
export interface ViewportState {
  /** 水平滚动偏移 */
  scrollX: number
  /** 垂直滚动偏移 */
  scrollY: number
  /** 水平缩放 */
  zoomX: number
  /** 垂直缩放 */
  zoomY: number
  /** 每个音符的高度 (px) */
  noteHeight: number
  /** 标尺高度 (px) */
  rulerHeight: number
}

export interface EditorSlice {
  /** 当前激活工具 */
  activeTool: ToolMode
  /** 当前激活音轨 ID */
  activeTrackId: string
  /** 选中的音符 ID 列表 */
  selectedNoteIds: string[]
  /** 方向 */
  orientation: Orientation
  /** 视口状态 */
  viewport: ViewportState
  /** 当前吸附网格间距（tick 数） */
  snapGridTicks: number

  /** 设置当前工具 */
  setTool: (tool: ToolMode) => void
  /** 设置当前激活音轨 */
  setActiveTrackId: (trackId: string) => void
  /** 选中音符（追加） */
  selectNote: (noteId: string) => void
  /** 取消选中音符 */
  deselectNote: (noteId: string) => void
  /** 清空选中 */
  clearSelection: () => void
  /** 设置选中列表 */
  setSelection: (noteIds: string[]) => void
  /** 设置方向 */
  setOrientation: (orientation: Orientation) => void
  /** 更新视口（部分更新） */
  setViewport: (viewport: Partial<ViewportState>) => void
  /** 设置吸附网格间距 */
  setSnapGridTicks: (ticks: number) => void
}

export const createEditorSlice: StateCreator<EditorSlice, [], [], EditorSlice> = (
  set,
) => ({
  activeTool: 'pointer',
  activeTrackId: '',
  selectedNoteIds: [],
  orientation: 'vertical',
  viewport: {
    scrollX: 0,
    scrollY: 0,
    zoomX: 1,
    zoomY: 1,
    noteHeight: 14,
    rulerHeight: 32,
  },
  snapGridTicks: 120, // 默认 1/16 音符（PPQ=480 → 480/4=120）

  setTool: (tool) => set({ activeTool: tool }),

  setActiveTrackId: (trackId) => set({ activeTrackId: trackId }),

  selectNote: (noteId) =>
    set((state) => ({
      selectedNoteIds: state.selectedNoteIds.includes(noteId)
        ? state.selectedNoteIds
        : [...state.selectedNoteIds, noteId],
    })),

  deselectNote: (noteId) =>
    set((state) => ({
      selectedNoteIds: state.selectedNoteIds.filter((id) => id !== noteId),
    })),

  clearSelection: () => set({ selectedNoteIds: [] }),

  setSelection: (noteIds) => set({ selectedNoteIds: noteIds }),

  setOrientation: (orientation) => set({ orientation }),

  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  setSnapGridTicks: (ticks) => set({ snapGridTicks: ticks }),
})
