//our username 
var name; 
var connectedUser;
  
//connecting to our signaling server
var conn = new WebSocket('ws://'+ window.location.host +'/WebRTC/server');
  
conn.onopen = function () { 
   console.log("Connected to the signaling server"); 
};

conn.onerror = function (err) { 
   console.log("Got error", err); 
};
  
//when we got a message from a signaling server 
conn.onmessage = function (msg) { 
   console.log("Got message", msg.data);
   if(msg.data === "Connection Established"){
	   return;
   }
   
   var data = JSON.parse(msg.data); 
	
   switch(data.type) { 
      case "login": 
         handleLogin(data.success); 
         break; 
      //when somebody wants to call us 
      case "offer": 
         handleOffer(data.offer, data.name); 
         break; 
      case "answer": 
         handleAnswer(data.answer); 
         break; 
      //when a remote peer sends an ice candidate to us 
      case "candidate": 
         handleCandidate(data.candidate); 
         break; 
      case "leave": 
         handleLeave(); 
         break; 
      default: 
         break; 
   }
};
  
//alias for sending JSON encoded messages 
function send(message) { 
   //attach the other peer username to our messages 
   if (connectedUser) { 
      message.name = callToUsernameInput.value; 
   }
   conn.send(JSON.stringify(message)); 
};
  
//****** 
//UI selectors block 
//******
var loginPage = document.querySelector('#loginPage'); 
var usernameInput = document.querySelector('#usernameInput'); 
var loginBtn = document.querySelector('#loginBtn'); 

var callPage = document.querySelector('#callPage'); 
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 

var hangUpBtn = document.querySelector('#hangUpBtn');
  
var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo'); 

var myConn; 
var stream;
  
callPage.style.display = "none";

// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
   name = usernameInput.value;
   if (name.length > 0) { 
      send({ 
         type: "login", 
         name: name 
      }); 
   }
});
  
function handleLogin(success) { 
   if (success === false) { 
      alert("Ooops...try a different username"); 
   } else { 
      loginPage.style.display = "none"; 
      callPage.style.display = "block";
		
      //********************** 
      //Starting a peer connection 
      //********************** 
		
      //getting local video stream 
      navigator.mozGetUserMedia({ video: true, audio: true }, function (myStream) { 
         stream = myStream; 
			
         //displaying local video stream on the page 
         localVideo.src = window.URL.createObjectURL(stream);
			
         //using Google public stun server 
         var configuration = { 
            "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
         };
         myConn = new mozRTCPeerConnection(configuration, {optional: [{RtpDataChannels: true}]});
         console.log("RTCPeerConnection object was created");
			
         // setup stream listening 
         myConn.addStream(stream); 
			
         //when a remote user adds stream to the peer connection, we display it 
         myConn.onaddstream = function (e) { 
            remoteVideo.src = window.URL.createObjectURL(e.stream); 
         };
			
         // Setup ice handling 
         myConn.onicecandidate = function (event) { 
            if (event.candidate) { 
               send({ 
                  type: "candidate", 
                  candidate: event.candidate,
                  name: callToUsernameInput.value
               }); 
            } 
         };
      }, function (error) { 
         console.log(error); 
      });
   } 
};

conn.oniceconnectionstatechange = function(e) {
    onIceStateChange(connection, e);
    console.log("ICE State has changed.");
};
  
//initiating a call 
callBtn.addEventListener("click", function () { 
   var callToUsername = callToUsernameInput.value;
	
   if (callToUsername.length > 0) {
      connectedUser = callToUsername;
      // create an offer 
      myConn.createOffer(function (offer) { 
         send({ 
            type: "offer", 
            offer: offer 
         });
         myConn.setLocalDescription(offer); 
      }, function (error) { 
         alert("Error when creating an offer"); 
      });
   } 
});
  
//when somebody sends us an offer 
function handleOffer(offer, name) { 
   connectedUser = callToUsernameInput.value;
   myConn.setRemoteDescription(new RTCSessionDescription(offer));
	
   //create an answer to an offer 
   myConn.createAnswer(function (answer) { 
      myConn.setLocalDescription(answer); 
      console.log("connectedUser: "+connectedUser);
      send({ 
         type: "answer", 
         answer: answer,
         name: callToUsernameInput.value
      });
   }, function (error) { 
      //alert("Error when creating an answer");
      console.error("Error when creating an answer, caused by: "+error);
   }); 
};
  
//when we got an answer from a remote user
function handleAnswer(answer) { 
   myConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};
  
//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
   myConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};
   
//hang up 
hangUpBtn.addEventListener("click", function () {
   send({ 
      type: "leave" 
   });
   handleLeave(); 
});
  
function handleLeave() { 
   connectedUser = null; 
   remoteVideo.src = null; 
	
   myConn.close(); 
   myConn.onicecandidate = null; 
   myConn.onaddstream = null; 
};