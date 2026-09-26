// Pure-Kotlin Panchanga core (engine port + tables + rules). No Android dependencies,
// so the test-vector suite runs on the plain JVM: ./gradlew :core:test
plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin { jvmToolchain(21) }

dependencies {
    testImplementation(libs.junit)
    testImplementation(libs.org.json)
}

tasks.test {
    systemProperty("hora.data", rootProject.projectDir.resolve("../data").absolutePath)
    testLogging { events("passed", "failed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}
