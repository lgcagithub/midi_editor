# MIDI Piano Roll Editor

Web 端 MIDI 编辑器，支持播放、创建、编辑、保存/加载 MIDI 文件。类似 FL Studio / Ableton 的 Piano Roll。

## 技术栈

| 层面 | 选择 |
|------|------|
| 语言 | TypeScript (strict) |
| UI | React 18（仅 UI 外壳，Canvas 渲染不走 React） |
| 构建 | Vite 6 |
| 状态 | Zustand 5 |
| 测试 | Vitest |
| 设计 | Merengue（暖色深底 + Fredoka/Nunito/JetBrains Mono + Phosphor Duotone） |

## 命令

```
npm run dev       # 开发服务器
npm run build     # 生产构建
npm test          # 运行测试 (Vitest)
npx tsc --noEmit  # 类型检查
```

## 目录结构

```
src/
  types.ts              # Note, Track, Project, TempoEvent, TimeSigEvent
  constants.ts           # PPQ, BPM, pitch range, 88-key constants, color palette
  model/                 # 纯函数数据模型 (tick↔seconds, project, note-utils)
  state/                 # Zustand store (projectSlice, transportSlice, editorSlice)
  engine/                # Transport 状态机, Look-Ahead Scheduler, 后台补偿
  audio/                 # SoundSource 接口, OscillatorBank
  renderer/              # Canvas 渲染 (piano-roll, keyboard, grid, note, cursor, interaction)
  interaction/           # 鼠标交互 (pointer, pencil, eraser, hit-test, mouse-handler)
  io/                    # MIDI 解析器 (SMF→Project) + 序列化器 (Project→SMF)
  commands/              # 撤销/重做 (AddNoteCommand, DeleteNotesCommand, 等)
  components/            # React UI 组件 (App, Toolbar, TransportBar, 等)
```

## 核心架构

- **Canvas 4 层**：grid(z-0) → note(z-1) → cursor(z-2) → interaction(z-3)，各层独立重绘
- **坐标映射**：`coordinate-mapper.ts` 统一处理 tick↔pixel、pitch↔pixel，支持横/纵向
- **projectVersion**：projectSlice 的计数器，每次数据变更 (addNote/removeNote/updateNote) 递增，orchestrator 检测版本变化触发重绘
- **noteHeight**：从键盘 `whiteKeySize × 7/12` 推导，不由 CSS 写死，确保 Piano Roll 行与键盘对齐
- **pitchOffset**：补偿不完整八度 (C8 独白键)，纵向 = `noteHeight × 5/7`
- **键盘数学**：`keyboard-math.ts` — 88 键、52 白键、十二平均律、Y 轴倒置 (C8 顶/A0 底)
- **横向布局**：尚未完整实现，仅保留 orientation 切换状态

## 专项文档

- `doc/painting_piano_keyboard.md` — 钢琴键盘绘制的数学推导
- `openspec/` — 设计规格与任务分解
- `docs/superpowers/specs/` — 实现策略文档
