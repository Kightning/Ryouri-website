const express = require('express');
const multer = require('multer');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// ローカルストレージ設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const recipes = [];
const hashtags = [];

// 画像アップロードエンドポイント
app.post('/upload', upload.single('file'), (req, res) => {
    const photoUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ photoUrl });
});

// レシピ作成エンドポイント
app.post('/recipes', (req, res) => {
    const { name, date, photo, note } = req.body;
    const newRecipe = { id: recipes.length + 1, name, date, photo, note };
    recipes.push(newRecipe);
    res.status(201).json(newRecipe);
});

// レシピ取得エンドポイント
app.get('/recipes', (req, res) => {
    res.status(200).json(recipes);
});
// レシピ削除エンドポイント
app.delete('/recipes/:id', (req, res) => {
  const recipeId = parseInt(req.params.id, 10);
  const recipeIndex = recipes.findIndex(recipe => recipe.id === recipeId);
  if (recipeIndex !== -1) {
      recipes.splice(recipeIndex, 1);
      res.status(204).send();
  } else {
      res.status(404).json({ error: 'レシピが見つかりません' });
  }
});

// ハッシュタグ保存エンドポイント
app.post('/hashtags', (req, res) => {
  const { recipeId, hashtag } = req.body;
  const newHashtag = { recipeId: parseInt(recipeId, 10), hashtag };
  hashtags.push(newHashtag);
  res.status(201).json(newHashtag);
});

// ハッシュタグ取得エンドポイント
app.get('/loadHashtags/:recipeId', (req, res) => {
  const recipeId = parseInt(req.params.recipeId, 10);
  const recipeHashtags = hashtags.filter(tag => tag.recipeId === recipeId).map(tag => tag.hashtag);
  res.status(200).json({ hashtags: recipeHashtags });
});
// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
