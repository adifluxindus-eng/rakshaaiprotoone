package ai.raksha.distress

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {

    private lateinit var txtStatus: TextView
    private lateinit var btnDistress: Button
    private lateinit var inputName: EditText
    private lateinit var inputServerUrl: EditText

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            captureAndSendDistress()
        } else {
            txtStatus.text = "Location permission denied. Sending with demo coordinates..."
            sendIncident(28.6315, 77.2167, 15.0, true, "Connaught Place, New Delhi (Fallback)")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        txtStatus = findViewById(R.id.txtStatus)
        btnDistress = findViewById(R.id.btnDistress)
        inputName = findViewById(R.id.inputName)
        inputServerUrl = findViewById(R.id.inputServerUrl)

        btnDistress.setOnClickListener {
            val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
            if (fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED) {
                captureAndSendDistress()
            } else {
                requestPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun captureAndSendDistress() {
        btnDistress.isEnabled = false
        txtStatus.text = "Capturing GPS location..."

        val client = LocationServices.getFusedLocationProviderClient(this)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
            .addOnSuccessListener { loc ->
                if (loc != null) {
                    sendIncident(
                        loc.latitude,
                        loc.longitude,
                        loc.accuracy.toDouble(),
                        false,
                        "Android Device GPS"
                    )
                } else {
                    sendIncident(28.6315, 77.2167, 12.0, true, "Connaught Place, New Delhi (Demo GPS)")
                }
            }
            .addOnFailureListener {
                sendIncident(28.6315, 77.2167, 12.0, true, "Connaught Place, New Delhi (Demo GPS)")
            }
    }

    private fun sendIncident(
        lat: Double,
        lng: Double,
        accuracy: Double,
        isDemo: Boolean,
        label: String
    ) {
        val baseUrl = inputServerUrl.text.toString().trim().trimEnd('/')
        val reporter = inputName.text.toString().trim().ifEmpty { "Android Citizen" }

        txtStatus.text = "Sending Distress SOS to Admin..."
        thread {
            try {
                val url = URL("$baseUrl/api/incidents")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 10000
                    readTimeout = 10000
                    doOutput = true
                }

                val payload = JSONObject().apply {
                    put("type", "DISTRESS_SOS")
                    put("category", "Medical Emergency")
                    put("reporterName", reporter)
                    put("reporterPhone", "Android Direct SOS")
                    put("locationLabel", label)
                    put("latitude", lat)
                    put("longitude", lng)
                    put("accuracyMeters", accuracy)
                    put("isDemoLocation", isDemo)
                    put("notes", "Triggered directly from Raksha SOS Android App")
                }

                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                val code = conn.responseCode
                val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.readText().orEmpty()

                runOnUiThread {
                    btnDistress.isEnabled = true
                    if (code in 200..299) {
                        val incId = JSONObject(body).optString("id", "SENT")
                        txtStatus.text = "SOS Sent! Incident ID: $incId\nAdmin Control Room alerted."
                    } else {
                        txtStatus.text = "Server error ($code): $body"
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    btnDistress.isEnabled = true
                    txtStatus.text = "Failed: ${e.message}"
                }
            }
        }
    }
}
