# Signing key — do not change

Android only installs an update over the existing app if it is signed with
the same key. If the key changes, the update is rejected and the only way to
install is to uninstall the app, which **deletes all the data on the phone**.

- `masik-signing.keystore` is the key every APK has been signed with since the
  first build (the standard Expo/React Native debug key; password `android`,
  alias `androiddebugkey`).
- The CI workflow copies it over the generated keystore and then checks that
  the built APK's certificate SHA-256 equals `EXPECTED_CERT_SHA256` in
  `.github/workflows/android.yml`. If it does not match, the build fails and
  nothing is published.
