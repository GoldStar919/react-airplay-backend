
const moment = require('moment');
const axios = require('axios');
const fs = require('fs')
// const fetch = require('node-fetch');
const Shell = require('node-powershell');
const { exec, execSync, spawn } = require("child_process");
const FormData = require('form-data')
const getMP3Duration = require('get-mp3-duration')
const { randomUUID } = require('crypto');
// const ps = new Shell({
//     executionPolicy: 'Bypass',
//     noProfile: true
// });

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const ffmpeg_1 = require("ffmpeg-cli");
var cmd = require('node-cmd');


var http = require('http');




exports.testRequests = (req, res) => {
    res.status(200).json({'hello':'world'})
}

exports.generateThumbnailsV2 = async (req, res) => {
    let {channel, start_utc, duration, fps} = req.params;
    channel = String(channel).toUpperCase();

    // res.status(200).json({'success': true, test: 'dateTime'})
    let number_of_frames = parseInt(duration*fps);
    cmd.run(`ffmpeg -i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${start_utc}-${parseInt(duration)}.m3u8  -y  -ss 00:00:00.000 -vf fps=${fps} -vframes ${number_of_frames} "../video-player-project/public/thumbnails/filename_%03d.png`, (err, data, stderr) => {
        console.log(data)
        res.status(200).json({data: data})
    })
}

const getDateAfterSplit = (splitted_name) => {
    return moment(`${splitted_name[1]}-${splitted_name[2]}-${splitted_name[3]} ${String(splitted_name[4]).padStart(2,"0")}:${splitted_name[5].padStart(2,"0")}:${splitted_name[6]}.${splitted_name[7].padStart(3,"0")}`);
}

