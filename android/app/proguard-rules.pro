# ProGuard/R8 rules for PawSpeak release builds.
#
# Capacitor supplies its own consumer rules for plugin dispatch (verified: the
# capacitor-android module declares consumerProguardFiles), so those are not repeated here.
# The gaps are TensorFlow Lite's JNI bridge and our own plugin surface.

# --- TensorFlow Lite -----------------------------------------------------------
# The TFLite task library reaches Java classes from native code by name. R8 cannot see those
# references, so without this it renames or strips them and inference fails at runtime with
# ClassNotFoundException / UnsatisfiedLinkError rather than a compile error.
-keep class org.tensorflow.lite.** { *; }
-keepclassmembers class org.tensorflow.lite.** { *; }
-dontwarn org.tensorflow.lite.**

# Native methods and the classes/factories that hold them.
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}
-keep class org.tensorflow.lite.task.** { *; }

# TFLite support library uses reflection for image/Tensor operations.
-keep class org.tensorflow.lite.support.** { *; }
-dontwarn org.tensorflow.lite.support.**

# --- PawSpeak native plugin ----------------------------------------------------
# Capacitor keeps "* extends com.getcapacitor.Plugin", but keep our package explicitly so the
# bridge cannot fail to resolve the plugin in an optimized build.
-keep class com.pawspeak.app.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# --- Capacitor / WebView -------------------------------------------------------
# Anything annotated as a JS interface or reached from the bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Cordova plugin surface (Capacitor's rule keeps subclasses; this protects the base machinery).
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# --- General hygiene -----------------------------------------------------------
# Keep line numbers so release crash reports remain diagnosable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Kotlin metadata is used reflectively by some AndroidX components.
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Suppress warnings from optional dependencies that are never present on Android.
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
