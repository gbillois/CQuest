# TestFlight Checklist (ConjugQuestIOS)

## Already prepared in project

- App icon asset catalog added (`Assets.xcassets/AppIcon.appiconset`), including 1024x1024.
- Orientation locked to portrait.
- iPhone-only target (`TARGETED_DEVICE_FAMILY = 1`).
- Full screen required.

## Before upload in Xcode

1. Open `ios-native/ConjugQuestIOS.xcodeproj`.
2. Select target `ConjugQuestIOS` -> `Signing & Capabilities`:
   - Set your Apple Team.
   - Confirm bundle id (unique, e.g. `com.yourcompany.conjugquest`).
3. In target `General`:
   - Version (`1.0.0`) and Build (`1`, then increment each upload).
4. Product -> `Archive`.
5. Organizer -> `Distribute App` -> `App Store Connect` -> `Upload`.

## In App Store Connect

- Create app record if needed.
- Fill:
  - App name, subtitle, category.
  - Age rating.
  - Export compliance.
  - Privacy policy URL (for production release).
- For TestFlight external testers:
  - Add test information + contact email.
  - Add beta review notes.
