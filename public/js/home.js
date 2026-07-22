document.getElementById('checkBtn').addEventListener('click', function () {
const score = parseInt(document.getElementById('scoreInput').value, 10);

if (isNaN(score) || score < 300 || score > 850) {
alert('Please enter a valid score between 300 and 850.');
return;
}

fetch('/api/products?score=' + score)
.then(function (res) { return res.json(); })
.then(function (data) {
const products = data.products || [];
const list = document.getElementById('productsList');
const results = document.getElementById('results');

if (products.length === 0) {
list.innerHTML = '<p style="color:#999;">No products found. Please try again later.</p>';
results.style.display = 'block';
return;
}

list.innerHTML = products.map(function (p) {
const odds = (p.match && p.match.estimatedApprovalOdds != null)
? p.match.estimatedApprovalOdds
: p.approvalLikelihood;

let oddsColor = '#b6604a';
let oddsLabel = 'Long shot';
if (odds >= 60) { oddsColor = '#2e9e6b'; oddsLabel = 'Likely'; }
else if (odds >= 35) { oddsColor = '#d6952b'; oddsLabel = 'Maybe'; }

const feeText = (p.annualFee === 0 || p.annualFee == null)
? 'No annual fee'
: '$' + p.annualFee + ' annual fee';

const category = (p.category || '').replace(/-/g, ' ');

const highlights = (p.highlights || []).slice(0, 3).map(function (h) {
return '<li>' + h + '</li>';
}).join('');

return (
'<div class="product-card">' +
'<div class="issuer">' + (p.issuer || '') + '</div>' +
'<h3>' + p.name + '</h3>' +
'<div class="product-meta">' + category + ' &bull; ' + feeText + '</div>' +
'<span class="odds-badge" style="background:' + oddsColor + ';">' +
oddsLabel + ' &middot; ' + odds + '% est. odds</span>' +
(highlights ? '<ul class="product-highlights">' + highlights + '</ul>' : '') +
'<a class="apply-button" href="' + p.affiliateUrl + '" target="_blank" rel="noopener">See details</a>' +
'</div>'
);
}).join('');

results.style.display = 'block';
results.scrollIntoView({ behavior: 'smooth', block: 'start' });
})
.catch(function (err) {
console.error('Error loading products:', err);
alert('Sorry, something went wrong loading products.');
});
});
