/**
 * 12.1 App 根布局
 *
 * 完整编辑器布局：
 *   TitleBar → Toolbar → main-content{Keyboard + PianoRollView + TrackList} → TransportBar
 */

import { useEffect } from 'react'
import { useStore } from '@/state/store'
import Toolbar from '@/components/Toolbar'
import TransportBar from '@/components/TransportBar'
import PianoRollView from '@/components/PianoRollView'
import KeyboardView from '@/components/KeyboardView'
import TrackList from '@/components/TrackList'

// ============================================================
// 样式
// ============================================================

const appStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--background, #1A1819)',
  color: 'var(--text1, #FAF9F8)',
}

const titleBarStyle: React.CSSProperties = {
  height: 32,
  display: 'flex',
  alignItems: 'center',
  padding: '0 14px',
  background: 'var(--surface2, #2E2927)',
  borderBottom: '1px solid var(--border, #2E2927)',
  flexShrink: 0,
  userSelect: 'none',
}

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display, "Fredoka", sans-serif)',
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text2, #A89D96)',
  letterSpacing: '0.3px',
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  minHeight: 0,
}

// ============================================================
// App 组件
// ============================================================

export default function App(): JSX.Element {
  const tracks = useStore((s) => s.tracks)
  const activeTrackId = useStore((s) => s.activeTrackId)
  const setActiveTrackId = useStore((s) => s.setActiveTrackId)

  // 当音轨加载/变化时，确保 activeTrackId 有效
  useEffect(() => {
    if (tracks.length === 0) return
    const stillExists = tracks.some((t) => t.id === activeTrackId)
    if (!stillExists) {
      setActiveTrackId(tracks[0]!.id)
    }
  }, [tracks, activeTrackId, setActiveTrackId])

  return (
    <div style={appStyle}>
      {/* Title Bar */}
      <div style={titleBarStyle}>
        <span style={titleStyle}>MIDI Piano Roll</span>
      </div>

      {/* Toolbar */}
      <Toolbar />

      {/* 主内容区 */}
      <div style={mainStyle}>
        <KeyboardView />
        <PianoRollView />
        <TrackList />
      </div>

      {/* Transport Bar */}
      <TransportBar />
    </div>
  )
}
