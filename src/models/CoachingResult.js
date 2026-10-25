/**
 * CoachingResult & Career Roadmap Mongoose Model
 * Stores strengths, evidence gaps, prioritized tasks, and interactive roadmap progress.
 */

import mongoose from 'mongoose';

const coachingResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    portfolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['ai', 'rules'],
      required: true
    },
    aiStatus: {
      type: String,
      default: 'success'
    },
    strengths: [
      {
        statement: { type: String, required: true },
        supportingEvidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }]
      }
    ],
    evidenceGaps: [
      {
        statement: { type: String, required: true },
        supportingEvidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }]
      }
    ],
    nextSteps: [
      {
        action: { type: String, required: true },
        reason: { type: String, required: true },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        supportingEvidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }]
      }
    ],
    roadmap: [
      {
        id: { type: String, required: true },
        task: { type: String, required: true },
        reason: { type: String, required: true },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' },
        supportingEvidenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' }]
      }
    ],
    inputSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        ret.portfolioId = ret.portfolioId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

coachingResultSchema.index({ userId: 1, createdAt: -1 });

export const CoachingResult =
  mongoose.models.CoachingResult || mongoose.model('CoachingResult', coachingResultSchema);
export default CoachingResult;
