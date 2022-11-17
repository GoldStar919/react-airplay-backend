
const moment = require('moment');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const ffmpeg_1 = require("ffmpeg-cli");

exports.getFramesInfo = async (req, res) => {
//   Site.findAll({
//     limit: 1,
//     order: ['createdAt'],
//   })
//     .then(result => {
    let {channel, start_utc, duration, frames_per_sec} = req.query;
    channel = String(channel).toUpperCase();
    let getTimesArray = getTimeFramesArray(start_utc, duration, frames_per_sec);
    // console.log(getTimesArray,'ttttttttttttttt_____',duration, start_utc, frames_per_sec, channel)
    // getTimesArray.forEach((val, key)=>{
        // console.log(val, moment.utc(val).format('HH:mm:ss.ms'));
    //    let i =  await ffmpeg_1.runAsync())
    // })
    ffmpeg_1.run(`-i "http://office.radioairplay.fm:8081/nvenc-inputs/${channel}/playlist_dvr_range-${start_utc}-${duration}.m3u8" -filter:v fps=fps=1/1 "output_%03d.jpg"`).then((result)=>{
        
    
        res.status(200).json({'tesdt':'success'})
    }).catch((err)=>{
        res.status(500).json({message: err.message})
    });
    // moment.utc(1638976060*1000).format('DD/MM/YY HH:mm:ss')
    // let result = ffmpeg_1.runSync(`-i http://office.radioairplay.fm:8081/nvenc-inputs/${channel}/playlist_dvr_range-${start_utc}-${duration}.m3u8 -ss 00:00:19.000 -vframes 1 output.png`)
      
    // })
    // .catch(err => {
    //   res.status(500).json({message: err.message})
    // })
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

