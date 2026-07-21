const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    // Short summary used in listings and as the SEO meta description.
    excerpt: { type: String, required: true, maxlength: 300 },
    // Body stored as Markdown; rendered to HTML on the client or at build time.
    body: { type: String, required: true },

    category: {
      type: String,
      enum: ['basics', 'rebuilding', 'products', 'guides'],
      default: 'basics',
      index: true,
    },
    tags: { type: [String], default: [] },
    readingMinutes: { type: Number, default: 4 },

    // SEO
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true, maxlength: 320 },

    published: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Article', articleSchema);
