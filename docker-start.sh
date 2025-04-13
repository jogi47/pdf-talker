#!/bin/sh

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
./wait-for-it.sh mongodb:27017 -t 60
if [ $? -ne 0 ]; then
  echo "Could not connect to MongoDB. Exiting."
  exit 1
fi

# Wait for Neo4j to be ready
echo "Waiting for Neo4j to be ready..."
./wait-for-it.sh neo4j:7687 -t 60
if [ $? -ne 0 ]; then
  echo "Could not connect to Neo4j. Exiting."
  exit 1
fi

# Wait for ChromaDB to be ready
echo "Waiting for ChromaDB to be ready..."
./wait-for-it.sh chromadb:8000 -t 60
if [ $? -ne 0 ]; then
  echo "Could not connect to ChromaDB. Exiting."
  exit 1
fi

# All services are ready, start the application
echo "All services are ready. Starting PDF Talker application..."
exec npm start 