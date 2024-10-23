const Helper = require('./helper');
const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const readline = require('readline');
const cliProgress = require('cli-progress');
const aliyun = require('./aliyun');

const oss = {
    async deploy(config) {
        for (const action of config.actions) {
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
        aliyun.init(action.auth);
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
        noNeedUploads.length && console.log(noNeedUploads.join('   ').gray);
        console.log(`and ${action.dels.length} remote files to delete`.replace(`${action.dels.length}`, `${action.dels.length}`.red))
        action.dels.length &&  console.log(action.dels.join('   ').gray);
    },

    // 获取要上传的文件
    getFiles(action) {
        let root = path.resolve(process.cwd(), action.local);
        const ig = ignore().add(action.ignore);
        const isIgnore = filePath => ig.ignores(filePath);
        return Helper.walk(root, isIgnore);
    },

    async uploadFiles(config) {
        for (const action of config.actions) {
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
            await oss.uploadFile(action.needUploads[i]);
            bar.update(i + 1);
        }
        bar.stop();
    },

    async uploadFile(file) {
        await aliyun.upload(path.resolve(process.cwd(), file.local), file.remote);
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
            await aliyun.delFile(action.dels[i]);
            bar.update(i + 1);
        }
        bar.stop();
    }
}

module.exports = oss;