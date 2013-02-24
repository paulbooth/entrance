
// (Based on Ethernet's WebClient Example)

#include <SPI.h>
#include <WiFly.h>

WiFlyClient client("entranceapp.herokuapp.com", 80);
int analogPin = 9;


void setup() {
  
  pinMode(analogPin, OUTPUT);
  
  Serial.begin(9600);
  Serial.println("Beginning");
  WiFly.begin();
  Serial.println("Checkting connection to guest.");
  
  if (!WiFly.join("OLIN_GUEST", "The_Phoenix_Flies")) {
    Serial.println("Association failed.");
    while (1) {
      // Hang on failure.
    }
  }  

  Serial.println("connecting...");

  if (client.connect()) {
    Serial.println("connected");
    client.println("GET /30f911883803c643/stream HTTP/1.0");
    client.println("Host: entranceapp.herokuapp.com");
    client.println();
  } else {
    Serial.println("connection failed");
  }
  
}

void loop() {
  if (client.available()) {
    byte b = client.read();
    Serial.println(b);
    analogWrite(analogPin, b);
  }
  
  if (!client.connected()) {
    Serial.println();
    Serial.println("disconnecting.");
    client.stop();
    for(;;)
      ;
  }
}
