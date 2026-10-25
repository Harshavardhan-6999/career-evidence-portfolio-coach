/**
 * Skill Catalog Mongoose Model
 */

import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
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

export const Skill = mongoose.models.Skill || mongoose.model('Skill', skillSchema);
export default Skill;
