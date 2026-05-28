/**
 * 从 SVG 生成 Android 各分辨率图标
 * 运行: node scripts/svg-to-icons.js
 */
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const SOURCE = existsSync('resources/icon.png') ? 'resources/icon.png' : 'resources/icon.svg'
const ANDROID_RES = 'android/app/src/main/res'

const SIZES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
]

const ADAPTIVE_SIZES = [
  { dir: 'mipmap-mdpi', size: 108 },
  { dir: 'mipmap-hdpi', size: 162 },
  { dir: 'mipmap-xhdpi', size: 216 },
  { dir: 'mipmap-xxhdpi', size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 }
]

async function main() {
  console.log(`使用图标源: ${SOURCE}`)

  for (const { dir, size } of SIZES) {
    const outDir = join(ANDROID_RES, dir)
    mkdirSync(outDir, { recursive: true })

    await sharp(SOURCE, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(join(outDir, 'ic_launcher.png'))

    // 圆形图标
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    )
    await sharp(SOURCE, { density: 300 })
      .resize(size, size)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toFile(join(outDir, 'ic_launcher_round.png'))

    console.log(`  ✓ ${dir} (${size}x${size})`)
  }

  for (const { dir, size } of ADAPTIVE_SIZES) {
    const outDir = join(ANDROID_RES, dir)
    mkdirSync(outDir, { recursive: true })
    const iconSize = Math.round(size * 66 / 108)
    const padding = Math.round((size - iconSize) / 2)
    await sharp(SOURCE, { density: 300 })
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
    console.log(`  ✓ ${dir}/foreground (${size}x${size})`)
  }

  console.log('\n✓ 所有图标生成完成！')
}

main().catch(console.error)
