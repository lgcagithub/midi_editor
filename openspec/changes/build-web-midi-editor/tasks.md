## 1. 项目脚手架

- [x] 1.1 使用 Vite 初始化 TypeScript + React 项目
- [x] 1.2 安装 Zustand 依赖
- [x] 1.3 创建目录结构（model/, engine/, audio/, renderer/, interaction/, io/, state/, commands/, components/, utils/）
- [x] 1.4 创建全局类型文件 src/types.ts（Note, Track, TempoEvent, TimeSigEvent, Project）
- [x] 1.5 创建常量文件 src/constants.ts（默认 PPQ, 默认 tempo, 音高范围, 88 键范围等）
- [x] 1.6 创建工具函数文件 src/utils/math.ts（clamp, midiToHz, 基础数学工具）

## 2. 视觉基础设施（Merengue）

- [x] 2.1 在 index.html 中加载 Google Fonts（Fredoka 500, Nunito Sans 400/600/700, JetBrains Mono 400）
- [x] 2.2 在 index.html 中加载 Phosphor Duotone 图标库 CDN
- [x] 2.3 创建 CSS 变量文件 `src/styles/tokens.css`（Merengue 暗色模式 :root 变量：色彩、字体、间距、圆角、阴影、缓动、音符色板）
- [x] 2.4 创建全局样式文件 `src/styles/global.css`（box-sizing reset、body 字体/背景/颜色、focus-visible 焦点环、selection 颜色）
- [x] 2.5 创建亮色模式 CSS 变量（`[data-theme="light"]` 覆盖）
- [x] 2.6 在 main.tsx 中引入 tokens.css 和 global.css

## 3. 数据模型

- [x] 3.1 实现 tickToSeconds 函数（含 tempo map 多段遍历）
- [x] 3.2 实现 secondsToTick 函数（反向转换，含跨 tempo 边界处理）
- [x] 3.3 实现 Project 创建辅助函数（createDefaultProject）
- [x] 3.4 实现 isBlackKey 函数
- [x] 3.5 实现 88 键范围约束函数（clampPitch）
- [x] 3.6 为数据模型函数编写单元测试

## 4. 状态管理

- [x] 4.1 实现 Zustand projectSlice（tracks, tempoMap, timeSigs, ppq, addTrack, removeTrack, addNote, removeNote, updateNote 等操作）
- [x] 4.2 实现 Zustand transportSlice（state, currentTick, startTime, startTick, play, pause, stop）
- [x] 4.3 实现 Zustand editorSlice（activeTool, selectedNoteIds, orientation, viewport: {scrollX, scrollY, zoomX, zoomY, noteHeight}）
- [x] 4.4 组合三个 slice 为完整 store

## 5. MIDI 文件读写

- [x] 5.1 实现 VLQ 解码器（变长量读取）
- [x] 5.2 实现 SMF 文件头解析（MThd chunk → format, trackCount, ppq）
- [x] 5.3 实现 MIDI 事件解析（Note On/Off, Running Status 处理）
- [x] 5.4 实现 Meta 事件解析（Tempo, Time Signature, End of Track）
- [x] 5.5 实现 SysEx 安全跳过
- [x] 5.6 实现 MIDI 事件流到 Project 的组装（跨音轨音符匹配、tempo map 提取）
- [x] 5.7 实现 Project 到 SMF format 1 的序列化（Header + Tempo Track + Note Tracks）
- [x] 5.8 实现浏览器 File API 加载（读取 ArrayBuffer → 解析 → Project）
- [x] 5.9 实现浏览器 File API 保存（Project → 序列化 → Blob → 下载）
- [x] 5.10 实现无效文件错误处理
- [x] 5.11 为解析器和序列化器编写单元测试

## 6. 音频引擎

- [x] 6.1 定义 SoundSource 接口
- [x] 6.2 实现 OscillatorBank（noteOn 创建 OscillatorNode + GainNode，noteOff 停止，资源追踪与清理）
- [x] 6.3 实现 Transport 状态机（play/pause/stop，currentTick 推算）
- [x] 6.4 实现 Look-Ahead Scheduler 调度循环（setInterval 25ms，100ms 窗口，事件时间计算）
- [x] 6.5 实现后台标签页恢复补偿逻辑
- [x] 6.6 实现 AudioContext 初始化与用户手势解锁（audioCtx.resume）
- [x] 6.7 将 Transport 与 Zustand transportSlice 连接
- [x] 6.8 为 Transport 和 Scheduler 编写单元测试

## 7. 钢琴键盘

- [x] 7.1 实现白键索引 ↔ MIDI pitch 双向映射函数（whiteIndexToPitch, pitchToWhiteIndex）
- [x] 7.2 实现键盘几何计算（whiteKeySize, blackKeySize, firstBlackKeyOffset）
- [x] 7.3 实现白键层绘制（渐变 #3C3835→#2E2927，分割线，C 键八度标注）
- [x] 7.4 实现黑键层绘制（88 键遍历，仅黑键音绘制，渐变 #1A1819→#141212，圆角，65% 高度居中）
- [x] 7.5 实现键盘视口裁剪（仅绘制可见音高范围）
- [x] 7.6 实现键盘点击检测（黑键共存区优先 88 网格，白键区 52 分布，Math.floor 索引）
- [x] 7.7 实现点击试听（mousedown 发 Note On，mouseup/leave 发 Note Off）
- [x] 7.8 实现横向/纵向布局的键盘几何适配

## 8. Piano Roll 渲染器

