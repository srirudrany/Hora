#!/usr/bin/env bash
# Build, install and launch the Pañcāṅga Android app.
#
#   scripts/run-android.sh          # use a connected phone/emulator, or start the "hora" emulator
#   scripts/run-android.sh --test   # also run the engine test suite first
#
# Uses software graphics for the emulator (-gpu swiftshader_indirect): host-GPU mode crashes on
# some NVIDIA hosts once the app's shaders run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"
AVD="${AVD:-hora}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"

[[ -x "$ADB" ]] || { echo "adb not found at $ADB (set ANDROID_HOME)"; exit 1; }
[[ -d "$JAVA_HOME" ]] || { echo "JDK not found at $JAVA_HOME (set JAVA_HOME)"; exit 1; }

if [[ "${1:-}" == "--test" ]]; then
  echo "▸ Running engine tests"
  (cd "$ROOT/android" && ./gradlew -q :core:test)
  echo "  tests passed"
fi

"$ADB" start-server >/dev/null 2>&1
if ! "$ADB" devices | grep -qw "device$"; then
  echo "▸ No device connected — starting emulator '$AVD'"
  nohup "$EMULATOR" -avd "$AVD" -gpu swiftshader_indirect -no-audio >/tmp/hora-emulator.log 2>&1 &
  "$ADB" wait-for-device
fi

echo "▸ Waiting for Android to finish booting"
until [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do sleep 2; done

echo "▸ Building and installing"
(cd "$ROOT/android" && ./gradlew -q :app:installDebug)

echo "▸ Launching"
"$ADB" shell am start -n org.hora.panchanga/.MainActivity >/dev/null
echo "✓ Pañcāṅga is running"
