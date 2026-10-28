package com.garfit.app.wear

import kotlin.math.roundToInt

data class SummaryMetrics(
    val avgHeartRateBpm: Int,
    val maxHeartRateBpm: Int,
    val activeCaloriesKcal: Int
)

object SummaryContract {
    const val PATH_PREFIX = "/garfit/workout-summary/"

    const val KEY_SESSION_ID = "sessionId"
    const val KEY_STARTED_AT = "startedAt"
    const val KEY_ENDED_AT = "endedAt"
    const val KEY_AVG_HEART_RATE_BPM = "avgHeartRateBpm"
    const val KEY_MAX_HEART_RATE_BPM = "maxHeartRateBpm"
    const val KEY_ACTIVE_CALORIES_KCAL = "activeCaloriesKcal"

    const val NO_DATA_VALUE = -1
    const val MIN_HEART_RATE_BPM = 30
    const val MAX_HEART_RATE_BPM = 250
}

/**
 * Función pura que convierte los valores recogidos por Health Services (Double?)
 * a los campos Int del contrato con el móvil.
 * - Redondeo estándar al entero más próximo
 * - null -> -1
 * - Frecuencia cardíaca fuera del rango fisiológico 30..250 -> -1
 * - Calorías negativas -> -1
 */
fun toSummaryFields(
    avgHeartRate: Double?,
    maxHeartRate: Double?,
    activeCalories: Double?
): SummaryMetrics {
    fun sanitizeHeartRate(value: Double?): Int {
        if (value == null) return SummaryContract.NO_DATA_VALUE
        val rounded = value.roundToInt()
        return if (rounded in SummaryContract.MIN_HEART_RATE_BPM..SummaryContract.MAX_HEART_RATE_BPM) {
            rounded
        } else {
            SummaryContract.NO_DATA_VALUE
        }
    }

    fun sanitizeCalories(value: Double?): Int {
        if (value == null) return SummaryContract.NO_DATA_VALUE
        val rounded = value.roundToInt()
        return if (rounded >= 0) rounded else SummaryContract.NO_DATA_VALUE
    }

    return SummaryMetrics(
        avgHeartRateBpm = sanitizeHeartRate(avgHeartRate),
        maxHeartRateBpm = sanitizeHeartRate(maxHeartRate),
        activeCaloriesKcal = sanitizeCalories(activeCalories)
    )
}
