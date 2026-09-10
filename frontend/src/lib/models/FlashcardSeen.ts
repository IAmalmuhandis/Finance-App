import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FlashcardSeenSchema = new Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD", device-local
    cardId: { type: Schema.Types.ObjectId, ref: "Flashcard", required: true },
    seenAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

FlashcardSeenSchema.index({ userId: 1, date: 1 }, { unique: true });

export type FlashcardSeenDoc = InferSchemaType<typeof FlashcardSeenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FlashcardSeen =
  mongoose.models.FlashcardSeen || mongoose.model("FlashcardSeen", FlashcardSeenSchema);
