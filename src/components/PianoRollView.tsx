/**
 * 12.4 PianoRollView
 *
 * PianoRollCanvas 的容器组件。
 * 管理 4 层 Canvas 尺寸，绑定鼠标/触摸事件，
 * 与左侧键盘同步垂直滚动。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/state/store'
import PianoRollCanvas from './PianoRollCanvas'

// ============================================================
// 样式
// ============================================================

const containerStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
  background: 'var(--bg, #1A1819)',
}

const scrollBarStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 14,
  overflowX: 'auto',
  overflowY: 'hidden',
  zIndex: 10,
}

const scrollBarTrackStyle: React.CSSProperties = {
  height: 1,
}

// ============================================================
// PianoRollView 组件
// ============================================================

export default function PianoRollView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const horizScrollRef = useRef<HTMLDivElement>(null)
  const setViewport = useStore((s) => s.setViewport)
  const scrollXRaw = useStore((s) => s.viewport.scrollX)

  // 水平滚动条同步
  const horizContentWidth = 100000 // 足够宽以允许滚动

  const handleHorizScroll = useCallback(() => {
    const el = horizScrollRef.current
    if (!el) return
    setViewport({ scrollX: el.scrollLeft })
  }, [setViewport])

  // 双向同步：store.scrollX 变化 -> 更新滚动条位置
  useEffect(() => {
    const el = horizScrollRef.current
    if (!el) return
    if (Math.abs(el.scrollLeft - scrollXRaw) > 2) {
      el.scrollLeft = scrollXRaw
    }
  }, [scrollXRaw])

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* 4 层 Canvas */}
      <PianoRollCanvas />

      {/* 水平滚动条 */}
      <div
        ref={horizScrollRef}
        style={scrollBarStyle}
        onScroll={handleHorizScroll}
      >
        <div style={{ ...scrollBarTrackStyle, width: horizContentWidth }} />
      </div>
    </div>
  )
}
