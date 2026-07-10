# Testbed image for the product SPA.
# Builds the dev-auth flavor (empty B2C client id → Dev Identity Picker) and
# serves the static build with nginx, which also proxies /api to the API
# container (see docker/nginx.conf). Used by cps-dotnet/docker-compose.testbed.yml.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Empty B2C client id + VITE_DEV_LOGIN=true → the SPA renders the Dev Identity
# Picker and authenticates via the X-Dev-Claims header (no Azure AD B2C).
ENV VITE_B2C_CLIENT_ID="" \
    VITE_DEV_LOGIN="true"
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
