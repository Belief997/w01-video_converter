# Publishing to npm

## Pre-publish Checklist

- [x] Package name configured: `@belief997/video-converter`
- [x] Version set: `1.0.0`
- [x] Build successful: `npm run build`
- [x] Tests passing: `npm test` (62 passed)
- [x] `.npmignore` configured
- [x] `package.json` configured with:
  - [x] `files` field (dist, README.md, LICENSE)
  - [x] `main` and `types` entry points
  - [x] Repository information
  - [x] Keywords
  - [x] `prepublishOnly` script

## Publishing Steps

### 1. Enable Two-Factor Authentication (Required)

npm requires 2FA for publishing packages. Set it up first:

1. Visit https://www.npmjs.com/
2. Login to your account
3. Go to Account Settings → Two-Factor Authentication
4. Choose "Authorization and Publishing" mode
5. Scan QR code with authenticator app (Google Authenticator, Microsoft Authenticator, etc.)

### 2. Login to npm

```bash
npm login
```

You'll need to enter your OTP (6-digit code from authenticator app) during login.

### 3. Dry Run (Optional)

Check what will be published:

```bash
npm pack --dry-run
```

### 4. Publish

```bash
npm publish --access public --otp=123456
```

Replace `123456` with the current 6-digit code from your authenticator app.

**Note**: 
- Use `--access public` for scoped packages (@belief997/...)
- OTP codes expire every 30 seconds, so publish quickly after getting the code
- If you get "Access token expired" error, run `npm logout` then `npm login` again

### 5. Verify Publication

**Method 1: Check npm website**
```
https://www.npmjs.com/package/@belief997/video-converter
```

**Method 2: View package info**
```bash
npm view @belief997/video-converter
```

**Method 3: Test installation** (most reliable)
```bash
# In a new directory
mkdir test-package
cd test-package
npm init -y
npm install @belief997/video-converter

# Verify files
ls node_modules/@belief997/video-converter/dist
```

## Usage After Publishing

Install in other projects:

```bash
npm install @belief997/video-converter
```

Use in code:

```typescript
import { VideoConverter, OutputFormat } from '@belief997/video-converter';

const converter = new VideoConverter();
await converter.convert('input.mp4', 'output.avi', OutputFormat.AVI_MJPEG);
```

## Updating

To publish updates:

1. Update version in `package.json`:
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. Publish with OTP:
   ```bash
   npm publish --otp=123456
   ```

## Troubleshooting

### Error: "Two-factor authentication required"

**Solution**: Enable 2FA on your npm account (see step 1 above), then publish with `--otp` flag.

### Error: "Access token expired or revoked"

**Solution**: 
```bash
npm logout
npm login
npm publish --access public --otp=123456
```

### Error: "404 Not Found" when checking package

**Cause**: Package hasn't been published yet, or publication failed.

**Solution**: Check the publish command output for errors. If it says "403 Forbidden", you need to enable 2FA.

### Error: "E403 Forbidden"

**Cause**: Missing 2FA or incorrect permissions.

**Solution**: 
1. Enable 2FA on npmjs.com
2. Make sure you're logged in: `npm whoami`
3. Use `--otp` flag when publishing

### Package published but can't install

**Wait time**: It may take 1-2 minutes for the package to be available after publishing.

**Check**: Visit https://www.npmjs.com/package/@belief997/video-converter to confirm it's live.

## Integration with VSCode Extension

When using this package in a VSCode extension:

1. **Add as dependency** in your extension's `package.json`:
   ```json
   {
     "dependencies": {
       "@belief997/video-converter": "^1.0.0"
     }
   }
   ```

2. **Install**:
   ```bash
   npm install
   ```

3. **Use in extension code**:
   ```typescript
   import { VideoConverter, OutputFormat } from '@belief997/video-converter';
   ```

4. **Package extension**: When you build your `.vsix` file, the npm package will be automatically bundled.

5. **User installation**: End users don't need to install this package separately - it's included in the extension.

## Publication Status

- ✅ **Published**: 2026-01-20
- ✅ **Version**: 1.0.0
- ✅ **Package name**: `@belief997/video-converter`
- ✅ **Registry**: https://registry.npmjs.org/
- ✅ **Public access**: Enabled
- ✅ **Verification**: Tested with `npm install` - successful

## Package Contents

When published, the package will include:
- `dist/` - Compiled JavaScript and TypeScript definitions
- `README.md` - Documentation
- `LICENSE` - MIT license
- `package.json` - Package metadata

Excluded (via `.npmignore`):
- `src/` - TypeScript source
- `tests/` - Test files
- `node_modules/` - Dependencies
- Build configuration files
