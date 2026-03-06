# TODO: Use JRE using jlink for runtime image
# Stage 1: Build the application
FROM gradle:8.7-jdk21-alpine AS build
WORKDIR /home/gradle/src
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN gradle build --no-daemon

# Stage 2: Create the final image
FROM eclipse-temurin:21.0.2_13-jdk
WORKDIR /app

# Install curl
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /home/gradle/src/build/libs/*.jar ./app.jar
EXPOSE 8080
EXPOSE 5005
ENTRYPOINT ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]