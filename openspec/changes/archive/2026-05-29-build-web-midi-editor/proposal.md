## Why

创建一个运行在浏览器中的 MIDI 编辑器，支持播放、创建、编辑、保存和加载 MIDI 文件。目标是做成一个自己日常使用的小工具，同时作为学习 OpenSpec 和 Superpowers 技能体系来驾驭 AI 开发的实践项目。若做得好，推荐给身边的朋友同事使用。

## What Changes

- 新增 Web 端 Piano Roll 编辑器，提供类似主流 DAW 的钢琴卷帘编辑界面
- 新增 MIDI 文件的解析（.mid 读取）与序列化（.mid 保存）
- 新增基于 Web Audio API 的播放引擎，支持实时播放和光标同步
- 新增音符交互系统：画笔添加、指针选择/拖拽/拉伸、橡皮删除、框选多选
- 新增可切换横/纵向的钢琴键盘显示，适配不同设备和使用场景
- 新增吸附网格系统，支持多种音符时值细分
- 新增基于命令模式的撤销/重做系统
- 新增音源抽象层，初期使用振荡器合成，预留 SoundFont/采样库扩展接口

## Capabilities

### New Capabilities

- `midi-data-model`: MIDI 数据模型 — Project, Track, Note 结构与 tick↔秒时间转换，含 Tempo Map 支持
- `piano-roll-renderer`: Piano Roll 主画布渲染 — Canvas 分层架构、虚拟视口渲染、网格线绘制、播放光标
- `piano-keyboard`: 钢琴键盘 — 基于十二平均律的 88 键几何计算、白键/黑键分层绘制、点击试听检测、横/纵向支持
- `playback-engine`: 播放引擎 — Look-Ahead Scheduler、Transport 三态机 (STOPPED/PLAYING/PAUSED)、Web Audio API 调度、音源抽象接口
- `note-interaction`: 音符交互 — 指针/画笔/橡皮工具模式、音符选中与拖拽移动、边缘拉伸、框选多选
- `midi-file-io`: MIDI 文件读写 — SMF 格式解析与序列化
- `snap-grid`: 吸附网格 — 多级时值细分网格、音符相对吸附、网格密度自适应显示
- `undo-redo`: 撤销/重做 — 命令模式封装、双栈管理、拖拽操作命令聚合

### Modified Capabilities

<!-- 无已有能力，首次实现 -->

## Impact

- 新项目，无已有代码影响
- 技术栈待定（将在 design.md 中确定框架、构建工具等选型）
- 浏览器依赖：Web Audio API、Canvas 2D、用户手势解锁 AudioContext
