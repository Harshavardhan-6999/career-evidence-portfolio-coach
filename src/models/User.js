/**
 * User & Account Mongoose Model
 * Handles student authentication, role target, biography, and credentials.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be under 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded by default in queries for security
    },
    education: {
      type: String,
      required: [true, 'Education information is required'],
      trim: true,
      maxlength: [150, 'Education must be under 150 characters']
    },
    interests: {
      type: [String],
      default: []
    },
    targetRoleId: {
      type: String,
      required: [true, 'Target role is required'],
      trim: true,
      index: true
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Bio cannot exceed 1000 characters']
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student'
    },
    legacyId: {
      type: String,
      index: true,
      sparse: true // Allows multiple null values for native MongoDB accounts
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

/**
 * Compare candidate plaintext password against stored bcrypt hash.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    // If passwordHash was not selected in query, retrieve it explicitly
    const userWithPassword = await this.constructor.findById(this._id).select('+passwordHash');
    return bcrypt.compare(candidatePassword, userWithPassword.passwordHash);
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
