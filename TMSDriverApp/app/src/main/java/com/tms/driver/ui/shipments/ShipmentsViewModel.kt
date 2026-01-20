package com.tms.driver.ui.shipments

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tms.driver.data.api.ApiClient
import com.tms.driver.data.model.Shipment
import kotlinx.coroutines.launch

/**
 * ViewModel for Shipments list screen
 */
class ShipmentsViewModel : ViewModel() {

    private val _shipmentsState = MutableLiveData<ShipmentsState>()
    val shipmentsState: LiveData<ShipmentsState> = _shipmentsState

    private var allShipments: List<Shipment> = emptyList()
    private var currentFilter: String = "all"

    /**
     * Load shipments from API
     */
    fun loadShipments() {
        _shipmentsState.value = ShipmentsState.Loading

        viewModelScope.launch {
            try {
                val response = ApiClient.getService().getShipments()
                
                if (response.isSuccessful) {
                    val shipments = response.body() ?: emptyList()
                    // Filter only driver-relevant statuses
                    allShipments = shipments.filter { 
                        it.status in listOf("Assigned", "In Transit")
                    }
                    applyFilter(currentFilter)
                } else {
                    _shipmentsState.value = ShipmentsState.Error("Failed to load shipments")
                }
            } catch (e: Exception) {
                _shipmentsState.value = ShipmentsState.Error("Network error: ${e.message}")
            }
        }
    }

    /**
     * Apply status filter to shipments
     */
    fun applyFilter(filter: String) {
        currentFilter = filter
        val filtered = when (filter) {
            "assigned" -> allShipments.filter { it.status == "Assigned" }
            "in_transit" -> allShipments.filter { it.status == "In Transit" }
            else -> allShipments
        }
        
        if (filtered.isEmpty()) {
            _shipmentsState.value = ShipmentsState.Empty
        } else {
            _shipmentsState.value = ShipmentsState.Success(filtered)
        }
    }

    /**
     * Refresh shipments list
     */
    fun refresh() {
        loadShipments()
    }
}

/**
 * Sealed class representing shipments list UI states
 */
sealed class ShipmentsState {
    object Loading : ShipmentsState()
    object Empty : ShipmentsState()
    data class Success(val shipments: List<Shipment>) : ShipmentsState()
    data class Error(val message: String) : ShipmentsState()
}
