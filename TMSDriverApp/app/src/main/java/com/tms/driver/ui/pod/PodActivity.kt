package com.tms.driver.ui.pod

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.github.gcacace.signaturepad.views.SignaturePad
import com.tms.driver.R
import com.tms.driver.data.api.ApiClient
import com.tms.driver.data.model.StatusUpdateRequest
import com.tms.driver.databinding.ActivityPodBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * POD (Proof of Delivery) Activity - Capture signature and photo
 */
class PodActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPodBinding
    
    private var shipmentId: Int = 0
    private var photoFile: File? = null
    private var photoBitmap: Bitmap? = null

    // Camera permission launcher
    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            launchCamera()
        } else {
            Toast.makeText(this, "Camera permission required", Toast.LENGTH_SHORT).show()
        }
    }

    // Camera result launcher
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && photoFile?.exists() == true) {
            // Load and display the photo
            photoBitmap = android.graphics.BitmapFactory.decodeFile(photoFile?.absolutePath)
            binding.ivPhoto.setImageBitmap(photoBitmap)
            binding.ivPhoto.visibility = View.VISIBLE
            binding.btnTakePhoto.text = "Retake Photo"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityPodBinding.inflate(layoutInflater)
        setContentView(binding.root)

        shipmentId = intent.getIntExtra("shipment_id", 0)

        setupUI()
    }

    private fun setupUI() {
        // Toolbar
        binding.toolbar.setNavigationOnClickListener { finish() }

        // Signature pad listener
        binding.signaturePad.setOnSignedListener(object : SignaturePad.OnSignedListener {
            override fun onStartSigning() {}
            override fun onSigned() {}
            override fun onClear() {}
        })

        // Clear signature
        binding.btnClear.setOnClickListener {
            binding.signaturePad.clear()
        }

        // Take photo
        binding.btnTakePhoto.setOnClickListener {
            checkCameraPermissionAndLaunch()
        }

        // Submit POD
        binding.btnSubmit.setOnClickListener {
            submitPod()
        }
    }

    private fun checkCameraPermissionAndLaunch() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == 
                PackageManager.PERMISSION_GRANTED -> {
                launchCamera()
            }
            else -> {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    private fun launchCamera() {
        // Create file for photo
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        photoFile = File.createTempFile("POD_${shipmentId}_", ".jpg", storageDir)

        photoFile?.let { file ->
            val photoUri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                file
            )
            cameraLauncher.launch(photoUri)
        }
    }

    private fun submitPod() {
        // Validate signature
        if (binding.signaturePad.isEmpty) {
            Toast.makeText(this, "Please provide signature", Toast.LENGTH_SHORT).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnSubmit.isEnabled = false

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Convert signature to Base64
                val signatureBitmap = binding.signaturePad.signatureBitmap
                val signatureBase64 = bitmapToBase64(signatureBitmap)

                // Convert photo to Base64 if available
                val photoBase64 = photoBitmap?.let { bitmapToBase64(it, 60) }

                // Update status to Delivered with POD
                val response = ApiClient.getService().updateShipmentStatus(
                    shipmentId,
                    StatusUpdateRequest(
                        status = "Delivered",
                        podSignature = "data:image/png;base64,$signatureBase64",
                        podImage = photoBase64?.let { "data:image/jpeg;base64,$it" }
                    )
                )

                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnSubmit.isEnabled = true

                    if (response.isSuccessful) {
                        Toast.makeText(this@PodActivity, 
                            getString(R.string.success_pod_submitted), Toast.LENGTH_SHORT).show()
                        
                        // Return to shipments list
                        setResult(RESULT_OK)
                        finish()
                    } else {
                        Toast.makeText(this@PodActivity, 
                            "Failed to submit POD", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    binding.progressBar.visibility = View.GONE
                    binding.btnSubmit.isEnabled = true
                    Toast.makeText(this@PodActivity, 
                        "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun bitmapToBase64(bitmap: Bitmap, quality: Int = 80): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}
