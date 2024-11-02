document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector("#box");
    const ryouriList = document.querySelector("#list");

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.elements.ryourimei.value;
        const date = form.elements.hiduke.value;
        const file = form.elements.file.files[0];
        const note = form.elements.bikou.value;
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadResponse = await fetch('https://ryouri-app.herokuapp.com/upload', {
                method: 'POST',
                body: formData
            });
            if (!uploadResponse.ok) {
                const errorResult = await uploadResponse.json();
                throw new Error(errorResult.message || '画像のアップロードに失敗しました');
            }
            const uploadResult = await uploadResponse.json();
            const photoUrl = uploadResult.photoUrl;
            const response = await fetch('https://ryouri-app.herokuapp.com/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, date, photo: photoUrl, note })
            });
            if (!response.ok) {
                throw new Error('ネットワークの応答が正しくありません');
            }
            const newRecipe = await response.json();
            addRecipeToDOM(newRecipe.id, name, date, photoUrl, note);
            form.reset();
        } catch (error) {
            console.error('エラーが発生しました:', error);
        }
    });

    try {
        const response = await fetch('https://ryouri-app.herokuapp.com/recipes');
        if (!response.ok) {
            throw new Error('ネットワークの応答が正しくありません');
        }
        const recipes = await response.json();
        for (const recipe of recipes) {
            const hashtags = await loadHashtags(recipe.id);
            addRecipeToDOM(recipe.id, recipe.name, recipe.date, recipe.photo, recipe.note, hashtags);
        }
    } catch (error) {
        console.error('エラーが発生しました:', error);
    }
    updateHashtagDropdown();
});
async function loadHashtags(recipeId) {
    try {
        const response = await fetch(`https://ryouri-app.herokuapp.com/loadHashtags/${recipeId}`);
        if (!response.ok) {
            throw new Error('ネットワークの応答が正しくありません');
        }
        const data = await response.json();
        return data.hashtags;
    } catch (error) {
        console.error('Error fetching hashtags:', error);
        return [];
    }
}

function saveHashtag(recipeId, hashtag) {
    fetch('https://ryouri-app.herokuapp.com/hashtags', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipeId, hashtag })
    }).then(response => response.text())
      .then(data => console.log(data))
      .catch(error => console.error('Error saving hashtag:', error));
}

function addRecipeToDOM(id, name, date, photo, note, hashtags = []) {
    const recipesDiv = document.getElementById('recipes');
    const recipeItem = document.createElement('div');
    const hashtagString = hashtags.join(' ');
    recipeItem.className = 'recipe-item';
    recipeItem.setAttribute('data-tags', hashtagString);
    recipeItem.innerHTML = `
        <div class="recipe-id">${id}</div>
        <div class="recipe-name">${name}</div>
        <div class="recipe-date">${date}</div>
        <div class="recipe-photo"><img src="${photo}" alt="Image" class="clickable"></div>
        <div class="recipe-note">${note.replace(/\n/g, '<br>')}</div>
        <button data-id="${id}" class="delete-btn">削除</button>
    `;
    recipesDiv.appendChild(recipeItem);
    recipeItem.querySelector('.delete-btn').addEventListener('click', async () => {
        try {
            console.log(`Attempting to delete recipe with id: ${id}`);
            const response = await fetch(`https://ryouri-app.herokuapp.com/recipes/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('ネットワークの応答が正しくありません');
            }
            console.log(`Successfully deleted recipe with id: ${id}`);
            recipeItem.remove();
        } catch (error) {
            console.error('削除に失敗しました:', error);
        }
    });
    recipeItem.querySelector('.clickable').addEventListener('click', async (e) => {
        e.stopPropagation();
        const fullScreenOverlay = document.createElement('div');
        fullScreenOverlay.className = 'full-screen-overlay';
        let hashtags = await loadHashtags(id);
        fullScreenOverlay.innerHTML = `
            <div class="full-screen-content">
                <button id="backBtn">戻る</button>
                <img src="${photo}" alt="Image" class="full-screen-image">
                <div class="full-screen-info">
                    <h2>${name}</h2>
                    <p>${date}</p>
                    <p>${note.replace(/\n/g, '<br>')}</p>
                    <div id="hashtagList">${hashtags.join(' ')}</div>
                    <input type="text" id="hashtagInput" placeholder="ハッシュタグを追加">
                    <button id="addHashtagBtn">ハッシュタグ追加</button>
                </div>
            </div>
        `;
        document.body.appendChild(fullScreenOverlay);
        const hashtagList = document.getElementById('hashtagList');
        document.getElementById('addHashtagBtn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const hashtagInput = document.getElementById('hashtagInput');
            const newHashtag = hashtagInput.value.startsWith('#') ? hashtagInput.value : `#${hashtagInput.value}`;
            await saveHashtag(id, newHashtag);
            hashtags = await loadHashtags(id);
            hashtagList.innerHTML = hashtags.join(' ');
            hashtagInput.value = '';
            updateHashtagDropdown();
        });
        document.getElementById('backBtn').addEventListener('click', () => {
            document.body.removeChild(fullScreenOverlay);
        });
    });
}
async function updateHashtagDropdown() {
    const dropdown = document.getElementById('hashtagDropdown');
    dropdown.innerHTML = '<option value="">Select a hashtag</option>'; // 初期化

    let allTags = [];
    const recipes = await fetch('https://ryouri-app.herokuapp.com/recipes').then(res => res.json());

    for (const recipe of recipes) {
        const tags = await loadHashtags(recipe.id);
        allTags = allTags.concat(tags);
    }

    // 重複を排除
    allTags = [...new Set(allTags)];

    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        dropdown.appendChild(option);
    });
}

function filterByHashTags() {
    const filterHashtag = document.getElementById('hashtagDropdown').value;
    const recipeItems = document.querySelectorAll('.recipe-item');

    recipeItems.forEach(item => {
        const recipeTags = item.getAttribute('data-tags').split(' ');
        if (filterHashtag && !recipeTags.includes(filterHashtag)) {
            item.style.display = 'none';
        } else {
            item.style.display = 'block';
        }
    });
}

document.getElementById('resetBtn').addEventListener('click', () => {
    // フィルタ入力をクリア
    document.getElementById('filterName').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('hashtagDropdown').value = '';

    // すべてのレシピを表示
    const recipeItems = document.querySelectorAll('.recipe-item');
    recipeItems.forEach(item => {
        item.style.display = 'block';
    });
});

window.addEventListener('load', function (e) {
    updateHashtagDropdown();
    filterByHashTags();
});
