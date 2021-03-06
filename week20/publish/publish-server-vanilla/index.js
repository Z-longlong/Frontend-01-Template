  const http = require('http');
  const https = require('https');
  const fs = require('fs')
  const path = require('path')
  const unzipper = require('unzipper');

  const server = http.createServer((req, res) => {
      // OAuth 鉴权
      if (req.url.match(/^\/auth/)) {
          return auth(req, res);
      }

      if (!req.url.match(/^\/?/)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end("not found")
          return;
      }

      const options = {
          hostname: 'api.github.com',
          port: 443,
          path: `/user`,
          method: 'GET',
          headers: {
              Authorization: 'token ' + req.headers.token,
              'User-Agent': 'zyl-publish',
          }
      };
      const request = https.request(options, (response) => {
          let body = ""
          response.on("data", (d) => {
              body += d.toString();
          });
          response.on("end", () => {
              // 拿到用户信息
              let user = JSON.parse(body);
              console.log(user);
              // TODO 权限检查
              let writeStream = unzipper.Extract({ path: path.resolve(__dirname, '../server/public') })

              req.pipe(writeStream)
              //   pipe 可以代替data事件
              //   req.on("data", trunk => {
              //       writeStream.write(trunk)
              //   })
              //   req.on("end", trunk => {
              //       writeStream.end(trunk)
              //   })
              req.on("end", () => {
                  res.writeHead(200, { 'Content-Type': 'text/plain' })
                  res.end('okay')
              })
          })
      });
      request.on('error', (e) => {
          console.error(e);
      });
      request.end();
  })

  function auth(req, res) {
      let code = req.url.match(/code=([^&]+)/)[1];

      let state = 'abc123';
      let client_secret = '4530bc6e84d668064241397e2a0c66a0e62baf57';
      let client_id = 'Iv1.1e339efb99ad07ca';
      let redirect_uri = encodeURIComponent('http://localhost:8081/auth');

      let params = `code=${code}&state=${state}&client_secret=${client_secret}&client_id=${client_id}&redirect_uri=${redirect_uri}`;

      const options = {
          hostname: 'github.com',
          port: 443,
          path: `/login/oauth/access_token?${params}`,
          method: 'POST',
      };

      const request = https.request(options, (response) => {

          response.on('data', (d) => {
              let result = d.toString().match(/access_token=([^&]+)/);
              if (result) {
                  let token = result[1];
                  res.writeHead(200, {
                      access_token: token,
                      'Content-Type': 'text/html',
                  });
                  res.end(`<a href="http://localhost:8080/publish?token=${token}">publish</a>`)
              } else {
                  res.writeHead(200, {
                      'Content-Type': 'text/plain',
                  });
                  res.end("error");
              }
          });
      });

      request.on('error', (e) => {
          console.error(e);
      });
      request.end();
  }


  server.listen(8081)