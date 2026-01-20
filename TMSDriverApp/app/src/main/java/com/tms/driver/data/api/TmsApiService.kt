package com.tms.driver.data.api

import com.tms.driver.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * TMS API service interface for Retrofit
 */
interface TmsApiService {

    // ============ Authentication ============

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<ApiResponse>

    @GET("api/auth/status")
    suspend fun getAuthStatus(): Response<AuthStatus>

    // ============ Shipments ============

    @GET("api/shipments")
    suspend fun getShipments(): Response<List<Shipment>>

    @GET("api/shipments/{id}/legs")
    suspend fun getShipmentLegs(@Path("id") shipmentId: Int): Response<List<ShipmentLeg>>

    @PUT("api/shipments/{id}/status")
    suspend fun updateShipmentStatus(
        @Path("id") shipmentId: Int,
        @Body request: StatusUpdateRequest
    ): Response<Shipment>

    // ============ Driver Routes ============

    @GET("api/routes/{truckId}")
    suspend fun getRouteForTruck(
        @Path("truckId") truckId: Int,
        @Query("from") fromDate: String? = null,
        @Query("to") toDate: String? = null
    ): Response<List<Shipment>>
}
