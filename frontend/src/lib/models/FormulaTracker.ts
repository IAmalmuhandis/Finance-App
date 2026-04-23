import mongoose, { Schema, type InferSchemaType } from "mongoose";

const FormulaTrackerSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    income: { type: Number, default: 0 },
    formula: {
      stocks: { type: Number, default: 20 },
      emergency: { type: Number, default: 10 },
      obligations: { type: Number, default: 30 },
      food: { type: Number, default: 25 },
      flex: { type: Number, default: 15 },
    },
    checkins: { type: [Schema.Types.Mixed], default: [] },
    monthlyLog: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export type FormulaTrackerDoc = InferSchemaType<typeof FormulaTrackerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FormulaTracker =
  mongoose.models.FormulaTracker || mongoose.model("FormulaTracker", FormulaTrackerSchema);
