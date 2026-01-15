#!/bin/bash
# Install FFmpeg + yt-dlp on Render

echo "📦 Installing FFmpeg + yt-dlp..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected - installing with apt"
    apt-get update
    apt-get install -y ffmpeg python3 python3-pip
    pip3 install --upgrade yt-dlp
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected - installing with brew"
    brew install ffmpeg yt-dlp
fi

# Verify installations
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully!"
    ffmpeg -version | head -n 1
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp installed successfully!"
    yt-dlp --version
else
    echo "❌ yt-dlp installation failed"
    exit 1
fi
