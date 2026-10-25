/**
 * Evidence Mongoose Model
 * Stores student projects, certifications, and internships.
 */

import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Evidence type is required'],
      enum: {
        values: ['project', 'certification', 'internship'],
        message: 'Evidence type must be project, certification, or internship'
      }
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [150, 'Title must be under 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [3000, 'Description must be under 3000 characters']
    },
    date: {
      type: String,
      required: [true, 'Date is required']
    },
    supportingUrl: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator(v) {
          if (!v) return true;
          return /^https?:\/\//i.test(v);
        },
        message: 'supportingUrl must be a valid HTTP or HTTPS URL'
      }
    },
    legacyId: {
      type: String,
      index: true,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

evidenceSchema.index({ userId: 1, createdAt: -1 });

export const Evidence = mongoose.models.Evidence || mongoose.model('Evidence', evidenceSchema);
export default Evidence;
