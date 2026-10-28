package com.garfit.app.wear

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import java.util.Locale

// Paleta de colores requerida
val BackgroundColor = Color(0xFF0E0F11)
val AccentColor = Color(0xFFC6F432)
val TextColor = Color(0xFFF4F5F2)
val TextSecondary = Color(0xFFA0A3A8)
val ErrorColor = Color(0xFFFF5252)

class MainActivity : ComponentActivity() {

    private val viewModel: WorkoutViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                GarFitWearApp(viewModel)
            }
        }
    }
}

@Composable
fun GarFitWearApp(viewModel: WorkoutViewModel) {
    val context = LocalContext.current
    var permissionsGranted by remember { mutableStateOf(hasRequiredPermissions(context)) }
    var permissionDeniedMessage by remember { mutableStateOf<String?>(null) }

    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val allGranted = result.values.all { it }
        permissionsGranted = allGranted
        if (!allGranted) {
            permissionDeniedMessage = "Permisos denegados. Se necesitan para medir la frecuencia cardíaca."
        } else {
            permissionDeniedMessage = null
        }
    }

    val uiState by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundColor)
            .padding(horizontal = 16.dp, vertical = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        if (!permissionsGranted) {
            PermissionRequestScreen(
                errorMessage = permissionDeniedMessage,
                onRequestPermissions = {
                    permissionsLauncher.launch(getRequiredPermissions())
                }
            )
        } else {
            when (val state = uiState) {
                is WorkoutUiState.Idle -> IdleScreen(
                    errorMessage = state.errorMessage,
                    onStart = {
                        if (hasRequiredPermissions(context)) {
                            viewModel.startWorkout()
                        } else {
                            permissionsGranted = false
                        }
                    }
                )
                is WorkoutUiState.Active -> ActiveScreen(
                    state = state,
                    onStop = { viewModel.stopWorkout() }
                )
                is WorkoutUiState.Finished -> FinishedScreen(
                    state = state,
                    onReset = { viewModel.resetToIdle() }
                )
            }
        }
    }
}

@Composable
fun PermissionRequestScreen(
    errorMessage: String?,
    onRequestPermissions: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "GarFit",
            color = AccentColor,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = errorMessage ?: "Se requieren permisos de sensores corporales y actividad física.",
            color = TextColor,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onRequestPermissions,
            colors = ButtonDefaults.buttonColors(
                containerColor = AccentColor,
                contentColor = BackgroundColor
            )
        ) {
            Text(
                text = "Conceder",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
        }
    }
}

@Composable
fun IdleScreen(
    errorMessage: String?,
    onStart: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "GarFit",
            color = AccentColor,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Fuerza",
            color = TextSecondary,
            fontSize = 13.sp
        )
        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = errorMessage,
                color = ErrorColor,
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            )
        }
        Spacer(modifier = Modifier.height(14.dp))
        Button(
            onClick = onStart,
            modifier = Modifier.fillMaxWidth(0.85f),
            colors = ButtonDefaults.buttonColors(
                containerColor = AccentColor,
                contentColor = BackgroundColor
            )
        ) {
            Text(
                text = "Empezar",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

@Composable
fun ActiveScreen(
    state: WorkoutUiState.Active,
    onStop: () -> Unit
) {
    val minutes = state.elapsedSeconds / 60
    val seconds = state.elapsedSeconds % 60
    val formattedTime = String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = formattedTime,
            color = TextSecondary,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = state.currentHeartRateBpm?.toString() ?: "--",
            color = AccentColor,
            fontSize = 44.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            text = "LPM",
            color = TextColor,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onStop,
            modifier = Modifier.fillMaxWidth(0.8f),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF2A2D32),
                contentColor = TextColor
            )
        ) {
            Text(
                text = "Terminar",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
fun FinishedScreen(
    state: WorkoutUiState.Finished,
    onReset: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Resumen",
            color = AccentColor,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(6.dp))

        val avgText = if (state.avgHeartRateBpm > 0) "${state.avgHeartRateBpm} LPM" else "--"
        val maxText = if (state.maxHeartRateBpm > 0) "${state.maxHeartRateBpm} LPM" else "--"
        val kcalText = if (state.activeCaloriesKcal >= 0) "${state.activeCaloriesKcal} kcal" else "--"

        Text(
            text = "FC Media: $avgText",
            color = TextColor,
            fontSize = 13.sp
        )
        Text(
            text = "FC Máx: $maxText",
            color = TextColor,
            fontSize = 13.sp
        )
        Text(
            text = "Calorías: $kcalText",
            color = TextColor,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        when (val pub = state.publishStatus) {
            is PublishStatus.Sending -> {
                Text(
                    text = "Enviando al móvil...",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
            }
            is PublishStatus.Success -> {
                Text(
                    text = "Enviado al móvil",
                    color = AccentColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }
            is PublishStatus.Error -> {
                Text(
                    text = "Error: ${pub.message}",
                    color = ErrorColor,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Button(
            onClick = onReset,
            modifier = Modifier.fillMaxWidth(0.75f),
            colors = ButtonDefaults.buttonColors(
                containerColor = AccentColor,
                contentColor = BackgroundColor
            )
        ) {
            Text(
                text = "Listo",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
        }
    }
}

private fun getRequiredPermissions(): Array<String> {
    return if (Build.VERSION.SDK_INT >= 36) {
        arrayOf(
            Manifest.permission.BODY_SENSORS,
            Manifest.permission.ACTIVITY_RECOGNITION,
            "android.permission.health.READ_HEART_RATE"
        )
    } else {
        arrayOf(
            Manifest.permission.BODY_SENSORS,
            Manifest.permission.ACTIVITY_RECOGNITION
        )
    }
}

private fun hasRequiredPermissions(context: Context): Boolean {
    val bodySensorsGranted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.BODY_SENSORS
    ) == PackageManager.PERMISSION_GRANTED

    val activityRecognitionGranted = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACTIVITY_RECOGNITION
    ) == PackageManager.PERMISSION_GRANTED

    val readHeartRateGranted = if (Build.VERSION.SDK_INT >= 36) {
        ContextCompat.checkSelfPermission(
            context,
            "android.permission.health.READ_HEART_RATE"
        ) == PackageManager.PERMISSION_GRANTED
    } else {
        true
    }

    return bodySensorsGranted && activityRecognitionGranted && readHeartRateGranted
}
