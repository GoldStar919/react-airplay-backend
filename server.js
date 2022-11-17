require('dotenv').config();

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./app/config/db.config')
const fileUpload = require('express-fileupload')
const path = require('path')
let busboy = require('connect-busboy')

const app = express()
app.use(fileUpload())
app.use(busboy())
app.use(express.static('public'))

var corsOptions = {
  origin: '*'
}

app.use(cors(corsOptions))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))



// simple route
// app.get('/', (req, res) => {
//   res.json({message: ''})
// })

// routes
require('./app/routes/player.routes')(app)


app.use(express.static('frontend/build'));
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
})

// app.get('/audio_waveform.mp3', function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "X-Requested-With");
//   next();
// });
app.use(express.static(path.join(__dirname, "/public")));
app.use('/public', express.static('public')); 

// set port, listen for requests
const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`)
})

