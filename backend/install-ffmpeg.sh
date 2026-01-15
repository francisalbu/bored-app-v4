#!/bin/bash
# Install FFmpeg on Render

echo "📦 Installing FFmpeg..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected - installing FFmpeg with apt"
    apt-get update
    apt-get install -y ffmpeg
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected - installing FFmpeg with brew"
    brew install ffmpeg
fi

# Verify installation
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully!"
    ffmpeg -version | head -n 1
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi
