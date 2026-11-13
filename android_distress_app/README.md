# Raksha SOS — Direct Distress Android App (Kotlin)

This standalone Android Studio project sends an instant Distress SOS with device GPS coordinates directly to the Raksha AI Admin Control Room (`POST /api/incidents`).

## How to Build the `.apk` File
1. Extract this folder and open it in **Android Studio** (Hedgehog / Koala or newer).
2. Let Gradle sync finish.
3. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or run `./gradlew assembleDebug` in terminal).
4. Locate the generated APK at `app/build/outputs/apk/debug/app-debug.apk` and install it on any Android phone.
