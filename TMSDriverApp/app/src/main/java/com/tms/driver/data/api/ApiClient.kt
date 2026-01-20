package com.tms.driver.data.api

import android.content.Context
import android.content.SharedPreferences
import com.tms.driver.BuildConfig
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton API client with session management
 */
object ApiClient {
    
    private var retrofit: Retrofit? = null
    private var apiService: TmsApiService? = null
    private var cookieStore: MutableMap<String, MutableList<Cookie>> = mutableMapOf()
    
    /**
     * Initialize the API client with application context
     */
    fun init(context: Context) {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        // Simple cookie jar for session management
        val cookieJar = object : CookieJar {
            override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
                cookieStore[url.host] = cookies.toMutableList()
            }
            
            override fun loadForRequest(url: HttpUrl): List<Cookie> {
                return cookieStore[url.host] ?: emptyList()
            }
        }
        
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .cookieJar(cookieJar)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS) // Longer for POD uploads
            .build()
        
        retrofit = Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        
        apiService = retrofit?.create(TmsApiService::class.java)
    }
    
    /**
     * Get the API service instance
     */
    fun getService(): TmsApiService {
        return apiService ?: throw IllegalStateException("ApiClient not initialized. Call init() first.")
    }
    
    /**
     * Clear session cookies (on logout)
     */
    fun clearSession() {
        cookieStore.clear()
    }
}

/**
 * Session manager for storing user info locally
 */
class SessionManager(context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences("tms_session", Context.MODE_PRIVATE)
    
    companion object {
        private const val KEY_USERNAME = "username"
        private const val KEY_ROLE = "role"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
    }
    
    fun saveSession(username: String, role: String) {
        prefs.edit().apply {
            putString(KEY_USERNAME, username)
            putString(KEY_ROLE, role)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }
    
    fun getUsername(): String? = prefs.getString(KEY_USERNAME, null)
    
    fun getRole(): String? = prefs.getString(KEY_ROLE, null)
    
    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)
    
    fun clearSession() {
        prefs.edit().clear().apply()
        ApiClient.clearSession()
    }
}
