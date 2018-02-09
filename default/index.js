var exec = require('child_process').exec;
var Generator = require('yeoman-generator');

module.exports = Generator.extend({
  initializing: function initializing() {
    var self = this;
    var done = self.async();

    self
      ._checkHeroku()
      .then(function() {
        return self._login();
      })
      .then(function() {
        return self._create();
      })
      .then(done)
      .catch(done);
  },

  prompting: function prompting() {
    var self = this;
    var done = self.async();

    self
      .prompt([
        {
          type: 'confirm',
          name: 'needsProxy',
          message: 'Does the application require a Proxy?'
        },
        {
          type: 'input',
          name: 'proxyUrl',
          when: function when(answers) {
            return !!answers.needsProxy;
          },
          message: "What's the Proxy url?"
        }
      ])
      .then(function(answers) {
        self.data = answers;
        done();
      });
  },

  writing: function writing() {
    this.log('Writing Procfile file to ' + this.destinationPath());

    this.fs.copyTpl(
      this.templatePath('Procfile'),
      this.destinationPath('Procfile'),
      this.data
    );
  },

  end: function end() {
    this.log(`
    Make sure to commit the Procfile, e.g:

      > git add -A
      > git commit -m "Add Procfile for heroku deployments"
      > git push origin master

    And then, push your branch to heroku to deploy the application:

      > git push heroku master
    `);
  },

  _checkHeroku: function checkHeroku() {
    return new Promise(function(resolve, reject) {
      exec('heroku --version', function(err) {
        if (err) {
          reject(
            new Error(
              'The Heroku CLI is not installed. ' +
                'Grab it from https://devcenter.heroku.com/articles/heroku-cli'
            )
          );
        } else {
          resolve();
        }
      });
    });
  },

  _login: function login() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var login = self.spawnCommand('heroku', ['login']);

      login.on('error', reject);
      login.on('exit', function onExit(code) {
        if (code === 0) {
          resolve();
        } else {
          reject();
        }
      });
    });
  },

  _create: function create() {
    var self = this;

    return new Promise(function(resolve, reject) {
      var login = self.spawnCommand('heroku', ['create']);

      login.on('error', reject);
      login.on('exit', function onExit(code) {
        if (code === 0) {
          resolve();
        } else {
          reject();
        }
      });
    });
  }
});