exports.generateAudioChunk = async (req, res) => {

    let {channel, start_utc, duration} = req.params;
    channel = String(channel).toUpperCase();
    // let start_utc = 1644029989;
    // let threshold = 3; // for example if we have already passed 3 seconds at start when passing start_utc
    start_utc = Number(start_utc);
    let start_datetime = moment.unix(moment.utc(Number(start_utc)))
    // let real_start = start_datetime.clone().add(threshold, 'seconds')
    // let duration = 200
    // let real_duration = duration-(threshold*2)
    // let channel = "8A4DEE2A-D37B-E911-90CC-00155DF10303"
    let date_splitable = start_datetime.format('YYYY/MM/DD')
    // console.log(date_splitable,'***************************************8',start_utc,moment.utc(start_utc),moment.unix(moment.utc(start_utc)))
    let needed_files = [];
    let path_to_check = process.env.IS_PRODUCTION?"C:/audio_examples/split_by_date_root":"D:/Recordings/radio/split_by_date_root"
    let fileName = "";
    fs.readdir(`${path_to_check}/${date_splitable}`,(err, files)=>{
      if(err){
          console.log('some error occured',date_splitable)
      }

      if(!files){
        res.status(200).json({success:false, error: 'audio files folder not found'})
        return;
      }
      files.forEach((file)=>{
          console.log(file,'test')
          if(file.indexOf(channel)>-1){
              needed_files.push(`${path_to_check}/${date_splitable}/${file}`)
          }
      })

      needed_files.forEach((file, key)=>{
          
          let splitted_name_1 = file.split('.');

          let current_file_date_time = getDateAfterSplit(splitted_name_1);
          const buffer = fs.readFileSync(file)
          const audio_duration = getMP3Duration(buffer)

          let current_file_date_time_with_duration = current_file_date_time.clone().add(audio_duration,'milliseconds')
        //   console.log(start_datetime.isSameOrAfter(current_file_date_time),'ooooooooooo_________+++=',start_datetime.clone().add(duration,'seconds').isSameOrBefore(current_file_date_time_with_duration),start_datetime.clone().add(duration,'seconds').format('YYYY-MM-DD HH:mm:ss.SSS'), current_file_date_time_with_duration.format('YYYY-MM-DD HH:mm:ss.SSS'), current_file_date_time.format('YYYY-MM-DD HH:mm:ss.SSS'))
          if(start_datetime.isSameOrAfter(current_file_date_time) && start_datetime.clone().add(duration,'seconds').isSameOrBefore(current_file_date_time_with_duration)){
              // first option we get start and end in a file then just cut the required file and hurray
              let diff_milliseconds = start_datetime.diff(current_file_date_time)
              fileName = randomUUID()+'.mp3'
              // let start_frame_moment = moment(framesToShow?.[0]?.timestamp);
              // let start_utc = moment(framesToShow?.[0]?.timestamp)
              let zero_zero_time = moment().startOf('day')
              let audio_placement_folder_path = (process.env.IS_PRODUCTION && '../../../../../inetpub/spt.office.airplaycontrol.com/audios') || 'public/audios';
            //   console.log(audio_placement_folder_path,'dddddddddddddddddddddddd')
              let start_cut = zero_zero_time.clone().add(parseInt(diff_milliseconds), 'milliseconds')
              
              let end_cut = zero_zero_time.clone().add(parseInt(diff_milliseconds)+parseInt(duration*1000), 'milliseconds')

              let current_file_duration = end_cut.diff(start_cut)
              start_cut = start_cut.format('HH:mm:ss.SSS')
              end_cut = end_cut.format('HH:mm:ss.SSS')
              cmd.run(`ffmpeg -i ${file} -ss ${start_cut} -to ${end_cut} -y "${audio_placement_folder_path}/${fileName}"`, (err, data, stderr) => {
  
                  if(!err){
                      
                      console.log('success',fileName, start_cut, end_cut)
                      res.status(200).json({success:true, filePath: `${fileName}`, duration: current_file_duration})
                  }
                  else{
                      console.log(err,' error occured', process.env.IS_PRODUCTION)
                      res.status(200).json({success:false, error: 'audio file generation error'})
                  }
              })
          }
          // else if(!fileName && (getDateAfterSplit(needed_files[key+1])))

          // if(previous){
          //     //
          // }

          // if((key+1)===needed_files.length){

          // }

          // previous = file; 
      })

      if(!fileName){
          console.log('not found');
          res.status(200).json({success:false, error: 'audio file not generated'})
      }

      /**
       * ------------------------------- Commented -------------------------------------
       * Because files are not the way I thought, for 05:00:00 file is contain 1 minute of next audio file 
       * that's why it can't work especially because files are not always of 1 hour that's why not looks manageable yet. 
       * we'll see if necessarily have to implement that
       */
      // if(!fileName){
      //     console.log('inside fileName')
      //     needed_files.forEach((file, key)=>{
      //         let splitted_name_1 = file.split('.');
      //         if(!needed_files[key+1]) return;
      //         let splitted_name_2 = needed_files[key+1].split('.');

      //         let current_file_date_time = getDateAfterSplit(splitted_name_1);
      //         const buffer = fs.readFileSync(file)
      //         const audio_duration = getMP3Duration(buffer)
              
      //         let current_file_date_time_2 = getDateAfterSplit(splitted_name_2);
      //         const buffer_2 = fs.readFileSync(needed_files[key+1])
      //         const audio_duration_2 = getMP3Duration(buffer_2)
              
      //         // getAudioDurationInSeconds('D:\\Recordings\\radio\\8456E065-C602-E811-945C-549F351FC62C.2022.02.04.12.00.02.280.mp3').then((duration) => {
      //         //     console.log(duration, 'here comes the duration ');
      //         // });
      //         let current_file_date_time_with_duration = current_file_date_time.clone().add(audio_duration,'milliseconds')
      //         let current_file_date_time_with_duration_2 = current_file_date_time_2.clone().add(audio_duration_2,'milliseconds')
              
      //         let available_in_this_file = current_file_date_time_with_duration.diff(start_datetime)
      //         // console.log((start_datetime.clone().add(duration,'seconds').isSameOrBefore(current_file_date_time_with_duration_2) && start_datetime.isSameOrAfter(current_file_date_time)),current_file_date_time_with_duration.format('YYYY-MM-DD HH:mm:ss.SSS'),start_datetime.clone().add(available_in_this_file,'milliseconds').format('YYYY-MM-DD HH:mm:ss.SSS'),'&&&&&&&&&&&&&&&&&&&&&&',start_datetime.format('YYYY-MM-DD HH:mm:ss.SSS') )
              
      //         // new total duration of first file - start
              
      //         if(start_datetime.isSameOrAfter(current_file_date_time) && start_datetime.clone().add(duration,'seconds').isSameOrBefore(current_file_date_time_with_duration_2)){
                  
      //             // first we cut the audio in the first file and then from then second one and then will merge them

      //             let diff_milliseconds = start_datetime.diff(current_file_date_time)
      //             let random_file_UUID = randomUUID();
      //             let fileName_1 = random_file_UUID+'_part_1_.mp3'
      //             let fileName_2 = random_file_UUID+'_part_2_.mp3'
      //             // let start_frame_moment = moment(framesToShow?.[0]?.timestamp);
      //             // let start_utc = moment(framesToShow?.[0]?.timestamp)
      //             if(diff_milliseconds>3600000){ // if difference is of more than 1 hour then just return
      //                 return;
      //             }

      //             let zero_zero_time = moment().startOf('day')

      //             // duration of next mp3 file
      //             let first_file_duration = current_file_date_time_with_duration.diff(start_datetime);
      //             let second_file_duration = start_datetime.clone().add(duration,'seconds').diff(current_file_date_time_with_duration)
      //             let end_cut_second_file = zero_zero_time.clone().add(parseInt(second_file_duration)).format('HH:mm:ss.SSS')

                  
      //             let start_cut = zero_zero_time.clone().add(parseInt(diff_milliseconds), 'milliseconds').format('HH:mm:ss.SSS')
      //             // let end_cut = zero_zero_time.clone().add(parseInt((audio_duration - diff_milliseconds)*1000), 'milliseconds').format('HH:mm:ss.SSS')
      //             // if(start_cut.split(':')){

      //             // }
      //             console.log(start_cut,'before first file', audio_duration, second_file_duration)
      //             cmd.run(`ffmpeg -i ${file} -ss ${start_cut} -y "audios/${fileName_1}"`, (err, data, stderr) => {
  
      //                 if(!err){
                          
      //                     console.log('success creating first file')

      //                     cmd.run(`ffmpeg -i ${needed_files[key+1]} -to ${end_cut_second_file} -y "audios/${fileName_2}"`, (err, data, stderr) => {
  
      //                         if(!err){
                                  
      //                             console.log('success creating second file')
      //                             fileName = randomUUID()+'.mp3';
      //                             cmd.run(`ffmpeg -i audios/${fileName_1} -i audios/${fileName_2} -filter_complex [0:a][1:a]concat=n=2:v=0:a=1 "audios/${fileName}"`, (err, data, stderr) => {
  
      //                                 if(!err){
                                          

      //                                     console.log('success merging')
                                          
              
      //                                 }
      //                                 else{
      //                                     console.log(err,' error occured')
      //                                 }
      //                             })
                                  
      
      //                         }
      //                         else{
      //                             console.log(err,' error occured')
      //                         }
      //                     })

      //                 }
      //                 else{
      //                     console.log(err,' error occured')
      //                 }
      //             })

      //         }

      //     })
      // }
    })
}

