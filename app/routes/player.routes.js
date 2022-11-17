const controller = require('../controllers/player.controller')

module.exports = function (app) {
  // app.use(function (req, res, next) {
  //   res.header(
  //     'Access-Control-Allow-Headers',
  //     'x-access-token, Origin, Content-Type, Accept',
  //   )
  //   next()
  // })

  

  app.get('/filepath/:channel/:start_utc/:duration', controller.getAudioFileAddress)

  // cut audio file
  app.get(`/cutAudioFile/:filepath/:start/:end`, controller.getCutAudioFileAddress)
  
  app.get('/download/:filename', controller.downloadFile)
  app.get('/generateThumbnails/:channel/:start_utc/:duration/:fps', controller.generateThumnails)

  // generate required audio chunk and return the name of it.
  app.get('/generateAudioChunk/:channel/:start_utc/:duration', controller.generateAudioChunk)

  app.post('/generateThumbnailsV2/:channel/:start_utc/:duration/:fps', controller.generateThumbnailsV2)
  app.post('/saveFingerprintDetails', controller.saveFingerprintDetails)
  app.post('/saveAudioFingerprintDetails', controller.saveAudioFingerprintDetails)
  
  app.get('/test/:channel/:start_utc/:duration', controller.testRequests)
  app.get('/test',function(req, res){
    // return '123';
    res.status(200).json({'hello': 'bedst'})
  })
}