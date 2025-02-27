process.env.TZ = 'Asia/Kolkata';
const puppeteer = require('puppeteer');
require('dotenv').config();
const path = require('path');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');


// Schedule a task to run every day at 9:30 AM
cron.schedule(`${process.env.RUN_TIME} * * *`, async() => {
  const url = process.env.CHECK_URL; // Replace with the website you want to screenshot

  // Launch browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set screen size to 16:9 ratio (e.g., 1280x720)
  await page.setViewport({ width: 1280, height: 720 });

  // Track time and response status code
  const lastCheck = new Date();
  const start = new Date().getTime();
  const response = await page.goto(url);
  const loadTime = new Date().getTime() - start;
  let statusCode = response.status();

  const fileName = "./img/" + Date.now().toString() + ".png";
  const filePath = path.join(process.cwd(), fileName);


  // Take screenshot
  await page.screenshot({ path: fileName });

  // Log status code and loading time
  console.log(`Status Code: ${statusCode}`);
  console.log(`Loading Time: ${loadTime.toLocaleString()} ms`);
  // Close browser
  await browser.close();
  // Connection URI and Database Name
  const uri = process.env.DB_URL;
  const dbName = process.env.DB_NAME;
  if (statusCode.toString()==="200") {
    statusCode = statusCode+"(Success)";
  } else {
    statusCode = statusCode+"(Check)";
  }
  const message = `Performed Daily Website Check!\n\nURL: ${url}\nLast Checked: ${lastCheck.toISOString()}\nStatus Code: *${statusCode}*\nLoad Time: ${loadTime}ms`;
  // const message = "Performed Daily Website Check!\nURL: "+url+"\nLast Checked: ${loadTime.toLocaleString()}\nStatus Code: "+statusCode+"\nLoad Time: "+loadTime+"ms";
  // Data to insert
  const document = {
    chat: process.env.WHATSAPP_GID,
    message: message,
    status: "PENDING",
    imagePath: filePath,
  };
  console.log(document);
  const client = new MongoClient(uri);
  try {
    // Connect to the MongoDB server
    await client.connect();

    // Access the database and collection
    const database = client.db(dbName);
    const collection = database.collection(process.env.DB_COLLECTION);

    // Insert the document
    const result = await collection.insertOne(document);

    console.log(`New document inserted with the following id: ${result.insertedId}`);
  } catch (error) {
    console.error('Error inserting document:', error);
  } finally {
    // Close the connection to the MongoDB server
    await client.close();
  }
});
