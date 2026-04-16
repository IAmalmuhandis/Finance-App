import mongoose, { Schema, type InferSchemaType } from "mongoose";

const MessageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "New Conversation" },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export type ConversationDoc = InferSchemaType<typeof ConversationSchema> & { _id: mongoose.Types.ObjectId };

export const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

