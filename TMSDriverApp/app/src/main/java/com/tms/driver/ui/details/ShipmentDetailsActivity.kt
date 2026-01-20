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
        
        // Ensure ApiClient is initialized
        ApiClient.init(applicationContext)
        
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
            
            // Cargo details
            val weight = intent.getDoubleExtra("weight", 0.0)
            val pallets = intent.getIntExtra("pallet_qty", 0)
            val boxes = intent.getIntExtra("box_qty", 0)
            val volume = intent.getDoubleExtra("total_volume", 0.0)
            
            tvWeight.text = "${weight.toInt()} kg"
            tvCargoWeight.text = "${weight.toInt()} kg"
            tvCargoPallets.text = pallets.toString()
            tvCargoBoxes.text = boxes.toString()
            tvCargoVolume.text = "${String.format("%.2f", volume)} m³"
            
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

        // Load legs from API
        loadLegs()
    }

    private fun loadLegs() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = ApiClient.getService().getShipmentLegs(shipmentId)
                if (response.isSuccessful) {
                    val legs = response.body() ?: emptyList()
                    withContext(Dispatchers.Main) {
                        renderLegs(legs)
                    }
                }
            } catch (e: Exception) {
                // Fallback to single delivery if API fails
                withContext(Dispatchers.Main) {
                    renderFallbackDelivery()
                }
            }
        }
    }

    private fun renderLegs(legs: List<com.tms.driver.data.model.ShipmentLeg>) {
        binding.legsContainer.removeAllViews()

        val deliveryLegs = legs.filter { it.legType == "delivery" }

        if (deliveryLegs.isEmpty()) {
            renderFallbackDelivery()
            return
        }

        deliveryLegs.forEachIndexed { index, leg ->
            val legView = layoutInflater.inflate(android.R.layout.simple_list_item_2, binding.legsContainer, false)

            // Create custom leg view
            val legLayout = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.HORIZONTAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (12 * resources.displayMetrics.density).toInt()
                }
            }

            // Red circle indicator
            val indicator = android.view.View(this).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    (12 * resources.displayMetrics.density).toInt(),
                    (12 * resources.displayMetrics.density).toInt()
                ).apply {
                    topMargin = (4 * resources.displayMetrics.density).toInt()
                }
                setBackgroundResource(R.drawable.bg_circle_danger)
            }

            // Text container
            val textContainer = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                ).apply {
                    marginStart = (12 * resources.displayMetrics.density).toInt()
                }
            }

            // Title with delivery number
            val title = android.widget.TextView(this).apply {
                text = "DELIVERY ${index + 1}"
                setTextColor(getColor(R.color.danger))
                textSize = 12f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            }

            // Location
            val location = android.widget.TextView(this).apply {
                text = leg.locationName
                setTextColor(getColor(R.color.text_primary))
                textSize = 14f
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (2 * resources.displayMetrics.density).toInt()
                }
            }

            // Quantity/Cargo info
            val quantityInfo = android.widget.TextView(this).apply {
                val qty = leg.quantity ?: ""
                val cargo = leg.cargoName ?: ""
                text = if (qty.isNotEmpty() || cargo.isNotEmpty()) {
                    "📦 ${cargo.ifEmpty { "Cargo" }} ${if (qty.isNotEmpty()) "• $qty" else ""}"
                } else {
                    ""
                }
                setTextColor(getColor(R.color.text_muted))
                textSize = 12f
                visibility = if (text.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = (4 * resources.displayMetrics.density).toInt()
                }
            }

            // Consignee
            val consignee = android.widget.TextView(this).apply {
                val name = leg.consigneeName ?: ""
                text = if (name.isNotEmpty()) "👤 $name" else ""
                setTextColor(getColor(R.color.text_muted))
                textSize = 11f
                visibility = if (text.isNotEmpty()) android.view.View.VISIBLE else android.view.View.GONE
            }

            textContainer.addView(title)
            textContainer.addView(location)
            textContainer.addView(quantityInfo)
            textContainer.addView(consignee)

            legLayout.addView(indicator)
            legLayout.addView(textContainer)

            binding.legsContainer.addView(legLayout)
        }
    }

    private fun renderFallbackDelivery() {
        val destination = intent.getStringExtra("destination") ?: "N/A"

        val legLayout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = (12 * resources.displayMetrics.density).toInt()
            }
        }

        val indicator = android.view.View(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                (12 * resources.displayMetrics.density).toInt(),
                (12 * resources.displayMetrics.density).toInt()
            ).apply {
                topMargin = (4 * resources.displayMetrics.density).toInt()
            }
            setBackgroundResource(R.drawable.bg_circle_danger)
        }

        val textContainer = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                0,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
            ).apply {
                marginStart = (12 * resources.displayMetrics.density).toInt()
            }
        }

        val title = android.widget.TextView(this).apply {
            text = "DELIVERY"
            setTextColor(getColor(R.color.danger))
            textSize = 12f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }

        val location = android.widget.TextView(this).apply {
            text = destination
            setTextColor(getColor(R.color.text_primary))
            textSize = 14f
        }

        textContainer.addView(title)
        textContainer.addView(location)
        legLayout.addView(indicator)
        legLayout.addView(textContainer)

        binding.legsContainer.addView(legLayout)
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