exports.saveAudioFingerprintDetails = async(req, res) => {
    let {filename,  start, end, spotVersionName, spotUuid} = req.body;

    let zero_zero_time = moment().startOf('day')
    let start_cut = zero_zero_time.clone().add(parseInt(start*1000), 'milliseconds').format('HH:mm:ss.SSS')
    let end_cut = zero_zero_time.clone().add(parseInt(end*1000), 'milliseconds').format('HH:mm:ss.SSS')

    // let start_cut = 
    let new_filename = `public/audios/file_${randomUUID()}.mp3`;
    let audio_filePath = (process.env.IS_PRODUCTION && 'http://spt.office.airplaycontrol.com/audios/'+filename) ||'http://localhost:3000/videos/audio_waveform.mp3';
    console.log(`ffmpeg -i ${audio_filePath} -ss ${start_cut} -to ${end_cut} -y ${new_filename}`,'helllllllllll')
    let results = cmd.runSync(`ffmpeg -i ${audio_filePath} -ss ${start_cut} -to ${end_cut} -y ${new_filename}`)
    
    if(!results.err){
        let authHeader = req.headers['authorization'];
        const form = new FormData();
        form.append('File', fs.createReadStream(new_filename))
        form.append('SpotVersionName', spotVersionName)
        form.append('IsRecognizing', "true")
        form.append('Details', "")
        console.log('before uploading it to the server, ', spotVersionName, fs.createReadStream(new_filename))
        form.submit({
            host: 'dev.api.spotcheck.airplaycontrol.com',
            path: `/api/SpotVersions/AudioUpload/${spotUuid}`,
            protocol: 'https:',
            headers: {'Authorization': authHeader}
          }, function(err, ress) {
              if(err){
                res.status(200).json({error: 'an error occured uploading that file', obj: err})
              }
              
              else{
                res.status(200).json({success: 'successfully uploaded file'})
              }
            console.log(ress?.statusMessage, ress?.statusCode);
          });
        
    }else{
        res.status(200).json({audio: 'generation error'})
    }

    // cmd.run(`ffmpeg -i ${filename} -ss ${start_cut} -to ${end_cut} -y "public/videos/${spotVersionName}.mp4"`, (err, data, stderr) => {
        
    //     // console.log(data)
        
    // })
}

