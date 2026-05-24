import { TempoEvent } from '../types'
import { DEFAULT_PPQ, DEFAULT_BPM } from '../constants'

/**
 * 将 tick 转换为秒（支持多段 tempo 变化）
 * @param targetTick 目标 tick 位置
 * @param tempoMap 速度映射表（按 tick 升序排列，首事件始终在 tick 0）
 * @param ppq 每四分音符 tick 数
 * @returns 对应的时间（秒）
 */
export function tickToSeconds(
  targetTick: number,
  tempoMap: TempoEvent[],
  ppq: number = DEFAULT_PPQ,
): number {
  if (tempoMap.length === 0) {
    // 空 tempoMap 时使用默认 BPM
    return (targetTick / ppq) * (60 / DEFAULT_BPM)
  }

  let seconds = 0
  let currentTick = 0
  let lastBpm = tempoMap[0]!.bpm

  for (let i = 0; i < tempoMap.length; i++) {
    // tempo 事件从它的 tick 位置开始生效
    lastBpm = tempoMap[i]!.bpm

    // 当前段结束于下一个 tempo 事件的 tick 或目标 tick
    const segmentEndTick = i < tempoMap.length - 1
      ? Math.min(tempoMap[i + 1]!.tick, targetTick)
      : targetTick

    if (segmentEndTick > currentTick) {
      const deltaTicks = segmentEndTick - currentTick
      seconds += (deltaTicks / ppq) * (60 / lastBpm)
      currentTick = segmentEndTick
    }

    // 如果已到达或超过目标 tick，跳出
    if (currentTick >= targetTick) {
      break
    }
  }

  // 如果遍历完 tempoMap 仍未到达目标 tick，继续使用最后一个 tempo
  if (currentTick < targetTick) {
    const deltaTicks = targetTick - currentTick
    seconds += (deltaTicks / ppq) * (60 / lastBpm)
  }

  return seconds
}

/**
 * 将秒转换为 tick（反向转换，支持跨 tempo 边界处理）
 * @param targetSeconds 目标时间（秒）
 * @param tempoMap 速度映射表（按 tick 升序排列，首事件始终在 tick 0）
 * @param ppq 每四分音符 tick 数
 * @param startTick 起始 tick（默认 0）
 * @returns 对应 tick 位置
 */
export function secondsToTick(
  targetSeconds: number,
  tempoMap: TempoEvent[],
  ppq: number = DEFAULT_PPQ,
  startTick: number = 0,
): number {
  if (targetSeconds < 0) {
    return startTick
  }

  if (tempoMap.length === 0) {
    // 空 tempoMap 时使用默认 BPM
    return startTick + Math.round(targetSeconds / ((60 / DEFAULT_BPM) / ppq))
  }

  let accumulatedSeconds = 0
  let currentTick = startTick
  let currentBpm = tempoMap[0]!.bpm

  // 找到起始 tick 所在的 tempo 段
  let tempoIndex = 0
  for (let i = 0; i < tempoMap.length - 1; i++) {
    if (tempoMap[i + 1]!.tick <= currentTick) {
      tempoIndex = i + 1
    } else {
      break
    }
  }
  currentBpm = tempoMap[tempoIndex]!.bpm

  // 遍历 tempo 段，累加时间直到达到 targetSeconds
  for (let i = tempoIndex; i < tempoMap.length; i++) {
    currentBpm = tempoMap[i]!.bpm

    // 确定当前段结束 tick（下一个 tempo 事件或无穷大）
    const segmentEndTick = i < tempoMap.length - 1 ? tempoMap[i + 1]!.tick : Infinity

    // 当前段可用的 ticks
    const availableTicks = segmentEndTick === Infinity
      ? Infinity
      : segmentEndTick - currentTick

    // 当前段每 tick 对应的秒数
    const secondsPerTick = (60 / currentBpm) / ppq

    // 当前段总共能贡献的秒数
    const segmentSeconds = availableTicks === Infinity
      ? Infinity
      : availableTicks * secondsPerTick

    if (accumulatedSeconds + segmentSeconds >= targetSeconds) {
      // 目标秒数在此段内
      const remainingSeconds = targetSeconds - accumulatedSeconds
      const ticksInSegment = remainingSeconds / secondsPerTick
      return currentTick + Math.round(ticksInSegment)
    }

    // 消耗整个段
    accumulatedSeconds += segmentSeconds
    currentTick = segmentEndTick
  }

  // 超出所有 tempo 事件范围，使用最后一个 tempo 继续计算
  const secondsPerTick = (60 / currentBpm) / ppq
  const remainingSeconds = targetSeconds - accumulatedSeconds
  return currentTick + Math.round(remainingSeconds / secondsPerTick)
}
