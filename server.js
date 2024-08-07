const express = require('express');
const fs = require('fs');
const csvParser = require('csv-parser');
const fastCsv = require('fast-csv');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require("moment");

const app = express();
const PORT = 3001;
const CSV_FILE_PATH = path.join(__dirname, '/data/transactions.csv');

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('CSV Data API');
});

app.get('/read-csv', (req, res) => {
    const result = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csvParser())
        .on('data', (data) => {
            result.push(data);
        })
        .on('end', () => {
            res.json(result);
        });
});

app.post('/add-entry', (req, res) => {
    const { date, amount, category, title, notes, type } = req.body;

    if (!date || !amount || !category || !title || !notes || !type) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const formattedDate = moment(date).format('YYYY-MM-DD HH:mm:ss');
    const newEntry = {
        dateTime: formattedDate,  // Assuming the date should be in a datetime format
        amount,
        type,
        category,
        title,
        currency: 'INR',    // Default empty value for currency
        note: notes       // Using 'note' instead of 'notes' to match the CSV column header
    };

    const entries = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csvParser())
        .on('data', (data) => {
            entries.push(data);
        })
        .on('end', () => {
            entries.push(newEntry);

            fastCsv.writeToPath(CSV_FILE_PATH, entries, { headers: true })
                .on('finish', () => {
                    res.status(200).json({ message: 'Entry added successfully' });
                });
        });
});


app.put('/edit-entry', (req, res) => {
    const { dateTime, updatedEntry } = req.body;
    const entries = [];
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csvParser())
      .on('data', (data) => {
        entries.push(data);
      })
      .on('end', () => {
        const entryIndex = entries.findIndex(entry => entry.dateTime === dateTime);
        if (entryIndex !== -1) {
          entries[entryIndex] = { ...entries[entryIndex], ...updatedEntry };
  
          fastCsv.writeToPath(CSV_FILE_PATH, entries, { headers: true })
            .on('finish', () => {
              res.status(200).json({ message: 'Entry edited successfully' });
            });
        } else {
          res.status(404).json({ message: 'Entry not found' });
        }
      });
  });

app.delete('/delete-entry', (req, res) => {
    const { dateTime } = req.body;

    if (!dateTime) {
        return res.status(400).json({ error: 'dateTime field is required' });
    }

    const entries = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csvParser())
        .on('data', (data) => {
            if (data.dateTime !== dateTime) {
                entries.push(data);
            }
        })
        .on('end', () => {
            fastCsv.writeToPath(CSV_FILE_PATH, entries, { headers: true })
                .on('finish', () => {
                    res.status(200).json({ message: 'Entry deleted successfully' });
                });
        });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
