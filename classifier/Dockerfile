FROM python:3.13-slim

WORKDIR /app

# Add HF_HOME to define a cache directory for downloaded models
ENV HF_HOME=/app/huggingface_cache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry with pip cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install poetry

# Configure Poetry
RUN poetry config virtualenvs.create false

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# Install dependencies with cache mounts for both pip and poetry
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    --mount=type=cache,target=/root/.cache/pip \
    poetry install --no-root --only main

# Copy application code (separate layer - rebuilt on code changes)
COPY app/ ./app/

# Run the classifier
CMD ["python", "-m", "app.classifier"]