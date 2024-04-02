import express from 'express';
import axios from 'axios'; 
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(express.static('stock-search/dist/stock-search/browser'));
// const port = process.env.PORT || 8080;


const uri = "mongodb+srv://jraghu:6B3sDNuyZiA9hJIn@stock-search-cluster.31nq4cg.mongodb.net/?retryWrites=true&w=majority&appName=stock-search-cluster";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function main() {
    try {
      await client.connect();
      console.log("Connected successfully to MongoDB");
  
      app.post('/api/favorites', async (req, res) => {
        try {
          const { ticker, metadata } = req.body;
          const db = client.db("stock-search-db");
          const collection = db.collection("favorites");
  
          await collection.insertOne({ ticker, ...metadata });
          res.status(200).send({ message: 'Added to favorites' });
        } catch (error) {
          console.error('Error modifying favorites:', error);
          res.status(500).send('Error modifying favorites');
        }
      });

      app.get('/api/watchlist', async (req, res) => {
        try {
            const db = client.db("stock-search-db");
            const collection = db.collection("favorites");
        
            const watchlist = await collection.find({}).toArray();
            res.status(200).json(watchlist);
          } catch (error) {
            res.status(500).json({ message: "Error retrieving the watchlist", error });
        }
      });

      app.delete('/api/watchlist', async (req, res) => {
        try {
          const ticker = req.query.ticker;
      
          const db = client.db("stock-search-db");
          const collection = db.collection("favorites");
      
          const result = await collection.deleteOne({ ticker });
      
          if (result.deletedCount === 1) {
            res.status(200).json({ message: "Item successfully removed from watchlist" });
          } else {
            res.status(404).json({ message: "Item not found in watchlist" });
          }
        } catch (error) {
          res.status(500).json({ message: "Error removing item from watchlist", error });
        }
      });


      app.get('/api/watchlist-item', async (req, res) => {
        try {
          const tick = req.query.term;
      
          const db = client.db("stock-search-db");
          const collection = db.collection("favorites");
      
          const item = await collection.findOne({ticker: tick});
      
          res.status(200).json({ isFavorite: !!item });
        } catch (error) {
          console.error('Error checking the watchlist', error);
          res.status(500).json({ message: "Error checking the watchlist", error });
        }
      });
    } catch (err) {
      console.error("Failed to connect to MongoDB", err);
      process.exit(1);
    }
  }
  
main().catch(console.error);



app.get('/api/autocomplete', async (req, res) => {
    try {
      const searchTerm = req.query.term;
      console.log("Hello, " + searchTerm);
      const apiKey = "cn66vg9r01qo3qc0j2m0cn66vg9r01qo3qc0j2mg"; 
      const response = await axios.get(`https://finnhub.io/api/v1/search?q=${searchTerm}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`);
      const formattedResults = response.data.result.map(stock => ({
        formatted: `${stock.symbol} | ${stock.description}`,
        symbol: stock.symbol,
        description: stock.description
      }));
      res.json({ count: response.data.count, result: formattedResults }); // Send the data back to the client
    } catch (error) {
      res.status(500).send('Error retrieving stock data');
    }
  });


  app.get('/api/profile', async (req, res) => {
    try {
        const searchTerm = req.query.term; 
        const profile_url = `https://finnhub.io/api/v1/stock/profile2?symbol=${searchTerm}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;

        const response = await axios.get(profile_url);

        const { exchange, ipo, name, ticker, weburl, logo, finnhubIndustry } = response.data;

        res.json({ exchange, ipo, name, ticker, weburl, logo, finnhubIndustry });
    } catch (error) {
        console.error('Error fetching profile details:', error);
        res.status(500).send('Error retrieving data from the profile API');
    }
});


app.get('/api/quote', async (req, res) => {
    try {
        const searchTerm = req.query.term; 
        const quote_url = `https://finnhub.io/api/v1/quote?symbol=${searchTerm}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;

        const response = await axios.get(quote_url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching quote details:', error);
        res.status(500).send('Error retrieving data from quote API');
    }
});


app.get('/api/peers', async (req, res) => {
    try {
        const searchTerm = req.query.term; 
        const peers_url = `https://finnhub.io/api/v1/stock/peers?symbol=${searchTerm}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;

        const response = await axios.get(peers_url);

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching peers details:', error);
        res.status(500).send('Error retrieving data from peers API');
    }
});


app.get('/api/stock/hourly', async (req, res) => {
    const { ticker, fromDate } = req.query;
    console.log('INFORMATION RECEIVED: ', ticker, ' FROM DATE: ', fromDate);

    let fromDateObj = new Date(fromDate);
    let toDateObj = new Date(fromDate);
    toDateObj.setDate(toDateObj.getDate() + 1);

    const fromDateString = fromDateObj.toISOString().split('T')[0];
    const toDateString = toDateObj.toISOString().split('T')[0];
    
    try {
        const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/hour/${fromDateString}/${toDateString}?adjusted=true&sort=asc&limit=120&apiKey=ZIaDX5Y_iVh7IG3t56n4lzjGDhBpkoJ4`);
        console.log('Chart data fetched successfully: ', response.data);
        res.json(response.data.results || []);
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).send(error.message);
    }
});

app.get('/api/news', async (req, res) => {
    const ticker = req.query.ticker;
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 7);

    const toDateString = toDate.toISOString().split('T')[0];
    const fromDateString = fromDate.toISOString().split('T')[0];

    try {
        const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDateString}&to=${toDateString}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;
        const response = await axios.get(url);
        const newsArticles = response.data
            .filter(article => article.headline && article.image) // Check for nonempty headline and image
            .slice(0, 20); 
        res.json(newsArticles);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).send('Error retrieving news articles');
    }
});


app.get('/api/sentiment', async (req, res) => {
    const ticker = req.query.ticker;
    const toDate = new Date();
    const toDateString = toDate.toISOString().split('T')[0];

    try {
        const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${ticker}&from=2022-01-01&to=${toDateString}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;
        const response = await axios.get(url);
        const sentiments = response.data.data;
        res.json(sentiments);
    } catch (error) {
        console.error('Error fetching sentiments:', error);
        res.status(500).send('Error retrieving sentiments');
    }
});

app.get('/api/rec', async (req, res) => {
    const ticker = req.query.ticker;

    try {
        const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;
        const response = await axios.get(url);
        const recs = response.data;
        res.json(recs);
    } catch (error) {
        console.error('Error fetching recs:', error);
        res.status(500).send('Error retrieving recs');
    }
});


app.get('/api/earnings', async (req, res) => {
    const ticker = req.query.ticker;

    try {
        const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=co2eofhr01qvggee1h2gco2eofhr01qvggee1h30`;
        const response = await axios.get(url);
        const earnings = response.data;
        res.json(earnings);
    } catch (error) {
        console.error('Error fetching recs:', error);
        res.status(500).send('Error retrieving recs');
    }
});


app.listen(port, () => {
    console.log('listening on port' + port);
});

// // Replace `port` with your actual port number
// app.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });



