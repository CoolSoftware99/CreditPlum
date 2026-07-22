async function loadArticles() {
try {
const response = await fetch('/api/articles');
const data = await response.json();
const list = document.getElementById('articlesList');
const noArticles = document.getElementById('noArticles');

if (!data.articles || data.articles.length === 0) {
noArticles.style.display = 'block';
return;
}

list.innerHTML = data.articles
.map(
(article) => `
<div class="article-card" onclick="window.location.href='/article.html?slug=${article.slug}'">
<div class="category">${article.category}</div>
<h3>${article.title}</h3>
<p>${article.excerpt}</p>
<div class="article-footer">
<span class="reading-time">${article.readingMinutes} min read</span>
</div>
</div>
`
)
.join('');
} catch (err) {
console.error('Error loading articles:', err);
document.getElementById('noArticles').style.display = 'block';
}
}

loadArticles();
