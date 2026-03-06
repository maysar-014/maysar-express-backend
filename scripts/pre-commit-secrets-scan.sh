#!/bin/sh

# Pre-commit hook: Scan staged files for secrets using gitleaks

echo "🔐 Scanning staged files for secrets..."

# Check if gitleaks is installed
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "⚠️  WARNING: gitleaks not found on PATH"
  echo "   Install gitleaks to enable local secret scanning:"
  echo "   - macOS: brew install gitleaks"
  echo "   - Windows: choco install gitleaks"
  echo "   - Linux: https://github.com/gitleaks/gitleaks#installing"
  echo ""
  echo "   CI will still enforce secret scanning on push/PR"
  exit 0
fi

# Run gitleaks on staged files
if gitleaks protect --staged --config .gitleaks.toml --verbose; then
  echo "✅ No secrets detected"
  exit 0
else
  echo "❌ Secrets detected in staged files!"
  echo "   Remove secrets before committing or update .gitleaks.toml if false positive"
  exit 1
fi
