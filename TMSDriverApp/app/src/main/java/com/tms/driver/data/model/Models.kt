package com.tms.driver.data.model

import com.google.gson.annotations.SerializedName

/**
 * User login request
 */
data class LoginRequest(
    val username: String,
    val password: String
)

/**
 * User login response
 */
data class LoginResponse(
    val message: String
)

/**
 * Auth status response
 */
data class AuthStatus(
    val authenticated: Boolean,
    val username: String?,
    val role: String?
)

/**
 * Shipment data model
 */
data class Shipment(
    val id: Int,
    @SerializedName("cargo_name") val cargoName: String,
    val origin: String?,
    val destination: String?,
    val weight: Double?,
    val status: String,
    @SerializedName("origin_lat") val originLat: Double?,
    @SerializedName("origin_lng") val originLng: Double?,
    @SerializedName("dest_lat") val destLat: Double?,
    @SerializedName("dest_lng") val destLng: Double?,
    val description: String?,
    @SerializedName("pallet_qty") val palletQty: Int?,
    @SerializedName("box_qty") val boxQty: Int?,
    @SerializedName("total_volume") val totalVolume: Double?,
    @SerializedName("consignee_name") val consigneeName: String?,
    @SerializedName("consignee_phone") val consigneePhone: String?,
    @SerializedName("consignee_address") val consigneeAddress: String?,
    @SerializedName("delivery_remark") val deliveryRemark: String?,
    @SerializedName("pickup_time") val pickupTime: String?,
    @SerializedName("delivery_time") val deliveryTime: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("truck_plate") val truckPlate: String?,
    @SerializedName("driver_name") val driverName: String?,
    val legs: List<ShipmentLeg>?
)

/**
 * Shipment leg (multi-stop delivery point)
 */
data class ShipmentLeg(
    val id: Int,
    @SerializedName("shipment_id") val shipmentId: Int,
    @SerializedName("leg_order") val legOrder: Int,
    @SerializedName("leg_type") val legType: String, // 'pickup' or 'delivery'
    @SerializedName("location_name") val locationName: String,
    @SerializedName("location_lat") val locationLat: Double?,
    @SerializedName("location_lng") val locationLng: Double?,
    @SerializedName("consignee_name") val consigneeName: String?,
    @SerializedName("consignee_phone") val consigneePhone: String?,
    @SerializedName("shipper_name") val shipperName: String?,
    @SerializedName("shipper_phone") val shipperPhone: String?,
    @SerializedName("scheduled_time") val scheduledTime: String?,
    val quantity: String?,
    val status: String?,
    val notes: String?
)

/**
 * Status update request
 */
data class StatusUpdateRequest(
    val status: String,
    @SerializedName("pod_signature") val podSignature: String? = null,
    @SerializedName("pod_image") val podImage: String? = null
)

/**
 * Generic API response
 */
data class ApiResponse(
    val message: String?,
    val error: String?
)
