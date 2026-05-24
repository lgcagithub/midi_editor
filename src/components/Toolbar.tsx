/**
 * 12.2 Toolbar
 *
 * 顶部工具按钮组：工具切换（指针/画笔/橡皮）、撤销/重做、缩放、文件操作。
 * 使用 Phosphor Duotone 图标。
 */

import { useCallback, useRef } from 'react'
import { useStore } from '@/state/store'
import type { ToolMode } from '@/state/editor-slice'
import { undoManager } from '@/commands/undo-manager'
import { loadMIDIFile } from '@/io/midi-parser'
import { downloadMIDIFile } from '@/io/midi-serializer'

// ============================================================
// 常量
// ============================================================

/** 最小缩放 */
const MIN_ZOOM = 0.1
/** 最大缩放 */
const MAX_ZOOM = 20
/** 缩放步进因子 */
const ZOOM_STEP = 1.25

// ============================================================
// 样式
// ============================================================

const toolbarStyle: React.CSSProperties = {
  height: 44,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '0 12px',
  background: 'var(--surface1, #242223)',
  borderBottom: '1px solid var(--border, #2E2927)',
  flexShrink: 0,
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
}

const separatorStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  background: 'var(--border, #2E2927)',
  margin: '0 6px',
}

const btnBase: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid transparent',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--text3, #7A706A)',
  cursor: 'pointer',
  fontSize: 18,
  transition: 'all 0.12s ease',
  outline: 'none',
}

const btnActive: React.CSSProperties = {
  ...btnBase,
  color: 'var(--accent, #FF6E82)',
  background: 'var(--accent-subtle, #3D0D17)',
}

// ============================================================
// Toolbar 组件
// ============================================================

export default function Toolbar(): JSX.Element {
  const activeTool = useStore((s) => s.activeTool)
  const setTool = useStore((s) => s.setTool)
  const loadProject = useStore((s) => s.loadProject)
  const viewport = useStore((s) => s.viewport)
  const setViewport = useStore((s) => s.setViewport)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- 工具按钮 ----
  const tools: Array<{ mode: ToolMode; icon: string; label: string }> = [
    { mode: 'pointer', icon: 'ph-cursor', label: '选择工具' },
    { mode: 'pencil', icon: 'ph-pencil', label: '画笔工具' },
    { mode: 'eraser', icon: 'ph-eraser', label: '橡皮工具' },
  ]

  // ---- 撤销 / 重做 ----
  const handleUndo = useCallback(() => {
    undoManager.undo()
  }, [])

  const handleRedo = useCallback(() => {
    undoManager.redo()
  }, [])

  // ---- 缩放 ----
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, viewport.zoomX * ZOOM_STEP)
    setViewport({ zoomX: newZoom })
  }, [viewport.zoomX, setViewport])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, viewport.zoomX / ZOOM_STEP)
    setViewport({ zoomX: newZoom })
  }, [viewport.zoomX, setViewport])

  // ---- 方向切换 ----
  const orientation = useStore((s) => s.orientation)
  const setOrientation = useStore((s) => s.setOrientation)

  const handleToggleOrientation = useCallback(() => {
    setOrientation(orientation === 'vertical' ? 'horizontal' : 'vertical')
  }, [orientation, setOrientation])

  // ---- 文件加载 ----
  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const project = await loadMIDIFile(file)
        loadProject(project)
      } catch (err) {
        console.error('加载 MIDI 文件失败:', err)
      }
      // 重置 input 以允许重复选择同一文件
      e.target.value = ''
    },
    [loadProject],
  )

  // ---- 文件保存 ----
  const handleSave = useCallback(() => {
    const state = useStore.getState()
    downloadMIDIFile(
      {
        ppq: state.ppq,
        tracks: state.tracks,
        tempoMap: state.tempoMap,
        timeSigs: state.timeSigs,
      },
      'output.mid',
    )
  }, [])

  return (
    <div style={toolbarStyle}>
      {/* 工具按钮组 */}
      <div style={groupStyle}>
        {tools.map((t, i) => {
          const isActive = activeTool === t.mode
          const style: React.CSSProperties = {
            ...(isActive ? btnActive : btnBase),
            borderColor: 'var(--border, #2E2927)',
            borderLeftWidth: i > 0 ? 0 : 1,
            borderRightWidth: i < tools.length - 1 ? 0 : 1,
            borderRadius: i === 0 ? '6px 0 0 6px' : i === tools.length - 1 ? '0 6px 6px 0' : 0,
          }
          return (
            <button
              key={t.mode}
              style={style}
              onClick={() => setTool(t.mode)}
              title={t.label}
            >
              <i className={`ph-duotone ${t.icon}`} />
            </button>
          )
        })}
      </div>

      <div style={separatorStyle} />

      {/* 撤销 / 重做 */}
      <div style={groupStyle}>
        <button
          style={{ ...btnBase, borderRadius: '6px 0 0 6px', border: '1px solid var(--border, #2E2927)' }}
          onClick={handleUndo}
          title="撤销 (Ctrl+Z)"
        >
          <i className="ph-duotone ph-arrow-u-up-left" />
        </button>
        <button
          style={{ ...btnBase, borderRadius: '0 6px 6px 0', border: '1px solid var(--border, #2E2927)', borderLeftWidth: 0 }}
          onClick={handleRedo}
          title="重做 (Ctrl+Shift+Z)"
        >
          <i className="ph-duotone ph-arrow-u-up-right" />
        </button>
      </div>

      <div style={separatorStyle} />

      {/* 缩放 */}
      <div style={groupStyle}>
        <button
          style={{ ...btnBase, borderRadius: '6px 0 0 6px', border: '1px solid var(--border, #2E2927)' }}
          onClick={handleZoomOut}
          title="缩小"
        >
          <i className="ph-duotone ph-magnifying-glass-minus" />
        </button>
        <button
          style={{ ...btnBase, borderRadius: '0 6px 6px 0', border: '1px solid var(--border, #2E2927)', borderLeftWidth: 0 }}
          onClick={handleZoomIn}
          title="放大"
        >
          <i className="ph-duotone ph-magnifying-glass-plus" />
        </button>
      </div>

      <div style={separatorStyle} />

      {/* 方向切换 */}
      <div style={groupStyle}>
        <button
          style={{ ...btnBase, borderRadius: '6px', border: '1px solid var(--border, #2E2927)' }}
          onClick={handleToggleOrientation}
          title={orientation === 'vertical' ? '切换到横向布局' : '切换到纵向布局'}
        >
          <i className={`ph-duotone ${orientation === 'vertical' ? 'ph-arrows-out-cardinal' : 'ph-arrows-in-cardinal'}`} />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* 文件操作 */}
      <div style={groupStyle}>
        <button
          style={{ ...btnBase, borderRadius: '6px 0 0 6px', border: '1px solid var(--border, #2E2927)' }}
          onClick={handleLoadClick}
          title="加载 MIDI 文件"
        >
          <i className="ph-duotone ph-folder-open" />
        </button>
        <button
          style={{ ...btnBase, borderRadius: '0 6px 6px 0', border: '1px solid var(--border, #2E2927)', borderLeftWidth: 0 }}
          onClick={handleSave}
          title="保存 MIDI 文件"
        >
          <i className="ph-duotone ph-floppy-disk" />
        </button>
      </div>

      {/* 隐藏的 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
