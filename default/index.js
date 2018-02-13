var exec = require('child_process').exec;
var Generator = require('yeoman-generator');

module.exports = Generator.extend({
  constructor: function constructor(args, opts) {
    Generator.call(this, args, opts);
    this.procfilePath = this.destinationPath('Procfile');
    this.inquires = [
      {
        type: 'confirm',
        name: 'useRandomName',
        message: 'Do you want Heroku to use a random app name?',
        default: true
      },
      {
        type: 'input',
        name: 'appName',
        when: function when(answers) {
          return !answers.useRandomName;
        },
        message: "What's the application name?"
      },
      {
        type: 'confirm',
        name: 'needsProxy',
        message: 'Does the application require a Proxy?',
        default: false
      },
      {
        type: 'input',
        name: 'proxyUrl',
        when: function when(answers) {
          return !!answers.needsProxy;
        },
        message: "What's the Proxy url?"
      }
    ];
  },

  initializing: function initializing() {
    var self = this;
    var procfileExists = self.fs.exists(self.procfilePath);

    if (procfileExists) {
      self.abort = true;
      self.log.error('Procfile already exists, aborting command.');
      return;
    }

    var done = self.async();
    self
      ._checkHeroku()
      .then(self._login.bind(self))
      .then(done, done);
  },

  prompting: function prompting() {
    if (!this.abort) {
      var self = this;
      var done = self.async();
      self.prompt(self.inquires).then(function(answers) {
        self.data = answers;
        self._saveHerokuAppName();
        done();
      });
    }
  },

  createHerokuApp: function createHerokuApp() {
    if (!this.abort) {
      var cmdArgs = this.data.useRandomName ?
        ['create'] :
        ['create', this.data.appName];

      var done = this.async();
      var login = this.spawnCommand('heroku', cmdArgs);

      login.on('error', done);
      login.on('exit', function onExit(code, signal) {
        if (code === 0) {
          done();
        } else {
          done(new Error('Could not create Heroku app, ', signal));
        }
      });
    }
  },

  writing: function writing() {
    if (!this.abort) {
      this.log('Writing Procfile file to ' + this.destinationPath());

      this.fs.copyTpl(
        this.templatePath('Procfile'),
        this.procfilePath,
        this.data
      );
    }
  },

  end: function end() {
    if (!this.abort) {
      this.log(`
      Make sure to commit the Procfile, e.g:

        > git add -A
        > git commit -m "Add Procfile for heroku deployments"
        > git push origin master

      And then, push your branch to heroku to deploy the application:

        > git push heroku master
      `);
    }
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

  _saveHerokuAppName: function saveHerokuAppName() {
    if (!this.data.useRandomName) {
      this.config.set('herokuAppName', this.data.appName);
      this.config.save();
    }
  }
});
