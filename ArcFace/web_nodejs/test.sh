rm -rf faces/*;
docker rm -f face_ai;
docker run -d -v `pwd`:/src -w /src --name face_ai node:7.6 /bin/bash -c "node $*";
docker logs -f face_ai;