- [x] 8.1 实现坐标映射核心函数（pitch/seconds → x/y，orientation 感知）
- [x] 8.2 实现 4 层 Canvas 容器（CSS 叠放，尺寸同步）
- [x] 8.3 实现背景网格层（小节线 --border-visible、拍线、细分线、行底色交替，C 行标记）
- [x] 8.4 实现网格线密度自适应（间距 < 4px 隐藏细分线）
- [x] 8.5 实现音符层（Merengue 规格：3px 圆角、高光线、音轨色填充、velocity→透明度 0.55-1.0、虚拟渲染 AABB 裁剪、选中态 2px accent 外框+内高光、拖拽态阴影）
- [x] 8.6 实现视口状态管理（scrollX/scrollY/zoomX/zoomY，noteHeight = whiteKeySize × 7/12）
- [x] 8.7 实现缩放（鼠标滚轮，以鼠标位置为中心缩放）
- [x] 8.8 实现滚动（鼠标拖拽空白区域平移或原生滚动条）
- [x] 8.9 实现播放光标层（rAF 驱动，颜色 accent #FF6E82，1px+发光阴影+三角指示器）
- [x] 8.10 实现交互层（绘制中的音符预览、选择框虚线矩形、拖拽位置幽灵）
- [x] 8.11 实现横向/纵向布局切换（键盘位置、坐标轴角色交换）

## 9. 音符交互

- [x] 9.1 实现三种工具模式定义与切换（Pointer, Pencil, Eraser）
- [x] 9.2 实现命中检测（hit-test：边缘热区 4px > 音符身体 > 空白）
- [x] 9.3 实现指针工具 — 单选/清选（单击未选中音符选中，单击空白清选）
- [x] 9.4 实现指针工具 — 拖拽移动（mousedown 记录 oldState，mousemove 实时更新，mouseup 生成 MoveNotesCommand）
- [x] 9.5 实现拖拽移动约束（startTick ≥ 0, 21 ≤ pitch ≤ 108, 相对吸附）
- [x] 9.6 实现指针工具 — 边缘拉伸（左/右边缘，duration 约束 ≥ 1 tick）
- [x] 9.7 实现指针工具 — 框选（mousedown 起点，mousemove 虚线框，mouseup AABB 命中选中）
- [x] 9.8 实现画笔工具 — 点击添加音符（绝对吸附，默认时长=网格单位，替换已有音符）
- [x] 9.9 实现画笔工具 — 拖拽调整时长（复用右边缘拉伸逻辑）
- [x] 9.10 实现画笔 pitch 范围约束（21-108）
- [x] 9.11 实现橡皮工具 — 点击删除音符
- [x] 9.12 将交互系统连接到 Zustand store（选中状态、音符增删改）

## 10. 吸附网格

- [x] 10.1 定义网格级别常量（全音符到六十四分音符 + 三连音变体，共 9 级）
- [x] 10.2 实现 snapTick 函数（Math.round 到最近网格线）
- [x] 10.3 在拖拽操作中使用相对吸附（deltaTick 吸附，保留原始 offset）
- [x] 10.4 在画笔操作中使用绝对吸附（鼠标位置直接吸附）
- [x] 10.5 实现网格选择器 UI 组件（GridSelector.tsx）

## 11. 撤销/重做

- [x] 11.1 定义 Command 接口（execute, undo）
- [x] 11.2 实现 AddNoteCommand
- [x] 11.3 实现 DeleteNotesCommand（单删/批删）
- [x] 11.4 实现 MoveNotesCommand（old/new 状态存储）
- [x] 11.5 实现 ResizeNoteCommand（old/new startTick + duration）
- [x] 11.6 实现 UndoManager 类（undoStack, redoStack, maxDepth=200, execute, undo, redo）
- [x] 11.7 实现拖拽命令聚合（mousemove 不产生命令，仅 mouseup 产生一条）
- [x] 11.8 绑定键盘快捷键 Ctrl+Z（undo）和 Ctrl+Y / Ctrl+Shift+Z（redo）
- [x] 11.9 为 UndoManager 编写单元测试

## 12. UI 组件

- [x] 12.1 实现 App.tsx 根布局（TitleBar → Toolbar → main-content{键盘+画布+音轨侧栏} → TransportBar）
- [x] 12.2 实现 Toolbar.tsx（工具切换按钮组：指针/画笔/橡皮 + 撤销/重做 + 缩放，Phosphor 图标）
- [x] 12.3 实现 TransportBar.tsx（播放/暂停/停止/快进快退圆形按钮，BPM/时间码等宽字体显示，网格选择器）
- [x] 12.4 实现 PianoRollView.tsx（管理 4 层 Canvas 的容器组件，绑定鼠标/触摸事件）
- [x] 12.5 实现 KeyboardView.tsx（键盘 Canvas 容器，响应点击试听）
- [x] 12.6 实现 TrackList.tsx（音轨列表，音轨色点+名称+meta，选中态 accent 左边框）
- [x] 12.7 实现 GridSelector.tsx（网格细分级别按钮组）
- [x] 12.8 实现文件操作（加载 .mid 按钮，保存 .mid 按钮）

## 13. 集成与收尾

- [x] 13.1 串联完整播放流程：加载文件 → 点击播放 → 音频输出 + 光标移动
- [x] 13.2 串联完整编辑流程：画笔添加音符 → 指针选择/拖拽/拉伸 → 橡皮删除 → 撤销/重做
- [x] 13.3 串联横/纵向切换：切换 orientation 后键盘和 Piano Roll 正确重布局
- [x] 13.4 串联文件保存：编辑后保存 → 重新加载验证数据一致性
- [x] 13.5 处理边界情况（空项目播放、全选删除、极端缩放、超长音符、tempo 剧烈变化的文件）
- [x] 13.6 运行所有单元测试确保通过
