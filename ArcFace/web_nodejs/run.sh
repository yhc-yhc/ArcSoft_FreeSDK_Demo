docker rm -f face_test;
docker run -d -p 7777:7777 -v `pwd`:/src -w /src --name face_test node:7.6 /bin/bash -c "npm start";
docker logs -f face_test;