exports.saveFingerprintDetails = async(req, res) => {
    let {channel, start_utc, duration,  start_cut, end_cut, spotVersionName, spotUuid} = req.body;
    cmd.run(`ffmpeg -i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${start_utc}-${parseInt(duration)}.m3u8 -ss ${start_cut} -to ${end_cut} -y "public/videos/${spotVersionName}.mp4"`, (err, data, stderr) => {
        
        if(!err){
            cmd.run(`ffmpeg -i "public/videos/${spotVersionName}.mp4" "public/audios/${spotVersionName}.mp3"`,(err) =>{
                if(!err){
                    let authHeader = req.headers['authorization'];
                    const form = new FormData();
                    form.append('File', fs.createReadStream(`public/audios/${spotVersionName}.mp3`))
                    form.append('SpotVersionName', spotVersionName)
                    form.append('IsRecognizing', "true")
                    form.append('Details', "")
                    form.submit({
                        host: 'dev.api.spotcheck.airplaycontrol.com',
                        path: `/api/SpotVersions/AudioUpload/${spotUuid}`,
                        protocol: 'https:',
                        headers: {'Authorization': authHeader}
                      }, function(err, ress) {
                          if(err){
                            res.status(200).json({error: 'an error occured uploading that file', obj: err})
                          }
                          
                          else{
                            res.status(200).json({success: 'successfully uploaded file'})
                          }
                        console.log(ress?.statusMessage, ress?.statusCode);
                      });
                    
                }else{
                    res.status(200).json({audio: 'generation error'})
                }
            })
        }else{
            // res.status(200).json({video: 'generated'})
            res.status(200).json({video: 'generation error'})
        }
        // console.log(data)
        
    })
}

