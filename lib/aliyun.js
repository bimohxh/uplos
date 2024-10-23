var OSS = require('ali-oss')
var Helper = require('./helper')
module.exports  = class Aliyun {
  // 
  constructor(auth) {
    this.client = new OSS({
      region: auth.region,
      accessKeyId: auth.accessKeyId,
      accessKeySecret: auth.accessKeySecret,
      bucket: auth.bucket
    })
  }

  // 上传
  upload(localFile, remoteFile) {
    return new Promise(resolve => {
      this.client.put(remoteFile, localFile, {
        headers: {
            ETag: Helper.fileMD5(localFile)
        }
      }).then((data) => {
        resolve()
      })
    })
  }

  // 获取远端文件
  async getRemoteFiles(prevFile) {
    const result = (await this.client.listV2({
        'start-after': prevFile,
        'fetch-owner': false,
        'max-keys': 1000
    })).objects.map(item => {
        // console.log(item)
        return {
            name: item.name,
            etag: item.etag
        }
    });
    if (!result.length) return [];
    result.push(...await this.getRemoteFiles(result[result.length - 1].name)); 
    return result;
  }


  async delFile(file) {
    await this.client.delete(file);
  }
}

