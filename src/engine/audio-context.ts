/**
 * 创建 AudioContext（初始为 suspended 状态）
 */
export function createAudioContext(): AudioContext {
  return new AudioContext()
}

/**
 * 通过用户手势恢复 AudioContext
 * 浏览器策略要求 AudioContext 必须由用户交互触发 resume
 */
export async function resumeAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
