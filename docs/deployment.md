# Deployment

## GitHub Actions

This project uses GitHub actions to publish Docker Images to AWS ECR.
Any push to `main` branch is built and published under SHA of the commit.
The latest build is tagged with `latest`.
A push of a git tag, tags the Docker Image with that tag.
The `vX.Y.Z` image tag is immutable in Docker Image repository.

For any build, only image of the modified service is pushed to AWS ECR.
For builds caused by `vX.Y.Z`, all images are pushed and property tagged at AWS ECR.

See: [aws.yml](https://github.com/SolDevelo/ilo-cfp-classifier/blob/main/.github/workflows/aws.yml)

Required GitHub 'aws' environment secrets:

| Secret                | Description                                                          |
|-----------------------|----------------------------------------------------------------------|
| AWS_ACCESS_KEY_ID     | AWS Access Key                                                       |
| AWS_SECRET_ACCESS_KEY | AWS Secret access key                                                |
| AWS_REGION            | Region code whee AWS ECR was created (ex.: eu-north-1)               |
| ECR_REGISTRY          | The URI for ECR Registry used in publishing URL {URI}/{service_name} |

## Local Docker

For local deployments, use [docker-compose.yml](https://github.com/SolDevelo/ilo-cfp-classifier/blob/main/docker-compose.yml), it starts all services ina simplified stack.

First execution of `docker compose up` should build all images, 
if later you want to force rebuild use `docker compose up --build`.
Refer [docker compose docs](https://docs.docker.com/reference/cli/docker/compose/) for more information.

## AWS Kubernetes

### Development

### Production
