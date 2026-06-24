import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AllocationSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Keep", "Spend", "Give"], required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const EntrySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    grossAmount: { type: Number, required: true },
    mode: { type: String, enum: ["recommended", "custom"], required: true },
    formulaSnapshot: { type: [Schema.Types.Mixed], required: true },
    allocations: { type: [AllocationSchema], required: true },
  },
  { timestamps: false }
);

EntrySchema.index({ userId: 1, createdAt: -1 });

export type EntryDoc = InferSchemaType<typeof EntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);
