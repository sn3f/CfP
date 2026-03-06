FROM python:3.13.7-slim

RUN pip install mkdocs mkdocs-material

COPY . /docs

EXPOSE 8000
CMD ["mkdocs", "serve", "-a", "0.0.0.0:8000"]
