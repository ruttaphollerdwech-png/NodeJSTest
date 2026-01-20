package com.tms.driver.ui.details

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tms.driver.R
import com.tms.driver.data.api.ApiClient
import com.tms.driver.data.model.StatusUpdateRequest
import com.tms.driver.databinding.ActivityShipmentDetailsBinding
import com.tms.driver.ui.pod.PodActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Shipment Details Activity - Shows shipment info and actions
 */
class ShipmentDetailsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityShipmentDetailsBinding
    
    private var shipmentId: Int = 0
    private var currentStatus: String = ""
    private var destLat: Double = 0.0
    private var destLng: Double = 0.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityShipmentDetailsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        extractIntentData()
        setupUI()
        updateActionButtons()
    }

    private fun extractIntentData() {
        shipmentId = intent.getIntExtra("shipment_id", 0)
        currentStatus = intent.getStringExtra("status") ?: "Assigned"
        destLat = intent.getDoubleExtra("dest_lat", 0.0)
        destLng = intent.getDoubleExtra("dest_lng", 0.0)

        binding.apply {
            tvShipmentId.text = "#${shipmentId.toString().padStart(5, '0')}"
            tvCargoName.text = intent.getStringExtra("cargo_name") ?: "—"
            tvStatus.text = currentStatus
            tvOrigin.text = intent.getStringExtra("origin") ?: "N/A"
            tvDestination.text = intent.getStringExtra("destination") ?: "N/A"
            tvWeight.text = "${intent.getDoubleExtra("weight", 0.0).toInt()} kg"
            tvConsigneeName.text = intent.getStringExtra("consignee_name") ?: "—"
            tvConsigneePhone.text = intent.getStringExtra("consignee_phone") ?: "—"

            // Set status color
            val colorRes = when (currentStatus) {
                "Assigned" -> R.color.status_assigned
                "In Transit" -> R.color.status_in_transit
                "Delivered" -> R.color.status_delivered
                else -> R.color.status_pending
            }
            val drawable = tvStatus.background as? GradientDrawable
            drawable?.setColor(getColor(colorRes))
        }
    }

    private fun setupUI() {
        // Toolbar
        binding.toolbar.title = "Shipment Details"
        binding.toolbar.setNavigationOnClickListener { finish() }

        // Navigate button
        binding.btnNavigate.setOnClickListener {
            openNavigation()
        }

        // Start Transit button
        binding.btnStartTransit.setOnClickListener {
            confirmStatusUpdate("In Transit")
        }

        // Complete Delivery button
        binding.btnComplete.setOnClickListener {
            // Go to POD capture
            val intent = Intent(this, PodActivity::class.java)
            intent.putExtra("shipment_id", shipmentId)
            startActivity(intent)
        }

        // Phone click
        binding.tvConsigneePhone.setOnClickListener {
            val phone = binding.tvConsigneePhone.text.toString()
            if (phone.isNotBlank() && phone != "—") {
                val intent = Intent(Intent.ACTION_DIAL)
                intent.data = Uri.parse("tel:$phone")
                startActivity(intent)
            }
        }
    }

    private fun updateActionButtons() {
        when (currentStatus) {
            "Assigned" -> {
                binding.btnStartTransit.visibility = View.VISIBLE
                binding.btnComplete.visibility = View.GONE
            }
            "In Transit" -> {
                binding.btnStartTransit.visibility = View.GONE
                binding.btnComplete.visibility = View.VISIBLE
            }
            else -> {
                binding.btnStartTransit.visibility = View.GONE
                binding.btnComplete.visibility = View.GONE
            }
        }
    }

    private fun openNavigation() {
        if (destLat != 0.0 && destLng != 0.0) {
            val uri = Uri.parse("google.navigation:q=$destLat,$destLng")
            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.setPackage("com.google.android.apps.maps")
            
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
            } else {
                // Fallback to browser
                val webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$destLat,$destLng")
                startActivity(Intent(Intent.ACTION_VIEW, webUri))
            }
        } else {
            Toast.makeText(this, "No destination coordinates available", Toast.LENGTH_SHORT).show()
        }
    }

    private fun confirmStatusUpdate(newStatus: String) {
        AlertDialog.Builder(this)
            .setTitle("Update Status")
            .setMessage("Change status to \"$newStatus\"?")
            .setPositiveButton("Confirm") { _, _ ->
                updateStatus(newStatus)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun updateStatus(newStatus: String) {
        binding.progressBar.visibility = View.VISIBLE
        binding.btnStartTransit.isEnabled = false
        binding.btnComplete.isEnabled = false

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = ApiClient.getService().updateShipmentStatus(
                    shipmentId,
                    StatusUpdateRequest(status = newStatus)
                )

                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnStartTransit.isEnabled = true
                    binding.btnComplete.isEnabled = true

                    if (response.isSuccessful) {
                        currentStatus = newStatus
                        binding.tvStatus.text = newStatus

                        val colorRes = when (newStatus) {
                            "In Transit" -> R.color.status_in_transit
                            "Delivered" -> R.color.status_delivered
                            else -> R.color.status_assigned
                        }
                        val drawable = binding.tvStatus.background as? GradientDrawable
                        drawable?.setColor(getColor(colorRes))

                        updateActionButtons()
                        Toast.makeText(this@ShipmentDetailsActivity, 
                            getString(R.string.success_status_updated), Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@ShipmentDetailsActivity, 
                            "Failed to update status", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnStartTransit.isEnabled = true
                    binding.btnComplete.isEnabled = true
                    Toast.makeText(this@ShipmentDetailsActivity, 
                        "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
