import org.gradle.api.tasks.JavaExec

plugins {
    id("org.springframework.boot") version "3.5.5"
    id("io.spring.dependency-management") version "1.1.7"
    id("java")
    id("com.diffplug.spotless") version "8.0.0"
}

group = "org.ilo"
version = "0.1.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

spotless {
    java {
        googleJavaFormat()
        removeUnusedImports()
        endWithNewline()
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-amqp")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-mustache")
    implementation("org.projectlombok:lombok")
    implementation("org.apache.commons:commons-lang3:3.19.0")
    implementation("com.microsoft.playwright:playwright:1.55.0")
    implementation("com.vladsch.flexmark:flexmark-html2md-converter:0.64.8") // TODO: Refactor to CommonMark-java
    implementation("com.github.ben-manes.caffeine:caffeine:3.2.3")
    implementation("org.apache.tika:tika-core:3.2.3")
    implementation("org.apache.tika:tika-parsers-standard-package:3.2.3")
    implementation("com.jayway.jsonpath:json-path:2.9.0")
    implementation("org.jsoup:jsoup:1.22.1")

    // AI
    implementation("ai.djl:api:0.35.0")
    implementation("ai.djl.huggingface:tokenizers:0.35.0")
    runtimeOnly("ai.djl.pytorch:pytorch-engine:0.35.0")

    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.amqp:spring-rabbit-test")
    testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.check {
    dependsOn(tasks.spotlessCheck)
}

tasks.register<JavaExec>("runJarWithDebug") {
    group = "application"
    description = "Execute Scraper with debugging enabled."

    dependsOn(tasks.bootJar)

    val bootJarTask = tasks.bootJar.get()
    classpath = files(bootJarTask.archiveFile)
    mainClass.set("org.springframework.boot.loader.launch.JarLauncher")


    val defaultJson = """
        {"executionId": "cli", "rootUri": "https://mptf.undp.org/page/funding-call-proposals", "steps": [{"name":"step-0","operation":"ITERATOR","configuration":{"item-selector":"div[class*='bs_grid']","scrap-attachments":"true"}},{"name":"step-1","operation":"SCRAP","configuration":{}}] }
    """.trimIndent()
    val defaultOutputDir = "build/tmp/worker-output/mptf"

    val jsonMessage = project.findProperty("jsonMessage") as? String ?: defaultJson
    val outputDir = project.findProperty("outputDir") as? String ?: defaultOutputDir

    outputs.upToDateWhen { false }

    outputs.dir(outputDir)

    doFirst {
        val outputDirFile = file(outputDir)
        if (outputDirFile.exists()) {
            outputDirFile.deleteRecursively()
        }
    }

    args = listOf(
        "--mode=run-target",
        "--jsonMessage=$jsonMessage",
        "--outputDir=$outputDir"
    )
}
