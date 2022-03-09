docker run -v $(pwd)/dist:/reikai-kouza/dist -it --rm reikai-kouza
sudo chown $(whoami) dist/*.js
