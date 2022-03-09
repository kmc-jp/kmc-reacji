FROM node:17-alpine3.14
RUN apk add bash
ENTRYPOINT ["bash"]
WORKDIR /reikai-kouza
COPY . .
CMD [ "./docker/production-build.sh" ]
