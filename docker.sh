#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker before proceeding."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose before proceeding."
    exit 1
fi

# Function to display usage information
function show_usage {
    echo "PDF Talker Docker Helper"
    echo "------------------------"
    echo "Usage: ./docker.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all containers"
    echo "  stop        Stop all containers"
    echo "  restart     Restart all containers"
    echo "  status      Show the status of all containers"
    echo "  logs        Show logs from all containers"
    echo "  clean       Stop containers and remove volumes"
    echo "  help        Show this help message"
    echo ""
}

# Check if .env file exists, if not create from template
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        echo "Creating .env file from .env.docker template..."
        cp .env.docker .env
        echo ".env file created. Please edit it to add your OpenAI API key."
    else
        echo "Warning: .env.docker template not found. Please create a .env file manually."
    fi
fi

# Process command line arguments
case "$1" in
    start)
        echo "Starting PDF Talker containers..."
        docker compose up -d
        echo "Containers started. Access the application at http://localhost:3000"
        ;;
    stop)
        echo "Stopping PDF Talker containers..."
        docker compose down
        echo "Containers stopped."
        ;;
    restart)
        echo "Restarting PDF Talker containers..."
        docker compose down
        docker compose up -d
        echo "Containers restarted. Access the application at http://localhost:3000"
        ;;
    status)
        echo "PDF Talker containers status:"
        docker compose ps
        ;;
    logs)
        echo "Showing PDF Talker container logs:"
        docker compose logs
        ;;
    clean)
        echo "Stopping containers and removing volumes..."
        docker compose down -v
        echo "Clean up complete."
        ;;
    help)
        show_usage
        ;;
    *)
        show_usage
        ;;
esac

exit 0 