# ConjugQuest iOS (native wrapper)

This directory contains a native iOS app wrapper for ConjugQuest.

## Structure

- `ConjugQuestIOS.xcodeproj`: Xcode project.
- `ConjugQuestIOS/`: SwiftUI app source.
- `ConjugQuestIOS/WebApp/`: bundled web game files served by `WKWebView`.
- `scripts/sync_web_assets.sh`: copies the latest web game files into `WebApp/`.

## Quick start

1. Sync the web assets:
   - `./scripts/sync_web_assets.sh`
2. Open:
   - `ConjugQuestIOS.xcodeproj`
3. Run the `ConjugQuestIOS` scheme on an iOS simulator or device.

## Notes

- The app uses `WKWebView` and loads `WebApp/index.html` from the app bundle.
- If you update game code/assets in the repo root, run the sync script again.
