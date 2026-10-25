/**
 * Educational Role Catalog Mongoose Model
 */

import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    expectedSkillIds: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
export default Role;
