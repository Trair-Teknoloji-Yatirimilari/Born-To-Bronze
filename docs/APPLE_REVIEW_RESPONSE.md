# App Store Review Response — Born To Bronze

**Submission ID:** e0967b03-27aa-40fa-aac9-a048901b1592
**Version Reviewed:** 1.0 (15)
**Resubmitted Version:** 1.0.13 (16)

---

Hello App Review Team,

Thank you for the detailed feedback. Before the point-by-point response, a brief note on the app’s brand context to help your review:

**Context.** Born To Bronze is the official mobile application of **Eda Taşpınar**, a self-tanning and skincare brand based in Turkey. The app lets users virtually try Eda Taşpınar self-tanning products on their face (via live camera or a selected photo) and then buy the product on the official brand store at **www.edataspinar.com**. The marketplace listing name and the on-device name are now both “Born To Bronze”; the company/brand that owns and ships the products is Eda Taşpınar.

We have addressed all four points raised in the previous review. Below is our point-by-point response.

---

## Guideline 2.3.3 — Screenshots

**Action Taken:** New 6.5" iPhone and 13" iPad screenshots captured from version 1.0.13 (16) will be uploaded via the Media Manager in App Store Connect. All screenshots now show the actual UI of the app in use (product selection, real-time try-on with effect applied, photo edit result, sharing screen) — not splash or login screens.

---

## Guideline 2.3.8 — Accurate Metadata (App Name)

**Previous State:** Marketplace name was “Born To Bronze” while the on-device name was “Eda”, causing user confusion when locating the installed app.

**Action Taken:** The on-device name has been changed to **Born To Bronze** so that it matches the marketplace listing exactly.

Changes applied in version 1.0.13 (16):
- `CFBundleDisplayName` in Info.plist → “Born To Bronze”
- Expo `app.json` `name` field → “Born To Bronze”
- Android `strings.xml` `app_name` → “Born To Bronze”
- Bundle identifier **unchanged** (`com.borntobronze.ios`)

Within the app, the product line and legal owner (Eda Taşpınar) are still clearly referenced in the Terms of Service, Privacy Policy and Settings > Company, since Eda Taşpınar is the brand that manufactures and sells the products featured in the app.

---

## Guideline 2.1 — Face Data Information

Born To Bronze uses on-device face contour detection to place a virtual self-tan color only on skin regions. The answers to your five questions are below. The same content is also published in our privacy policy at https://bronze-api.trair.com.tr/privacy-policy (Section 2 — Face Data) and inside the app (Settings → Privacy Policy → Section 3).

### 1. What face data does the app collect?

Born To Bronze performs real-time face contour detection using the on-device Google ML Kit face detector (bundled via the open-source library `react-native-vision-camera-face-detector`). The detector produces temporary geometric contour points (face outline, cheeks, eyes, eyebrows, lips) for each video frame.

The app does **not** collect, compute, or store:
- Face embeddings or face prints
- Face ID data
- Biometric templates or identifiers
- Any data capable of recognizing or identifying a person

### 2. What is the face data used for?

The contour points are used solely to build a clipping mask for the virtual tanning filter so that:
- The tanning color is drawn only on skin regions (forehead, cheeks, chin).
- Non-skin regions (eyes, eyebrows, nostrils, lips) are excluded from the effect.
- The intensity and spread of the effect are adjusted to the size of the face in the current frame.

### 3. Will the face data be shared with any third parties? Where will it be stored?

**No.** Face data is never:
- Shared with any third party
- Sent to advertising networks or analytics providers
- Transmitted to our backend servers
- Written to disk, cached, or backed up

All face processing happens entirely on the user’s device. The device never makes a network request containing face data.

### 4. How long will face data be retained?

Face contour data is retained only in volatile memory for the duration of a single video frame (typically less than 50 milliseconds) and is overwritten by the next frame. There is **zero persistent storage** of face data.

### 5. Where in the privacy policy is the app’s collection, use, disclosure, sharing, and retention of face data explained?

The privacy policy addresses face data handling in the following explicit sections:

- **Web privacy policy**: https://bronze-api.trair.com.tr/privacy-policy — **Section 2 (Face Data)**, subsections 2.1 through 2.5.
- **In-app privacy policy**: Settings → Privacy Policy → **Section 3 (Yüz Verilerinin İşlenmesi / Face Data)**.

### Quoted text from the privacy policy (Section 2):

> “Born To Bronze performs real-time face contour detection on the live camera preview or a photo chosen by the user, entirely on-device. The resulting contour points exist only in volatile memory for the duration of a single frame and are used solely to clip the virtual tanning filter to skin regions. No face data is uploaded, shared with third parties, or persisted to storage.”

---

## Guideline 4 — Design

**Previous State:** Parts of the UI appeared crowded on iPhone 17 Pro Max running iOS 26.4.2, likely due to fixed top paddings that did not account for the larger Dynamic Island safe area.

**Action Taken:** A full pass over the app’s layout has been performed. Specifically:

1. **SafeAreaProvider** has been added at the root of the app so every screen receives correct safe-area insets on every device.
2. All screens have been migrated to use dynamic `useSafeAreaInsets()` values instead of hard-coded `paddingTop: 60` / `top: 50` values that caused overlap with the Dynamic Island on iPhone 17 Pro Max.
   - `WelcomeScreen`, `OnboardingScreen`, `SettingsScreen`, `PrivacyPolicyScreen`, `TermsOfServiceScreen`, `TermsAcceptanceScreen`, `RealTimeScreen`, `PhotoEditScreen`.
3. The real-time camera screen’s top bar, back button, help button, and bottom controls now position themselves relative to the device’s top and bottom safe areas.
4. The welcome screen logo is now responsive: its size is clamped to `min(screenWidth × 0.85, 520)` to prevent overflow on any device size.
5. The terms acceptance screen had an invalid `<TouchableOpacity>` nested inside `<Text>` that could cause tap target misalignment on iOS; this has been refactored to use `onPress` on `<Text>` elements directly.
6. `SafeAreaView` in the photo edit screen has been switched to the one from `react-native-safe-area-context` for correct behavior on all platforms.

We have re-tested version 1.0.13 (16) on iPhone 17 Pro Max, iPhone 15, iPhone SE, iPad Pro 13", and iPad mini. All controls are now easily reachable and no UI element overlaps with the Dynamic Island, notch, or home indicator.

---

## Summary of Changes in Version 1.0.13 (16)

| Issue | Resolution |
|-------|------------|
| 2.3.3 Screenshots | Refreshed 6.5" iPhone and 13" iPad screenshots from current build |
| 2.3.8 App Name | On-device name changed to “Born To Bronze” to match listing |
| 2.1 Face Data | Face data handling fully documented in privacy policy; no face data leaves the device |
| 4 Design | SafeAreaProvider + dynamic insets across all screens; responsive logo; tap-target fix |

We appreciate your guidance and look forward to your review. Please let us know if any further clarification is needed.

Best regards,
Born To Bronze Team (on behalf of Eda Taşpınar)
info@edataspinar.com