exports.generateThumnails = async (req, res) => {

    // res.setHeader('Content-Type', 'application/json');
    let {channel, start_utc, duration, fps} = req.params;
    channel = String(channel).toUpperCase();
    // Shell.$`Get-Process | ? { $_.name -like '*code*' }`;
    // ps.addCommand(`Get-Process | ? { $_.name -like '*code*' }`);
    // ps.invoke()
    //     .then(response => {
    //         // res.send(response)
    //         res.status(200).json({'test':'hello', resp: response.data});
    //     })
    //     .catch(err => {
    //         res.status(200).json({'error':err});
    //     });
    let number_of_frames = parseInt(duration*fps);
    let ls = exec(`ffmpeg -i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${start_utc}-${parseInt(duration)}.m3u8 -ss 00:00:00.000 -vf fps=${fps} -vframes ${number_of_frames} "public/thumbnails/filename_%03d.png`,(err)=>{
        if(!err){
            let data = [];
            let start = moment.unix(start_utc);
            let dateTime = start;
            for(let i =1; i<=number_of_frames; i++){

                
                let millisecondsToAdd = 1000/fps;

                data.push({
                    timestamp: dateTime?.valueOf?.(), 
                    img: `thumbnails/filename_${String(i).padStart(3,'0')}.png`,
                    time: ((fps===1)?dateTime?.format?.('HH:mm:ss'):dateTime?.format?.('HH:mm:ss.SSS'))
                })

                dateTime = start.add(millisecondsToAdd ,'milliseconds')
            }
            exec(`ffmpeg -i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${moment.unix(start_utc).add(3,'seconds').unix()}-${parseInt(duration-6)}.m3u8 file__112.mp4`)
            res.status(200).json({'success': true, data})
            // res.status(200).json('success')
        }
        else{
            console.log(err,' this is the error')
            res.status(200).json({'success':false})
        }
        
    })
    ls.stdout.on("data", data => {
        console.log(`stdout: ${data}`);
    });
    
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    
    ls.on('error', (error) => {
        console.log(`error: ${error.message}`);
    });
    
    ls.on("close", code => {
        console.log(`child process exited with code ${code}`);
    });
    
    // let number_of_frames = parseInt(duration*fps);
    // axios.get(`http://phpcmdapi:8079?channel=${channel}&start_utc=${start_utc}&duration=${duration}&fps=${fps}`)
    // .then((ress)=>{
    //     // res.status(200).json({'test':'hello', resp: ress.data});
    //     if(ress.data.success){

    //         console.log('_______________success', ress.data)
        
    //         let data = [];
    //         let start = moment.unix(start_utc);
    //         let dateTime = start;
    //         for(let i =1; i<=number_of_frames; i++){

                
    //             let millisecondsToAdd = 1000/fps;

    //             data.push({
    //                 timestamp: dateTime?.valueOf?.(), 
    //                 img: `thumbnails/filename_${String(i).padStart(3,'0')}.png`,
    //                 time: ((fps===1)?dateTime?.format?.('HH:mm:ss'):dateTime?.format?.('HH:mm:ss.SSS'))
    //             })

    //             dateTime = start.add(millisecondsToAdd ,'milliseconds')
    //         }
    //         res.status(200).json({'success': true, data})
    //     }
    //     else{
    //         console.log('_______________failure', ress.data)
    //         res.status(200).json({'success': false})
            
    //     }
    // })
    // .catch((e) => {
    //     console.log('_______________failure', e.message)
    //     res.status(200).json({'success': false, message: e.message})
    // })
    // setTimeout(()=>{
        
    //     console.log(`http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${start_utc}-${parseInt(duration)}.m3u8`,'__________________________')
        
    //     // })
    //     if(!results.err){
    //         // filename = `${__dirname}`
    //         let data = [];
    //         let start = moment.unix(start_utc);
    //         let dateTime = start;
    //         for(let i =1; i<=number_of_frames; i++){

                
    //             let millisecondsToAdd = 1000/fps;

    //             data.push({
    //                 timestamp: dateTime?.valueOf?.(), 
    //                 img: `thumbnails/filename_${String(i).padStart(3,'0')}.png`,
    //                 time: ((fps===1)?dateTime?.format?.('HH:mm:ss'):dateTime?.format?.('HH:mm:ss.SSS'))
    //             })

    //             dateTime = start.add(millisecondsToAdd ,'milliseconds')
    //         }
    //         res.status(200).json({'success': true, dateTime})
    //         // res.download(filename)
    //     }else{
    //         // res.download('file_1640020747.mp4')
    //         res.status(200).json({'success': false})
    //     }
    // },20000)

    return false;
        //     let getTimesArray = getTimeFramesArray(start_utc, duration, frames_per_sec);
        // getTimesArray.forEach((val, key)=>{
        //     let time_ = moment.utc(val).format('HH:mm:ss.SSS');
        //     console.log('********************************',time_)

            

    
}
exports.downloadFile = (req, res) => {
    res.download(req.params.filename);
}

