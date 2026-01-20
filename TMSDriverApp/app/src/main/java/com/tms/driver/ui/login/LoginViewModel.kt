package com.tms.driver.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tms.driver.data.api.ApiClient
import com.tms.driver.data.model.LoginRequest
import kotlinx.coroutines.launch

/**
 * ViewModel for Login screen
 */
class LoginViewModel : ViewModel() {

    private val _loginState = MutableLiveData<LoginState>()
    val loginState: LiveData<LoginState> = _loginState

    /**
     * Attempt to login with username and password
     */
    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _loginState.value = LoginState.Error("Please enter username and password")
            return
        }

        _loginState.value = LoginState.Loading

        viewModelScope.launch {
            try {
                val response = ApiClient.getService().login(LoginRequest(username, password))
                
                if (response.isSuccessful && response.body()?.message == "OK") {
                    // Get auth status to confirm role
                    val statusResponse = ApiClient.getService().getAuthStatus()
                    if (statusResponse.isSuccessful) {
                        val status = statusResponse.body()
                        if (status?.authenticated == true && status.role == "driver") {
                            _loginState.value = LoginState.Success(
                                username = status.username ?: username,
                                role = status.role ?: "driver"
                            )
                        } else if (status?.role != "driver") {
                            _loginState.value = LoginState.Error("This app is for drivers only")
                            // Logout non-driver
                            ApiClient.getService().logout()
                        } else {
                            _loginState.value = LoginState.Error("Authentication failed")
                        }
                    } else {
                        _loginState.value = LoginState.Error("Failed to verify session")
                    }
                } else {
                    _loginState.value = LoginState.Error("Invalid username or password")
                }
            } catch (e: Exception) {
                _loginState.value = LoginState.Error("Network error: ${e.message}")
            }
        }
    }

    /**
     * Check if user is already logged in
     */
    fun checkExistingSession() {
        viewModelScope.launch {
            try {
                val response = ApiClient.getService().getAuthStatus()
                if (response.isSuccessful) {
                    val status = response.body()
                    if (status?.authenticated == true && status.role == "driver") {
                        _loginState.value = LoginState.Success(
                            username = status.username ?: "",
                            role = status.role ?: "driver"
                        )
                    }
                }
            } catch (e: Exception) {
                // Ignore - user needs to login
            }
        }
    }
}

/**
 * Sealed class representing login UI states
 */
sealed class LoginState {
    object Loading : LoginState()
    data class Success(val username: String, val role: String) : LoginState()
    data class Error(val message: String) : LoginState()
}
