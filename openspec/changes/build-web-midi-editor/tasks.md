## 1. 项目脚手架

- [ ] 1.1 使用 Vite 初始化 TypeScript + React 项目
- [ ] 1.2 安装 Zustand 依赖
- [ ] 1.3 创建目录结构（model/, engine/, audio/, renderer/, interaction/, io/, state/, commands/, components/, utils/）
- [ ] 1.4 创建全局类型文件 src/types.ts（Note, Track, TempoEvent, TimeSigEvent, Project）
- [ ] 1.5 创建常量文件 src/constants.ts（默认 PPQ, 默认 tempo, 音高范围, 88 键范围等）
- [ ] 1.6 创建工具函数文件 src/utils/math.ts（clamp, midiToHz, 基础数学工具）

## 2. 数据模型

- [ ] 2.1 实现 tickToSeconds 函数（含 tempo map 多段遍历）
- [ ] 2.2 实现 secondsToTick 函数（反向转换，含跨 tempo 边界处理）
- [ ] 2.3 实现 Project 创建辅助函数（createDefaultProject）
- [ ] 2.4 实现 isBlackKey 函数
- [ ] 2.5 实现 88 键范围约束函数（clampPitch）
- [ ] 2.6 为数据模型函数编写单元测试

## 3. 状态管理

- [ ] 3.1 实现 Zustand projectSlice（tracks, tempoMap, timeSigs, ppq, addTrack, removeTrack, addNote, removeNote, updateNote 等操作）
- [ ] 3.2 实现 Zustand transportSlice（state, currentTick, startTime, startTick, play, pause, stop）
- [ ] 3.3 实现 Zustand editorSlice（activeTool, selectedNoteIds, orientation, viewport: {scrollX, scrollY, zoomX, zoomY, noteHeight}）
- [ ] 3.4 组合三个 slice 为完整 store

## 4. MIDI 文件读写

- [ ] 4.1 实现 VLQ 解码器（变长量读取）
- [ ] 4.2 实现 SMF 文件头解析（MThd chunk → format, trackCount, ppq）
- [ ] 4.3 实现 MIDI 事件解析（Note On/Off, Running Status 处理）
- [ ] 4.4 实现 Meta 事件解析（Tempo, Time Signature, End of Track）
- [ ] 4.5 实现 SysEx 安全跳过
- [ ] 4.6 实现 MIDI 事件流到 Project 的组装（跨音轨音符匹配、tempo map 提取）
- [ ] 4.7 实现 Project 到 SMF format 1 的序列化（Header + Tempo Track + Note Tracks）
- [ ] 4.8 实现浏览器 File API 加载（读取 ArrayBuffer → 解析 → Project）
- [ ] 4.9 实现浏览器 File API 保存（Project → 序列化 → Blob → 下载）
- [ ] 4.10 实现无效文件错误处理
- [ ] 4.11 为解析器和序列化器编写单元测试

## 5. 音频引擎

- [ ] 5.1 定义 SoundSource 接口
- [ ] 5.2 实现 OscillatorBank（noteOn 创建 OscillatorNode + GainNode，noteOff 停止，资源追踪与清理）
- [ ] 5.3 实现 Transport 状态机（play/pause/stop，currentTick 推算）
- [ ] 5.4 实现 Look-Ahead Scheduler 调度循环（setInterval 25ms，100ms 窗口，事件时间计算）
- [ ] 5.5 实现后台标签页恢复补偿逻辑
- [ ] 5.6 实现 AudioContext 初始化与用户手势解锁（audioCtx.resume）
- [ ] 5.7 将 Transport 与 Zustand transportSlice 连接
- [ ] 5.8 为 Transport 和 Scheduler 编写单元测试

## 6. 钢琴键盘

- [ ] 6.1 实现白键索引 ↔ MIDI pitch 双向映射函数（whiteIndexToPitch, pitchToWhiteIndex）
- [ ] 6.2 实现键盘几何计算（whiteKeySize, blackKeySize, firstBlackKeyOffset）
- [ ] 6.3 实现白键层绘制（52 白键均匀分布，分割线，C 键八度标注）
- [ ] 6.4 实现黑键层绘制（88 键遍历，仅黑键音绘制，65% 高度，居中）
- [ ] 6.5 实现键盘视口裁剪（仅绘制可见音高范围）
- [ ] 6.6 实现键盘点击检测（黑键共存区优先 88 网格，白键区 52 分布，Math.floor 索引）
- [ ] 6.7 实现点击试听（mousedown 发 Note On，mouseup/leave 发 Note Off）
- [ ] 6.8 实现横向/纵向布局的键盘几何适配

## 7. Piano Roll 渲染器

