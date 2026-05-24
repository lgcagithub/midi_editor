/**
 * 10.5 网格选择器 UI 组件
 *
 * 按钮组形式的网格级别选择器。
 * 显示常见网格级别（1/1、1/2、1/4、1/8、1/16、1/32、1/64、1/8T、1/16T），
 * 当前选中级别高亮显示。
 */

import { useStore } from '@/state/store'
import { getGridLevels } from '@/interaction/snap-grid'

// ============================================================
// 样式常量（Merengue 设计系统）
// ============================================================

const btnBase: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  fontFamily: "'Nunito Sans', sans-serif",
  fontWeight: 600,
  border: '1px solid #3A383A',
  background: '#2A282A',
  color: '#B8B4B8',
  cursor: 'pointer',
  outline: 'none',
  transition: 'all 0.15s ease',
}

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: '#7C5CFC',
  borderColor: '#7C5CFC',
  color: '#FFFFFF',
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "'Nunito Sans', sans-serif",
  fontWeight: 700,
  color: '#6A686A',
  marginRight: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  userSelect: 'none',
}

// ============================================================
// GridSelector 组件
// ============================================================

export default function GridSelector(): JSX.Element {
  const ppq = useStore((s) => s.ppq)
  const currentTicks = useStore((s) => s.snapGridTicks)
  const setSnapGridTicks = useStore((s) => s.setSnapGridTicks)
  const levels = getGridLevels(ppq)

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>吸附</span>
      {levels.map((level) => {
        const isActive = level.ticks === currentTicks
        return (
          <button
            key={level.label}
            style={isActive ? btnActive : btnBase}
            onClick={() => setSnapGridTicks(level.ticks)}
            title={`吸附到 ${level.label}`}
            // 首个和末尾按钮圆角
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#3A383A'
                e.currentTarget.style.color = '#E8E4E8'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#2A282A'
                e.currentTarget.style.color = '#B8B4B8'
              }
            }}
          >
            {level.label}
          </button>
        )
      })}
    </div>
  )
}
