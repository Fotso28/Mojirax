#!/bin/bash
# Démarrer MinIO en local (sans Docker)
# Console: http://localhost:9001 (minioadmin / minioadmin)
# API:     http://localhost:9000

export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin

./minio.exe server ./minio-data --console-address ":9001"
