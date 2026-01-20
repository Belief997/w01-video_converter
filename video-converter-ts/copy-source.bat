@echo off
REM 源码复制脚本 - 将核心源码复制到目标项目（Windows 版本）
REM 用法: copy-source.bat <目标目录>

if "%1"=="" (
  echo 用法: copy-source.bat ^<目标目录^>
  echo 示例: copy-source.bat ..\my-project\src\video-converter
  exit /b 1
)

set TARGET_DIR=%1
set SOURCE_DIR=%~dp0src

echo 正在复制源码到: %TARGET_DIR%

REM 创建目标目录
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
if not exist "%TARGET_DIR%\postprocess" mkdir "%TARGET_DIR%\postprocess"

REM 复制核心文件
copy "%SOURCE_DIR%\converter.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\parser.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\ffmpeg-builder.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\ffmpeg-executor.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\models.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\errors.ts" "%TARGET_DIR%\" >nul
copy "%SOURCE_DIR%\index.ts" "%TARGET_DIR%\" >nul

REM 复制后处理模块
copy "%SOURCE_DIR%\postprocess\avi-aligner.ts" "%TARGET_DIR%\postprocess\" >nul
copy "%SOURCE_DIR%\postprocess\mjpeg-packer.ts" "%TARGET_DIR%\postprocess\" >nul
copy "%SOURCE_DIR%\postprocess\h264-packer.ts" "%TARGET_DIR%\postprocess\" >nul
copy "%SOURCE_DIR%\postprocess\index.ts" "%TARGET_DIR%\postprocess\" >nul

echo.
echo ✅ 复制完成！
echo.
echo 已复制的文件:
echo   - converter.ts
echo   - parser.ts
echo   - ffmpeg-builder.ts
echo   - ffmpeg-executor.ts
echo   - models.ts
echo   - errors.ts
echo   - index.ts
echo   - postprocess\avi-aligner.ts
echo   - postprocess\mjpeg-packer.ts
echo   - postprocess\h264-packer.ts
echo   - postprocess\index.ts
echo.
echo 未复制的文件（不需要）:
echo   - cli.ts (命令行工具，依赖 commander)
echo.
echo 下一步:
echo   1. 在你的项目中导入: import { VideoConverter } from './video-converter';
echo   2. 确保 FFmpeg 已安装
echo   3. 开始使用！
