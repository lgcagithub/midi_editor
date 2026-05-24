import { create } from 'zustand'
import { createProjectSlice, ProjectSlice } from './project-slice'
import { createTransportSlice, TransportSlice } from './transport-slice'
import { createEditorSlice, EditorSlice } from './editor-slice'

/** 全局 store 组合类型 */
export type StoreState = ProjectSlice & TransportSlice & EditorSlice

/**
 * 全局 Zustand store
 * 组合 project / transport / editor 三个 slice
 */
export const useStore = create<StoreState>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTransportSlice(...a),
  ...createEditorSlice(...a),
}))
