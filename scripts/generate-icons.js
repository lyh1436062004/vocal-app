/**
 * 图标生成脚本
 * 
 * 使用方法：
 * 1. 把你的图标图片保存为 resources/icon.png（建议 1024x1024）
 * 2. 安装 sharp: npm install -D sharp
 * 3. 运行: node scripts/generate-icons.js
 * 
 * 会自动生成 Android 各分辨率的图标文件
 */
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const SOURCE = 'resources/icon.png'
const ANDROID_RES = 'android/app/src/main/res'

// Android mipmap 尺寸规范
const SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
]

// 圆角图标（foreground for adaptive icon）
const ADAPTIVE_SIZES = [
  { dir: 'mipmap-mdpi', size: 108 },
  { dir: 'mipmap-hdpi', size: 162 },
  { dir: 'mipmap-xhdpi', size: 216 },
  { dir: 'mipmap-xxhdpi', size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 }
]

async function main() {
  if (!existsSync(SOURCE)) {
    console.error('请先将图标保存为 resources/icon.png')
    process.exit(1)
  }

  console.log('生成 Android 图标...')

  // 普通图标 ic_launcher.png
  for (const { dir, size } of SIZES) {
    const outDir = join(ANDROID_RES, dir)
    mkdirSync(outDir, { recursive: true })
    await sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(join(outDir, 'ic_launcher.png'))
    console.log(`  ${dir}/ic_launcher.png (${size}x${size})`)

    // 圆形图标
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    )
    await sharp(SOURCE)
      .resize(size, size)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toFile(join(outDir, 'ic_launcher_round.png'))
    console.log(`  ${dir}/ic_launcher_round.png (${size}x${size})`)
  }

  // Adaptive icon foreground
  for (const { dir, size } of ADAPTIVE_SIZES) {
    const outDir = join(ANDROID_RES, dir)
    mkdirSync(outDir, { recursive: true })
    // foreground 需要在 108dp 画布中居中放置 66dp 的图标
    const iconSize = Math.round(size * 66 / 108)
    const padding = Math.round((size - iconSize) / 2)
    await sharp(SOURCE)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: size - iconSize - padding,
        left: padding,
        right: size - iconSize - padding,
        background: { r: 15, g: 18, b: 32, alpha: 1 }
      })
      .png()
      .toFile(join(outDir, 'ic_launcher_foreground.png'))
    console.log(`  ${dir}/ic_launcher_foreground.png (${size}x${size})`)
  }

  console.log('\n✓ 图标生成完成！')
}

main().catch(console.error)
