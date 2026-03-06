# Call for Proposal Classifier

## Running system

`docker compose up`

## Documentation

This project comes with docs-as-source documentation using MkDocs.

Running MkDocs:

1. Install Python 3.13.7 (preferably via pyenv, refern to [.python-version](.python-version) file)
2. Install MkDocs: `pip install mkdocs mkdocs-material`
3. Run MkDocs server (with hotreload) on your host: `mkdocs serve`
4. Or run MkDocs server in Docker Container individually (no hotreload): `docker compose up docs`

The MkDocs support https://mermaid.live/ diagrams (see: [architecture.md](docs/architecture.md))

## Releases

Push `vX.Y.Z` tag to release.
