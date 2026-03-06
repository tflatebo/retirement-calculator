#!/bin/sh
# Post-create setup for devcontainer

set -e

mkdir -p ~/.local/bin

# Install tmux and github cli
sudo apt-get update
sudo apt-get install -y tmux gh

# Install retirement-calculator dependencies
if [ -f /workspaces/alpine/retirement-calculator/package.json ]; then
  cd /workspaces/alpine/retirement-calculator && npm install
fi

# Append a shell hook to ~/.bashrc that auto-symlinks the Claude Code CLI
# bundled with the VSCode extension on every new shell session.
# Using a find-based lookup keeps this version-agnostic.
cat >> ~/.bashrc << 'EOF'

# Claude Code CLI — auto-link from VSCode extension
_claude_bin=$(find ~/.vscode-server/extensions -name claude -path '*/native-binary/claude' 2>/dev/null | head -1)
[ -n "$_claude_bin" ] && ln -sf "$_claude_bin" ~/.local/bin/claude
unset _claude_bin
EOF

# Claude Code state + sessions persistence prep
mkdir -p ~/.claude ~/.local/bin
touch ~/.claude.json
chmod 700 ~/.claude
chmod 600 ~/.claude.json

# If ~/.claude is a mounted volume, ensure ownership
# (won't hurt if it's already correct)
sudo chown -R "$(id -u)":"$(id -g)" /home/vscode/.claude 2>/dev/null || true