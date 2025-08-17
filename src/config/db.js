import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: "/Users/trip/git/blogMemeScripts/.env" });

// Use environment variables for credentials

const uri = "mongodb+srv://trip:ooKoVQhrUlYfmyg9@cluster0.qowhuke.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

async function connectDB() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch(err) {
    // Ensures that the client will close when you finish/error
    console.dir(err);
  }
}

export default connectDB;
