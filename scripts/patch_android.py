#!/usr/bin/env python3
"""يعدّل مشروع Capacitor/Android ليظهر على شاشة Android TV الرئيسية ويعمل بيد التحكم."""
import re, pathlib

root = pathlib.Path("android/app/src/main")
mf = root / "AndroidManifest.xml"
s = mf.read_text(encoding="utf-8")

# ميزات التلفاز
feats = (
    '    <uses-feature android:name="android.software.leanback" android:required="false" />\n'
    '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n'
    '    <uses-feature android:name="android.hardware.gamepad" android:required="false" />\n'
)
if "android.software.leanback" not in s:
    s = s.replace("<application", feats + "    <application", 1)

# شعار التلفاز
if "android:banner" not in s:
    s = s.replace("<application", '<application android:banner="@drawable/banner"', 1)

# أيقونة الإطلاق على Android TV
launcher = '<category android:name="android.intent.category.LAUNCHER" />'
leanback = '<category android:name="android.intent.category.LEANBACK_LAUNCHER" />'
if leanback not in s:
    s = s.replace(launcher, launcher + "\n                " + leanback, 1)

# اتجاه أفقي
if "screenOrientation" not in s:
    s = re.sub(r"(<activity\b)", r'\1 android:screenOrientation="sensorLandscape"', s, count=1)

mf.write_text(s, encoding="utf-8")

# شعار 320x180
d = root / "res" / "drawable"
d.mkdir(parents=True, exist_ok=True)
(d / "banner.xml").write_text(
    '''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><shape android:shape="rectangle"><solid android:color="#0B0805"/><size android:width="320dp" android:height="180dp"/></shape></item>
    <item android:top="120dp"><shape android:shape="rectangle"><solid android:color="#7A1A10"/></shape></item>
    <item android:top="30dp" android:bottom="70dp" android:left="110dp" android:right="110dp"><shape android:shape="oval"><solid android:color="#D8C08A"/></shape></item>
</layer-list>
''',
    encoding="utf-8",
)
print("patched manifest + banner")
print(mf.read_text(encoding="utf-8"))

# ---- MainActivity مخصص لالتقاط يد التحكم والريموت ----
import glob
acts = glob.glob("android/app/src/main/java/**/MainActivity.java", recursive=True)
assert acts, "MainActivity.java not found"
orig = pathlib.Path(acts[0]).read_text(encoding="utf-8")
pkg = re.search(r"^package\s+([\w.]+);", orig, re.M).group(1)
tpl = pathlib.Path("native/MainActivity.java").read_text(encoding="utf-8")
tpl = re.sub(r"^package\s+[\w.]+;", "package " + pkg + ";", tpl, count=1, flags=re.M)
pathlib.Path(acts[0]).write_text(tpl, encoding="utf-8")
print("replaced", acts[0])
