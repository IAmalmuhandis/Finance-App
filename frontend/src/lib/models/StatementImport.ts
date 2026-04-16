import mongoose, { Schema, type InferSchemaType } from "mongoose";

const StatementImportSchema = new Schema({
  userId: { type: String, required: true, index: true },
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  month: { type: String, required: true, index: true },
  sourceFileName: { type: String },
  transactionsCount: { type: Number, required: true },
  totalCredit: { type: Number, default: 0 },
  totalDebit: { type: Number, default: 0 },
  statementDocument: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

StatementImportSchema.index({ userId: 1, accountId: 1, month: 1, createdAt: -1 });

export type StatementImportDoc = InferSchemaType<typeof StatementImportSchema> & { _id: mongoose.Types.ObjectId };

export const StatementImport = mongoose.models.StatementImport || mongoose.model("StatementImport", StatementImportSchema);
