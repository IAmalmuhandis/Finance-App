import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ReportSchema = new Schema({
  userId: { type: String, required: true, index: true },
  accountIds: [{ type: String }],
  month: { type: String },
  title: { type: String },
  content: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export type ReportDoc = InferSchemaType<typeof ReportSchema> & { _id: mongoose.Types.ObjectId };

export const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

