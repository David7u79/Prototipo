package com.garfit.app.wear

import org.junit.Assert.assertEquals
import org.junit.Test

class SummaryContractTest {

    @Test
    fun `toSummaryFields returns -1 for all null values`() {
        val summary = toSummaryFields(
            avgHeartRate = null,
            maxHeartRate = null,
            activeCalories = null
        )

        assertEquals(-1, summary.avgHeartRateBpm)
        assertEquals(-1, summary.maxHeartRateBpm)
        assertEquals(-1, summary.activeCaloriesKcal)
    }

    @Test
    fun `toSummaryFields rounds double values to nearest integer`() {
        val summary = toSummaryFields(
            avgHeartRate = 135.4,
            maxHeartRate = 162.6,
            activeCalories = 245.5
        )

        assertEquals(135, summary.avgHeartRateBpm)
        assertEquals(163, summary.maxHeartRateBpm)
        assertEquals(246, summary.activeCaloriesKcal)
    }

    @Test
    fun `toSummaryFields accepts exact boundary heart rates 30 and 250`() {
        val summaryLower = toSummaryFields(
            avgHeartRate = 30.0,
            maxHeartRate = 30.2,
            activeCalories = 0.0
        )
        assertEquals(30, summaryLower.avgHeartRateBpm)
        assertEquals(30, summaryLower.maxHeartRateBpm)
        assertEquals(0, summaryLower.activeCaloriesKcal)

        val summaryUpper = toSummaryFields(
            avgHeartRate = 249.6,
            maxHeartRate = 250.0,
            activeCalories = 500.0
        )
        assertEquals(250, summaryUpper.avgHeartRateBpm)
        assertEquals(250, summaryUpper.maxHeartRateBpm)
        assertEquals(500, summaryUpper.activeCaloriesKcal)
    }

    @Test
    fun `toSummaryFields returns -1 for heart rates outside 30 to 250`() {
        val summary = toSummaryFields(
            avgHeartRate = 29.4,
            maxHeartRate = 250.6,
            activeCalories = 100.0
        )

        assertEquals(-1, summary.avgHeartRateBpm)
        assertEquals(-1, summary.maxHeartRateBpm)
        assertEquals(100, summary.activeCaloriesKcal)
    }

    @Test
    fun `toSummaryFields handles negative calories as -1`() {
        val summary = toSummaryFields(
            avgHeartRate = 120.0,
            maxHeartRate = 150.0,
            activeCalories = -5.0
        )

        assertEquals(120, summary.avgHeartRateBpm)
        assertEquals(150, summary.maxHeartRateBpm)
        assertEquals(-1, summary.activeCaloriesKcal)
    }
}
