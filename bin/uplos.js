#! /usr/bin/env node
const { program } = require('commander');
const Helper = require('../lib/helper');
const colors = require('colors');
const oss = require('../lib/oss');

program
  .version(require('../package.json').version)
  .usage('[命令] [参数]')

program
  .command('init')
  .description('init configuration file')
  .action(() => {
        Helper.initConfig();
  })

program
  .command('deploy')
  .description('deploy local files to oss')
  .option('-f, --force', 'no confirm, just execute', false)
  .option('-c, --config <file>', 'config file address', 'uplos.config.json')
  .action((options) => {
        const localConfig = Helper.readConfig(options.config);
        if (!localConfig) {
            console.log('you have no configuration file, you can use `uplos init` to init one.'.red);
            return;
        }
        oss.deploy(localConfig);
  })


program.parse(process.argv);