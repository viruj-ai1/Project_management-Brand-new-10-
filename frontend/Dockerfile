# Stage 1: Build the Vite React application
FROM node:22-alpine AS builder

# Upgrade system packages for security fixes
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install node dependencies
RUN npm install

# Copy application source code
COPY . .

# Build argument for API URL (defaults to /api for nginx proxying or full URL)
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the Vite application
RUN npm run build

# Stage 2: Serve application using Nginx
FROM nginx:alpine

# Upgrade system packages for security fixes
RUN apk update && apk upgrade --no-cache

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx web server
CMD ["nginx", "-g", "daemon off;"]
