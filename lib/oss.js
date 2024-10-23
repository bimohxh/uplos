const Helper = require('./helper');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const cliProgress = require('cli-progress');
const Aliyun = require('./aliyun');

const oss = {
    async deploy(config) {
        const actions = config.actions.filter(item => !item.disabled)
        for (const action of actions) {
            await oss.checkFiles(action);
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question('files is correct, start to deploy?(y / n): '.yellow, (answer) => {
            rl.close()
            if (answer.toLocaleLowerCase() === 'y') {
                oss.uploadFiles(config);
            }
        })
    },

    async checkFiles(action) {
        const aliyun = new Aliyun(action.auth);
        action.aliyun = aliyun;

        console.log('fetching remote files....'.grey);
        const remoteFiles = await aliyun.getRemoteFiles();

        const localFiles = oss.getFiles(action);
        const needUploads = []; // 需要上传的
        const noNeedUploads = []; // 无需上传的

        // 需要上传的
        while(localFiles[0]) {
            const item = localFiles.pop();
            const rname = oss.getRemoteFileName(item, action.remove_prefix, action.remote); // 这里需要处理prefix保证线上和本地说的是一回事
            const rfile = remoteFiles.find(rf => rf.name === rname);
            if (rfile) {
                remoteFiles.splice(remoteFiles.indexOf(rfile), 1);
                if (`"${Helper.fileMD5(item)}"` !== rfile.etag) {
                    needUploads.push({
                        local: item,
                        remote: rname
                    });
                } else {
                    noNeedUploads.push(item);
                }
            } else {
                needUploads.push({
                    local: item,
                    remote: rname
                });
            }
        }

        // 需要删除远端的
        action.dels = remoteFiles.map(item => item.name);
        action.needUploads = needUploads;
        action.noNeedUploads = noNeedUploads;

        console.log(`> check [ ${action.name} ] -------------`.green);
        console.log(`has ${needUploads.length} files to upload`.replace(`${needUploads.length}`, `${needUploads.length}`.yellow));
        needUploads.length && needUploads.forEach(item => {
            console.log(`${item.local} => ${item.remote}`.grey);
        })

        console.log(`and ${noNeedUploads.length} files not change`.replace(`${noNeedUploads.length}`, `${noNeedUploads.length}`.blue));
        noNeedUploads.length && console.log(`${noNeedUploads.slice(0, 5).join('   ')}${noNeedUploads.length > 5 ? '  ....' : ''}`.gray); // 最多展示10个文件
        console.log(`and ${action.dels.length} remote files to delete`.replace(`${action.dels.length}`, `${action.dels.length}`.red))
        action.dels.length &&  console.log(action.dels.join('   ').gray);
    },

    // 获取要上传的文件
    getFiles(action) {
        let root = path.resolve(process.cwd(), action.local);
        let blackList, whiteList;
        const ignore1 = require('ignore');
        if (action.ignore && action.ignore[0]) {
            blackList = ignore1().add(action.ignore);
        }
        const ignore2 = require('ignore');
        if (action.whitelist && action.whitelist[0]) {
            whiteList = ignore2().add(action.whitelist);
        }
        const isIgnore = filePath => {
            let result = false;
            if (whiteList) {
                result = !whiteList.ignores(filePath);
            }
            if (!result && blackList) {
                result = blackList.ignores(filePath)
            }
            return result;
        };
        return Helper.walk(root, isIgnore, !!whiteList);
    },

    async uploadFiles(config) {
        const actions = config.actions.filter(item => !item.disabled)
        for (const action of actions) {
            await oss.dealAction(action);
        }
        
        console.log(`√ all actions uploaded success!`.green);
    },

    async dealAction(action) {
        console.log(`start [ ${action.name} ] -------------`.replace(`[ ${action.name} ]`, `[ ${action.name} ]`.green));
        await oss.uploadAction(action);
        await oss.delAction(action);
    },

    async uploadAction(action) {
        if (!action.needUploads[0]) {
            return;
        }
        console.log('upload files...')
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar.start(action.needUploads.length, 0);
        for (let i = 0; i < action.needUploads.length; i++) {
            await oss.uploadFile(action, action.needUploads[i]);
            bar.update(i + 1);
        }
        bar.stop();
    },

    async uploadFile(action, file) {
        await action.aliyun.upload(path.resolve(process.cwd(), file.local), file.remote);
    },

    getRemoteFileName(file, remove_prefix, remote_folder) {
        let remoteFileName = file;
        if (remove_prefix) {
            remoteFileName = path.relative(remove_prefix, file);
        }
        if (remote_folder) {
            remoteFileName = path.join(remote_folder, remoteFileName);
        }
        return remoteFileName.replace(/\\/g, '/');
    },

    
    async delAction(action) {
        if (!action.dels?.[0]) {
            return;
        }
        console.log('delete remote files...')
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);
        bar.start(action.dels.length, 0);
        for (let i = 0; i < action.dels.length; i++) {
            await action.aliyun.delFile(action.dels[i]);
            bar.update(i + 1);
        }
        bar.stop();
    }
}

module.exports = oss;