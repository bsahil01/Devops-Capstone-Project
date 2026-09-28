#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Automated Packaging Script for CI/CD Pipeline
# Creates production release bundle (.tar.gz) excluding dev-only files
# ==============================================================================

PROJECT_NAME="employee-management-app"
VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
DIST_DIR="dist"
ARCHIVE_NAME="${PROJECT_NAME}-v${VERSION}-${TIMESTAMP}.tar.gz"
LATEST_ARCHIVE="${PROJECT_NAME}-latest.tar.gz"

echo "=========================================================="
echo "📦 Packaging Application: ${PROJECT_NAME} (v${VERSION})"
echo "=========================================================="

# Create dist directory
mkdir -p "${DIST_DIR}"

# Clean previous build artifacts
rm -f "${DIST_DIR}"/*.tar.gz

# Build list of existing files to include
INCLUDE_FILES=("src" "public" "package.json" "package-lock.json" ".env.example")
[ -f "Dockerfile" ] && INCLUDE_FILES+=("Dockerfile")
[ -f "docker-compose.yml" ] && INCLUDE_FILES+=("docker-compose.yml")

# Archive project files
tar --exclude='./node_modules' \
    --exclude='./.git' \
    --exclude='./.github' \
    --exclude='./dist' \
    --exclude='./data/*.db' \
    --exclude='./tests' \
    --exclude='./.DS_Store' \
    -czf "${DIST_DIR}/${ARCHIVE_NAME}" \
    "${INCLUDE_FILES[@]}"

# Create a symbolic or copy link for latest
cp "${DIST_DIR}/${ARCHIVE_NAME}" "${DIST_DIR}/${LATEST_ARCHIVE}"

# Calculate checksum
if command -v shasum >/dev/null 2>&1; then
  CHECKSUM=$(shasum -a 256 "${DIST_DIR}/${ARCHIVE_NAME}" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  CHECKSUM=$(sha256sum "${DIST_DIR}/${ARCHIVE_NAME}" | awk '{print $1}')
else
  CHECKSUM="N/A"
fi

SIZE=$(du -h "${DIST_DIR}/${ARCHIVE_NAME}" | awk '{print $1}')

echo "✅ Package created successfully!"
echo "   File:     ${DIST_DIR}/${ARCHIVE_NAME}"
echo "   Size:     ${SIZE}"
echo "   SHA-256:  ${CHECKSUM}"
echo "=========================================================="
