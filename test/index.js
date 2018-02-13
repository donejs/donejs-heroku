var fs = require('fs');
var path = require('path');
var helpers = require('yeoman-test');
var assert = require('yeoman-assert');

describe('donejs-heroku', function() {
  describe('with an existing Procfile', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir(function(dir) {
          fs.copyFileSync(
            path.join(__dirname, 'procfile_fixture'),
            path.join(dir, 'Procfile')
          );
        })
        .on('end', done);
    });

    it('does not override Procfile', function() {
      assert.file('Procfile');
      assert.fileContent('Procfile', /bundle exec rails/);
    });
  });

  describe('without heroku CLI installed', function() {
    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .on('ready', function(generator) {
          // simulates heroku CLI missing from system
          generator._checkHeroku = function() {
            return Promise.reject(new Error('no Heroku CLI found'));
          };
          // mocks spawnCommand
          generator.spawnCommand = function() {
            throw new Error('should not be called');
          };
        })
        .on('error', function(err) {
          assert.equal(err.message, 'no Heroku CLI found');
          done();
        });
    });

    it('should not write Procfile', function() {
      assert.noFile(['Procfile']);
    });
  });

  describe('with heroku installed, logged in and proxy NOT required', function() {
    var cmds = [];

    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .withPrompts({
          needsProxy: false
        })
        .on('ready', function(generator) {
          // simulates heroku CLI available on system
          generator._checkHeroku = function() {
            return Promise.resolve();
          };
          // mocks spawnCommand, calls 'exit' event handler async
          generator.spawnCommand = function(cmd, args) {
            cmds.push({ cmd: cmd, args: args });
            return {
              on: function(evt, handler) {
                if (evt === 'exit') {
                  setTimeout(function() {
                    handler(0);
                  });
                }
              }
            };
          };
        })
        .on('end', done);
    });

    it('should call heroku login and create', function() {
      assert.deepEqual(cmds, [
        { cmd: 'heroku', args: ['login'] },
        { cmd: 'heroku', args: ['create'] }
      ]);
    });

    it('should write Procfile', function() {
      assert.file(['Procfile']);
      assert.noFileContent(
        'Procfile',
        /--proxy http:\/\/www.place-my-order.com\/api/
      );
      assert.fileContent('Procfile', 'web:');
    });
  });

  describe('with heroku installed, logged in and proxy required', function() {
    var cmds = [];

    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .withPrompts({
          needsProxy: true,
          proxyUrl: 'http://www.place-my-order.com/api'
        })
        .on('ready', function(generator) {
          // simulates heroku CLI available on system
          generator._checkHeroku = function() {
            return Promise.resolve();
          };
          // mocks spawnCommand, calls 'exit' event handler async
          generator.spawnCommand = function(cmd, args) {
            cmds.push({ cmd: cmd, args: args });
            return {
              on: function(evt, handler) {
                if (evt === 'exit') {
                  setTimeout(function() {
                    handler(0);
                  });
                }
              }
            };
          };
        })
        .on('end', done);
    });

    it('should call heroku login and create', function() {
      assert.deepEqual(cmds, [
        { cmd: 'heroku', args: ['login'] },
        { cmd: 'heroku', args: ['create'] }
      ]);
    });

    it('should write Procfile', function() {
      assert.file(['Procfile']);
      assert.fileContent(
        'Procfile',
        /--proxy http:\/\/www.place-my-order.com\/api/
      );
    });
  });

  describe('with a custom heroku app name', function() {
    var cmds = [];

    before(function(done) {
      helpers
        .run(path.join(__dirname, '../default'))
        .inTmpDir()
        .withPrompts({
          useRandomName: false,
          appName: 'empathentric-mistery',
          needsProxy: false
        })
        .on('ready', function(generator) {
          // simulates heroku CLI available on system
          generator._checkHeroku = function() {
            return Promise.resolve();
          };
          // mocks spawnCommand, calls 'exit' event handler async
          generator.spawnCommand = function(cmd, args) {
            cmds.push({ cmd: cmd, args: args });
            return {
              on: function(evt, handler) {
                if (evt === 'exit') {
                  setTimeout(function() {
                    handler(0);
                  });
                }
              }
            };
          };
        })
        .on('end', done);
    });

    it('should save the app name', function() {
      assert.fileContent('.yo-rc.json', /empathentric-mistery/);
    });
  });
});
