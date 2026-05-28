# MIDI Piano Roll 编辑器

浏览器中运行的 MIDI 编辑器 — 加载、播放、编辑、保存 MIDI 文件，像 FL Studio / Ableton 一样的钢琴卷帘体验。

## 功能

- MIDI 文件的加载（.mid）与保存
- 钢琴卷帘（Piano Roll）可视化编辑
- 88 键钢琴键盘，点击试听
- 播放引擎（Web Audio API Look-Ahead 调度）
- 音符工具：画笔添加、指针拖拽/拉伸、橡皮删除、框选
- 网格吸附（全音符到 64 分音符 + 三连音）
- 撤销/重做（Ctrl+Z / Ctrl+Y）
- 暗色主题（Merengue 设计语言）

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173
npm test         # 运行测试
npm run build    # 生产构建
```

## 技术栈

TypeScript · React 18 · Vite 6 · Zustand 5 · Canvas 2D · Web Audio API · Vitest

## 项目结构

```
src/
  model/      数据模型 (tick/seconds 转换, Project)
  state/      Zustand store (project/transport/editor slice)
  engine/     播放引擎 (Transport, Scheduler)
  audio/      音源 (OscillatorBank)
  renderer/   Canvas 渲染 (4 层: grid/note/cursor/interaction)
  interaction/ 鼠标交互 (指针/画笔/橡皮工具)
  io/         MIDI 文件解析/序列化
  commands/   撤销/重做 (Command 模式)
  components/ React UI 组件
```
