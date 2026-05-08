# App Store Review Response — Born To Bronze

**Submission ID:** e0967b03-27aa-40fa-aac9-a048901b1592
**Previous Version Reviewed:** 1.0 (17)
**Resubmitted Version:** 1.0.14 (19)
**Review Device referenced by Apple:** iPad Air 11-inch (M3), iPadOS 26.4.2

---

Hello App Review Team,

Thank you for the detailed follow-up. Below are point-by-point responses to the two remaining items from the May 8, 2026 review.

**App context (brief recap).** Born To Bronze is the official mobile application of **Eda Taşpınar**, a self-tanning and skincare brand based in Turkey. The app lets users virtually try Eda Taşpınar self-tanning products on their face (via live camera or a selected photo) and then navigates them to the official brand store at **www.edataspinar.com** to view products. **There is no in-app purchase in the app**; the former "Satın Al" (Buy) button only opened the brand's product web page in the system browser.

---

## Guideline 2.1 — Face Data: Detailed Answers

Born To Bronze uses on-device face contour detection to place a virtual self-tan color only on skin regions. Detailed answers to each question, a link to the privacy policy, and the exact quoted policy text follow.

Privacy policy (web): https://bronze-api.trair.com.tr/privacy-policy — **Section 2 (Face Data)**
Privacy policy (in-app): Settings → Privacy Policy → **Section 3 (Yüz Verilerinin İşlenmesi / Face Data)**

### 1. What face data does the app collect?

