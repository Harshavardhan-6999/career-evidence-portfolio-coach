/**
 * SkillMapping Mongoose Model
 * Links catalog skills to student evidence records.
 * Enforces uniqueness on (userId, skillId, evidenceId) to prevent duplicates.
 */

import mongoose from 'mongoose';

const skillMappingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    skillId: {
      type: String,
      required: true,
      index: true
    },
    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      required: true,
      index: true
    },
    legacyId: {
      type: String,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        ret.evidenceId = ret.evidenceId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound unique index prevents any duplicate mapping for the same user, skill, and evidence item
skillMappingSchema.index({ userId: 1, skillId: 1, evidenceId: 1 }, { unique: true });

export const SkillMapping =
  mongoose.models.SkillMapping || mongoose.model('SkillMapping', skillMappingSchema);
export default SkillMapping;
