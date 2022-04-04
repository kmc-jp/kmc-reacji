docker run -v $(pwd)/src:/kmc-reacji/src -v $(pwd)/dist:/kmc-reacji/dist -it --rm kmc-reacji
sudo chown $(whoami) dist/*.js
