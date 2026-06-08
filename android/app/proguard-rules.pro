# DrivePass+ ProGuard Rules

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor core — bridge must not be obfuscated
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Capacitor plugins
-keep class com.capacitorjs.plugins.** { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp (networking)
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Prevent stripping R8 from removing reflection-based code
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Firebase / FCM (push notifications)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
