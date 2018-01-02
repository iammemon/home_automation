const express=require('express')
const sensor=require('node-dht-sensor')
const admin=require('firebase-admin')
const Gpio=require('onoff').Gpio;

const serviceAccount=require('./serviceAccountKey.json');

const app=express();

//init firebase admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://home-automation-c31f5.firebaseio.com",
    databaseAuthVariableOverride: null
});

//init leds
const ledArray=[];
ledArray['led1'] = new Gpio(5,'out');
ledArray['led2'] = new Gpio(6,'out');
ledArray['led3'] = new Gpio(13,'out');
ledArray['led4'] = new Gpio(19,'out');
ledArray['led5'] = new Gpio(26,'out');

//init sensors
const pir = new Gpio(17, 'in', 'both');
const buzzer = new Gpio(27, 'out');


pir.watch(function (err, value) {
        if (err) exit();
        buzzer.writeSync(value);
        console.log('Intruder detected');
        if (value == 1) {
            admin.database().ref('state').child('motion').push().set({
                timestamp:Date.now()
            })
            notifyUser()
        }
});

const readTemp=()=>{
    sensor.read(22, 4, function (err, temperature, humidity) {
        if (!err) {
            const tempvalue = temperature.toFixed(1) +'°C';
            const humidvalue = humidity.toFixed(1)+"%";
            admin.database().ref('state/temperature').set(tempvalue);
            admin.database().ref('state/humidity').set(humidvalue)
            console.log('temp: ' + temperature.toFixed(1) + '°C, ' +
                'humidity: ' + humidity.toFixed(1) + '%'
            );
        }else{
            if(tempInterval) clearInterval(tempInterval)
        }
    });
}

const tempInterval=setInterval(readTemp,2000);


admin.database().ref("state").on('value',(snap)=>{
    const values=snap.val();
   changeLedState(values.leds)
})


//custom methods
const createPayload = () => {
    return {
        notification: {
            title: 'Intruder Alert!',
            body: new Date().toLocaleDateString(),
            icon: 'https://firebasestorage.googleapis.com/v0/b/home-automation-c31f5.appspot.com/o/Burglar-icon.png?alt=media&token=91a6495c-beab-462f-b693-fad0438be4f1',
            click_action: 'https://home-automation.now.sh/'
        }
    }
}

const notifyUser = () => {
    admin.database().ref('tokens').once('value').then((snap) => {
        if (!snap.val()) return;
        const tokens = [];
        const values = snap.val()
        for (let key in values) {
            tokens.push(values[key].token)
        }
        return admin.messaging().sendToDevice(tokens, createPayload());
    })
}

const changeLedState=(leds)=>{
    Object.keys(leds).forEach((key)=>{
        const value = leds[`${key}`]
        ledArray[`${key}`].writeSync(value);
        
    })
}

const exit = () => {
    buzzer.unexport();
    pir.unexport();
    ledArray['led1'].unexport();
    ledArray['led2'].unexport();
    ledArray['led3'].unexport();
    ledArray['led4'].unexport();
    ledArray['led5'].unexport();
   clearInterval(tempInterval);
    process.exit();

}

process.on('SIGINT', ()=> {
     exit()
    // for(led in ledArray){
    //     ledArray[`${led}`].unexport();
    // }
});

app.listen(3000,()=>{
    console.log('server is listening to port 3000')
})