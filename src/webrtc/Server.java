package webrtc;

import java.io.IOException;
import java.io.StringReader;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import javax.json.Json;
import javax.json.JsonObject;
import javax.websocket.CloseReason;
import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint("/server") 
public class Server {
	
	private String[] user = {"saif","dream","success"};
	public static Map<String, Session> sessionUserMap = Collections.synchronizedMap(new HashMap<String, Session>());
	
    @OnOpen
    public void onOpen(Session session, EndpointConfig config){
        System.out.println(session.getId() + " has opened a connection"); 
        try {
            session.getBasicRemote().sendText("Connection Established");
        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }
    
    @SuppressWarnings("rawtypes")
	@OnMessage
    public void onMessage(String message, Session session) throws IOException{
    	System.out.println("Message from " + session.getId() + ": " + message);
        
        JsonObject o = Json.createReader(new StringReader(message)).readObject();
        String type = o.getString("type");
        switch(type) {
	        case "login":
	        	String name = o.getString("name");
	        	boolean found = Arrays.asList(user).contains(name);
	        	if(found){
	        		sessionUserMap.put(name, session);
					session.getBasicRemote().sendText("{\"type\":\"login\",\"success\":" + true + "}");
	        	} else {
	        		session.getBasicRemote().sendText("{\"type\":\"login\",\"success\":" + false + "}");
	        	}
	        	break;
	        case "offer":
	        case "answer":
	        case "candidate":
	        	for(Map.Entry m : sessionUserMap.entrySet()){  
     			   if(m.getKey().equals(o.getString("name"))){
     				   Session targetUserSession = (Session) m.getValue();
     				   targetUserSession.getAsyncRemote().sendText(message);
     			   }
        		}
	        	break;
	        case "leave":
	        	System.out.println("Session " +session.getId()+" has ended");
	        	break;
        }
    }
    
    @OnClose
    public void onClose(Session session, CloseReason reason){
        System.out.println("Session " +session.getId()+" has ended");
        System.out.println("Reason Code: "+reason.getCloseCode()+" Reason: "+reason.getReasonPhrase());
    }
    
    @OnError
    public void error(Session session, Throwable t) {
		System.err.println("Error on session "+session.getId());
		t.printStackTrace();
    }
}
