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
  async getRemoteFiles(prefix, prevFile) {
    const listResult = await this.client.listV2({
        'start-after': prevFile,
        'fetch-owner': false,
        'max-keys': 1000,
        prefix
    });

    // 如果没有 objects 或者 objects 为空，返回空数组
    if (!listResult.objects || !listResult.objects.length) {
        return [];
    }
    
    const result = listResult.objects.map(item => {
        return {
            name: item.name,
            etag: item.etag
        }
    });

    // 如果还有更多文件，继续递归获取
    if (listResult.isTruncated) {
        result.push(...await this.getRemoteFiles(prefix, result[result.length - 1].name)); 
    }
    
    return result;
  }


  async delFile(file) {
    await this.client.delete(file);
  }
}

