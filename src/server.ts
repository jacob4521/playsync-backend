import express from "express";

// Create an instance of the express application
const app = express();
const port = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Start and listen on the port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
