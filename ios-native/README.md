# ConjugQuest iOS (WebView wrapper)

Thin native iOS shell that loads the web game inside a full-screen `WKWebView`.
All game logic, rendering, and UI are handled by the bundled web app — the native
code is just a transparent container.

## Structure

```
ConjugQuestIOS.xcodeproj        Xcode project (3 Swift source files)
ConjugQuestIOS/
  ConjugQuestIOSApp.swift       App entry point
  ContentView.swift             Root SwiftUI view (just a WebView)
  WebViewRepresentable.swift    WKWebView + BundleSchemeHandler
  Info.plist                    Portrait-only, full-screen config
  Assets.xcassets/              App icons
  WebApp/                       Bundled web game (synced from repo root)
scripts/
  sync_web_assets.sh            Copies web files into WebApp/
```

## Quick start

1. Sync the web assets:
   ```
   ./scripts/sync_web_assets.sh
   ```
2. Open `ConjugQuestIOS.xcodeproj` in Xcode.
3. Run the `ConjugQuestIOS` scheme on a simulator or device.

## How it works

- `WebViewRepresentable` registers a custom `app://` URL scheme handler that
  serves files from the bundled `WebApp/` folder with correct MIME types.
- The web page's CSP (`default-src 'self'`) is satisfied because all resources
  load from the same `app://localhost` origin.
- Scroll, bounce, and zoom are disabled — the game canvas fills the viewport.
- Safe-area insets are managed by the web CSS via `env(safe-area-inset-*)`,
  enabled by `viewport-fit=cover` in the HTML meta tag.

## Updating the game

After modifying game code or assets in the repository root, run
`./scripts/sync_web_assets.sh` to copy them into the app bundle, then rebuild.
