.PHONY: help dev build start stop restart logs clean test migrate seed

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis: localhost:6379"
	@echo "MinIO: http://localhost:9001"

build: ## Build Docker images
	docker-compose build

start: ## Start production environment
	docker-compose up -d
	@echo "Production environment started"
	@echo "Application: http://localhost"

stop: ## Stop all containers
	docker-compose down

restart: ## Restart all containers
	docker-compose restart

logs: ## View logs
	docker-compose logs -f

clean: ## Remove containers and volumes
	docker-compose down -v
	@echo "Cleaned up containers and volumes"

test: ## Run tests
	npm test

migrate: ## Run database migrations
	npm run db:migrate

seed: ## Seed database
	npm run db:seed

install: ## Install dependencies
	npm install

lint: ## Run linter
	npm run lint

format: ## Format code
	npm run format

worker: ## Start worker process locally
	npm run worker --workspace=@arcqubit/jobs

prod-deploy: ## Deploy to production
	@echo "Building images..."
	docker-compose build
	@echo "Starting services..."
	docker-compose up -d
	@echo "Running migrations..."
	docker-compose exec web npm run db:migrate
	@echo "Deployment complete!"
