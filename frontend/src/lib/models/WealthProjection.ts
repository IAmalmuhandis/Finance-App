import mongoose, { Schema, type InferSchemaType } from "mongoose";

const WealthProjectionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    input: { type: Schema.Types.Mixed, required: true },
    summary: { type: Schema.Types.Mixed, required: true },
    rows: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: false }
);

WealthProjectionSchema.index({ userId: 1, createdAt: -1 });

export type WealthProjectionDoc = InferSchemaType<typeof WealthProjectionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WealthProjection =
  mongoose.models.WealthProjection ||
  mongoose.model("WealthProjection", WealthProjectionSchema);
