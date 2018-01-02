//firebase init
const config = {
    apiKey: "AIzaSyCtdkTUAN39CKL8-ktHrtxfX7Hjm1Vj3dQ",
    authDomain: "home-automation-c31f5.firebaseapp.com",
    databaseURL: "https://home-automation-c31f5.firebaseio.com",
    projectId: "home-automation-c31f5",
    storageBucket: "home-automation-c31f5.appspot.com",
    messagingSenderId: "760505569070"
};
firebase.initializeApp(config);

subscribeToNotification()
// firebase.messaging().onTokenRefresh(handleTokenRefresh);

const table = $('#pir-table').DataTable();

firebase.database().ref('/state').once('value').then((snap)=>{
    console.log('firebase led state')
    const values=snap.val()
    Object.keys(values.leds).forEach((led)=>{
        const state=!!values.leds[`${led}`] ? 'on' : 'off'
        $(`#${led}`).bootstrapToggle(state)
    })	
})

function updateLedFirebaseState() {
    const state = +$(this).prop('checked')
    firebase.database().ref(`/state/leds/${this.id}`).set(state)
}
//registers events
$('#led1').change(updateLedFirebaseState);
$('#led2').change(updateLedFirebaseState);
$('#led3').change(updateLedFirebaseState);
$('#led4').change(updateLedFirebaseState);
$('#led5').change(updateLedFirebaseState);

firebase.database().ref('/state').on('value',(snap)=>{
    console.log('value wala method called')
    const values =snap.val()
    drawToTable(values.motion)
    $('#temperature').html(values.temperature);
    $('#humidity').html(values.humidity);
})

function drawToTable(motionData){
    if(motionData){
        table.clear();
        updatedData=[]
        Object.keys(motionData).forEach((key)=>{
            const timestamp=motionData[key].timestamp;
            const date=new Date(timestamp).toLocaleString();
            const motion='detected';
            updatedData.push([date,motion])
        })
        updatedData.reverse()
        table.rows.add(updatedData).draw(false);
    }
}
function subscribeToNotification(){
    firebase.messaging().requestPermission()
    .then(()=>handleTokenRefresh())
    .catch(err=>console.log('error getting permission'));
}

function handleTokenRefresh() {
    return firebase.messaging().getToken().then((token) => {
        firebase.database().ref('/tokens').push({
            token: token,
        });
    });
}