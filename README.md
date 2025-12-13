# nce-dict-server
本项目作为[nce-dict](https://github.com/wl98336/nce-dict "新概念英语词典") 的简单服务器端实现 

本文件只展示用法，具体实现解释参见changelog.md

## 启动服务器
`npm start`

## 查询新概念英语
- car: `GET /api/nce/lookup?word=car`
- 汽车: `GET /api/nce/lookup?word=汽车`