# Stage 1: Build the application
FROM gradle:8.7-jdk21-alpine AS build
WORKDIR /home/gradle/src
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
# TODO: Missing native libs to run AI test
RUN gradle build --no-daemon -x test

# Stage 2: Create the final image
FROM mcr.microsoft.com/playwright/java:v1.55.0-jammy
WORKDIR /app
COPY --from=build /home/gradle/src/build/libs/*.jar ./app.jar
EXPOSE 8080
EXPOSE 5005
ENTRYPOINT ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]