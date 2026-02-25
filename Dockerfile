FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY logo.png /usr/share/nginx/html/
COPY photo-hackathon.png /usr/share/nginx/html/
EXPOSE 80
