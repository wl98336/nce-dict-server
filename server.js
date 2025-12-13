const express = require("express");
const dotenv = require("dotenv");
const Mdict = require("js-mdict");

dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

const dict_folder = process.env.DICTFOLDER || "./dict";
app.get("/", (req, res) => {
  res.send([{ usage: "lookup nce", example: "GET /api/nce/lookup?word=hello" }]);
});

app.listen(port, () => {
  console.log(`nce-dict-server listening on port ${port}`);
});

// 加载词典文件
const nce = new Mdict.MDX(`${dict_folder}/nce.mdx`);
// 处理查询请求
app.get("/api/nce/lookup", (req, res) => {
  let word = req.query.word;
  if (word) {
    let data = nce.lookup(word);
    if (data) {
      res.send(data);
    } else {
      res.status(400).send("error: word not found");
    }
  } else {
    res.status(400).send("error: No word input");
  }
});
