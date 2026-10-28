package com.garfit.app.wear

import android.app.Application
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID

sealed interface WorkoutUiState {
    data class Idle(
        val errorMessage: String? = null
    ) : WorkoutUiState

    data class Active(
        val sessionId: String,
        val elapsedSeconds: Long,
        val currentHeartRateBpm: Int?
    ) : WorkoutUiState

    data class Finished(
        val sessionId: String,
        val avgHeartRateBpm: Int,
        val maxHeartRateBpm: Int,
        val activeCaloriesKcal: Int,
        val publishStatus: PublishStatus
    ) : WorkoutUiState
}

sealed interface PublishStatus {
    data object Sending : PublishStatus
    data object Success : PublishStatus
    data class Error(val message: String) : PublishStatus
}

class WorkoutViewModel(
    application: Application,
    private val publisher: SummaryPublisher = WearableDataLayerPublisher(application)
) : AndroidViewModel(application) {

    private val exerciseClient = HealthServices.getClient(application).exerciseClient

    private val _uiState = MutableStateFlow<WorkoutUiState>(WorkoutUiState.Idle())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private var startedAt: Long = 0L
    private var timerJob: Job? = null

    private var accumulatedAvgHr: Double? = null
    private var accumulatedMaxHr: Double? = null
    private var accumulatedCalories: Double? = null
    private val instantaneousHrSamples = mutableListOf<Double>()

    // ponytail: el callback del ExerciseClient vive en el ViewModel; si la Activity muere
    // a mitad (p. ej. por presión de memoria del sistema o timeout de pantalla), se pierde
    // el estado en curso y el resumen. Para producción de larga duración se requeriría un
    // servicio en primer plano (Foreground Service) con notificación Ongoing.
    private val exerciseUpdateCallback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            val hrSamples = update.latestMetrics.getData(DataType.HEART_RATE_BPM)
            val latestInstantHr = hrSamples.lastOrNull()?.value
            hrSamples.forEach { instantaneousHrSamples.add(it.value) }

            val hrStats = update.latestMetrics.getData(DataType.HEART_RATE_BPM_STATS)
            if (hrStats != null) {
                accumulatedAvgHr = hrStats.average
                accumulatedMaxHr = hrStats.max
            } else if (instantaneousHrSamples.isNotEmpty()) {
                accumulatedAvgHr = instantaneousHrSamples.average()
                accumulatedMaxHr = instantaneousHrSamples.maxOrNull()
            }

            val caloriesTotal = update.latestMetrics.getData(DataType.CALORIES_TOTAL)?.total
            if (caloriesTotal != null) {
                accumulatedCalories = caloriesTotal
            }

            val current = _uiState.value
            if (current is WorkoutUiState.Active) {
                _uiState.value = current.copy(
                    currentHeartRateBpm = latestInstantHr?.toInt()
                )
            }
        }

        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {}
        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}
        override fun onRegistered() {}
        override fun onRegistrationFailed(throwable: Throwable) {}
    }

    fun startWorkout() {
        viewModelScope.launch {
            try {
                val sessionId = UUID.randomUUID().toString()
                startedAt = System.currentTimeMillis()
                instantaneousHrSamples.clear()
                accumulatedAvgHr = null
                accumulatedMaxHr = null
                accumulatedCalories = null

                val capabilities = exerciseClient.getCapabilitiesAsync().await()
                val strengthCapabilities = capabilities.getExerciseTypeCapabilities(ExerciseType.STRENGTH_TRAINING)
                val supported = strengthCapabilities.supportedDataTypes

                val requestedTypes = buildSet {
                    if (DataType.HEART_RATE_BPM in supported) add(DataType.HEART_RATE_BPM)
                    if (DataType.HEART_RATE_BPM_STATS in supported) add(DataType.HEART_RATE_BPM_STATS)
                    if (DataType.CALORIES_TOTAL in supported) add(DataType.CALORIES_TOTAL)
                }

                exerciseClient.setUpdateCallback(exerciseUpdateCallback)

                val config = ExerciseConfig.builder(ExerciseType.STRENGTH_TRAINING)
                    .setDataTypes(requestedTypes)
                    .setIsGpsEnabled(false)
                    .build()

                exerciseClient.startExerciseAsync(config).await()

                _uiState.value = WorkoutUiState.Active(
                    sessionId = sessionId,
                    elapsedSeconds = 0L,
                    currentHeartRateBpm = null
                )
                startTimer(startedAt)
            } catch (e: Exception) {
                _uiState.value = WorkoutUiState.Idle(
                    errorMessage = "Error al iniciar: ${e.localizedMessage ?: "error desconocido"}"
                )
            }
        }
    }

    fun stopWorkout() {
        viewModelScope.launch {
            val current = _uiState.value
            if (current !is WorkoutUiState.Active) return@launch

            val endedAt = System.currentTimeMillis()
            timerJob?.cancel()

            try {
                exerciseClient.endExerciseAsync().await()
            } catch (_: Exception) {
                // Si ya finalizó o falló, continuamos para publicar lo registrado
            }

            try {
                exerciseClient.clearUpdateCallbackAsync(exerciseUpdateCallback).await()
            } catch (_: Exception) {
                // Limpieza preventiva
            }

            val metrics = toSummaryFields(
                avgHeartRate = accumulatedAvgHr,
                maxHeartRate = accumulatedMaxHr,
                activeCalories = accumulatedCalories
            )

            _uiState.value = WorkoutUiState.Finished(
                sessionId = current.sessionId,
                avgHeartRateBpm = metrics.avgHeartRateBpm,
                maxHeartRateBpm = metrics.maxHeartRateBpm,
                activeCaloriesKcal = metrics.activeCaloriesKcal,
                publishStatus = PublishStatus.Sending
            )

            val publishResult = publisher.publish(
                sessionId = current.sessionId,
                startedAt = startedAt,
                endedAt = endedAt,
                metrics = metrics
            )

            val finalStatus = if (publishResult.isSuccess) {
                PublishStatus.Success
            } else {
                PublishStatus.Error(
                    publishResult.exceptionOrNull()?.localizedMessage ?: "Fallo de conexión con el móvil"
                )
            }

            _uiState.value = (_uiState.value as? WorkoutUiState.Finished)?.copy(
                publishStatus = finalStatus
            ) ?: _uiState.value
        }
    }

    fun resetToIdle() {
        _uiState.value = WorkoutUiState.Idle()
    }

    private fun startTimer(startTimeMs: Long) {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(1000L)
                val elapsed = (System.currentTimeMillis() - startTimeMs) / 1000L
                val current = _uiState.value
                if (current is WorkoutUiState.Active) {
                    _uiState.value = current.copy(elapsedSeconds = elapsed)
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
        try {
            exerciseClient.clearUpdateCallbackAsync(exerciseUpdateCallback)
        } catch (_: Exception) {
        }
    }
}
