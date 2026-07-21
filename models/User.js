const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Stored as a bcrypt hash, never plaintext. Excluded from queries by default.
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 80 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Self-reported credit band, used to personalize results. Optional.
    creditBand: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent', 'unknown'],
      default: 'unknown',
    },

    // References to saved products.
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

// Convenience virtual so callers can set `user.password` and have it hashed.
userSchema.virtual('password').set(function setPassword(value) {
  this._plainPassword = value;
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this._plainPassword) return next();
  const rounds = 12;
  this.passwordHash = await bcrypt.hash(this._plainPassword, rounds);
  this._plainPassword = undefined;
  next();
});

userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never leak the hash in JSON responses.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
