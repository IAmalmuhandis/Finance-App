import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AccountSchema = new Schema({
  userId: { type: String, required: true, index: true },
  bankName: { type: String, required: true },
  nickname: { type: String, required: true },
  type: { type: String, enum: ["PERSONAL", "BUSINESS"], default: "PERSONAL" },
  last4: { type: String },
  currency: { type: String, default: "NGN" },
  color: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export type AccountDoc = InferSchemaType<typeof AccountSchema> & { _id: mongoose.Types.ObjectId };

export const Account = mongoose.models.Account || mongoose.model("Account", AccountSchema);

