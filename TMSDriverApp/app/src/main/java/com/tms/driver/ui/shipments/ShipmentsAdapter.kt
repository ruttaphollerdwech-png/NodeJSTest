package com.tms.driver.ui.shipments

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tms.driver.R
import com.tms.driver.data.model.Shipment
import com.tms.driver.databinding.ItemShipmentBinding
import java.text.SimpleDateFormat
import java.util.*

/**
 * Adapter for shipments RecyclerView
 */
class ShipmentsAdapter(
    private val onItemClick: (Shipment) -> Unit
) : ListAdapter<Shipment, ShipmentsAdapter.ShipmentViewHolder>(ShipmentDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ShipmentViewHolder {
        val binding = ItemShipmentBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ShipmentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ShipmentViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ShipmentViewHolder(
        private val binding: ItemShipmentBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(shipment: Shipment) {
            binding.apply {
                // Shipment ID
                tvShipmentId.text = "#${shipment.id.toString().padStart(5, '0')}"

                // Cargo name
                tvCargoName.text = shipment.cargoName

                // Status badge
                tvStatus.text = shipment.status
                setStatusColor(shipment.status)

                // Origin/Destination
                tvOrigin.text = shipment.origin ?: "N/A"
                tvDestination.text = shipment.destination ?: "N/A"

                // Weight and pallets info
                val infoBuilder = StringBuilder()
                shipment.weight?.let { infoBuilder.append("${it.toInt()} kg") }
                shipment.palletQty?.let { 
                    if (it > 0) {
                        if (infoBuilder.isNotEmpty()) infoBuilder.append(" • ")
                        infoBuilder.append("$it pallets")
                    }
                }
                tvInfo.text = if (infoBuilder.isEmpty()) "—" else infoBuilder.toString()

                // Pickup time
                val timeStr = formatTime(shipment.pickupTime ?: shipment.createdAt)
                tvTime.text = timeStr

                // Click listener
                root.setOnClickListener { onItemClick(shipment) }
            }
        }

        private fun setStatusColor(status: String) {
            val colorRes = when (status) {
                "Assigned" -> R.color.status_assigned
                "In Transit" -> R.color.status_in_transit
                "Delivered" -> R.color.status_delivered
                else -> R.color.status_pending
            }
            val color = itemView.context.getColor(colorRes)
            val drawable = binding.tvStatus.background as? GradientDrawable
            drawable?.setColor(color)
        }

        private fun formatTime(isoString: String?): String {
            if (isoString == null) return "—"
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                val date = inputFormat.parse(isoString)
                date?.let { outputFormat.format(it) } ?: "—"
            } catch (e: Exception) {
                "—"
            }
        }
    }

    class ShipmentDiffCallback : DiffUtil.ItemCallback<Shipment>() {
        override fun areItemsTheSame(oldItem: Shipment, newItem: Shipment): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Shipment, newItem: Shipment): Boolean {
            return oldItem == newItem
        }
    }
}
