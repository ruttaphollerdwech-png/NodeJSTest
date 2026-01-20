package com.tms.driver.ui.shipments

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tms.driver.R
import com.tms.driver.data.api.ApiClient
import com.tms.driver.data.api.SessionManager
import com.tms.driver.databinding.ActivityShipmentsBinding
import com.tms.driver.ui.details.ShipmentDetailsActivity
import com.tms.driver.ui.login.LoginActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Shipments list activity - Main screen after login
 */
class ShipmentsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityShipmentsBinding
    private val viewModel: ShipmentsViewModel by viewModels()
    private lateinit var sessionManager: SessionManager
    private lateinit var adapter: ShipmentsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityShipmentsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sessionManager = SessionManager(this)

        setupUI()
        setupRecyclerView()
        observeViewModel()

        // Load shipments
        viewModel.loadShipments()
    }

    private fun setupUI() {
        // Toolbar
        binding.toolbar.title = getString(R.string.shipments_title)

        // Logout button
        binding.btnLogout.setOnClickListener {
            showLogoutConfirmation()
        }

        // Pull to refresh
        binding.swipeRefresh.setColorSchemeResources(R.color.accent)
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.refresh()
        }

        // Filter chips
        binding.chipAll.setOnClickListener { viewModel.applyFilter("all") }
        binding.chipAssigned.setOnClickListener { viewModel.applyFilter("assigned") }
        binding.chipInTransit.setOnClickListener { viewModel.applyFilter("in_transit") }
    }

    private fun setupRecyclerView() {
        adapter = ShipmentsAdapter { shipment ->
            // Navigate to details
            val intent = Intent(this, ShipmentDetailsActivity::class.java)
            intent.putExtra("shipment_id", shipment.id)
            intent.putExtra("cargo_name", shipment.cargoName)
            intent.putExtra("status", shipment.status)
            intent.putExtra("origin", shipment.origin)
            intent.putExtra("destination", shipment.destination)
            intent.putExtra("origin_lat", shipment.originLat ?: 0.0)
            intent.putExtra("origin_lng", shipment.originLng ?: 0.0)
            intent.putExtra("dest_lat", shipment.destLat ?: 0.0)
            intent.putExtra("dest_lng", shipment.destLng ?: 0.0)
            intent.putExtra("weight", shipment.weight ?: 0.0)
            intent.putExtra("consignee_name", shipment.consigneeName)
            intent.putExtra("consignee_phone", shipment.consigneePhone)
            startActivity(intent)
        }
        binding.rvShipments.adapter = adapter
    }

    private fun observeViewModel() {
        viewModel.shipmentsState.observe(this) { state ->
            binding.swipeRefresh.isRefreshing = false

            when (state) {
                is ShipmentsState.Loading -> {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.rvShipments.visibility = View.GONE
                    binding.emptyState.visibility = View.GONE
                }
                is ShipmentsState.Success -> {
                    binding.progressBar.visibility = View.GONE
                    binding.rvShipments.visibility = View.VISIBLE
                    binding.emptyState.visibility = View.GONE
                    adapter.submitList(state.shipments)
                }
                is ShipmentsState.Empty -> {
                    binding.progressBar.visibility = View.GONE
                    binding.rvShipments.visibility = View.GONE
                    binding.emptyState.visibility = View.VISIBLE
                }
                is ShipmentsState.Error -> {
                    binding.progressBar.visibility = View.GONE
                    binding.emptyState.visibility = View.VISIBLE
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showLogoutConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Logout") { _, _ ->
                performLogout()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performLogout() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ApiClient.getService().logout()
            } catch (e: Exception) {
                // Ignore error
            }
        }
        sessionManager.clearSession()

        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    override fun onResume() {
        super.onResume()
        // Refresh on return from details
        viewModel.refresh()
    }
}
