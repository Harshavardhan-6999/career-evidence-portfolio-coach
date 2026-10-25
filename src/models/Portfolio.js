/**
 * Portfolio Mongoose Model
 * Represents a student's curated portfolio with ordered evidence items.
 */

import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One portfolio per student
      index: true
    },
    title: {
      type: String,
      required: [true, 'Portfolio title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title must be under 150 characters']
    },
    selectedEvidenceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evidence'
      }
    ],
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
        ret.selectedEvidenceIds = ret.selectedEvidenceIds.map((id) => id.toString());
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Portfolio = mongoose.models.Portfolio || mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;