- [ ] 7.1 实现坐标映射核心函数（pitch/seconds → x/y，orientation 感知）
- [ ] 7.2 实现 4 层 Canvas 容器（CSS 叠放，尺寸同步）
- [ ] 7.3 实现背景网格层（小节线、拍线、细分网格线、行底色）
- [ ] 7.4 实现网格线密度自适应（间距 < 4px 隐藏细分线）
- [ ] 7.5 实现音符层（虚拟渲染 AABB 视口裁剪，音轨颜色填充，选中高亮）
- [ ] 7.6 实现视口状态管理（scrollX/scrollY/zoomX/zoomY）
- [ ] 7.7 实现缩放（鼠标滚轮，以鼠标位置为中心缩放）
- [ ] 7.8 实现滚动（鼠标拖拽空白区域平移或原生滚动条）
- [ ] 7.9 实现播放光标层（rAF 驱动，实时推算 tick → 像素位置）
- [ ] 7.10 实现交互层（绘制中的音符预览、选择框虚线矩形、拖拽位置幽灵）
- [ ] 7.11 实现横向/纵向布局切换（键盘位置、坐标轴角色交换）

## 8. 音符交互

- [ ] 8.1 实现三种工具模式定义与切换（Pointer, Pencil, Eraser）
- [ ] 8.2 实现命中检测（hit-test：边缘热区 4px > 音符身体 > 空白）
- [ ] 8.3 实现指针工具 — 单选/清选（单击未选中音符选中，单击空白清选）
- [ ] 8.4 实现指针工具 — 拖拽移动（mousedown 记录 oldState，mousemove 实时更新，mouseup 生成 MoveNotesCommand）
- [ ] 8.5 实现拖拽移动约束（startTick ≥ 0, 21 ≤ pitch ≤ 108, 相对吸附）
- [ ] 8.6 实现指针工具 — 边缘拉伸（左/右边缘，duration 约束 ≥ 1 tick）
- [ ] 8.7 实现指针工具 — 框选（mousedown 起点，mousemove 虚线框，mouseup AABB 命中选中）
- [ ] 8.8 实现画笔工具 — 点击添加音符（绝对吸附，默认时长=网格单位，替换已有音符）
- [ ] 8.9 实现画笔工具 — 拖拽调整时长（复用右边缘拉伸逻辑）
- [ ] 8.10 实现画笔 pitch 范围约束（21-108）
- [ ] 8.11 实现橡皮工具 — 点击删除音符
- [ ] 8.12 将交互系统连接到 Zustand store（选中状态、音符增删改）

## 9. 吸附网格

- [ ] 9.1 定义网格级别常量（全音符到六十四分音符 + 三连音变体，共 9 级）
- [ ] 9.2 实现 snapTick 函数（Math.round 到最近网格线）
- [ ] 9.3 在拖拽操作中使用相对吸附（deltaTick 吸附，保留原始 offset）
- [ ] 9.4 在画笔操作中使用绝对吸附（鼠标位置直接吸附）
- [ ] 9.5 实现网格选择器 UI 组件（GridSelector.tsx）

## 10. 撤销/重做

- [ ] 10.1 定义 Command 接口（execute, undo）
- [ ] 10.2 实现 AddNoteCommand
- [ ] 10.3 实现 DeleteNotesCommand（单删/批删）
- [ ] 10.4 实现 MoveNotesCommand（old/new 状态存储）
- [ ] 10.5 实现 ResizeNoteCommand（old/new startTick + duration）
- [ ] 10.6 实现 UndoManager 类（undoStack, redoStack, maxDepth=200, execute, undo, redo）
- [ ] 10.7 实现拖拽命令聚合（mousemove 不产生命令，仅 mouseup 产生一条）
- [ ] 10.8 绑定键盘快捷键 Ctrl+Z（undo）和 Ctrl+Y / Ctrl+Shift+Z（redo）
- [ ] 10.9 为 UndoManager 编写单元测试

## 11. UI 组件

- [ ] 11.1 实现 App.tsx 根布局（根据 orientation 编排各区域位置）
- [ ] 11.2 实现 Toolbar.tsx（工具切换按钮组：指针/画笔/橡皮）
- [ ] 11.3 实现 TransportBar.tsx（播放/暂停/停止按钮，当前时间/tick 显示）
- [ ] 11.4 实现 PianoRollView.tsx（管理 4 层 Canvas 的容器组件，绑定事件）
- [ ] 11.5 实现 KeyboardView.tsx（键盘 Canvas 容器，响应点击）
- [ ] 11.6 实现 TrackList.tsx（音轨列表，名称/颜色/乐器显示）
- [ ] 11.7 实现 GridSelector.tsx（网格细分级别选择下拉或按钮组）
- [ ] 11.8 实现文件操作（加载 .mid 按钮，保存 .mid 按钮）

## 12. 集成与收尾

- [ ] 12.1 串联完整播放流程：加载文件 → 点击播放 → 音频输出 + 光标移动
- [ ] 12.2 串联完整编辑流程：画笔添加音符 → 指针选择/拖拽/拉伸 → 橡皮删除 → 撤销/重做
- [ ] 12.3 串联横/纵向切换：切换 orientation 后键盘和 Piano Roll 正确重布局
- [ ] 12.4 串联文件保存：编辑后保存 → 重新加载验证数据一致性
- [ ] 12.5 处理边界情况（空项目播放、全选删除、极端缩放、超长音符、tempo 剧烈变化的文件）
- [ ] 12.6 运行所有单元测试确保通过
