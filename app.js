const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./recipes.db');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY, name TEXT, date TEXT, photo TEXT, note TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS hashtags (id INTEGER PRIMARY KEY, recipe_id INTEGER, hashtag TEXT)");
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'ファイルを選択してください' });
  }
  res.send({ photoUrl: `/uploads/${req.file.originalname}` });
});


app.post('/recipes', (req, res) => {
  const { name, date, photo, note } = req.body;
  db.run("INSERT INTO recipes (name, date, photo, note) VALUES (?, ?, ?, ?)", [name, date, photo, note], function(err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.send({ id: this.lastID });
  });
});

app.post('/hashtags', (req, res) => {
  const { recipeId, hashtag } = req.body;
  db.run("INSERT INTO hashtags (recipe_id, hashtag) VALUES (?, ?)", [recipeId, hashtag], function(err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.send({ id: this.lastID });
  });
});

app.get('/loadHashtags/:id', (req, res) => {
  const recipeId = req.params.id;
  db.all("SELECT hashtag FROM hashtags WHERE recipe_id = ?", [recipeId], (err, rows) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    const hashtags = rows.map(row => row.hashtag);
    res.json({ hashtags });
  });
});

app.delete('/recipes/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM recipes WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    db.run("DELETE FROM hashtags WHERE recipe_id = ?", [id], function(err) {
      if (err) {
        return res.status(500).send(err.message);
      }
      res.send({ message: 'レシピとハッシュタグが削除されました' });
    });
  });
});
app.get('/recipes', (req, res) => {
  const { name, date } = req.query;
  let query = "SELECT * FROM recipes WHERE 1=1";
  let params = [];
  if (name) {
    query += " AND name LIKE ?";
    params.push(`%${name}%`);
  }
  if (date) {
    query += " AND date = ?";
    params.push(date);
  }
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.send(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
