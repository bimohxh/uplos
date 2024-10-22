const fs = require('fs')
const path = require('path')
const colors = require('colors');

let Helper = {

  // 读取配置文件
  readConfig: (filePath) => {
    filePath = filePath || './uplos.config.json';
    let configPath = path.resolve(process.cwd(), filePath)
    let LocalEnv = {}
    try {
      LocalEnv = require(configPath)
    } catch (ex) {
      return null;
    }

    return LocalEnv
  },

  initConfig() {
    let filePath = path.resolve(process.cwd(), './uplos.config.json');
    try {
        require(filePath);
        console.log('your config file has exist!'.yellow);
    } catch (ex) {
        const data = {
            "actions": [
                {
                    "name": "upload site",
                    "oss": "aliyun",
                    "auth": {
                        "accessKeyId": ".....",
                        "accessKeySecret":".....",
                        "bucket":".....",
                        "region":"....."
                    },
                    "local": "./", // local folder
                    "remote": "./", // remote folder
                    "mode": "add", // add or replace
                    "ignore": "*.log, *.log.json, *.config, *.config.json, .gitignore, README.md, .git*, node_modules*",
                    "whitelist": "",
                }
            ] 
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log('write config file success!'.green);
    }
  },

  // 读取hash log
  readHashLog: () => {
    let hashFile = path.resolve(process.cwd(), './webon.log.json')
    try {
      return require(hashFile)
    } catch (ex) {
      return undefined
    }
  },

  // 解析命令参数
  cmdArg: (rawArgs) => {
    let result = {}
    let index = 0

    rawArgs.forEach(item => {
      if (item[0] === '-') {
        let next = (rawArgs[index + 1] && rawArgs[index + 1][0] !== '-') ? rawArgs[index + 1] : undefined
        result[item.substring(1)] = next
      }
      index++
    })

    return result
  },

  // 浏览文件夹下的所有文件
  walk: (dir, isIgnore) => {
    let results = []
    let list = fs.readdirSync(dir);
    for (const file of list) {
        if (isIgnore(file)) {
            continue;
        }
      let _file = path.resolve(dir, file);
      var stat = fs.statSync(_file)
      if (stat && stat.isDirectory()) {
          results = results.concat(Helper.walk(_file, isIgnore))
      } else {
        results.push(path.relative(process.cwd(), _file));
      }
    }

    return results;
  },

  getFilesByLevel: (dir, files, level) => {
    if (!level) return files
    if (!/\/$/.test(dir)) dir += '/'
    return files.filter((item) => {
      return item.split(dir)[1].split('/').length === level
    })
  },

  // 格式化要上传的文件名
  uploadFileName: (file, removePrefix) => {
    let approot = path.resolve(path.dirname(__dirname), process.cwd());
    let fname = file.split(approot)[1].slice(1)
    if (removePrefix) {
      let arr = fname.split(new RegExp(`^${removePrefix}`))
      fname = arr[arr.length - 1]
    }
    return fname
  },

  // 计算文件MD5值
  fileMD5: (file) => {
    var crypto = require('crypto')
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').toUpperCase();
  }
}

module.exports = Helper
