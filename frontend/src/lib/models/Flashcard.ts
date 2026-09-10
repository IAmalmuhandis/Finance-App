import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FlashcardSchema = new Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
    source: { type: String, required: true },
    category: {
      type: String,
      enum: ["mindset", "habits", "assets", "behavior", "saving"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export type FlashcardDoc = InferSchemaType<typeof FlashcardSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Flashcard = mongoose.models.Flashcard || mongoose.model("Flashcard", FlashcardSchema);
