const express = require("express");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Mdict = require("js-mdict");
const JSEncrypt = require("jsencrypt");

const { readFileSync, writeFileSync } = require("fs");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 8000;

const dict_folder = process.env.DICTFOLDER || "./dict";
app.get("/", (req, res) => {
  res.send([{ usage: "lookup nce", example: "GET /api/nce/lookup?word=hello" }]);
});

app.listen(port, () => {
  console.log(`nce-dict-server listening on port ${port}`);
});

const jwtRouter = express.Router();
jwtRouter.use((req, res, next) => {
  const token = req.headers[process.env.TOKEN_HEADER_KEY];
  console.log(process.env.TOKEN_HEADER_KEY, token);
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("user", user);
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json(error);
  }
});
app.use("/api/auth/valid", jwtRouter);
app.use("/api/dict/", jwtRouter);

const private_key_file = process.env.KEY_FILE || "./.ssh/id_rsa.pem";
const public_key_file = process.env.KEY_FILE + ".pub" || "./.ssh/id_rsa.pem.pub";
const publicKey = readFileSync(public_key_file, "utf8");
const privateKey = readFileSync(private_key_file, "utf8");

//获取RSA公钥，RSA公钥需要更稳妥的方式传递，如此直接获取可能被中间人替换
app.get("/api/auth/key", (req, res) => {
  res.send(publicKey);
});
//验证token是否有效，web刷新页面或者重新打开时候验证

app.get("/api/auth/valid", (req, res) => {
  res.json({ message: "ok" });
});
//因临时测试环境操作系统古老，无法使用内置的sqlite，直接使用文件演示
const userFilePath = "./data/users.json";
const userstring = readFileSync(userFilePath, "utf8");
let users = JSON.parse(userstring);
console.log("users", users);
// Register Route
app.post("/api/auth/register", async (req, res) => {
  const crypt = new JSEncrypt();
  crypt.setPrivateKey(privateKey);
  const { username, email, encryptpwd } = req.body;
  const password = crypt.decrypt(encryptpwd);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hashedPassword,
    role: "user",
  };
  users.push(user);
  try {
    writeFileSync(userFilePath, JSON.stringify(users, null, 2), "utf8");
  } catch (error) {
    console.error("Data save to disk error", error);
    res.status(500).send("Unknown error");
  }
  res.send({ message: "User created" });
});

// Login Route
app.post("/api/auth/login", async (req, res) => {
  const { username, encryptpwd } = req.body;
  console.log("username  ", username);
  console.log("users  ", users);
  const user = users.find((user) => user.username == username);
  console.log("user  ", user);
  if (!user) {
    res.status(400).send("Invalid username!");
    return;
  }
  const crypt = new JSEncrypt();

  crypt.setPrivateKey(privateKey);
  const password = crypt.decrypt(encryptpwd);
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(400).send("Invalid credentials!");
    return;
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: "2MINS" });
  res.json({ message: "Login successfully!", token, username: user.username, role: user.role });
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
