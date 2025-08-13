const mongoose = require("mongoose");

const companyChatMessageSchema = new mongoose.Schema(
	{
		sender: {
			type: mongoose.Schema.Types.ObjectId,
			refPath: "senderModel",
			required: true,
		},
		senderModel: {
			type: String,
			required: true,
			enum: ["User", "Employee"],
		},
		message: { type: String, required: true },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const companyChatSchema = new mongoose.Schema({
	companyName: { type: String, required: true, index: true },
	bucket: { type: String, required: true, index: true }, // e.g., YYYY-MM-DD
	messages: { type: [companyChatMessageSchema], default: [] },
});

// One document per company per day
companyChatSchema.index({ companyName: 1, bucket: 1 }, { unique: true });

module.exports = mongoose.model("CompanyChat", companyChatSchema);


