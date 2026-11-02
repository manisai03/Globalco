# syntax=docker/dockerfile:1.7
# One Dockerfile for every module:  docker build --build-arg MODULE=job-service -t jobboard/job-service .
#
# The build stage has no build args, so it is identical for all modules: BuildKit runs the Maven reactor
# once and every service image reuses that result, copying only its own jar.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre
ARG MODULE
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 app && mkdir -p /app/uploads && chown -R app /app
USER app
COPY --from=build /workspace/${MODULE}/target/${MODULE}-*.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
# PORT must be set (docker-compose and render.yaml do). Readiness turns DOWN as soon as shutdown starts.
HEALTHCHECK --start-period=120s --interval=10s --timeout=3s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/actuator/health/readiness" > /dev/null || exit 1
# exec makes java PID 1, so it receives SIGTERM directly and shuts down gracefully.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
