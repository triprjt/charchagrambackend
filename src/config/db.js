import mongoose from 'mongoose';
import dotenv from 'dotenv';

// dotenv.config({ path: "/Users/trip/git/blogMemeScripts/.env" });
dotenv.config();

// Use environment variables for credentials
const getMongoURI = () => {
  console.log('Environment variables:', {
    MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? 'YES' : 'NO'
  });
  
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  
  return "mongodb+srv://trip:ooKoVQhrUlYfmyg9@cluster0.qowhuke.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
};
// const uri = "mongodb+srv://trip:ooKoVQhrUlYfmyg9@cluster0.qowhuke.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const clientOptions = {
  serverApi: { version: '1', strict: true, deprecationErrors: true }, connectTimeoutMS: 5000,
};

async function connectDB() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    const uri=getMongoURI();
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    // Ensures that the client will close when you finish/error
    console.dir(err);
  }
}

export default connectDB;
