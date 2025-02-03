import mongoose from 'mongoose'

//Everytime someone subscribes a channel, new document is created with subcriber and a channel name.
//To find subscriber count of x, we can simply find number of document with channel name x
//To find subscription of a user x, we find documents with subscriber name x and take channel of each document  
const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
}, {timestamps: true})

export const Subscription = mongoose.model('Subscription', subscriptionSchema);