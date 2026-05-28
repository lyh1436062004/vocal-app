# 🎤 声乐练习 App

Android 手机应用，帮助你练习音高和跟唱。

## 功能

### 1. 音高测试
- 钢琴键盘（C3–C5），点击播放参考音
- 麦克风实时检测你的音高
- 判定你唱的是高了、低了还是准了（±15 音分以内为准）
- 可视化仪表显示偏差

### 2. 合唱跟唱
- 导入手机上的音频文件
- 自动分析原音的音高曲线（蓝色）
- 播放音频的同时开启麦克风跟唱
- 实时显示你的音高曲线（黄色）与原音对比

## 构建 APK

### 方式一：GitHub Actions（推荐，无需本地环境）

1. 把代码推到 GitHub 仓库
2. 进入 Actions 页面，运行 "Build Android APK"
3. 构建完成后下载 `vocal-app-debug` artifact
4. 解压得到 `app-debug.apk`，传到手机安装

### 方式二：本地构建

需要安装：
- [Node.js 18+](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio)（自带 JDK 17 和 Android SDK）

```bash
# 安装依赖
npm install

# 构建 web 资源
npm run build

# 同步到 Android
npx cap sync android

# 生成图标
node scripts/svg-to-icons.js

# 用 Android Studio 打开
npx cap open android
# 然后在 Android Studio 中 Build > Build APK
```

### 方式三：命令行构建（需要 JDK 17 + Android SDK）

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK 在 android/app/build/outputs/apk/debug/app-debug.apk
```

## 替换图标

把你的图标图片保存为 `resources/icon.png`（建议 1024x1024 正方形），然后运行：

```bash
node scripts/svg-to-icons.js
npx cap sync android
```

## 技术栈

- **前端**: React 18 + Vite
- **原生壳**: Capacitor 6（Web → Android）
- **音高检测**: pitchy（McLeod Pitch Method）
- **音频合成**: Tone.js（钢琴采样）
- **可视化**: Canvas 2D

## 项目结构

```
├── src/                    # React 源码
│   ├── components/
│   │   ├── PitchTest.jsx   # 音高测试页
│   │   └── ChorusMode.jsx  # 合唱跟唱页
│   └── utils/
│       ├── pitch.js         # 音高工具函数
│       ├── mic.js           # 麦克风采集
│       └── audioPitch.js    # 离线音频分析
├── android/                # Android 原生项目
├── resources/              # 图标源文件
├── scripts/                # 构建脚本
└── capacitor.config.ts     # Capacitor 配置
```