Born To Bronze performs real-time face contour detection using the on-device Google ML Kit face detector (bundled via the open-source library `react-native-vision-camera-face-detector`, which wraps Google ML Kit's Face Detection API on iOS/Android).

For each processed camera frame or selected photo, the detector produces **temporary geometric landmark coordinates** for the following regions:
- Face outline (contour polygon)
- Left and right cheek regions
- Left and right eye regions
- Left and right eyebrow regions
- Upper and lower lip regions
- Nose bridge and tip

These are plain 2D (x, y) pixel coordinates in the coordinate space of the current camera frame. They exist only in device RAM for the lifetime of a single frame.

The app does **not** collect, compute, or derive any of the following:
- Face embeddings, face prints, or face signatures
- Apple Face ID data or any biometric identifier
- Face recognition templates or vectors
- Any data that could be used to recognize, identify, track, or authenticate a person
- Any age, gender, ethnicity, or emotion inference

### 2. Complete and clear explanation of all planned uses of the collected face data

The contour coordinates are used for exactly one purpose: to build a per-frame clipping mask so the virtual tanning color is rendered only on skin regions of the live camera preview or the chosen photo. Specifically:

- The face outline is used to limit the tanning effect to the face bounds.
- The eye, eyebrow, nostril, and lip regions are subtracted from the mask so the tanning color is not applied to those non-skin areas.
- The bounding size of the face in the current frame is used to scale the feather radius and effect intensity so the rendered result looks proportional to the face.

The face data is never used for:
- Identifying, recognizing, or authenticating any individual
- Advertising, profiling, or analytics
- Training, evaluating, or improving any machine learning model
- Any purpose other than the real-time rendering of the virtual tanning filter described above

### 3. Will the face data be shared with any third parties? Where will this information be stored?

**No face data is shared with any third party, and no face data is stored anywhere.**

- **Third parties:** None. No face data is transmitted to advertising networks, analytics providers, cloud services, affiliates, or any external recipient.
- **Our servers:** None. Our backend (`bronze-api.trair.com.tr`) never receives any face data. The only data that is ever sent to our backend is the already-rendered final image if and only if the user explicitly taps "Paylaş" (Share) to post their result, plus anonymous device info for diagnostics. The rendered image that is uploaded on an explicit share is a normal RGB image; it contains no facial landmark data, no face embedding, and no separate face information.
- **Storage:** None. All face detection happens on-device. Landmark coordinates exist only in volatile memory and are overwritten by the next frame. They are never written to disk, cached, backed up to iCloud, or persisted in any way.

### 4. How long will face data be retained?

**Zero persistent retention.** Face landmark coordinates exist only in RAM for the duration of a single video frame (typically under 50 milliseconds at 30 fps) and are discarded and overwritten on the next frame. When the camera screen is closed, all in-memory face data is immediately released.

### 5. Where in the privacy policy is the app's collection, use, disclosure, sharing, and retention of face data explained? Identify the specific sections.

The information above is explained in the privacy policy in the following specific sections:

- **Web version** (https://bronze-api.trair.com.tr/privacy-policy): **Section 2 — Face Data (Yüz Verileri)**, including subsections:
  - 2.1 What face data is processed
  - 2.2 How face data is used
  - 2.3 Third-party sharing (none)
  - 2.4 Storage and retention (none)
  - 2.5 User controls
- **In-app version** (Settings → Privacy Policy): **Section 3 — Yüz Verilerinin İşlenmesi (Face Data Processing)**, with the same subsection structure.

### 6. Quote the specific text from the privacy policy concerning face data

> "Born To Bronze, canlı kamera önizlemesi veya kullanıcının seçtiği bir fotoğraf üzerinde, yalnızca cihaz üzerinde gerçek zamanlı yüz kontur tespiti gerçekleştirir. Bu amaçla Google ML Kit Yüz Algılama kütüphanesinin yüz hatları, göz, kaş ve dudak bölgelerini temsil eden 2B (x, y) koordinatları kullanılır. Elde edilen koordinatlar yalnızca geçici bellekte, tek bir kare süresince (yaklaşık 50 milisaniye) bulunur ve bir sonraki karenin işlenmesiyle birlikte üzerine yazılır. Bu veriler yalnızca bronzlaştırıcı filtrenin cilt bölgelerine sınırlandırılması amacıyla kullanılır. Yüz verisi hiçbir üçüncü tarafa aktarılmaz, sunucularımıza yüklenmez, diske yazılmaz ve herhangi bir yedekleme veya analiz amacıyla saklanmaz."

English translation of the same paragraph:

> "Born To Bronze performs real-time face contour detection entirely on the device, either on the live camera preview or on a photo chosen by the user. The Google ML Kit Face Detection library is used to obtain 2D (x, y) coordinates representing the face outline, eye, eyebrow, and lip regions. These coordinates exist only in volatile memory for the duration of a single frame (~50 ms) and are overwritten when the next frame is processed. This data is used solely to clip the tanning filter to skin regions. Face data is never transmitted to any third party, uploaded to our servers, written to disk, or retained for backup or analytics purposes."

---

## Guideline 2.1(a) — "Satın Al" Button Unresponsive on iPad Air 11-inch (M3)

### Root cause

The former "Satın Al" button existed in two places (the real-time camera preview after capturing a photo, and the photo edit result screen). In both cases, the button's only action was to open the brand's product page (for example `https://www.edataspinar.com/products/...`) in the system browser. **There is no in-app purchase in the app.**

We identified three issues that together could cause the button to appear unresponsive, in particular on an iPad where the user may be tapping on a build that hits any of these paths:

1. **In the real-time preview screen**, the handler previously guarded its entire body with `if (selectedProduct.link) { ... }`. If a product record came back from our backend with a missing or empty `link`, the handler silently did nothing and the button looked dead.
2. **In the photo edit screen**, the handler called `Linking.canOpenURL(url)` before opening. On iOS, `canOpenURL` returns `false` for `https` URLs unless the scheme is declared in `LSApplicationQueriesSchemes`. Our previous `Info.plist` did not declare any entries there, which could cause `canOpenURL` to return `false` on some iPadOS 26.x builds and make the button a no-op.
3. Errors thrown by `Linking.openURL` were caught by an empty `catch {}`, so any transient failure produced no visible feedback to the user.

### Fixes shipped in version 1.0.14 (19)

- **Relabeled the button to "Ürünü İncele" ("View Product")** with an `open-outline` (external link) icon in both screens. This better reflects what the button actually does — it opens a product detail page on edataspinar.com — and avoids any implication of an in-app purchase.
- Rewrote both handlers (`handleViewProduct` in `PhotoEditScreen.js`, `viewProduct` in `RealTimeScreen.js`) to:
  - Always show a user-visible message if the product record or its `link` field is missing, instead of failing silently.
  - Skip the `Linking.canOpenURL` pre-check and directly attempt `Linking.openURL` from inside the user-confirmed dialog (`canOpenURL` is not required for opening a URL and, as noted, can return false for `https` without `LSApplicationQueriesSchemes`).
  - Catch errors from `Linking.openURL` and display a visible "Ürün sayfası açılamadı" alert to the user.
- Added `LSApplicationQueriesSchemes` with `https` and `http` entries to `Info.plist` and `app.json` so that any future `canOpenURL` check returns the correct result.
- Updated the confirmation dialog copy from "Satın alma sayfası tarayıcıda açılacak" to "Ürünün detayları tarayıcıda edataspinar.com üzerinde açılacak. Devam etmek istiyor musunuz?" to make the action's destination explicit.

### Verification

We re-tested version 1.0.14 (19) on the following devices:
- iPad Air 11-inch (M3), iPadOS 26.4.2 (the device Apple used for review)
- iPad Pro 13-inch (M4)
- iPhone 17 Pro Max
- iPhone 15
- iPhone SE (3rd gen)

On every device, tapping the "Ürünü İncele" button on both the real-time capture preview and the photo edit result screen reliably shows the confirmation dialog and, after the user taps "Devam Et", opens the product page on www.edataspinar.com in Safari. If the product record happens to be missing a `link`, a clear user-visible alert is shown.

---

## Summary of Changes in Version 1.0.14 (19)

| Apple finding | Resolution |
|-------|------------|
| 2.1 Face Data — more information requested | This response documents every question with direct answers, specific privacy-policy section references, and the exact quoted policy text. No face data leaves the device. |
| 2.1(a) "Satın Al" button unresponsive on iPad | Button renamed to "Ürünü İncele" (View Product). Handlers rewritten with explicit user feedback on every failure path. `LSApplicationQueriesSchemes` added. Confirmed working on iPad Air 11-inch (M3). |

Thank you again for the thorough review. Please let us know if any further clarification would help.

Best regards,
Born To Bronze Team (on behalf of Eda Taşpınar)
info@edataspinar.com
