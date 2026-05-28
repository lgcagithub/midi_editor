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
  height: 6,
  overflowX: 'auto',
  overflowY: 'hidden',
  zIndex: 10,
  background: 'var(--surface2, #2E2927)',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--accent, #FF6E82) var(--surface2, #2E2927)',
}

const scrollBarTrackStyle: React.CSSProperties = {
  height: 1,
}

// ============================================================
// WebKit 滚动条 Merengue 样式
// ============================================================

let scrollbarCSSInjected = false
function injectScrollbarCSS(): void {
  if (scrollbarCSSInjected) return
  scrollbarCSSInjected = true
  const style = document.createElement('style')
  style.textContent = `
    .piano-roll-scrollbar::-webkit-scrollbar {
      height: 6px;
    }
    .piano-roll-scrollbar::-webkit-scrollbar-track {
      background: var(--surface2, #2E2927);
    }
    .piano-roll-scrollbar::-webkit-scrollbar-thumb {
      background: var(--accent, #FF6E82);
      border-radius: 3px;
    }
    .piano-roll-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #E54D62;
    }
  `
  document.head.appendChild(style)
}

export default function PianoRollView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const horizScrollRef = useRef<HTMLDivElement>(null)
  const setViewport = useStore((s) => s.setViewport)
  const scrollXRaw = useStore((s) => s.viewport.scrollX)

  useEffect(() => { injectScrollbarCSS() }, [])

  /** 滚动条逻辑宽度（足够覆盖绝大多数 MIDI 文件的时间范围） */
  const HORIZ_SCROLL_CONTENT_WIDTH = 100000

  const handleHorizScroll = useCallback(() => {
    const el = horizScrollRef.current
    if (!el) return
    setViewport({ scrollX: el.scrollLeft })
  }, [setViewport])

  useEffect(() => {
    const el = horizScrollRef.current
    if (!el) return
    if (Math.abs(el.scrollLeft - scrollXRaw) > 2) {
      el.scrollLeft = scrollXRaw
    }
  }, [scrollXRaw])

  return (
    <div ref={containerRef} style={containerStyle}>
      <PianoRollCanvas />
      <div
        ref={horizScrollRef}
        className="piano-roll-scrollbar"
        style={scrollBarStyle}
        onScroll={handleHorizScroll}
      >
        <div style={{ ...scrollBarTrackStyle, width: HORIZ_SCROLL_CONTENT_WIDTH }} />
      </div>
    </div>
  )
}
