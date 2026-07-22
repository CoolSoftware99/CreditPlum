async function loadArticle() {
try {
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

if (!slug) {
document.getElementById('articleContent').innerHTML =
'<div class="error">No article specified.</div>';
return;
}

const response = await fetch('/api/articles/' + slug);
if (!response.ok) throw new Error('Article not found');

const data = await response.json();
const article = data.article;

document.title = (article.metaTitle || article.title) + ' | CreditPlum';

const metaDesc = document.querySelector('meta[name="description"]');
if (metaDesc) {
metaDesc.setAttribute('content', article.metaDescription || article.excerpt);
}

document.getElementById('articleContent').innerHTML =
'<h1>' + article.title + '</h1>' +
'<div class="article-meta">' +
'<span>' + article.readingMinutes + ' minute read</span> • ' +
'<span class="category">' + article.category + '</span>' +
'</div>';

const bodyHTML = article.body
.split('\n\n')
.map(function (para) {
if (para.startsWith('**') && para.endsWith('**')) {
return '<h2>' + para.replace(/\*\*/g, '') + '</h2>';
}
if (para.startsWith('- ')) {
const items = para.split('\n')
.map(function (line) { return '<li>' + line.replace('- ', '') + '</li>'; })
.join('');
return '<ul>' + items + '</ul>';
}
if (/^\d+\./.test(para)) {
const items = para.split('\n')
.map(function (line) { return '<li>' + line.replace(/^\d+\.\s*/, '') + '</li>'; })
.join('');
return '<ol>' + items + '</ol>';
}
const withBold = para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
return '<p>' + withBold + '</p>';
})
.join('');

document.getElementById('articleBody').innerHTML =
'<div class="article-body">' + bodyHTML + '</div>';
} catch (err) {
console.error('Error:', err);
document.getElementById('articleContent').innerHTML =
'<div class="error">Article not found. <a href="/learn.html">Back to articles</a></div>';
}
}

loadArticle();
