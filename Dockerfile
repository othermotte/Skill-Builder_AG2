# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build the application
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install a simple static server
RUN npm install -g serve

# Copy build output from build stage
COPY --from=build /app/dist ./dist

# Cloud Run sets the PORT environment variable (defaults to 8080)
ENV PORT=8080
EXPOSE $PORT

# Start the server
CMD ["sh", "-c", "serve -s dist -l $PORT"]