exports.getCutAudioFileAddress = async (req, res) => {


    let {filepath, start, end} = req.params;

    let zero_zero_time = moment().startOf('day')
    let start_cut = zero_zero_time.clone().add(parseInt(start*1000), 'milliseconds').format('HH:mm:ss.SSS')
    let end_cut = zero_zero_time.clone().add(parseInt(end*1000), 'milliseconds').format('HH:mm:ss.SSS')

    // let start_cut = 
    let filename = `file_${randomUUID()}.mp3`;
    console.log(`ffmpeg -i ${process.env.IS_PRODUCTION?'http://spt.office.airplaycontrol.com/audios/'+filepath:'http://localhost:3000/videos/audio_waveform.mp3'} -ss ${start_cut} -to ${end_cut} -y ${filename}`,'helllllllllll')
    let results = cmd.runSync(`ffmpeg -i ${process.env.IS_PRODUCTION?'http://spt.office.airplaycontrol.com/audios/'+filepath:'http://localhost:3000/videos/audio_waveform.mp3'} -ss ${start_cut} -to ${end_cut} -y ${filename}`)
    if(!results.err){
        // filename = `${__dirname}`
        res.status(200).json({'success': true, filename})
        // res.download(filename)
    }else{
        // res.download('file_1640020747.mp4')
        res.status(200).json({'success': false})
    }

}

