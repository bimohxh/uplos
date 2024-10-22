# configuration file

```json
{
    "actions": [
        {
            "name": "sync data",
            "oss": "aliyun",
            "auth": {
                "accessKeyId":"xxx",
                "accessKeySecret":"xxx",
                "bucket":"xxx",
                "region":"xxx"
            },
            "local": "./", // local folder
            "remote": "./", // remote folder
            "mode": "add", // add or replace
            "ignore": "*.log, *.log.json, *.config, *.config.json, .gitignore, README.md, .git*, node_modules*",
            "whitelist": "",
        }
    ] 
}
```