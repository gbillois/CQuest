# Items Requiring Your Review Before App Store Submission

## COMPLIANCE / LEGAL — Review Required

### 1. Privacy Policy URL
- **File**: `metadata/*/privacy_url.txt`
- **Current value**: `https://github.com/gbillois/cquest`
- **Action needed**: Replace with a proper privacy policy URL. Apple requires a valid privacy policy for all apps. Even though the app collects no data, you need a published page stating that.
- **Note**: The app uses only localStorage (no server communication, no analytics, no tracking). Your privacy policy should reflect this.

### 2. Support URL
- **File**: `metadata/*/support_url.txt`
- **Current value**: `https://github.com/gbillois/cquest`
- **Action needed**: Verify this is acceptable or replace with a dedicated support page/email.

### 3. App Review Contact Information
- **File**: `Deliverfile` — `app_review_information` block
- **Current value**: All fields set to `REVIEW_REQUIRED`
- **Action needed**: Fill in your real name, phone number, and email for the App Review team.

### 4. Age Rating Configuration
- **File**: `rating_config.json`
- **Current setting**: `CARTOON_FANTASY_VIOLENCE: 1` (infrequent), all others 0
- **Rationale**: The game features cartoon combat (heroes throwing projectiles at fantasy enemies like goblins, zombies, trolls). No blood, no realistic violence. This should result in a 4+ or 9+ rating.
- **Action needed**: Verify you agree with this classification. Changing `CARTOON_FANTASY_VIOLENCE` to `2` (frequent) would raise the age rating.

### 5. Encryption (Export Compliance)
- **Current setting in Info.plist**: `ITSAppUsesNonExemptEncryption = NO`
- **Rationale**: The app uses only WKWebView (standard HTTPS via Apple frameworks). No custom encryption algorithms.
- **Action needed**: Confirm this is correct for your use case. Since the app is fully offline with no network calls, this should be accurate.

### 6. App Categories
- **File**: `Deliverfile`
- **Current**: Primary = `GAMES_EDUCATIONAL`, Secondary = `GAMES_ACTION`
- **Action needed**: Verify these categories match your intent. Alternatives: `EDUCATION` (non-game category) as primary if you prefer the Education section.

### 7. Pricing
- **File**: `Deliverfile`
- **Current**: `price_tier 0` (Free)
- **Action needed**: Confirm the app should be free with no in-app purchases.

### 8. Automatic Release
- **File**: `Deliverfile`
- **Current**: `automatic_release false` (manual release after approval)
- **Action needed**: Change to `true` if you want the app released automatically after Apple approves it.

## NON-BLOCKING — Recommended Before Submission

### 9. Screenshots
- **Directory**: `fastlane/screenshots/en-US/` and `fr-FR/`
- **Status**: Empty (placeholder .gitkeep files)
- **Action needed**: Capture screenshots on simulators at required resolutions. See `screenshots/README.md` for sizes and suggested content.

### 10. App Icon
- **Status**: Icons exist in `Assets.xcassets/AppIcon.appiconset/`
- **Action needed**: Verify the 1024x1024 App Store icon meets Apple's guidelines (no alpha channel, no rounded corners — Apple applies them automatically).

### 11. Apple Developer Team ID
- **File**: `Appfile` (commented out)
- **Action needed**: Uncomment and verify `team_id` if you have multiple teams.
