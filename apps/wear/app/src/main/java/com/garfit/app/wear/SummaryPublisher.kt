package com.garfit.app.wear

import android.content.Context
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.tasks.await

interface SummaryPublisher {
    suspend fun publish(
        sessionId: String,
        startedAt: Long,
        endedAt: Long,
        metrics: SummaryMetrics
    ): Result<Unit>
}

class WearableDataLayerPublisher(
    private val context: Context
) : SummaryPublisher {

    override suspend fun publish(
        sessionId: String,
        startedAt: Long,
        endedAt: Long,
        metrics: SummaryMetrics
    ): Result<Unit> = runCatching {
        val path = "${SummaryContract.PATH_PREFIX}$sessionId"
        val putDataMapRequest = PutDataMapRequest.create(path).apply {
            dataMap.putString(SummaryContract.KEY_SESSION_ID, sessionId)
            dataMap.putLong(SummaryContract.KEY_STARTED_AT, startedAt)
            dataMap.putLong(SummaryContract.KEY_ENDED_AT, endedAt)
            dataMap.putInt(SummaryContract.KEY_AVG_HEART_RATE_BPM, metrics.avgHeartRateBpm)
            dataMap.putInt(SummaryContract.KEY_MAX_HEART_RATE_BPM, metrics.maxHeartRateBpm)
            dataMap.putInt(SummaryContract.KEY_ACTIVE_CALORIES_KCAL, metrics.activeCaloriesKcal)
            setUrgent()
        }
        val request = putDataMapRequest.asPutDataRequest().setUrgent()
        Wearable.getDataClient(context).putDataItem(request).await()
    }
}
