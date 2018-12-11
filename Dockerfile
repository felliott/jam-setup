FROM node:carbon

COPY . /code
WORKDIR code

RUN yarn

CMD ["node", "/code/entrypoint.js"]
