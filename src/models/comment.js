import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    constituency: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Constituency",
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        required: false
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        required: false
    }],
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    link: {
        type: String,
        required: false
    },
    like: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislike: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    replyCount: {
        type: Number,
        default: 0
    }
})

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });
commentSchema.index({ constituency: 1, createdAt: -1 });

commentSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        //delete the replies of this commentID
        const Post = mongoose.model('Post');
        const Comment = mongoose.model('Comment');
        await Post.findByIdAndUpdate(
            this.post,
            {
                $pull: { comments: this._id },
                $inc: { commentCount: -1 },

            },
            { new: true }
        );

        // If this is a reply, remove it from the parentComment's replies array and decrement replyCount
        if (this.parentComment) {
            await Comment.findByIdAndUpdate(
                this.parentComment,
                {
                    $pull: { replies: this._id },
                    $inc: { replyCount: -1 },

                },
                { new: true }
            );
        }
        await Comment.deleteMany({ parentComment: this._id });
        next();
    }
    catch (error) {
        next(error);
    }
})

export default mongoose.model("Comment", commentSchema);