const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uhjpjbn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("user-engagement-platform").collection("users");
    const surveyCollection = client.db("user-engagement-platform").collection("missions");
    const participatedMissionsCollection = client.db("user-engagement-platform").collection("participatedMissions");
            // jwt related api
        app.post('/jwt', async (req, res) => {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
                res.send({ token });
              })
            const verifyToken = (req, res, next) => {
                // console.log('inside verify token', req.headers.authorization);
                if (!req.headers.authorization) {
                  return res.status(401).send({ message: 'unauthorized access' });
                }
                const token = req.headers.authorization.split(' ')[1];
                jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                  if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                  }
                  req.decoded = decoded;
                  next();
                })
              }
              
            
            
    // user related api
    app.post('/users',async(req,res)=>{
        const user=req.body
        const query={
          email:user.email
        }
        const existingUser=await userCollection.findOne(query)
        if(existingUser){
           return res.send({ message: 'user already exists', insertedId: null })
        }
        const result=await userCollection.insertOne(user)
        res.send(result)
      })
    // surveys api
    app.get('/allSurveys',async(req,res)=>{
       try{
        const result = await surveyCollection.find().toArray();
        res.send(result)
       }
       catch(error){
        res.send(error)
       }
    })
    app.post('/addSurvey',verifyToken,async(req,res)=>{
      const newSurvey=req.body
      if(newSurvey.email!==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const result=await surveyCollection.insertOne(newSurvey)
      res.send(result)
    })
    app.post('/mySurveyMission',verifyToken,async(req,res)=>{
      const item=req.body;
      
      if(item.email!==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { $and: [{ email: item.email }, { survey_id:item.survey_id}] };
      const alreadyParticipate = await participatedMissionsCollection.findOne(query);
      if (alreadyParticipate) { 
        return res.send({ message: 'Already Participated', insertedId: null })
      }
      const result = await participatedMissionsCollection.insertOne(item);
      res.send(result)
    })
    app.delete('/deleteCreatedSurvey',verifyToken,async(req,res)=>{
     
      const email=req.query.email
      if(email!==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const id=req.query.id
      const query={
        _id:new ObjectId(id)
      }
      const result=await surveyCollection.deleteOne(query)
      res.send(result)
      
    })
    app.patch('/updateSurvey/:id',verifyToken,async(req,res)=>{
      const item = req.body;
      const id = req.params.id;
      if (item.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          title: item.title,
          description: item.description,
          status: item.status
        }
      }
      const result = await surveyCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.get('/myCreatedMissions/:email',verifyToken,async(req,res)=>{
      const email=req.params.email;
      if(email!==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query={
        email:email
      }
      const result=await surveyCollection.find(query).toArray()
      res.send(result)

    })
    app.get('/myMissions/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      if(email!==req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email }; 
      try {
          const result = await participatedMissionsCollection.find(query).toArray();
          res.send(result);
      } catch (error) {
          console.error("Error:", error);
      }
  });
  


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server engagement is running')
  })
  
  app.listen(port, () => {
    console.log(`server engagement running on port ${port}`);
  })