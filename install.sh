#!/bin/sh
set -e

REPO="quanthumtech/qai-cli"
BIN_DIR="${QAI_INSTALL:-/usr/local/bin}"

# Detect OS and arch
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux)  PLATFORM="linux-x64" ;;
  darwin)
    case "$ARCH" in
      arm64) PLATFORM="macos-arm64" ;;
      *)     PLATFORM="macos-x64" ;;
    esac
    ;;
  *) echo "Unsupported OS: $OS" && exit 1 ;;
esac

# Get latest release tag
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": *"\(.*\)".*/\1/')

URL="https://github.com/$REPO/releases/download/$TAG/qai-$PLATFORM"

echo "Installing qai $TAG..."
curl -fsSL "$URL" -o /tmp/qai
chmod +x /tmp/qai

# Install (try sudo if needed)
if [ -w "$BIN_DIR" ]; then
  mv /tmp/qai "$BIN_DIR/qai"
else
  sudo mv /tmp/qai "$BIN_DIR/qai"
fi

echo "✓ qai installed to $BIN_DIR/qai"
echo "  Run: qai"
