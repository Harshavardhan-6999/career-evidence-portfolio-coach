/**
 * JobDescriptionAnalysis Mongoose Model
 * Stores extracted role title, required/preferred skills, and skill gap evaluations.
 */

import mongoose from 'mongoose';

const jobDescriptionAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    rawText: {
      type: String,
      required: true,
      maxlength: [20000, 'Job description cannot exceed 20,000 characters']
    },
    extractedRoleTitle: {
      type: String,
      default: 'Target Role'
    },
    requiredSkills: [
      {
        rawName: String,
        normalizedSkillId: String,
        matchedCatalogName: String
      }
    ],
    preferredSkills: [
      {
        rawName: String,
        normalizedSkillId: String,
        matchedCatalogName: String
      }
    ],
    otherRequirements: [String],
    skillGapAnalysis: {
      supportedByEvidence: [
        {
          skillId: String,
          skillName: String,
          evidenceCount: Number,
          evidenceTitles: [String]
        }
      ],
      claimedWithoutEvidence: [
        {
          skillId: String,
          skillName: String
        }
      ],
      notDemonstrated: [
        {
          skillId: String,
          skillName: String
        }
      ],
      needsReview: [
        {
          skillId: String,
          skillName: String,
          rawName: String,
          status: { type: String, default: 'pending_user_confirmation' },
          reason: String,
          suggestedCatalogSkillId: String,
          suggestedCatalogSkillName: String,
          candidateEvidence: [
            {
              evidenceId: String,
              title: String,
              matchedSnippet: String
            }
          ]
        }
      ]
    },
    summary: {
      totalRequiredSkills: Number,
      totalPreferredSkills: Number,
      coveredCount: Number,
      reviewCount: { type: Number, default: 0 },
      gapCount: Number
    },
    disclaimer: {
      type: String,
      default:
        'Missing evidence does not prove lack of ability. This analysis only reflects skills mapped to recorded evidence and does not predict hiring success or job readiness.'
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

jobDescriptionAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const JobDescriptionAnalysis =
  mongoose.models.JobDescriptionAnalysis ||
  mongoose.model('JobDescriptionAnalysis', jobDescriptionAnalysisSchema);
export default JobDescriptionAnalysis;
