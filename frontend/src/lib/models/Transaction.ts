import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TransactionSchema = new Schema({
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
  category: { type: String, default: "Other" },
  month: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ accountId: 1 });
TransactionSchema.index({ month: 1 });
TransactionSchema.index({ date: 1 });

export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & { _id: mongoose.Types.ObjectId };

export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

