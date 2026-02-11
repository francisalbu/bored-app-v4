#!/bin/bash
# Install FFmpeg static binary on Render (no sudo needed)

echo "📦 Installing FFmpeg static binary..."

# Create bin directory if it doesn't exist
mkdir -p /opt/render/project/src/backend/bin

# Download FFmpeg static build
if [[ ! -f /opt/render/project/src/backend/bin/ffmpeg ]]; then
    echo "⬇️ Downloading FFmpeg static build..."
    cd /opt/render/project/src/backend/bin
    
    # Download latest FFmpeg static build for Linux
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
    
    # Extract
    tar xf ffmpeg.tar.xz --strip-components=1
    
    # Cleanup
    rm ffmpeg.tar.xz
    
    # Make executable
    chmod +x ffmpeg ffprobe
    
    echo "✅ FFmpeg installed successfully!"
else
    echo "✅ FFmpeg already installed"
fi

# Verify installation
if [[ -f /opt/render/project/src/backend/bin/ffmpeg ]]; then
    /opt/render/project/src/backend/bin/ffmpeg -version | head -n 1
    echo "✅ FFmpeg ready at /opt/render/project/src/backend/bin/ffmpeg"
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi
