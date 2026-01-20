# Add project specific ProGuard rules here.

# Retrofit
-keepattributes Signature
-keepattributes Exceptions
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# Gson
-keepattributes *Annotation*
-keep class com.tms.driver.data.model.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
