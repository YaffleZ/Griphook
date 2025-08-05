#!/bin/bash

# Griphook Docker Management Script
# Simple script to manage Docker operations for Griphook

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="griphook"
CONTAINER_NAME="griphook"
PORT="3000"

# Functions
print_help() {
    echo -e "${BLUE}Griphook Docker Management Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build      - Build the Docker image"
    echo "  run        - Run the container (no Azure config needed - users auth with their own tenant)"
    echo "  stop       - Stop and remove the container"
    echo "  logs       - Show container logs"
    echo "  shell      - Access container shell"
    echo "  health     - Check container health"
    echo "  clean      - Clean up images and containers"
    echo "  compose    - Run with docker-compose"
    echo "  help       - Show this help message"
    echo ""
}

build_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -t $IMAGE_NAME:latest .
    echo -e "${GREEN}✅ Image built successfully!${NC}"
}

run_container() {
    # Check if container is already running
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        echo -e "${YELLOW}Container $CONTAINER_NAME is already running${NC}"
        echo "Access it at: http://localhost:$PORT"
        return
    fi

    echo -e "${YELLOW}Starting container...${NC}"
    echo -e "${BLUE}Note: No Azure configuration needed - users will authenticate with their own Azure tenant${NC}"
    
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:3000 \
        -e APP_NAME=Griphook \
        -e NODE_ENV=production \
        $IMAGE_NAME:latest

    echo -e "${GREEN}✅ Container started successfully!${NC}"
    echo -e "${BLUE}Access the application at: http://localhost:$PORT${NC}"
    echo -e "${BLUE}Users will be prompted to sign in with their Azure account${NC}"
}

stop_container() {
    echo -e "${YELLOW}Stopping container...${NC}"
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
        echo -e "${GREEN}✅ Container stopped and removed${NC}"
    else
        echo -e "${YELLOW}Container $CONTAINER_NAME is not running${NC}"
    fi
}

show_logs() {
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker logs -f $CONTAINER_NAME
    else
        echo -e "${RED}❌ Container $CONTAINER_NAME is not running${NC}"
    fi
}

access_shell() {
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker exec -it $CONTAINER_NAME /bin/sh
    else
        echo -e "${RED}❌ Container $CONTAINER_NAME is not running${NC}"
    fi
}

check_health() {
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        echo -e "${YELLOW}Checking health...${NC}"
        health_status=$(docker inspect $CONTAINER_NAME --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        echo -e "${BLUE}Health Status: $health_status${NC}"
        
        if [ "$health_status" = "healthy" ]; then
            echo -e "${GREEN}✅ Container is healthy${NC}"
        else
            echo -e "${YELLOW}⚠️  Container health: $health_status${NC}"
            echo -e "${BLUE}Recent health check logs:${NC}"
            docker inspect $CONTAINER_NAME --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 2>/dev/null || echo "No health logs available"
        fi
    else
        echo -e "${RED}❌ Container $CONTAINER_NAME is not running${NC}"
    fi
}

clean_up() {
    echo -e "${YELLOW}Cleaning up Docker resources...${NC}"
    
    # Stop and remove container
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    
    # Remove image
    if docker images -q $IMAGE_NAME | grep -q .; then
        docker rmi $IMAGE_NAME:latest
    fi
    
    # Clean up dangling images
    docker image prune -f
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

run_compose() {
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}❌ docker-compose.yml not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Starting with docker-compose...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Services started with docker-compose${NC}"
    echo -e "${BLUE}Access the application at: http://localhost:$PORT${NC}"
}

# Main script logic
case "${1:-help}" in
    "build")
        build_image
        ;;
    "run")
        run_container
        ;;
    "stop")
        stop_container
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        access_shell
        ;;
    "health")
        check_health
        ;;
    "clean")
        clean_up
        ;;
    "compose")
        run_compose
        ;;
    "help"|*)
        print_help
        ;;
esac
