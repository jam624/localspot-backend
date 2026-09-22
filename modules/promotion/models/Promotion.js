const mongoose = require('mongoose');

/**
 * Promotion lifecycle (per PRD §16.6 / §10.5):
 * draft -> pending -> approved -> disabled (by admin)
 *                            \-> rejected (by admin)
 * approved -> expired (derived from endDate, or swept by admin cleanup job)
 */
const PROMOTION_STATUSES = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'disabled',
  'expired',
];

const promotionSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    image: {
      type: String, // URL/path to uploaded promotion image
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: 'endDate must be after startDate',
      },
    },
    status: {
      type: String,
      enum: PROMOTION_STATUSES,
      default: 'draft',
      index: true,
    },
    // Set when admin approves/rejects/disables — useful for audit + analytics
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup for the public feed: approved + currently within date range
promotionSchema.index({ status: 1, startDate: 1, endDate: 1 });

// Virtual: is this promotion currently live, independent of the stored status?
promotionSchema.virtual('isLive').get(function () {
  const now = new Date();
  return (
    this.status === 'approved' &&
    this.startDate <= now &&
    this.endDate >= now
  );
});

promotionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Promotion', promotionSchema);
module.exports.PROMOTION_STATUSES = PROMOTION_STATUSES;
