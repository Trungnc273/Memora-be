import mongoose from "mongoose";

const { Schema, model } = mongoose;

const FollowSchema = new Schema(
  {
    follower_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followee_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "pending",
    },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Không cho phép follow chính mình
FollowSchema.pre("save", function (next) {
  if (this.follower_id.equals(this.followee_id)) {
    const err = new Error("A user cannot follow themselves");
    return next(err);
  }
  next();
});

// Chỉ cho phép một cặp follower-followee duy nhất
FollowSchema.index({ follower_id: 1, followee_id: 1 }, { unique: true });

const FollowModel =
  mongoose.models.Follow || model("Follow", FollowSchema, "follows");

export default FollowModel;
