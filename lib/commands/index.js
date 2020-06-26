/**
 * Load redis lua scripts.
 * The name of the script must have the following format:
 *
 * cmdName-numKeys.lua
 *
 * cmdName must be in camel case format.
 *
 * For example:
 * moveToFinish-3.lua
 *
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const utils = require('../utils');

//TODO node >= 10 could be used require('fs').promises()
const _fs = {
  readdirAsync: promisify(fs.readdir),
  readFileAsync: promisify(fs.readFile)
};

module.exports = function(client) {
  return utils.isRedisReady(client).then(() => {
    return _fs.readdirAsync(__dirname).then(files => {
      const luaFiles = files.filter(file => path.extname(file) === '.lua');
      if (luaFiles.length === 0) {
        /**
         * To prevent unclarified runtime error "updateDelayset is not a function
         * @see https://github.com/OptimalBits/bull/issues/920
         */
        throw new Error('No .lua files found!');
      }
      return Promise.all(
        luaFiles.map(file => {
          return _fs.readFileAsync(path.join(__dirname, file)).then(lua => {
            const [name, numberOfKeys] = path.basename(file, '.lua').split('-');
            client.defineCommand(name, {
              numberOfKeys: parseInt(numberOfKeys),
              lua: lua.toString()
            });
          });
        })
      );
    });
  });
};