exports.getAudioFileAddress = async (req, res) => {
    
//   Site.findAll({
//     limit: 1,
//     order: ['createdAt'],
//   })
//     .then(result => {
    let {channel, start_utc, duration, frames_per_sec} = req.params;
    channel = String(channel).toUpperCase();
    // setTimeout(()=>{
    //     res.status(200).json({'test':'heeeeeel'});
    // },4000)
    
    // return false;
    let filename = `file_${moment().unix()}.mp4`;
    // console.log(getTimesArray,'ttttttttttttttt_____',duration, start_utc, frames_per_sec, channel)
    let results = cmd.runSync(`ffmpeg -i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_fmp4_dvr_range-${start_utc}-${parseInt(duration)}.m3u8 file_${moment().unix()}.mp4`)
    if(!results.err){
        // filename = `${__dirname}`
        res.status(200).json({'success': true, filename})
        // res.download(filename)
    }else{
        // res.download('file_1640020747.mp4')
        res.status(200).json({'success': false})
    }
    // if(results.data){
    //     let trimmed = results?.data?.trim();
    //     let duration = parseFloat(trimmed?.split('=')?.[1])
    //     console.log(duration,'####################################')
    //     let getTimesArray = getTimeFramesArray(start_utc, duration, frames_per_sec);
    //     getTimesArray.forEach((val, key)=>{
    //         let time_ = moment.utc(val).format('HH:mm:ss.SSS');
    //         console.log('********************************',time_)
            
        //    let i =  ffmpeg_1.runSync(`-i http://office.radioairplay.fm:8081/nvenc-live/${channel}/playlist_dvr_range-${start_utc}-${parseInt(duration)}.m3u8 -ss ${time_} -vframes 1 output_${key}.png`)
        // })
    // }
    // else{
    //     res.status(200).json({'success':false});
    // }
    // res.status(200).json({'success':true})
    // console.log(results,'&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');

    // setTimeout(()=>{
    //     res.status(200).send(JSON.stringify({'fileToLoad':`/videos/audio_waveform.mp3`}));
    // },12000)

    // ffmpeg_1.run(`-i "http://office.radioairplay.fm:8081/nvenc-inputs/${channel}/playlist_dvr_range-${start_utc}-${duration}.m3u8" -vn -ar 44100 -ac 2 -ab 128k -f mp3 "../video-player-project/public/videos/audio_waveform__23334572.mp3"`)
    // .then((result)=>{
    //         // resolve()
    //         console.log('succcccccccccccccccccccccc',result)
    //     res.status(200).json({'fileToLoad':`/videos/audio_waveform.mp3`});
    // }).catch((e)=>{
    //     // reject(e);
    //     console.log('failure..............')
    //     res.status(500).send(JSON.stringify({'fileToLoad':e.message}));
    // })
    // try{
    //     // ffmpeg_1.run()
    //     // let data = await command(channel, start_utc, duration);
    //     // res.status(200).json({'fileToLoad': data})
    //     // return false;
    // }
    // catch(e){
    //     res.status(500).json({message: e.message})
    //     return false;
    // }
    

    // .then((result)=>{
        
    
    //     res.status(200).json({'fileToLoad':`/videos/audio_waveform.mp3`})
    // }).catch((err)=>{
    //     res.status(500).json({message: err.message})
    // });
    // moment.utc(1638976060*1000).format('DD/MM/YY HH:mm:ss')
    // let result = ffmpeg_1.runSync(`-i http://office.radioairplay.fm:8081/nvenc-inputs/${channel}/playlist_dvr_range-${start_utc}-${duration}.m3u8 -ss 00:00:19.000 -vframes 1 output.png`)
      
    // })
    // .catch(err => {
    //   res.status(500).json({message: err.message})
    // })
}

const command = async (channel, start_utc, duration) => {
    return new Promise((resolve,reject)=>{
        ffmpeg_1.run(`-y -i "http://office.radioairplay.fm:8081/nvenc-inputs/${channel}/playlist_dvr_range-${start_utc}-${duration}.m3u8" -vn -ar 44100 -ac 2 -ab 128k -f mp3 "../video-player-project/public/videos/audio_waveform.mp3"`).then((result)=>{
            resolve(result)
        }).catch((e)=>{
            reject(e);
        })
    });
}

const getTimeFramesArray = (start_utc, duration, frames_per_second) => {
    // let utc_time_milliseconds = moment().utc(start_utc*1000);
    var time = moment().toDate();  // This will return a copy of the Date that the moment uses
    time.setHours(0);
    time.setMinutes(0);
    time.setSeconds(0);
    time.setMilliseconds(0);
    var m = moment().utcOffset(0);
    m.set({hour:0,minute:0,second:0,millisecond:0})
    m.toISOString()
    m.format()
    let utc_time_milliseconds = m;
    duration = parseFloat(duration)
    frames_per_second = parseFloat(frames_per_second)
    let times = [];
    for(let i =0; i<duration;i++){

        if(frames_per_second===1){
            times.push(utc_time_milliseconds.add(1000, 'milliseconds').valueOf());
        }
        else if(frames_per_second===2){
            times.push(utc_time_milliseconds.add(500, 'milliseconds').valueOf());
            times.push(utc_time_milliseconds.add(500, 'milliseconds').valueOf());
        }
        else if(frames_per_second===4){
            times.push(utc_time_milliseconds.add(250, 'milliseconds').valueOf());
            times.push(utc_time_milliseconds.add(250, 'milliseconds').valueOf());
            times.push(utc_time_milliseconds.add(250, 'milliseconds').valueOf());
            times.push(utc_time_milliseconds.add(250, 'milliseconds').valueOf());
        }
    }

    return times;
    
}

