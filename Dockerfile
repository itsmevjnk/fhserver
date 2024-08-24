FROM node:22-alpine

RUN mkdir -p /home/node/fhserver/node_modules && chown -R node:node /home/node/fhserver

WORKDIR /home/node/fhserver

USER node
COPY --chown=node:node . ./
RUN echo '{"fileStore":"/files"}' > ./config.json
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]