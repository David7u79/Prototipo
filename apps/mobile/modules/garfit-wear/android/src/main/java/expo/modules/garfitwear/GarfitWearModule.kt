package expo.modules.garfitwear

import android.content.Context
import android.net.Uri
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant

class GarfitWearModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun summaryUri(sessionId: String): Uri =
    Uri.Builder().scheme("wear").path("/garfit/workout-summary/$sessionId").build()

  override fun definition() = ModuleDefinition {
    Name("GarfitWear")

    AsyncFunction("getSummaries") {
      val summaries = mutableListOf<Map<String, Any?>>()
      try {
        val googleApi = GoogleApiAvailability.getInstance()
        if (googleApi.isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
          return@AsyncFunction emptyList<Map<String, Any?>>()
        }

        // Sin host = cualquier nodo; "*" se trataría como id de nodo literal.
        val uri = summaryUri("")
        val dataClient = Wearable.getDataClient(context)
        val dataItemBuffer = Tasks.await(dataClient.getDataItems(uri, DataClient.FILTER_PREFIX))

        try {
          for (item in dataItemBuffer) {
            val dataMap = DataMapItem.fromDataItem(item).dataMap
            val sessionId = dataMap.getString("sessionId") ?: item.uri.lastPathSegment ?: continue
            val startedAtMs = dataMap.getLong("startedAt", 0L)
            val endedAtMs = dataMap.getLong("endedAt", 0L)

            val startedAtStr = if (startedAtMs > 0) {
              Instant.ofEpochMilli(startedAtMs).toString()
            } else {
              null
            }

            val endedAtStr = if (endedAtMs > 0) {
              Instant.ofEpochMilli(endedAtMs).toString()
            } else {
              null
            }

            if (startedAtStr == null || endedAtStr == null) {
              continue
            }

            val avgHr = if (dataMap.containsKey("avgHeartRateBpm")) dataMap.getInt("avgHeartRateBpm", -1) else -1
            val maxHr = if (dataMap.containsKey("maxHeartRateBpm")) dataMap.getInt("maxHeartRateBpm", -1) else -1
            val activeCal = if (dataMap.containsKey("activeCaloriesKcal")) dataMap.getInt("activeCaloriesKcal", -1) else -1

            val summary = mapOf(
              "sessionId" to sessionId,
              "startedAt" to startedAtStr,
              "endedAt" to endedAtStr,
              "avgHeartRateBpm" to if (avgHr >= 0) avgHr else null,
              "maxHeartRateBpm" to if (maxHr >= 0) maxHr else null,
              "activeCaloriesKcal" to if (activeCal >= 0) activeCal else null
            )
            summaries.add(summary)
          }
        } finally {
          dataItemBuffer.release()
        }
      } catch (_: Throwable) {
        return@AsyncFunction emptyList<Map<String, Any?>>()
      }
      return@AsyncFunction summaries
    }

    AsyncFunction("deleteSummary") { sessionId: String ->
      try {
        val googleApi = GoogleApiAvailability.getInstance()
        if (googleApi.isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS) {
          val uri = summaryUri(sessionId)
          val dataClient = Wearable.getDataClient(context)
          Tasks.await(dataClient.deleteDataItems(uri))
        }
      } catch (_: Throwable) {
        // no-op
      }
    }
  }
}
